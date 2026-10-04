/**
 * PlanificacionView
 *
 * El plan del mes (content_pieces, creado por /05_planificacion desde Claude Desktop):
 * a qué objetivo de la Estrategia sirve cada pieza, su calendario, la aprobación del
 * cliente antes de producir, y su primera estación: las piezas que siguen en
 * producción. Cuando una pieza tiene su diseño final pasa sola a Validación.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Check, Clock, Clapperboard, CalendarRange } from 'lucide-react';
import { WorkflowStepper } from './WorkflowStepper';
import { AnimatedHeaderCard } from './AnimatedHeaderCard';
import { ApprovalBar } from './ApprovalBar';
import { useAuth } from '../contexts/AuthContext';
import { useContentPieces } from '../hooks/useContentPieces';
import * as api from '../services/api';
import {
    PILAR_META, FORMATO_ICON, PilarBadge, FormatoBadge, MonthSwitcher, NoClientSelected, LoadingBlock,
    PieceDetailModal, OtherStations, PieceWhyLine, pieceStage, productionStep, currentMonth, monthLabel, formatFecha,
} from './content/ContentPieceUI';

const PILARES: api.ContentPilar[] = ['Problema', 'Identidad', 'Prueba'];
const FORMATOS: api.ContentFormato[] = ['Imagen', 'Carrusel', 'Estado', 'Reel'];
const DONE = '#0ca30c';
const PENDING = '#898781';

export const PlanificacionView: React.FC<{ onNavigate?: (view: string) => void; clientId?: string }> = ({ onNavigate, clientId: clientIdProp }) => {
    const { user } = useAuth();
    const clientId = clientIdProp || user?.fichaClienteId;
    const [month, setMonth] = useState(currentMonth);
    const [selected, setSelected] = useState<api.ContentPiece | null>(null);
    const { pieces, loading, error } = useContentPieces(clientId, month);
    const [review, setReview] = useState<api.PlanReview | null>(null);
    const [strategy, setStrategy] = useState<api.StrategyNode[]>([]);

    useEffect(() => {
        if (!clientId) return;
        let cancelled = false;
        setReview(null);
        api.getPlanReview(clientId, month).then((r) => { if (!cancelled) setReview(r); }).catch((e) => console.error('Error loading plan review:', e));
        return () => { cancelled = true; };
    }, [clientId, month]);

    useEffect(() => {
        if (!clientId) return;
        api.getStrategy(clientId).then(setStrategy).catch(() => setStrategy([]));
    }, [clientId]);

    const byObjective = useMemo(() => objectiveMix(pieces, strategy), [pieces, strategy]);

    const inProduction = useMemo(
        () => pieces.filter((p) => pieceStage(p) === 'produccion').sort((a, b) => a.fecha.localeCompare(b.fecha)),
        [pieces],
    );
    const mix = useMemo(() => ({
        pilar: PILARES.map((k) => ({ key: k, n: pieces.filter((p) => p.pilar === k).length })),
        formato: FORMATOS.map((k) => ({ key: k, n: pieces.filter((p) => p.formato === k).length })).filter((f) => f.n > 0),
    }), [pieces]);

    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar animate-fade-in-up bg-brand-bg">
            <div className="max-w-7xl mx-auto">
                {onNavigate && <WorkflowStepper currentStep={1} onNavigate={onNavigate} />}
                <AnimatedHeaderCard supertitle="Contenido" title="Planificación" subtitle="Qué sale este mes, cuándo y a qué objetivo sirve." />

                {!clientId ? <NoClientSelected /> : (
                    <>
                        <div className="flex flex-wrap items-center gap-3 mb-6">
                            <MonthSwitcher month={month} onChange={setMonth} />
                        </div>

                        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

                        {loading && pieces.length === 0 ? <LoadingBlock /> : pieces.length === 0 ? (
                            <EmptyPlan month={month} />
                        ) : (
                            <div className={`transition-opacity ${loading ? 'opacity-50' : ''}`}>
                                {review && (
                                    <div className="mb-6">
                                        <ApprovalBar
                                            review={review}
                                            approvedValue="Aprobado"
                                            texts={{
                                                pending: '¿Este es el contenido que quieres este mes? Apruébalo y empezamos a producirlo.',
                                                changes: 'El equipo está ajustando el plan con tus comentarios.',
                                                approved: 'Ya estamos produciendo estas piezas.',
                                                placeholder: 'Ej. Cambia el tema del día 12; queremos más piezas de delivery…',
                                            }}
                                            onSubmit={async (estado, comentario) => setReview(await api.reviewPlan(clientId, month, estado as 'Aprobado' | 'Cambios solicitados', comentario))}
                                        />
                                    </div>
                                )}

                                {/* The plan itself: how the month is built */}
                                <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6" aria-label="Plan del mes">
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">Plan de {monthLabel(month).toLowerCase()}</p>
                                        <p className="text-4xl font-bold text-gray-900">
                                            {pieces.length} <span className="text-lg font-semibold text-gray-400">{pieces.length === 1 ? 'pieza' : 'piezas'}</span>
                                        </p>
                                    </div>
                                    <ObjectiveMix rows={byObjective} total={pieces.length} />
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Por pilar</p>
                                        <ul className="space-y-1.5 max-w-[240px]">
                                            {mix.pilar.map(({ key, n }) => (
                                                <li key={key} className="flex items-center justify-between text-sm">
                                                    <span className="flex items-center gap-2 text-gray-700">
                                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PILAR_META[key].color }} />
                                                        {key}
                                                    </span>
                                                    <span className="font-bold text-gray-900 tabular-nums">{n}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Por formato</p>
                                        <ul className="space-y-1.5 max-w-[240px]">
                                            {mix.formato.map(({ key, n }) => {
                                                const Icon = FORMATO_ICON[key];
                                                return (
                                                    <li key={key} className="flex items-center justify-between text-sm">
                                                        <span className="flex items-center gap-2 text-gray-700"><Icon size={14} className="text-gray-400" />{key}</span>
                                                        <span className="font-bold text-gray-900 tabular-nums">{n}</span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                </section>

                                <MonthCalendar month={month} pieces={pieces} onOpen={setSelected} />

                                {/* This station: what is still being produced */}
                                <section aria-label="En producción">
                                    <div className="flex items-end justify-between gap-4 mb-4">
                                        <div>
                                            <h2 className="text-lg font-bold text-gray-900">En producción</h2>
                                            <p className="text-sm text-gray-500">Cuando una pieza tiene su diseño final, pasa sola a Validación para que la revises.</p>
                                        </div>
                                        <span className="text-sm text-gray-500 whitespace-nowrap"><strong className="text-gray-900">{inProduction.length}</strong> de {pieces.length}</span>
                                    </div>

                                    {inProduction.length === 0 ? (
                                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-10 text-center">
                                            <Check className="mx-auto mb-3" size={32} style={{ color: DONE }} />
                                            <p className="text-lg font-bold text-gray-900">Todo el plan ya salió de producción</p>
                                            <p className="text-sm text-gray-500 mt-1">Revisa las piezas en Validación.</p>
                                        </div>
                                    ) : (
                                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm divide-y divide-gray-100 overflow-hidden">
                                            {inProduction.map((piece) => (
                                                <button
                                                    key={piece.id}
                                                    onClick={() => setSelected(piece)}
                                                    className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors grid grid-cols-[56px_1fr] md:grid-cols-[72px_1fr_auto] items-center gap-x-4 gap-y-2"
                                                >
                                                    <span className="text-center">
                                                        <span className="block text-2xl font-bold text-gray-900 leading-none">{Number(piece.fecha.slice(8, 10))}</span>
                                                        <span className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mt-1">{formatFecha(piece.fecha, { weekday: 'short' })}</span>
                                                    </span>
                                                    <span className="min-w-0">
                                                        <span className="block text-sm font-bold text-gray-900 leading-snug line-clamp-2">{piece.topico_angulo || 'Pieza sin tópico'}</span>
                                                        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                                                            <FormatoBadge formato={piece.formato} />
                                                            <PilarBadge pilar={piece.pilar} />
                                                        </span>
                                                        <PieceWhyLine piece={piece} />
                                                    </span>
                                                    <ProductionTracker piece={piece} />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </section>

                                <OtherStations pieces={pieces} current="work" onNavigate={onNavigate} />
                            </div>
                        )}
                    </>
                )}
            </div>

            {selected && <PieceDetailModal piece={selected} onClose={() => setSelected(null)} />}
        </div>
    );
};

/** Copy → Diseño, each with an icon + word so the state never rests on color alone. Reels are produced outside the pipeline. */
const ProductionTracker: React.FC<{ piece: api.ContentPiece }> = ({ piece }) => {
    const step = productionStep(piece);
    const copyDone = step !== 'copy';
    return (
        <span className="col-start-2 md:col-start-auto flex items-center gap-2">
            <Step done={copyDone} label="Copy" />
            <span className="w-4 h-px bg-gray-200" />
            {step === 'externa' ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-100">
                    <Clapperboard size={13} style={{ color: PENDING }} /> Video en producción
                </span>
            ) : (
                <Step done={false} label={copyDone ? 'En diseño' : 'Diseño'} active={copyDone} />
            )}
        </span>
    );
};

const Step: React.FC<{ done: boolean; label: string; active?: boolean }> = ({ done, label, active }) => (
    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold border ${active ? 'text-gray-900 bg-white border-gray-200' : 'text-gray-600 bg-gray-50 border-gray-100'}`}>
        {done ? <Check size={13} style={{ color: DONE }} strokeWidth={3} /> : <Clock size={13} style={{ color: PENDING }} />}
        {label}
    </span>
);

const EmptyPlan: React.FC<{ month: string }> = ({ month }) => (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
            <CalendarRange size={26} className="text-gray-300" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Aún no hay plan para {monthLabel(month).toLowerCase()}</h3>
        <p className="text-sm text-gray-500 max-w-sm">El equipo de Pixely arma el plan de cada mes a partir de tu estrategia y de lo que está pasando en tu mercado. Aparecerá aquí para que lo apruebes antes de producirlo.</p>
    </div>
);

// --- Which objectives the month serves ---

interface ObjectiveRow { key: string; label: string; n: number; principal: boolean }

/** Groups pieces by the objective they serve; the strategy (if still matching) says which one is the main one. */
function objectiveMix(pieces: api.ContentPiece[], strategy: api.StrategyNode[]): ObjectiveRow[] {
    const byId = new Map(strategy.map((n) => [n.id, n] as [string, api.StrategyNode]));
    const objectiveOf = (conceptId: string | null) => {
        const concept = conceptId ? byId.get(conceptId) : undefined;
        const strat = concept?.parentId ? byId.get(concept.parentId) : undefined;
        return strat?.parentId ? byId.get(strat.parentId) : undefined;
    };
    const rows = new Map<string, ObjectiveRow>();
    pieces.forEach((p) => {
        const obj = objectiveOf(p.concepto_id);
        const label = p.objetivo || 'Sin objetivo asignado';
        const key = obj?.id ?? label;
        const principal = !!obj && (obj.tags?.includes('principal') || /^objetivo principal$/i.test(obj.label.trim()));
        const row = rows.get(key) ?? { key, label, n: 0, principal };
        row.n += 1;
        rows.set(key, row);
    });
    return [...rows.values()].sort((a, b) => Number(b.principal) - Number(a.principal) || b.n - a.n);
}

const ObjectiveMix: React.FC<{ rows: ObjectiveRow[]; total: number }> = ({ rows, total }) => {
    const main = rows.find((r) => r.principal);
    return (
        <div className="md:col-span-1">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Por objetivo</p>
            {main && <p className="text-sm text-gray-700 mb-2"><strong className="text-gray-900">{main.n} de {total}</strong> piezas van al objetivo principal</p>}
            <ul className="space-y-2">
                {rows.map((r) => (
                    <li key={r.key} title={`${r.label}: ${r.n} ${r.n === 1 ? 'pieza' : 'piezas'}`}>
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                            <span className="text-gray-700 line-clamp-1">{r.principal && <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 mr-1">Principal</span>}{r.label}</span>
                            <span className="font-bold text-gray-900 tabular-nums">{r.n}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mt-1">
                            <div className="h-full rounded-full" style={{ width: `${(r.n / Math.max(total, 1)) * 100}%`, backgroundColor: r.principal ? '#D90B66' : '#c3c2b7' }} />
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

// --- The month at a glance ---

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const MonthCalendar: React.FC<{ month: string; pieces: api.ContentPiece[]; onOpen: (p: api.ContentPiece) => void }> = ({ month, pieces, onOpen }) => {
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
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-6" aria-label="Calendario del mes">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Calendario de {monthLabel(month).toLowerCase()}</h2>
                    <p className="text-sm text-gray-500">Qué sale cada día. Haz clic en una pieza para ver por qué existe.</p>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                    {PILARES.map((k) => (
                        <span key={k} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PILAR_META[k].color }} />{k}</span>
                    ))}
                </div>
            </div>

            {/* Grid on tablet and up */}
            <div className="hidden md:grid grid-cols-7 gap-px bg-gray-100 rounded-2xl overflow-hidden border border-gray-100">
                {WEEKDAYS.map((d) => <div key={d} className="bg-gray-50 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">{d}</div>)}
                {cells.map((day, i) => (
                    <div key={i} className={`bg-white min-h-[92px] p-1.5 ${day ? '' : 'bg-gray-50/60'}`}>
                        {day && <p className="text-xs font-semibold text-gray-400 mb-1">{day}</p>}
                        <div className="space-y-1">
                            {(day ? byDay.get(day) ?? [] : []).map((p) => {
                                const Icon = p.formato ? FORMATO_ICON[p.formato] : CalendarRange;
                                return (
                                    <button key={p.id} onClick={() => onOpen(p)} title={p.topico_angulo ?? ''}
                                        className="w-full text-left flex items-start gap-1 rounded-md bg-gray-50 hover:bg-gray-100 px-1.5 py-1 border-l-[3px]"
                                        style={{ borderLeftColor: p.pilar ? PILAR_META[p.pilar].color : '#c3c2b7' }}>
                                        <Icon size={11} className="text-gray-400 shrink-0 mt-0.5" />
                                        <span className="text-[11px] leading-tight text-gray-800 line-clamp-2">{p.topico_angulo || 'Pieza'}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Phone: the same month as a list */}
            <ul className="md:hidden divide-y divide-gray-100">
                {pieces.map((p) => (
                    <li key={p.id}>
                        <button onClick={() => onOpen(p)} className="w-full text-left py-3 flex gap-3 items-start">
                            <span className="w-10 shrink-0 text-center">
                                <span className="block text-lg font-bold text-gray-900 leading-none">{Number(p.fecha.slice(8, 10))}</span>
                                <span className="block text-[10px] font-semibold uppercase text-gray-400 mt-0.5">{formatFecha(p.fecha, { weekday: 'short' })}</span>
                            </span>
                            <span className="min-w-0 border-l-[3px] pl-3" style={{ borderLeftColor: p.pilar ? PILAR_META[p.pilar].color : '#c3c2b7' }}>
                                <span className="block text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{p.topico_angulo || 'Pieza sin tópico'}</span>
                                <span className="block text-xs text-gray-500 mt-0.5">{p.formato}{p.objetivo ? ` · ${p.objetivo}` : ''}</span>
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    );
};

export default PlanificacionView;
