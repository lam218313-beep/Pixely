import React, { useEffect, useState } from 'react';
import { useStudio } from '../../../contexts/StudioContext';
import { ToggleCard } from '../ui/ToggleCard';
import { getClients, Client, API_BASE_URL } from '../../../services/api';
import { Loader2, AlertCircle, ArrowRight, UserCircle2, BrainCircuit, Target } from 'lucide-react';
import { motion } from 'framer-motion';

export const KnowledgeInput: React.FC = () => {
    const { state, dispatch } = useStudio();
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoadingClients, setIsLoadingClients] = useState(true);
    const [isLoadingContext, setIsLoadingContext] = useState(false);
    const [clientError, setClientError] = useState<string | null>(null);

    // Fetch clients on mount
    useEffect(() => {
        const loadClients = async () => {
            try {
                const data = await getClients();
                setClients(data);
                if (data.length === 0) {
                    setClientError("No se encontraron clientes asociados a tu cuenta.");
                }
            } catch (error) {
                console.error("Failed to load clients", error);
                setClientError(`Error de conexión al cargar clientes (${API_BASE_URL}).`);
            } finally {
                setIsLoadingClients(false);
            }
        };
        loadClients();
    }, []);

    // Fetch context when client changes
    useEffect(() => {
        const loadContext = async () => {
            if (!state.clientId) return;

            setIsLoadingContext(true);
            try {
                const token = localStorage.getItem('pixely_access_token');
                // Use correct full URL from api.ts constants if available, or construct it carefully
                // Ensure API_BASE_URL doesn't end in slash to avoid double slash if needed, 
                // but usually it's fine.
                const response = await fetch(`${API_BASE_URL}/studio/context/${state.clientId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const result = await response.json();

                    // Flatten data for the reducer
                    const interviewBlocks = result.data.interviewBlocks.map((b: any) => ({ ...b, type: 'interview' }));
                    const analysisBlocks = result.data.analysisBlocks.map((b: any) => ({ ...b, type: 'analysis' }));
                    const brandBlocks = (result.data.brandBlocks || []).map((b: any) => ({ ...b, type: 'manual' }));

                    dispatch({
                        type: 'LOAD_CONTEXT_BLOCKS',
                        payload: [...interviewBlocks, ...analysisBlocks, ...brandBlocks]
                    });
                }
            } catch (error) {
                console.error("Failed to load context", error);
            } finally {
                setIsLoadingContext(false);
            }
        };

        loadContext();
    }, [state.clientId]);

    const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        dispatch({ type: 'SET_CLIENT', payload: e.target.value });
    };

    // Derived state for rendering
    const interviewBlocks = state.contextBlocks.filter(b => b.type === 'interview');
    const analysisBlocks = state.contextBlocks.filter(b => b.type === 'analysis');
    const brandBlocks = state.contextBlocks.filter(b => b.type === 'manual');

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 pb-24"
        >
            {/* INTRO SECTION */}
            <div className="bg-white/60 backdrop-blur-md rounded-3xl p-8 border border-white/50 shadow-xl shadow-indigo-50/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-100/50 to-transparent rounded-bl-full pointer-events-none" />
                <div className="relative z-10">
                    <h2 className="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">
                        Configuración del Contexto
                    </h2>
                    <p className="text-gray-600 max-w-2xl text-lg leading-relaxed">
                        Selecciona el cliente y define qué información estratégica debe conocer la IA antes de diseñar.
                        La calidad del output depende de la calidad del input.
                    </p>
                </div>
            </div>

            {/* CLIENT SELECTOR CARD (Hidden if taskData is present) */}
            {!state.taskData && (
                <div className="max-w-xl mx-auto bg-white rounded-2xl p-6 shadow-lg shadow-gray-200/50 border border-gray-100 transform transition-all hover:scale-[1.01]">
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                        <UserCircle2 size={18} className="text-primary-500" />
                        Cliente Activo
                    </label>

                    {isLoadingClients ? (
                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl text-gray-500">
                            <Loader2 className="animate-spin w-5 h-5 text-primary-500" />
                            <span className="text-sm font-medium">Sincronizando cartera de clientes...</span>
                        </div>
                    ) : clientError ? (
                        <div className="flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100">
                            <AlertCircle size={20} />
                            <span className="text-sm font-medium">{clientError}</span>
                        </div>
                    ) : (
                        <div className="relative">
                            <select
                                value={state.clientId}
                                onChange={handleClientChange}
                                className="w-full appearance-none bg-gray-50 hover:bg-white border border-gray-200 hover:border-primary-300 rounded-xl px-5 py-4 text-gray-900 font-semibold focus:ring-4 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all cursor-pointer shadow-sm text-base"
                            >
                                <option value="">-- Seleccionar Cliente --</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                <ArrowRight size={16} className="rotate-90" />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {state.clientId && (
                <div className="animate-fade-in-up">
                    {/* TASK DATA MODE */}
                    {state.taskData ? (
                        <div className="space-y-8">
                            {/* BRAND MANUAL SECTION (Task Mode) */}
                            {brandBlocks.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shadow-sm border border-orange-100">
                                            <AlertCircle size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900">Manual de Marca</h3>
                                            <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Identidad Core</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {brandBlocks.map(block => (
                                            <ToggleCard
                                                key={block.id}
                                                title={block.label}
                                                content={block.text}
                                                isSelected={block.selected}
                                                onToggle={() => dispatch({ type: 'TOGGLE_BLOCK', payload: { id: block.id } })}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* TASK SPECIFIC CONTEXT */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 pb-4 border-b border-gray-200">
                                    <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-xl shadow-lg shadow-purple-200">
                                        <Target size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-gray-900 font-black text-2xl">Contexto de Diseño</h3>
                                        <p className="text-gray-500 text-sm">Información extraída de la planificación de contenido</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Title & Format */}
                                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <ToggleCard
                                            title="📌 Título & Formato"
                                            content={`${state.taskData.title}\n(${state.taskData.format})`}
                                            isSelected={!state.excludedTaskFields.includes('title_format')}
                                            onToggle={() => dispatch({ type: 'TOGGLE_TASK_FIELD', payload: { field: 'title_format' } })}
                                        />
                                        <ToggleCard
                                            title="🎯 Propósito Estratégico"
                                            content={state.taskData.strategic_purpose || 'No definido'}
                                            isSelected={!state.excludedTaskFields.includes('strategic_purpose')}
                                            onToggle={() => dispatch({ type: 'TOGGLE_TASK_FIELD', payload: { field: 'strategic_purpose' } })}
                                        />
                                    </div>

                                    {/* Core Content */}
                                    {state.taskData.selected_hook && (
                                        <ToggleCard
                                            title="💡 Hook (Gancho)"
                                            content={state.taskData.selected_hook}
                                            isSelected={!state.excludedTaskFields.includes('selected_hook')}
                                            onToggle={() => dispatch({ type: 'TOGGLE_TASK_FIELD', payload: { field: 'selected_hook' } })}
                                        />
                                    )}

                                    {state.taskData.narrative_structure && (
                                        <ToggleCard
                                            title="📋 Estructura Narrativa"
                                            content={state.taskData.narrative_structure}
                                            isSelected={!state.excludedTaskFields.includes('narrative_structure')}
                                            onToggle={() => dispatch({ type: 'TOGGLE_TASK_FIELD', payload: { field: 'narrative_structure' } })}
                                        />
                                    )}

                                    {/* Lists */}
                                    {state.taskData.key_elements && state.taskData.key_elements.length > 0 && (
                                        <ToggleCard
                                            title="✓ Elementos Visuales Clave"
                                            content={state.taskData.key_elements.join('\n')}
                                            isSelected={!state.excludedTaskFields.includes('key_elements')}
                                            onToggle={() => dispatch({ type: 'TOGGLE_TASK_FIELD', payload: { field: 'key_elements' } })}
                                        />
                                    )}

                                    {state.taskData.dos && state.taskData.dos.length > 0 && (
                                        <ToggleCard
                                            title="✅ Do's (Qué incluir)"
                                            content={state.taskData.dos.join('\n')}
                                            isSelected={!state.excludedTaskFields.includes('dos')}
                                            onToggle={() => dispatch({ type: 'TOGGLE_TASK_FIELD', payload: { field: 'dos' } })}
                                        />
                                    )}

                                    {state.taskData.donts && state.taskData.donts.length > 0 && (
                                        <ToggleCard
                                            title="❌ Don'ts (Qué evitar)"
                                            content={state.taskData.donts.join('\n')}
                                            isSelected={!state.excludedTaskFields.includes('donts')}
                                            onToggle={() => dispatch({ type: 'TOGGLE_TASK_FIELD', payload: { field: 'donts' } })}
                                        />
                                    )}

                                    {state.taskData.copy_suggestion && (
                                        <ToggleCard
                                            title="✍️ Sugerencia de Copy"
                                            content={state.taskData.copy_suggestion}
                                            isSelected={!state.excludedTaskFields.includes('copy_suggestion')}
                                            onToggle={() => dispatch({ type: 'TOGGLE_TASK_FIELD', payload: { field: 'copy_suggestion' } })}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        // STANDARD MODE (Interview + Analysis)
                        isLoadingContext ? (
                            <div className="h-48 flex flex-col items-center justify-center gap-4 bg-white/40 rounded-3xl border border-dashed border-gray-300">
                                <div className="p-4 bg-white rounded-full shadow-lg">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                                </div>
                                <p className="text-gray-500 font-medium animate-pulse">Analizando cerebro de la marca...</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* COLUMN 1: INTERVIEW */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                                            <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                                                <UserCircle2 size={16} />
                                            </div>
                                            <h3 className="text-gray-900 font-bold text-lg">Datos de Ficha</h3>
                                        </div>

                                        <div className="space-y-4">
                                            {interviewBlocks.length > 0 ? (
                                                interviewBlocks.map(block => (
                                                    <ToggleCard
                                                        key={block.id}
                                                        title={block.label}
                                                        content={block.text}
                                                        isSelected={block.selected}
                                                        onToggle={() => dispatch({ type: 'TOGGLE_BLOCK', payload: { id: block.id } })}
                                                    />
                                                ))
                                            ) : (
                                                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 text-gray-500 flex flex-col items-center text-center gap-3">
                                                    <AlertCircle size={32} className="text-gray-300" />
                                                    <p className="text-sm">No se encontraron datos de entrevista inicial.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* COLUMN 2: STRATEGY */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                                            <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                                                <BrainCircuit size={16} />
                                            </div>
                                            <h3 className="text-gray-900 font-bold text-lg">Estrategia & Pilares</h3>
                                        </div>

                                        <div className="space-y-4">
                                            {analysisBlocks.length > 0 ? (
                                                analysisBlocks.map(block => (
                                                    <ToggleCard
                                                        key={block.id}
                                                        title={block.label}
                                                        content={block.text}
                                                        isSelected={block.selected}
                                                        onToggle={() => dispatch({ type: 'TOGGLE_BLOCK', payload: { id: block.id } })}
                                                    />
                                                ))
                                            ) : (
                                                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 text-gray-500 flex flex-col items-center text-center gap-3">
                                                    <AlertCircle size={32} className="text-gray-300" />
                                                    <p className="text-sm">No hay análisis estratégico disponible todavía.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    )}

                    {/* MANUAL INPUT (Always visible) */}
                    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-200/50 mt-8">
                        <label className="block text-sm font-bold text-gray-700 mb-4 flex items-center justify-between">
                            <span>Contexto Adicional (Prompt System)</span>
                            <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-1 rounded-md">Opcional</span>
                        </label>
                        <textarea
                            value={state.customContext}
                            onChange={(e) => dispatch({ type: 'SET_CUSTOM_CONTEXT', payload: e.target.value })}
                            placeholder="Escribe aquí cualquier instrucción específica para esta sesión (ej: 'Enfocarse en la campaña de verano', 'Usar un tono más agresivo de lo habitual')..."
                            className="w-full h-32 bg-gray-50 hover:bg-white border border-gray-200 rounded-2xl p-5 text-gray-800 resize-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all placeholder-gray-400 text-base leading-relaxed"
                        />
                    </div>
                </div>
            )}

            {/* FLOATING NEXT BUTTON (Redesigned) */}
            <div className="fixed bottom-8 right-8 z-50">
                <button
                    onClick={() => dispatch({ type: 'NEXT_STEP' })}
                    disabled={!state.clientId}
                    className={`
                        flex items-center gap-3 px-6 py-4 rounded-full font-bold text-base transition-all shadow-2xl
                        ${state.clientId
                            ? 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white hover:shadow-primary-500/40 hover:scale-105 active:scale-95 ring-2 ring-white/20'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'}
                    `}
                >
                    <span className="hidden md:inline">Siguiente Paso</span>
                    <ArrowRight size={20} />
                </button>
            </div>
        </motion.div>
    );
};
