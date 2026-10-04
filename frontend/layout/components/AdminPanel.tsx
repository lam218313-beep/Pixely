/**
 * Panel del equipo
 * ================
 * - Hoy: every brand on one board — where it stands (Ficha, Mercado, Voz, Estrategia),
 *   how its content line is going, and what the team (or the client) has to do next,
 *   with the Claude Desktop recipe to run. Computed by GET /api/admin/overview.
 * - Marca: the same pages the client sees, in the same order, plus a summary with its
 *   users. Admin logins carry no client_id, so each page gets the brand explicitly.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    Plus, Users, ChevronRight, X, Loader2, ArrowLeft, Check, Copy, Eye, MessageSquareWarning, Circle,
    ClipboardList, Palette, Radar, LayoutGrid, CalendarRange, CheckCircle2, Send, LayoutDashboard, RefreshCw, UserRound,
} from 'lucide-react';
import * as api from '../services/api';
import { InterviewView } from './InterviewView';
import { BrandView } from './BrandView';
import { MercadoView } from './MercadoView';
import { StrategyView } from './StrategyView';
import { PlanificacionView } from './PlanificacionView';
import { ValidacionView } from './ValidacionView';
import { PublicacionesView } from './PublicacionesView';
import { monthLabel } from './content/ContentPieceUI';

// --- Brand pages, in the client's menu order ---

type Tab = 'resumen' | api.AdminDestino;

const PAGES: { key: api.AdminDestino; label: string; icon: React.ElementType; group: string; Component: React.FC<{ clientId?: string; onNavigate?: (v: string) => void }> }[] = [
    { key: 'ficha', label: 'Ficha', icon: ClipboardList, group: 'Su marca', Component: InterviewView },
    { key: 'voz', label: 'Voz de marca', icon: Palette, group: 'Su marca', Component: BrandView },
    { key: 'mercado', label: 'Mercado', icon: Radar, group: 'Su marca', Component: MercadoView },
    { key: 'estrategia', label: 'Estrategia', icon: LayoutGrid, group: 'Su marca', Component: StrategyView },
    { key: 'planificacion', label: 'Planificación', icon: CalendarRange, group: 'Contenido', Component: PlanificacionView },
    { key: 'validacion', label: 'Validación', icon: CheckCircle2, group: 'Contenido', Component: ValidacionView },
    { key: 'publicaciones', label: 'Publicaciones', icon: Send, group: 'Contenido', Component: PublicacionesView },
];

// The client pages navigate with the app's view ids; inside a brand they switch tabs instead.
const VIEW_TO_TAB: Record<string, api.AdminDestino> = {
    interview: 'ficha', brand: 'voz', mercado: 'mercado', strategy: 'estrategia',
    work: 'planificacion', validacion: 'validacion', publicacion: 'publicaciones', repositorio: 'publicaciones',
};

// Status colors, always shown with an icon and a word.
const PASO_META: Record<api.PasoEstado, { color: string; icon: React.ElementType; label: string }> = {
    listo: { color: '#0ca30c', icon: Check, label: 'Listo' },
    cliente: { color: '#fab219', icon: Eye, label: 'Por aprobar' },
    cambios: { color: '#ec835a', icon: MessageSquareWarning, label: 'Cambios pedidos' },
    falta: { color: '#898781', icon: Circle, label: 'Falta' },
};
const PASOS: { key: keyof api.AdminMarca['pasos']; label: string; destino: api.AdminDestino }[] = [
    { key: 'ficha', label: 'Ficha', destino: 'ficha' },
    { key: 'mercado', label: 'Mercado', destino: 'mercado' },
    { key: 'voz', label: 'Voz', destino: 'voz' },
    { key: 'estrategia', label: 'Estrategia', destino: 'estrategia' },
];
const pasoLabel = (key: string, estado: api.PasoEstado) => (key === 'mercado' && estado === 'cambios' ? 'Desactualizado' : PASO_META[estado].label);

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${api.API_BASE_URL}${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', ...api.getAuthHeaders(), ...(init?.headers ?? {}) },
    });
    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail || `Error ${response.status}`);
    }
    return response.json();
}

// =============================================================================
// MAIN
// =============================================================================

export const AdminPanel: React.FC<{ onNavigate?: (view: string) => void }> = () => {
    const [data, setData] = useState<{ hoy: string; marcas: api.AdminMarca[] } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState<{ id: string; tab: Tab } | null>(null);
    const [creating, setCreating] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try { setData(await api.getAdminOverview()); }
        catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cargar el tablero'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const marca = open && data?.marcas.find((m) => m.id === open.id);
    if (open && marca) {
        return <BrandDetail marca={marca} tab={open.tab} onTab={(tab) => setOpen({ id: marca.id, tab })} onBack={() => { setOpen(null); load(); }} />;
    }

    const marcas = data?.marcas ?? [];
    const equipo = marcas.reduce((n, m) => n + m.acciones.filter((a) => a.quien === 'equipo').length, 0);
    const cliente = marcas.reduce((n, m) => n + m.acciones.filter((a) => a.quien === 'cliente').length, 0);

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8 bg-brand-bg">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-primary-600">Panel del equipo</p>
                        <h1 className="text-3xl font-black text-gray-900">Hoy</h1>
                        <p className="text-gray-500 mt-1">Qué toca hacer en cada marca y qué receta correr.</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={load} disabled={loading} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Actualizar
                        </button>
                        <button onClick={() => setCreating(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-bold shadow-lg shadow-pink-500/20">
                            <Plus size={16} /> Nueva marca
                        </button>
                    </div>
                </div>

                {error && <p className="mb-4 rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{error}</p>}

                {loading && !data ? (
                    <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-gray-300" size={36} /></div>
                ) : (
                    <>
                        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6" aria-label="Resumen">
                            <Stat label="Tareas del equipo" value={equipo} note="recetas por correr o piezas por subir" strong />
                            <Stat label="Esperando al cliente" value={cliente} note="aprobaciones pendientes en Partners" />
                            <Stat label="Marcas" value={marcas.length} note={data ? `al ${new Date(`${data.hoy}T12:00:00`).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })}` : ''} />
                        </section>

                        {marcas.length === 0 ? (
                            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center text-gray-500">Aún no hay marcas. Crea la primera.</div>
                        ) : (
                            <div className="space-y-4">
                                {marcas.map((m) => <BrandRow key={m.id} marca={m} onOpen={(tab) => setOpen({ id: m.id, tab })} />)}
                            </div>
                        )}
                    </>
                )}
            </div>

            {creating && <CreateBrandModal onClose={() => setCreating(false)} onCreated={() => { setCreating(false); load(); }} />}
        </div>
    );
};

const Stat: React.FC<{ label: string; value: number; note: string; strong?: boolean }> = ({ label, value, note, strong }) => (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
        <p className="text-sm text-gray-500">{label}</p>
        <p className={`text-4xl font-bold mt-1 ${strong ? 'text-gray-900' : 'text-gray-700'}`}>{value}</p>
        <p className="text-xs text-gray-400 mt-1">{note}</p>
    </div>
);

// --- One brand on the board ---

const PasoChip: React.FC<{ label: string; pasoKey: string; estado: api.PasoEstado; onClick: () => void }> = ({ label, pasoKey, estado, onClick }) => {
    const meta = PASO_META[estado];
    const Icon = meta.icon;
    return (
        <button onClick={onClick} title={`${label}: ${pasoLabel(pasoKey, estado)}`}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-gray-800 hover:ring-1 hover:ring-gray-300"
            style={{ background: `${meta.color}1F` }}>
            <Icon size={12} style={{ color: meta.color }} strokeWidth={2.5} />
            {label}: <span className="font-normal text-gray-600">{pasoLabel(pasoKey, estado)}</span>
        </button>
    );
};

const BrandRow: React.FC<{ marca: api.AdminMarca; onOpen: (tab: Tab) => void }> = ({ marca, onOpen }) => {
    const team = marca.acciones.filter((a) => a.quien === 'equipo');
    const client = marca.acciones.filter((a) => a.quien === 'cliente');
    const c = marca.contenido;
    return (
        <article className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <button onClick={() => onOpen('resumen')} className="flex items-center gap-3 text-left group">
                    <span className="w-11 h-11 rounded-2xl bg-gray-900 text-white flex items-center justify-center text-lg font-bold">{marca.nombre.charAt(0).toUpperCase()}</span>
                    <span>
                        <span className="block text-lg font-bold text-gray-900 group-hover:underline underline-offset-2">{marca.nombre}</span>
                        <span className="text-xs text-gray-500 inline-flex items-center gap-1"><Users size={12} /> {marca.usuarios} {marca.usuarios === 1 ? 'usuario' : 'usuarios'}</span>
                    </span>
                </button>
                <div className="flex flex-wrap gap-1.5">
                    {PASOS.map((p) => <PasoChip key={p.key} label={p.label} pasoKey={p.key} estado={marca.pasos[p.key]} onClick={() => onOpen(p.destino)} />)}
                </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                <span>Plan de {monthLabel(c.mes).split(' ')[0].toLowerCase()}: <strong className="text-gray-800">{c.plan_mes}</strong></span>
                <span>Próximo mes: <strong className="text-gray-800">{c.plan_siguiente}</strong></span>
                <span>En producción: <strong className="text-gray-800">{c.en_produccion}</strong></span>
                <span>Por revisar (cliente): <strong className="text-gray-800">{c.por_revisar}</strong></span>
                <span>Por programar: <strong className="text-gray-800">{c.por_programar}</strong></span>
            </div>

            {team.length > 0 && (
                <ul className="mt-4 divide-y divide-gray-100 rounded-2xl border border-gray-100 overflow-hidden">
                    {team.map((a, i) => <ActionRow key={i} accion={a} onGo={() => a.destino && onOpen(a.destino)} />)}
                </ul>
            )}
            {team.length === 0 && <p className="mt-4 text-sm text-gray-500 inline-flex items-center gap-1.5"><Check size={14} style={{ color: PASO_META.listo.color }} /> Nada pendiente para el equipo.</p>}
            {client.length > 0 && (
                <p className="mt-3 text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">Esperando al cliente:</span>{' '}
                    {client.map((a, i) => (
                        <React.Fragment key={i}>
                            {i > 0 && ' · '}
                            <button onClick={() => a.destino && onOpen(a.destino)} className="underline underline-offset-2 hover:text-gray-800">{a.texto}{a.n ? ` (${a.n})` : ''}</button>
                        </React.Fragment>
                    ))}
                </p>
            )}
        </article>
    );
};

const ActionRow: React.FC<{ accion: api.AdminAccion; onGo: () => void }> = ({ accion, onGo }) => {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        if (!accion.receta) return;
        try { await navigator.clipboard.writeText(accion.receta); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked: the command is visible anyway */ }
    };
    return (
        <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
            <span className="flex-1 min-w-[200px] text-sm text-gray-800">
                {accion.texto}{accion.n ? <strong className="text-gray-900"> ({accion.n})</strong> : null}
            </span>
            {accion.receta && (
                <button onClick={copy} title="Copiar para pegar en Claude Desktop"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 text-white px-2.5 py-1 font-mono text-xs hover:bg-gray-800">
                    {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copiado' : accion.receta}
                </button>
            )}
            {accion.destino && (
                <button onClick={onGo} className="inline-flex items-center gap-1 text-xs font-bold text-gray-600 hover:text-gray-900">
                    Abrir <ChevronRight size={14} />
                </button>
            )}
        </li>
    );
};

