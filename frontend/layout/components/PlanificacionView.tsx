/**
 * PlanificacionView - Fase 5
 *
 * El plan del mes (content_pieces, creado por /02_crearcronograma desde Claude
 * Desktop) y su primera estación: las piezas que siguen en producción. Cuando una
 * pieza tiene su diseño final pasa sola a Validación. Solo lectura.
 */

import React, { useMemo, useState } from 'react';
import { Check, Clock, Clapperboard, CalendarRange } from 'lucide-react';
import { WorkflowStepper } from './WorkflowStepper';
import { AnimatedHeaderCard } from './AnimatedHeaderCard';
import { useAuth } from '../contexts/AuthContext';
import { useContentPieces } from '../hooks/useContentPieces';
import * as api from '../services/api';
import {
    PILAR_META, FORMATO_ICON, PilarBadge, FormatoBadge, MonthSwitcher, NoClientSelected, LoadingBlock,
    PieceDetailModal, OtherStations, pieceStage, productionStep, currentMonth, monthLabel, formatFecha,
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
                {onNavigate && <WorkflowStepper currentStep={5} onNavigate={onNavigate} />}
                <AnimatedHeaderCard supertitle="Fase 5: Producción" title="Planificación" subtitle="El plan del mes y lo que el equipo está produciendo." />

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
                                {/* The plan itself: how the month is built */}
                                <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-6 grid grid-cols-1 md:grid-cols-3 gap-6" aria-label="Plan del mes">
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">Plan de {monthLabel(month).toLowerCase()}</p>
                                        <p className="text-4xl font-bold text-gray-900">
                                            {pieces.length} <span className="text-lg font-semibold text-gray-400">{pieces.length === 1 ? 'pieza' : 'piezas'}</span>
                                        </p>
                                    </div>
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
        <p className="text-sm text-gray-500 max-w-sm">El equipo de Pixely arma el plan de cada mes contigo, a partir de tu estrategia y de lo que está pasando en tu mercado. Aparecerá aquí apenas esté listo.</p>
    </div>
);

export default PlanificacionView;
