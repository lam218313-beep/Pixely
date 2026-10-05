/**
 * MercadoView - Mercado (Tu marca)
 *
 * The intelligence board: the foundational study (01_mercado_estudio) and the
 * competitive surveillance (03_mercado_vigilancia), both run by hand from Claude
 * Desktop. It replaced the old social-media Análisis: it keeps that page's visual
 * language (question-titled cards, rings, a magenta hero, gauges, rankings) but
 * every chart is fed only by real market data — a card with no data is not shown.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceArea, ResponsiveContainer,
    AreaChart, Area,
} from 'recharts';
import {
    Radar, FileText, ExternalLink, MapPin, Zap, Map as MapIcon, Table2, Coins, Star, Trophy, Hash, ShieldCheck, Tags,
    Antenna, TrendingUp, MessageSquare, Store, Banknote, Download, Loader2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../services/api';
import { PILAR_META, NoClientSelected, LoadingBlock, safeUrl, formatFecha, parseFecha } from './content/ContentPieceUI';

// Magnitude marks share one brand hue; pilar identity uses PILAR_META; confidence is ordinal → one hue, light→dark.
const ACCENT = '#EB0C6E';
const INK_2 = '#4A4A55';
const MUTED = '#8A8A96';
const GRID = '#26262E';
const BASELINE = '#4A4A55';
const TRACK = '#26262E';
// Validated with the dataviz validator (--ordinal: monotone lightness, single hue, light end clears the surface).
const CONF_RAMP: Record<api.MarketFindingConfianza, string> = { Alta: '#6E0535', Media: '#D90B66', Baja: '#FF85C3' };
// Same rules /03_mercado_vigilancia uses to assign confidence.
const CONF_DESC: Record<api.MarketFindingConfianza, string> = {
    Alta: '3 fuentes coinciden o hay un anuncio pagado detrás',
    Media: '2 fuentes coinciden',
    Baja: '1 sola fuente: hipótesis por validar',
};
const CONF_ORDER: api.MarketFindingConfianza[] = ['Alta', 'Media', 'Baja'];
const CONFIANZA_LEVEL: Record<api.MarketFindingConfianza, number> = { Alta: 3, Media: 2, Baja: 1 };

const PILARES: api.MarketFindingCluster[] = ['Problema', 'Identidad', 'Prueba'];
const CLUSTER_DESC: Record<api.MarketFindingCluster, string> = {
    Problema: 'Fricciones y dolores del mercado',
    Identidad: 'Cómo se presentan y conectan',
    Prueba: 'Qué convence y convierte',
};

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

function initials(name: string): string {
    return name.replace(/\(.*?\)/g, '').trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
}

interface PriceRow { name: string; min: number; max: number; avg: number | null }

function priceRows(dossier: any[] | null | undefined): PriceRow[] {
    return (dossier ?? [])
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

    const [downloading, setDownloading] = useState(false);
    const [pdfError, setPdfError] = useState<string | null>(null);
    const downloadPdf = async () => {
        if (!clientId) return;
        setDownloading(true); setPdfError(null);
        try { await api.downloadMarketReport(clientId); }
        catch (e) { setPdfError(e instanceof Error ? e.message : 'No se pudo generar el PDF'); }
        finally { setDownloading(false); }
    };

    const competidores = study?.universo_competidores?.listado ?? [];
    const rated = competidores.filter((c) => typeof c.rating === 'number' && typeof c.reseñas === 'number');
    const avgRating = rated.length ? rated.reduce((s, c) => s + (c.rating as number), 0) / rated.length : null;
    const totalResenas = rated.reduce((s, c) => s + (c.reseñas as number), 0);
    const prices = useMemo(() => priceRows(study?.dossier_profundo), [study]);
    const withAvg = prices.filter((r) => r.avg !== null);
    const ticketAvg = withAvg.length ? withAvg.reduce((s, r) => s + (r.avg as number), 0) / withAvg.length : null;

    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar animate-fade-in-up bg-ink">
            <div className="max-w-7xl mx-auto">
                {!clientId ? <NoClientSelected /> : loading ? <LoadingBlock /> : !study && findings.length === 0 ? <EmptyState /> : (
                    <div className="space-y-6">
                        {/* Header */}
                        <header className="flex flex-wrap items-end justify-between gap-4 pt-14 md:pt-0">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-pink-text mb-2">Inteligencia de mercado</p>
                                <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                                    {study?.rubro ? study.rubro : 'Mercado'}
                                    {study?.ciudad && <span className="text-text-3"> en {study.ciudad}</span>}
                                </h1>
                                {study?.fecha_estudio && (
                                    <p className="mt-2 text-sm text-text-3">
                                        Estudio fundacional del {formatFecha(study.fecha_estudio, { day: 'numeric', month: 'long', year: 'numeric' })}
                                        {findings.length > 0 && ` · vigilancia actualizada el ${formatFecha(latestFecha(findings)!, { day: 'numeric', month: 'long' })}`}
                                    </p>
                                )}
                            </div>
                            <div className="flex flex-col items-start sm:items-end gap-2">
                                <div className="flex flex-wrap gap-2">
                                    <button onClick={downloadPdf} disabled={downloading} className="flex items-center gap-2 px-5 py-3 bg-raised text-white font-bold rounded-xl hover:bg-edge transition-colors disabled:opacity-60">
                                        {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />} Descargar PDF
                                    </button>
                                    {safeUrl(study?.pdf_url) && (
                                        <a href={safeUrl(study?.pdf_url)!} target="_blank" rel="noopener noreferrer" title="El informe largo del estudio fundacional"
                                            className="flex items-center gap-2 px-5 py-3 bg-card border border-edge text-white font-bold rounded-xl hover:bg-raised transition-colors">
                                            <FileText size={18} /> Estudio completo <ExternalLink size={14} />
                                        </a>
                                    )}
                                </div>
                                {pdfError && <p className="text-sm text-pink-text">{pdfError}</p>}
                            </div>
                        </header>

                        {/* Row 1: the headline numbers */}
                        {study && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <MarketSizeHero tamano={study.tamano_mercado} />
                                {avgRating !== null ? <RatingGauge rated={rated} avg={avgRating} /> : <div className="hidden lg:block" />}
                                <KpiStack
                                    competidores={study.universo_competidores?.total_relevante_filtrado ?? competidores.length}
                                    detectados={study.universo_competidores?.total_detectado_maps}
                                    resenas={totalResenas}
                                    hallazgos={findings.length}
                                    ultimo={latestFecha(findings)}
                                />
                            </div>
                        )}

                        {/* Row 2: what the market talks about, by content pillar */}
                        {findings.length > 0 && (
                            <section aria-labelledby="pilares-title">
                                <h2 id="pilares-title" className="text-lg font-bold text-white mb-1">¿De qué habla tu mercado?</h2>
                                <p className="text-sm text-text-3 mb-4">Los hallazgos de la vigilancia, repartidos entre los 3 pilares de tu contenido.</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {PILARES.map((p, i) => (
                                        <PilarRing key={p} pilar={p} items={findings.filter((f) => f.cluster === p)} total={findings.length} delay={i * 150} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Row 3: who leads + the competitive map */}
                        {rated.length >= 2 && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <CompetitorRanking rated={rated} />
                                <CompetitiveMap competidores={competidores} avgRating={avgRating} />
                            </div>
                        )}

                        {/* Row 4: prices + how solid the signals are */}
                        {(prices.length > 0 || findings.length > 0) && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {prices.length > 0 && <PriceCard rows={prices} ticketAvg={ticketAvg} />}
                                {findings.length > 0 && <ConfidenceDonut findings={findings} />}
                            </div>
                        )}

                        {/* Row 5: strongest signal, promotions, sources */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {findings.length > 0 && <StrongestSignal findings={findings} />}
                            {study && <Promotions panorama={study.panorama_producto_precio} />}
                            {findings.length > 0 && <SignalSources findings={findings} />}
                        </div>

                        {/* Row 6: only once there is a real series to draw */}
                        <SignalsTimeline findings={findings} />

                        <Surveillance findings={findings} />
                    </div>
                )}
            </div>
        </div>
    );
};

