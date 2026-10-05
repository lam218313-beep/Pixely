import React, { useState } from 'react';
import { Check, MessageCircle, PenLine, Target } from 'lucide-react';
import { useReviewStrategy, useStrategyReview } from '@/lib/brand';
import { formatDay } from '@/lib/dates';
import { useStrategyIndex } from '@/lib/strategy';
import { Button, DetailScreen, Dot, EmptyState, ErrorState, Loading, StatusChip } from '@/ui';
import { ChangesSheet } from '../shared/ChangesSheet';
import { WHATSAPP } from './MarcaScreens';

/** Estrategia: objectives, their strategies and the concepts every idea comes from. */
export const MarcaEstrategia: React.FC = () => {
  const strategy = useStrategyIndex();
  const review = useStrategyReview();
  const decide = useReviewStrategy();
  const [asking, setAsking] = useState(false);

  if (strategy.isLoading) return <DetailScreen back="/marca"><Loading /></DetailScreen>;
  if (strategy.error) return <DetailScreen back="/marca"><ErrorState message={strategy.error.message} onRetry={() => strategy.refetch()} /></DetailScreen>;
  const index = strategy.data;
  if (!index || index.objectives.length === 0) return <DetailScreen back="/marca"><EmptyState icon={<Target size={26} />} title="Tu estrategia está en preparación" text="Te avisamos cuando esté lista para que la revises." /></DetailScreen>;

  const estado = review.data?.estado ?? 'Pendiente';
  const tree = index.objectives.map((o) => ({
    ...o,
    strategies: [...index.strategies.values()].filter((s) => s.objectiveId === o.id).map((s) => ({ ...s, concepts: [...index.concepts.values()].filter((c) => c.strategyId === s.id) })),
  }));

  return (
    <DetailScreen back="/marca"
      right={estado === 'Aprobada'
        ? <StatusChip status="aprobada" size="md" label={review.data?.revisada_at ? `Aprobada el ${formatDay(review.data.revisada_at.slice(0, 10), { day: 'numeric', month: 'short' })}` : 'Aprobada'} />
        : estado === 'Cambios solicitados' ? <StatusChip status="cambios" label="Cambios pedidos" size="md" /> : <StatusChip status="te-toca" size="md" />}
      footer={estado !== 'Aprobada' ? (
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="secondary" icon={<PenLine size={18} />} onClick={() => setAsking(true)}>Cambios</Button>
          <Button icon={<Check size={18} strokeWidth={3} />} loading={decide.isPending && !asking} onClick={() => decide.mutate({ estado: 'Aprobada' })}>Aprobar</Button>
        </div>
      ) : undefined}>
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-display font-bold text-[30px] leading-[1.04]">Tu estrategia<Dot /></h1>
        <p className="m-0 text-sm leading-relaxed text-text-2">{tree.length} {tree.length === 1 ? 'objetivo' : 'objetivos'}. Cada idea de tu plan nace de uno de estos conceptos.</p>
      </div>

      {estado === 'Cambios solicitados' && review.data?.comentario && (
        <div className="bg-card border border-pink-text/40 rounded-[20px] p-4">
          <p className="eyebrow m-0">Tu comentario</p>
          <p className="m-0 mt-1.5 text-sm leading-relaxed text-text-soft whitespace-pre-line">{review.data.comentario}</p>
          <p className="m-0 mt-2 text-xs font-bold text-pink-text">El equipo la está ajustando</p>
        </div>
      )}

      {tree.map((o) => (
        <section key={o.id} className={`bg-card rounded-[24px] p-[18px] flex flex-col gap-3.5 border ${o.principal ? 'border-pink' : 'border-edge'}`}>
          <div className="flex justify-between items-center gap-2.5">
            <span className={`inline-flex items-center h-[26px] px-2.5 rounded-full text-[11px] font-extrabold ${o.principal ? 'bg-pink-fill' : 'bg-edge'}`}>{o.principal ? 'Objetivo principal' : 'Objetivo'}</span>
            <span className="text-xs font-bold text-text-3">{o.strategies.reduce((n, s) => n + s.concepts.length, 0)} conceptos</span>
          </div>
          <h2 className="m-0 font-display font-bold text-lg leading-tight">{o.label}</h2>
          <div className="flex flex-col gap-3 pl-3.5 ml-0.5 border-l-2 border-line">
            {o.strategies.map((s) => (
              <div key={s.id} className="flex flex-col gap-2">
                <p className="m-0 text-sm font-extrabold leading-snug text-text-soft">{s.label}</p>
                <div className="flex flex-wrap gap-1.5">{s.concepts.map((c) => <span key={c.id} className="inline-flex items-center h-7 px-2.5 rounded-full bg-ink border border-line text-xs font-bold text-text-2">{c.label}</span>)}</div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {estado === 'Aprobada' && (
        <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 py-1.5 text-sm font-extrabold text-pink-text no-underline">
          <MessageCircle size={18} /> ¿Algo cambió en tu negocio? Coméntalo al equipo
        </a>
      )}

      <ChangesSheet open={asking} onClose={() => setAsking(false)} sending={decide.isPending}
        onSend={async (c) => { await decide.mutateAsync({ estado: 'Cambios solicitados', comentario: c }); setAsking(false); }}
        placeholder="Ej. Este año nos importa más vender suscripciones que llenar el local." />
    </DetailScreen>
  );
};
