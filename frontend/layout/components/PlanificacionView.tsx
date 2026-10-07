/**
 * PlanificacionView
 *
 * El plan del mes (content_pieces, creado por /05_planificacion desde Claude Desktop):
 * cómo se reparte en la Estrategia y, sobre todo, la aprobación del cliente idea por
 * idea antes de producir nada. Solo texto y estrategia: la imagen y los textos finales
 * se revisan después en Validación.
 */

import React, { useState } from 'react';
import { CalendarRange } from 'lucide-react';
import { WorkflowStepper } from './WorkflowStepper';
import { AnimatedHeaderCard } from './AnimatedHeaderCard';
import { useAuth } from '../contexts/AuthContext';
import { useContentPieces } from '../hooks/useContentPieces';
import * as api from '../services/api';
import { MonthSwitcher, NoClientSelected, LoadingBlock, OtherStations, currentMonth, monthLabel } from './content/ContentPieceUI';
import { AgendaCalendar, ViewToggle, useAgendaView, type ChipStatus } from './content/AgendaUI';
import { PlanOverview } from './content/PlanCharts';
import { PLAN_META, PlanSummaryBar, PlanPieceList, PlanPieceModal, planEstado } from './content/PlanReviewUI';
import { useStrategyIndex } from './content/strategyLinks';

export const PlanificacionView: React.FC<{ onNavigate?: (view: string) => void; clientId?: string }> = ({ onNavigate, clientId: clientIdProp }) => {
    const { user } = useAuth();
    const clientId = clientIdProp || user?.fichaClienteId;
    const [month, setMonth] = useState(currentMonth);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const { pieces, loading, error, replacePiece } = useContentPieces(clientId, month);
    const strategy = useStrategyIndex(clientId);
    const selected = pieces.find((p) => p.id === selectedId) ?? null;
    const [view, choose] = useAgendaView();

    const review = async (piece: api.ContentPiece, estado: 'Aprobada' | 'Cambios solicitados', comentario?: string) => {
        if (!clientId) return;
        replacePiece(await api.reviewPlanPiece(clientId, piece.id, estado, comentario));
    };
    const approvePending = async () => {
        if (!clientId) return;
        (await api.approvePendingPlan(clientId, month)).forEach(replacePiece);
    };

    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar animate-fade-in-up bg-ink">
            <div className="max-w-7xl mx-auto">
                {onNavigate && <WorkflowStepper currentStep={1} onNavigate={onNavigate} />}
                <AnimatedHeaderCard supertitle="Contenido" title="Planificación" subtitle="Las ideas del mes, a qué objetivo sirve cada una y tu aprobación antes de producirlas." />

                {!clientId ? <NoClientSelected /> : (
                    <>
                        <div className="flex flex-wrap items-center gap-3 mb-6">
                            <MonthSwitcher month={month} onChange={setMonth} />
                        </div>

                        {error && <p className="mb-4 text-sm text-pink-text">{error}</p>}

                        {loading && pieces.length === 0 ? <LoadingBlock /> : pieces.length === 0 ? (
                            <EmptyPlan month={month} />
                        ) : (
                            <div className={`transition-opacity ${loading ? 'opacity-50' : ''}`}>
                                <PlanSummaryBar pieces={pieces} onApprovePending={approvePending} />
                                <PlanOverview pieces={pieces} index={strategy} month={month} monthName={monthLabel(month).toLowerCase()} />
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                    {view === 'calendario' ? <h2 className="text-lg font-bold text-white">Calendario de {monthLabel(month).toLowerCase()}</h2> : <span />}
                                    <ViewToggle view={view} onChange={choose} />
                                </div>
                                {view === 'calendario' ? (
                                    <div className="mb-6"><AgendaCalendar
                                        month={month}
                                        pieces={pieces}
                                        onOpen={(p) => setSelectedId(p.id)}
                                        chipStatus={planStatus}
                                        summary={<>{pieces.length} {pieces.length === 1 ? 'idea' : 'ideas'} en {monthLabel(month).toLowerCase()} · {pieces.filter((p) => planEstado(p) !== 'Aprobada').length} por aprobar · haz clic en una idea para verla y aprobarla</>}
                                        emptyText="No hay ideas este mes."
                                    /></div>
                                ) : (
                                    <PlanPieceList pieces={pieces} index={strategy} onOpen={(p) => setSelectedId(p.id)} onApprove={(p) => review(p, 'Aprobada')} />
                                )}
                                <OtherStations pieces={pieces} current="work" onNavigate={onNavigate} />
                            </div>
                        )}
                    </>
                )}
            </div>

            {selected && (
                <PlanPieceModal piece={selected} index={strategy} onClose={() => setSelectedId(null)} onReview={(estado, comentario) => review(selected, estado, comentario)} />
            )}
        </div>
    );
};

const EmptyPlan: React.FC<{ month: string }> = ({ month }) => (
    <div className="bg-card rounded-3xl border border-edge shadow-sm p-12 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-raised flex items-center justify-center mb-4">
            <CalendarRange size={26} className="text-mute" />
        </div>
        <h3 className="text-lg font-bold text-white mb-1">Aún no hay plan para {monthLabel(month).toLowerCase()}</h3>
        <p className="text-sm text-text-3 max-w-sm">El equipo de Pixely arma el plan de cada mes a partir de tu estrategia y de lo que está pasando en tu mercado. Aparecerá aquí para que lo apruebes antes de producirlo.</p>
    </div>
);

/** The client's decision on each idea, on its calendar chip; approved ones step back in gray. */
const planStatus = (p: api.ContentPiece): ChipStatus => {
    const meta = PLAN_META[planEstado(p)];
    return { icon: meta.icon, label: meta.label, color: meta.color, muted: planEstado(p) === 'Aprobada' };
};

export default PlanificacionView;
