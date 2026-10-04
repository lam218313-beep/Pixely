/**
 * Planificación: the month at a glance.
 * - Del objetivo al concepto: an icicle (objetivo → estrategia → concepto), band height = pieces.
 * - Formatos: bars. Pilares: one 100% bar. Plus the headline count.
 * A piece that combines several concepts is counted once, under its main concept, so the parts add up to the month.
 */

import React, { useMemo, useRef, useState } from 'react';
import * as api from '../../services/api';
import { FORMATO_ICON, PILAR_META } from './ContentPieceUI';
import { OTHER_COLOR, pieceConceptIds, type StrategyIndex } from './strategyLinks';

const PILARES: api.ContentPilar[] = ['Problema', 'Identidad', 'Prueba'];
const FORMATOS: api.ContentFormato[] = ['Imagen', 'Carrusel', 'Estado', 'Reel'];
const NEUTRAL_BAR = '#52514e';

const PILAR_EXPLAIN: Record<api.ContentPilar, string> = {
    Problema: 'habla de un dolor o una fricción del cliente',
    Identidad: 'muestra quiénes somos y conecta',
    Prueba: 'demuestra con resultados, testimonios o cifras',
};

interface Band { key: string; label: string; n: number; color: string; principal?: boolean }
interface ObjectiveBand extends Band { strategies: (Band & { concepts: Band[] })[] }

interface Breakdown {
    tree: ObjectiveBand[];
    idle: string[];       // concepts of the strategy with no piece this month
    combined: number;     // pieces combining more than one concept
}

function breakdown(pieces: api.ContentPiece[], index: StrategyIndex | null): Breakdown {
    const tree = new Map<string, ObjectiveBand>();
    const order = (index?.objectives ?? []).map((o) => o.id);
    let combined = 0;
    const used = new Set<string>();

    pieces.forEach((p) => {
        const ids = pieceConceptIds(p);
        if (ids.length > 1) combined += 1;
        const concept = ids[0] ? index?.concepts.get(ids[0]) : undefined;
        const strategy = concept ? index!.strategies.get(concept.strategyId) : undefined;
        const objective = strategy ? index!.objectiveById.get(strategy.objectiveId) : undefined;

        const oKey = objective?.id ?? `txt:${p.objetivo ?? ''}`;
        const o = tree.get(oKey) ?? {
            key: oKey,
            label: objective?.label ?? (p.objetivo || 'Sin objetivo asignado'),
            color: objective?.color ?? OTHER_COLOR,
            principal: objective?.principal,
            n: 0,
            strategies: [],
        };
        o.n += 1;
        tree.set(oKey, o);

        const sKey = strategy?.id ?? `${oKey}:sin-estrategia`;
        let s = o.strategies.find((x) => x.key === sKey);
        if (!s) {
            s = { key: sKey, label: strategy?.label ?? 'Sin estrategia enlazada', color: o.color, n: 0, concepts: [] };
            o.strategies.push(s);
        }
        s.n += 1;

        const cKey = concept?.id ?? `${sKey}:${p.concepto ?? ''}`;
        let c = s.concepts.find((x) => x.key === cKey);
        if (!c) {
            c = { key: cKey, label: concept?.label ?? (p.concepto || 'Sin concepto'), color: o.color, n: 0 };
            s.concepts.push(c);
        }
        c.n += 1;
        ids.forEach((id) => used.add(id));
    });

    const rank = (k: string) => { const i = order.indexOf(k); return i === -1 ? order.length : i; };
    const sorted = [...tree.values()].sort((a, b) => rank(a.key) - rank(b.key) || b.n - a.n);
    sorted.forEach((o) => {
        o.strategies.sort((a, b) => a.key.localeCompare(b.key));
        o.strategies.forEach((s) => s.concepts.sort((a, b) => a.key.localeCompare(b.key)));
    });
    const idle = index ? [...index.concepts.values()].filter((c) => !used.has(c.id)).map((c) => c.label) : [];
    return { tree: sorted, idle, combined };
}

// --- Hover tooltip shared by the charts ---

interface Tip { x: number; y: number; title: string; detail: string }

function useTip() {
    const ref = useRef<HTMLDivElement>(null);
    const [tip, setTip] = useState<Tip | null>(null);
    const bind = (title: string, detail: string) => ({
        onMouseMove: (e: React.MouseEvent) => {
            const box = ref.current?.getBoundingClientRect();
            if (box) setTip({ x: e.clientX - box.left, y: e.clientY - box.top, title, detail });
        },
        onMouseLeave: () => setTip(null),
    });
    const node = tip && (
        <div
            className="pointer-events-none absolute z-10 max-w-[260px] rounded-xl bg-gray-900 px-3 py-2 text-xs text-white shadow-lg"
            style={{ left: tip.x, top: tip.y, transform: 'translate(-50%, calc(-100% - 12px))' }}
        >
            <p className="font-bold leading-snug">{tip.title}</p>
            <p className="text-gray-300 mt-0.5">{tip.detail}</p>
        </div>
    );
    return { ref, bind, node };
}

