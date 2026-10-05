import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button, Field, Wordmark, Dot } from '@/ui';

/**
 * Entrada (design "A · Noche"). TEMPORARY: email + password against today's /token.
 * Step 2 turns it into "Recibir mi código" + the 6-digit code screen.
 */
export const EntrarScreen: React.FC = () => {
  const { session, signIn } = useAuth();
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
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo entrar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-full mx-auto max-w-[480px] flex flex-col overflow-hidden">
      <div aria-hidden className="absolute -right-[120px] top-[90px] w-[340px] h-[340px] rounded-full border border-[#2A2A32]" />
      <div aria-hidden className="absolute -right-[60px] top-[150px] w-[220px] h-[220px] rounded-full border border-[#2A2A32]" />
      <div aria-hidden className="absolute right-[52px] top-[182px] w-3.5 h-3.5 rounded-full bg-pink shadow-[0_0_0_8px_rgba(235,12,110,0.18)]" />

      <header className="relative px-7 pt-safe flex items-center justify-between">
        <div className="pt-8 flex items-center justify-between w-full">
          <Wordmark />
          <span className="text-xs font-bold tracking-[0.12em] uppercase text-text-3">Partners</span>
        </div>
      </header>

      <div className="relative flex-1 px-7 flex flex-col justify-center gap-5 py-10">
        <h1 className="font-display font-bold text-[46px] leading-[1.02] m-0">Tu marca<br />se decide<br /><span className="text-pink">aquí</span><Dot /></h1>
        <p className="m-0 text-base leading-relaxed text-text-2 max-w-[290px]">Aprueba ideas, revisa piezas y mira qué funcionó. Todo desde el bolsillo.</p>
      </div>

      <form onSubmit={submit} className="relative bg-card border-t border-edge rounded-t-[32px] px-6 pt-7 pb-safe flex flex-col gap-3.5">
        <span className="w-10 h-1 rounded-full bg-line self-center mb-1.5" />
        <Field label="Tu correo" type="email" autoComplete="email" inputMode="email" required placeholder="nombre@tumarca.pe" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Contraseña" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} error={error} />
        <Button type="submit" block loading={busy} icon={!busy && <ArrowRight size={18} strokeWidth={2.5} />} className="flex-row-reverse mt-1">Entrar</Button>
        <p className="m-0 mt-1.5 mb-2 text-center text-[13px] text-text-3">
          ¿Aún no trabajas con nosotros? <a href="https://wa.me/51949268607" target="_blank" rel="noopener noreferrer" className="font-bold text-pink-text no-underline">Escríbenos</a>
        </p>
      </form>
    </div>
  );
};
