/**
 * ValidacionView - Fase 6
 *
 * La mesa de revisión del cliente: solo muestra lo que necesita su decisión
 * (piezas por revisar y las que devolvió con cambios). Es la única escritura
 * desde la app en esta cadena: aprobar o pedir cambios (siempre una persona).
 * Lo que está en producción vive en Planificación; lo aprobado, en Publicación.
 */

import React, { useMemo, useState } from 'react';
import { PartyPopper } from 'lucide-react';
import { WorkflowStepper } from './WorkflowStepper';
import { AnimatedHeaderCard } from './AnimatedHeaderCard';
import { useAuth } from '../contexts/AuthContext';
import { useContentPieces } from '../hooks/useContentPieces';
import * as api from '../services/api';
import {
    STAGE_META, PilarBadge, FormatoBadge, PieceCover, NoClientSelected, LoadingBlock,
    PieceDetailModal, OtherStations, pieceStage, formatFecha,
} from './content/ContentPieceUI';

const ChangesIcon = STAGE_META.cambios.icon;

export const ValidacionView: React.FC<{ onNavigate?: (view: string) => void; clientId?: string }> = ({ onNavigate, clientId: clientIdProp }) => {
    const { user } = useAuth();
    const clientId = clientIdProp || user?.fichaClienteId;
    // Every month: a piece waiting for the client never falls out of view because the month changed.
    const { pieces, loading, error, replacePiece } = useContentPieces(clientId);
    const [selected, setSelected] = useState<api.ContentPiece | null>(null);

    const { toReview, withChanges } = useMemo(() => {
        const byDate = [...pieces].sort((a, b) => a.fecha.localeCompare(b.fecha));
        return {
            toReview: byDate.filter((p) => pieceStage(p) === 'revision'),
            withChanges: byDate.filter((p) => pieceStage(p) === 'cambios'),
        };
    }, [pieces]);

    const handleReview = async (estado: 'Aprobado' | 'Cambios solicitados', comentario?: string) => {
        if (!clientId || !selected) return;
        const updated = await api.reviewContentPiece(clientId, selected.id, estado, comentario);
        replacePiece(updated);
    };

    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar animate-fade-in-up bg-brand-bg">
            <div className="max-w-7xl mx-auto">
                {onNavigate && <WorkflowStepper currentStep={6} onNavigate={onNavigate} />}
                <AnimatedHeaderCard supertitle="Fase 6: Aprobación" title="Validación" subtitle="Solo lo que necesita tu decisión." />

                {!clientId ? <NoClientSelected /> : loading && pieces.length === 0 ? <LoadingBlock /> : (
                    <>
                        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

                        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 transition-opacity ${loading ? 'opacity-50' : ''}`}>
                            {/* What the client must decide */}
                            <section className="lg:col-span-2" aria-label="Por revisar">
                                <div className="flex items-end justify-between gap-4 mb-4">
                                    <div>
                                        <p className="text-sm text-gray-500">Esperando tu revisión</p>
                                        <p className="text-4xl font-bold text-gray-900">
                                            {toReview.length} <span className="text-lg font-semibold text-gray-400">{toReview.length === 1 ? 'pieza' : 'piezas'}</span>
                                        </p>
                                    </div>
                                    <p className="text-sm text-gray-500 max-w-xs text-right hidden md:block">
                                        Abre una pieza para ver el diseño final y el copy de cada red. Solo lo que apruebes pasa a Publicación.
                                    </p>
                                </div>

                                {toReview.length === 0 ? (
                                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-10 text-center">
                                        <PartyPopper className="mx-auto text-gray-300 mb-3" size={36} />
                                        <p className="text-lg font-bold text-gray-900">Estás al día</p>
                                        <p className="text-sm text-gray-500 mt-1">No hay piezas esperando tu revisión. Te avisaremos aquí cuando el equipo termine las siguientes.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {toReview.map((piece) => (
                                            <ReviewCard key={piece.id} piece={piece} onOpen={() => setSelected(piece)} />
                                        ))}
                                    </div>
                                )}
                            </section>

                            {/* What the client already sent back */}
                            <section className="bg-gray-100/70 rounded-3xl p-4 self-start w-full" aria-label={STAGE_META.cambios.label}>
                                <header className="flex items-center justify-between pb-1">
                                    <div className="flex items-center gap-2">
                                        <ChangesIcon size={16} style={{ color: STAGE_META.cambios.color }} strokeWidth={2.5} />
                                        <h3 className="text-sm font-bold text-gray-900">{STAGE_META.cambios.label}</h3>
                                    </div>
                                    <span className="text-xs font-bold text-gray-500 bg-white rounded-full px-2 py-0.5">{withChanges.length}</span>
                                </header>
                                <p className="pb-3 text-xs text-gray-500">El equipo está aplicando tus comentarios. Vuelven a "Por revisar" cuando estén corregidas.</p>
                                <div className="space-y-3">
                                    {withChanges.map((piece) => (
                                        <button
                                            key={piece.id}
                                            onClick={() => setSelected(piece)}
                                            className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-3"
                                        >
                                            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{formatFecha(piece.fecha)}</span>
                                            <p className="text-sm font-bold text-gray-900 leading-snug line-clamp-2 mt-0.5">{piece.topico_angulo || 'Pieza sin tópico'}</p>
                                            {piece.comentario_cliente && (
                                                <p className="mt-2 text-xs text-gray-600 italic line-clamp-2 border-l-2 border-orange-200 pl-2">“{piece.comentario_cliente}”</p>
                                            )}
                                        </button>
                                    ))}
                                    {withChanges.length === 0 && <p className="py-4 text-center text-xs text-gray-400">No has pedido cambios pendientes</p>}
                                </div>
                            </section>
                        </div>

                        <OtherStations pieces={pieces} current="validacion" onNavigate={onNavigate} />
                    </>
                )}
            </div>

            {selected && (
                <PieceDetailModal piece={selected} onClose={() => setSelected(null)} onReview={handleReview} />
            )}
        </div>
    );
};

const ReviewCard: React.FC<{ piece: api.ContentPiece; onOpen: () => void }> = ({ piece, onOpen }) => (
    <button
        onClick={onOpen}
        className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex"
    >
        <PieceCover piece={piece} className="w-28 shrink-0 aspect-[4/5]" compact />
        <div className="p-4 min-w-0 flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{formatFecha(piece.fecha, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            <p className="text-sm font-bold text-gray-900 leading-snug line-clamp-3">{piece.topico_angulo || 'Pieza sin tópico'}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-auto">
                <FormatoBadge formato={piece.formato} />
                <PilarBadge pilar={piece.pilar} />
            </div>
        </div>
    </button>
);

export default ValidacionView;
