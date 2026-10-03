/**
 * RepositorioView - Fase 8
 *
 * El archivo: solo piezas ya publicadas (programadas en Metricool cuya fecha pasó),
 * de todos los meses, agrupadas por mes. Solo lectura; cada pieza se puede abrir
 * y descargar en su versión original.
 */

import React, { useMemo, useState } from 'react';
import { Archive } from 'lucide-react';
import { WorkflowStepper } from './WorkflowStepper';
import { AnimatedHeaderCard } from './AnimatedHeaderCard';
import { useAuth } from '../contexts/AuthContext';
import { useContentPieces } from '../hooks/useContentPieces';
import * as api from '../services/api';
import {
    PILAR_META, FORMATO_ICON, PilarBadge, FormatoBadge, PieceCover, NoClientSelected, LoadingBlock,
    PieceDetailModal, OtherStations, pieceStage, monthLabel, formatFecha,
} from './content/ContentPieceUI';

const FORMATOS: api.ContentFormato[] = ['Imagen', 'Carrusel', 'Estado', 'Reel'];
const PILARES: api.ContentPilar[] = ['Problema', 'Identidad', 'Prueba'];

export const RepositorioView: React.FC<{ onNavigate?: (view: string) => void; clientId?: string }> = ({ onNavigate, clientId: clientIdProp }) => {
    const { user } = useAuth();
    const clientId = clientIdProp || user?.fichaClienteId;
    const [formato, setFormato] = useState<api.ContentFormato | null>(null);
    const [pilar, setPilar] = useState<api.ContentPilar | null>(null);
    const [selected, setSelected] = useState<api.ContentPiece | null>(null);
    // All months: the archive is the brand's whole published history.
    const { pieces, loading, error } = useContentPieces(clientId);

    const published = useMemo(() => pieces.filter((p) => pieceStage(p) === 'publicada'), [pieces]);
    const visible = useMemo(
        () => published.filter((p) => (!formato || p.formato === formato) && (!pilar || p.pilar === pilar)),
        [published, formato, pilar],
    );
    // Newest month first, newest piece first inside each month.
    const byMonth = useMemo(() => {
        const groups = new Map<string, api.ContentPiece[]>();
        [...visible].sort((a, b) => b.fecha.localeCompare(a.fecha)).forEach((p) => {
            const key = p.fecha.slice(0, 7);
            groups.set(key, [...(groups.get(key) ?? []), p]);
        });
        return [...groups.entries()];
    }, [visible]);

    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar animate-fade-in-up bg-brand-bg">
            <div className="max-w-7xl mx-auto">
                {onNavigate && <WorkflowStepper currentStep={8} onNavigate={onNavigate} />}
                <AnimatedHeaderCard supertitle="Fase 8: Archivo" title="Repositorio" subtitle="Todo lo que ya se publicó, mes a mes." />

                {!clientId ? <NoClientSelected /> : (
                    <>
                        {/* Filters: one row above everything they scope */}
                        <div className="flex flex-wrap items-center gap-3 mb-6">
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
                                <strong className="text-gray-900">{visible.length}</strong> {visible.length === 1 ? 'pieza publicada' : 'piezas publicadas'}
                            </span>
                        </div>

                        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

                        {loading && pieces.length === 0 ? <LoadingBlock /> : visible.length === 0 ? (
                            <EmptyGallery filtered={published.length > 0} />
                        ) : (
                            <div className={`space-y-10 transition-opacity ${loading ? 'opacity-50' : ''}`}>
                                {byMonth.map(([month, items]) => (
                                    <section key={month} aria-label={monthLabel(month)}>
                                        <h2 className="text-lg font-bold text-gray-900 mb-4">
                                            {monthLabel(month)} <span className="text-sm font-semibold text-gray-400">· {items.length}</span>
                                        </h2>
                                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
                                            {items.map((piece) => (
                                                <button
                                                    key={piece.id}
                                                    onClick={() => setSelected(piece)}
                                                    className="group flex flex-col text-left bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all overflow-hidden"
                                                >
                                                    <div className="relative">
                                                        <PieceCover piece={piece} className="w-full aspect-[4/5]" />
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
                                    </section>
                                ))}
                            </div>
                        )}

                        <OtherStations pieces={pieces} current="repositorio" onNavigate={onNavigate} />
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
            <Archive size={26} className="text-gray-300" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">{filtered ? 'Ninguna pieza con estos filtros' : 'Todavía no hay piezas publicadas'}</h3>
        <p className="text-sm text-gray-500 max-w-sm">
            {filtered ? 'Prueba quitando un filtro.' : 'Cada pieza llega aquí el día en que se publica. Las que están por salir viven en Publicación.'}
        </p>
    </div>
);

export default RepositorioView;
