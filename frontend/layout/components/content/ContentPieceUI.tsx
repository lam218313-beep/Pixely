/**
 * Shared building blocks for the content production line over content_pieces:
 * Planificación (5) → Validación (6) → Publicaciones (7: próximas y publicadas, con sus resultados).
 * Each piece sits in exactly one station at a time; `pieceStage` decides which.
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    Image as ImageIcon, Images, Smartphone, Clapperboard, Clock, Eye, MessageSquareWarning,
    Check, CheckCheck, Send, X, ChevronLeft, ChevronRight, Loader2, Building2, ExternalLink,
} from 'lucide-react';
import * as api from '../../services/api';
import { pieceLinks, useStrategyIndex, type PieceLink, type StrategyIndex } from './strategyLinks';

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

export type PieceStage = 'produccion' | 'revision' | 'cambios' | 'aprobada' | 'programada' | 'publicada';

export const STAGE_META: Record<PieceStage, { label: string; color: string; icon: React.ElementType }> = {
    produccion: { label: 'En producción', color: '#898781', icon: Clock },
    revision: { label: 'Por revisar', color: '#fab219', icon: Eye },
    cambios: { label: 'Cambios pedidos', color: '#ec835a', icon: MessageSquareWarning },
    aprobada: { label: 'Aprobada', color: '#0ca30c', icon: Check },
    programada: { label: 'Programada', color: '#0ca30c', icon: Send },
    publicada: { label: 'Publicada', color: '#0ca30c', icon: CheckCheck },
};

/** The station (view) that owns each stage — the one place a piece is shown as a card. */
export const STAGE_STATION: Record<PieceStage, 'work' | 'validacion' | 'publicacion'> = {
    produccion: 'work',
    revision: 'validacion',
    cambios: 'validacion',
    aprobada: 'publicacion',
    programada: 'publicacion',
    publicada: 'publicacion',
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

/** Reels arrive as an uploaded .mp4 (see /04_ensamblar); everything else is an image. */
export function isVideoUrl(url: string): boolean {
    return /\.(mp4|mov|webm)$/i.test(url.split(/[?#]/)[0]);
}

export function pieceCover(piece: api.ContentPiece): string | null {
    return finalAssets(piece)[0] ?? safeUrl(piece.url_imagen);
}

export function pieceStage(piece: api.ContentPiece, today: string = todayISO()): PieceStage {
    // Scheduled in Metricool: once its date has passed it counts as published.
    if (piece.estado_publicado && piece.estado_publicado !== 'Pendiente') {
        return piece.fecha && piece.fecha.slice(0, 10) < today ? 'publicada' : 'programada';
    }
    if (finalAssets(piece).length === 0) return 'produccion';
    if (piece.estado_aprobacion === 'Aprobado') return 'aprobada';
    if (piece.estado_aprobacion === 'Cambios solicitados') return 'cambios';
    return 'revision';
}

export type ProductionStep = 'copy' | 'diseno' | 'externa';

/** Where an in-production piece is stuck: copy not written yet, design pending, or a Reel produced outside the pipeline. */
export function productionStep(piece: api.ContentPiece): ProductionStep {
    if (piece.estado_copy !== 'Listo') return 'copy';
    if (piece.formato === 'Reel' || piece.estado_render === 'Producción externa') return 'externa';
    return 'diseno';
}

export function pieceNetworks(piece: api.ContentPiece): string[] {
    return COPY_FIELDS.filter(({ key }) => !!piece[key]).map(({ label }) => label);
}

// --- Month & date helpers ('YYYY-MM' / 'YYYY-MM-DD', parsed as local dates so Lima never shifts a day back) ---

export function todayISO(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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
    if (isVideoUrl(src)) {
        // First frame as the cover; muted + metadata-only so a grid of reels stays light.
        return <video src={`${src}#t=0.1`} muted playsInline preload="metadata" onError={() => setFailed(true)} className={`object-cover bg-gray-900 ${className}`} aria-label={piece.topico_angulo ?? 'Reel'} />;
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

const STATION_LABEL: Record<(typeof STAGE_STATION)[PieceStage], string> = {
    work: 'Planificación',
    validacion: 'Validación',
    publicacion: 'Publicaciones',
};

/** One line pointing to the other stations (counts only, never their cards), so no piece is listed twice. */
export const OtherStations: React.FC<{
    pieces: api.ContentPiece[];
    current: (typeof STAGE_STATION)[PieceStage];
    onNavigate?: (view: string) => void;
}> = ({ pieces, current, onNavigate }) => {
    const counts = new Map<string, number>();
    pieces.forEach((p) => {
        const station = STAGE_STATION[pieceStage(p)];
        if (station !== current) counts.set(station, (counts.get(station) ?? 0) + 1);
    });
    const order = (['work', 'validacion', 'publicacion'] as const).filter((s) => counts.get(s));
    if (order.length === 0) return null;
    return (
        <p className="mt-6 text-sm text-gray-500">
            En otras etapas:{' '}
            {order.map((station, i) => (
                <React.Fragment key={station}>
                    {i > 0 && ' · '}
                    {counts.get(station)} en{' '}
                    {onNavigate ? (
                        <button onClick={() => onNavigate(station)} className="font-bold text-gray-900 underline underline-offset-2">{STATION_LABEL[station]}</button>
                    ) : STATION_LABEL[station]}
                </React.Fragment>
            ))}
        </p>
    );
};

export const LoadingBlock: React.FC = () => (
    <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-gray-300" size={36} />
    </div>
);

// --- Piece detail (read-only, or with review actions in Validación / Publicaciones) ---

interface PieceDetailModalProps {
    piece: api.ContentPiece;
    onClose: () => void;
    onReview?: (estado: 'Aprobado' | 'Cambios solicitados', comentario?: string, cambioTipo?: api.CambioTipo) => Promise<void>;
    /** Extra section shown right under the title (e.g. the results of a published piece). */
    children?: React.ReactNode;
}

export const CAMBIO_LABEL: Record<api.CambioTipo, string> = { imagen: 'La imagen', texto: 'El texto', ambos: 'Ambos' };

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">{children}</p>
);

/** Where a piece comes from in the Estrategia: objetivo → estrategia → concepto(s), one branch per strategy it touches. */
export const PieceStrategy: React.FC<{ links: PieceLink[] }> = ({ links }) => {
    if (links.length === 0) return null;
    const conceptCount = links.reduce((n, l) => n + l.concepts.length, 0);
    return (
        <div className="p-6 border-b border-gray-100">
            <SectionTitle>De dónde sale en tu estrategia</SectionTitle>
            {conceptCount > 1 && (
                <p className="text-sm text-gray-600 mb-3">
                    Esta pieza combina <strong className="text-gray-900">{conceptCount} conceptos</strong>
                    {links.length > 1 ? ` de ${new Set(links.map((l) => l.objective.label)).size > 1 ? 'distintos objetivos' : 'distintas estrategias'}` : ''}.
                </p>
            )}
            <ol className="space-y-3">
                {links.map((link, i) => (
                    <li key={i} className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 border-l-4" style={{ borderLeftColor: link.objective.color }}>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: link.objective.color }} />
                            Objetivo
                            {link.objective.principal && <span className="text-primary-600">· Principal</span>}
                        </p>
                        <p className="text-sm font-bold text-gray-900 mt-0.5">{link.objective.label}</p>
                        {link.strategy && (
                            <div className="mt-3 ml-1 pl-3 border-l-2 border-gray-200">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Estrategia</p>
                                <p className="text-sm font-semibold text-gray-800 mt-0.5">{link.strategy}</p>
                                {link.concepts.length > 0 && (
                                    <div className="mt-3 ml-1 pl-3 border-l-2 border-gray-200">
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{link.concepts.length > 1 ? 'Conceptos' : 'Concepto'}</p>
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            {link.concepts.map((c) => (
                                                <span key={c} className="text-xs font-semibold text-gray-800 bg-white border border-gray-200 rounded-lg px-2 py-1">{c}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {!link.strategy && link.concepts.length > 0 && (
                            <p className="text-sm text-gray-700 mt-2"><span className="font-semibold text-gray-900">Concepto: </span>{link.concepts.join(', ')}</p>
                        )}
                    </li>
                ))}
            </ol>
        </div>
    );
};

/** How the strategy became this piece: the planner's reasoning, the market fact behind it, and what the image shows. */
export const PieceReasoning: React.FC<{ piece: api.ContentPiece; withVisual?: boolean }> = ({ piece, withVisual = true }) => {
    const hasWhy = piece.razon || piece.marcador || piece.evidencia;
    const visualTitle = piece.formato === 'Reel' ? 'Qué muestra el video' : 'Qué muestra la imagen';
    const showVisual = withVisual && !!piece.descripcion_visual;
    if (!hasWhy && !showVisual) return null;
    return (
        <>
            {hasWhy && (
                <div className="p-6 border-b border-gray-100 space-y-3">
                    <SectionTitle>Cómo llegamos a esta pieza</SectionTitle>
                    {piece.razon && <p className="text-sm text-gray-700 leading-relaxed">{piece.razon}</p>}
                    {piece.marcador === 'I' || piece.evidencia ? (
                        <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Dato de mercado que la respalda</p>
                            <p className="text-sm text-gray-800">{piece.evidencia || 'Respaldada por la vigilancia del mercado.'}</p>
                        </div>
                    ) : piece.marcador === 'C' ? (
                        <p className="text-sm text-gray-500">Idea creativa del equipo, sin un dato de mercado detrás.</p>
                    ) : null}
                </div>
            )}
            {showVisual && (
                <div className="p-6 border-b border-gray-100">
                    <SectionTitle>{visualTitle}</SectionTitle>
                    <p className="text-sm text-gray-700 leading-relaxed">{piece.descripcion_visual}</p>
                </div>
            )}
        </>
    );
};

/** One quiet line for lists: the main branch a piece serves (objetivo → estrategia → concepto). */
export const PieceWhyLine: React.FC<{ piece: api.ContentPiece; index?: StrategyIndex | null }> = ({ piece, index = null }) => {
    const links = pieceLinks(piece, index);
    if (links.length === 0) return null;
    const main = links[0];
    const extra = links.reduce((n, l) => n + l.concepts.length, 0) - Math.min(main.concepts.length, 1);
    return (
        <span className="flex items-center gap-1.5 text-xs text-gray-500 mt-1 min-w-0">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: main.objective.color }} />
            <span className="line-clamp-1">
                {[main.objective.label, main.strategy, main.concepts[0]].filter(Boolean).join(' → ')}
                {extra > 0 && <strong className="text-gray-700"> +{extra} {extra === 1 ? 'concepto' : 'conceptos'}</strong>}
            </span>
        </span>
    );
};

export const PieceDetailModal: React.FC<PieceDetailModalProps> = ({ piece, onClose, onReview, children }) => {
    const assets = finalAssets(piece);
    const slides = assets.length > 0 ? assets : [safeUrl(piece.url_imagen)].filter((u): u is string => !!u);
    const copies = COPY_FIELDS.filter(({ key }) => !!piece[key]);
    const stage = pieceStage(piece);
    const strategy = useStrategyIndex(piece.client_id);
    const links = pieceLinks(piece, strategy);
    const canReview = !!onReview && (stage === 'revision' || stage === 'cambios' || stage === 'aprobada');

    const [slide, setSlide] = useState(0);
    const [copyTab, setCopyTab] = useState(0);
    const [askingChanges, setAskingChanges] = useState(false);
    const [comment, setComment] = useState('');
    const [cambioTipo, setCambioTipo] = useState<api.CambioTipo | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const submit = async (estado: 'Aprobado' | 'Cambios solicitados') => {
        if (!onReview) return;
        if (estado === 'Cambios solicitados' && !cambioTipo) {
            setError('Elige qué quieres cambiar: la imagen, el texto o ambos.');
            return;
        }
        if (estado === 'Cambios solicitados' && !comment.trim()) {
            setError('Cuéntanos qué cambiarías para que el equipo pueda corregirlo.');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await onReview(estado, estado === 'Cambios solicitados' ? comment.trim() : undefined, estado === 'Cambios solicitados' ? cambioTipo ?? undefined : undefined);
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
                <div className="md:w-1/2 bg-gray-50 relative flex items-center justify-center min-h-[280px] shrink-0 overflow-hidden">
                    {slides.length > 0 ? (
                        isVideoUrl(slides[slide]) ? (
                            <video src={slides[slide]} controls playsInline className="w-full h-full max-h-[45vh] md:max-h-[92vh] object-contain bg-black" />
                        ) : (
                            <img src={slides[slide]} alt={`Lámina ${slide + 1}`} className="w-full h-full max-h-[45vh] md:max-h-[92vh] object-contain" />
                        )
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
                    {slides.length > 0 && (
                        <a
                            href={slides[slide]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute top-3 right-3 flex items-center gap-1.5 text-xs font-bold bg-white/90 rounded-lg px-2.5 py-1.5 text-gray-700 hover:bg-white shadow-sm"
                        >
                            <ExternalLink size={13} /> Abrir original
                        </a>
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
                                {piece.marcador && (
                                    <span className="text-xs font-semibold text-gray-500">{piece.marcador === 'I' ? 'Con dato de mercado' : 'Idea creativa'}</span>
                                )}
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

                    {children}
                    <PieceStrategy links={links} />
                    <PieceReasoning piece={piece} />

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
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                                Comentario de revisión{piece.cambio_tipo ? ` · cambiar ${CAMBIO_LABEL[piece.cambio_tipo].toLowerCase()}` : ''}
                            </p>
                            <p className="text-sm text-gray-800 whitespace-pre-line">{piece.comentario_cliente}</p>
                        </div>
                    )}

                    <div className="p-6">
                        {canReview ? (
                            askingChanges ? (
                                <div className="space-y-3">
                                    <fieldset>
                                        <legend className="text-sm font-bold text-gray-800 mb-2">¿Qué quieres cambiar?</legend>
                                        <div className="grid grid-cols-3 gap-2" role="radiogroup">
                                            {(Object.keys(CAMBIO_LABEL) as api.CambioTipo[]).map((t) => (
                                                <button key={t} type="button" role="radio" aria-checked={cambioTipo === t} onClick={() => setCambioTipo(t)}
                                                    className={`py-2.5 rounded-xl border text-sm font-bold transition-colors ${cambioTipo === t ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                                                    {CAMBIO_LABEL[t]}
                                                </button>
                                            ))}
                                        </div>
                                    </fieldset>
                                    <label htmlFor="review-comment" className="block text-sm font-bold text-gray-800">¿Qué cambiarías?</label>
                                    <textarea
                                        id="review-comment"
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        rows={3}
                                        placeholder={cambioTipo === 'texto' ? 'Ej. El titular no refleja nuestro tono; quiten el precio del texto…' : cambioTipo === 'imagen' ? 'Ej. Preferimos una foto con personas; el logo se ve muy pequeño…' : 'Ej. El titular no refleja nuestro tono y preferimos una foto con personas…'}
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
