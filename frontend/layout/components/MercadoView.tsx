/**
 * MercadoView - Fase Mercado
 *
 * Tablero del estudio fundacional (00_genesis_cliente) y de la vigilancia
 * competitiva (01_escanearmercado). Solo lectura: ambos se generan a mano desde
 * Claude Desktop (lam218313-beep/Pixely_Automatizaciones), nunca desde aquí.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { Radar, FileText, ExternalLink, MapPin, Zap, Map as MapIcon, Table2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../services/api';
import { PILAR_META, NoClientSelected, LoadingBlock, safeUrl, formatFecha } from './content/ContentPieceUI';

const ACCENT = '#D90B66';
const INK_2 = '#52514e';
const MUTED = '#898781';
const GRID = '#eeede8';
const BASELINE = '#c3c2b7';

const CLUSTER_DESC: Record<api.MarketFindingCluster, string> = {
    Problema: 'Fricciones y dolores del mercado',
    Identidad: 'Cómo se presentan y conectan',
    Prueba: 'Qué convence y convierte',
};
const CONFIANZA_LEVEL: Record<api.MarketFindingConfianza, number> = { Alta: 3, Media: 2, Baja: 1 };

// Génesis is written by an LLM-run process, so numeric fields can arrive under slightly different keys or as strings.
function num(obj: any, keys: string[]): number | null {
    for (const key of keys) {
        const v = obj?.[key];
        if (typeof v === 'number' && Number.isFinite(v)) return v;
        if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
    }
    return null;
}

function moneyFormat(currency: string, compact: boolean): Intl.NumberFormat {
    return new Intl.NumberFormat('es-PE', {
        style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: compact ? 1 : 0, notation: compact ? 'compact' : 'standard',
    });
}

function money(value: number, currency = 'PEN', compact = false): string {
    return moneyFormat(currency, compact).format(value);
}

/** "S/ 1.2–2.8 M": one currency symbol and one unit when both ends share them, so the hero fits on one line. */
function moneyRange(min: number, max: number, currency: string): string {
    const fmt = moneyFormat(currency, true) as Intl.NumberFormat & { formatRange?: (a: number, b: number) => string };
    if (typeof fmt.formatRange === 'function') return fmt.formatRange(min, max).replace(/\s*[-–]\s*/, (m) => (m.trim() === m ? '–' : ' – '));
    return `${fmt.format(min)} – ${fmt.format(max)}`;
}

