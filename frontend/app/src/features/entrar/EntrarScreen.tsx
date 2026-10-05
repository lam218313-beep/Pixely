import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button, Field, Dot } from '@/ui';
import { EntrarFrame } from './EntrarHero';

/** Entrada (design "A · Noche"): the client writes their email and receives a code. No passwords. */
export const EntrarScreen: React.FC = () => {
  const { session, requestCode, signInWithPassword } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [withPassword, setWithPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) return <Navigate to={from} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      if (withPassword) {
        await signInWithPassword(email, password);
        navigate(from, { replace: true });
      } else {
        await requestCode(email);
        navigate('/entrar/codigo', { state: { email: email.trim().toLowerCase(), from } });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo continuar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <EntrarFrame hero={
      <>
        <h1 className="font-display font-bold text-[46px] leading-[1.02] m-0">Tu marca<br />se decide<br /><span className="text-pink">aquí</span><Dot /></h1>
        <p className="m-0 text-base leading-relaxed text-text-2 max-w-[290px]">Aprueba ideas, revisa piezas y mira qué funcionó. Todo desde el bolsillo.</p>
      </>
    }>
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <Field label="Tu correo" type="email" autoComplete="email" inputMode="email" required placeholder="nombre@tumarca.pe"
          value={email} onChange={(e) => setEmail(e.target.value)} error={withPassword ? null : error} />
        {withPassword && (
          <Field label="Contraseña" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} error={error} />
        )}
        <Button type="submit" block loading={busy} icon={!busy && <ArrowRight size={18} strokeWidth={2.5} />} className="flex-row-reverse mt-1">
          {withPassword ? 'Entrar' : 'Recibir mi código'}
        </Button>
      </form>
      <button type="button" onClick={() => { setWithPassword(!withPassword); setError(null); }} className="h-11 text-[13px] font-bold text-text-3">
        {withPassword ? 'Mejor, envíame un código' : 'Entrar con contraseña'}
      </button>
      <p className="m-0 mb-2 text-center text-[13px] text-text-3">
        ¿Aún no trabajas con nosotros? <a href="https://wa.me/51949268607" target="_blank" rel="noopener noreferrer" className="font-bold text-pink-text no-underline">Escríbenos</a>
      </p>
    </EntrarFrame>
  );
};