function latestFecha(findings: api.MarketFinding[]): string | null {
    return findings.reduce<string | null>((max, f) => (f.fecha && (!max || f.fecha > max) ? f.fecha : max), null);
}

// --- Card shell: the question-titled card of the old Análisis page ---

const QCard: React.FC<{ icon: React.ElementType; title: string; subtitle?: string; action?: React.ReactNode; className?: string; children: React.ReactNode }> = ({ icon: Icon, title, subtitle, action, className = '', children }) => (
    <section className={`bg-card rounded-3xl border border-edge shadow-sm p-6 flex flex-col ${className}`}>
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 mb-5">
            <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 bg-pink/15 rounded-xl text-pink-text shrink-0"><Icon size={20} /></div>
                <div>
                    <h2 className="text-lg font-bold text-white leading-tight">{title}</h2>
                    {subtitle && <p className="text-xs text-text-3 font-medium mt-0.5">{subtitle}</p>}
                </div>
            </div>
            {action}
        </div>
        {children}
    </section>
);

// --- Row 1 ---

const MarketSizeHero: React.FC<{ tamano: api.MarketStudy['tamano_mercado'] }> = ({ tamano }) => {
    const rango = (tamano as any)?.rango_estimado;
    const min = num(rango, ['min', 'minimo']);
    const max = num(rango, ['max', 'maximo']);
    const currency = typeof rango?.moneda === 'string' && /^[A-Z]{3}$/.test(rango.moneda) ? rango.moneda : 'PEN';
    const periodo = typeof rango?.periodo === 'string' ? rango.periodo : 'anual';

    return (
        <section className="relative overflow-hidden bg-pink-fill rounded-3xl p-6 shadow-xl text-white flex flex-col min-h-[260px]">
            <div className="absolute -right-20 -bottom-24 w-56 h-56 rounded-full bg-white/10 pointer-events-none" aria-hidden="true" />
            <div className="relative flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-white/20 rounded-xl border border-edge"><Coins size={20} /></div>
                <div>
                    <h2 className="text-lg font-bold leading-tight">¿Cuánto mueve tu mercado?</h2>
                    <p className="text-xs text-white/85 font-medium">Estimación {periodo}</p>
                </div>
            </div>
            {min !== null && max !== null ? (
                <p className="relative text-4xl xl:text-5xl font-bold leading-none whitespace-nowrap">{moneyRange(min, max, currency)}</p>
            ) : (
                <p className="relative text-lg font-semibold">El estudio no incluye una estimación de tamaño.</p>
            )}
            <p className="relative text-sm text-white/90 mt-3">Cruce de dos métodos: cifras oficiales del sector y negocios × ticket × pedidos.</p>
            {tamano?.cruce_de_metodos && (
                <p className="relative mt-auto pt-5 text-xs text-white/85 leading-relaxed line-clamp-4" title={tamano.cruce_de_metodos}>{tamano.cruce_de_metodos}</p>
            )}
        </section>
    );
};

