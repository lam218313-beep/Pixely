/**
 * The only door to the Partners backend. Every screen asks through here, so the
 * token, errors and "session expired" are handled in one place.
 */
import { Session, loadSession, saveSession } from './session';

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:8000';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Listener = () => void;
const expiredListeners = new Set<Listener>();
/** Called when the backend rejects the token: the auth layer signs the user out. */
export function onSessionExpired(fn: Listener): () => void {
  expiredListeners.add(fn);
  return () => expiredListeners.delete(fn);
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === 'string') return body.detail;
  } catch { /* not JSON */ }
  return res.status >= 500 ? 'El servidor no respondió bien. Intenta de nuevo.' : 'No se pudo completar la acción.';
}

/** What /token, /auth/code/verify and /auth/refresh answer. */
export interface TokenResponse {
  access_token: string;
  user_email: string;
  role: string;
  ficha_cliente_id: string | null;
  refresh_token?: string | null;
  expires_at?: number | null;
}

export function toSession(r: TokenResponse): Session {
  return { token: r.access_token, refreshToken: r.refresh_token ?? null, expiresAt: r.expires_at ?? null, email: r.user_email, role: r.role, clientId: r.ficha_cliente_id };
}

let refreshing: Promise<Session | null> | null = null;

/** Renews the token once, even if several screens ask at the same time. */
function refreshSession(current: Session): Promise<Session | null> {
  if (!current.refreshToken) return Promise.resolve(null);
  refreshing ??= fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: current.refreshToken }),
  })
    .then(async (res) => {
      if (!res.ok) return null;
      const next = toSession(await res.json());
      if (!next.clientId) next.clientId = current.clientId;
      saveSession(next);
      return next;
    })
    .catch(() => null)
    .finally(() => { refreshing = null; });
  return refreshing;
}

/** Sends a request with the session, renewing it when needed. Returns the raw response once it is ok. */
async function send(path: string, init: RequestInit = {}, retried = false): Promise<Response> {
  let session = loadSession();
  // Renew a minute before it expires, so a screen never fails halfway.
  if (session?.expiresAt && session.refreshToken && session.expiresAt - Date.now() / 1000 < 60) {
    session = (await refreshSession(session)) ?? session;
  }
  const headers = new Headers(init.headers);
  if (session?.token) headers.set('Authorization', `Bearer ${session.token}`);
  if (init.body && !(init.body instanceof FormData) && !(init.body instanceof URLSearchParams) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, 'Sin conexión. Revisa tu internet.');
  }

  if (res.status === 401 && session?.token) {
    if (!retried && session.refreshToken && (await refreshSession(session))) return send(path, init, true);
    expiredListeners.forEach((fn) => fn());
    throw new ApiError(401, 'Tu sesión venció. Vuelve a entrar.');
  }
  if (!res.ok) throw new ApiError(res.status, await parseError(res));
  return res;
}

export async function request<T>(path: string, init: RequestInit = {}, unwrap = true): Promise<T> {
  const res = await send(path, init);
  if (res.status === 204) return undefined as T;
  const body = await res.json();
  // Most endpoints answer { status, data }; a few return the object itself.
  return (unwrap && body && typeof body === 'object' && 'data' in body && 'status' in body ? body.data : body) as T;
}

/** A file from the backend (e.g. the Mercado PDF) with the name the server gave it. */
export async function requestFile(path: string): Promise<{ blob: Blob; name: string | null }> {
  const res = await send(path);
  const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? null;
  return { blob: await res.blob(), name };
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  /** The whole JSON body, without unwrapping { status, data }. */
  raw: <T>(path: string) => request<T>(path, {}, false),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body instanceof URLSearchParams || body instanceof FormData ? body : JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
};
