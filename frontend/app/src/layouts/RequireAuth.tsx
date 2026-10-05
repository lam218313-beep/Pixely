import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '@/lib/auth';
import { BiometricGate } from './BiometricGate';

export const RequireAuth: React.FC = () => {
  const { session } = useAuth();
  const location = useLocation();
  if (!session) return <Navigate to="/entrar" replace state={{ from: location.pathname }} />;
  return <BiometricGate><Outlet /></BiometricGate>;
};
