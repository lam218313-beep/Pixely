/**
 * Alta de cliente, paso a paso (solo equipo). Reemplaza al "Nueva marca" de un solo campo:
 * marca → plan → contacto → acceso, y al final el mensaje de bienvenida listo para WhatsApp
 * y lo que toca correr después. Usa los mismos endpoints de siempre, en orden; si uno falla,
 * se reintenta desde ahí sin duplicar la marca.
 */

import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, MessageCircle, RefreshCw, X } from 'lucide-react';
import { ThinkingOrb } from '../ThinkingOrb';
import * as api from '../../services/api';

const PLANES: { key: api.BrandPlan; note: string }[] = [
    { key: 'Lite', note: 'Volumen inicial' },
    { key: 'Basic', note: 'Volumen medio + calendario' },
    { key: 'Pro', note: 'Mayor volumen, publicamos y medimos' },
    { key: 'Personalizado', note: 'A medida' },
];
const REDES: { key: api.BrandRed; label: string }[] = [
    { key: 'instagram', label: 'Instagram' },
    { key: 'facebook', label: 'Facebook' },
    { key: 'tiktok', label: 'TikTok' },
    { key: 'linkedin', label: 'LinkedIn' },
    { key: 'gbp', label: 'Google Business' },
    { key: 'pinterest', label: 'Pinterest' },
    { key: 'x', label: 'X' },
];
const STEPS = ['Marca', 'Plan', 'Contacto', 'Acceso'] as const;

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-edge bg-card text-sm text-white placeholder:text-mute focus:border-pink outline-none';
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** 12 characters without look-alikes (0/O, 1/l/I), easy to dictate or type from a phone. */
function newPassword(): string {
    const abc = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
    const bytes = crypto.getRandomValues(new Uint32Array(12));
    return Array.from(bytes, (b) => abc[b % abc.length]).join('');
}

/** Peruvian mobile numbers are written without the country code; wa.me needs it. */
function waNumber(phone: string): string | null {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 9) return `51${digits}`;
    if (digits.length >= 11) return digits;
    return null;
}

const errText = (e: unknown, fallback: string) => (e instanceof Error && typeof e.message === 'string' && !e.message.startsWith('[object') ? e.message : fallback);

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
    <label className="block">
        <span className="block text-xs font-bold text-text-2 mb-1.5">{label}</span>
        {children}
        {hint && <span className="block text-[11px] text-text-3 mt-1">{hint}</span>}
    </label>
);

type Progress = { brandId?: string; settings?: boolean; user?: boolean };

