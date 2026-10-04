/**
 * PublicacionesView - Fase 7 (reemplaza a Publicación y Repositorio)
 *
 * Lo que el cliente ya aprobó, en dos momentos:
 * - Próximas: la agenda de lo que va a salir (día, hora y redes). Solo lectura; la
 *   programación en Metricool la hace el equipo con /05_publicar.
 * - Publicadas: el archivo mes a mes, con los resultados de cada pieza y la comparación
 *   con la competencia (Metricool, traídos por /05_publicar en modo resultados).
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Archive, CalendarClock, ExternalLink, Users, Eye, Heart, UserPlus } from 'lucide-react';
import { WorkflowStepper } from './WorkflowStepper';
import { AnimatedHeaderCard } from './AnimatedHeaderCard';
import { useAuth } from '../contexts/AuthContext';
import { useContentPieces } from '../hooks/useContentPieces';
import * as api from '../services/api';
import {
    FormatoBadge, PieceCover, MonthSwitcher, NoClientSelected, LoadingBlock, PieceDetailModal, OtherStations,
    pieceStage, pieceNetworks, currentMonth, monthLabel, formatFecha, safeUrl,
} from './content/ContentPieceUI';

type Tab = 'proximas' | 'publicadas';

const OWN = '#D90B66';          // the brand's own bar
const RIVAL = '#c3c2b7';        // competitors, neutral
const ABOVE = '#006300';
const nf = new Intl.NumberFormat('es-PE', { notation: 'compact', maximumFractionDigits: 1 });
const fmt = (n: number | null | undefined) => (n == null ? '—' : nf.format(n));

/** Likes + comments: the only interactions Metricool also gives for competitors, so the comparison is fair. */
const visible = (m: api.PieceMetric) => (m.likes ?? 0) + (m.comentarios ?? 0);