function median(values: number[]): number {
    const s = [...values].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export const MercadoView: React.FC<{ onNavigate?: (view: string) => void; clientId?: string }> = ({ clientId: clientIdProp }) => {
    const { user } = useAuth();
    const clientId = clientIdProp || user?.fichaClienteId;

    const [loading, setLoading] = useState(true);
    const [study, setStudy] = useState<api.MarketStudy | null>(null);
    const [findings, setFindings] = useState<api.MarketFinding[]>([]);

    useEffect(() => {
        if (!clientId) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        Promise.all([api.getMarketStudy(clientId), api.getMarketFindings(clientId)])
            .then(([s, f]) => { if (!cancelled) { setStudy(s); setFindings(f); } })
            .catch((error) => console.error('Error loading market data:', error))
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [clientId]);

    const competidores = study?.universo_competidores?.listado ?? [];
    const rated = competidores.filter((c) => typeof c.rating === 'number' && typeof c.reseñas === 'number');
    const avgRating = rated.length ? rated.reduce((s, c) => s + (c.rating as number), 0) / rated.length : null;
    const totalResenas = rated.reduce((s, c) => s + (c.reseñas as number), 0);
    const altas = findings.filter((f) => f.confianza === 'Alta');

    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar animate-fade-in-up bg-brand-bg">
            <div className="max-w-7xl mx-auto">
                {!clientId ? <NoClientSelected /> : loading ? <LoadingBlock /> : !study && findings.length === 0 ? <EmptyState /> : (
                    <>
                        {/* Header */}
                        <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-600 mb-2">Inteligencia de mercado</p>
                                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
                                    {study?.rubro ? study.rubro : 'Mercado'}
                                    {study?.ciudad && <span className="text-gray-400"> en {study.ciudad}</span>}
                                </h1>
                                {study?.fecha_estudio && (
                                    <p className="mt-2 text-sm text-gray-500">
                                        Estudio fundacional del {formatFecha(study.fecha_estudio, { day: 'numeric', month: 'long', year: 'numeric' })}
                                        {study.version ? ` · versión ${study.version}` : ''}
                                    </p>
                                )}
                            </div>
                            {safeUrl(study?.pdf_url) && (
                                <a href={safeUrl(study?.pdf_url)!} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors">
                                    <FileText size={18} />
                                    Informe completo
                                    <ExternalLink size={14} />
                                </a>
                            )}
                        </header>

                        {/* KPI row */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <StatTile
                                label="Competidores directos"
                                value={study?.universo_competidores?.total_relevante_filtrado ?? competidores.length}
                                sub={study?.universo_competidores?.total_detectado_maps ? `de ${study.universo_competidores.total_detectado_maps} negocios en Google Maps` : undefined}
                            />
                            <StatTile label="Rating promedio" value={avgRating !== null ? `★ ${avgRating.toFixed(1)}` : '—'} sub="entre los competidores mapeados" />
                            <StatTile label="Reseñas acumuladas" value={totalResenas ? totalResenas.toLocaleString('es-PE') : '—'} sub="la tracción total del mercado" />
                            <StatTile label="Señales de confianza alta" value={altas.length} sub={`de ${findings.length} hallazgos de vigilancia`} />
                        </div>

                        {study && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                                <CompetitiveMap competidores={competidores} avgRating={avgRating} />
                                <div className="flex flex-col gap-6">
                                    <MarketSize tamano={study.tamano_mercado} />
                                    <StrongestSignal findings={findings} />
                                </div>
                            </div>
                        )}
                        {!study && <StrongestSignal findings={findings} />}

                        {study && <PriceArchitecture dossier={study.dossier_profundo} />}
                        {study && <Promotions panorama={study.panorama_producto_precio} />}

                        <Surveillance findings={findings} />
                    </>
                )}
            </div>
        </div>
    );
};

// --- Pieces of the dashboard ---

const Card: React.FC<{ title: string; subtitle?: string; className?: string; action?: React.ReactNode; children: React.ReactNode }> = ({ title, subtitle, className = '', action, children }) => (
    <section className={`bg-white rounded-3xl border border-gray-100 shadow-sm p-6 ${className}`}>
        <div className="flex items-start justify-between gap-4 mb-5">
            <div>
                <h2 className="text-lg font-bold text-gray-900">{title}</h2>
                {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
            {action}
        </div>
        {children}
    </section>
);

const StatTile: React.FC<{ label: string; value: React.ReactNode; sub?: string }> = ({ label, value, sub }) => (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
        <p className="text-sm text-gray-500 mb-1">{label}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
);

interface MapPoint { nombre: string; rating: number; resenas: number; direccion?: string; labeled: boolean; labelLeft: boolean }

const CompetitiveMap: React.FC<{ competidores: api.CompetitorEntry[]; avgRating: number | null }> = ({ competidores, avgRating }) => {
    const [view, setView] = useState<'mapa' | 'tabla'>('mapa');
    const points: MapPoint[] = useMemo(() => {
        const rated = competidores.filter((c) => typeof c.rating === 'number' && typeof c.reseñas === 'number');
        const topByReviews = new Set([...rated].sort((a, b) => (b.reseñas as number) - (a.reseñas as number)).slice(0, 3).map((c) => c.nombre));
        const lo = Math.min(...rated.map((c) => c.rating as number));
        // names of dots in the right part of the plot go on their left, so they never clip at the edge
        return rated.map((c) => ({
            nombre: c.nombre, rating: c.rating as number, resenas: c.reseñas as number, direccion: c.direccion,
            labeled: topByReviews.has(c.nombre), labelLeft: (c.rating as number) > lo + (5 - lo) * 0.6,
        }));
    }, [competidores]);

    const medianReviews = points.length ? median(points.map((p) => p.resenas)) : 0;
    const minRating = points.length ? Math.min(...points.map((p) => p.rating)) : 0;
    const xMin = Math.max(0, Math.floor((minRating - 0.3) * 10) / 10);

    const toggle = (
        <div className="inline-flex bg-gray-100 rounded-lg p-0.5" role="group" aria-label="Vista">
            {([['mapa', MapIcon, 'Mapa'], ['tabla', Table2, 'Tabla']] as const).map(([key, Icon, label]) => (
                <button key={key} onClick={() => setView(key)} aria-pressed={view === key} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold ${view === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                    <Icon size={13} /> {label}
                </button>
            ))}
        </div>
    );

    return (
        <Card
            title="Mapa competitivo"
            subtitle="Calidad percibida (rating) contra tracción (reseñas). Las líneas marcan el centro del mercado."
            className="lg:col-span-2"
            action={points.length >= 2 ? toggle : undefined}
        >
            {points.length < 2 ? (
                <p className="text-sm text-gray-500 py-8 text-center">El estudio no trae rating y reseñas suficientes para dibujar el mapa.</p>
            ) : view === 'tabla' ? (
                <CompetitorTable competidores={competidores} />
            ) : (
                <div className="relative">
                    {/* Offsets sit just inside the plot area: chart margins + recharts' default 60px Y-axis / 30px X-axis. */}
                    <QuadrantLabel className="top-[30px] right-8">Líderes</QuadrantLabel>
                    <QuadrantLabel className="top-[30px] left-[72px]">Mucho volumen, poca calidad</QuadrantLabel>
                    <QuadrantLabel className="bottom-[64px] right-8">Joyas por descubrir</QuadrantLabel>
                    <QuadrantLabel className="bottom-[64px] left-[72px]">Rezagados</QuadrantLabel>
                    <ResponsiveContainer width="100%" height={360}>
                        <ScatterChart margin={{ top: 24, right: 24, bottom: 28, left: 4 }}>
                            <CartesianGrid stroke={GRID} />
                            <XAxis
                                type="number" dataKey="rating" domain={[xMin, 5]} tickCount={6}
                                tick={{ fill: MUTED, fontSize: 12 }} axisLine={{ stroke: BASELINE }} tickLine={false}
                                label={{ value: 'Rating en Google Maps', position: 'insideBottom', offset: -16, fill: MUTED, fontSize: 12 }}
                            />
                            <YAxis
                                type="number" dataKey="resenas" domain={[0, 'auto']}
                                tick={{ fill: MUTED, fontSize: 12 }} axisLine={{ stroke: BASELINE }} tickLine={false}
                                tickFormatter={(v: number) => v.toLocaleString('es-PE')}
                                label={{ value: 'Reseñas', angle: -90, position: 'insideLeft', fill: MUTED, fontSize: 12 }}
                            />
                            {avgRating !== null && <ReferenceLine x={avgRating} stroke={BASELINE} />}
                            <ReferenceLine y={medianReviews} stroke={BASELINE} />
                            <Tooltip cursor={false} content={<MapTooltip />} />
                            <Scatter data={points} shape={<CompetitorDot />} isAnimationActive={false} />
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            )}
        </Card>
    );
};

const QuadrantLabel: React.FC<{ className: string; children: React.ReactNode }> = ({ className, children }) => (
    <span className={`absolute z-10 hidden sm:block text-[11px] font-bold uppercase tracking-wider text-gray-300 pointer-events-none ${className}`}>{children}</span>
);

const CompetitorDot: React.FC<any> = ({ cx, cy, payload }) => {
    if (cx == null || cy == null) return null;
    return (
        <g>
            <circle cx={cx} cy={cy} r={14} fill="transparent" />
            <circle cx={cx} cy={cy} r={6} fill={ACCENT} stroke="#ffffff" strokeWidth={2} />
            {payload?.labeled && (
                <text x={payload.labelLeft ? cx - 11 : cx + 11} y={cy + 4} textAnchor={payload.labelLeft ? 'end' : 'start'} fill={INK_2} fontSize={12} fontWeight={600}>{payload.nombre}</text>
            )}
        </g>
    );
};

const MapTooltip: React.FC<any> = ({ active, payload }) => {
    if (!active || !payload?.[0]) return null;
    const p: MapPoint = payload[0].payload;
    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-3 py-2">
            <p className="text-sm font-bold text-gray-900">★ {p.rating} · {p.resenas.toLocaleString('es-PE')} reseñas</p>
            <p className="text-xs text-gray-500">{p.nombre}</p>
        </div>
    );
};

const CompetitorTable: React.FC<{ competidores: api.CompetitorEntry[] }> = ({ competidores }) => (
    <div className="overflow-x-auto">
        <table className="w-full text-sm">
            <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-gray-400 border-b border-gray-100">
                    <th className="py-2 pr-4 font-bold">Competidor</th>
                    <th className="py-2 pr-4 font-bold text-right">Rating</th>
                    <th className="py-2 pr-4 font-bold text-right">Reseñas</th>
                    <th className="py-2 pr-4 font-bold">Dirección</th>
                    <th className="py-2 font-bold sr-only">Web</th>
                </tr>
            </thead>
            <tbody className="tabular-nums">
                {[...competidores].sort((a, b) => (b.reseñas ?? 0) - (a.reseñas ?? 0)).map((c, i) => (
                    <tr key={c.place_id || i} className="border-b border-gray-50">
                        <td className="py-2.5 pr-4 font-semibold text-gray-900">{c.nombre}</td>
                        <td className="py-2.5 pr-4 text-right text-gray-700">{typeof c.rating === 'number' ? `★ ${c.rating}` : '—'}</td>
                        <td className="py-2.5 pr-4 text-right text-gray-700">{typeof c.reseñas === 'number' ? c.reseñas.toLocaleString('es-PE') : '—'}</td>
                        <td className="py-2.5 pr-4 text-gray-500">{c.direccion || '—'}</td>
                        <td className="py-2.5">
                            {safeUrl(c.website) && (
                                <a href={safeUrl(c.website)!} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-700" aria-label={`Sitio web de ${c.nombre}`}>
                                    <ExternalLink size={15} />
                                </a>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const MarketSize: React.FC<{ tamano: api.MarketStudy['tamano_mercado'] }> = ({ tamano }) => {
    const rango = (tamano as any)?.rango_estimado;
    const min = num(rango, ['min', 'minimo']);
    const max = num(rango, ['max', 'maximo']);
    const currency = typeof rango?.moneda === 'string' && /^[A-Z]{3}$/.test(rango.moneda) ? rango.moneda : 'PEN';
    const periodo = typeof rango?.periodo === 'string' ? rango.periodo : 'anual';

    return (
        <Card title="Tamaño de mercado">
            {min !== null && max !== null ? (
                <>
                    <p className="text-4xl xl:text-5xl font-bold text-gray-900 leading-none whitespace-nowrap">{moneyRange(min, max, currency)}</p>
                    <p className="text-sm text-gray-500 mt-2 mb-4">Estimación {periodo}, cruzando métodos top-down y bottom-up</p>
                </>
            ) : null}
            {tamano?.cruce_de_metodos ? (
                <p className="text-sm text-gray-600 leading-relaxed">{tamano.cruce_de_metodos}</p>
            ) : min === null && (
                <p className="text-sm text-gray-400">El estudio no incluye una estimación de tamaño.</p>
            )}
        </Card>
    );
};

const StrongestSignal: React.FC<{ findings: api.MarketFinding[] }> = ({ findings }) => {
    const signal = findings.find((f) => f.confianza === 'Alta' && f.tipo_senal === 'Competidor-pagado')
        ?? findings.find((f) => f.confianza === 'Alta')
        ?? findings[0];
    if (!signal) return null;
    return (
        <section className="relative bg-white rounded-3xl border border-gray-100 shadow-sm p-6 overflow-hidden mb-6 lg:mb-0">
            <span className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: ACCENT }} />
            <div className="flex items-center gap-2 mb-3">
                <Zap size={16} style={{ color: ACCENT }} />
                <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-gray-500">Señal más fuerte</h2>
            </div>
            <p className="text-lg font-bold text-gray-900 leading-snug mb-2">{signal.tema}</p>
            <p className="text-sm text-gray-600 leading-relaxed">{signal.dato_o_angulo}</p>
            <div className="flex flex-wrap items-center gap-3 mt-4">
                {signal.competidor && <span className="text-xs font-semibold bg-gray-100 rounded-lg px-2 py-1 text-gray-700">{signal.competidor}</span>}
                {signal.confianza && <Confidence level={signal.confianza} />}
            </div>
        </section>
    );
};

interface PriceRow { name: string; min: number; max: number; avg: number | null }

const PriceArchitecture: React.FC<{ dossier: any[] | null }> = ({ dossier }) => {
    const rows: PriceRow[] = (dossier ?? [])
        .map((d) => {
            const stats = d?.estadisticas_precio;
            const min = num(stats, ['min', 'minimo', 'precio_min', 'precio_minimo']);
            const max = num(stats, ['max', 'maximo', 'precio_max', 'precio_maximo']);
            const name = d?.competidor ?? d?.nombre ?? d?.ficha_maps?.nombre;
            if (min === null || max === null || typeof name !== 'string') return null;
            return { name, min, max, avg: num(stats, ['promedio', 'media', 'avg', 'precio_promedio', 'mediana']) };
        })
        .filter((r): r is PriceRow => r !== null)
        .sort((a, b) => (a.avg ?? a.min) - (b.avg ?? b.min));
    if (rows.length === 0) return null;

    const lo = Math.min(...rows.map((r) => r.min));
    const hi = Math.max(...rows.map((r) => r.max));
    const span = hi - lo || 1;
    const pos = (v: number) => `${((v - lo) / span) * 100}%`;

    return (
        <Card title="Arquitectura de precios" subtitle="Rango de la carta de cada competidor, del plato más barato al más caro. El punto marca el precio promedio." className="mb-6">
            <div className="space-y-3">
                {rows.map((r) => (
                    <div key={r.name} className="grid grid-cols-[minmax(110px,180px)_1fr_auto] items-center gap-4">
                        <span className="text-sm font-semibold text-gray-800 truncate" title={r.name}>{r.name}</span>
                        <div className="relative h-6" title={`${money(r.min)} – ${money(r.max)}${r.avg !== null ? ` · promedio ${money(r.avg)}` : ''}`}>
                            <div className="absolute inset-x-0 top-1/2 h-px bg-gray-100" />
                            <div className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full" style={{ left: pos(r.min), width: `calc(${pos(r.max)} - ${pos(r.min)})`, backgroundColor: ACCENT }} />
                            {r.avg !== null && (
                                <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-gray-900 ring-2 ring-white" style={{ left: pos(r.avg) }} />
                            )}
                        </div>
                        <span className="text-sm text-gray-500 tabular-nums whitespace-nowrap">{money(r.min)} – {money(r.max)}</span>
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-[minmax(110px,180px)_1fr_auto] gap-4 mt-2">
                <span />
                <div className="flex justify-between text-xs text-gray-400 tabular-nums">
                    <span>{money(lo)}</span><span>{money(hi)}</span>
                </div>
                <span className="invisible text-sm whitespace-nowrap">{money(hi)} – {money(hi)}</span>
            </div>
        </Card>
    );
};

const Promotions: React.FC<{ panorama: any }> = ({ panorama }) => {
    const raw = panorama?.promociones_tipicas_detectadas;
    const promos: string[] = Array.isArray(raw)
        ? raw.map((p: any) => (typeof p === 'string' ? p : p?.descripcion ?? p?.promocion ?? p?.nombre)).filter((p: any): p is string => typeof p === 'string')
        : [];
    if (promos.length === 0) return null;
    return (
        <Card title="Promociones que ya usa la competencia" subtitle="Lo que el cliente del rubro ya espera ver — y lo que no diferencia." className="mb-6">
            <div className="flex flex-wrap gap-2">
                {promos.map((p) => (
                    <span key={p} className="text-sm bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-gray-700">{p}</span>
                ))}
            </div>
        </Card>
    );
};

const Confidence: React.FC<{ level: api.MarketFindingConfianza }> = ({ level }) => (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600" aria-label={`Confianza ${level}`}>
        <span className="flex gap-0.5" aria-hidden="true">
            {[1, 2, 3].map((i) => (
                <span key={i} className={`w-1.5 h-3 rounded-sm ${i <= CONFIANZA_LEVEL[level] ? 'bg-gray-800' : 'bg-gray-200'}`} />
            ))}
        </span>
        Confianza {level.toLowerCase()}
    </span>
);

const Surveillance: React.FC<{ findings: api.MarketFinding[] }> = ({ findings }) => {
    const clusters: api.MarketFindingCluster[] = ['Problema', 'Identidad', 'Prueba'];
    const unclassified = findings.filter((f) => !f.cluster);

    return (
        <section className="mb-6">
            <div className="flex items-center gap-2 mb-1">
                <Radar size={18} className="text-gray-400" />
                <h2 className="text-lg font-bold text-gray-900">Vigilancia competitiva</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">Lo que cambió en el mercado desde el estudio, agrupado por el pilar de contenido al que alimenta.</p>
            {findings.length === 0 ? (
                <div className="bg-white rounded-3xl border border-gray-100 p-8 text-center text-sm text-gray-500">Todavía no hay hallazgos del escaneo mensual.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {clusters.map((cluster) => (
                        <FindingColumn key={cluster} title={cluster} description={CLUSTER_DESC[cluster]} color={PILAR_META[cluster].color} items={findings.filter((f) => f.cluster === cluster)} />
                    ))}
                    {unclassified.length > 0 && <FindingColumn title="Sin clasificar" description="Hallazgos sin pilar asignado" color={MUTED} items={unclassified} />}
                </div>
            )}
        </section>
    );
};

const FindingColumn: React.FC<{ title: string; description: string; color: string; items: api.MarketFinding[] }> = ({ title, description, color, items }) => (
    <div className="bg-gray-100/70 rounded-3xl p-3">
        <div className="px-2 pt-1 pb-3">
            <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-sm font-bold text-gray-900">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    {title}
                </span>
                <span className="text-xs font-bold text-gray-500 bg-white rounded-full px-2 py-0.5">{items.length}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{description}</p>
        </div>
        <div className="space-y-3">
            {items.map((f) => (
                <article key={f.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <p className="text-sm font-bold text-gray-900 leading-snug mb-1">{f.tema}</p>
                    {f.dato_o_angulo && <p className="text-sm text-gray-600 leading-relaxed">{f.dato_o_angulo}</p>}
                    {f.evidencia && <p className="text-xs text-gray-500 italic mt-2 border-l-2 border-gray-200 pl-2">“{f.evidencia}”</p>}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-3">
                        {f.confianza && <Confidence level={f.confianza} />}
                        {f.competidor && <span className="text-xs font-semibold bg-gray-100 rounded-lg px-2 py-0.5 text-gray-700">{f.competidor}</span>}
                    </div>
                    <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                        <span className="inline-flex items-center gap-1">
                            {f.fuente && <MapPin size={11} />}
                            {[f.fuente, formatFecha(f.fecha)].filter(Boolean).join(' · ')}
                        </span>
                        {safeUrl(f.link) && (
                            <a href={safeUrl(f.link)!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-800 font-semibold">
                                Fuente <ExternalLink size={11} />
                            </a>
                        )}
                    </div>
                </article>
            ))}
            {items.length === 0 && <p className="px-2 py-4 text-center text-xs text-gray-400">Sin hallazgos este ciclo</p>}
        </div>
    </div>
);

const EmptyState: React.FC = () => (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
            <Radar size={32} className="text-gray-300" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Tu estudio de mercado está en preparación</h3>
        <p className="text-sm text-gray-500 max-w-md">
            El equipo de Pixely está mapeando tu mercado y competencia. Cuando esté listo, verás aquí el mapa competitivo, los precios y la vigilancia de tus competidores.
        </p>
    </div>
);

export default MercadoView;