/**
 * Semicircle gauge: the arc fills to the market's average rating; each outer dot is one competitor.
 * The scale starts at 3 (labeled) because Google ratings crowd the top of 1–5; it drops lower only if a competitor does.
 */
const RatingGauge: React.FC<{ rated: api.CompetitorEntry[]; avg: number }> = ({ rated, avg }) => {
    const R = 74;
    const L = Math.PI * R;
    const ratings = rated.map((c) => c.rating as number);
    const lo = Math.min(...ratings);
    const hi = Math.max(...ratings);
    const floorScale = Math.min(3, Math.floor(lo));
    const frac = (r: number) => Math.min(Math.max((r - floorScale) / (5 - floorScale), 0), 1);
    const dot = (r: number) => {
        const theta = Math.PI * (1 - frac(r));
        return { x: 100 + (R + 16) * Math.cos(theta), y: 100 - (R + 16) * Math.sin(theta) };
    };
    const arc = `M ${100 - R} 100 A ${R} ${R} 0 0 1 ${100 + R} 100`;

    return (
        <QCard icon={Star} title="¿Qué tan exigente es tu mercado?" subtitle="Rating promedio en Google Maps">
            <div className="flex-1 flex flex-col items-center justify-center">
                <svg width="236" height="136" viewBox="0 0 200 116" className="overflow-visible" role="img" aria-label={`Rating promedio ${avg.toFixed(1)} sobre una escala de ${floorScale} a 5`}>
                    <path d={arc} fill="none" stroke={TRACK} strokeWidth={14} strokeLinecap="round" />
                    <path d={arc} fill="none" stroke={ACCENT} strokeWidth={14} strokeLinecap="round" strokeDasharray={`${frac(avg) * L} ${L}`} />
                    {rated.map((c) => {
                        const p = dot(c.rating as number);
                        return (
                            <circle key={c.nombre} cx={p.x} cy={p.y} r={4} fill={INK_2} stroke="#ffffff" strokeWidth={1.5}>
                                <title>{`${c.nombre}: ★ ${c.rating}`}</title>
                            </circle>
                        );
                    })}
                    <text x={100 - R} y={116} textAnchor="middle" fill={MUTED} fontSize={11}>{floorScale}</text>
                    <text x={100 + R} y={116} textAnchor="middle" fill={MUTED} fontSize={11}>5</text>
                    <text x={100} y={88} textAnchor="middle" fill="#FFFFFF" fontSize={34} fontWeight={700}>★ {avg.toFixed(1)}</text>
                    <text x={100} y={106} textAnchor="middle" fill={MUTED} fontSize={11}>de 5</text>
                </svg>
                <p className="text-sm text-text-2 text-center mt-3">Para destacar, tu negocio necesita superar <strong className="text-white">★ {avg.toFixed(1)}</strong>.</p>
                <p className="flex items-center gap-1.5 text-xs text-text-3 mt-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: INK_2 }} /> cada punto es un competidor · de ★ {lo} a ★ {hi}
                </p>
            </div>
        </QCard>
    );
};

const KpiStack: React.FC<{ competidores: number; detectados?: number; resenas: number; hallazgos: number; ultimo: string | null }> = ({ competidores, detectados, resenas, hallazgos, ultimo }) => {
    const rows: { icon: React.ElementType; label: string; value: string; sub?: string }[] = [
        { icon: Store, label: 'Competidores directos', value: competidores.toLocaleString('es-PE'), sub: detectados ? `de ${detectados} negocios en Google Maps` : undefined },
        { icon: MessageSquare, label: 'Reseñas acumuladas', value: resenas ? resenas.toLocaleString('es-PE') : '—', sub: 'el tráfico real de tu competencia' },
        { icon: Antenna, label: 'Hallazgos de vigilancia', value: hallazgos.toLocaleString('es-PE'), sub: ultimo ? `el último del ${formatFecha(ultimo, { day: 'numeric', month: 'long' })}` : 'aún sin vigilancia' },
    ];
    return (
        <section className="bg-card rounded-3xl border border-edge shadow-sm p-6 flex flex-col justify-between gap-4">
            {rows.map(({ icon: Icon, label, value, sub }) => (
                <div key={label} className="flex items-center gap-4">
                    <div className="p-2.5 bg-pink/15 rounded-xl text-pink-text shrink-0"><Icon size={20} /></div>
                    <div className="min-w-0">
                        <p className="text-xs text-text-3">{label}</p>
                        <p className="text-2xl font-bold text-white leading-tight tabular-nums">{value}</p>
                        {sub && <p className="text-xs text-text-3 truncate">{sub}</p>}
                    </div>
                </div>
            ))}
        </section>
    );
};

