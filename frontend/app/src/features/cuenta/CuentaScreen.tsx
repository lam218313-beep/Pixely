import React from 'react';
import { LogOut, MessageCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button, Card, DetailScreen, ListRow } from '@/ui';

export const CuentaScreen: React.FC = () => {
  const { session, signOut } = useAuth();
  return (
    <DetailScreen center={<span className="text-sm font-bold text-text-3">Tu cuenta</span>}>
      <Card>
        <p className="eyebrow m-0">Entraste como</p>
        <p className="m-0 mt-2 text-[17px] font-extrabold break-all">{session?.email}</p>
      </Card>
      <ListRow href="https://wa.me/51949268607" icon={<MessageCircle size={20} />} accent title="Tu equipo Pixely" detail="Escríbenos por WhatsApp" />
      <Button variant="secondary" block icon={<LogOut size={18} />} onClick={signOut}>Cerrar sesión</Button>
      <p className="m-0 text-center text-xs text-text-3">Para eliminar tu cuenta, escríbenos y la borramos con todos tus datos.</p>
    </DetailScreen>
  );
};
