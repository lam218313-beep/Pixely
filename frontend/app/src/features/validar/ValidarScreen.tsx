import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Check, ChevronUp, Clock, Lightbulb, List, PenLine, Play } from 'lucide-react';
import { awaitsPlan, finalAssets, pieceStage, useReviewPiece, usePieces } from '@/lib/content';
import { dueLabel, formatDay } from '@/lib/dates';
import type { CambioTipo, ContentPiece } from '@/lib/types';
import { Dot, ErrorState, ListRow, Loading, Screen } from '@/ui';
import { ChangesSheet } from '../shared/ChangesSheet';
import { PieceMedia } from '../shared/PieceMedia';

const SUGGESTIONS = ['Más luz', 'Otro encuadre', 'Logo más visible', 'Texto más corto'];

/** What the client decided since opening the app; survives going into a piece and back. */
const tally = { ok: 0, cambios: 0 };
export function countDecision(kind: 'ok' | 'cambios', delta = 1) { tally[kind] += delta; }
const UNDO_MS = 4000;
const SWIPE = 110;

export function networksOf(p: ContentPiece): string {
  const n: string[] = [];
  if (p.copy_instagram) n.push('Instagram');
  if (p.copy_linkedin) n.push('LinkedIn');
  if (p.copy_pinterest) n.push('Pinterest');
  if (p.copy_gbp) n.push('Google');
  if (p.copy_x) n.push('X');
  return n.join(', ');
}

/**
 * Validar: the finished pieces as a deck. Swipe right = aprobar, left = pedir cambios,
 * up = ver el texto y el porqué. The same three actions are buttons below.
 * An approval waits a few seconds before it is sent, so a slip of the thumb can be undone.
 */
