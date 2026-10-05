import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { LogOut, MessageCircle, ScanFace, Shield, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { checkBiometry, isNative, verifyIdentity, type Biometry } from '@/lib/native';
import { getBiometryChoice, setBiometryChoice } from '@/lib/session';
import { Button, Card, DetailScreen, ListRow } from '@/ui';

export const CuentaScreen: React.FC = () => {
  const { session, signOut } = useAuth();
  const [bio, setBio] = useState<Biometry | null>(null);
  const [on, setOn] = useState(getBiometryChoice() === 'si');

  useEffect(() => { if (isNative) void checkBiometry().then(setBio); }, []);

  const toggle = async () => {
    if (!on && !(await verifyIdentity())) return;
    setBiometryChoice(on ? 'no' : 'si');
    setOn(!on);
  };

  return (
    <DetailScreen center={<span className="text-sm font-bold text-text-3">Tu cuenta</span>}>
      <Card>
        <p className="eyebrow m-0">Entraste como</p>
        <p className="m-0 mt-2 text-[17px] font-extrabold break-all">{session?.email}</p>
      </Card>

      {bio?.available && (
        <button type="button" role="switch" aria-checked={on} onClick={toggle} className="flex items-center gap-3.5 bg-card border border-edge rounded-[22px] px-4 py-3.5 text-left">
          <span className="w-11 h-11 rounded-[14px] bg-pink/15 text-pink-text flex items-center justify-center shrink-0"><ScanFace size={22} /></span>
          <span className="flex-1"><span className="block text-[15px] font-extrabold">Entrar con {bio.label}</span><span className="block text-[13px] text-text-3">Sin esperar un código cada vez</span></span>
          <span className={`w-12 h-7 rounded-full p-0.5 transition ${on ? 'bg-pink-fill' : 'bg-line'}`}><span className={`block w-6 h-6 rounded-full bg-white transition ${on ? 'translate-x-5' : ''}`} /></span>
        </button>
      )}

      <ListRow href="https://wa.me/51949268607" icon={<MessageCircle size={20} />} accent title="Tu equipo Pixely" detail="Escríbenos por WhatsApp" />
      <ListRow to="/privacidad" icon={<Shield size={20} />} title="Privacidad" detail="Qué datos usamos y para qué" />
      <ListRow to="/eliminar-cuenta" icon={<Trash2 size={20} />} title="Eliminar mi cuenta" detail="Pide que borremos tu cuenta y tus datos" />
      <Button variant="secondary" block icon={<LogOut size={18} />} onClick={signOut}>Cerrar sesión</Button>
      <p className="m-0 text-center text-xs text-text-3">Pixely · <Link to="/privacidad" className="text-text-3">Privacidad</Link></p>
    </DetailScreen>
  );
};