// --- Row 2: one ring per content pillar ---

const PilarRing: React.FC<{ pilar: api.MarketFindingCluster; items: api.MarketFinding[]; total: number; delay: number }> = ({ pilar, items, total, delay }) => {
    const RADIUS = 46;
    const C = 2 * Math.PI * RADIUS;
    const share = total ? (items.length / total) * 100 : 0;
    const [progress, setProgress] = useState(0);
    useEffect(() => {
        const t = setTimeout(() => setProgress(share), delay + 100);
        return () => clearTimeout(t);
    }, [share, delay]);
    const color = PILAR_META[pilar].color;
    const altas = items.filter((f) => f.confianza === 'Alta').length;
    const temas = items.map((f) => f.tema).filter((t): t is string => !!t);
    const ultimo = latestFecha(items);

    return (
        <section className="bg-card rounded-3xl border border-edge shadow-sm p-6 flex flex-col">
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl shrink-0" style={{ backgroundColor: `${color}14`, color }}><Hash size={20} /></div>
                    <div>
                        <h3 className="text-lg font-bold text-white leading-tight">{pilar}</h3>
                        <p className="text-xs text-text-3 font-medium">{CLUSTER_DESC[pilar]}</p>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-6 py-2">
                <div className="relative w-28 h-28 shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" role="img" aria-label={`${Math.round(share)}% de los hallazgos`}>
                        <circle cx="50" cy="50" r={RADIUS} stroke={TRACK} strokeWidth={10} fill="none" />
                        <circle cx="50" cy="50" r={RADIUS} stroke={color} strokeWidth={10} fill="none" strokeDasharray={C} strokeDashoffset={C - (progress / 100) * C} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-white">{Math.round(share)}%</span>
                    </div>
                </div>
                <dl className="space-y-2 text-sm">
                    <div>
                        <dt className="text-[11px] font-bold uppercase tracking-wider text-text-3">Hallazgos</dt>
                        <dd className="font-semibold text-white">{items.length} de {total}</dd>
                    </div>
                    <div>
                        <dt className="text-[11px] font-bold uppercase tracking-wider text-text-3">Confianza alta</dt>
                        <dd className="font-semibold text-white">{altas}</dd>
                    </div>
                    <div>
                        <dt className="text-[11px] font-bold uppercase tracking-wider text-text-3">Más reciente</dt>
                        <dd className="font-semibold text-white">{ultimo ? formatFecha(ultimo, { day: 'numeric', month: 'short' }) : '—'}</dd>
                    </div>
                </dl>
            </div>

            <div className="mt-auto pt-4 border-t border-edge">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-text-3 mb-2"><Tags size={12} /> Temas detectados</p>
                {temas.length === 0 ? <p className="text-xs text-text-3">Sin hallazgos en este pilar todavía.</p> : (
                    <div className="flex flex-wrap gap-1.5">
                        {temas.slice(0, 4).map((t) => <span key={t} className="text-xs font-semibold bg-raised border border-edge rounded-lg px-2 py-1 text-text-2">{t}</span>)}
                        {temas.length > 4 && <span className="text-xs text-text-3 px-1 py-1">+{temas.length - 4}</span>}
                    </div>
                )}
            </div>
        </section>
    );
};

// --- Row 3 ---