const pct = (n: number, total: number) => `${Math.round((n / Math.max(total, 1)) * 100)}%`;
const piezas = (n: number) => `${n} ${n === 1 ? 'pieza' : 'piezas'}`;

// --- The overview ---

export const PlanOverview: React.FC<{ pieces: api.ContentPiece[]; index: StrategyIndex | null; month: string; monthName: string }> = ({ pieces, index, monthName }) => {
    const data = useMemo(() => breakdown(pieces, index), [pieces, index]);
    const total = pieces.length;
    const main = data.tree.find((o) => o.principal);
    const research = pieces.filter((p) => p.marcador === 'I').length;

    return (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6" aria-label="El plan de un vistazo">
            <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                    <p className="text-sm text-gray-500 mb-1">Plan de {monthName}</p>
                    <p className="text-5xl font-bold text-gray-900 leading-none">
                        {total} <span className="text-lg font-semibold text-gray-400">{total === 1 ? 'pieza' : 'piezas'}</span>
                    </p>
                    <ul className="mt-4 space-y-1.5 text-sm text-gray-600">
                        {main && (
                            <li className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: main.color }} />
                                <span><strong className="text-gray-900">{main.n} de {total}</strong> van al objetivo principal</span>
                            </li>
                        )}
                        <li><strong className="text-gray-900">{research}</strong> con dato de mercado · <strong className="text-gray-900">{total - research}</strong> ideas creativas</li>
                        {data.combined > 0 && <li><strong className="text-gray-900">{data.combined}</strong> combinan más de un concepto</li>}
                    </ul>
                </div>
                <FormatChart pieces={pieces} />
                <PilarChart pieces={pieces} />
            </div>
            <div className="lg:col-span-2">
                <StrategyIcicle data={data} total={total} />
            </div>
        </section>
    );
};

// --- Del objetivo al concepto ---

const StrategyIcicle: React.FC<{ data: Breakdown; total: number }> = ({ data, total }) => {
    const { ref, bind, node } = useTip();
    const leaves = data.tree.reduce((n, o) => n + o.strategies.reduce((m, s) => m + s.concepts.length, 0), 0);
    const minHeight = Math.min(640, Math.max(300, total * 26, leaves * 34));

    const band = (b: Band, level: 0 | 1 | 2, kind: string) => (
        <div
            key={b.key}
            {...bind(b.label, `${kind} · ${piezas(b.n)} (${pct(b.n, total)} del mes)`)}
            className="relative min-h-0 overflow-hidden rounded-lg px-2.5 py-1.5 flex items-start justify-between gap-2 border-l-4 cursor-default"
            style={{ flex: `${b.n} 1 0px`, borderLeftColor: b.color, backgroundColor: `${b.color}${['40', '26', '14'][level]}` }}
        >
            <span className={`text-gray-900 leading-tight line-clamp-3 ${level === 0 ? 'text-xs font-bold' : 'text-[11px] font-semibold'}`}>
                {level === 0 && b.principal && <span className="block text-[10px] uppercase tracking-wider text-gray-600">Principal</span>}
                {b.label}
            </span>
            <span className="text-xs font-bold text-gray-900 tabular-nums shrink-0">{b.n}</span>
        </div>
    );

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 h-full flex flex-col">
            <h2 className="text-lg font-bold text-gray-900">Del objetivo al concepto</h2>
            <p className="text-sm text-gray-500 mb-4">Cómo se reparten las piezas del mes en tu estrategia. El tamaño de cada franja muestra cuántas piezas tiene.</p>

            <div className="hidden sm:grid grid-cols-3 gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                <span>Objetivo</span><span>Estrategia</span><span>Concepto</span>
            </div>
            <div ref={ref} className="relative hidden sm:grid grid-cols-3 gap-2 flex-1" style={{ minHeight }} role="img"
                aria-label={data.tree.map((o) => `${o.label}: ${piezas(o.n)}`).join('; ')}>
                <div className="flex flex-col gap-0.5 min-h-0">{data.tree.map((o) => band(o, 0, 'Objetivo'))}</div>
                <div className="flex flex-col gap-0.5 min-h-0">{data.tree.flatMap((o) => o.strategies.map((s) => band(s, 1, 'Estrategia')))}</div>
                <div className="flex flex-col gap-0.5 min-h-0">{data.tree.flatMap((o) => o.strategies.flatMap((s) => s.concepts.map((c) => band(c, 2, 'Concepto'))))}</div>
                {node}
            </div>
            <TreeList tree={data.tree} total={total} />

            <div className="mt-4 space-y-1 text-xs text-gray-500">
                {data.combined > 0 && <p>Las piezas que combinan varios conceptos se cuentan una sola vez, en su concepto principal.</p>}
                {data.idle.length > 0 && (
                    <p><span className="font-semibold text-gray-700">Sin piezas este mes:</span> {data.idle.join(', ')}.</p>
                )}
            </div>
        </div>
    );
};

