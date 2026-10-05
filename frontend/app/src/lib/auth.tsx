/**
 * Who is signed in. The client app is only for clients: a team account without a
 * brand is turned away with a clear message (the team works in Partners on desktop).
 *
 * TEMPORARY: signs in with email + password through the existing /token. Step 2 of the
 * build replaces it with a code sent by email (and Face ID / fingerprint in the store app).
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError, api, onSessionExpired } from './api';
import { Session, clearSession, loadSession, saveSession } from './session';

interface TokenResponse {
  access_token: string;
  user_email: string;
  role: string;
  ficha_cliente_id: string | null;
}

interface AuthValue {
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
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

  const signIn = useCallback(async (email: string, password: string) => {
    const form = new URLSearchParams({ username: email.trim(), password });
    let res: TokenResponse;
    try {
      res = await api.post<TokenResponse>('/token', form);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) throw new Error('Correo o contraseña incorrectos.');
      throw e;
    }
    if (!res.ficha_cliente_id) {
      throw new Error('Esta app es para clientes de Pixely. El equipo trabaja en Partners desde la computadora.');
    }
    const next: Session = { token: res.access_token, email: res.user_email, role: res.role, clientId: res.ficha_cliente_id };
    saveSession(next);
    setSession(next);
  }, []);

  const value = useMemo(() => ({ session, signIn, signOut }), [session, signIn, signOut]);
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