const CompetitorRanking: React.FC<{ rated: api.CompetitorEntry[] }> = ({ rated }) => {
    const top = [...rated].sort((a, b) => (b.reseñas as number) - (a.reseñas as number)).slice(0, 6);
    const max = (top[0]?.reseñas as number) || 1;
    return (
        <QCard icon={Trophy} title="¿Quiénes lideran tu mercado?" subtitle="Por reseñas en Google Maps">
            <ol className="space-y-3">
                {top.map((c, i) => (
                    <li key={c.nombre} className="flex items-center gap-3" title={`${c.nombre}: ${(c.reseñas as number).toLocaleString('es-PE')} reseñas · ★ ${c.rating}`}>
                        <span className="relative w-10 h-10 shrink-0 rounded-full bg-raised text-text-2 text-xs font-bold flex items-center justify-center">
                            {initials(c.nombre)}
                            {i === 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pink-fill text-white text-[9px] flex items-center justify-center ring-2 ring-edge">1</span>}
                        </span>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-2">
                                <span className="text-sm font-bold text-white truncate">{c.nombre}</span>
                                <span className="text-xs font-semibold text-text-2 tabular-nums shrink-0">{(c.reseñas as number).toLocaleString('es-PE')}</span>
                            </div>
                            <div className="mt-1.5 h-2 rounded-full bg-raised overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${((c.reseñas as number) / max) * 100}%`, backgroundColor: ACCENT }} />
                            </div>
                            <span className="text-[11px] text-text-3">★ {c.rating}</span>
                        </div>
                    </li>
                ))}
            </ol>
            <p className="mt-auto pt-4 text-xs text-text-3">Más reseñas = más clientes reales pasando por el local.</p>
        </QCard>
    );
};

interface MapPoint { nombre: string; rating: number; resenas: number; direccion?: string; labeled: boolean; labelLeft: boolean }

const CompetitiveMap: React.FC<{ competidores: api.CompetitorEntry[]; avgRating: number | null }> = ({ competidores, avgRating }) => {
    const [view, setView] = useState<'mapa' | 'tabla'>('mapa');
    const points: MapPoint[] = useMemo(() => {
        const rated = competidores.filter((c) => typeof c.rating === 'number' && typeof c.reseñas === 'number');
        const topByReviews = new Set([...rated].sort((a, b) => (b.reseñas as number) - (a.reseñas as number)).slice(0, 3).map((c) => c.nombre));
        const xLo = Math.max(0, Math.floor((Math.min(...rated.map((c) => c.rating as number)) - 0.3) * 10) / 10);
        // names of dots past the middle of the plotted range go on their left, so they never clip at the edge
        return rated.map((c) => ({
            nombre: c.nombre, rating: c.rating as number, resenas: c.reseñas as number, direccion: c.direccion,
            labeled: topByReviews.has(c.nombre), labelLeft: ((c.rating as number) - xLo) / (5 - xLo) > 0.45,
        }));
    }, [competidores]);

    const medianReviews = points.length ? median(points.map((p) => p.resenas)) : 0;
    const minRating = points.length ? Math.min(...points.map((p) => p.rating)) : 0;
    const xMin = Math.max(0, Math.floor((minRating - 0.3) * 10) / 10);
    const maxReviews = points.length ? Math.max(...points.map((p) => p.resenas)) : 0;
    const yMax = Math.ceil((maxReviews * 1.15) / 50) * 50 || 50;

    const toggle = (
        <div className="inline-flex bg-raised rounded-lg p-0.5" role="group" aria-label="Vista">
            {([['mapa', MapIcon, 'Mapa'], ['tabla', Table2, 'Tabla']] as const).map(([key, Icon, label]) => (
                <button key={key} onClick={() => setView(key)} aria-pressed={view === key} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold ${view === key ? 'bg-card text-white shadow-sm' : 'text-text-3'}`}>
                    <Icon size={13} /> {label}
                </button>
            ))}
        </div>
    );

    return (
        <QCard icon={MapIcon} title="¿Dónde está cada competidor?" subtitle="Calidad (rating) contra tráfico (reseñas). Las líneas marcan el centro del mercado." className="lg:col-span-2" action={toggle}>
            {view === 'tabla' ? (
                <CompetitorTable competidores={competidores} />
            ) : (
                <div className="relative">
                    {/* Offsets sit just inside the plot area: chart margins + recharts' default 60px Y-axis / 30px X-axis. */}
                    <QuadrantLabel className="top-[30px] right-8 text-pink-text/70">Líderes</QuadrantLabel>
                    <QuadrantLabel className="top-[30px] left-[72px]">Mucho volumen, poca calidad</QuadrantLabel>
                    <QuadrantLabel className="bottom-[64px] right-8">Joyas por descubrir</QuadrantLabel>
                    <QuadrantLabel className="bottom-[64px] left-[72px]">Rezagados</QuadrantLabel>
                    <ResponsiveContainer width="100%" height={360}>
                        <ScatterChart margin={{ top: 24, right: 24, bottom: 28, left: 4 }}>
                            {avgRating !== null && <ReferenceArea x1={avgRating} x2={5} y1={medianReviews} y2={yMax} fill="#1F1F26" fillOpacity={1} stroke="none" />}
                            <CartesianGrid stroke={GRID} />
                            <XAxis
                                type="number" dataKey="rating" domain={[xMin, 5]} tickCount={6}
                                tick={{ fill: MUTED, fontSize: 12 }} axisLine={{ stroke: BASELINE }} tickLine={false}
                                label={{ value: 'Rating en Google Maps', position: 'insideBottom', offset: -16, fill: MUTED, fontSize: 12 }}
                            />
                            <YAxis
                                type="number" dataKey="resenas" domain={[0, yMax]}
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
        </QCard>
    );
};

const QuadrantLabel: React.FC<{ className: string; children: React.ReactNode }> = ({ className, children }) => (
    <span className={`absolute z-10 hidden sm:block text-[11px] font-bold uppercase tracking-wider text-mute pointer-events-none ${className}`}>{children}</span>
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
        <div className="bg-card rounded-xl shadow-lg border border-edge px-3 py-2">
            <p className="text-sm font-bold text-white">★ {p.rating} · {p.resenas.toLocaleString('es-PE')} reseñas</p>
            <p className="text-xs text-text-3">{p.nombre}</p>
        </div>
    );
};

const CompetitorTable: React.FC<{ competidores: api.CompetitorEntry[] }> = ({ competidores }) => (
    <div className="overflow-x-auto">
        <table className="w-full text-sm">
            <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-text-3 border-b border-edge">
                    <th className="py-2 pr-4 font-bold">Competidor</th>
                    <th className="py-2 pr-4 font-bold text-right">Rating</th>
                    <th className="py-2 pr-4 font-bold text-right">Reseñas</th>
                    <th className="py-2 pr-4 font-bold">Dirección</th>
                    <th className="py-2 font-bold sr-only">Web</th>
                </tr>
            </thead>
            <tbody className="tabular-nums">
                {[...competidores].sort((a, b) => (b.reseñas ?? 0) - (a.reseñas ?? 0)).map((c, i) => (
                    <tr key={c.place_id || i} className="border-b border-edge">
                        <td className="py-2.5 pr-4 font-semibold text-white">{c.nombre}</td>
                        <td className="py-2.5 pr-4 text-right text-text-2">{typeof c.rating === 'number' ? `★ ${c.rating}` : '—'}</td>
                        <td className="py-2.5 pr-4 text-right text-text-2">{typeof c.reseñas === 'number' ? c.reseñas.toLocaleString('es-PE') : '—'}</td>
                        <td className="py-2.5 pr-4 text-text-3">{c.direccion || '—'}</td>
                        <td className="py-2.5">
                            {safeUrl(c.website) && (
                                <a href={safeUrl(c.website)!} target="_blank" rel="noopener noreferrer" className="text-text-3 hover:text-text-2" aria-label={`Sitio web de ${c.nombre}`}>
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

// --- Row 4 ---

const PriceCard: React.FC<{ rows: PriceRow[]; ticketAvg: number | null }> = ({ rows, ticketAvg }) => {
    const lo = Math.min(...rows.map((r) => r.min));
    const hi = Math.max(...rows.map((r) => r.max));
    const span = hi - lo || 1;
    const pos = (v: number) => `${((v - lo) / span) * 100}%`;

    return (
        <QCard icon={Banknote} title="¿Cuánto cobra tu competencia?" subtitle="Rango de cada carta, del plato más barato al más caro. El punto marca su promedio." className="lg:col-span-2">
            {ticketAvg !== null && (
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-5">
                    <span className="text-5xl font-bold text-white leading-none">{money(ticketAvg)}</span>
                    <span className="text-sm text-text-3">ticket promedio del mercado · cartas de {money(lo)} a {money(hi)}</span>
                </div>
            )}
            <div className="space-y-3">
                {rows.map((r) => (
                    <div key={r.name} className="grid grid-cols-[1fr_auto] sm:grid-cols-[minmax(100px,170px)_1fr_auto] items-center gap-x-4 gap-y-1">
                        <span className="text-sm font-semibold text-white truncate" title={r.name}>{r.name}</span>
                        <div className="relative h-6 col-span-2 sm:col-span-1 order-last sm:order-none" title={`${money(r.min)} – ${money(r.max)}${r.avg !== null ? ` · promedio ${money(r.avg)}` : ''}`}>
                            <div className="absolute inset-x-0 top-1/2 h-px bg-raised" />
                            <div className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full" style={{ left: pos(r.min), width: `calc(${pos(r.max)} - ${pos(r.min)})`, backgroundColor: ACCENT }} />
                            {r.avg !== null && <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-raised ring-2 ring-edge" style={{ left: pos(r.avg) }} />}
                        </div>
                        <span className="text-sm text-text-3 tabular-nums whitespace-nowrap">{money(r.min)} – {money(r.max)}</span>
                    </div>
                ))}
            </div>
        </QCard>
    );
};

/** Ordinal shares: one hue, light→dark, a 2px surface gap between segments, legend with label + count. */
const ConfidenceDonut: React.FC<{ findings: api.MarketFinding[] }> = ({ findings }) => {
    const counts = CONF_ORDER.map((level) => ({ level, n: findings.filter((f) => f.confianza === level).length }));
    const total = counts.reduce((s, c) => s + c.n, 0);
    const R = 42;
    const C = 2 * Math.PI * R;
    const GAP = counts.filter((c) => c.n > 0).length > 1 ? 2.5 : 0;
    let offset = 0;

    return (
        <QCard icon={ShieldCheck} title="¿Qué tan sólidas son las señales?" subtitle="Cuántas fuentes respaldan cada hallazgo">
            <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-6 flex-1">
                <div className="relative w-36 h-36 shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" role="img" aria-label={counts.map((c) => `${c.level}: ${c.n}`).join(', ')}>
                        <circle cx="50" cy="50" r={R} stroke={TRACK} strokeWidth={12} fill="none" />
                        {total > 0 && counts.map(({ level, n }) => {
                            if (n === 0) return null;
                            const len = (n / total) * C;
                            const seg = (
                                <circle key={level} cx="50" cy="50" r={R} stroke={CONF_RAMP[level]} strokeWidth={12} fill="none"
                                    strokeDasharray={`${Math.max(len - GAP, 0)} ${C}`} strokeDashoffset={-offset}>
                                    <title>{`Confianza ${level.toLowerCase()}: ${n}`}</title>
                                </circle>
                            );
                            offset += len;
                            return seg;
                        })}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-white leading-none">{total}</span>
                        <span className="text-[11px] text-text-3 mt-1">hallazgos</span>
                    </div>
                </div>
                <ul className="space-y-3 w-full">
                    {counts.map(({ level, n }) => (
                        <li key={level} className="flex items-start gap-3">
                            <span className="w-3 h-3 rounded-sm mt-1 shrink-0" style={{ backgroundColor: CONF_RAMP[level] }} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline justify-between gap-2">
                                    <span className="text-sm font-bold text-white">{level}</span>
                                    <span className="text-sm font-semibold text-text-2 tabular-nums">{n} <span className="text-xs text-text-3">({total ? Math.round((n / total) * 100) : 0}%)</span></span>
                                </div>
                                <p className="text-xs text-text-3">{CONF_DESC[level]}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </QCard>
    );
};

// --- Row 5 ---

const StrongestSignal: React.FC<{ findings: api.MarketFinding[] }> = ({ findings }) => {
    const signal = findings.find((f) => f.confianza === 'Alta' && f.tipo_senal === 'Competidor-pagado')
        ?? findings.find((f) => f.confianza === 'Alta')
        ?? findings[0];
    if (!signal) return null;
    return (
        <section className="relative bg-card rounded-3xl border border-edge shadow-sm p-6 overflow-hidden">
            <span className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: ACCENT }} />
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-pink/15 rounded-xl text-pink-text shrink-0"><Zap size={20} /></div>
                <div>
                    <h2 className="text-lg font-bold text-white leading-tight">La señal más fuerte</h2>
                    <p className="text-xs text-text-3 font-medium">El hallazgo con más respaldo</p>
                </div>
            </div>
            <p className="text-lg font-bold text-white leading-snug mb-2">{signal.tema}</p>
            <p className="text-sm text-text-2 leading-relaxed">{signal.dato_o_angulo}</p>
            <div className="flex flex-wrap items-center gap-3 mt-4">
                {signal.competidor && <span className="text-xs font-semibold bg-raised rounded-lg px-2 py-1 text-text-2">{signal.competidor}</span>}
                {signal.confianza && <Confidence level={signal.confianza} />}
            </div>
        </section>
    );
};

const Promotions: React.FC<{ panorama: any }> = ({ panorama }) => {
    const raw = panorama?.promociones_tipicas_detectadas;
    const promos: string[] = Array.isArray(raw)
        ? raw.map((p: any) => (typeof p === 'string' ? p : p?.descripcion ?? p?.promocion ?? p?.nombre)).filter((p: any): p is string => typeof p === 'string')
        : [];
    if (promos.length === 0) return null;
    return (
        <QCard icon={Tags} title="¿Qué promociones ya usa tu competencia?" subtitle="Lo que el cliente del rubro ya espera — y lo que no te diferencia">
            <div className="flex flex-wrap gap-2">
                {promos.map((p) => <span key={p} className="text-sm bg-raised border border-edge rounded-xl px-3 py-2 text-text-2">{p}</span>)}
            </div>
        </QCard>
    );
};

const SignalSources: React.FC<{ findings: api.MarketFinding[] }> = ({ findings }) => {
    const groups = new Map<string, number>();
    findings.forEach((f) => groups.set(f.fuente || 'Sin fuente', (groups.get(f.fuente || 'Sin fuente') ?? 0) + 1));
    const rows = [...groups.entries()].sort((a, b) => b[1] - a[1]);
    const max = rows[0]?.[1] || 1;
    return (
        <QCard icon={Antenna} title="¿Dónde se mueve tu mercado?" subtitle="Canales donde se detectó cada hallazgo">
            <ul className="space-y-3">
                {rows.map(([fuente, n]) => (
                    <li key={fuente} title={`${fuente}: ${n} ${n === 1 ? 'hallazgo' : 'hallazgos'}`}>
                        <div className="flex items-baseline justify-between text-sm mb-1">
                            <span className="font-semibold text-white">{fuente}</span>
                            <span className="font-semibold text-text-2 tabular-nums">{n}</span>
                        </div>
                        <div className="h-2 rounded-full bg-raised overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(n / max) * 100}%`, backgroundColor: ACCENT }} />
                        </div>
                    </li>
                ))}
            </ul>
        </QCard>
    );
};

