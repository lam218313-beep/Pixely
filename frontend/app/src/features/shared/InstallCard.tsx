import React, { useState } from 'react';
import { Download, Share, SquarePlus, MoreVertical, X } from 'lucide-react';
import { hideInstall, installHidden, useInstall } from '@/lib/install';
import { Button, Sheet } from '@/ui';

/**
 * Invites the client to install Pixely on the phone: then it opens full screen, without the
 * browser's bars. `dismissible` (Inicio) can be closed for good; in Tu cuenta it always shows.
 */
export const InstallCard: React.FC<{ dismissible?: boolean }> = ({ dismissible = false }) => {
  const { way, install } = useInstall();
  const [hidden, setHidden] = useState(() => dismissible && installHidden());
  const [help, setHelp] = useState(false);
  if (!way || hidden) return null;

  const start = async () => {
    if (way === 'prompt') { if (await install()) setHidden(true); }
    else setHelp(true);
  };

  return (
    <>
      <div className="relative bg-card border border-edge rounded-[22px] p-4 flex gap-3.5 items-center">
        <span className="w-11 h-11 rounded-[14px] bg-pink/15 text-pink-text flex items-center justify-center shrink-0"><Download size={22} /></span>
        <span className="flex-1 min-w-0 pr-6">
          <span className="block text-[15px] font-extrabold">Instala Pixely en tu teléfono</span>
          <span className="block text-[13px] text-text-3">Se abre a pantalla completa, sin las barras del navegador.</span>
          <button type="button" onClick={start} className="mt-2 h-9 px-4 rounded-[12px] bg-pink-fill text-[13px] font-extrabold">Instalar</button>
        </span>
        {dismissible && (
          <button type="button" aria-label="Ahora no" onClick={() => { hideInstall(); setHidden(true); }} className="absolute top-2.5 right-2.5 w-9 h-9 rounded-full flex items-center justify-center text-text-3"><X size={18} /></button>
        )}
      </div>
      <Sheet open={help} title="Instalar Pixely" onClose={() => setHelp(false)}>
        {way === 'ios' ? (
          <ol className="m-0 p-0 list-none flex flex-col gap-3.5 text-[15px]">
            <Step n={1} icon={<Share size={18} />}>Toca <strong>Compartir</strong> en la barra de Safari.</Step>
            <Step n={2} icon={<SquarePlus size={18} />}>Elige <strong>Agregar a inicio</strong>.</Step>
            <Step n={3}>Abre Pixely desde el ícono nuevo de tu pantalla.</Step>
          </ol>
        ) : (
          <ol className="m-0 p-0 list-none flex flex-col gap-3.5 text-[15px]">
            <Step n={1} icon={<MoreVertical size={18} />}>Toca el menú <strong>⋮</strong> de tu navegador.</Step>
            <Step n={2} icon={<SquarePlus size={18} />}>Elige <strong>Instalar app</strong> o <strong>Agregar a pantalla de inicio</strong>.</Step>
            <Step n={3}>Abre Pixely desde el ícono nuevo de tu pantalla.</Step>
          </ol>
        )}
        <Button block variant="secondary" onClick={() => setHelp(false)}>Entendido</Button>
      </Sheet>
    </>
  );
};

const Step: React.FC<{ n: number; icon?: React.ReactNode; children: React.ReactNode }> = ({ n, icon, children }) => (
  <li className="flex gap-3 items-center">
    <span className="w-9 h-9 rounded-full bg-raised flex items-center justify-center shrink-0 font-display font-bold text-sm">{icon ?? n}</span>
    <span className="text-text-soft">{children}</span>
  </li>
);
