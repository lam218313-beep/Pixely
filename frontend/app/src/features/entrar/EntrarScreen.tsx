import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button, Field, Dot } from '@/ui';
import { isNative } from '@/lib/native';
import { DESKTOP_URL } from '@/lib/web';
import { EntrarFrame } from './EntrarHero';

/** Entrada (design "A · Noche"): the client signs in with the @pixely.pe email and password Pixely gives them
 *  (the email is only a login, it has no inbox, so there are no codes by email). */
export const EntrarScreen: React.FC = () => {
  const { session, signInWithPassword } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) return <Navigate to={from} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await signInWithPassword(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo continuar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <EntrarFrame hero={
      <>
        <h1 className="font-display font-bold text-[46px] leading-[1.02] m-0">
          <span className="en-ln"><span>Tu marca</span></span>
          <span className="en-ln"><span>se decide</span></span>
          <span className="en-ln"><span><span className="text-pink">aquí</span><Dot /></span></span>
        </h1>
        <p className="en-after m-0 text-base leading-relaxed text-text-2 max-w-[290px]">Aprueba ideas, revisa piezas y sigue tu mercado. Todo desde el bolsillo.</p>
      </>
    }>
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <Field label="Tu correo" type="email" autoComplete="username" inputMode="email" required placeholder="tunombre@pixely.pe"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Contraseña" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} error={error} />
        <Button type="submit" block loading={busy} icon={!busy && <ArrowRight size={18} strokeWidth={2.5} />} className="flex-row-reverse mt-1">
          Entrar
        </Button>
      </form>
      <a href="https://wa.me/51949268607?text=Hola%20Pixely%2C%20no%20recuerdo%20mi%20contrase%C3%B1a%20de%20Partners" target="_blank" rel="noopener noreferrer" className="h-11 flex items-center justify-center text-[13px] font-bold text-text-3 no-underline">¿Olvidaste tu contraseña? Escríbenos</a>
      {!isNative && <a href={DESKTOP_URL} className="-mt-2 text-center text-[13px] font-bold text-text-3 no-underline">Ir a la versión de escritorio</a>}
      <p className="m-0 mb-2 text-center text-[13px] text-text-3">
        ¿Aún no trabajas con nosotros? <a href="https://wa.me/51949268607" target="_blank" rel="noopener noreferrer" className="font-bold text-pink-text no-underline">Escríbenos</a>
      </p>
    </EntrarFrame>
  );
};
