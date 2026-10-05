import React from 'react';
import type { PieceLink } from '@/lib/strategy';

/** Objetivo → Estrategia → Concepto(s), as a short vertical path. */
export const RutaEstrategica: React.FC<{ links: PieceLink[] }> = ({ links }) => {
  if (links.length === 0) return null;
  const main = links[0];
  const concepts = links.flatMap((l) => l.concepts);
  const steps = [
    { label: 'Objetivo', value: main.objective, dot: 'bg-pink' },
    ...(main.strategy ? [{ label: 'Estrategia', value: main.strategy, dot: 'border-2 border-pink' }] : []),
  ];
  return (
    <div className="flex flex-col gap-4">
      {steps.map((s) => (
        <div key={s.label} className="flex gap-3.5">
          <span className="flex flex-col items-center pt-1"><span className={`w-2.5 h-2.5 rounded-full box-border ${s.dot}`} /><span className="flex-1 w-0.5 bg-line mt-1 min-h-6" /></span>
          <div className="min-w-0">
            <p className="m-0 text-[11px] font-extrabold uppercase tracking-[0.08em] text-text-3">{s.label}</p>
            <p className="m-0 mt-0.5 text-sm font-bold leading-snug">{s.value}</p>
          </div>
        </div>
      ))}
      {concepts.length > 0 && (
        <div className="flex gap-3.5">
          <span className="pt-1"><span className="block w-2.5 h-2.5 rounded-full border-2 border-text-3 box-border" /></span>
          <div className="min-w-0">
            <p className="m-0 text-[11px] font-extrabold uppercase tracking-[0.08em] text-text-3">{concepts.length > 1 ? `Combina ${concepts.length} conceptos` : 'Concepto'}</p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {concepts.map((c) => <span key={c} className="inline-flex items-center h-7 px-2.5 rounded-full bg-edge text-xs font-extrabold">{c}</span>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
