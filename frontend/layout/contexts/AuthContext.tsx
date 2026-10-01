/**
 * Pixely Partners - Auth Context
 * 
 * Provides authentication state and methods throughout the app
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as api from '../services/api';

// =============================================================================
// TYPES
// =============================================================================

export interface AuthUser {
  email: string;
  tenantId: string;
  fichaClienteId: string | null;
  logoUrl: string | null;
  role: string | null;  // User role (admin, analyst, client)
  isAdmin: boolean;    // Convenience flag
  benefits: string[];  // Enabled benefits
}


interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
  clearError: () => void;
}

// =============================================================================
// CONTEXT
// =============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = api.getStoredUser();
    const storedToken = api.getStoredToken();

    if (storedUser && storedToken) {
      setUser({
        email: storedUser.user_email,
        tenantId: storedUser.tenant_id,
        fichaClienteId: storedUser.ficha_cliente_id,
        logoUrl: storedUser.logo_url || null,
        role: storedUser.role || null,
        isAdmin: storedUser.role === 'admin',
        benefits: storedUser.benefits || [],
      });
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.login(email, password);
      setUser({
        email: response.user_email,
        tenantId: response.tenant_id,
        fichaClienteId: response.ficha_cliente_id,
        logoUrl: response.logo_url || null,
        role: response.role || null,
        isAdmin: response.role === 'admin',
        benefits: response.benefits || [],
      });
    } catch (err) {
      const message = err instanceof api.ApiError
        ? err.message
        : 'Error de conexión con el servidor';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    api.logout();
    setUser(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    error,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
