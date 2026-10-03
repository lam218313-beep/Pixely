/**
 * PublicacionView - Fase 7
 *
 * La cola de salida: solo piezas aprobadas (por programar) y programadas que aún
 * no salen. La programación en Metricool la hace el equipo de Pixely desde Claude
 * Desktop (05_publicar). Lo ya publicado pasa al Repositorio.
 */

import React, { useMemo, useState } from 'react';
import { WorkflowStepper } from './WorkflowStepper';
import { AnimatedHeaderCard } from './AnimatedHeaderCard';
import { useAuth } from '../contexts/AuthContext';
import { useContentPieces } from '../hooks/useContentPieces';
import * as api from '../services/api';
import {
    STAGE_META, StageChip, MonthSwitcher, NoClientSelected, LoadingBlock, PieceDetailModal, OtherStations,
    FORMATO_ICON, STAGE_STATION, pieceStage, pieceNetworks, currentMonth, parseFecha, formatFecha,
} from './content/ContentPieceUI';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const PublicacionView: React.FC<{ onNavigate?: (view: string) => void; clientId?: string }> = ({ onNavigate, clientId: clientIdProp }) => {
    const { user } = useAuth();
    const clientId = clientIdProp || user?.fichaClienteId;
    const [month, setMonth] = useState(currentMonth);
    const [selected, setSelected] = useState<api.ContentPiece | null>(null);
    const { pieces, loading, error, replacePiece } = useContentPieces(clientId, month);

    // This station's pieces only: approved and scheduled-but-not-yet-out.
    const queue = useMemo(
        () => pieces.filter((p) => STAGE_STATION[pieceStage(p)] === 'publicacion').sort((a, b) => a.fecha.localeCompare(b.fecha)),
        [pieces],
    );
    const programadas = queue.filter((p) => pieceStage(p) === 'programada');
    const porProgramar = queue.length - programadas.length;
    const next = programadas[0];

    const handleReview = async (estado: 'Aprobado' | 'Cambios solicitados', comentario?: string) => {
        if (!clientId || !selected) return;
        replacePiece(await api.reviewContentPiece(clientId, selected.id, estado, comentario));
    };

    const byDay = useMemo(() => {
        const map = new Map<number, api.ContentPiece[]>();
        queue.forEach((p) => {
            const day = parseFecha(p.fecha).getDate();
            map.set(day, [...(map.get(day) ?? []), p]);
        });
        return map;
    }, [queue]);

    const [year, monthIndex] = month.split('-').map(Number);
    const daysInMonth = new Date(year, monthIndex, 0).getDate();
    const leadingBlanks = (new Date(year, monthIndex - 1, 1).getDay() + 6) % 7; // Monday-first
    const today = new Date();
    const isToday = (day: number) => today.getFullYear() === year && today.getMonth() === monthIndex - 1 && today.getDate() === day;

    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar animate-fade-in-up bg-brand-bg">
            <div className="max-w-7xl mx-auto">
                {onNavigate && <WorkflowStepper currentStep={3} onNavigate={onNavigate} />}
                <AnimatedHeaderCard supertitle="Contenido" title="Publicación" subtitle="Lo aprobado: qué sale y cuándo." />

                {!clientId ? <NoClientSelected /> : (
                    <>
                        <div className="flex flex-wrap items-center gap-3 mb-6">
                            <MonthSwitcher month={month} onChange={setMonth} />
                        </div>

                        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

                        {loading && pieces.length === 0 ? <LoadingBlock /> : (
                            <div className={`transition-opacity ${loading ? 'opacity-50' : ''}`}>
                                {/* This station's numbers only */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
                                        <p className="text-sm text-gray-500 mb-1">Próxima publicación</p>
                                        {next ? (
                                            <button onClick={() => setSelected(next)} className="text-left">
                                                <p className="text-xl font-bold text-gray-900 capitalize">{formatFecha(next.fecha, { weekday: 'long', day: 'numeric', month: 'short' })}</p>
                                                <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{next.topico_angulo}</p>
                                            </button>
                                        ) : <p className="text-xl font-bold text-gray-300">—</p>}
                                    </div>
                                    <StatTile label="Programadas en Metricool" value={programadas.length} />
                                    <StatTile label="Aprobadas, por programar" value={porProgramar} />
                                </div>

                                {/* Legend for the calendar chips */}
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
                                    {(['aprobada', 'programada'] as const).map((stage) => (
                                        <StageChip key={stage} stage={stage} />
                                    ))}
                                </div>

                                {/* Calendar (desktop) */}
                                <div className="hidden md:block bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                                    <div className="grid grid-cols-7 border-b border-gray-100">
                                        {WEEKDAYS.map((d) => (
                                            <div key={d} className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-400">{d}</div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-7">
                                        {Array.from({ length: leadingBlanks }).map((_, i) => (
                                            <div key={`blank-${i}`} className="min-h-[120px] border-b border-r border-gray-100 bg-gray-50/50" />
                                        ))}
                                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                                            <div key={day} className="min-h-[120px] border-b border-r border-gray-100 p-2 flex flex-col gap-1.5">
                                                <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday(day) ? 'bg-gray-900 text-white' : 'text-gray-500'}`}>{day}</span>
                                                {(byDay.get(day) ?? []).map((piece) => <CalendarChip key={piece.id} piece={piece} onClick={() => setSelected(piece)} />)}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Agenda (mobile) */}
                                <div className="md:hidden space-y-3">
                                    {[...byDay.entries()].sort(([a], [b]) => a - b).map(([day, items]) => (
                                        <div key={day} className="bg-white rounded-2xl border border-gray-100 p-3">
                                            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{formatFecha(items[0].fecha, { weekday: 'long', day: 'numeric' })}</p>
                                            <div className="space-y-1.5">
                                                {items.map((piece) => <CalendarChip key={piece.id} piece={piece} onClick={() => setSelected(piece)} />)}
                                            </div>
                                        </div>
                                    ))}
                                    {queue.length === 0 && <p className="text-sm text-gray-500 text-center py-8">Aún no hay piezas aprobadas para este mes.</p>}
                                </div>

                                <p className="mt-4 text-xs text-gray-500">
                                    El equipo de Pixely programa en Metricool solo las piezas aprobadas en Validación (Instagram, LinkedIn, Pinterest y Google Business). X se publica a mano. Si aprobaste algo por error, ábrelo y pide cambios mientras siga "por programar".
                                </p>

                                <OtherStations pieces={pieces} current="publicacion" onNavigate={onNavigate} />
                            </div>
                        )}
                    </>
                )}
            </div>

            {selected && <PieceDetailModal piece={selected} onClose={() => setSelected(null)} onReview={handleReview} />}
        </div>
    );
};

const StatTile: React.FC<{ label: string; value: number }> = ({ label, value }) => (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
        <p className="text-sm text-gray-500 mb-1">{label}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
);

const CalendarChip: React.FC<{ piece: api.ContentPiece; onClick: () => void }> = ({ piece, onClick }) => {
    const stage = pieceStage(piece);
    const FormatIcon = piece.formato ? FORMATO_ICON[piece.formato] : null;
    const networks = pieceNetworks(piece);
    return (
        <button
            onClick={onClick}
            title={`${STAGE_META[stage].label} · ${piece.topico_angulo ?? ''}${networks.length ? ` · ${networks.join(', ')}` : ''}`}
            className="w-full text-left flex flex-col gap-1 rounded-lg p-1.5 hover:bg-gray-50 border border-gray-100"
        >
            <span className="flex items-center gap-1.5">
                <StageChip stage={stage} compact />
                {FormatIcon && <FormatIcon size={12} className="text-gray-400 shrink-0" />}
            </span>
            <span className="text-xs font-medium text-gray-700 leading-snug line-clamp-2">{piece.topico_angulo || piece.formato}</span>
        </button>
    );
};

export default PublicacionView;
