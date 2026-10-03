/**
 * Shared building blocks for Repositorio, Validación and Publicación — the three
 * views over content_pieces. One place for stage logic, badges and the piece detail.
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    Image as ImageIcon, Images, Smartphone, Clapperboard, Clock, Eye, MessageSquareWarning,
    Check, Send, X, ChevronLeft, ChevronRight, Loader2, Building2,
} from 'lucide-react';
import * as api from '../../services/api';

// Validated with the dataviz palette validator (all-pairs CVD + 3:1 on white). Always shown beside a text label.
export const PILAR_META: Record<api.ContentPilar, { label: string; color: string }> = {
    Problema: { label: 'Problema', color: '#D90B66' },
    Identidad: { label: 'Identidad', color: '#2a78d6' },
    Prueba: { label: 'Prueba', color: '#eb6834' },
};

export const FORMATO_ICON: Record<api.ContentFormato, React.ElementType> = {
    Imagen: ImageIcon,
    Carrusel: Images,
    Estado: Smartphone,
    Reel: Clapperboard,
};

export type PieceStage = 'produccion' | 'revision' | 'cambios' | 'aprobada' | 'programada';

export const STAGE_META: Record<PieceStage, { label: string; color: string; icon: React.ElementType }> = {
    produccion: { label: 'En producción', color: '#898781', icon: Clock },
    revision: { label: 'Por revisar', color: '#fab219', icon: Eye },
    cambios: { label: 'Cambios pedidos', color: '#ec835a', icon: MessageSquareWarning },
    aprobada: { label: 'Aprobada', color: '#0ca30c', icon: Check },
    programada: { label: 'Programada', color: '#0ca30c', icon: Send },
};

const COPY_FIELDS: { key: keyof api.ContentPiece; label: string }[] = [
    { key: 'copy_instagram', label: 'Instagram' },
    { key: 'copy_linkedin', label: 'LinkedIn' },
    { key: 'copy_pinterest', label: 'Pinterest' },
    { key: 'copy_gbp', label: 'Google Business' },
    { key: 'copy_x', label: 'X' },
];

/** Only http(s) links from automation-written data are ever rendered as href/src. */
export function safeUrl(url?: string | null): string | null {
    return url && /^https?:\/\//i.test(url) ? url : null;
}

export function finalAssets(piece: api.ContentPiece): string[] {
    return (piece.url_piezas_finales ?? []).map(safeUrl).filter((u): u is string => !!u);
}

export function pieceCover(piece: api.ContentPiece): string | null {
    return finalAssets(piece)[0] ?? safeUrl(piece.url_imagen);
}

export function pieceStage(piece: api.ContentPiece): PieceStage {
    if (piece.estado_publicado && piece.estado_publicado !== 'Pendiente') return 'programada';
    if (finalAssets(piece).length === 0) return 'produccion';
    if (piece.estado_aprobacion === 'Aprobado') return 'aprobada';
    if (piece.estado_aprobacion === 'Cambios solicitados') return 'cambios';
    return 'revision';
}

export function pieceNetworks(piece: api.ContentPiece): string[] {
    return COPY_FIELDS.filter(({ key }) => !!piece[key]).map(({ label }) => label);
}

// --- Month & date helpers ('YYYY-MM' / 'YYYY-MM-DD', parsed as local dates so Lima never shifts a day back) ---

export function currentMonth(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function shiftMonth(month: string, delta: number): string {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(month: string): string {
    const [y, m] = month.split('-').map(Number);
    const label = new Date(y, m - 1, 1).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
}

export function parseFecha(fecha: string): Date {
    const [y, m, d] = fecha.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
}

export function formatFecha(fecha: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }): string {
    return parseFecha(fecha).toLocaleDateString('es-PE', opts);
}

// --- Small components ---

export const PilarBadge: React.FC<{ pilar: api.ContentPilar | null }> = ({ pilar }) => {
    if (!pilar) return null;
    const meta = PILAR_META[pilar];
    return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
            {meta.label}
        </span>
    );
};

export const FormatoBadge: React.FC<{ formato: api.ContentFormato | null }> = ({ formato }) => {
    if (!formato) return null;
    const Icon = FORMATO_ICON[formato];
    return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600">
            <Icon size={13} className="text-gray-400" />
            {formato}
        </span>
    );
};

