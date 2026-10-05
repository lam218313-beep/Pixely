import React from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth';
import { Screen } from '@/ui';
import { Pronto } from '../Pronto';

export const InicioScreen: React.FC = () => {
  const { session } = useAuth();
  return (
    <Screen title="Inicio" action={
      <Link to="/cuenta" aria-label="Tu cuenta" className="w-11 h-11 rounded-full border border-line bg-card flex items-center justify-center font-display font-bold text-[15px] text-white no-underline">
        {(session?.email ?? '?').charAt(0).toUpperCase()}
      </Link>
    }>
      <p className="m-0 text-sm text-text-2">Hola, {session?.email}</p>
      <Pronto text="Aquí verás lo que te toca hoy, tus pendientes y lo próximo en salir." />
    </Screen>
  );
};