/** Phones: the same tree as an indented list, each level with its own bar. */
const TreeList: React.FC<{ tree: ObjectiveBand[]; total: number }> = ({ tree, total }) => {
    const row = (b: Band, level: 0 | 1 | 2) => (
        <div className={level === 0 ? '' : level === 1 ? 'ml-3' : 'ml-6'}>
            <div className="flex items-baseline justify-between gap-3">
                <span className={`text-gray-900 leading-snug ${level === 0 ? 'text-sm font-bold' : level === 1 ? 'text-xs font-semibold' : 'text-xs text-gray-700'}`}>
                    {level === 0 && b.principal && <span className="text-[10px] uppercase tracking-wider text-gray-500 mr-1">Principal</span>}
                    {b.label}
                </span>
                <span className="text-xs font-bold text-gray-900 tabular-nums">{b.n}</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mt-1">
                <div className="h-full rounded-full" style={{ width: `${(b.n / Math.max(total, 1)) * 100}%`, backgroundColor: b.color, opacity: [1, 0.7, 0.45][level] }} />
            </div>
        </div>
    );
    return (
        <ul className="sm:hidden space-y-5">
            {tree.map((o) => (
                <li key={o.key} className="space-y-2.5">
                    {row(o, 0)}
                    {o.strategies.map((s) => (
                        <div key={s.key} className="space-y-2">
                            {row(s, 1)}
                            {s.concepts.map((c) => <React.Fragment key={c.key}>{row(c, 2)}</React.Fragment>)}
                        </div>
                    ))}
                </li>
            ))}
        </ul>
    );
};

// --- Formatos ---

const FormatChart: React.FC<{ pieces: api.ContentPiece[] }> = ({ pieces }) => {
    const { ref, bind, node } = useTip();
    const rows = FORMATOS.map((k) => ({ key: k, n: pieces.filter((p) => p.formato === k).length })).filter((r) => r.n > 0);
    const max = Math.max(1, ...rows.map((r) => r.n));
    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Por formato</h3>
            <div ref={ref} className="relative space-y-2.5">
                {rows.map(({ key, n }) => {
                    const Icon = FORMATO_ICON[key];
                    return (
                        <div key={key} {...bind(key, `${piezas(n)} (${pct(n, pieces.length)} del mes)`)} className="grid grid-cols-[88px_1fr_24px] items-center gap-3 py-0.5 cursor-default">
                            <span className="flex items-center gap-1.5 text-sm text-gray-700"><Icon size={14} className="text-gray-400" />{key}</span>
                            <span className="h-3 rounded-r bg-gray-100 overflow-hidden">
                                <span className="block h-full rounded-r" style={{ width: `${(n / max) * 100}%`, backgroundColor: NEUTRAL_BAR }} />
                            </span>
                            <span className="text-sm font-bold text-gray-900 tabular-nums text-right">{n}</span>
                        </div>
                    );
                })}
                {node}
            </div>
        </div>
    );
};

// --- Pilares ---

const PilarChart: React.FC<{ pieces: api.ContentPiece[] }> = ({ pieces }) => {
    const { ref, bind, node } = useTip();
    const rows = PILARES.map((k) => ({ key: k, n: pieces.filter((p) => p.pilar === k).length }));
    const counted = rows.reduce((s, r) => s + r.n, 0);
    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-900">Por pilar</h3>
            <p className="text-xs text-gray-500 mb-3">El tono de cada pieza, para que el mes no hable siempre de lo mismo.</p>
            <div ref={ref} className="relative">
                <div className="flex h-4 gap-0.5 rounded-md overflow-hidden" role="img" aria-label={rows.map((r) => `${r.key}: ${r.n}`).join(', ')}>
                    {rows.filter((r) => r.n > 0).map(({ key, n }) => (
                        <span key={key} {...bind(key, `${piezas(n)} (${pct(n, counted)}): ${PILAR_EXPLAIN[key]}`)}
                            className="h-full cursor-default" style={{ flex: `${n} 1 0px`, backgroundColor: PILAR_META[key].color }} />
                    ))}
                </div>
                {node}
            </div>
            <ul className="mt-3 space-y-1.5">
                {rows.map(({ key, n }) => (
                    <li key={key} className="flex items-start justify-between gap-3 text-sm">
                        <span className="flex items-start gap-2 text-gray-700 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: PILAR_META[key].color }} />
                            <span><strong className="text-gray-900 font-semibold">{key}</strong> <span className="text-gray-500 text-xs">{PILAR_EXPLAIN[key]}</span></span>
                        </span>
                        <span className="font-bold text-gray-900 tabular-nums">{n}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};
