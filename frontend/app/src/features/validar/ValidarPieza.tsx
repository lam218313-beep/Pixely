import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Check, PenLine } from 'lucide-react';
import { finalAssets, pieceCopies, pieceStage, useReviewPiece, usePieces } from '@/lib/content';
import { formatDay } from '@/lib/dates';
import { pieceLinks, useStrategyIndex } from '@/lib/strategy';
import type { CambioTipo } from '@/lib/types';
import { Button, DetailScreen, ErrorState, Loading, Section, StatusChip } from '@/ui';
import { ChangesSheet } from '../shared/ChangesSheet';
import { PieceMedia } from '../shared/PieceMedia';
import { RutaEstrategica } from '../shared/RutaEstrategica';
import { countDecision } from './ValidarScreen';

const STAGE_CHIP = {
  revision: { status: 'te-toca', label: 'Te toca' },
  cambios: { status: 'cambios', label: 'Cambios pedidos' },
  aprobada: { status: 'aprobada', label: 'Aprobada' },
  programada: { status: 'programada', label: 'Programada' },
  publicada: { status: 'aprobada', label: 'Publicada' },
  produccion: { status: 'produccion', label: 'En producción' },
} as const;

/** Validar → una pieza: the piece, its text for each network, and why it exists. */
export const ValidarPieza: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = usePieces();
  const { data: index } = useStrategyIndex();
  const review = useReviewPiece();
  const [tab, setTab] = useState(0);
  const [asking, setAsking] = useState(false);

  if (isLoading) return <DetailScreen back="/validar"><Loading /></DetailScreen>;
  if (error) return <DetailScreen back="/validar"><ErrorState message={error.message} onRetry={() => refetch()} /></DetailScreen>;
  const piece = data?.find((p) => p.id === id);
  if (!piece) return <DetailScreen back="/validar"><ErrorState message="Esta pieza ya no está disponible." /></DetailScreen>;

  const stage = pieceStage(piece);
  const chip = STAGE_CHIP[stage];
  const copies = pieceCopies(piece);
  const links = pieceLinks(piece, index);
  const canDecide = stage === 'revision';

  const approve = async () => {
    await review.mutateAsync({ id: piece.id, estado: 'Aprobado' });
    countDecision('ok');
    navigate('/validar', { replace: true });
  };
  const sendChanges = async (comentario: string, tipo?: CambioTipo) => {
    await review.mutateAsync({ id: piece.id, estado: 'Cambios solicitados', comentario, cambioTipo: tipo });
    countDecision('cambios');
    setAsking(false);
    navigate('/validar', { replace: true });
  };

  return (
    <DetailScreen back="/validar" right={<StatusChip status={chip.status} label={chip.label} size="md" />}
      footer={canDecide ? (
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="secondary" icon={<PenLine size={18} />} onClick={() => setAsking(true)}>Cambios</Button>
          <Button icon={<Check size={18} strokeWidth={3} />} loading={review.isPending && !asking} onClick={approve}>Aprobar</Button>
        </div>
      ) : undefined}>
      <PieceMedia urls={finalAssets(piece)} className="-mx-5 -mt-2 aspect-[4/5] max-h-[62vh]" />

      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 font-display font-bold text-[22px] leading-tight">{piece.topico_angulo ?? 'Pieza sin título'}</h1>
        <p className="m-0 text-[13px] text-text-3">{piece.formato ?? 'Pieza'} · {formatDay(piece.fecha, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
      </div>

      {stage === 'cambios' && piece.comentario_cliente && (
        <div className="bg-card border border-pink-text/40 rounded-[20px] p-4">
          <p className="eyebrow m-0">Tu comentario</p>
          <p className="m-0 mt-1.5 text-sm leading-relaxed text-text-soft whitespace-pre-line">{piece.comentario_cliente}</p>
          <p className="m-0 mt-2 text-xs font-bold text-pink-text">El equipo la está corrigiendo</p>
        </div>
      )}

      {copies.length > 0 && (
        <Section title="El texto">
          {copies.length > 1 && (
            <div role="tablist" aria-label="Red" className="grid bg-card border border-edge rounded-[16px] p-1" style={{ gridTemplateColumns: `repeat(${copies.length}, minmax(0, 1fr))` }}>
              {copies.map((c, i) => (
                <button key={c.label} type="button" role="tab" aria-selected={tab === i} onClick={() => setTab(i)}
                  className={`h-10 rounded-[12px] text-sm ${tab === i ? 'bg-edge font-extrabold' : 'text-text-3 font-bold'}`}>{c.label}</button>
              ))}
            </div>
          )}
          <div className="bg-card border border-edge rounded-[22px] p-4 text-[15px] leading-relaxed text-text-soft whitespace-pre-line break-words">
            {copies[Math.min(tab, copies.length - 1)].text}
          </div>
          {copies[0].label === 'Instagram' && tab === 0 && <p className="m-0 text-xs text-text-3">Este mismo texto va en Facebook y TikTok si tu marca los usa.</p>}
        </Section>
      )}

      {(links.length > 0 || piece.razon) && (
        <Section title="Por qué esta pieza">
          <div className="bg-card border border-edge rounded-[22px] p-4 flex flex-col gap-4">
            <RutaEstrategica links={links} />
            {piece.razon && <p className="m-0 text-sm leading-relaxed text-text-2 border-t border-edge pt-3.5">{piece.razon}</p>}
          </div>
        </Section>
      )}

      <ChangesSheet open={asking} onClose={() => setAsking(false)} onSend={sendChanges} withType sending={review.isPending}
        suggestions={['Más luz', 'Otro encuadre', 'Logo más visible', 'Texto más corto']}
        placeholder="Ej. Prefiero que el texto no mencione el precio." />
    </DetailScreen>
  );
};
