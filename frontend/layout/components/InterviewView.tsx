/**
 * InterviewView - "Ficha de tu negocio"
 *
 * First visit: the interview form. Once submitted it becomes a read-only profile
 * the client can update; after an update it warns which modules (Voz de marca,
 * Estrategia) were generated from the previous version and are now out of date.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Pencil, ArrowLeft, Building2, Users, Lightbulb, Share2, Target, FileSpreadsheet } from 'lucide-react';
import { MultiStepForm } from '../entrevista/components/MultiStepForm';
import { AnimatedHeaderCard } from './AnimatedHeaderCard';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../services/api';
import { LoadingBlock, NoClientSelected } from './content/ContentPieceUI';

export const InterviewView: React.FC<{ onNavigate?: (view: string) => void; clientId?: string }> = ({ onNavigate, clientId: clientIdProp }) => {
    const { user } = useAuth();
    const clientId = clientIdProp || user?.fichaClienteId;
    const [record, setRecord] = useState<api.InterviewRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);

    const load = useCallback(async () => {
        if (!clientId) { setLoading(false); return; }
        setLoading(true);
        try {
            setRecord(await api.getInterview(clientId));
        } catch (e) {
            console.error('Error loading interview:', e);
            setRecord(null);
        } finally {
            setLoading(false);
        }
    }, [clientId]);

    useEffect(() => { load(); }, [load]);

    const hasData = !!record?.data && Object.keys(record.data).length > 0;
    const showForm = editing || (!loading && !hasData);

    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar">
            <div className="max-w-7xl mx-auto">
                <AnimatedHeaderCard
                    supertitle="Tu marca"
                    title={hasData ? 'Ficha de tu negocio' : 'Entrevista'}
                    subtitle={hasData ? 'Lo que Pixely sabe de tu negocio. Todo lo demás parte de aquí.' : 'Cuéntanos de tu negocio: es la base de todo lo que haremos.'}
                />

                {!clientId ? <NoClientSelected /> : loading ? <LoadingBlock /> : showForm ? (
                    <>
                        {editing && (
                            <button onClick={() => setEditing(false)} className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-gray-900">
                                <ArrowLeft size={16} /> Volver a la ficha sin guardar
                            </button>
                        )}
                        <MultiStepForm editMode={editing} onSaved={() => { setEditing(false); load(); }} />
                    </>
                ) : (
                    <Ficha record={record!} onEdit={() => setEditing(true)} onNavigate={onNavigate} />
                )}
            </div>
        </div>
    );
};

// --- The profile ---

const AUDIENCE_LABELS: [string, string][] = [
    ['ageRange', 'Edad'], ['gender', 'Género'], ['location', 'Ubicación'], ['occupation', 'Ocupación'],
    ['maritalStatus', 'Estado civil'], ['interests', 'Intereses'], ['values', 'Valores'], ['painPoints', 'Dolores'],
    ['desires', 'Deseos'], ['lifestyle', 'Estilo de vida'], ['incomeLevel', 'Ingresos'], ['priceSensitivity', 'Sensibilidad al precio'],
    ['spendingHabits', 'Hábitos de gasto'], ['frequency', 'Frecuencia de compra'], ['loyalty', 'Lealtad'],
    ['decisionRole', 'Rol en la decisión'], ['usage', 'Uso del producto'],
];

const MODULE_VIEW: Record<api.DownstreamModule['modulo'], string> = { manual: 'brand', estrategia: 'strategy' };

const Ficha: React.FC<{ record: api.InterviewRecord; onEdit: () => void; onNavigate?: (view: string) => void }> = ({ record, onEdit, onNavigate }) => {
    const d = record.data;
    const stale = (record.downstream ?? []).filter((m) => m.desactualizado);
    const fecha = (iso?: string | null) => iso ? new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">{d.businessName || 'Tu negocio'}</h2>
                    {record.updated_at && <p className="text-sm text-gray-500">Actualizada el {fecha(record.updated_at)}</p>}
                </div>
                <button onClick={onEdit} className="flex items-center gap-2 px-5 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors">
                    <Pencil size={16} /> Actualizar ficha
                </button>
            </div>

            {stale.length > 0 && (
                <div className="flex gap-3 p-5 rounded-2xl bg-amber-50 border border-amber-200" role="status">
                    <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                    <div className="text-sm text-gray-800">
                        <p className="font-bold mb-1">
                            {stale.length === 1 ? 'Una parte de tu marca se basa' : 'Algunas partes de tu marca se basan'} en la versión anterior de esta ficha
                        </p>
                        <ul className="space-y-0.5 mb-2">
                            {stale.map((m) => (
                                <li key={m.modulo}>
                                    {onNavigate ? (
                                        <button onClick={() => onNavigate(MODULE_VIEW[m.modulo])} className="font-semibold underline underline-offset-2">{m.nombre}</button>
                                    ) : <span className="font-semibold">{m.nombre}</span>}
                                    <span className="text-gray-500"> · generado el {fecha(m.generado_at)}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600">El equipo de Pixely puede regenerarlos con tus datos nuevos. El plan y el copy de los próximos meses ya usarán esta versión.</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Section icon={Building2} title="Negocio y productos">
                    <Text label="Historia" value={d.history} />
                    <Chips label="Diferenciadores" items={d.differentiator} />
                    <Text label="Visión" value={d.vision} />
                    {d.attached_file_name && (
                        <p className="flex items-center gap-2 text-sm text-gray-600"><FileSpreadsheet size={15} className="text-gray-400" /> Catálogo: {d.attached_file_name}</p>
                    )}
                </Section>

                <Section icon={Users} title="Tu cliente">
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                        {AUDIENCE_LABELS.filter(([k]) => d.audience?.[k]).map(([k, label]) => (
                            <div key={k}>
                                <dt className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</dt>
                                <dd className="text-sm text-gray-800">{String(d.audience[k])}</dd>
                            </div>
                        ))}
                    </dl>
                </Section>

                <Section icon={Lightbulb} title="Mercado">
                    <Text label="Rango de precios" value={d.market?.priceRange} />
                    <Text label="Promociones" value={d.market?.promotions} />
                    <Chips label="Canales de venta" items={d.market?.channels} />
                    <Chips label="Lo que más se vende" items={d.market?.bestSellers} />
                    <Chips label="Lo que menos se vende" items={d.market?.worstSellers} />
                    <Chips label="Competidores" items={d.market?.competitors} />
                </Section>

                <Section icon={Share2} title="Situación actual">
                    {(d.brand?.socialNetworks ?? []).length > 0 && (
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Redes</p>
                            <ul className="text-sm text-gray-800 space-y-0.5">
                                {d.brand.socialNetworks.map((n: any, i: number) => (
                                    <li key={i}>{typeof n === 'string' ? n : `${n.platform}${n.frequency ? ` · ${n.frequency}` : ''}`}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <Text label="Quién maneja las redes" value={d.brand?.socialManager} />
                    <Text label="Experiencia con publicidad" value={d.brand?.adsExperience} />
                    <Chips label="Contenido que mejor funciona" items={d.brand?.bestContent} />
                    <Text label="Malas experiencias" value={d.brand?.badExperiences} />
                </Section>

                <Section icon={Target} title="Objetivos" className="lg:col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Chips label="Ventas" items={d.goals?.salesGoals} />
                        <Chips label="Marca" items={d.goals?.brandGoals} />
                        <Chips label="Crecimiento" items={d.goals?.growthStrategy} />
                        <Chips label="Posicionamiento" items={d.goals?.positioning} />
                    </div>
                </Section>
            </div>
        </div>
    );
};

const Section: React.FC<{ icon: React.ElementType; title: string; className?: string; children: React.ReactNode }> = ({ icon: Icon, title, className = '', children }) => (
    <section className={`bg-white rounded-3xl border border-gray-100 shadow-sm p-6 ${className}`}>
        <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-4"><Icon size={18} className="text-primary-600" />{title}</h3>
        <div className="space-y-4">{children}</div>
    </section>
);

const Text: React.FC<{ label: string; value?: string }> = ({ label, value }) => value ? (
    <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">{label}</p>
        <p className="text-sm text-gray-800 whitespace-pre-line">{value}</p>
    </div>
) : null;

const Chips: React.FC<{ label: string; items?: unknown }> = ({ label, items }) => {
    const list = Array.isArray(items) ? items.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : [];
    if (list.length === 0) return null;
    return (
        <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">{label}</p>
            <div className="flex flex-wrap gap-1.5">
                {list.map((x) => <span key={x} className="text-sm bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1 text-gray-700">{x}</span>)}
            </div>
        </div>
    );
};

export default InterviewView;