// =============================================================================
// BRAND DETAIL — the client's menu, plus a team summary
// =============================================================================

interface BrandUser { id: string; email: string; full_name?: string }

const BrandDetail: React.FC<{ marca: api.AdminMarca; tab: Tab; onTab: (t: Tab) => void; onBack: () => void }> = ({ marca, tab, onTab, onBack }) => {
    const page = PAGES.find((p) => p.key === tab);
    const navigate = (view: string) => { const t = VIEW_TO_TAB[view]; if (t) onTab(t); };

    return (
        <div className="h-full flex flex-col bg-brand-bg">
            <header className="bg-white border-b border-gray-200 px-4 md:px-6 pt-4 shrink-0">
                <div className="flex items-center gap-3 mb-3">
                    <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100" aria-label="Volver al tablero"><ArrowLeft size={20} className="text-gray-600" /></button>
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Panel del equipo</p>
                        <h1 className="text-xl font-bold text-gray-900 truncate">{marca.nombre}</h1>
                    </div>
                </div>
                <nav className="flex gap-1 overflow-x-auto -mb-px" aria-label="Páginas de la marca">
                    <TabButton active={tab === 'resumen'} onClick={() => onTab('resumen')} icon={LayoutDashboard} label="Resumen" />
                    <span className="w-px bg-gray-200 my-2 mx-1 shrink-0" />
                    {PAGES.map((p, i) => (
                        <React.Fragment key={p.key}>
                            {i > 0 && PAGES[i - 1].group !== p.group && <span className="w-px bg-gray-200 my-2 mx-1 shrink-0" />}
                            <TabButton active={tab === p.key} onClick={() => onTab(p.key)} icon={p.icon} label={p.label} />
                        </React.Fragment>
                    ))}
                </nav>
            </header>

            {page ? (
                <div className="flex-1 min-h-0 flex flex-col">
                    <p className="shrink-0 px-4 md:px-6 py-2 text-xs text-gray-600 bg-amber-50 border-b border-amber-100">
                        Ves lo mismo que ve el cliente en <strong>{page.label}</strong>. Si apruebas o pides cambios aquí, cuenta como si lo hiciera el cliente.
                    </p>
                    <div className="flex-1 min-h-0 overflow-hidden">
                        <page.Component clientId={marca.id} onNavigate={navigate} />
                    </div>
                </div>
            ) : (
                <BrandSummary marca={marca} onTab={onTab} />
            )}
        </div>
    );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ElementType; label: string }> = ({ active, onClick, icon: Icon, label }) => (
    <button onClick={onClick} aria-current={active ? 'page' : undefined}
        className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold border-b-2 transition-colors ${active ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
        <Icon size={15} /> {label}
    </button>
);

const BrandSummary: React.FC<{ marca: api.AdminMarca; onTab: (t: Tab) => void }> = ({ marca, onTab }) => {
    const [users, setUsers] = useState<BrandUser[]>([]);
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadUsers = useCallback(async () => {
        try {
            const d = await adminFetch<{ users: BrandUser[] }>(`/api/admin/brands/${marca.id}`);
            setUsers(d.users ?? []);
        } catch (e) { setError(e instanceof Error ? e.message : 'No se pudieron cargar los usuarios'); }
    }, [marca.id]);
    useEffect(() => { loadUsers(); }, [loadUsers]);

    const team = marca.acciones.filter((a) => a.quien === 'equipo');
    const client = marca.acciones.filter((a) => a.quien === 'cliente');

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-3">Dónde está</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {PASOS.map((p) => {
                            const estado = marca.pasos[p.key];
                            const meta = PASO_META[estado];
                            return (
                                <button key={p.key} onClick={() => onTab(p.destino)} className="text-left rounded-2xl border border-gray-100 p-4 hover:shadow-sm" style={{ background: `${meta.color}12` }}>
                                    <p className="text-sm font-bold text-gray-900">{p.label}</p>
                                    <p className="text-xs text-gray-600 mt-1 inline-flex items-center gap-1"><meta.icon size={12} style={{ color: meta.color }} strokeWidth={2.5} /> {pasoLabel(p.key, estado)}</p>
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                        Última vigilancia de mercado: {marca.ultima_vigilancia ? new Date(`${marca.ultima_vigilancia}T12:00:00`).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' }) : 'nunca'}
                        {' · '}Últimos resultados de Metricool: {marca.ultimos_resultados ? new Date(marca.ultimos_resultados).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' }) : 'nunca'}
                    </p>
                </section>

                <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-3">Qué toca</h2>
                    {team.length === 0 ? <p className="text-sm text-gray-500">Nada pendiente para el equipo.</p> : (
                        <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-100 overflow-hidden">
                            {team.map((a, i) => <ActionRow key={i} accion={a} onGo={() => a.destino && onTab(a.destino)} />)}
                        </ul>
                    )}
                    {client.length > 0 && (
                        <>
                            <h3 className="text-sm font-bold text-gray-900 mt-5 mb-2">Esperando al cliente</h3>
                            <ul className="space-y-1">
                                {client.map((a, i) => (
                                    <li key={i}>
                                        <button onClick={() => a.destino && onTab(a.destino)} className="text-sm text-gray-700 underline underline-offset-2 hover:text-gray-900">{a.texto}{a.n ? ` (${a.n})` : ''}</button>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </section>

                <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-bold text-gray-900">Usuarios del cliente</h2>
                        <button onClick={() => setAdding(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800"><Plus size={16} /> Agregar usuario</button>
                    </div>
                    {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
                    {users.length === 0 ? <p className="text-sm text-gray-500">Esta marca aún no tiene usuarios: el cliente no puede entrar a Partners.</p> : (
                        <ul className="divide-y divide-gray-100">
                            {users.map((u) => (
                                <li key={u.id} className="flex items-center gap-3 py-3">
                                    <span className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"><UserRound size={18} /></span>
                                    <span>
                                        <span className="block text-sm font-bold text-gray-900">{u.full_name || u.email.split('@')[0]}</span>
                                        <span className="block text-xs text-gray-500">{u.email}</span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
            {adding && <AddUserModal brandId={marca.id} onClose={() => setAdding(false)} onCreated={() => { setAdding(false); loadUsers(); }} />}
        </div>
    );
};

// =============================================================================
// MODALS
// =============================================================================

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) =>
    createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-3xl p-7 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                    <button onClick={onClose} className="p-2 -m-2 rounded-full hover:bg-gray-100 text-gray-400" aria-label="Cerrar"><X size={20} /></button>
                </div>
                {children}
            </div>
        </div>,
        document.body,
    );

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <label className="block">
        <span className="block text-xs font-bold text-gray-700 uppercase mb-1.5">{label}</span>
        {children}
    </label>
);
const inputCls = 'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 outline-none';

const CreateBrandModal: React.FC<{ onClose: () => void; onCreated: () => void }> = ({ onClose, onCreated }) => {
    const [nombre, setNombre] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombre.trim()) return;
        setSaving(true); setError(null);
        try { await adminFetch('/api/admin/brands', { method: 'POST', body: JSON.stringify({ nombre: nombre.trim() }) }); onCreated(); }
        catch (err) { setError(err instanceof Error ? err.message : 'No se pudo crear la marca'); }
        finally { setSaving(false); }
    };
    return (
        <Modal title="Nueva marca" onClose={onClose}>
            <form onSubmit={submit} className="space-y-4">
                <Field label="Nombre de la marca"><input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} placeholder="Ej. Café Andino" autoFocus required /></Field>
                <p className="text-xs text-gray-500">Después agrega su usuario desde el resumen de la marca, para que el cliente pueda entrar.</p>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button type="submit" disabled={saving || !nombre.trim()} className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold disabled:opacity-50">
                    {saving ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Crear marca'}
                </button>
            </form>
        </Modal>
    );
};

const AddUserModal: React.FC<{ brandId: string; onClose: () => void; onCreated: () => void }> = ({ brandId, onClose, onCreated }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true); setError(null);
        try {
            await adminFetch(`/api/admin/brands/${brandId}/users`, { method: 'POST', body: JSON.stringify({ email, password, full_name: fullName || undefined }) });
            onCreated();
        } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo crear el usuario'); }
        finally { setSaving(false); }
    };
    return (
        <Modal title="Nuevo usuario" onClose={onClose}>
            <form onSubmit={submit} className="space-y-4">
                <Field label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} required autoFocus /></Field>
                <Field label="Contraseña"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} required minLength={6} /></Field>
                <Field label="Nombre (opcional)"><input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} /></Field>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button type="submit" disabled={saving} className="w-full py-3 rounded-xl bg-gray-900 text-white font-bold hover:bg-gray-800 disabled:opacity-50">
                    {saving ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Crear usuario'}
                </button>
            </form>
        </Modal>
    );
};

export default AdminPanel;
