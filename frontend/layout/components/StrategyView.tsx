import React, { useEffect, useState } from 'react';
import { Check, Loader2, MessageSquareWarning, Sparkles } from 'lucide-react';
import { AnimatedHeaderCard } from './AnimatedHeaderCard';
import StrategyMap from '../estrategia/App';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../services/api';

const ESTADO_META: Record<api.EstrategiaEstado, { label: string; color: string; icon: React.ElementType }> = {
    Pendiente: { label: 'Por revisar', color: '#fab219', icon: Sparkles },
    'Cambios solicitados': { label: 'Cambios pedidos', color: '#ec835a', icon: MessageSquareWarning },
    Aprobada: { label: 'Aprobada', color: '#0ca30c', icon: Check },
};

export const StrategyView: React.FC<{ onNavigate: (view: string) => void }> = () => {
    const { user } = useAuth();
    const clientId = localStorage.getItem('clientId') || user?.fichaClienteId || null;
    const [review, setReview] = useState<api.StrategyReview | null>(null);
    const [hasStrategy, setHasStrategy] = useState(false);

    useEffect(() => {
        if (!clientId) return;
        let cancelled = false;
        Promise.all([api.getStrategy(clientId), api.getStrategyReview(clientId)])
            .then(([nodes, r]) => { if (!cancelled) { setHasStrategy(nodes.length > 0); setReview(r); } })
            .catch((e) => console.error('Error loading strategy review:', e));
        return () => { cancelled = true; };
    }, [clientId]);

    return (
        <div className='p-4 md:p-8 h-full overflow-y-auto custom-scrollbar animate-fade-in-up bg-brand-bg'>
            <div className="max-w-7xl mx-auto space-y-6">

                <AnimatedHeaderCard
                    supertitle="Tu marca"
                    title="Estrategia"
                    subtitle="Qué quiere lograr tu negocio, cómo lo haremos y con qué contenido."
                />

                {clientId && hasStrategy && review && <StrategyReviewBar clientId={clientId} review={review} onChange={setReview} />}

                {/* Strategy Map Module */}
                <div className='h-[600px] rounded-[30px] overflow-hidden border border-gray-200 shadow-sm bg-white'>
                    <StrategyMap />
                </div>
            </div>
        </div>
    );
};

// --- Approval, the same gesture as Voz de marca ---

const StrategyReviewBar: React.FC<{ clientId: string; review: api.StrategyReview; onChange: (r: api.StrategyReview) => void }> = ({ clientId, review, onChange }) => {
    const meta = ESTADO_META[review.estado];
    const [asking, setAsking] = useState(false);
    const [comment, setComment] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (next: 'Aprobada' | 'Cambios solicitados') => {
        if (next === 'Cambios solicitados' && !comment.trim()) { setError('Cuéntanos qué cambiarías.'); return; }
        setSaving(true); setError(null);
        try {
            onChange(await api.reviewStrategy(clientId, next, next === 'Cambios solicitados' ? comment.trim() : undefined));
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
                    <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-semibold text-gray-800 shrink-0" style={{ background: `${meta.color}1F` }}>
                        <meta.icon size={15} style={{ color: meta.color }} strokeWidth={2.5} /> {meta.label}
                    </span>
                    <p className="text-sm text-gray-500">
                        {review.estado === 'Aprobada'
                            ? `Aprobada${review.revisada_at ? ` el ${new Date(review.revisada_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })}` : ''}. Planificamos cada mes con esta estrategia.`
                            : review.estado === 'Cambios solicitados'
                                ? 'El equipo está ajustando tu estrategia con tus comentarios.'
                                : '¿Es esto lo que tu negocio quiere lograr? Apruébala o dinos qué cambiar.'}
                    </p>
                </div>
                <div className="flex gap-2">
                    {!asking && (
                        <button onClick={() => setAsking(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50">
                            <MessageSquareWarning size={15} /> Pedir cambios
                        </button>
                    )}
                    {review.estado !== 'Aprobada' && !asking && (
                        <button onClick={() => submit('Aprobada')} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-bold shadow-lg shadow-pink-500/20 disabled:opacity-60">
                            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Aprobar
                        </button>
                    )}
                </div>
            </div>

            {review.comentario && !asking && (
                <p className="mt-3 text-sm text-gray-600 italic border-l-2 border-orange-200 pl-3">“{review.comentario}”</p>
            )}

            {asking && (
                <div className="mt-4 space-y-3">
                    <label htmlFor="strategy-comment" className="text-sm font-bold text-gray-800">¿Qué cambiarías?</label>
                    <textarea id="strategy-comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} autoFocus
                        placeholder="Ej. Lo más urgente para nosotros es vender delivery, no llenar el local…"
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
