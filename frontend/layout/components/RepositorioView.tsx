/**
 * RepositorioView - Fase 6
 *
 * Galería de las piezas del mes (content_pieces). Solo lectura: las piezas las
 * produce a mano el pipeline de Claude Desktop (03 copy, 04 render).
 */

import React, { useMemo, useState } from 'react';
import { Images } from 'lucide-react';
import { WorkflowStepper } from './WorkflowStepper';
import { AnimatedHeaderCard } from './AnimatedHeaderCard';
import { useAuth } from '../contexts/AuthContext';
import { useContentPieces } from '../hooks/useContentPieces';
import * as api from '../services/api';
import {
    PILAR_META, FORMATO_ICON, PilarBadge, FormatoBadge, StageChip, PieceCover, MonthSwitcher,
    NoClientSelected, LoadingBlock, PieceDetailModal, pieceStage, currentMonth, formatFecha,
} from './content/ContentPieceUI';

const FORMATOS: api.ContentFormato[] = ['Imagen', 'Carrusel', 'Estado', 'Reel'];
const PILARES: api.ContentPilar[] = ['Problema', 'Identidad', 'Prueba'];

export const RepositorioView: React.FC<{ onNavigate?: (view: string) => void; clientId?: string }> = ({ onNavigate, clientId: clientIdProp }) => {
    const { user } = useAuth();
    const clientId = clientIdProp || user?.fichaClienteId;
    const [month, setMonth] = useState(currentMonth);
    const [formato, setFormato] = useState<api.ContentFormato | null>(null);
    const [pilar, setPilar] = useState<api.ContentPilar | null>(null);
    const [selected, setSelected] = useState<api.ContentPiece | null>(null);
    const { pieces, loading, error } = useContentPieces(clientId, month);

    const visible = useMemo(
        () => pieces.filter((p) => (!formato || p.formato === formato) && (!pilar || p.pilar === pilar)),
        [pieces, formato, pilar]
    );

    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar animate-fade-in-up bg-brand-bg">
            <div className="max-w-7xl mx-auto">
                {onNavigate && <WorkflowStepper currentStep={6} onNavigate={onNavigate} />}
                <AnimatedHeaderCard supertitle="Fase 6: Producción" title="Repositorio" subtitle="Todas las piezas del mes, listas para revisar y publicar." />

                {!clientId ? <NoClientSelected /> : (
                    <>
                        {/* Filters: one row above everything they scope */}
                        <div className="flex flex-wrap items-center gap-3 mb-6">
                            <MonthSwitcher month={month} onChange={setMonth} />
                            <FilterGroup
                                label="Formato"
                                options={FORMATOS.map((f) => ({ value: f, label: f, icon: FORMATO_ICON[f] }))}
                                value={formato}
                                onChange={(v) => setFormato(v as api.ContentFormato | null)}
                            />
                            <FilterGroup
                                label="Pilar"
                                options={PILARES.map((p) => ({ value: p, label: p, dot: PILAR_META[p].color }))}
                                value={pilar}
                                onChange={(v) => setPilar(v as api.ContentPilar | null)}
                            />
                            <span className="ml-auto text-sm text-gray-500">
                                <strong className="text-gray-900">{visible.length}</strong> de {pieces.length} piezas
                            </span>
                        </div>

                        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

                        {loading && pieces.length === 0 ? <LoadingBlock /> : visible.length === 0 ? (
                            <EmptyGallery filtered={pieces.length > 0} />
                        ) : (
                            <div className={`grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 transition-opacity ${loading ? 'opacity-50' : ''}`}>
                                {visible.map((piece) => (
                                    <button
                                        key={piece.id}
                                        onClick={() => setSelected(piece)}
                                        className="group flex flex-col text-left bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all overflow-hidden"
                                    >
                                        <div className="relative">
                                            <PieceCover piece={piece} className="w-full aspect-[4/5]" />
                                            <div className="absolute top-3 left-3">
                                                <StageChip stage={pieceStage(piece)} />
                                            </div>
                                            {(piece.url_piezas_finales?.length ?? 0) > 1 && (
                                                <span className="absolute bottom-3 right-3 text-[11px] font-bold bg-white/90 rounded-lg px-2 py-1 text-gray-700">
                                                    {piece.url_piezas_finales!.length} láminas
                                                </span>
                                            )}
                                        </div>
                                        <div className="p-4">
                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                <FormatoBadge formato={piece.formato} />
                                                <span className="text-xs text-gray-400">{formatFecha(piece.fecha)}</span>
                                            </div>
                                            <p className="text-sm font-bold text-gray-900 leading-snug line-clamp-2 mb-2">{piece.topico_angulo || 'Pieza sin tópico'}</p>
                                            <PilarBadge pilar={piece.pilar} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {selected && <PieceDetailModal piece={selected} onClose={() => setSelected(null)} />}
        </div>
    );
};

interface FilterOption { value: string; label: string; icon?: React.ElementType; dot?: string }

const FilterGroup: React.FC<{ label: string; options: FilterOption[]; value: string | null; onChange: (v: string | null) => void }> = ({ label, options, value, onChange }) => (
    <div className="inline-flex max-w-full overflow-x-auto items-center gap-1 bg-white border border-gray-200 rounded-xl p-1" role="group" aria-label={label}>
        <button
            onClick={() => onChange(null)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${value === null ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
        >
            Todos
        </button>
        {options.map((opt) => {
            const Icon = opt.icon;
            const active = value === opt.value;
            return (
                <button
                    key={opt.value}
                    onClick={() => onChange(active ? null : opt.value)}
                    aria-pressed={active}
                    className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 ${active ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    {Icon && <Icon size={13} />}
                    {opt.dot && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.dot }} />}
                    {opt.label}
                </button>
            );
        })}
    </div>
);

const EmptyGallery: React.FC<{ filtered: boolean }> = ({ filtered }) => (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
            <Images size={26} className="text-gray-300" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">{filtered ? 'Ninguna pieza con estos filtros' : 'Todavía no hay piezas este mes'}</h3>
        <p className="text-sm text-gray-500 max-w-sm">
            {filtered ? 'Prueba quitando un filtro.' : 'Cuando el equipo de Pixely arme el cronograma del mes, las piezas aparecerán aquí a medida que se produzcan.'}
        </p>
    </div>
);

export default RepositorioView;