// --- Row 6: signals over time, drawn only with at least 3 weeks of surveillance ---

const SignalsTimeline: React.FC<{ findings: api.MarketFinding[] }> = ({ findings }) => {
    const weeks = useMemo(() => {
        const map = new Map<string, number>();
        findings.forEach((f) => {
            if (!f.fecha) return;
            const d = parseFecha(f.fecha);
            d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday of that week
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            map.set(key, (map.get(key) ?? 0) + 1);
        });
        return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([semana, n]) => ({ semana, n, label: formatFecha(semana, { day: 'numeric', month: 'short' }) }));
    }, [findings]);
    if (weeks.length < 3) return null;

    return (
        <QCard icon={TrendingUp} title="¿Cómo se mueve tu mercado en el tiempo?" subtitle="Hallazgos detectados por semana">
            <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={weeks} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: MUTED, fontSize: 12 }} axisLine={{ stroke: BASELINE }} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: MUTED, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ stroke: BASELINE }} formatter={(v: number) => [`${v} ${v === 1 ? 'hallazgo' : 'hallazgos'}`, 'Semana']} labelFormatter={(l: string) => `Semana del ${l}`} />
                    <Area type="monotone" dataKey="n" stroke={ACCENT} strokeWidth={2} fill={ACCENT} fillOpacity={0.12} dot={{ r: 4, fill: ACCENT, stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </AreaChart>
            </ResponsiveContainer>
        </QCard>
    );
};

