/**
 * ValidacionView - Fase 6
 *
 * La mesa de revisión del cliente: solo muestra lo que necesita su decisión
 * (piezas terminadas por revisar, primero las que salen antes, y las que devolvió
 * con cambios, diciendo si es la imagen, el texto o ambos). Lo aprobado pasa a Publicaciones.
 * El equipo ve además "Por entregar": ahí sube cada pieza final tras el postprocesado.
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
    PieceDetailModal, OtherStations, pieceStage, formatFecha, CAMBIO_LABEL, MonthSwitcher, currentMonth, monthLabel,
} from './content/ContentPieceUI';
import { AgendaCalendar, ViewToggle, useAgendaView, type ChipStatus } from './content/AgendaUI';
import { DeliveryQueue, DeliveryModal, DueBadge } from './content/DeliveryUI';

const ChangesIcon = STAGE_META.cambios.icon;

export const ValidacionView: React.FC<{ onNavigate?: (view: string) => void; clientId?: string }> = ({ onNavigate, clientId: clientIdProp }) => {
    const { user } = useAuth();
    const clientId = clientIdProp || user?.fichaClienteId;
    // Every month: a piece waiting for the client never falls out of view because the month changed.
    const { pieces, loading, error, replacePiece } = useContentPieces(clientId);
    const [selected, setSelected] = useState<api.ContentPiece | null>(null);
    const [delivering, setDelivering] = useState<api.ContentPiece | null>(null);
    const isTeam = !!user?.isAdmin;

    const { toReview, withChanges } = useMemo(() => {
        const byDate = [...pieces].sort((a, b) => a.fecha.localeCompare(b.fecha));
        return {
            toReview: byDate.filter((p) => pieceStage(p) === 'revision'),
            withChanges: byDate.filter((p) => pieceStage(p) === 'cambios'),
        };
    }, [pieces]);

    const [view, choose] = useAgendaView();
    // The calendar opens on the month of the next piece waiting for the client.
    const [month, setMonth] = useState<string | null>(null);
    const shownMonth = month ?? (toReview[0] ?? withChanges[0])?.fecha.slice(0, 7) ?? currentMonth();

    const handleReview = async (estado: 'Aprobado' | 'Cambios solicitados', comentario?: string, cambioTipo?: api.CambioTipo) => {
        if (!clientId || !selected) return;
        const updated = await api.reviewContentPiece(clientId, selected.id, estado, comentario, cambioTipo);
        replacePiece(updated);
    };

    const handleUpload = async (files: File[], generadaConIa: boolean) => {
        if (!clientId || !delivering) return;
        replacePiece(await api.uploadPieceFinals(clientId, delivering.id, files, generadaConIa));
    };

    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar animate-fade-in-up bg-ink">
            <div className="max-w-7xl mx-auto">
                {onNavigate && <WorkflowStepper currentStep={2} onNavigate={onNavigate} />}
                <AnimatedHeaderCard supertitle="Contenido" title="Validación" subtitle="Solo lo que necesita tu decisión." />

                {!clientId ? <NoClientSelected /> : loading && pieces.length === 0 ? <LoadingBlock /> : (
                    <>
                        {error && <p className="mb-4 text-sm text-pink-text">{error}</p>}

                        {isTeam && <DeliveryQueue pieces={pieces} onOpen={setDelivering} />}

                        <div className="flex flex-wrap items-center gap-3 mb-6">
                            {view === 'calendario' && <MonthSwitcher month={shownMonth} onChange={setMonth} />}
                            <div className="ml-auto"><ViewToggle view={view} onChange={choose} /></div>
                        </div>

                        {view === 'calendario' ? (
                            <div className={`transition-opacity ${loading ? 'opacity-50' : ''}`}>
                                <AgendaCalendar
                                    month={shownMonth}
                                    pieces={[...toReview, ...withChanges].filter((p) => p.fecha.startsWith(shownMonth))}
                                    onOpen={setSelected}
                                    chipStatus={reviewStatus}
                                    summary={<>{toReview.filter((p) => p.fecha.startsWith(shownMonth)).length} por revisar en {monthLabel(shownMonth).toLowerCase()} · las que devolviste con cambios se ven en gris</>}
                                    emptyText="Nada por revisar este mes."
                                />
                            </div>
                        ) : (
                        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 transition-opacity ${loading ? 'opacity-50' : ''}`}>
                            {/* What the client must decide */}
                            <section className="lg:col-span-2" aria-label="Por revisar">
                                <div className="flex items-end justify-between gap-4 mb-4">
                                    <div>
                                        <p className="text-sm text-text-3">Esperando tu revisión</p>
                                        <p className="text-4xl font-bold text-white">
                                            {toReview.length} <span className="text-lg font-semibold text-text-3">{toReview.length === 1 ? 'pieza' : 'piezas'}</span>
                                        </p>
                                    </div>
                                    <p className="text-sm text-text-3 max-w-xs text-right hidden md:block">
                                        Primero las que salen antes. Abre cada una para ver el diseño final y su texto; solo lo que apruebes pasa a Publicaciones.
                                    </p>
                                </div>

                                {toReview.length === 0 ? (
                                    <div className="bg-card rounded-3xl border border-edge shadow-sm p-10 text-center">
                                        <PartyPopper className="mx-auto text-mute mb-3" size={36} />
                                        <p className="text-lg font-bold text-white">Estás al día</p>
                                        <p className="text-sm text-text-3 mt-1">No hay piezas esperando tu revisión. Te avisaremos aquí cuando el equipo termine las siguientes.</p>
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
                            <section className="bg-raised/70 rounded-3xl p-4 self-start w-full" aria-label={STAGE_META.cambios.label}>
                                <header className="flex items-center justify-between pb-1">
                                    <div className="flex items-center gap-2">
                                        <ChangesIcon size={16} style={{ color: STAGE_META.cambios.color }} strokeWidth={2.5} />
                                        <h3 className="text-sm font-bold text-white">{STAGE_META.cambios.label}</h3>
                                    </div>
                                    <span className="text-xs font-bold text-text-3 bg-card rounded-full px-2 py-0.5">{withChanges.length}</span>
                                </header>
                                <p className="pb-3 text-xs text-text-3">El equipo está aplicando tus comentarios. Vuelven a "Por revisar" cuando estén corregidas.</p>
                                <div className="space-y-3">
                                    {withChanges.map((piece) => (
                                        <button
                                            key={piece.id}
                                            onClick={() => setSelected(piece)}
                                            className="w-full text-left bg-card rounded-2xl border border-edge shadow-sm hover:shadow-md transition-shadow p-3"
                                        >
                                            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-3">{formatFecha(piece.fecha)}</span>
                                            <p className="text-sm font-bold text-white leading-snug line-clamp-2 mt-0.5">{piece.topico_angulo || 'Pieza sin tópico'}</p>
                                            {piece.cambio_tipo && <span className="block mt-1 text-xs font-semibold text-text-2">Cambiar: {CAMBIO_LABEL[piece.cambio_tipo].toLowerCase()}</span>}
                                            {piece.comentario_cliente && (
                                                <p className="mt-2 text-xs text-text-2 italic line-clamp-2 border-l-2 border-pink/40 pl-2">“{piece.comentario_cliente}”</p>
                                            )}
                                        </button>
                                    ))}
                                    {withChanges.length === 0 && <p className="py-4 text-center text-xs text-text-3">No has pedido cambios pendientes</p>}
                                </div>
                            </section>
                        </div>
                        )}

                        <OtherStations pieces={pieces} current="validacion" onNavigate={onNavigate} />
                    </>
                )}
            </div>

            {selected && (
                <PieceDetailModal piece={selected} onClose={() => setSelected(null)} onReview={handleReview} />
            )}
            {delivering && <DeliveryModal piece={delivering} onClose={() => setDelivering(null)} onUpload={handleUpload} />}
        </div>
    );
};

/** On the calendar: what waits for the client stands out; what they sent back steps back in gray. */
const reviewStatus = (p: api.ContentPiece): ChipStatus => {
    const meta = STAGE_META[pieceStage(p)];
    return { icon: meta.icon, label: meta.label, color: meta.color, muted: pieceStage(p) === 'cambios' };
};

const ReviewCard: React.FC<{ piece: api.ContentPiece; onOpen: () => void }> = ({ piece, onOpen }) => (
    <button
        onClick={onOpen}
        className="w-full text-left bg-card rounded-2xl border border-edge shadow-sm hover:shadow-md transition-shadow overflow-hidden flex"
    >
        <PieceCover piece={piece} className="w-28 shrink-0 aspect-[4/5]" compact />
        <div className="p-4 min-w-0 flex flex-col gap-2">
            <DueBadge fecha={piece.fecha} />
            <p className="text-sm font-bold text-white leading-snug line-clamp-3">{piece.topico_angulo || 'Pieza sin tópico'}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-auto">
                <FormatoBadge formato={piece.formato} />
                <PilarBadge pilar={piece.pilar} />
            </div>
        </div>
    </button>
);

export default ValidacionView;
