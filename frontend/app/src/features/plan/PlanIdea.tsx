import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Check, Info, PenLine, Search } from 'lucide-react';
import { awaitsPlan, canReviewPlan, planEstado, useReviewIdea } from '@/lib/content';
import { formatDay, parseDay, weekRow, weekdayShort } from '@/lib/dates';
import { pieceLinks, useStrategyIndex } from '@/lib/strategy';
import type { ContentPiece } from '@/lib/types';
import { Button, DetailScreen, ErrorState, Loading, Section, StatusChip, Tag } from '@/ui';
import { ChangesSheet } from '../shared/ChangesSheet';
import { RutaEstrategica } from '../shared/RutaEstrategica';
import { usePlanMonth } from './usePlanMonth';

/**
 * Plan → una idea. Text and strategy only (the finished piece is reviewed later in Validar):
 * what we'll tell, its slides or scenes, why we propose it, the market fact behind it,
 * where it sits in the strategy and in its week. Approving moves on to the next waiting idea.
 */
export const PlanIdea: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const plan = usePlanMonth();
  const { data: index } = useStrategyIndex();
  const review = useReviewIdea();
  const [asking, setAsking] = useState(false);

  const all = plan.data ?? [];
  const piece = all.find((p) => p.id === id);
  const month = piece ? piece.fecha.slice(0, 7) : plan.month;
  const search = `?mes=${month}`;
  const waiting = useMemo(() => all.filter((p) => p.fecha.startsWith(month) && awaitsPlan(p)), [all, month]);

  if (plan.isLoading) return <DetailScreen back={`/plan${search}`}><Loading /></DetailScreen>;
  if (plan.error) return <DetailScreen back={`/plan${search}`}><ErrorState message={plan.error.message} onRetry={() => plan.refetch()} /></DetailScreen>;
  if (!piece) return <DetailScreen back={`/plan${search}`}><ErrorState message="Esta idea ya no está en el plan." /></DetailScreen>;

  const estado = planEstado(piece);
  const reviewable = canReviewPlan(piece) && estado !== 'Aprobada';
  const position = waiting.findIndex((p) => p.id === piece.id);
  const links = pieceLinks(piece, index);
  const steps = [...(piece.estructura ?? [])].filter((s) => s?.titulo).sort((a, b) => a.n - b.n);
  const sameWeek = all.filter((p) => p.fecha.startsWith(month) && weekRow(p.fecha) === weekRow(piece.fecha));

  const next = () => {
    const after = waiting.filter((p) => p.id !== piece.id);
    const following = after.find((p) => p.fecha >= piece.fecha) ?? after[0];
    navigate(following ? `/plan/${following.id}${search}` : `/plan${search}`, { replace: true });
  };
  const approve = async () => {
    await review.mutateAsync({ id: piece.id, estado: 'Aprobada' });
    next();
  };
  const sendChanges = async (comentario: string) => {
    await review.mutateAsync({ id: piece.id, estado: 'Cambios solicitados', comentario });
    setAsking(false);
    next();
  };

  const chip = estado === 'Aprobada'
    ? <StatusChip status={canReviewPlan(piece) ? 'aprobada' : 'produccion'} size="md" />
    : estado === 'Cambios solicitados' ? <StatusChip status="cambios" size="md" /> : <StatusChip status="te-toca" size="md" />;

  return (
    <DetailScreen back={`/plan${search}`} right={chip}
      center={position >= 0 && waiting.length > 0 ? (
        <span className="flex flex-col items-center gap-1.5">
          <span className="text-xs font-bold text-text-3">Idea {position + 1} de {waiting.length} pendientes</span>
          <span className="flex gap-1" aria-hidden>{waiting.slice(0, 8).map((p, i) => <span key={p.id} className={`w-[18px] h-1 rounded-full ${i === position ? 'bg-pink' : 'bg-line'}`} />)}</span>
        </span>
      ) : undefined}
      footer={reviewable ? (
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="secondary" icon={<PenLine size={18} />} onClick={() => setAsking(true)}>Cambios</Button>
          <Button icon={<Check size={18} strokeWidth={3} />} loading={review.isPending && !asking} onClick={approve}>Aprobar idea</Button>
        </div>
      ) : undefined}>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          {piece.formato && <Tag>{piece.formato}</Tag>}
          <Tag>{formatDay(piece.fecha, { weekday: 'short', day: 'numeric', month: 'short' })}</Tag>
          {piece.pilar && <Tag>{piece.pilar}</Tag>}
        </div>
        <h1 className="m-0 font-display font-bold text-[26px] leading-[1.12]">{piece.topico_angulo ?? 'Idea sin título'}</h1>
      </div>

      {estado === 'Cambios solicitados' && piece.plan_comentario && (
        <div className="bg-card border border-pink-text/40 rounded-[20px] p-4">
          <p className="eyebrow m-0">Tu comentario</p>
          <p className="m-0 mt-1.5 text-sm leading-relaxed text-text-soft whitespace-pre-line">{piece.plan_comentario}</p>
          <p className="m-0 mt-2 text-xs font-bold text-pink-text">El equipo está ajustando esta idea</p>
        </div>
      )}

      {(piece.descripcion_visual || steps.length > 0) && (
        <Section title="Qué contaremos">
          {piece.descripcion_visual && <p className="m-0 text-[15px] leading-relaxed text-text-soft">{piece.descripcion_visual}</p>}
          {steps.length > 0 && (
            <>
              <ol className="m-0 p-0 list-none flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
                {steps.map((s) => (
                  <li key={s.n} className="w-[76px] shrink-0 aspect-[4/5] rounded-[12px] bg-card border border-edge p-2 flex flex-col justify-between">
                    <span className="text-[11px] font-extrabold text-pink-text">{s.n}</span>
                    <span className="text-[11px] font-bold text-text-2 leading-tight">{s.titulo}</span>
                  </li>
                ))}
              </ol>
              <div className="flex flex-col gap-2">
                {steps.filter((s) => s.detalle).map((s) => (
                  <p key={s.n} className="m-0 text-sm leading-snug text-text-2"><strong className="text-white">{s.n}. {s.titulo}:</strong> {s.detalle}</p>
                ))}
              </div>
            </>
          )}
          <p className="m-0 text-xs text-text-3">{piece.formato === 'Reel' ? 'Guion en palabras.' : 'En palabras.'} Las imágenes llegan en Validar.</p>
        </Section>
      )}

      {piece.razon && (
        <Section title="Por qué la proponemos">
          <p className="m-0 text-[15px] leading-relaxed text-text-soft">{piece.razon}</p>
        </Section>
      )}

      {piece.evidencia && (
        <div className="bg-card border border-edge rounded-[22px] p-4 flex gap-3.5">
          <span className="w-10 h-10 rounded-[12px] bg-pink/15 text-pink-text flex items-center justify-center shrink-0"><Search size={20} /></span>
          <span className="flex flex-col gap-1.5 min-w-0">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-pink-text">El dato de mercado detrás</span>
            <EvidenceText text={piece.evidencia} />
          </span>
        </div>
      )}

      {links.length > 0 && (
        <Section title="Ruta estratégica">
          <div className="bg-card border border-edge rounded-[22px] p-4"><RutaEstrategica links={links} /></div>
        </Section>
      )}

      <WeekStrip piece={piece} week={sameWeek} />

      <p className="m-0 flex gap-2 text-[13px] leading-snug text-text-3">
        <Info size={16} className="shrink-0 mt-px" />
        Aquí apruebas la idea. La pieza terminada, con su texto final, la verás en Validar.
      </p>

      <ChangesSheet open={asking} onClose={() => setAsking(false)} onSend={(c) => sendChanges(c)} sending={review.isPending}
        suggestions={['Cambiar el ángulo', 'Otro día', 'Otro formato']} placeholder="Ej. Prefiero que no mencionen la hora; mejor digan en la mañana." />
    </DetailScreen>
  );
};

