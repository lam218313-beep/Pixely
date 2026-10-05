/**
 * The only door to the Partners backend. Every screen asks through here, so the
 * token, errors and "session expired" are handled in one place.
 */
import { loadSession } from './session';

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

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = loadSession();
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
    expiredListeners.forEach((fn) => fn());
    throw new ApiError(401, 'Tu sesión venció. Vuelve a entrar.');
  }
  if (!res.ok) throw new ApiError(res.status, await parseError(res));
  if (res.status === 204) return undefined as T;

  const body = await res.json();
  // Most endpoints answer { status, data }; a few return the object itself.
  return (body && typeof body === 'object' && 'data' in body && 'status' in body ? body.data : body) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body instanceof URLSearchParams || body instanceof FormData ? body : JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
};
