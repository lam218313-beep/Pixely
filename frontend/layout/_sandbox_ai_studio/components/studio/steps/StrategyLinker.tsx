import React from 'react';
import { useStudio } from '../../../contexts/StudioContext';
import { motion } from 'framer-motion';
import { Target, Lightbulb, Users, MessageSquare, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * Step 2: Strategy Linker
 * Shows the task data and strategy context that will be used for generation.
 * User can review and confirm the strategic direction.
 */
export const StrategyLinker: React.FC = () => {
    const { state, dispatch } = useStudio();
    const { taskData } = state;

    // If no task data, show empty state
    if (!taskData) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center h-96 text-center"
            >
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6">
                    <AlertCircle size={40} className="text-amber-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Sin Tarea Seleccionada</h3>
                <p className="text-gray-500 max-w-md mb-6">
                    Regresa al paso anterior y asegúrate de que la tarea esté correctamente cargada desde la Fábrica de Contenido.
                </p>
                <button
                    onClick={() => dispatch({ type: 'PREV_STEP' })}
                    className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all flex items-center gap-2"
                >
                    <ArrowLeft size={18} />
                    Volver al Paso 1
                </button>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 pb-24"
        >
            {/* Header */}
            <div className="bg-white/60 backdrop-blur-md rounded-3xl p-8 border border-white/50 shadow-xl shadow-indigo-50/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-purple-100/50 to-transparent rounded-bl-full pointer-events-none" />
                <div className="relative z-10">
                    <h2 className="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">
                        Contexto Estratégico
                    </h2>
                    <p className="text-gray-600 max-w-2xl text-lg leading-relaxed">
                        Revisa la información de la tarea que guiará la generación visual. 
                        Esta data proviene de tu planificación de contenido.
                    </p>
                </div>
            </div>

            {/* Task Overview Card */}
            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-gray-200/50 border border-gray-100">
                <div className="flex items-start gap-4 mb-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-200">
                        <Target size={28} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-900">{taskData.title}</h3>
                        <div className="flex items-center gap-3 mt-2">
                            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-bold">
                                {taskData.format}
                            </span>
                            {taskData.publish_date && (
                                <span className="text-gray-500 text-sm">
                                    📅 {new Date(taskData.publish_date).toLocaleDateString('es-ES', { 
                                        weekday: 'short', 
                                        day: 'numeric', 
                                        month: 'short' 
                                    })}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Strategic Purpose */}
                {taskData.strategic_purpose && (
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 mb-6 border border-purple-100">
                        <div className="flex items-center gap-2 mb-3">
                            <Lightbulb size={20} className="text-purple-600" />
                            <span className="font-bold text-purple-800 uppercase text-sm tracking-wider">Propósito Estratégico</span>
                        </div>
                        <p className="text-gray-700 leading-relaxed">{taskData.strategic_purpose}</p>
                    </div>
                )}

                {/* Grid of Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Hook */}
                    {taskData.selected_hook && (
                        <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xl">💡</span>
                                <span className="font-bold text-amber-800 text-sm uppercase tracking-wider">Hook Creativo</span>
                            </div>
                            <p className="text-gray-700 italic">"{taskData.selected_hook}"</p>
                        </div>
                    )}

                    {/* Narrative Structure */}
                    {taskData.narrative_structure && (
                        <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                            <div className="flex items-center gap-2 mb-2">
                                <MessageSquare size={18} className="text-blue-600" />
                                <span className="font-bold text-blue-800 text-sm uppercase tracking-wider">Estructura Narrativa</span>
                            </div>
                            <p className="text-gray-700 text-sm">{taskData.narrative_structure}</p>
                        </div>
                    )}

                    {/* Key Elements */}
                    {taskData.key_elements && taskData.key_elements.length > 0 && (
                        <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-100">
                            <div className="flex items-center gap-2 mb-3">
                                <CheckCircle2 size={18} className="text-emerald-600" />
                                <span className="font-bold text-emerald-800 text-sm uppercase tracking-wider">Elementos Visuales Clave</span>
                            </div>
                            <ul className="space-y-1">
                                {taskData.key_elements.map((el: string, idx: number) => (
                                    <li key={idx} className="text-gray-700 text-sm flex items-start gap-2">
                                        <span className="text-emerald-500 mt-1">•</span>
                                        {el}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Target Audience Hint */}
                    {taskData.audience_segment && (
                        <div className="bg-rose-50 rounded-xl p-5 border border-rose-100">
                            <div className="flex items-center gap-2 mb-2">
                                <Users size={18} className="text-rose-600" />
                                <span className="font-bold text-rose-800 text-sm uppercase tracking-wider">Segmento Objetivo</span>
                            </div>
                            <p className="text-gray-700 text-sm">{taskData.audience_segment}</p>
                        </div>
                    )}
                </div>

                {/* Do's and Don'ts */}
                {(taskData.dos?.length > 0 || taskData.donts?.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                        {taskData.dos?.length > 0 && (
                            <div className="bg-green-50 rounded-xl p-5 border border-green-200">
                                <h4 className="font-bold text-green-800 mb-3 flex items-center gap-2">
                                    <CheckCircle2 size={18} />
                                    DO's - Incluir
                                </h4>
                                <ul className="space-y-2">
                                    {taskData.dos.map((item: string, idx: number) => (
                                        <li key={idx} className="text-gray-700 text-sm flex items-start gap-2">
                                            <span className="text-green-500 font-bold">✓</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {taskData.donts?.length > 0 && (
                            <div className="bg-red-50 rounded-xl p-5 border border-red-200">
                                <h4 className="font-bold text-red-800 mb-3 flex items-center gap-2">
                                    <AlertCircle size={18} />
                                    DON'Ts - Evitar
                                </h4>
                                <ul className="space-y-2">
                                    {taskData.donts.map((item: string, idx: number) => (
                                        <li key={idx} className="text-gray-700 text-sm flex items-start gap-2">
                                            <span className="text-red-500 font-bold">✗</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Navigation Buttons */}
            <div className="fixed bottom-8 right-8 z-50 flex items-center gap-3">
                <button
                    onClick={() => dispatch({ type: 'PREV_STEP' })}
                    className="px-5 py-3 bg-white border border-gray-200 text-gray-700 rounded-full font-medium transition-all hover:bg-gray-50 shadow-lg flex items-center gap-2"
                >
                    <ArrowLeft size={18} />
                    <span className="hidden md:inline">Anterior</span>
                </button>
                <button
                    onClick={() => dispatch({ type: 'NEXT_STEP' })}
                    className="px-6 py-4 bg-gradient-to-r from-primary-600 to-indigo-600 text-white rounded-full font-bold transition-all hover:shadow-primary-500/40 hover:scale-105 active:scale-95 shadow-2xl ring-2 ring-white/20 flex items-center gap-3"
                >
                    <span className="hidden md:inline">Siguiente Paso</span>
                    <ArrowRight size={20} />
                </button>
            </div>
        </motion.div>
    );
};
