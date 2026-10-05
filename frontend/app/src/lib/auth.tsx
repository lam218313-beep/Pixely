/**
 * Who is signed in. The client app is only for clients: a team account without a
 * brand is turned away with a clear message (the team works in Partners on desktop).
 *
 * Sign-in is a 6-digit code sent by email (no passwords). The session renews itself
 * in the background (see api.ts). Face ID / fingerprint arrive with the store app.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError, TokenResponse, api, onSessionExpired, toSession } from './api';
import { Session, clearSession, loadSession, saveSession } from './session';

const TEAM_MESSAGE = 'Esta app es para clientes de Pixely. El equipo trabaja en Partners desde la computadora.';

interface AuthValue {
  session: Session | null;
  /** Emails a code. Resolves the same way whether or not the email is a client. */
  requestCode: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<void>;
  /** Backup while code emails are being set up. */
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const queryClient = useQueryClient();

  const signOut = useCallback(() => {
    clearSession();
    queryClient.clear();
    setSession(null);
  }, [queryClient]);

  useEffect(() => onSessionExpired(signOut), [signOut]);

  const start = useCallback((res: TokenResponse) => {
    if (!res.ficha_cliente_id) throw new Error(TEAM_MESSAGE);
    const next = toSession(res);
    saveSession(next);
    setSession(next);
  }, []);

  const requestCode = useCallback(async (email: string) => {
    await api.post('/auth/code/send', { email: email.trim() });
  }, []);

  const verifyCode = useCallback(async (email: string, code: string) => {
    start(await api.post<TokenResponse>('/auth/code/verify', { email: email.trim(), code }));
  }, [start]);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    try {
      start(await api.post<TokenResponse>('/token', new URLSearchParams({ username: email.trim(), password })));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) throw new Error('Correo o contraseña incorrectos.');
      throw e;
    }
  }, [start]);

  const value = useMemo(() => ({ session, requestCode, verifyCode, signInWithPassword, signOut }), [session, requestCode, verifyCode, signInWithPassword, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}

/** The signed-in client's brand id. Only call it inside screens behind the auth guard. */
export function useClientId(): string {
  const { session } = useAuth();
  if (!session?.clientId) throw new Error('No client in session');
  return session.clientId;
}
