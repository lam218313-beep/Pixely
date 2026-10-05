/**
 * Where the session lives. On the web: localStorage. In the store app: the phone's secure
 * storage (Keychain on iPhone, Keystore on Android), which other apps can't read.
 * The session is loaded once before the app draws (`hydrateSession`), then read from memory.
 */
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { isNative } from './native';

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
const BIOMETRY_KEY = 'pixely_app_biometria';
let memory: Session | null = null;
let biometry: 'si' | 'no' | null = null;

// Imported directly: a Capacitor plugin must never be returned from an async function or awaited
// (the promise machinery asks it for ".then", which the plugin doesn't have, and it hangs).

/** Never lets a slow or broken storage keep the app from opening. */
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p.catch(() => fallback), new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);
}

async function readRaw(key: string): Promise<string | null> {
  if (isNative) return withTimeout(SecureStorage.getItem(key), 2500, null);
  try { return localStorage.getItem(key); } catch { return null; }
}

function writeRaw(key: string, value: string | null): void {
  if (isNative) {
    void (value == null ? SecureStorage.removeItem(key) : SecureStorage.setItem(key, value)).catch((e) => console.error('[pixely] guardar sesión', e));
    return;
  }
  try { if (value == null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { /* private mode */ }
}

/** Call once before rendering. */
export async function hydrateSession(): Promise<void> {
  try {
    const raw = await readRaw(KEY);
    const s = raw ? (JSON.parse(raw) as Session) : null;
    memory = s && s.token ? s : null;
  } catch {
    memory = null;
  }
  const b = await readRaw(BIOMETRY_KEY);
  biometry = b === 'si' || b === 'no' ? b : null;
}

export function loadSession(): Session | null {
  return memory;
}

export function saveSession(s: Session): void {
  memory = s;
  writeRaw(KEY, JSON.stringify(s));
}

export function clearSession(): void {
  memory = null;
  writeRaw(KEY, null);
}

/** Whether the client chose to unlock the app with Face ID / fingerprint ('si'), declined ('no') or wasn't asked yet (null). */
export function getBiometryChoice(): 'si' | 'no' | null {
  return biometry;
}

export function setBiometryChoice(choice: 'si' | 'no'): void {
  biometry = choice;
  writeRaw(BIOMETRY_KEY, choice);
}
