/**
 * Where the session lives. Today: localStorage (mobile web). In the store app this
 * file is the only one that changes, to the phone's secure storage (Keychain / Keystore)
 * through Capacitor, so the rest of the app never touches storage directly.
 */

export interface Session {
  token: string;
  /** Renews `token` when it expires (about every hour) without asking for a new code. */
  refreshToken: string | null;
  /** When `token` expires, in seconds since 1970. */
  expiresAt: number | null;
  email: string;
  role: string;
  clientId: string | null;
}

const KEY = 'pixely_app_session';

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    return s && s.token ? s : null;
  } catch {
    return null;
  }
}

export function saveSession(s: Session): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode: session lasts this visit */ }
}

export function clearSession(): void {
  try { localStorage.removeItem(KEY); } catch { /* nothing stored */ }
}
