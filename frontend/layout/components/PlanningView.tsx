
import React, { useState } from 'react';
import {
    Calendar,
    Settings,
    Loader2,
    Save,
    CheckCircle2,
    FileText,
    Image as ImageIcon,
    Video,
    Instagram,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import * as api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
// "Diseñar en Estudio" (ImageGenerationModal/StudioContext) retired — image
// generation now happens in the local Magnific workflow, not in-app.

interface PlanningViewProps {
    clientId: string;
    onNavigate?: (view: string) => void;
}

const formatOptions = [
    { id: 'reel', label: 'Reel', icon: Video },
    { id: 'post', label: 'Post', icon: ImageIcon },
    { id: 'story', label: 'Story', icon: Instagram },
];

const PlanningView: React.FC<PlanningViewProps> = ({ clientId, onNavigate }) => {
    // Auth context for admin check
    const { user } = useAuth();

    // State for inputs
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-12
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());

    // ... (keep quotas, lists state same)
    const [quotas, setQuotas] = useState<api.Quotas>({
        photo: 4,
        video: 4,
        story: 12
    });

    // Process State
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedTasks, setGeneratedTasks] = useState<api.GeneratedTask[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Handlers
    const fetchExistingPlan = React.useCallback(async () => {
        if (!clientId) return;

        // Reset state when changing month filter
        setGeneratedTasks([]);
        setSaveSuccess(false);
        setError(null);

        try {
            const monthGroup = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
            const result = await api.getPlanningHistory(clientId, monthGroup);

            if (result.tasks && result.tasks.length > 0) {
                setGeneratedTasks(result.tasks);
                setSaveSuccess(true); // Treat existing stored plan as "saved"
            }
        } catch (e) {
            console.error("Failed to fetch history", e);
        }
    }, [clientId, selectedYear, selectedMonth]);

    React.useEffect(() => {
        fetchExistingPlan();
    }, [fetchExistingPlan]);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);
        setSaveSuccess(false);
        try {
            const result = await api.generateMonthlyPlan(clientId, selectedYear, selectedMonth, quotas);
            setGeneratedTasks(result.tasks);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Error al generar el plan");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
        if (generatedTasks.length === 0) return;
        setIsSaving(true);
        try {
            await api.saveMonthlyPlan(clientId, generatedTasks);
            setSaveSuccess(true);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Error al guardar el plan");
        } finally {
            setIsSaving(false);
        }
    };

    // Helper for Month Name
    const getMonthName = (m: number) => {
        const date = new Date();
        date.setMonth(m - 1);
        return date.toLocaleString('es-ES', { month: 'long' });
    };

    const incrementMonth = () => {
        if (selectedMonth === 12) {
            setSelectedMonth(1);
            setSelectedYear(prev => prev + 1);
        } else {
            setSelectedMonth(prev => prev + 1);
        }
    };

    const decrementMonth = () => {
        if (selectedMonth === 1) {
            setSelectedMonth(12);
            setSelectedYear(prev => prev - 1);
        } else {
            setSelectedMonth(prev => prev - 1);
        }
    };

    return (
        <div className="h-full bg-gray-50 flex flex-col overflow-hidden relative">
            {/* Header / Toolbar */}
            <div className="bg-white border-b border-gray-100 flex items-center justify-between px-8 py-5 shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-brand-primary/10 text-brand-primary rounded-xl flex items-center justify-center">
                        <Calendar size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Fábrica de Contenido</h2>
                        <p className="text-xs text-gray-500">Planificación Mensual Automática</p>
                    </div>
                </div>

                {/* Month Selector */}
                <div className="flex items-center bg-gray-100 rounded-xl p-1">
                    <button onClick={decrementMonth} className="p-2 hover:bg-white rounded-lg transition-all text-gray-500 hover:text-gray-900 hover:shadow-sm">
                        <ChevronLeft size={18} />
                    </button>
                    <div className="w-40 text-center font-bold text-gray-800 capitalize select-none">
                        {getMonthName(selectedMonth)} {selectedYear}
                    </div>
                    <button onClick={incrementMonth} className="p-2 hover:bg-white rounded-lg transition-all text-gray-500 hover:text-gray-900 hover:shadow-sm">
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* SETTINGS SIDEBAR */}
                <div className="w-80 bg-white border-r border-gray-100 p-6 flex flex-col overflow-y-auto">
                    <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Settings size={18} className="text-gray-400" />
                        Configuración del Mes
                    </h3>

                    <div className="space-y-6">
                        {/* Quota Inputs */}
                        <div className="space-y-4">
                            {/* ... Config inputs remain same ... */}
                            <div className="bg-gray-50 p-4 rounded-xl space-y-4 border border-gray-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-gray-700">
                                        <ImageIcon size={16} />
                                        <span className="text-sm font-medium">Posts / Carruseles</span>
                                    </div>
                                    <input
                                        type="number"
                                        min="0"
                                        max="30"
                                        value={quotas.photo}
                                        onChange={(e) => setQuotas({ ...quotas, photo: parseInt(e.target.value) || 0 })}
                                        className="w-16 text-center text-sm font-bold border-gray-200 rounded-lg focus:ring-brand-primary focus:border-brand-primary"
                                        disabled={saveSuccess}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-gray-700">
                                        <Video size={16} />
                                        <span className="text-sm font-medium">Reels / Video</span>
                                    </div>
                                    <input
                                        type="number"
                                        min="0"
                                        max="30"
                                        value={quotas.video}
                                        onChange={(e) => setQuotas({ ...quotas, video: parseInt(e.target.value) || 0 })}
                                        className="w-16 text-center text-sm font-bold border-gray-200 rounded-lg focus:ring-brand-primary focus:border-brand-primary"
                                        disabled={saveSuccess}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-gray-700">
                                        <Instagram size={16} />
                                        <span className="text-sm font-medium">Stories</span>
                                    </div>
                                    <input
                                        type="number"
                                        min="0"
                                        max="60"
                                        value={quotas.story}
                                        onChange={(e) => setQuotas({ ...quotas, story: parseInt(e.target.value) || 0 })}
                                        className="w-16 text-center text-sm font-bold border-gray-200 rounded-lg focus:ring-brand-primary focus:border-brand-primary"
                                        disabled={saveSuccess}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="p-4 bg-blue-50 text-blue-800 rounded-xl text-xs leading-relaxed">
                            Se generarán <strong>{quotas.photo + quotas.video + quotas.story} piezas</strong> de contenido alineadas con la estrategia activa.
                        </div>
                    </div>

                    <div className="mt-8 pt-6">
                        {saveSuccess ? (
                            <div className="p-4 bg-green-50 text-green-700 rounded-xl text-center border border-green-100">
                                <p className="font-bold text-sm mb-1">Plan Activo</p>
                                <p className="text-xs">Este mes ya tiene un plan en el calendario.</p>
                            </div>
                        ) : (
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="w-full py-4 bg-black hover:bg-gray-800 text-white rounded-xl font-bold shadow-lg shadow-black/30 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        Generando...
                                    </>
                                ) : (
                                    <>
                                        <Settings size={20} />
                                        Generar Plan
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* MAIN CONTENT SPACE (PREVIEW) */}
                <div className="flex-1 bg-gray-50/50 p-8 overflow-y-auto">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center gap-2">
                            <span className="font-bold">Error:</span> {error}
                        </div>
                    )}

                    {generatedTasks.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                                <Calendar size={48} className="opacity-20 text-gray-900" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-600 mb-2">Listo para Planificar</h3>
                            <p className="text-sm max-w-md text-center">Configura tus cuotas mensuales y genera una grilla de contenido optimizada basada en tu estrategia.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-gray-800">
                                    {saveSuccess ? 'Plan Enviado al Calendario' : 'Vista Previa del Plan'}
                                </h3>
                                {saveSuccess ? (
                                    <button
                                        disabled
                                        className="px-6 py-2.5 bg-green-100 text-green-700 rounded-lg font-bold flex items-center gap-2 cursor-default"
                                    >
                                        <CheckCircle2 size={18} />
                                        Plan Activo
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="px-6 py-2.5 bg-gray-900 text-white hover:bg-black rounded-lg font-bold shadow-lg flex items-center gap-2 transition-all disabled:opacity-70"
                                    >
                                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                        Confirmar y Enviar a Calendario
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                                {generatedTasks.map((task, idx) => (
                                    <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all group flex flex-col">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`p-1.5 rounded-lg ${task.format === 'video' || task.format === 'reel' ? 'bg-purple-50 text-purple-600' :
                                                    task.format === 'story' ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600'
                                                    }`}>
                                                    {task.format === 'video' || task.format === 'reel' ? <Video size={14} /> :
                                                        task.format === 'story' ? <Instagram size={14} /> : <ImageIcon size={14} />}
                                                </span>
                                                <span className="text-xs font-bold text-gray-400 uppercase">{task.format}</span>
                                            </div>
                                            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                                                {task.execution_date || 'Sin fecha'}
                                            </span>
                                        </div>

                                        <h4 className="font-bold text-gray-800 mb-2 leading-tight">{task.title}</h4>
                                        <p className="text-xs text-gray-500 line-clamp-3 mb-3">{task.description}</p>

                                        {/* Strategic Purpose */}
                                        {task.strategic_purpose && (
                                            <div className="bg-purple-50/50 p-2.5 rounded-lg border border-purple-100 mb-3">
                                                <p className="text-[9px] text-purple-600 font-bold uppercase mb-1">🎯 Propósito Estratégico</p>
                                                <p className="text-xs text-gray-700 leading-relaxed">{task.strategic_purpose}</p>
                                            </div>
                                        )}

                                        {/* Selected Hook */}
                                        {task.selected_hook && (
                                            <div className="bg-pink-50/50 p-2.5 rounded-lg border border-pink-100 mb-3">
                                                <p className="text-[9px] text-pink-600 font-bold uppercase mb-1">💡 Hook Creativo</p>
                                                <p className="text-xs text-gray-700 italic leading-relaxed">"{task.selected_hook}"</p>
                                            </div>
                                        )}

                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PlanningView;