/** "3 competidores … (Google Maps, 1 oct)" → the fact, and the source on its own line. */
const EvidenceText: React.FC<{ text: string }> = ({ text }) => {
  const m = text.match(/^(.*)\(([^()]+)\)\s*$/);
  return (
    <>
      <span className="text-[15px] font-bold leading-snug">{(m ? m[1] : text).trim().replace(/[;,.]\s*$/, '')}.</span>
      {m && <span className="text-xs text-text-3">Fuente: {m[2]}</span>}
    </>
  );
};

/** The idea's week: which days have pieces and which one this is. */
const WeekStrip: React.FC<{ piece: ContentPiece; week: ContentPiece[] }> = ({ piece, week }) => {
  const d = parseDay(piece.fecha);
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
  const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  const before = week.filter((p) => p.id !== piece.id && p.fecha < piece.fecha && planEstado(p) === 'Aprobada').pop();
  return (
    <Section title="Su semana">
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const here = week.find((p) => p.fecha.slice(0, 10) === iso(day));
          const isThis = here?.id === piece.id;
          return (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <span className={`text-[11px] font-bold ${isThis ? 'text-pink-text font-extrabold' : 'text-text-3'}`}>{weekdayShort(iso(day)).charAt(0)} {here ? day.getDate() : ''}</span>
              <span className={`w-full h-10 rounded-[10px] flex items-center justify-center text-[10px] font-extrabold ${isThis ? 'bg-pink-fill' : here ? 'bg-edge text-text-2' : 'bg-card'}`}>
                {isThis ? 'Esta' : here?.formato ?? ''}
              </span>
            </div>
          );
        })}
      </div>
      {before && <p className="m-0 text-[13px] leading-snug text-text-2">Sale después de <strong className="text-white">"{before.topico_angulo}"</strong>, que ya aprobaste.</p>}
    </Section>
  );
};