export const StageChip: React.FC<{ stage: PieceStage; compact?: boolean }> = ({ stage, compact }) => {
    const meta = STAGE_META[stage];
    const Icon = meta.icon;
    return (
        <span
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-gray-800 whitespace-nowrap"
            // tint over an opaque white base so the chip stays legible on top of photos
            style={{ background: `linear-gradient(${meta.color}1F, ${meta.color}1F), #fff` }}
        >
            <Icon size={13} style={{ color: meta.color }} strokeWidth={2.5} />
            {!compact && meta.label}
        </span>
    );
};

export const PieceCover: React.FC<{ piece: api.ContentPiece; className?: string; compact?: boolean }> = ({ piece, className = '', compact }) => {
    const [failed, setFailed] = useState(false);
    const src = pieceCover(piece);
    const Icon = piece.formato ? FORMATO_ICON[piece.formato] : ImageIcon;

    if (!src || failed) {
        return (
            <div className={`flex flex-col items-center justify-center gap-2 bg-gray-50 text-gray-300 ${className}`}>
                <Icon size={compact ? 22 : 28} />
                {!compact && <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">En producción</span>}
            </div>
        );
    }
    return <img src={src} alt={piece.topico_angulo ?? 'Pieza de contenido'} loading="lazy" onError={() => setFailed(true)} className={`object-cover ${className}`} />;
};

export const MonthSwitcher: React.FC<{ month: string; onChange: (month: string) => void }> = ({ month, onChange }) => (
    <div className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
        <button onClick={() => onChange(shiftMonth(month, -1))} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" aria-label="Mes anterior">
            <ChevronLeft size={16} />
        </button>
        <span className="px-2 min-w-[140px] text-center text-sm font-bold text-gray-800">{monthLabel(month)}</span>
        <button onClick={() => onChange(shiftMonth(month, 1))} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" aria-label="Mes siguiente">
            <ChevronRight size={16} />
        </button>
    </div>
);

export const NoClientSelected: React.FC = () => (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
            <Building2 size={26} className="text-gray-300" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Ninguna marca seleccionada</h3>
        <p className="text-sm text-gray-500 max-w-sm">Esta vista muestra el contenido de una marca. Entra desde el Panel Admin y elige la marca que quieres revisar.</p>
    </div>
);

export const LoadingBlock: React.FC = () => (
    <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-gray-300" size={36} />
    </div>
);

// --- Piece detail (read-only, or with review actions in Validación) ---

interface PieceDetailModalProps {
    piece: api.ContentPiece;
    onClose: () => void;
    onReview?: (estado: 'Aprobado' | 'Cambios solicitados', comentario?: string) => Promise<void>;
}

export const PieceDetailModal: React.FC<PieceDetailModalProps> = ({ piece, onClose, onReview }) => {
    const assets = finalAssets(piece);
    const slides = assets.length > 0 ? assets : [safeUrl(piece.url_imagen)].filter((u): u is string => !!u);
    const copies = COPY_FIELDS.filter(({ key }) => !!piece[key]);
    const stage = pieceStage(piece);
    const canReview = !!onReview && (stage === 'revision' || stage === 'cambios' || stage === 'aprobada');

    const [slide, setSlide] = useState(0);
    const [copyTab, setCopyTab] = useState(0);
    const [askingChanges, setAskingChanges] = useState(false);
    const [comment, setComment] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const submit = async (estado: 'Aprobado' | 'Cambios solicitados') => {
        if (!onReview) return;
        if (estado === 'Cambios solicitados' && !comment.trim()) {
            setError('Cuéntanos qué cambiarías para que el equipo pueda corregirlo.');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await onReview(estado, estado === 'Cambios solicitados' ? comment.trim() : undefined);
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo guardar tu revisión');
        } finally {
            setSaving(false);
        }
    };

    // Portal to <body>: page containers animate with transform, which would otherwise trap a `fixed` overlay inside them.
    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col md:flex-row"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label={piece.topico_angulo ?? 'Detalle de la pieza'}
            >
                {/* Visual */}
                <div className="md:w-1/2 bg-gray-50 relative flex items-center justify-center min-h-[280px]">
                    {slides.length > 0 ? (
                        <img src={slides[slide]} alt={`Lámina ${slide + 1}`} className="w-full h-full max-h-[92vh] object-contain" />
                    ) : (
                        <PieceCover piece={piece} className="w-full h-full min-h-[280px]" />
                    )}
                    {slides.length > 1 && (
                        <>
                            <button onClick={() => setSlide((slide - 1 + slides.length) % slides.length)} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 shadow hover:bg-white" aria-label="Lámina anterior">
                                <ChevronLeft size={18} />
                            </button>
                            <button onClick={() => setSlide((slide + 1) % slides.length)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 shadow hover:bg-white" aria-label="Lámina siguiente">
                                <ChevronRight size={18} />
                            </button>
                            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs font-bold bg-white/90 rounded-full px-3 py-1 text-gray-700">
                                {slide + 1} / {slides.length}
                            </span>
                        </>
                    )}
                </div>

                {/* Info */}
                <div className="md:w-1/2 flex flex-col overflow-y-auto">
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex flex-wrap items-center gap-3">
                                <StageChip stage={stage} />
                                <FormatoBadge formato={piece.formato} />
                                <PilarBadge pilar={piece.pilar} />
                            </div>
                            <button onClick={onClose} className="p-2 -m-2 rounded-full hover:bg-gray-100 text-gray-400" aria-label="Cerrar">
                                <X size={20} />
                            </button>
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                            {formatFecha(piece.fecha, { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                        <h3 className="text-xl font-bold text-gray-900 leading-snug">{piece.topico_angulo || 'Pieza sin tópico'}</h3>
                    </div>

                    {piece.formato === 'Reel' && piece.prompt_visual && (
                        <div className="p-6 border-b border-gray-100">
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Guion del reel</p>
                            <p className="text-sm text-gray-700 whitespace-pre-line">{piece.prompt_visual}</p>
                        </div>
                    )}

                    <div className="p-6 border-b border-gray-100 flex-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Copy por red</p>
                        {copies.length === 0 ? (
                            <p className="text-sm text-gray-400">El copy todavía se está redactando.</p>
                        ) : (
                            <>
                                <div className="flex flex-wrap gap-1 mb-3">
                                    {copies.map(({ label }, i) => (
                                        <button
                                            key={label}
                                            onClick={() => setCopyTab(i)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${i === copyTab ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{String(piece[copies[Math.min(copyTab, copies.length - 1)].key] ?? '')}</p>
                            </>
                        )}
                    </div>

                    {piece.comentario_cliente && (
                        <div className="mx-6 mt-6 p-4 rounded-2xl bg-orange-50 border border-orange-100">
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Comentario de revisión</p>
                            <p className="text-sm text-gray-800 whitespace-pre-line">{piece.comentario_cliente}</p>
                        </div>
                    )}

                    <div className="p-6">
                        {canReview ? (
                            askingChanges ? (
                                <div className="space-y-3">
                                    <label htmlFor="review-comment" className="text-sm font-bold text-gray-800">¿Qué cambiarías?</label>
                                    <textarea
                                        id="review-comment"
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        rows={3}
                                        autoFocus
                                        placeholder="Ej. El titular no refleja nuestro tono, preferimos una foto con personas…"
                                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={() => { setAskingChanges(false); setError(null); }} disabled={saving} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">
                                            Volver
                                        </button>
                                        <button onClick={() => submit('Cambios solicitados')} disabled={saving} className="flex-1 py-3 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 disabled:opacity-60 flex items-center justify-center gap-2">
                                            {saving && <Loader2 size={16} className="animate-spin" />}
                                            Enviar cambios
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <button onClick={() => setAskingChanges(true)} disabled={saving} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2">
                                        <MessageSquareWarning size={16} />
                                        Solicitar cambios
                                    </button>
                                    {stage !== 'aprobada' && (
                                        <button onClick={() => submit('Aprobado')} disabled={saving} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:shadow-xl disabled:opacity-60 flex items-center justify-center gap-2">
                                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={3} />}
                                            Aprobar
                                        </button>
                                    )}
                                </div>
                            )
                        ) : (
                            <p className="text-sm text-gray-400">
                                {stage === 'programada' ? 'Esta pieza ya está programada para publicarse.' : stage === 'produccion' ? 'La pieza final todavía se está produciendo.' : ''}
                            </p>
                        )}
                        {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
                        {piece.revisado_at && (
                            <p className="mt-3 text-xs text-gray-400">
                                Revisada el {new Date(piece.revisado_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })}
                                {piece.revisado_por ? ` por ${piece.revisado_por}` : ''}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
};
