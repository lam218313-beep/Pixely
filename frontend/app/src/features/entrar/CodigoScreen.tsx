import React, { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { ArrowLeft, ScanFace } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { IconButton, Dot, ThinkingOrb } from '@/ui';

const LENGTH = 6;
const RESEND_AFTER = 60;

/**
 * "Revisa tu correo": six boxes for the code. One real input underneath (so the phone
 * can paste the code from the email or the SMS suggestion bar); the boxes only draw it.
 */
export const CodigoScreen: React.FC = () => {
  const { session, requestCode, verifyCode } = useAuth();
  const navigate = useNavigate();
  const state = useLocation().state as { email?: string; from?: string } | null;
  const email = state?.email;
  const from = state?.from ?? '/';
  const input = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(RESEND_AFTER);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  useEffect(() => { input.current?.focus(); }, []);

  if (session) return <Navigate to={from} replace />;
  if (!email) return <Navigate to="/entrar" replace />;

  const submit = async (value: string) => {
    setBusy(true); setError(null);
    try {
      await verifyCode(email, value);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo verificar el código.');
      setCode('');
      input.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  const onChange = (raw: string) => {
    const value = raw.replace(/\D/g, '').slice(0, LENGTH);
    setCode(value);
    setError(null);
    if (value.length === LENGTH && !busy) void submit(value);
  };

  const resend = async () => {
    setError(null);
    try {
      await requestCode(email);
      setWait(RESEND_AFTER);
      setResent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reenviar.');
    }
  };

  const active = Math.min(code.length, LENGTH - 1);

  return (
    <div className="mx-auto max-w-[480px] min-h-full flex flex-col gap-7 px-6 pt-safe pb-safe">
      <div className="pt-10"><IconButton label="Volver" onClick={() => navigate('/entrar', { replace: true, state: { from } })}><ArrowLeft size={20} strokeWidth={2.5} /></IconButton></div>

      <div className="flex flex-col gap-3">
        <h1 className="font-display font-bold text-[32px] leading-[1.08] m-0">Revisa tu<br />correo<Dot /></h1>
        <p className="m-0 text-[15px] leading-relaxed text-text-2">
          Si <strong className="text-white break-all">{email}</strong> es una cuenta de Pixely, te llegó un código de {LENGTH} dígitos. Vence en 10 minutos.
        </p>
      </div>

      <label className="relative block" onClick={() => input.current?.focus()}>
        <span className="sr-only">Código de {LENGTH} dígitos</span>
        <input ref={input} value={code} onChange={(e) => onChange(e.target.value)} disabled={busy}
          inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={LENGTH}
          className="absolute inset-0 w-full h-full opacity-0 text-transparent caret-transparent" aria-invalid={!!error} />
        <span aria-hidden className="grid gap-2" style={{ gridTemplateColumns: `repeat(${LENGTH}, minmax(0, 1fr))` }}>
          {Array.from({ length: LENGTH }, (_, i) => {
            const digit = code[i];
            const isActive = i === active && !busy && code.length < LENGTH;
            return (
              <span key={i} className={`h-16 rounded-[16px] bg-card flex items-center justify-center font-display font-bold text-[26px] border ${isActive ? 'border-2 border-pink' : error ? 'border-pink-text' : 'border-line'}`}>
                {digit ?? (isActive ? <span className="w-0.5 h-7 bg-pink animate-pulse" /> : '')}
              </span>
            );
          })}
        </span>
      </label>

      <div className="min-h-6 -mt-3 text-sm">
        {busy ? (
          <span className="inline-flex items-center gap-2 text-text-2"><ThinkingOrb size={20} className="text-pink" /> Verificando</span>
        ) : error ? (
          <span role="alert" className="font-semibold text-pink-text">{error}</span>
        ) : wait > 0 ? (
          <span className="text-text-3">{resent ? 'Te enviamos otro. ' : '¿No llegó? Revisa spam o '}reenvíalo en {Math.floor(wait / 60)}:{String(wait % 60).padStart(2, '0')}</span>
        ) : (
          <button type="button" onClick={resend} className="font-bold text-pink-text">Reenviar el código</button>
        )}
      </div>

      <div className="flex-1" />

      <div className="bg-card border border-edge rounded-[24px] p-5 flex gap-4 items-center">
        <span className="w-12 h-12 rounded-[16px] bg-pink/15 text-pink-text flex items-center justify-center shrink-0"><ScanFace size={24} /></span>
        <span className="flex flex-col gap-1">
          <span className="text-[15px] font-extrabold">Pronto, solo tu cara</span>
          <span className="text-[13px] leading-snug text-text-3">En la app de tu teléfono entrarás con Face ID o tu huella. Sin contraseñas que olvidar.</span>
        </span>
      </div>
    </div>
  );
};
