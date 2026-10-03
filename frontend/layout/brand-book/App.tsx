/**
 * Voz de marca (formerly the brand manual)
 *
 * Only what the content pipeline actually uses: how the brand speaks (tone with
 * examples, words to use and avoid, archetype, a sample post) plus its REAL colors
 * and logo. Written by /02_voz_de_marca (Claude Desktop); the client approves it here —
 * /01, /02 and /03 write with the approved voice. Nothing visual is invented by AI.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Check, X, Loader2, MessageSquareWarning, Sparkles, Quote, Palette, Save, Megaphone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../services/api';

const ESTADO_META: Record<api.VozEstado, { label: string; color: string; icon: React.ElementType }> = {
    Pendiente: { label: 'Por revisar', color: '#fab219', icon: Sparkles },
    'Cambios solicitados': { label: 'Cambios pedidos', color: '#ec835a', icon: MessageSquareWarning },
    Aprobada: { label: 'Aprobada', color: '#0ca30c', icon: Check },
};

const COLOR_SLOTS: { key: 'primary' | 'secondary' | 'accent' | 'background'; label: string }[] = [
    { key: 'primary', label: 'Principal' },
    { key: 'secondary', label: 'Secundario' },
    { key: 'accent', label: 'Acento' },
    { key: 'background', label: 'Fondo' },
];

const App: React.FC<{ overrideClientId?: string }> = ({ overrideClientId }) => {
    const { user } = useAuth();
    const clientId = overrideClientId || user?.fichaClienteId;
    const [voice, setVoice] = useState<api.BrandVoice | null>(null);
    const [brandName, setBrandName] = useState('');
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!clientId) { setLoading(false); return; }
        try {
            const json = await api.getBrand(clientId);
            setVoice(json.status === 'success' && json.data ? json.data : null);
            setBrandName(json.brand_name || '');
        } catch (e) {
            console.error('Failed to load brand voice:', e);
        } finally {
            setLoading(false);
        }
    }, [clientId]);

    useEffect(() => { load(); }, [load]);

    if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-gray-300" size={32} /></div>;

    const hasVoice = !!voice && ((voice.tone_traits?.length ?? 0) > 0 || !!voice.archetype);
    if (!hasVoice) {
        return (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 flex flex-col items-center text-center">
                <Megaphone size={36} className="text-gray-300 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Tu voz de marca aún no está lista</h3>
                <p className="text-sm text-gray-500 max-w-md">El equipo de Pixely la prepara a partir de tu Ficha. Aparecerá aquí para que la revises y apruebes.</p>
                {user?.isAdmin && (
                    <p className="mt-4 text-xs text-gray-400">Se define con <code className="font-mono">/02_voz_de_marca</code> desde Claude Desktop.</p>
                )}
            </div>
        );
    }

    const v = voice!;
    const accent = v.colors?.primary || '#D90B66';

    return (
        <div className="space-y-6">
            <ReviewBar clientId={clientId!} voice={v} onChange={(patch) => setVoice({ ...v, ...patch })} />

            {/* Tone */}
            {(v.tone_traits?.length ?? 0) > 0 && (
                <section aria-label="Tono">
                    <h2 className="text-lg font-bold text-gray-900 mb-3">Así suena tu marca</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {v.tone_traits!.map((t) => (
                            <div key={t.trait} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                                <p className="text-xl font-bold text-gray-900">{t.trait}</p>
                                {(t.description || t.desc) && <p className="text-sm text-gray-600 mt-1">{t.description || t.desc}</p>}
                                {(t.ejemplo_si || t.ejemplo_no) && (
                                    <div className="mt-4 space-y-2">
                                        {t.ejemplo_si && <Example ok text={t.ejemplo_si} />}
                                        {t.ejemplo_no && <Example ok={false} text={t.ejemplo_no} />}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Words */}
                {((v.palabras_si?.length ?? 0) > 0 || (v.palabras_no?.length ?? 0) > 0) && (
                    <section className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm p-6 grid grid-cols-1 sm:grid-cols-2 gap-6" aria-label="Palabras">
                        <WordList ok words={v.palabras_si ?? []} />
                        <WordList ok={false} words={v.palabras_no ?? []} />
                    </section>
                )}

                {/* Archetype */}
                {v.archetype && (
                    <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6" aria-label="Arquetipo">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Arquetipo</p>
                        <p className="text-2xl font-bold text-gray-900">{v.archetype}</p>
                        {v.arquetipo_razon && <p className="text-sm text-gray-600 mt-2 leading-relaxed">{v.arquetipo_razon}</p>}
                    </section>
                )}
            </div>

            {/* Sample post */}
            {v.ejemplo_post && (
                <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex gap-4" aria-label="Ejemplo de publicación">
                    <Quote className="shrink-0" size={28} style={{ color: accent }} />
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Así escribiríamos una publicación{brandName ? ` de ${brandName}` : ''}</p>
                        <p className="text-base text-gray-800 whitespace-pre-line leading-relaxed">{v.ejemplo_post}</p>
                    </div>
                </section>
            )}

            <RealColors clientId={clientId!} voice={v} onSaved={(colors) => setVoice({ ...v, colors })} />
        </div>
    );
};

// --- Approval, like Validación but for the voice itself ---

const ReviewBar: React.FC<{
    clientId: string; voice: api.BrandVoice; onChange: (patch: Partial<api.BrandVoice>) => void;
}> = ({ clientId, voice, onChange }) => {
    const estado = voice.voz_estado ?? 'Pendiente';
    const meta = ESTADO_META[estado];
    const [asking, setAsking] = useState(false);
    const [comment, setComment] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (next: 'Aprobada' | 'Cambios solicitados') => {
        if (next === 'Cambios solicitados' && !comment.trim()) { setError('Cuéntanos qué cambiarías.'); return; }
        setSaving(true); setError(null);
        try {
            onChange(await api.reviewBrandVoice(clientId, next, next === 'Cambios solicitados' ? comment.trim() : undefined));
            setAsking(false); setComment('');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo guardar');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-semibold text-gray-800" style={{ background: `${meta.color}1F` }}>
                        <meta.icon size={15} style={{ color: meta.color }} strokeWidth={2.5} /> {meta.label}
                    </span>
                    <p className="text-sm text-gray-500">
                        {estado === 'Aprobada'
                            ? `Aprobada${voice.voz_revisada_at ? ` el ${new Date(voice.voz_revisada_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })}` : ''}. Escribimos tu contenido con esta voz.`
                            : estado === 'Cambios solicitados'
                                ? 'El equipo está ajustando tu voz con tus comentarios.'
                                : '¿Así quieres que hable tu marca? Apruébala o dinos qué cambiar.'}
                    </p>
                </div>
                <div className="flex gap-2">
                    {!asking && (
                        <button onClick={() => setAsking(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50">
                            <MessageSquareWarning size={15} /> Pedir cambios
                        </button>
                    )}
                    {estado !== 'Aprobada' && !asking && (
                        <button onClick={() => submit('Aprobada')} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-bold shadow-lg shadow-pink-500/20 disabled:opacity-60">
                            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Aprobar
                        </button>
                    )}
                </div>
            </div>

            {voice.voz_comentario && !asking && (
                <p className="mt-3 text-sm text-gray-600 italic border-l-2 border-orange-200 pl-3">“{voice.voz_comentario}”</p>
            )}

            {asking && (
                <div className="mt-4 space-y-3">
                    <label htmlFor="voice-comment" className="text-sm font-bold text-gray-800">¿Qué cambiarías?</label>
                    <textarea id="voice-comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} autoFocus
                        placeholder="Ej. Somos más relajados, no usamos palabras técnicas; nunca digas 'premium'…"
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500" />
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <div className="flex gap-2">
                        <button onClick={() => { setAsking(false); setError(null); }} disabled={saving} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">Volver</button>
                        <button onClick={() => submit('Cambios solicitados')} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 disabled:opacity-60">
                            {saving && <Loader2 size={15} className="animate-spin" />} Enviar cambios
                        </button>
                    </div>
                </div>
            )}
            {error && !asking && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
    );
};

const Example: React.FC<{ ok: boolean; text: string }> = ({ ok, text }) => (
    <p className={`flex gap-2 text-sm rounded-xl px-3 py-2 ${ok ? 'bg-green-50 text-gray-800' : 'bg-gray-50 text-gray-500'}`}>
        {ok ? <Check size={16} className="shrink-0 mt-0.5" style={{ color: '#0ca30c' }} strokeWidth={3} /> : <X size={16} className="shrink-0 mt-0.5 text-gray-400" strokeWidth={3} />}
        <span><span className="font-semibold">{ok ? 'Así sí: ' : 'Así no: '}</span>{text}</span>
    </p>
);

const WordList: React.FC<{ ok: boolean; words: string[] }> = ({ ok, words }) => (
    <div>
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
            {ok ? <Check size={14} style={{ color: '#0ca30c' }} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
            {ok ? 'Palabras que usamos' : 'Palabras que evitamos'}
        </p>
        <div className="flex flex-wrap gap-1.5">
            {words.map((w) => (
                <span key={w} className={`text-sm rounded-lg px-2.5 py-1 border ${ok ? 'bg-white border-gray-200 text-gray-800' : 'bg-gray-50 border-gray-100 text-gray-400 line-through'}`}>{w}</span>
            ))}
        </div>
    </div>
);

// --- The brand's real colors (set by the client, not invented) ---

const RealColors: React.FC<{ clientId: string; voice: api.BrandVoice; onSaved: (c: NonNullable<api.BrandVoice['colors']>) => void }> = ({ clientId, voice, onSaved }) => {
    const [colors, setColors] = useState({ ...(voice.colors ?? {}) });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const dirty = COLOR_SLOTS.some(({ key }) => (colors[key] ?? '') !== (voice.colors?.[key] ?? ''));

    const save = async () => {
        setSaving(true);
        try {
            onSaved(await api.updateBrandColors(clientId, colors));
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (e) {
            alert(e instanceof Error ? e.message : 'No se pudieron guardar los colores');
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6" aria-label="Colores y logo">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900"><Palette size={18} className="text-primary-600" /> Tus colores y logo</h2>
                    <p className="text-sm text-gray-500">Los de tu marca real. Si no coinciden, corrígelos: los usamos en tus diseños.</p>
                </div>
                {(dirty || saved) && (
                    <button onClick={save} disabled={saving || !dirty} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 disabled:opacity-60">
                        {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : <Save size={15} />} {saved ? 'Guardado' : 'Guardar colores'}
                    </button>
                )}
            </div>
            <div className="flex flex-wrap items-center gap-6">
                {voice.logo_url && <img src={voice.logo_url} alt="Logo" className="h-20 w-20 object-contain rounded-2xl border border-gray-100 p-2" />}
                {COLOR_SLOTS.map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-3 cursor-pointer">
                        <span className="relative w-14 h-14 rounded-2xl border border-gray-200 overflow-hidden" style={{ backgroundColor: colors[key] || '#ffffff' }}>
                            <input type="color" value={colors[key] || '#ffffff'} onChange={(e) => setColors({ ...colors, [key]: e.target.value.toUpperCase() })}
                                className="absolute inset-0 opacity-0 cursor-pointer" aria-label={`Color ${label}`} />
                        </span>
                        <span>
                            <span className="block text-sm font-semibold text-gray-800">{label}</span>
                            <span className="block text-xs text-gray-500 font-mono">{colors[key] || '—'}</span>
                        </span>
                    </label>
                ))}
            </div>
        </section>
    );
};

export default App;
