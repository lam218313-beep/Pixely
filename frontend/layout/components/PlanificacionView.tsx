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
import { FORMATO_ICON, MonthSwitcher, NoClientSelected, LoadingBlock, OtherStations, currentMonth, monthLabel, formatFecha } from './content/ContentPieceUI';
import { PlanOverview } from './content/PlanCharts';
import { PLAN_META, PlanSummaryBar, PlanPieceList, PlanPieceModal, planEstado } from './content/PlanReviewUI';
import { OTHER_COLOR, pieceLinks, useStrategyIndex, type StrategyIndex } from './content/strategyLinks';

export const PlanificacionView: React.FC<{ onNavigate?: (view: string) => void; clientId?: string }> = ({ onNavigate, clientId: clientIdProp }) => {
    const { user } = useAuth();
    const clientId = clientIdProp || user?.fichaClienteId;
    const [month, setMonth] = useState(currentMonth);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const { pieces, loading, error, replacePiece } = useContentPieces(clientId, month);
    const strategy = useStrategyIndex(clientId);
    const selected = pieces.find((p) => p.id === selectedId) ?? null;

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
                                <MonthCalendar month={month} pieces={pieces} index={strategy} onOpen={(p) => setSelectedId(p.id)} />
                                <PlanPieceList pieces={pieces} index={strategy} onOpen={(p) => setSelectedId(p.id)} onApprove={(p) => review(p, 'Aprobada')} />
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

// --- The month at a glance ---

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** The client's decision on each idea, as an icon (the word is in its tooltip and in the list below). */
const StatusIcon: React.FC<{ piece: api.ContentPiece }> = ({ piece }) => {
    const meta = PLAN_META[planEstado(piece)];
    return <meta.icon size={11} strokeWidth={3} className="shrink-0 mt-0.5" style={{ color: meta.color }} aria-label={meta.label} />;
};

/** Each piece wears the color of the objective it serves first. */
const objectiveColor = (p: api.ContentPiece, index: StrategyIndex | null) => pieceLinks(p, index)[0]?.objective.color ?? OTHER_COLOR;

const MonthCalendar: React.FC<{ month: string; pieces: api.ContentPiece[]; index: StrategyIndex | null; onOpen: (p: api.ContentPiece) => void }> = ({ month, pieces, index, onOpen }) => {
    const [year, mon] = month.split('-').map(Number);
    const days = new Date(year, mon, 0).getDate();
    const lead = (new Date(year, mon - 1, 1).getDay() + 6) % 7; // Monday first
    const byDay = new Map<number, api.ContentPiece[]>();
    pieces.forEach((p) => {
        const d = Number(p.fecha.slice(8, 10));
        byDay.set(d, [...(byDay.get(d) ?? []), p]);
    });
    const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];

    return (
        <section className="bg-card rounded-3xl border border-edge shadow-sm p-6 mb-6" aria-label="Calendario del mes">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
                <div>
                    <h2 className="text-lg font-bold text-white">Calendario de {monthLabel(month).toLowerCase()}</h2>
                    <p className="text-sm text-text-3">Qué sale cada día. Haz clic en una idea para verla y aprobarla.</p>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-2 max-w-xl">
                    {(index?.objectives ?? []).map((o) => (
                        <span key={o.id} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: o.color }} />{o.principal ? 'Principal: ' : ''}{o.label}</span>
                    ))}
                </div>
            </div>

            {/* Grid on tablet and up */}
            <div className="hidden md:grid grid-cols-7 gap-px bg-raised rounded-2xl overflow-hidden border border-edge">
                {WEEKDAYS.map((d) => <div key={d} className="bg-raised px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-text-3">{d}</div>)}
                {cells.map((day, i) => (
                    <div key={i} className={`bg-card min-h-[92px] p-1.5 ${day ? '' : 'bg-raised/60'}`}>
                        {day && <p className="text-xs font-semibold text-text-3 mb-1">{day}</p>}
                        <div className="space-y-1">
                            {(day ? byDay.get(day) ?? [] : []).map((p) => {
                                const Icon = p.formato ? FORMATO_ICON[p.formato] : CalendarRange;
                                return (
                                    <button key={p.id} onClick={() => onOpen(p)} title={`${p.topico_angulo ?? ''} · ${PLAN_META[planEstado(p)].label}`}
                                        className="w-full text-left flex items-start gap-1 rounded-md bg-raised hover:bg-raised px-1.5 py-1 border-l-[3px]"
                                        style={{ borderLeftColor: objectiveColor(p, index) }}>
                                        <Icon size={11} className="text-text-3 shrink-0 mt-0.5" />
                                        <span className="text-[11px] leading-tight text-white line-clamp-2 flex-1">{p.topico_angulo || 'Pieza'}</span>
                                        <StatusIcon piece={p} />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Phone: the same month as a list */}
            <ul className="md:hidden divide-y divide-edge">
                {pieces.map((p) => (
                    <li key={p.id}>
                        <button onClick={() => onOpen(p)} className="w-full text-left py-3 flex gap-3 items-start">
                            <span className="w-10 shrink-0 text-center">
                                <span className="block text-lg font-bold text-white leading-none">{Number(p.fecha.slice(8, 10))}</span>
                                <span className="block text-[10px] font-semibold uppercase text-text-3 mt-0.5">{formatFecha(p.fecha, { weekday: 'short' })}</span>
                            </span>
                            <span className="min-w-0 border-l-[3px] pl-3" style={{ borderLeftColor: objectiveColor(p, index) }}>
                                <span className="block text-sm font-semibold text-white leading-snug line-clamp-2">{p.topico_angulo || 'Pieza sin tópico'}</span>
                                <span className="flex items-center gap-1.5 text-xs text-text-3 mt-0.5"><StatusIcon piece={p} />{PLAN_META[planEstado(p)].label} · {p.formato}</span>
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    );
};

export default PlanificacionView;
