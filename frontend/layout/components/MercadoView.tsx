/**
 * MercadoView - Fase Mercado
 *
 * Muestra el estudio de mercado fundacional y los hallazgos competitivos
 * recurrentes. Es una vista de solo lectura: el estudio y el escaneo se
 * generan a mano desde Claude Desktop (lam218313-beep/Pixely_Automatizaciones),
 * nunca desde esta pantalla.
 */

import React, { useEffect, useState } from 'react';
import {
    Radar, Building2, FileText, MapPin, TrendingUp,
    ExternalLink, Loader2, ShieldCheck, ShieldAlert, ShieldQuestion
} from 'lucide-react';
import { AnimatedHeaderCard } from './AnimatedHeaderCard';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../services/api';

const CONFIANZA_STYLES: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
    Alta: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', icon: ShieldCheck },
    Media: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: ShieldAlert },
    Baja: { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-500', icon: ShieldQuestion },
};

const CLUSTER_LABELS: Record<string, string> = {
    Problema: 'Problema / Fricción',
    Identidad: 'Identidad / Conexión',
    Prueba: 'Prueba / Conversión',
};

export const MercadoView: React.FC<{ onNavigate?: (view: string) => void }> = () => {
    const { user } = useAuth();
    const clientId = user?.fichaClienteId;

    const [loading, setLoading] = useState(true);
    const [study, setStudy] = useState<api.MarketStudy | null>(null);
    const [findings, setFindings] = useState<api.MarketFinding[]>([]);

    useEffect(() => {
        if (!clientId) return;
        let cancelled = false;

        (async () => {
            setLoading(true);
            try {
                const [studyResult, findingsResult] = await Promise.all([
                    api.getMarketStudy(clientId),
                    api.getMarketFindings(clientId),
                ]);
                if (!cancelled) {
                    setStudy(studyResult);
                    setFindings(findingsResult);
                }
            } catch (error) {
                console.error('Error loading market data:', error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [clientId]);

    const competidores = study?.universo_competidores?.listado ?? [];
    const totalDetectado = study?.universo_competidores?.total_detectado_maps;
    const totalRelevante = study?.universo_competidores?.total_relevante_filtrado;

    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar animate-fade-in-up bg-brand-bg">
            <div className="max-w-7xl mx-auto">
                <AnimatedHeaderCard
                    supertitle="Inteligencia de Mercado"
                    title="Mercado"
                    subtitle="Estudio fundacional y vigilancia competitiva continua."
                />

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="animate-spin text-gray-300" size={40} />
                    </div>
                ) : !study ? (
                    <EmptyState />
                ) : (
                    <>
                        {/* Resumen del estudio */}
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-6">
                            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                                <div>
                                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                                        <MapPin size={14} />
                                        <span>{study.ciudad || 'Ciudad no especificada'}</span>
                                        <span>·</span>
                                        <span>{study.rubro || 'Rubro no especificado'}</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900">Estudio de mercado fundacional</h3>
                                    {study.fecha_estudio && (
                                        <p className="text-sm text-gray-500 mt-0.5">
                                            Realizado el {new Date(study.fecha_estudio).toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </p>
                                    )}
                                </div>
                                {study.pdf_url && (
                                    <a
                                        href={study.pdf_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-5 py-3 bg-gray-900 text-white font-bold rounded-2xl hover:bg-gray-800 transition-colors shrink-0"
                                    >
                                        <FileText size={18} />
                                        Ver informe completo
                                        <ExternalLink size={14} />
                                    </a>
                                )}
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                <StatCard
                                    icon={Building2}
                                    label="Competidores mapeados"
                                    value={totalRelevante ?? competidores.length}
                                    sublabel={totalDetectado ? `de ${totalDetectado} detectados en total` : undefined}
                                />
                                <StatCard
                                    icon={TrendingUp}
                                    label="Dossier profundo"
                                    value={study.dossier_profundo?.length ?? 0}
                                    sublabel="competidores analizados a fondo"
                                />
                                <StatCard
                                    icon={Radar}
                                    label="Hallazgos de vigilancia"
                                    value={findings.length}
                                    sublabel="del escaneo recurrente"
                                />
                            </div>

                            {study.tamano_mercado?.cruce_de_metodos && (
                                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Tamaño de mercado</p>
                                    <p className="text-sm text-gray-700">{study.tamano_mercado.cruce_de_metodos}</p>
                                </div>
                            )}
                        </div>

                        {/* Listado de competidores */}
                        {competidores.length > 0 && (
                            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Competidores mapeados</h3>
                                <div className="space-y-2">
                                    {competidores.map((c, i) => (
                                        <div key={c.place_id || i} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                                            <div className="min-w-0">
                                                <p className="font-bold text-gray-900 truncate">{c.nombre}</p>
                                                <p className="text-xs text-gray-500 truncate">{c.categoria} {c.direccion ? `· ${c.direccion}` : ''}</p>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0 ml-4">
                                                {typeof c.rating === 'number' && (
                                                    <span className="text-sm font-bold text-amber-600">★ {c.rating}</span>
                                                )}
                                                {c.website && (
                                                    <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600">
                                                        <ExternalLink size={16} />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Hallazgos recurrentes */}
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Vigilancia competitiva</h3>
                            {findings.length === 0 ? (
                                <p className="text-sm text-gray-500">Todavía no hay hallazgos del escaneo mensual.</p>
                            ) : (
                                <div className="space-y-3">
                                    {findings.map((f) => {
                                        const style = CONFIANZA_STYLES[f.confianza || 'Baja'];
                                        const Icon = style.icon;
                                        return (
                                            <div key={f.id} className={`p-4 rounded-2xl border ${style.bg}`}>
                                                <div className="flex items-start justify-between gap-4 mb-2">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {f.cluster && (
                                                            <span className="text-xs font-bold text-gray-500 uppercase">
                                                                {CLUSTER_LABELS[f.cluster] || f.cluster}
                                                            </span>
                                                        )}
                                                        {f.competidor && (
                                                            <span className="text-xs bg-white px-2 py-0.5 rounded-full border border-gray-200 text-gray-600">
                                                                {f.competidor}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className={`flex items-center gap-1 text-xs font-bold ${style.text} shrink-0`}>
                                                        <Icon size={14} />
                                                        {f.confianza}
                                                    </div>
                                                </div>
                                                <p className="font-bold text-gray-900 mb-1">{f.tema}</p>
                                                <p className="text-sm text-gray-700">{f.dato_o_angulo}</p>
                                                {f.evidencia && (
                                                    <p className="text-xs text-gray-500 italic mt-2">"{f.evidencia}"</p>
                                                )}
                                                <div className="flex items-center justify-between mt-3">
                                                    <span className="text-xs text-gray-400">
                                                        {f.fuente} · {new Date(f.fecha).toLocaleDateString('es-PE')}
                                                    </span>
                                                    {f.link && (
                                                        <a href={f.link} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                                                            Ver fuente <ExternalLink size={12} />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const StatCard: React.FC<{ icon: React.ElementType; label: string; value: number | string; sublabel?: string }> = ({ icon: Icon, label, value, sublabel }) => (
    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
        <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Icon size={16} />
            <span className="text-xs font-bold uppercase">{label}</span>
        </div>
        <p className="text-2xl font-black text-gray-900">{value}</p>
        {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
    </div>
);

const EmptyState: React.FC = () => (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
            <Radar size={32} className="text-gray-300" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Tu estudio de mercado está en preparación</h3>
        <p className="text-sm text-gray-500 max-w-md">
            El equipo de Pixely está mapeando tu mercado y competencia. Cuando esté listo, verás aquí el estudio completo y los hallazgos de vigilancia competitiva.
        </p>
    </div>
);

export default MercadoView;
