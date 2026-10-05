import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScanFace } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { checkBiometry, isNative, verifyIdentity, type Biometry } from '@/lib/native';
import { getBiometryChoice, setBiometryChoice } from '@/lib/session';
import { Button, Dot, Sheet, Wordmark } from '@/ui';

const LOCK_AFTER_MS = 5 * 60_000;

/**
 * Store app only. If the client turned on Face ID / fingerprint, the app opens locked and
 * locks again after 5 minutes in the background. Right after the first sign-in it offers
 * to turn it on. On the web it renders its children untouched.
 */
export const BiometricGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, signOut } = useAuth();
  const [bio, setBio] = useState<Biometry | null>(null);
  const [locked, setLocked] = useState(() => isNative && getBiometryChoice() === 'si');
  const [offer, setOffer] = useState(false);
  const hiddenAt = useRef<number | null>(null);

  useEffect(() => {
    if (!isNative) return;
    void checkBiometry().then((b) => {
      setBio(b);
      if (!b.available) { setLocked(false); return; }
      if (getBiometryChoice() === null) setOffer(true);
    });
  }, []);

  const unlock = useCallback(async () => {
    if (await verifyIdentity()) setLocked(false);
  }, []);

  // Ask right away when it opens locked.
  useEffect(() => { if (locked && bio?.available) void unlock(); }, [locked, bio, unlock]);

  // Lock again after a while in the background.
  useEffect(() => {
    if (!isNative) return;
    let remove: (() => void) | undefined;
    void import('@capacitor/app').then(({ App }) => App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) { hiddenAt.current = Date.now(); return; }
      if (getBiometryChoice() === 'si' && hiddenAt.current && Date.now() - hiddenAt.current > LOCK_AFTER_MS) setLocked(true);
      hiddenAt.current = null;
    })).then((h) => { remove = () => h.remove(); });
    return () => remove?.();
  }, []);

  if (!isNative || !session) return <>{children}</>;

  if (locked && bio?.available) {
    return (
      <div className="mx-auto max-w-[480px] min-h-full flex flex-col px-7 pt-safe pb-safe">
        <div className="pt-8"><Wordmark /></div>
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-5">
          <span className="w-24 h-24 rounded-full bg-pink/15 text-pink-text flex items-center justify-center"><ScanFace size={44} /></span>
          <h1 className="m-0 font-display font-bold text-3xl">Hola de nuevo<Dot /></h1>
          <p className="m-0 text-[15px] text-text-2">Confirma que eres tú para ver tu marca.</p>
        </div>
        <div className="flex flex-col gap-2 pb-4">
          <Button block onClick={unlock} icon={<ScanFace size={20} />}>Entrar con {bio.label}</Button>
          <Button block variant="ghost" onClick={signOut}>Entrar con mi código</Button>
        </div>
      </div>
    );
  }

  const decide = async (yes: boolean) => {
    if (yes && !(await verifyIdentity())) return;
    setBiometryChoice(yes ? 'si' : 'no');
    setOffer(false);
  };

  return (
    <>
      {children}
      <Sheet open={offer && !!bio?.available} title={`¿Entrar con ${bio?.label ?? 'tu huella'}?`} onClose={() => decide(false)}>
        <p className="m-0 text-[15px] leading-relaxed text-text-2">La próxima vez abrirás Pixely solo con {bio?.label}, sin esperar un código. Puedes cambiarlo cuando quieras en Tu cuenta.</p>
        <Button block icon={<ScanFace size={20} />} onClick={() => decide(true)}>Sí, activar</Button>
        <Button block variant="ghost" onClick={() => decide(false)}>Ahora no</Button>
      </Sheet>
    </>
  );
};
