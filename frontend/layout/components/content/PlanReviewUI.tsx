/**
 * Planificación is where the client signs off the month's ideas, one by one, before
 * anything is produced. Text and strategy only: images and copy are reviewed later,
 * in Validación, on the finished piece.
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Eye, Loader2, MessageSquareWarning, X } from 'lucide-react';
import * as api from '../../services/api';
import { FormatoBadge, PilarBadge, PieceStrategy, PieceReasoning, PieceWhyLine, formatFecha } from './ContentPieceUI';
import { pieceLinks, type StrategyIndex } from './strategyLinks';

// Status colors, always shown with their icon and word.
export const PLAN_META: Record<api.PlanEstado, { label: string; color: string; icon: React.ElementType }> = {
    Pendiente: { label: 'Por revisar', color: '#fab219', icon: Eye },
    'Cambios solicitados': { label: 'Cambios pedidos', color: '#ec835a', icon: MessageSquareWarning },
    Aprobada: { label: 'Aprobada', color: '#0ca30c', icon: Check },
};

export const planEstado = (p: api.ContentPiece): api.PlanEstado => p.plan_estado ?? 'Pendiente';

/** Once the copy is being written the idea is in production: changes are asked for in Validación instead. */
export const canReviewPlan = (p: api.ContentPiece) => (p.estado_copy ?? 'Pendiente') === 'Pendiente';

export const PlanChip: React.FC<{ piece: api.ContentPiece }> = ({ piece }) => {
    const meta = PLAN_META[planEstado(piece)];
    const Icon = meta.icon;
    return (
        <span className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-gray-800 whitespace-nowrap" style={{ background: `${meta.color}1F` }}>
            <Icon size={13} style={{ color: meta.color }} strokeWidth={2.5} /> {meta.label}
        </span>
    );
};

// --- The month's sign-off status ---