export const PublicacionesView: React.FC<{ onNavigate?: (view: string) => void; clientId?: string; initialTab?: Tab }> = ({ onNavigate, clientId: clientIdProp, initialTab = 'proximas' }) => {
    const { user } = useAuth();
    const clientId = clientIdProp || user?.fichaClienteId;
    const isTeam = !!user?.isAdmin;
    const [tab, setTab] = useState<Tab>(initialTab);
    const [month, setMonth] = useState(currentMonth);
    const [selected, setSelected] = useState<api.ContentPiece | null>(null);
    const { pieces, loading, error, replacePiece } = useContentPieces(clientId);
    const [results, setResults] = useState<{ metrics: api.PieceMetric[]; competitors: api.CompetitorBenchmark[] }>({ metrics: [], competitors: [] });

    useEffect(() => {
        if (!clientId) return;
        let cancelled = false;
        api.getResults(clientId, month)
            .then((r) => { if (!cancelled) setResults(r); })
            .catch(() => { if (!cancelled) setResults({ metrics: [], competitors: [] }); });
        return () => { cancelled = true; };
    }, [clientId, month]);

    const upcoming = useMemo(
        () => pieces.filter((p) => { const s = pieceStage(p); return s === 'programada' || s === 'aprobada'; })
            .sort((a, b) => (a.publicada_at ?? a.fecha).localeCompare(b.publicada_at ?? b.fecha)),
        [pieces],
    );
    const published = useMemo(
        () => pieces.filter((p) => pieceStage(p) === 'publicada' && p.fecha.startsWith(month)).sort((a, b) => b.fecha.localeCompare(a.fecha)),
        [pieces, month],
    );
    const metricsByPiece = useMemo(() => {
        const map = new Map<string, api.PieceMetric[]>();
        results.metrics.forEach((m) => map.set(m.piece_id, [...(map.get(m.piece_id) ?? []), m]));
        return map;
    }, [results.metrics]);

    const selectedMetrics = selected ? metricsByPiece.get(selected.id) ?? [] : [];

    // Until it is scheduled, an approved piece can still be sent back (it returns to Validación).
    const handleReview = async (estado: 'Aprobado' | 'Cambios solicitados', comentario?: string, cambioTipo?: api.CambioTipo) => {
        if (!clientId || !selected) return;
        replacePiece(await api.reviewContentPiece(clientId, selected.id, estado, comentario, cambioTipo));
    };

    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar animate-fade-in-up bg-brand-bg">
            <div className="max-w-7xl mx-auto">
                {onNavigate && <WorkflowStepper currentStep={3} onNavigate={onNavigate} />}
                <AnimatedHeaderCard supertitle="Contenido" title="Publicaciones" subtitle="Qué sale y cuándo, y cómo le fue a lo que ya salió." />

                {!clientId ? <NoClientSelected /> : (
                    <>
                        <div className="flex flex-wrap items-center gap-3 mb-6">
                            <div className="inline-flex gap-1 bg-white border border-gray-200 rounded-xl p-1" role="tablist">
                                {([['proximas', `Próximas (${upcoming.length})`], ['publicadas', 'Publicadas']] as [Tab, string][]).map(([key, label]) => (
                                    <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${tab === key ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                            {tab === 'publicadas' && <MonthSwitcher month={month} onChange={setMonth} />}
                        </div>

                        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

                        {loading && pieces.length === 0 ? <LoadingBlock /> : tab === 'proximas' ? (
                            <Upcoming pieces={upcoming} isTeam={isTeam} onOpen={setSelected} />
                        ) : (
                            <Published month={month} pieces={published} metricsByPiece={metricsByPiece} competitors={results.competitors} onOpen={setSelected} />
                        )}

                        <OtherStations pieces={pieces} current="publicacion" onNavigate={onNavigate} />
                    </>
                )}
            </div>

            {selected && (
                <PieceDetailModal piece={selected} onClose={() => setSelected(null)} onReview={pieceStage(selected) === 'aprobada' ? handleReview : undefined}>
                    {pieceStage(selected) === 'publicada' && <PieceResults metrics={selectedMetrics} competitors={results.competitors} />}
                </PieceDetailModal>
            )}
        </div>
    );
};

// --- Próximas: the agenda ---

const when = (p: api.ContentPiece) => {
    const date = formatFecha(p.fecha, { weekday: 'long', day: 'numeric', month: 'long' });
    if (!p.publicada_at) return { date, time: null };
    const time = new Date(p.publicada_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' });
    return { date, time };
};

const Upcoming: React.FC<{ pieces: api.ContentPiece[]; isTeam: boolean; onOpen: (p: api.ContentPiece) => void }> = ({ pieces, isTeam, onOpen }) => {
    if (pieces.length === 0) {
        return (
            <Empty icon={CalendarClock} title="No hay publicaciones en agenda" text="Cuando apruebes piezas en Validación, aparecerán aquí con el día y la hora en que salen." />
        );
    }
    const pending = pieces.filter((p) => pieceStage(p) === 'aprobada').length;
    return (
        <section aria-label="Próximas publicaciones">
            {isTeam && pending > 0 && (
                <p className="mb-4 rounded-2xl border border-dashed border-gray-300 bg-white/60 px-4 py-3 text-sm text-gray-700">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary-600 mr-2">Solo equipo</span>
                    {pending} {pending === 1 ? 'pieza aprobada espera' : 'piezas aprobadas esperan'} ser programadas en Metricool con /05_publicar.
                </p>
            )}
            <ul className="bg-white rounded-3xl border border-gray-100 shadow-sm divide-y divide-gray-100 overflow-hidden">
                {pieces.map((p) => {
                    const { date, time } = when(p);
                    const networks = pieceNetworks(p);
                    return (
                        <li key={p.id}>
                            <button onClick={() => onOpen(p)} className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors grid grid-cols-[56px_1fr] md:grid-cols-[56px_1fr_auto] items-center gap-x-4 gap-y-2">
                                <PieceCover piece={p} className="w-14 aspect-[4/5] rounded-xl overflow-hidden" compact />
                                <span className="min-w-0">
                                    <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400">{date}{time ? ` · ${time}` : ''}</span>
                                    <span className="block text-sm font-bold text-gray-900 leading-snug line-clamp-2 mt-0.5">{p.topico_angulo || 'Pieza sin tópico'}</span>
                                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                        <FormatoBadge formato={p.formato} />
                                        {networks.length > 0 && <span className="text-xs text-gray-500">{networks.join(' · ')}</span>}
                                    </span>
                                </span>
                                <span className="col-start-2 md:col-start-auto text-xs font-semibold text-gray-600">
                                    {pieceStage(p) === 'programada' ? <span className="inline-flex items-center gap-1.5"><CalendarClock size={14} className="text-gray-400" /> Programada</span> : 'Hora por confirmar'}
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
};

// --- Publicadas: archive + results ---

function competitorAverage(competitors: api.CompetitorBenchmark[], red: string): number | null {
    const values = competitors.filter((c) => c.red === red && c.interacciones_prom != null).map((c) => Number(c.interacciones_prom));
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

const Published: React.FC<{
    month: string;
    pieces: api.ContentPiece[];
    metricsByPiece: Map<string, api.PieceMetric[]>;
    competitors: api.CompetitorBenchmark[];
    onOpen: (p: api.ContentPiece) => void;
}> = ({ month, pieces, metricsByPiece, competitors, onOpen }) => {
    if (pieces.length === 0) {
        return <Empty icon={Archive} title={`Nada publicado en ${monthLabel(month).toLowerCase()}`} text="Cada pieza llega aquí el día en que se publica, con sus resultados." />;
    }
    const all = pieces.flatMap((p) => metricsByPiece.get(p.id) ?? []);
    const sum = (k: keyof api.PieceMetric) => all.reduce((s, m) => s + (Number(m[k]) || 0), 0);
    const measured = pieces.filter((p) => metricsByPiece.has(p.id)).length;
    const igOwn = all.filter((m) => m.red === 'instagram');
    const ownAvg = igOwn.length ? igOwn.reduce((s, m) => s + visible(m), 0) / igOwn.length : null;

    return (
        <div className="space-y-6">
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Resumen del mes">
                <Kpi label="Piezas publicadas" value={String(pieces.length)} note={measured < pieces.length ? `${measured} con resultados` : undefined} />
                <Kpi label="Alcance total" value={fmt(sum('alcance'))} icon={Eye} note="personas que vieron tus piezas" />
                <Kpi label="Interacciones" value={fmt(sum('interacciones'))} icon={Heart} note="likes, comentarios, guardados y compartidos" />
                <Kpi label="Nuevos seguidores" value={fmt(sum('nuevos_seguidores'))} icon={UserPlus} note="que llegaron por estas piezas" />
            </section>

            <CompetitorComparison ownAvg={ownAvg} competitors={competitors.filter((c) => c.red === 'instagram')} />

            <section aria-label="Piezas publicadas">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Cada publicación</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {pieces.map((p) => {
                        const ms = metricsByPiece.get(p.id) ?? [];
                        const total = (k: keyof api.PieceMetric) => ms.length ? ms.reduce((s, m) => s + (Number(m[k]) || 0), 0) : null;
                        const ig = ms.find((m) => m.red === 'instagram');
                        const avg = competitorAverage(competitors, 'instagram');
                        return (
                            <button key={p.id} onClick={() => onOpen(p)} className="flex text-left bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-lg transition-shadow overflow-hidden">
                                <PieceCover piece={p} className="w-28 shrink-0 aspect-[4/5]" compact />
                                <span className="p-4 min-w-0 flex flex-col gap-2">
                                    <span className="text-xs text-gray-400">{formatFecha(p.fecha, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                                    <span className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">{p.topico_angulo || 'Pieza sin tópico'}</span>
                                    {ms.length === 0 ? (
                                        <span className="text-xs text-gray-400 mt-auto">Resultados en camino</span>
                                    ) : (
                                        <span className="mt-auto space-y-1.5">
                                            <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
                                                <span><strong className="text-gray-900">{fmt(total('alcance'))}</strong> alcance</span>
                                                <span><strong className="text-gray-900">{fmt(total('interacciones'))}</strong> interacciones</span>
                                                <span><strong className="text-gray-900">{fmt(total('nuevos_seguidores'))}</strong> seguidores</span>
                                            </span>
                                            {ig && avg != null && <VsCompetition own={visible(ig)} avg={avg} />}
                                        </span>
                                    )}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </section>
        </div>
    );
};

const VsCompetition: React.FC<{ own: number; avg: number }> = ({ own, avg }) => {
    const ratio = avg > 0 ? own / avg : 0;
    const above = ratio >= 1;
    const label = above ? `${ratio >= 1.95 ? `${ratio.toFixed(1)}×` : `+${Math.round((ratio - 1) * 100)}%`} sobre la competencia` : `${Math.round((1 - ratio) * 100)}% bajo la competencia`;
    return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: above ? ABOVE : '#52514e' }}>
            <span aria-hidden>{above ? '▲' : '▼'}</span>{label}
        </span>
    );
};

const CompetitorComparison: React.FC<{ ownAvg: number | null; competitors: api.CompetitorBenchmark[] }> = ({ ownAvg, competitors }) => {
    if (competitors.length === 0) {
        return (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 text-sm text-gray-500">
                <p className="font-bold text-gray-900 mb-1">Frente a tu competencia</p>
                Aún no hay datos de tu competencia para comparar. Los trae la vigilancia de mercado desde Metricool.
            </div>
        );
    }
    const rows = [
        ...(ownAvg != null ? [{ key: 'own', label: 'Tú', value: ownAvg, own: true }] : []),
        ...competitors.filter((c) => c.interacciones_prom != null).map((c) => ({ key: c.competidor, label: `@${c.competidor}`, value: Number(c.interacciones_prom), own: false })),
    ].sort((a, b) => b.value - a.value);
    const max = Math.max(1, ...rows.map((r) => r.value));
    const mes = competitors[0]?.mes;
    return (
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6" aria-label="Frente a tu competencia">
            <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Frente a tu competencia</h2>
                    <p className="text-sm text-gray-500">Likes + comentarios por publicación en Instagram, en promedio. Es la misma medida que Metricool da de tus competidores.</p>
                </div>
                {mes && <span className="text-xs text-gray-400 inline-flex items-center gap-1"><Users size={13} /> Competencia de {monthLabel(mes).toLowerCase()}</span>}
            </div>
            <ul className="space-y-2.5">
                {rows.map((r) => (
                    <li key={r.key} className="grid grid-cols-[120px_1fr_48px] items-center gap-3" title={`${r.label}: ${Math.round(r.value)} por publicación`}>
                        <span className={`text-sm truncate ${r.own ? 'font-bold text-gray-900' : 'text-gray-600'}`}>{r.label}</span>
                        <span className="h-3 rounded-r bg-gray-100 overflow-hidden">
                            <span className="block h-full rounded-r" style={{ width: `${(r.value / max) * 100}%`, backgroundColor: r.own ? OWN : RIVAL }} />
                        </span>
                        <span className={`text-sm tabular-nums text-right ${r.own ? 'font-bold text-gray-900' : 'text-gray-600'}`}>{Math.round(r.value)}</span>
                    </li>
                ))}
            </ul>
            {ownAvg == null && <p className="mt-3 text-xs text-gray-500">Tus resultados de Instagram de este mes todavía no llegan.</p>}
        </section>
    );
};

// --- In the piece modal ---

const RED_LABEL: Record<string, string> = { instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn', tiktok: 'TikTok', pinterest: 'Pinterest', gbp: 'Google Business', youtube: 'YouTube', x: 'X' };

const PieceResults: React.FC<{ metrics: api.PieceMetric[]; competitors: api.CompetitorBenchmark[] }> = ({ metrics, competitors }) => (
    <div className="p-6 border-b border-gray-100">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Cómo le fue</p>
        {metrics.length === 0 ? (
            <p className="text-sm text-gray-500">Los resultados de esta pieza aún no llegan. Se actualizan unos días después de publicada.</p>
        ) : (
            <div className="space-y-4">
                {metrics.map((m) => {
                    const avg = m.red === 'instagram' ? competitorAverage(competitors, 'instagram') : null;
                    const url = safeUrl(m.post_url);
                    return (
                        <div key={m.red}>
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="text-sm font-bold text-gray-900">{RED_LABEL[m.red] ?? m.red}</span>
                                {url && <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900"><ExternalLink size={12} /> Ver publicación</a>}
                            </div>
                            <dl className="grid grid-cols-3 gap-3">
                                {([['Alcance', m.alcance], ['Vistas', m.vistas], ['Interacciones', m.interacciones], ['Guardados', m.guardados], ['Compartidos', m.compartidos], ['Nuevos seguidores', m.nuevos_seguidores]] as [string, number | null][]).map(([label, v]) => (
                                    <div key={label} className="rounded-xl bg-gray-50 px-3 py-2">
                                        <dt className="text-[11px] text-gray-500">{label}</dt>
                                        <dd className="text-base font-bold text-gray-900 tabular-nums">{fmt(v)}</dd>
                                    </div>
                                ))}
                            </dl>
                            {avg != null && (
                                <p className="mt-2 text-xs text-gray-600">
                                    {visible(m)} likes + comentarios frente a {Math.round(avg)} de promedio de tu competencia. <VsCompetition own={visible(m)} avg={avg} />
                                </p>
                            )}
                        </div>
                    );
                })}
                <p className="text-[11px] text-gray-400">Fuente: Metricool. Actualizado el {new Date(metrics[0].actualizado_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })}.</p>
            </div>
        )}
    </div>
);

// --- Small pieces ---

const Kpi: React.FC<{ label: string; value: string; note?: string; icon?: React.ElementType }> = ({ label, value, note, icon: Icon }) => (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
        <p className="text-sm text-gray-500 flex items-center gap-1.5">{Icon && <Icon size={14} className="text-gray-400" />}{label}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        {note && <p className="text-xs text-gray-400 mt-1">{note}</p>}
    </div>
);

const Empty: React.FC<{ icon: React.ElementType; title: string; text: string }> = ({ icon: Icon, title, text }) => (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4"><Icon size={26} className="text-gray-300" /></div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500 max-w-sm">{text}</p>
    </div>
);

export default PublicacionesView;