export const NewClientWizard: React.FC<{ onClose: () => void; onDone: (brandId: string | null) => void }> = ({ onClose, onDone }) => {
    const [step, setStep] = useState(0);
    const [nombre, setNombre] = useState('');
    const [rubro, setRubro] = useState('');
    const [ciudad, setCiudad] = useState('');
    const [plan, setPlan] = useState<api.BrandPlan | null>(null);
    const [fotos, setFotos] = useState('');
    const [reels, setReels] = useState('');
    const [redes, setRedes] = useState<api.BrandRed[]>(['instagram', 'facebook']);
    const [contacto, setContacto] = useState('');
    const [correo, setCorreo] = useState('');
    const [telefono, setTelefono] = useState('');
    const [metricool, setMetricool] = useState('');
    const [crearAcceso, setCrearAcceso] = useState(true);
    const [accesoCorreo, setAccesoCorreo] = useState<string | null>(null); // null = <marca>@pixely.pe
    const [password, setPassword] = useState(newPassword);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<Progress>({});
    const [done, setDone] = useState(false);
    const [copied, setCopied] = useState(false);

    // El acceso es un usuario @pixely.pe que damos nosotros (no tiene bandeja): por defecto, el nombre de la marca
    const correoSugerido = nombre.trim() ? `${nombre.normalize('NFD').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}@pixely.pe` : '';
    const emailAcceso = (accesoCorreo ?? correoSugerido).trim().toLowerCase();
    const num = (v: string) => (v === '' ? null : Math.max(0, Math.round(Number(v))));

    const stepOk = [
        nombre.trim().length > 1,
        plan !== null && redes.length > 0,
        !correo.trim() || EMAIL_RE.test(correo.trim()),
        !crearAcceso || (EMAIL_RE.test(emailAcceso) && password.length >= 8),
    ];

    const toggleRed = (r: api.BrandRed) => setRedes((rs) => (rs.includes(r) ? rs.filter((x) => x !== r) : [...rs, r]));

    const create = async () => {
        setSaving(true);
        setError(null);
        const p: Progress = { ...progress };
        try {
            if (!p.brandId) {
                p.brandId = (await api.createAdminBrand(nombre.trim())).id;
                setProgress({ ...p });
            }
            if (!p.settings) {
                await api.saveBrandSettings(p.brandId, {
                    plan, fotos_mes: num(fotos), reels_mes: num(reels), redes,
                    metricool_brand_id: null, metricool_nombre: metricool.trim() || null,
                    ciudad: ciudad.trim() || null, rubro: rubro.trim() || null,
                    contacto_nombre: contacto.trim() || null, contacto_email: correo.trim() || null, contacto_telefono: telefono.trim() || null,
                });
                p.settings = true;
                setProgress({ ...p });
            }
            if (crearAcceso && !p.user) {
                await api.createBrandUser(p.brandId, { email: emailAcceso, password, full_name: contacto.trim() || undefined });
                p.user = true;
                setProgress({ ...p });
            }
            setDone(true);
        } catch (e) {
            const what = !p.brandId ? 'crear la marca' : !p.settings ? 'guardar el plan y el contacto' : 'crear el acceso';
            setError(`No se pudo ${what}: ${errText(e, 'intenta de nuevo')}. Lo anterior ya quedó guardado; al reintentar sigue desde aquí.`);
        } finally {
            setSaving(false);
        }
    };

    const firstName = contacto.trim().split(/\s+/)[0] || '';
    const welcome = useMemo(() => [
        `Hola${firstName ? ` ${firstName}` : ''} 👋 ¡te damos la bienvenida a Pixely! 🎉`,
        '',
        'Ya tienes acceso a Pixely Partners ✨ Ahí verás tu marca, aprobarás cada idea y cada pieza antes de que salga, y seguirás tus resultados 📈',
        '',
        '🔑 Así entras, desde el celular o la computadora:',
        '🌐 partners.pixely.pe',
        `📧 Correo: ${emailAcceso}`,
        `🔒 Contraseña: ${password}`,
        '',
        'Guárdalos bien 😉 ¿Alguna duda? Escríbenos por aquí, estamos para ayudarte 💬',
    ].join('\n'), [firstName, emailAcceso, password]);
    const wa = waNumber(telefono);

    const copy = async () => {
        try { await navigator.clipboard.writeText(welcome); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* the text stays selectable */ }
    };

    const close = () => (progress.brandId ? onDone(progress.brandId) : onClose());

    return createPortal(
        // A click outside does nothing: only the X (or Cancelar) closes it, so a stray click never loses the form
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 backdrop-blur-sm p-4">
            <div className="bg-card border border-edge rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl" role="dialog" aria-modal="true" aria-label="Nuevo cliente">
                <header className="px-7 pt-6 pb-4 border-b border-edge">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-pink-text">Panel del equipo</p>
                            <h2 className="text-2xl font-black text-white">{done ? `${nombre.trim()} ya está en Partners` : 'Nuevo cliente'}</h2>
                        </div>
                        <button onClick={close} className="p-2 -m-2 rounded-full hover:bg-raised text-text-3" aria-label="Cerrar"><X size={20} /></button>
                    </div>
                    {!done && (
                        <ol className="mt-4 grid grid-cols-4 gap-2" aria-label="Pasos">
                            {STEPS.map((s, i) => (
                                <li key={s}>
                                    <button
                                        type="button"
                                        onClick={() => i < step && setStep(i)}
                                        disabled={i > step || saving}
                                        aria-current={i === step ? 'step' : undefined}
                                        className="w-full text-left disabled:cursor-default"
                                    >
                                        <span className={`block h-1 rounded-full mb-2 ${i <= step ? 'bg-pink' : 'bg-raised'}`} />
                                        <span className={`text-xs font-bold ${i === step ? 'text-white' : i < step ? 'text-text-2' : 'text-mute'}`}>{i + 1}. {s}</span>
                                    </button>
                                </li>
                            ))}
                        </ol>
                    )}
                </header>

                <div className="px-7 py-6 overflow-y-auto custom-scrollbar flex-1">
                    {done ? (
                        <Done
                            accessCreated={!!progress.user}
                            welcome={welcome}
                            copied={copied}
                            onCopy={copy}
                            waHref={wa ? `https://wa.me/${wa}?text=${encodeURIComponent(welcome)}` : null}
                        />
                    ) : step === 0 ? (
                        <div className="space-y-4">
                            <p className="text-sm text-text-3">El nombre con el que el cliente y el equipo verán la marca.</p>
                            <Field label="Nombre de la marca"><input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} placeholder="Ej. Café Andino" autoFocus /></Field>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field label="Rubro" hint="Lo usa el estudio de mercado"><input value={rubro} onChange={(e) => setRubro(e.target.value)} className={inputCls} placeholder="Ej. Cafetería de especialidad" /></Field>
                                <Field label="Ciudad"><input value={ciudad} onChange={(e) => setCiudad(e.target.value)} className={inputCls} placeholder="Ej. Arequipa" /></Field>
                            </div>
                        </div>
                    ) : step === 1 ? (
                        <div className="space-y-5">
                            <div>
                                <p className="text-xs font-bold text-text-2 mb-2">Plan contratado</p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Plan">
                                    {PLANES.map((p) => (
                                        <button key={p.key} type="button" role="radio" aria-checked={plan === p.key} onClick={() => setPlan(p.key)}
                                            className={`text-left rounded-2xl border p-3 transition-colors ${plan === p.key ? 'border-pink bg-pink/10' : 'border-edge hover:bg-raised'}`}>
                                            <span className="block text-sm font-bold text-white">{p.key}</span>
                                            <span className="block text-[11px] text-text-3 leading-snug mt-0.5">{p.note}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Fotos y carruseles al mes"><input type="number" min={0} value={fotos} onChange={(e) => setFotos(e.target.value)} className={inputCls} placeholder="Ej. 12" /></Field>
                                <Field label="Reels al mes"><input type="number" min={0} value={reels} onChange={(e) => setReels(e.target.value)} className={inputCls} placeholder="Ej. 4" /></Field>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-text-2 mb-2">Redes donde publicamos</p>
                                <div className="flex flex-wrap gap-2">
                                    {REDES.map((r) => {
                                        const on = redes.includes(r.key);
                                        return (
                                            <button key={r.key} type="button" aria-pressed={on} onClick={() => toggleRed(r.key)}
                                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${on ? 'border-pink bg-pink/10 text-white' : 'border-edge text-text-3 hover:bg-raised'}`}>
                                                {on && <Check size={12} />} {r.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                {redes.length === 0 && <p className="text-[11px] text-pink-text mt-1.5">Elige al menos una red.</p>}
                            </div>
                        </div>
                    ) : step === 2 ? (
                        <div className="space-y-4">
                            <p className="text-sm text-text-3">La persona con la que coordina el equipo. Todo es opcional y se puede completar después en Configuración.</p>
                            <Field label="Nombre del contacto"><input value={contacto} onChange={(e) => setContacto(e.target.value)} className={inputCls} placeholder="Ej. Rosa Quispe" /></Field>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field label="Correo"><input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} className={inputCls} placeholder="rosa@cafeandino.pe" /></Field>
                                <Field label="WhatsApp"><input value={telefono} onChange={(e) => setTelefono(e.target.value)} className={inputCls} placeholder="999 999 999" /></Field>
                            </div>
                            {!stepOk[2] && <p className="text-[11px] text-pink-text">Revisa el correo.</p>}
                            <Field label="Nombre de la marca en Metricool" hint="Tal como aparece en Metricool. Si aún no la creas allí, déjalo vacío y complétalo después en Configuración."><input value={metricool} onChange={(e) => setMetricool(e.target.value)} className={inputCls} placeholder={nombre.trim() || 'Ej. Café Andino'} /></Field>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <label className="flex items-start gap-3 rounded-2xl border border-edge p-4 cursor-pointer hover:bg-raised">
                                <input type="checkbox" checked={crearAcceso} onChange={(e) => setCrearAcceso(e.target.checked)} className="mt-0.5 accent-[#EB0C6E]" />
                                <span>
                                    <span className="block text-sm font-bold text-white">Darle acceso a Partners ahora</span>
                                    <span className="block text-xs text-text-3">Entrará con un correo @pixely.pe y una contraseña, en el celular y en la computadora. El correo es solo para entrar: no tiene bandeja.</span>
                                </span>
                            </label>
                            {crearAcceso && (
                                <>
                                    <Field label="Correo para entrar"><input type="email" value={accesoCorreo ?? correoSugerido} onChange={(e) => setAccesoCorreo(e.target.value)} className={inputCls} placeholder="cafeandino@pixely.pe" /></Field>
                                    <Field label="Contraseña" hint="Mínimo 8 caracteres. Va en el mensaje de bienvenida.">
                                        <div className="flex gap-2">
                                            <input value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputCls} font-mono`} />
                                            <button type="button" onClick={() => setPassword(newPassword())} className="shrink-0 inline-flex items-center gap-1.5 px-3 rounded-xl border border-edge text-xs font-bold text-text-2 hover:bg-raised"><RefreshCw size={14} /> Otra</button>
                                        </div>
                                    </Field>
                                    {!stepOk[3] && <p className="text-[11px] text-pink-text">Falta un correo válido o la contraseña es muy corta.</p>}
                                </>
                            )}
                            <Summary nombre={nombre} rubro={rubro} ciudad={ciudad} plan={plan} fotos={fotos} reels={reels} redes={redes} contacto={contacto} acceso={crearAcceso ? emailAcceso : null} />
                            {progress.brandId && (
                                <ul className="text-xs text-text-2 space-y-1">
                                    <li className="flex items-center gap-1.5"><Check size={12} /> Marca creada</li>
                                    {progress.settings && <li className="flex items-center gap-1.5"><Check size={12} /> Plan y contacto guardados</li>}
                                </ul>
                            )}
                        </div>
                    )}
                    {error && <p className="mt-4 rounded-2xl border border-pink/40 bg-raised px-4 py-3 text-sm text-pink-text">{error}</p>}
                </div>

                <footer className="px-7 py-4 border-t border-edge flex items-center justify-between gap-3">
                    {done ? (
                        <>
                            <span />
                            <button onClick={() => onDone(progress.brandId ?? null)} className="px-5 py-2.5 rounded-xl bg-pink text-white text-sm font-bold">Abrir la marca</button>
                        </>
                    ) : (
                        <>
                            <button type="button" onClick={() => (step === 0 ? close() : setStep(step - 1))} disabled={saving || (step > 0 && !!progress.brandId)}
                                className="px-4 py-2.5 rounded-xl text-sm font-bold text-text-2 hover:bg-raised disabled:opacity-40">
                                {step === 0 ? 'Cancelar' : 'Atrás'}
                            </button>
                            {step < STEPS.length - 1 ? (
                                <button type="button" onClick={() => setStep(step + 1)} disabled={!stepOk[step]} className="px-5 py-2.5 rounded-xl bg-pink text-white text-sm font-bold disabled:opacity-40">Siguiente</button>
                            ) : (
                                <button type="button" onClick={create} disabled={saving || !stepOk.every(Boolean)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pink text-white text-sm font-bold disabled:opacity-40">
                                    {saving && <ThinkingOrb size={20} />}
                                    {error ? 'Reintentar' : 'Crear cliente'}
                                </button>
                            )}
                        </>
                    )}
                </footer>
            </div>
        </div>,
        document.body,
    );
};

const Summary: React.FC<{ nombre: string; rubro: string; ciudad: string; plan: api.BrandPlan | null; fotos: string; reels: string; redes: api.BrandRed[]; contacto: string; acceso: string | null }> = (s) => {
    const label = (r: api.BrandRed) => REDES.find((x) => x.key === r)?.label ?? r;
    const volumen = [s.fotos && `${s.fotos} fotos`, s.reels && `${s.reels} reels`].filter(Boolean).join(' y ');
    const rows: [string, string][] = [
        ['Marca', [s.nombre.trim(), s.rubro.trim(), s.ciudad.trim()].filter(Boolean).join(' · ')],
        ['Plan', [s.plan, volumen && `${volumen} al mes`].filter(Boolean).join(' · ')],
        ['Redes', s.redes.map(label).join(', ')],
        ['Contacto', s.contacto.trim() || 'Sin definir'],
        ['Acceso', s.acceso ?? 'Se crea después'],
    ];
    return (
        <dl className="rounded-2xl bg-raised/60 p-4 grid grid-cols-[88px_1fr] gap-x-3 gap-y-1.5 text-sm">
            {rows.map(([k, v]) => (
                <React.Fragment key={k}>
                    <dt className="text-text-3">{k}</dt>
                    <dd className="text-white min-w-0 break-words">{v}</dd>
                </React.Fragment>
            ))}
        </dl>
    );
};

const NEXT = [
    ['Ficha', 'Completar la Ficha en una conversación con el cliente'],
    ['/01_mercado_estudio', 'Correr el estudio de mercado'],
    ['/02_voz_de_marca', 'Definir la voz y mandarla a aprobar'],
    ['/04_estrategia', 'Armar la estrategia y mandarla a aprobar'],
];

const Done: React.FC<{ accessCreated: boolean; welcome: string; copied: boolean; onCopy: () => void; waHref: string | null }> = ({ accessCreated, welcome, copied, onCopy, waHref }) => (
    <div className="space-y-6">
        {accessCreated ? (
            <section>
                <h3 className="text-sm font-bold text-white mb-1">Mensaje de bienvenida</h3>
                <p className="text-xs text-text-3 mb-3">Envíalo por WhatsApp. Lleva la contraseña: es la única vez que se muestra.</p>
                <pre className="whitespace-pre-wrap font-sans text-sm text-text-2 rounded-2xl bg-raised/60 p-4">{welcome}</pre>
                <div className="flex flex-wrap gap-2 mt-3">
                    <button onClick={onCopy} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-edge text-sm font-bold text-white hover:bg-raised">
                        {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copiado' : 'Copiar mensaje'}
                    </button>
                    {waHref && (
                        <a href={waHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-pink text-white text-sm font-bold">
                            <MessageCircle size={16} /> Abrir en WhatsApp
                        </a>
                    )}
                </div>
            </section>
        ) : (
            <p className="text-sm text-text-3">La marca quedó creada sin acceso para el cliente. Cuando quieras dárselo, ábrela y usa "Agregar usuario" en su resumen.</p>
        )}
        <section>
            <h3 className="text-sm font-bold text-white mb-2">Lo que sigue</h3>
            <ol className="space-y-2">
                {NEXT.map(([tag, text], i) => (
                    <li key={tag} className="flex items-center gap-3 text-sm">
                        <span className="w-6 h-6 rounded-full bg-raised text-text-2 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                        <span className="text-text-2 flex-1">{text}</span>
                        {tag.startsWith('/') && <code className="text-xs text-text-3 bg-raised rounded-md px-1.5 py-0.5">{tag}</code>}
                    </li>
                ))}
            </ol>
        </section>
    </div>
);

export default NewClientWizard;