export const PlanSummaryBar: React.FC<{ pieces: api.ContentPiece[]; onApprovePending: () => Promise<void> }> = ({ pieces, onApprovePending }) => {
    const count = (e: api.PlanEstado) => pieces.filter((p) => planEstado(p) === e).length;
    const approved = count('Aprobada');
    const changes = count('Cambios solicitados');
    const pendingReviewable = pieces.filter((p) => planEstado(p) === 'Pendiente' && canReviewPlan(p)).length;
    const pending = count('Pendiente');
    const [confirming, setConfirming] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const approveAll = async () => {
        setSaving(true); setError(null);
        try { await onApprovePending(); setConfirming(false); }
        catch (e) { setError(e instanceof Error ? e.message : 'No se pudo aprobar'); }
        finally { setSaving(false); }
    };

    const message = pending === 0 && changes === 0
        ? 'Aprobaste todas las ideas del mes. Ya las estamos produciendo; el contenido final lo revisas en Validación.'
        : pending === 0
        ? `El equipo está ajustando ${changes === 1 ? 'la idea' : `las ${changes} ideas`} con tus comentarios; ${changes === 1 ? 'volverá' : 'volverán'} aquí para que ${changes === 1 ? 'la revises' : 'las revises'}. Las aprobadas ya se están produciendo.`
        : 'Revisa cada idea del mes: apruébala o pídenos un cambio. Solo producimos las que apruebes; la imagen y los textos finales los revisas después en Validación.';

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0 max-w-2xl">
                    <p className="text-base font-bold text-gray-900">
                        {approved} de {pieces.length} ideas aprobadas
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">{message}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                        {(['Pendiente', 'Cambios solicitados', 'Aprobada'] as api.PlanEstado[]).map((e) => {
                            const meta = PLAN_META[e];
                            return (
                                <span key={e} className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                                    <meta.icon size={13} style={{ color: meta.color }} strokeWidth={2.5} />
                                    {count(e)} {e === 'Pendiente' ? 'por revisar' : e === 'Aprobada' ? (count(e) === 1 ? 'aprobada' : 'aprobadas') : 'con cambios pedidos'}
                                </span>
                            );
                        })}
                    </div>
                </div>
                {pendingReviewable > 0 && (
                    confirming ? (
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm text-gray-700">¿Aprobar las {pendingReviewable} ideas por revisar?</span>
                            <button onClick={() => setConfirming(false)} disabled={saving} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">No</button>
                            <button onClick={approveAll} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-bold shadow-lg shadow-pink-500/20 disabled:opacity-60">
                                {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Sí, aprobar
                            </button>
                        </div>
                    ) : (
                        <button onClick={() => setConfirming(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-800 hover:bg-gray-50">
                            <Check size={15} /> Aprobar las {pendingReviewable} por revisar
                        </button>
                    )
                )}
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>
    );
};

// --- The list of ideas ---

type Filter = 'todas' | api.PlanEstado;

export const PlanPieceList: React.FC<{
    pieces: api.ContentPiece[];
    index: StrategyIndex | null;
    onOpen: (p: api.ContentPiece) => void;
    onApprove: (p: api.ContentPiece) => Promise<void>;
}> = ({ pieces, index, onOpen, onApprove }) => {
    const [filter, setFilter] = useState<Filter>('todas');
    const [busy, setBusy] = useState<string | null>(null);
    const sorted = [...pieces].sort((a, b) => a.fecha.localeCompare(b.fecha));
    const shown = filter === 'todas' ? sorted : sorted.filter((p) => planEstado(p) === filter);
    const tabs: { key: Filter; label: string; n: number }[] = [
        { key: 'todas', label: 'Todas', n: pieces.length },
        ...(['Pendiente', 'Cambios solicitados', 'Aprobada'] as api.PlanEstado[]).map((e) => ({ key: e as Filter, label: PLAN_META[e].label, n: pieces.filter((p) => planEstado(p) === e).length })),
    ];

    const approve = async (p: api.ContentPiece) => {
        setBusy(p.id);
        try { await onApprove(p); } finally { setBusy(null); }
    };

    return (
        <section aria-label="Ideas del plan">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Las ideas del mes</h2>
                    <p className="text-sm text-gray-500">Abre una idea para ver de dónde sale en tu estrategia y por qué la proponemos.</p>
                </div>
                <div className="flex flex-wrap gap-1 bg-white border border-gray-200 rounded-xl p-1" role="tablist">
                    {tabs.map((t) => (
                        <button key={t.key} role="tab" aria-selected={filter === t.key} onClick={() => setFilter(t.key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filter === t.key ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                            {t.label} <span className="tabular-nums opacity-70">{t.n}</span>
                        </button>
                    ))}
                </div>
            </div>

            {shown.length === 0 ? (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-10 text-center text-sm text-gray-500">No hay ideas en este grupo.</div>
            ) : (
                <ul className="bg-white rounded-3xl border border-gray-100 shadow-sm divide-y divide-gray-100 overflow-hidden">
                    {shown.map((piece) => {
                        const estado = planEstado(piece);
                        const reviewable = canReviewPlan(piece);
                        return (
                            <li key={piece.id} className="grid grid-cols-[56px_1fr] md:grid-cols-[72px_1fr_auto] items-center gap-x-4 gap-y-3 px-5 py-4 hover:bg-gray-50/70 transition-colors">
                                <span className="text-center self-start md:self-center">
                                    <span className="block text-2xl font-bold text-gray-900 leading-none">{Number(piece.fecha.slice(8, 10))}</span>
                                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mt-1">{formatFecha(piece.fecha, { weekday: 'short' })}</span>
                                </span>
                                <button onClick={() => onOpen(piece)} className="min-w-0 text-left">
                                    <span className="block text-sm font-bold text-gray-900 leading-snug hover:underline underline-offset-2">{piece.topico_angulo || 'Idea sin tópico'}</span>
                                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                                        <FormatoBadge formato={piece.formato} />
                                        <PilarBadge pilar={piece.pilar} />
                                    </span>
                                    <PieceWhyLine piece={piece} index={index} />
                                    {piece.plan_comentario && estado === 'Cambios solicitados' && (
                                        <span className="block text-xs text-gray-600 italic border-l-2 border-orange-200 pl-2 mt-2">“{piece.plan_comentario}”</span>
                                    )}
                                </button>
                                <span className="col-start-2 md:col-start-auto flex flex-wrap items-center gap-2 md:justify-end">
                                    <PlanChip piece={piece} />
                                    {!reviewable && estado === 'Aprobada' && <span className="text-xs text-gray-400">en producción</span>}
                                    {reviewable && estado !== 'Aprobada' && (
                                        <button onClick={() => approve(piece)} disabled={busy === piece.id}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 disabled:opacity-60">
                                            {busy === piece.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} strokeWidth={3} />} Aprobar
                                        </button>
                                    )}
                                    {reviewable && (
                                        <button onClick={() => onOpen(piece)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 hover:bg-white">
                                            <MessageSquareWarning size={13} /> {estado === 'Cambios solicitados' ? 'Editar comentario' : 'Pedir cambio'}
                                        </button>
                                    )}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
};

// --- One idea, text and strategy only ---

export const PlanPieceModal: React.FC<{
    piece: api.ContentPiece;
    index: StrategyIndex | null;
    onClose: () => void;
    onReview: (estado: 'Aprobada' | 'Cambios solicitados', comentario?: string) => Promise<void>;
}> = ({ piece, index, onClose, onReview }) => {
    const estado = planEstado(piece);
    const reviewable = canReviewPlan(piece);
    const links = pieceLinks(piece, index);
    const [asking, setAsking] = useState(false);
    const [comment, setComment] = useState(piece.plan_comentario ?? '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const submit = async (next: 'Aprobada' | 'Cambios solicitados') => {
        if (next === 'Cambios solicitados' && !comment.trim()) { setError('Cuéntanos qué cambiarías de esta idea.'); return; }
        setSaving(true); setError(null);
        try {
            await onReview(next, next === 'Cambios solicitados' ? comment.trim() : undefined);
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo guardar tu revisión');
        } finally {
            setSaving(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}
                role="dialog" aria-modal="true" aria-label={piece.topico_angulo ?? 'Idea del plan'}>
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <PlanChip piece={piece} />
                            <FormatoBadge formato={piece.formato} />
                            <PilarBadge pilar={piece.pilar} />
                            {piece.marcador && <span className="text-xs font-semibold text-gray-500">{piece.marcador === 'I' ? 'Con dato de mercado' : 'Idea creativa'}</span>}
                        </div>
                        <button onClick={onClose} className="p-2 -m-2 rounded-full hover:bg-gray-100 text-gray-400" aria-label="Cerrar"><X size={20} /></button>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                        {formatFecha(piece.fecha, { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <h3 className="text-xl font-bold text-gray-900 leading-snug">{piece.topico_angulo || 'Idea sin tópico'}</h3>
                </div>

                <PieceStrategy links={links} />
                <PieceReasoning piece={piece} withVisual={false} />

                <div className="p-6">
                    {piece.plan_comentario && estado === 'Cambios solicitados' && !asking && (
                        <div className="mb-4 p-4 rounded-2xl bg-orange-50 border border-orange-100">
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Tu comentario</p>
                            <p className="text-sm text-gray-800 whitespace-pre-line">{piece.plan_comentario}</p>
                            <p className="text-xs text-gray-500 mt-2">El equipo está ajustando esta idea con tu comentario.</p>
                        </div>
                    )}

                    {!reviewable ? (
                        <p className="text-sm text-gray-500">Esta idea ya se está produciendo. La pieza terminada, con su imagen y sus textos, la revisas en Validación.</p>
                    ) : asking ? (
                        <div className="space-y-3">
                            <label htmlFor="plan-comment" className="text-sm font-bold text-gray-800">¿Qué cambiarías de esta idea?</label>
                            <textarea id="plan-comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} autoFocus
                                placeholder="Ej. Prefiero otro tema; no mencionen precios; cambia la fecha al viernes…"
                                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500" />
                            <div className="flex gap-2">
                                <button onClick={() => { setAsking(false); setError(null); }} disabled={saving} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">Volver</button>
                                <button onClick={() => submit('Cambios solicitados')} disabled={saving} className="flex-1 py-3 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 disabled:opacity-60 flex items-center justify-center gap-2">
                                    {saving && <Loader2 size={16} className="animate-spin" />} Enviar comentario
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <button onClick={() => setAsking(true)} disabled={saving} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2">
                                <MessageSquareWarning size={16} /> {estado === 'Cambios solicitados' ? 'Editar comentario' : 'Pedir cambio'}
                            </button>
                            {estado !== 'Aprobada' && (
                                <button onClick={() => submit('Aprobada')} disabled={saving} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:shadow-xl disabled:opacity-60 flex items-center justify-center gap-2">
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={3} />} Aprobar idea
                                </button>
                            )}
                        </div>
                    )}
                    {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
                    {piece.plan_revisado_at && (
                        <p className="mt-3 text-xs text-gray-400">
                            Revisada el {new Date(piece.plan_revisado_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })}
                            {piece.plan_revisado_por ? ` por ${piece.plan_revisado_por}` : ''}
                        </p>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
};
