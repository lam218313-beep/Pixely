/**
 * Configuración de la marca (solo equipo). Es la fuente que leen las recetas de Claude Desktop:
 * volumen (fotos y reels al mes) → /04_estrategia y /05_planificacion, redes → /03_generar y
 * /05_publicar, marca de Metricool → /01, /03 y /05_publicar.
 */

import React, { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import * as api from '../../services/api';

const PLANES: api.BrandPlan[] = ['Lite', 'Basic', 'Pro', 'Personalizado'];
const REDES: { key: api.BrandRed; label: string }[] = [
    { key: 'instagram', label: 'Instagram' },
    { key: 'facebook', label: 'Facebook' },
    { key: 'linkedin', label: 'LinkedIn' },
    { key: 'tiktok', label: 'TikTok' },
    { key: 'pinterest', label: 'Pinterest' },
    { key: 'gbp', label: 'Google Business' },
    { key: 'x', label: 'X' },
];
export const RED_LABEL = Object.fromEntries(REDES.map((r) => [r.key, r.label])) as Record<api.BrandRed, string>;

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 outline-none';

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
    <label className="block">
        <span className="block text-xs font-bold text-gray-700 mb-1.5">{label}</span>
        {children}
        {hint && <span className="block text-[11px] text-gray-400 mt-1">{hint}</span>}
    </label>
);

const Card: React.FC<{ title: string; text: string; children: React.ReactNode }> = ({ title, text, children }) => (
    <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500 mb-4">{text}</p>
        {children}
    </section>
);

export const BrandSettingsForm: React.FC<{ clientId: string; onSaved?: () => void }> = ({ clientId, onSaved }) => {
    const [form, setForm] = useState<api.BrandSettings | null>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        api.getBrandSettings(clientId)
            .then((s) => { if (!cancelled) setForm(s); })
            .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'No se pudo cargar la configuración'); });
        return () => { cancelled = true; };
    }, [clientId]);

    if (!form) {
        return error ? <p className="text-sm text-red-600">{error}</p> : <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gray-300" size={32} /></div>;
    }

    const set = <K extends keyof api.BrandSettings>(key: K, value: api.BrandSettings[K]) => { setSaved(false); setForm({ ...form, [key]: value }); };
    const num = (v: string) => (v === '' ? null : Math.max(0, Math.round(Number(v))));
    const toggleRed = (r: api.BrandRed) => set('redes', form.redes.includes(r) ? form.redes.filter((x) => x !== r) : [...form.redes, r]);
    const total = (form.fotos_mes ?? 0) + (form.reels_mes ?? 0);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true); setError(null);
        try { setForm(await api.saveBrandSettings(clientId, form)); setSaved(true); onSaved?.(); }
        catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar'); }
        finally { setSaving(false); }
    };

    return (
        <form onSubmit={submit} className="space-y-6">
            <Card title="Plan contratado" text="Cuántas piezas lleva el plan de cada mes. Lo usan /04_estrategia y /05_planificacion.">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="Plan">
                        <select value={form.plan ?? ''} onChange={(e) => set('plan', (e.target.value || null) as api.BrandPlan | null)} className={inputCls}>
                            <option value="">Sin definir</option>
                            {PLANES.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </Field>
                    <Field label="Fotos al mes" hint="Imágenes, carruseles y estados">
                        <input type="number" min={0} max={200} value={form.fotos_mes ?? ''} onChange={(e) => set('fotos_mes', num(e.target.value))} className={inputCls} />
                    </Field>
                    <Field label="Reels al mes">
                        <input type="number" min={0} max={100} value={form.reels_mes ?? ''} onChange={(e) => set('reels_mes', num(e.target.value))} className={inputCls} />
                    </Field>
                </div>
                <p className="text-xs text-gray-500 mt-3">Total: <strong className="text-gray-900">{total}</strong> piezas al mes.</p>
            </Card>

            <Card title="Redes" text="Dónde publica la marca. /03_generar solo escribe textos para estas redes y /05_publicar solo programa en ellas.">
                <div className="flex flex-wrap gap-2" role="group" aria-label="Redes de la marca">
                    {REDES.map(({ key, label }) => {
                        const on = form.redes.includes(key);
                        return (
                            <button key={key} type="button" aria-pressed={on} onClick={() => toggleRed(key)}
                                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-sm font-bold transition-colors ${on ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                {on && <Check size={14} strokeWidth={3} />} {label}
                            </button>
                        );
                    })}
                </div>
            </Card>

            <Card title="Metricool" text="La marca del cliente en Metricool: de ahí salen su competencia (/01, /03) y sus resultados (/05_publicar resultados).">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Id de la marca en Metricool" hint="Número de la marca (blogId). Agrega sus competidores de Instagram y Facebook dentro de Metricool.">
                        <input value={form.metricool_brand_id ?? ''} onChange={(e) => set('metricool_brand_id', e.target.value)} className={inputCls} placeholder="Ej. 4434128" inputMode="numeric" />
                    </Field>
                </div>
            </Card>

            <Card title="Datos del negocio" text="Para el equipo: dónde está, qué vende y con quién hablar.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Ciudad"><input value={form.ciudad ?? ''} onChange={(e) => set('ciudad', e.target.value)} className={inputCls} placeholder="Ej. Lima" /></Field>
                    <Field label="Rubro"><input value={form.rubro ?? ''} onChange={(e) => set('rubro', e.target.value)} className={inputCls} placeholder="Ej. Cafetería de especialidad" /></Field>
                    <Field label="Contacto principal"><input value={form.contacto_nombre ?? ''} onChange={(e) => set('contacto_nombre', e.target.value)} className={inputCls} /></Field>
                    <Field label="Email de contacto"><input type="email" value={form.contacto_email ?? ''} onChange={(e) => set('contacto_email', e.target.value)} className={inputCls} /></Field>
                    <Field label="Teléfono / WhatsApp"><input value={form.contacto_telefono ?? ''} onChange={(e) => set('contacto_telefono', e.target.value)} className={inputCls} /></Field>
                </div>
            </Card>

            <div className="flex flex-wrap items-center gap-3">
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-bold shadow-lg shadow-pink-500/20 disabled:opacity-60">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Guardar configuración
                </button>
                {saved && <span className="text-sm font-semibold" style={{ color: '#006300' }}>Guardado. Las recetas usarán estos datos desde ahora.</span>}
                {error && <span className="text-sm text-red-600">{error}</span>}
                {form.actualizado_at && !saved && (
                    <span className="text-xs text-gray-400">Última edición: {new Date(form.actualizado_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })}{form.actualizado_por ? ` por ${form.actualizado_por}` : ''}</span>
                )}
            </div>
        </form>
    );
};
