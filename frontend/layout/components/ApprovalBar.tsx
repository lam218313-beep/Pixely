import React, { useState } from 'react';
import { Check, Loader2, MessageSquareWarning, Sparkles } from 'lucide-react';

/** The client's approve / ask-for-changes gesture, shared by the pages they sign off on. */
export interface ApprovalState {
    estado: 'Pendiente' | 'Cambios solicitados' | string;
    comentario: string | null;
    revisada_at: string | null;
}

const META = {
    Pendiente: { label: 'Por revisar', color: '#fab219', icon: Sparkles },
    'Cambios solicitados': { label: 'Cambios pedidos', color: '#ec835a', icon: MessageSquareWarning },
    approved: { label: '', color: '#0ca30c', icon: Check },
};

export const ApprovalBar: React.FC<{
    review: ApprovalState;
    approvedValue: string;            // 'Aprobada' | 'Aprobado'
    texts: { pending: string; changes: string; approved: string; placeholder: string };
    onSubmit: (estado: string, comentario?: string) => Promise<void>;
}> = ({ review, approvedValue, texts, onSubmit }) => {
    const approved = review.estado === approvedValue;
    const meta = approved ? { ...META.approved, label: approvedValue } : META[review.estado as 'Pendiente' | 'Cambios solicitados'] ?? META.Pendiente;
    const [asking, setAsking] = useState(false);
    const [comment, setComment] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (next: string) => {
        const changes = next === 'Cambios solicitados';
        if (changes && !comment.trim()) { setError('Cuéntanos qué cambiarías.'); return; }
        setSaving(true); setError(null);
        try {
            await onSubmit(next, changes ? comment.trim() : undefined);
            setAsking(false); setComment('');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo guardar');
        } finally {
            setSaving(false);
        }
    };

    const date = review.revisada_at ? ` el ${new Date(review.revisada_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })}` : '';

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-semibold text-gray-800 shrink-0" style={{ background: `${meta.color}1F` }}>
                        <meta.icon size={15} style={{ color: meta.color }} strokeWidth={2.5} /> {meta.label}
                    </span>
                    <p className="text-sm text-gray-500">
                        {approved ? `${approvedValue}${date}. ${texts.approved}` : review.estado === 'Cambios solicitados' ? texts.changes : texts.pending}
                    </p>
                </div>
                <div className="flex gap-2">
                    {!asking && (
                        <button onClick={() => setAsking(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50">
                            <MessageSquareWarning size={15} /> Pedir cambios
                        </button>
                    )}
                    {!approved && !asking && (
                        <button onClick={() => submit(approvedValue)} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-bold shadow-lg shadow-pink-500/20 disabled:opacity-60">
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
                    <label htmlFor="approval-comment" className="text-sm font-bold text-gray-800">¿Qué cambiarías?</label>
                    <textarea id="approval-comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} autoFocus placeholder={texts.placeholder}
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