export const ValidarScreen: React.FC = () => {
  const { data, isLoading, error, refetch } = usePieces();
  const review = useReviewPiece();
  const navigate = useNavigate();
  const [reviewed, setReviewedState] = useState({ ...tally });
  const setReviewed = (fn: (r: typeof tally) => typeof tally) => setReviewedState((r) => { const next = fn(r); tally.ok = next.ok; tally.cambios = next.cambios; return next; });
  const [undo, setUndo] = useState<{ id: string; timer: number } | null>(null);
  const [changesFor, setChangesFor] = useState<ContentPiece | null>(null);
  const undoRef = useRef(undo);
  undoRef.current = undo;

  // Leaving the screen sends a pending approval right away.
  useEffect(() => () => {
    const u = undoRef.current;
    if (u) { clearTimeout(u.timer); review.mutate({ id: u.id, estado: 'Aprobado' }); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // On a computer: → aprobar, ← pedir cambios, ↑ ver el texto (only when no panel is open).
  const keys = useRef<{ approve: () => void; changes: () => void; detail: () => void } | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!keys.current || e.altKey || e.ctrlKey || e.metaKey || (e.target as HTMLElement).closest('input,textarea,[role=dialog]')) return;
      if (e.key === 'ArrowRight') keys.current.approve();
      else if (e.key === 'ArrowLeft') keys.current.changes();
      else if (e.key === 'ArrowUp') keys.current.detail();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const queue = useMemo(() => (data ?? []).filter((p) => pieceStage(p) === 'revision' && p.id !== undo?.id), [data, undo]);

  if (isLoading) return <Screen title="Validar"><Loading /></Screen>;
  if (error) return <Screen title="Validar"><ErrorState message={error.message} onRetry={() => refetch()} /></Screen>;

  const approve = (p: ContentPiece) => {
    // Read the latest pending approval (not this render's copy): two quick swipes must not count a piece twice.
    const pending = undoRef.current;
    if (pending?.id === p.id) return;
    if (pending) { clearTimeout(pending.timer); review.mutate({ id: pending.id, estado: 'Aprobado' }); }
    const timer = window.setTimeout(() => { review.mutate({ id: p.id, estado: 'Aprobado' }); undoRef.current = null; setUndo(null); }, UNDO_MS);
    undoRef.current = { id: p.id, timer };
    setUndo(undoRef.current);
    setReviewed((r) => ({ ...r, ok: r.ok + 1 }));
  };
  const cancelApprove = () => {
    if (!undo) return;
    clearTimeout(undo.timer);
    undoRef.current = null;
    setUndo(null);
    setReviewed((r) => ({ ...r, ok: r.ok - 1 }));
  };
  const sendChanges = async (comentario: string, tipo?: CambioTipo) => {
    if (!changesFor) return;
    await review.mutateAsync({ id: changesFor.id, estado: 'Cambios solicitados', comentario, cambioTipo: tipo });
    setReviewed((r) => ({ ...r, cambios: r.cambios + 1 }));
    setChangesFor(null);
  };

  const total = queue.length + reviewed.ok + reviewed.cambios;
  const done = reviewed.ok + reviewed.cambios;
  const top = queue[0];
  keys.current = top && !changesFor ? { approve: () => approve(top), changes: () => setChangesFor(top), detail: () => navigate(`/validar/${top.id}`) } : null;

  return (
    <>
      {top ? (
        <div className="h-dvh flex flex-col px-5 pt-safe pb-[118px] lg:pb-10 lg:max-w-[520px] lg:mx-auto">
          <header className="pt-4 lg:pt-10 flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <h1 className="font-display font-bold text-[28px] m-0">Validar<Dot /></h1>
              <span className="inline-flex items-center h-[30px] px-3 rounded-full bg-pink/15 text-pink-text text-xs font-extrabold">{done + 1} de {total}</span>
            </div>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(total, 12)}, minmax(0, 1fr))` }}>
              {Array.from({ length: Math.min(total, 12) }, (_, i) => <span key={i} className={`h-1 rounded-full ${i <= done ? 'bg-pink' : 'bg-line'}`} />)}
            </div>
          </header>

          <Deck key={top.id} piece={top} behind={queue.length - 1}
            onApprove={() => approve(top)} onChanges={() => setChangesFor(top)} onDetail={() => navigate(`/validar/${top.id}`)} />

          <div className="flex items-center justify-center gap-[22px] pt-5">
            <button type="button" aria-label="Pedir cambios" onClick={() => setChangesFor(top)} className="w-16 h-16 rounded-full border border-line bg-card flex items-center justify-center active:scale-95 transition"><PenLine size={26} /></button>
            <Link to={`/validar/${top.id}`} aria-label="Ver texto y por qué" className="w-12 h-12 rounded-full border border-line flex items-center justify-center text-text-2 active:scale-95 transition"><List size={20} /></Link>
            <button type="button" aria-label="Aprobar" title="Aprobar (→)" onClick={() => approve(top)} className="w-[76px] h-[76px] rounded-full bg-pink-fill flex items-center justify-center shadow-[0_12px_28px_rgba(217,11,102,0.4)] active:scale-95 transition"><Check size={34} strokeWidth={3} /></button>
          </div>
          <p className="hidden lg:block m-0 mt-4 text-center text-xs text-text-3">Atajos: → aprobar · ← pedir cambios · ↑ ver el texto</p>
        </div>
      ) : (
        <AllDone reviewed={reviewed} pieces={data ?? []} />
      )}

      {undo && (
        <div role="status" className="fixed inset-x-0 lg:left-[260px] bottom-[120px] lg:bottom-8 z-40 px-5 flex justify-center">
          <div className="w-full max-w-[440px] bg-raised border border-line rounded-[18px] pl-4 pr-2 py-2 flex items-center justify-between gap-3 shadow-[0_12px_30px_rgba(0,0,0,0.5)]">
            <span className="inline-flex items-center gap-2 text-sm font-bold"><Check size={16} strokeWidth={3} className="text-pink-text" />Aprobada</span>
            <button type="button" onClick={cancelApprove} className="h-10 px-4 rounded-[12px] text-sm font-extrabold text-pink-text">Deshacer</button>
          </div>
        </div>
      )}

      <ChangesSheet open={!!changesFor} onClose={() => setChangesFor(null)} onSend={sendChanges} withType suggestions={SUGGESTIONS}
        sending={review.isPending} placeholder="Ej. La taza se ve muy oscura, prefiero la foto del local con luz de día." />
    </>
  );
};

/** The top card plus the two cards peeking behind it. Drag it with the thumb. */
const Deck: React.FC<{ piece: ContentPiece; behind: number; onApprove: () => void; onChanges: () => void; onDetail: () => void }> = ({ piece, behind, onApprove, onChanges, onDetail }) => {
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false, leaving: false });
  const start = useRef<{ x: number; y: number } | null>(null);
  const due = dueLabel(piece.fecha);
  const urls = finalAssets(piece);

  const onDown = (e: React.PointerEvent) => {
    if (drag.leaving || (e.target as HTMLElement).closest('a,button,video')) return;
    start.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag((d) => ({ ...d, active: true }));
  };
  const onMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    // Read the offset now: the updater may run after the finger lifts and `start` is cleared.
    const x = e.clientX - start.current.x;
    const y = e.clientY - start.current.y;
    setDrag((d) => ({ ...d, x, y }));
  };
  const onUp = () => {
    if (!start.current) return;
    start.current = null;
    const { x, y } = drag;
    if (x > SWIPE) { setDrag({ x: 600, y, active: false, leaving: true }); window.setTimeout(onApprove, 180); return; }
    setDrag({ x: 0, y: 0, active: false, leaving: false });
    if (x < -SWIPE) onChanges();
    else if (y < -90 && Math.abs(x) < 60) onDetail();
  };

  const hint = drag.x > 40 ? 'ok' : drag.x < -40 ? 'cambios' : null;

  return (
    <div className="relative flex-1 mt-[18px] min-h-[380px]">
      {behind > 1 && <div aria-hidden className="absolute inset-x-6 top-0 bottom-[18px] rounded-[32px] bg-raised" />}
      {behind > 0 && <div aria-hidden className="absolute inset-x-3 top-2 bottom-[9px] rounded-[32px] bg-edge" />}
      <article
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        className="absolute inset-x-0 top-4 bottom-0 rounded-[32px] bg-card border border-line overflow-hidden flex flex-col shadow-[0_24px_48px_rgba(0,0,0,0.6)] touch-none select-none"
        style={{
          transform: `translate(${drag.x}px, ${Math.min(drag.y, 0) * 0.4}px) rotate(${drag.x / 18}deg)`,
          transition: drag.active ? 'none' : 'transform 0.25s ease',
          opacity: drag.leaving ? 0 : 1,
        }}
        aria-label={piece.topico_angulo ?? 'Pieza por revisar'}
      >
        <div className="relative flex-1 min-h-0">
          <div className="absolute inset-0"><PieceMedia urls={urls} className="h-full w-full" interactive={false} /></div>
          <div className="absolute inset-x-3.5 top-3.5 flex justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 h-[30px] px-3 rounded-full bg-ink/75 text-xs font-extrabold">
              {piece.formato === 'Reel' && <Play size={13} fill="currentColor" />}{piece.formato ?? 'Pieza'}{piece.formato === 'Carrusel' && urls.length > 1 ? ` · ${urls.length}` : ''}
            </span>
            <span className={`inline-flex items-center gap-1.5 h-[30px] px-3 rounded-full bg-ink/75 text-xs font-extrabold ${due.urgent ? 'text-pink-text' : 'text-white'}`}>
              <Clock size={13} strokeWidth={2.5} />{due.text}
            </span>
          </div>
          {hint && (
            <span className={`absolute top-1/2 -translate-y-1/2 ${hint === 'ok' ? 'left-6 -rotate-12 bg-pink-fill' : 'right-6 rotate-12 border-2 border-pink-text text-pink-text bg-ink/70'} px-4 py-2 rounded-[14px] font-display font-bold text-xl`}>
              {hint === 'ok' ? 'Aprobar' : 'Cambios'}
            </span>
          )}
        </div>
        <div className="px-[18px] pt-4 pb-[18px] flex flex-col gap-1.5">
          <h2 className="m-0 font-display font-bold text-lg leading-tight">{piece.topico_angulo ?? 'Pieza sin título'}</h2>
          <p className="m-0 text-[13px] text-text-3">{formatDay(piece.fecha)}{networksOf(piece) ? ` · ${networksOf(piece)}` : ''}</p>
          <Link to={`/validar/${piece.id}`} className="mt-1.5 inline-flex items-center gap-1.5 text-[13px] font-extrabold text-pink-text no-underline">
            <ChevronUp size={16} strokeWidth={2.5} /> <span className="lg:hidden">Desliza arriba: texto y por qué</span><span className="hidden lg:inline">Ver texto y por qué</span>
          </Link>
        </div>
      </article>
    </div>
  );
};

/** Nothing left to review: a short summary and what comes next. */
const AllDone: React.FC<{ reviewed: { ok: number; cambios: number }; pieces: ContentPiece[] }> = ({ reviewed, pieces }) => {
  const enCambios = pieces.filter((p) => pieceStage(p) === 'cambios').length;
  const ideas = pieces.filter(awaitsPlan).length;
  const any = reviewed.ok + reviewed.cambios > 0;
  const summary = [
    reviewed.ok ? `Aprobaste ${reviewed.ok} ${reviewed.ok === 1 ? 'pieza' : 'piezas'}` : '',
    reviewed.cambios ? `pediste cambios en ${reviewed.cambios}` : '',
  ].filter(Boolean).join(' y ');
  return (
    <div className="relative min-h-full flex flex-col px-5 pt-safe pb-36 lg:pb-14 overflow-hidden">
      <div aria-hidden className="absolute left-1/2 top-[250px] w-[420px] h-[420px] -ml-[210px] -mt-[210px] rounded-full border border-raised" />
      <div aria-hidden className="absolute left-1/2 top-[250px] w-[290px] h-[290px] -ml-[145px] -mt-[145px] rounded-full border border-edge" />
      <div className="relative flex-1 flex flex-col items-center justify-center text-center gap-5 py-10">
        <span className="w-28 h-28 rounded-full bg-pink-fill flex items-center justify-center shadow-[0_0_0_14px_rgba(235,12,110,0.14),0_20px_48px_rgba(217,11,102,0.45)]"><Check size={52} strokeWidth={3} /></span>
        <h1 className="mt-4 mb-0 font-display font-bold text-4xl leading-[1.02]">Todo al<br />día<Dot /></h1>
        <p className="m-0 text-[15px] leading-relaxed text-text-2 max-w-[300px]">
          {any ? `${summary.charAt(0).toUpperCase()}${summary.slice(1)}. ` : 'No hay piezas esperando tu visto bueno. '}
          {enCambios > 0 ? `El equipo está corrigiendo ${enCambios === 1 ? '1 pieza' : `${enCambios} piezas`} y te avisamos cuando estén.` : 'Te avisamos cuando llegue la siguiente.'}
        </p>
      </div>
      {ideas > 0 && (
        <div className="relative">
          <ListRow to="/plan" icon={<Lightbulb size={22} />} accent title={`${ideas} ${ideas === 1 ? 'idea' : 'ideas'} por aprobar`} detail="Siguiente: tu plan" />
        </div>
      )}
    </div>
  );
};
