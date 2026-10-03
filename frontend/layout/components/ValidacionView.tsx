/**
 * ValidacionView - Fase 7
 *
 * Tablero de aprobación del cliente sobre content_pieces. Es la única escritura
 * desde la app en esta cadena: aprobar o pedir cambios (siempre una persona).
 * Las piezas ya programadas salen del tablero; viven en Publicación.
 */

import React, { useMemo, useState } from 'react';
import { WorkflowStepper } from './WorkflowStepper';
import { AnimatedHeaderCard } from './AnimatedHeaderCard';
import { useAuth } from '../contexts/AuthContext';
import { useContentPieces } from '../hooks/useContentPieces';
import * as api from '../services/api';
import {
    STAGE_META, PieceStage, PilarBadge, FormatoBadge, PieceCover, NoClientSelected, LoadingBlock,
    PieceDetailModal, pieceStage, formatFecha,
} from './content/ContentPieceUI';

const COLUMNS: { stage: PieceStage; hint: string }[] = [
    { stage: 'produccion', hint: 'El equipo aún está terminando estas piezas.' },
    { stage: 'revision', hint: 'Listas para que las revises.' },
    { stage: 'cambios', hint: 'El equipo está aplicando tus comentarios.' },
    { stage: 'aprobada', hint: 'Aprobadas, en cola para programarse.' },
];

export const ValidacionView: React.FC<{ onNavigate?: (view: string) => void; clientId?: string }> = ({ onNavigate, clientId: clientIdProp }) => {
    const { user } = useAuth();
    const clientId = clientIdProp || user?.fichaClienteId;
    const { pieces, loading, error, replacePiece } = useContentPieces(clientId);
    const [selected, setSelected] = useState<api.ContentPiece | null>(null);

    const byStage = useMemo(() => {
        const groups: Record<PieceStage, api.ContentPiece[]> = { produccion: [], revision: [], cambios: [], aprobada: [], programada: [] };
        pieces.forEach((p) => groups[pieceStage(p)].push(p));
        return groups;
    }, [pieces]);

    const handleReview = async (estado: 'Aprobado' | 'Cambios solicitados', comentario?: string) => {
        if (!clientId || !selected) return;
        const updated = await api.reviewContentPiece(clientId, selected.id, estado, comentario);
        replacePiece(updated);
    };

    const toReview = byStage.revision.length;

    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar animate-fade-in-up bg-brand-bg">
            <div className="max-w-7xl mx-auto">
                {onNavigate && <WorkflowStepper currentStep={7} onNavigate={onNavigate} />}
                <AnimatedHeaderCard supertitle="Fase 7: Aprobación" title="Validación" subtitle="Revisa cada pieza antes de que se publique." />

                {!clientId ? <NoClientSelected /> : loading && pieces.length === 0 ? <LoadingBlock /> : (
                    <>
                        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-6 flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Esperando tu revisión</p>
                                <p className="text-4xl font-bold text-gray-900">
                                    {toReview} <span className="text-lg font-semibold text-gray-400">{toReview === 1 ? 'pieza' : 'piezas'}</span>
                                </p>
                            </div>
                            <p className="text-sm text-gray-500 max-w-md">
                                Abre una pieza para ver el diseño final y el copy de cada red. Solo lo que apruebes pasa a programarse en Metricool.
                            </p>
                        </div>

                        <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 transition-opacity ${loading ? 'opacity-50' : ''}`}>
                            {COLUMNS.map(({ stage, hint }) => {
                                const meta = STAGE_META[stage];
                                const Icon = meta.icon;
                                const items = byStage[stage];
                                return (
                                    <section key={stage} className={`bg-gray-100/70 rounded-3xl p-3 flex flex-col md:min-h-[320px] ${stage === 'revision' ? 'order-first md:order-none' : ''}`} aria-label={meta.label}>
                                        <header className="flex items-center justify-between px-2 pt-1 pb-3">
                                            <div className="flex items-center gap-2">
                                                <Icon size={16} style={{ color: meta.color }} strokeWidth={2.5} />
                                                <h3 className="text-sm font-bold text-gray-900">{meta.label}</h3>
                                            </div>
                                            <span className="text-xs font-bold text-gray-500 bg-white rounded-full px-2 py-0.5">{items.length}</span>
                                        </header>
                                        <p className="px-2 pb-3 text-xs text-gray-500">{hint}</p>
                                        <div className="space-y-3 flex-1">
                                            {items.map((piece) => (
                                                <button
                                                    key={piece.id}
                                                    onClick={() => setSelected(piece)}
                                                    className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex"
                                                >
                                                    <PieceCover piece={piece} className="w-20 shrink-0 aspect-[4/5]" compact />
                                                    <div className="p-3 min-w-0 flex flex-col gap-1.5">
                                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{formatFecha(piece.fecha)}</span>
                                                        <p className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">{piece.topico_angulo || 'Pieza sin tópico'}</p>
                                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                                            <FormatoBadge formato={piece.formato} />
                                                            <PilarBadge pilar={piece.pilar} />
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                            {items.length === 0 && <p className="px-2 py-6 text-center text-xs text-gray-400">Nada por aquí</p>}
                                        </div>
                                    </section>
                                );
                            })}
                        </div>

                        {byStage.programada.length > 0 && (
                            <p className="mt-4 text-sm text-gray-500">
                                {byStage.programada.length} {byStage.programada.length === 1 ? 'pieza ya está programada' : 'piezas ya están programadas'} — míralas en{' '}
                                {onNavigate ? <button onClick={() => onNavigate('publicacion')} className="font-bold text-gray-900 underline underline-offset-2">Publicación</button> : 'Publicación'}.
                            </p>
                        )}
                    </>
                )}
            </div>

            {selected && (
                <PieceDetailModal piece={selected} onClose={() => setSelected(null)} onReview={handleReview} />
            )}
        </div>
    );
};

export default ValidacionView;
