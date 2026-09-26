import React, { useEffect, useState } from 'react';
import { useStudio } from '../../../contexts/StudioContext';
import { getPendingTasks, PendingTaskForGeneration } from '../../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    CalendarCheck, ArrowRight, ArrowLeft, Loader2, AlertTriangle,
    CheckCircle2, Clock, Image, FileText, Target, ListChecks
} from 'lucide-react';

const FORMAT_ICONS: Record<string, string> = {
    'post': '📸',
    'story': '📱',
    'reel': '🎬',
    'cover': '🖼️',
    'portrait': '🖼️',
    'landscape': '🌅',
};

export const TaskSelectorStep: React.FC = () => {
    const { state, dispatch } = useStudio();
    const [tasks, setTasks] = useState<PendingTaskForGeneration[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load pending tasks
    useEffect(() => {
        if (!state.clientId) return;

        const loadTasks = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const result = await getPendingTasks(state.clientId);
                // Ensure result.tasks is an array
                setTasks(Array.isArray(result.tasks) ? result.tasks : []);
            } catch (err) {
                console.error('Error loading tasks:', err);
                setError('Error cargando tareas pendientes');
                setTasks([]); // Fallback
            } finally {
                setIsLoading(false);
            }
        };
        loadTasks();
    }, [state.clientId]);

    const handleSelectTask = (task: PendingTaskForGeneration) => {
        dispatch({ 
            type: 'SET_TASK', 
            payload: { 
                taskId: task.id, 
                taskData: task 
            } 
        });
    };

    const selectedTask = tasks.find(t => t.id === state.taskId);
    const canProceed = state.taskId !== '';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 pb-24"
        >
            {/* HEADER */}
            <div className="bg-white/60 backdrop-blur-md rounded-3xl p-8 border border-white/50 shadow-xl shadow-orange-50/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-orange-100/50 to-transparent rounded-bl-full pointer-events-none" />
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-tr from-orange-500 to-amber-600 rounded-xl flex items-center justify-center text-white">
                            <CalendarCheck size={20} />
                        </div>
                        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                            Seleccionar Publicación
                        </h2>
                    </div>
                    <p className="text-gray-600 max-w-2xl text-lg leading-relaxed">
                        <strong className="text-orange-700">Paso obligatorio:</strong> Selecciona la tarea de tu calendario 
                        de planificación para la cual generarás la imagen. Esto cierra el círculo 
                        <span className="text-gray-900 font-semibold"> Entrevista → Estrategia → Plan → Imagen</span>.
                    </p>
                </div>
            </div>

            {/* IMPORTANT NOTICE */}
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 flex items-start gap-4">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <AlertTriangle size={20} className="text-amber-600" />
                </div>
                <div>
                    <h4 className="font-bold text-amber-800 mb-1">¿Por qué es obligatorio?</h4>
                    <p className="text-amber-700 text-sm leading-relaxed">
                        Cada imagen generada está vinculada a una tarea específica del plan de contenido. 
                        Esto asegura que el contexto estratégico (hook, elementos clave, dos/donts) 
                        guíe la generación y que puedas marcar la tarea como completada al aprobar la imagen.
                    </p>
                </div>
            </div>

            {/* TASKS LIST */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Clock size={18} className="text-orange-500" />
                        Tareas Pendientes de Imagen
                        {!isLoading && (
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold">
                                {tasks.length}
                            </span>
                        )}
                    </h3>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="animate-spin text-orange-500" size={40} />
                    </div>
                ) : error ? (
                    <div className="p-8 text-center text-red-600">
                        <AlertTriangle size={40} className="mx-auto mb-2" />
                        <p>{error}</p>
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="p-12 text-center">
                        <CheckCircle2 size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-lg font-medium text-gray-600">¡Todas las tareas tienen imagen!</p>
                        <p className="text-sm text-gray-400 mt-1">
                            Crea nuevas tareas en Planificación para generar más imágenes.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                        {tasks.map(task => (
                            <motion.button
                                key={task.id}
                                onClick={() => handleSelectTask(task)}
                                className={`w-full p-5 text-left transition-all hover:bg-orange-50/50 ${
                                    state.taskId === task.id
                                        ? 'bg-orange-100 border-l-4 border-orange-500'
                                        : ''
                                }`}
                                whileHover={{ x: 4 }}
                            >
                                <div className="flex items-start gap-4">
                                    {/* Format Icon */}
                                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                                        {FORMAT_ICONS[task.format] || '📸'}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-bold text-gray-900 truncate">
                                                {task.title}
                                            </h4>
                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium uppercase">
                                                {task.format}
                                            </span>
                                        </div>

                                        {task.selected_hook && (
                                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                                <span className="font-medium text-orange-600">Hook:</span> {task.selected_hook}
                                            </p>
                                        )}

                                        {task.key_elements && task.key_elements.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mb-2">
                                                {task.key_elements.slice(0, 3).map((el, idx) => (
                                                    <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                                                        {el}
                                                    </span>
                                                ))}
                                                {task.key_elements.length > 3 && (
                                                    <span className="text-xs text-gray-400">+{task.key_elements.length - 3} más</span>
                                                )}
                                            </div>
                                        )}

                                        {task.execution_date && (
                                            <p className="text-xs text-gray-400">
                                                📅 {new Date(task.execution_date).toLocaleDateString('es-ES', { 
                                                    weekday: 'short', 
                                                    day: 'numeric', 
                                                    month: 'short' 
                                                })}
                                            </p>
                                        )}
                                    </div>

                                    {/* Selection indicator */}
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                        state.taskId === task.id
                                            ? 'bg-orange-500 border-orange-500 text-white'
                                            : 'border-gray-300'
                                    }`}>
                                        {state.taskId === task.id && <CheckCircle2 size={14} />}
                                    </div>
                                </div>
                            </motion.button>
                        ))}
                    </div>
                )}
            </div>

            {/* SELECTED TASK DETAILS */}
            <AnimatePresence>
                {selectedTask && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-white/80 backdrop-blur-sm rounded-2xl border border-orange-200 shadow-lg overflow-hidden"
                    >
                        <div className="p-6">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Target size={18} className="text-orange-500" />
                                Contexto que guiará la generación
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {selectedTask.selected_hook && (
                                    <div className="bg-orange-50 rounded-xl p-4">
                                        <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-1">Hook</p>
                                        <p className="text-gray-900 font-medium">{selectedTask.selected_hook}</p>
                                    </div>
                                )}

                                {selectedTask.strategic_purpose && (
                                    <div className="bg-blue-50 rounded-xl p-4">
                                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Propósito Estratégico</p>
                                        <p className="text-gray-900 font-medium">{selectedTask.strategic_purpose}</p>
                                    </div>
                                )}

                                {selectedTask.dos && selectedTask.dos.length > 0 && (
                                    <div className="bg-emerald-50 rounded-xl p-4">
                                        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">✅ Incluir</p>
                                        <ul className="space-y-1">
                                            {selectedTask.dos.map((item, idx) => (
                                                <li key={idx} className="text-sm text-gray-700">• {item}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {selectedTask.donts && selectedTask.donts.length > 0 && (
                                    <div className="bg-red-50 rounded-xl p-4">
                                        <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">❌ Evitar</p>
                                        <ul className="space-y-1">
                                            {selectedTask.donts.map((item, idx) => (
                                                <li key={idx} className="text-sm text-gray-700">• {item}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* Custom prompt addition */}
                            <div className="mt-6">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Instrucciones adicionales (opcional)
                                </label>
                                <textarea
                                    value={state.customPrompt}
                                    onChange={(e) => dispatch({ type: 'SET_CUSTOM_PROMPT', payload: e.target.value })}
                                    placeholder="Añade detalles extra que quieras incluir en la imagen..."
                                    rows={3}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 resize-none"
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* NAVIGATION */}
            <div className="fixed bottom-8 right-8 z-40 flex gap-3">
                <button
                    onClick={() => dispatch({ type: 'PREV_STEP' })}
                    className="px-6 py-4 bg-white rounded-2xl font-bold text-gray-700 flex items-center gap-2 shadow-xl hover:bg-gray-50 transition-all"
                >
                    <ArrowLeft size={18} />
                    Atrás
                </button>
                <button
                    onClick={() => dispatch({ type: 'NEXT_STEP' })}
                    disabled={!canProceed}
                    className={`px-8 py-4 rounded-2xl font-bold text-lg flex items-center gap-3 transition-all shadow-2xl ${
                        canProceed
                            ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:scale-105'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                >
                    Continuar
                    <ArrowRight size={20} />
                </button>
            </div>
        </motion.div>
    );
};
