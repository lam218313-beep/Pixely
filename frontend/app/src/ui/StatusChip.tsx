import React from 'react';
import { Check, Clock, PenLine, Sparkles, CalendarCheck } from 'lucide-react';

export type Status = 'te-toca' | 'cambios' | 'aprobada' | 'produccion' | 'programada';

/** States always carry an icon and a word, never color alone. Only blacks, greys and pink. */
const STYLES: Record<Status, { label: string; cls: string; Icon: React.FC<{ size?: number; strokeWidth?: number }> }> = {
  'te-toca': { label: 'Te toca', cls: 'bg-pink-fill text-white', Icon: Clock },
  cambios: { label: 'Cambios', cls: 'border border-pink-text text-pink-text', Icon: PenLine },
  aprobada: { label: 'Aprobada', cls: 'bg-edge text-white', Icon: Check },
  produccion: { label: 'En producción', cls: 'bg-raised text-text-2', Icon: Sparkles },
  programada: { label: 'Programada', cls: 'bg-edge text-white', Icon: CalendarCheck },
};

export const StatusChip: React.FC<{ status: Status; label?: string; size?: 'sm' | 'md' }> = ({ status, label, size = 'sm' }) => {
  const { label: text, cls, Icon } = STYLES[status];
  const dims = size === 'sm' ? 'h-6 px-2 text-[11px] gap-1' : 'h-[30px] px-3 text-xs gap-1.5';
  return (
    <span className={`inline-flex items-center shrink-0 rounded-full font-extrabold box-border ${dims} ${cls}`}>
      <Icon size={size === 'sm' ? 11 : 13} strokeWidth={3} />
      {label ?? text}
    </span>
  );
};

/** Neutral tag (format, date, pillar, network). */
export const Tag: React.FC<{ children: React.ReactNode; tone?: 'raised' | 'edge' | 'pink' }> = ({ children, tone = 'raised' }) => {
  const cls = tone === 'pink' ? 'bg-pink/15 text-pink-text' : tone === 'edge' ? 'bg-edge text-white' : 'bg-raised text-white';
  return <span className={`inline-flex items-center h-7 px-2.5 rounded-full text-xs font-extrabold ${cls}`}>{children}</span>;
};
