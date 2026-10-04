/**
 * Team only, inside Validación: the pieces waiting for their final files.
 * /04_ensamblar leaves a guide (and a Canva draft); a designer finishes the piece in
 * Canva or CapCut, and someone from the team uploads the result here. Uploading is
 * what puts the piece in front of the client.
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowUp, ExternalLink, Loader2, Upload, X } from 'lucide-react';
import * as api from '../../services/api';
import { CAMBIO_LABEL, FormatoBadge, formatFecha, safeUrl } from './ContentPieceUI';

/** Approved ideas not yet delivered, plus delivered ones the client sent back for a new image. */
export function awaitingDelivery(pieces: api.ContentPiece[]): api.ContentPiece[] {
    return pieces
        .filter((p) => p.plan_estado === 'Aprobada' && (p.estado_publicado ?? 'Pendiente') === 'Pendiente')
        .filter((p) => !(p.url_piezas_finales?.length)
            || (p.estado_aprobacion === 'Cambios solicitados' && (p.cambio_tipo === 'imagen' || p.cambio_tipo === 'ambos')))
        .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

const isCorrection = (p: api.ContentPiece) => !!p.url_piezas_finales?.length;

// --- Due date: what the client (and the team) should look at first ---

export function daysUntil(fecha: string, today = new Date()): number {
    const [y, m, d] = fecha.slice(0, 10).split('-').map(Number);
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return Math.round((new Date(y, m - 1, d).getTime() - start.getTime()) / 86_400_000);
}

export const DueBadge: React.FC<{ fecha: string }> = ({ fecha }) => {
    const days = daysUntil(fecha);
    const [label, color] =
        days < 0 ? ['Su fecha ya pasó', '#d03b3b']
        : days === 0 ? ['Sale hoy', '#d03b3b']
        : days === 1 ? ['Sale mañana', '#ec835a']
        : days <= 3 ? [`Sale en ${days} días`, '#ec835a']
        : [`Sale el ${formatFecha(fecha)}`, null];
    if (!color) return <span className="text-xs font-semibold text-gray-500">{label}</span>;
    return (
        <span className="inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-xs font-bold text-gray-800" style={{ background: `${color}1F` }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />{label}
        </span>
    );
};

// --- The list ---

export const DeliveryQueue: React.FC<{ pieces: api.ContentPiece[]; onOpen: (p: api.ContentPiece) => void }> = ({ pieces, onOpen }) => {
    const queue = awaitingDelivery(pieces);
    return (
        <section className="mb-8 rounded-3xl border border-dashed border-gray-300 bg-white/60 p-5" aria-label="Por entregar">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-primary-600">Solo equipo Pixely · el cliente no ve esto</p>
                    <h2 className="text-lg font-bold text-gray-900">Por entregar ({queue.length})</h2>
                    <p className="text-sm text-gray-500">Ideas aprobadas que esperan su pieza final. Al subirla, aparece en "Por revisar" para el cliente.</p>
                </div>
            </div>
            {queue.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">No hay piezas esperando entrega.</p>
            ) : (
                <ul className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                    {queue.map((p) => {
                        const noCopy = p.estado_copy !== 'Listo';
                        return (
                            <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                                <span className="w-16 shrink-0 text-xs font-semibold uppercase tracking-wider text-gray-400">{formatFecha(p.fecha, { day: 'numeric', month: 'short' })}</span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-bold text-gray-900 leading-snug line-clamp-1">{p.topico_angulo || 'Pieza sin tópico'}</span>
                                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                        <FormatoBadge formato={p.formato} />
                                        <DueBadge fecha={p.fecha} />
                                        {isCorrection(p) && <span className="text-xs font-semibold text-gray-700">Corrección: {CAMBIO_LABEL[p.cambio_tipo ?? 'imagen'].toLowerCase()}</span>}
                                        {noCopy ? <span className="text-xs text-gray-500">Falta el copy (/03_generar)</span>
                                            : p.guia_produccion ? <span className="text-xs text-gray-500">Guía lista</span>
                                            : <span className="text-xs text-gray-500">Sin guía (/04_ensamblar)</span>}
                                    </span>
                                </span>
                                <button onClick={() => onOpen(p)} disabled={noCopy}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed">
                                    <Upload size={14} /> {isCorrection(p) ? 'Subir corrección' : 'Subir final'}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
};

// --- Upload one piece ---

const ACCEPT: Record<string, string> = { Reel: 'video/mp4,video/quicktime,video/webm', default: 'image/png,image/jpeg,image/webp' };
const HOW_MANY: Record<string, string> = { Reel: 'Un video (MP4, MOV o WEBM).', Carrusel: 'De 2 a 10 imágenes, en el orden en que se verán.', default: 'Una imagen (PNG, JPG o WEBP).' };

export const DeliveryModal: React.FC<{
    piece: api.ContentPiece;
    onClose: () => void;
    onUpload: (files: File[], generadaConIa: boolean) => Promise<void>;
}> = ({ piece, onClose, onUpload }) => {
    const [files, setFiles] = useState<File[]>([]);
    const [ia, setIa] = useState<boolean | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const formato = piece.formato ?? 'Imagen';
    const canva = safeUrl(piece.canva_url);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, saving]);

    const move = (i: number, d: -1 | 1) => setFiles((fs) => {
        const next = [...fs];
        [next[i], next[i + d]] = [next[i + d], next[i]];
        return next;
    });

    const submit = async () => {
        if (files.length === 0) { setError('Elige el archivo final.'); return; }
        if (ia === null) { setError('Indica si la pieza final incluye IA.'); return; }
        setSaving(true); setError(null);
        try { await onUpload(files, ia); onClose(); }
        catch (e) { setError(e instanceof Error ? e.message : 'No se pudo subir'); }
        finally { setSaving(false); }
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => !saving && onClose()}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}
                role="dialog" aria-modal="true" aria-label="Subir pieza final">
                <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                            {formatFecha(piece.fecha, { weekday: 'long', day: 'numeric', month: 'long' })} · {formato}
                        </p>
                        <h3 className="text-xl font-bold text-gray-900 leading-snug">{piece.topico_angulo || 'Pieza sin tópico'}</h3>
                    </div>
                    <button onClick={onClose} disabled={saving} className="p-2 -m-2 rounded-full hover:bg-gray-100 text-gray-400" aria-label="Cerrar"><X size={20} /></button>
                </div>

                {isCorrection(piece) && piece.comentario_cliente && (
                    <div className="mx-6 mt-6 p-4 rounded-2xl bg-orange-50 border border-orange-100">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                            El cliente pidió cambiar {CAMBIO_LABEL[piece.cambio_tipo ?? 'imagen'].toLowerCase()}
                        </p>
                        <p className="text-sm text-gray-800 whitespace-pre-line">{piece.comentario_cliente}</p>
                        {piece.cambio_tipo === 'ambos' && <p className="text-xs text-gray-500 mt-2">El texto lo corrige /03_generar; aquí solo va la imagen nueva.</p>}
                    </div>
                )}

                <div className="p-6 border-b border-gray-100 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Guía para el diseño</p>
                    {piece.guia_produccion
                        ? <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{piece.guia_produccion}</p>
                        : <p className="text-sm text-gray-500">Esta pieza aún no tiene guía. Córrela con /04_ensamblar.</p>}
                    {piece.descripcion_visual && <p className="text-sm text-gray-700"><span className="font-semibold text-gray-900">Qué debe mostrar: </span>{piece.descripcion_visual}</p>}
                    {formato === 'Reel' && piece.prompt_visual && (
                        <details className="text-sm text-gray-700"><summary className="cursor-pointer font-semibold text-gray-900">Guion del reel</summary><p className="whitespace-pre-line mt-2">{piece.prompt_visual}</p></details>
                    )}
                    {canva && (
                        <a href={canva} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-900 underline underline-offset-2">
                            <ExternalLink size={14} /> Abrir el borrador en Canva
                        </a>
                    )}
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label htmlFor="finals" className="block text-sm font-bold text-gray-800 mb-1">Archivo final</label>
                        <p className="text-xs text-gray-500 mb-2">{HOW_MANY[formato] ?? HOW_MANY.default} Máximo 50 MB por archivo.</p>
                        <input id="finals" type="file" accept={ACCEPT[formato] ?? ACCEPT.default} multiple={formato === 'Carrusel'}
                            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                            className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-xl file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-bold file:text-gray-800 hover:file:bg-gray-200" />
                        {files.length > 1 && (
                            <ol className="mt-3 space-y-1.5">
                                {files.map((f, i) => (
                                    <li key={`${f.name}-${i}`} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-1.5">
                                        <span className="w-5 text-xs font-bold text-gray-400 tabular-nums">{i + 1}</span>
                                        <span className="flex-1 truncate">{f.name}</span>
                                        <button onClick={() => move(i, -1)} disabled={i === 0} className="p-1 text-gray-400 hover:text-gray-800 disabled:opacity-30" aria-label="Subir en el orden"><ArrowUp size={14} /></button>
                                        <button onClick={() => move(i, 1)} disabled={i === files.length - 1} className="p-1 text-gray-400 hover:text-gray-800 disabled:opacity-30" aria-label="Bajar en el orden"><ArrowDown size={14} /></button>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </div>

                    <fieldset>
                        <legend className="text-sm font-bold text-gray-800 mb-1">¿La pieza final incluye imágenes o video hechos con IA?</legend>
                        <p className="text-xs text-gray-500 mb-2">Instagram y Facebook piden etiquetar el contenido hecho con IA; Metricool lo marca al publicar.</p>
                        <div className="grid grid-cols-2 gap-2 max-w-xs" role="radiogroup">
                            {[true, false].map((v) => (
                                <button key={String(v)} type="button" role="radio" aria-checked={ia === v} onClick={() => setIa(v)}
                                    className={`py-2.5 rounded-xl border text-sm font-bold ${ia === v ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                                    {v ? 'Sí, incluye IA' : 'No, es real'}
                                </button>
                            ))}
                        </div>
                    </fieldset>

                    {error && <p className="text-sm font-medium text-red-600">{error}</p>}
                    <button onClick={submit} disabled={saving}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-bold shadow-lg shadow-pink-500/20 disabled:opacity-60 flex items-center justify-center gap-2">
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Subir y enviar al cliente
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
};