// --- The evidence behind every chart ---

const Confidence: React.FC<{ level: api.MarketFindingConfianza }> = ({ level }) => (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-2" aria-label={`Confianza ${level}`}>
        <span className="flex gap-0.5" aria-hidden="true">
            {[1, 2, 3].map((i) => (
                <span key={i} className={`w-1.5 h-3 rounded-sm ${i <= CONFIANZA_LEVEL[level] ? 'bg-edge' : 'bg-edge'}`} />
            ))}
        </span>
        Confianza {level.toLowerCase()}
    </span>
);

const Surveillance: React.FC<{ findings: api.MarketFinding[] }> = ({ findings }) => {
    const unclassified = findings.filter((f) => !f.cluster);
    return (
        <section>
            <div className="flex items-center gap-2 mb-1">
                <Radar size={18} className="text-text-3" />
                <h2 className="text-lg font-bold text-white">¿Qué está pasando en tu mercado?</h2>
            </div>
            <p className="text-sm text-text-3 mb-4">Cada hallazgo de la vigilancia, con su evidencia y su fuente.</p>
            {findings.length === 0 ? (
                <div className="bg-card rounded-3xl border border-edge p-8 text-center text-sm text-text-3">Todavía no hay hallazgos de la vigilancia.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {PILARES.map((cluster) => (
                        <FindingColumn key={cluster} title={cluster} description={CLUSTER_DESC[cluster]} color={PILAR_META[cluster].color} items={findings.filter((f) => f.cluster === cluster)} />
                    ))}
                    {unclassified.length > 0 && <FindingColumn title="Sin clasificar" description="Hallazgos sin pilar asignado" color={MUTED} items={unclassified} />}
                </div>
            )}
        </section>
    );
};

