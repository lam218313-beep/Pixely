import React, { useState } from 'react';
import { Check, MessageSquare, PenLine, X } from 'lucide-react';
import { hasVoice, useBrand, useReviewVoice } from '@/lib/brand';
import { Button, DetailScreen, Dot, EmptyState, ErrorState, Loading, Section, StatusChip } from '@/ui';
import { ChangesSheet } from '../shared/ChangesSheet';

/** Voz de marca: archetype, how it sounds (yes / no), its words, and a post written with it. */
export const MarcaVoz: React.FC = () => {
  const brand = useBrand();
  const review = useReviewVoice();
  const [asking, setAsking] = useState(false);

  if (brand.isLoading) return <DetailScreen back="/marca"><Loading /></DetailScreen>;
  if (brand.error) return <DetailScreen back="/marca"><ErrorState message={brand.error.message} onRetry={() => brand.refetch()} /></DetailScreen>;
  const voice = brand.data?.voice;
  if (!hasVoice(voice)) return <DetailScreen back="/marca"><EmptyState icon={<MessageSquare size={26} />} title="Tu voz está en preparación" text="El equipo la está escribiendo. Te avisamos cuando esté lista para que la revises." /></DetailScreen>;

  const estado = voice.voz_estado ?? 'Pendiente';
  const decide = estado !== 'Aprobada';
  const handle = (brand.data?.name ?? 'tumarca').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');

  return (
    <DetailScreen back="/marca"
      right={estado === 'Aprobada' ? <StatusChip status="aprobada" size="md" /> : estado === 'Cambios solicitados' ? <StatusChip status="cambios" label="Cambios pedidos" size="md" /> : <StatusChip status="te-toca" size="md" />}
      footer={decide ? (
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="secondary" icon={<PenLine size={18} />} onClick={() => setAsking(true)}>Cambios</Button>
          <Button icon={<Check size={18} strokeWidth={3} />} loading={review.isPending && !asking} onClick={() => review.mutate({ estado: 'Aprobada' })}>Aprobar voz</Button>
        </div>
      ) : undefined}>
      <div className="flex flex-col gap-2.5">
        <p className="eyebrow m-0">Tu voz de marca</p>
        <h1 className="m-0 font-display font-bold text-[32px] leading-[1.02]">{voice.archetype ?? 'Tu voz'}<Dot /></h1>
        {voice.arquetipo_razon && <p className="m-0 text-[15px] leading-relaxed text-text-2">{voice.arquetipo_razon}</p>}
      </div>

      {estado === 'Cambios solicitados' && voice.voz_comentario && (
        <div className="bg-card border border-pink-text/40 rounded-[20px] p-4">
          <p className="eyebrow m-0">Tu comentario</p>
          <p className="m-0 mt-1.5 text-sm leading-relaxed text-text-soft whitespace-pre-line">{voice.voz_comentario}</p>
          <p className="m-0 mt-2 text-xs font-bold text-pink-text">El equipo la está ajustando</p>
        </div>
      )}

      {!!voice.tone_traits?.length && (
        <Section title="Así suena">
          {voice.tone_traits.map((t) => (
            <div key={t.trait} className="bg-card border border-edge rounded-[22px] p-4 flex flex-col gap-2.5">
              <div>
                <p className="m-0 text-base font-extrabold">{t.trait}</p>
                {(t.description || t.desc) && <p className="m-0 mt-0.5 text-[13px] leading-snug text-text-3">{t.description || t.desc}</p>}
              </div>
              {t.ejemplo_si && (
                <p className="m-0 flex gap-2.5 items-start text-sm leading-snug"><span className="w-[22px] h-[22px] rounded-full bg-pink-fill flex items-center justify-center shrink-0"><Check size={12} strokeWidth={3.5} /></span>"{t.ejemplo_si}"</p>
              )}
              {t.ejemplo_no && (
                <p className="m-0 flex gap-2.5 items-start text-sm leading-snug text-text-3"><span className="w-[22px] h-[22px] rounded-full bg-edge flex items-center justify-center shrink-0"><X size={11} strokeWidth={3.5} /></span><span className="line-through decoration-mute">"{t.ejemplo_no}"</span></p>
              )}
            </div>
          ))}
        </Section>
      )}

      {(!!voice.palabras_si?.length || !!voice.palabras_no?.length) && (
        <Section title="Palabras">
          <div className="flex flex-wrap gap-1.5">{voice.palabras_si?.map((w) => <span key={w} className="inline-flex items-center h-[30px] px-3 rounded-full bg-pink/15 text-pink-text text-[13px] font-extrabold">{w}</span>)}</div>
          <div className="flex flex-wrap gap-1.5">{voice.palabras_no?.map((w) => <span key={w} className="inline-flex items-center h-[30px] px-3 rounded-full border border-line text-text-3 text-[13px] font-bold line-through">{w}</span>)}</div>
          <p className="m-0 text-xs text-text-3">En rosa, las que usamos. Tachadas, las que tu marca nunca dirá.</p>
        </Section>
      )}

      {voice.ejemplo_post && (
        <Section title="Un post con tu voz">
          <div className="bg-card border border-edge rounded-[22px] overflow-hidden">
            <div className="flex items-center gap-2.5 px-3.5 py-3">
              <span className="w-8 h-8 rounded-full bg-pink-fill flex items-center justify-center text-[13px] font-extrabold">{handle.charAt(0).toUpperCase()}</span>
              <span className="text-[13px] font-extrabold">{handle}</span>
            </div>
            <p className="m-0 px-3.5 pb-4 text-sm leading-relaxed text-text-soft whitespace-pre-line"><strong className="text-white">{handle}</strong> {voice.ejemplo_post}</p>
          </div>
        </Section>
      )}

      <ChangesSheet open={asking} onClose={() => setAsking(false)} sending={review.isPending}
        onSend={async (c) => { await review.mutateAsync({ estado: 'Cambios solicitados', comentario: c }); setAsking(false); }}
        suggestions={['Más cercano', 'Más formal', 'Menos emojis']} placeholder="Ej. Nos sentimos más cercanos; preferimos tutear siempre." />
    </DetailScreen>
  );
};