const FindingColumn: React.FC<{ title: string; description: string; color: string; items: api.MarketFinding[] }> = ({ title, description, color, items }) => (
    <div className="bg-raised/70 rounded-3xl p-3">
        <div className="px-2 pt-1 pb-3">
            <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-sm font-bold text-white">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    {title}
                </span>
                <span className="text-xs font-bold text-text-3 bg-card rounded-full px-2 py-0.5">{items.length}</span>
            </div>
            <p className="text-xs text-text-3 mt-1">{description}</p>
        </div>
        <div className="space-y-3">
            {items.map((f) => (
                <article key={f.id} className="bg-card rounded-2xl border border-edge shadow-sm p-4">
                    <p className="text-sm font-bold text-white leading-snug mb-1">{f.tema}</p>
                    {f.dato_o_angulo && <p className="text-sm text-text-2 leading-relaxed">{f.dato_o_angulo}</p>}
                    {f.evidencia && <p className="text-xs text-text-3 italic mt-2 border-l-2 border-edge pl-2">“{f.evidencia}”</p>}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-3">
                        {f.confianza && <Confidence level={f.confianza} />}
                        {f.competidor && <span className="text-xs font-semibold bg-raised rounded-lg px-2 py-0.5 text-text-2">{f.competidor}</span>}
                    </div>
                    <div className="flex items-center justify-between mt-3 text-xs text-text-3">
                        <span className="inline-flex items-center gap-1">
                            {f.fuente && <MapPin size={11} />}
                            {[f.fuente, formatFecha(f.fecha)].filter(Boolean).join(' · ')}
                        </span>
                        {safeUrl(f.link) && (
                            <a href={safeUrl(f.link)!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-text-3 hover:text-white font-semibold">
                                Fuente <ExternalLink size={11} />
                            </a>
                        )}
                    </div>
                </article>
            ))}
            {items.length === 0 && <p className="px-2 py-4 text-center text-xs text-text-3">Sin hallazgos este ciclo</p>}
        </div>
    </div>
);

const EmptyState: React.FC = () => (
    <div className="bg-card rounded-3xl border border-edge shadow-sm p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-raised flex items-center justify-center mb-4">
            <Radar size={32} className="text-mute" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Tu estudio de mercado está en preparación</h3>
        <p className="text-sm text-text-3 max-w-md">
            El equipo de Pixely está mapeando tu mercado y competencia. Cuando esté listo, verás aquí cuánto mueve tu mercado, quién lo lidera, sus precios y la vigilancia de tus competidores.
        </p>
    </div>
);

export default MercadoView;
