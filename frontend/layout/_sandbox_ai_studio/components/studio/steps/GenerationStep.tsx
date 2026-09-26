import React, { useState, useEffect } from 'react';
import { useStudio, useStudioValidation } from '../../../contexts/StudioContext';
import { useAuth } from '../../../contexts/AuthContext';
import { generateWithNanoBanana, approveGeneratedImage, NanoBananaGeneratedImage } from '../../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Sparkles, Loader2, Check, Download, RefreshCw, 
    ArrowLeft, Wand2, AlertCircle, Clock, Zap,
    ThumbsUp, Image as ImageIcon, CheckCircle2, Coins
} from 'lucide-react';

export const GenerationStep: React.FC = () => {
    const { state, dispatch } = useStudio();
    const { hasCredits } = useStudioValidation();
    const { user } = useAuth();
    const [isGenerating, setIsGenerating] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generationResult, setGenerationResult] = useState<NanoBananaGeneratedImage | null>(null);
    const [thinkingImages, setThinkingImages] = useState<string[]>([]);
    const [showThinking, setShowThinking] = useState(false);
    const [approvalSuccess, setApprovalSuccess] = useState(false);

    const handleGenerate = async () => {
        if (!state.clientId || !state.taskId) return;
        if (!hasCredits) return;

        setIsGenerating(true);
        setError(null);
        setGenerationResult(null);
        setThinkingImages([]);
        
        try {
            // Build camera settings if any are set
            const cameraSettings = Object.keys(state.cameraSettings || {}).length > 0 
                ? state.cameraSettings 
                : undefined;
            
            const result = await generateWithNanoBanana({
                client_id: state.clientId,
                task_id: state.taskId,
                tenant_id: user?.tenantId,
                template_id: state.selectedTemplate?.id,
                archetype: state.archetype || state.selectedTemplate?.category,
                style_reference_ids: state.selectedStyleReferences,
                product_image_id: state.selectedProductImage,
                custom_prompt: state.customPrompt || undefined,
                excluded_task_fields: state.excludedTaskFields.length > 0 ? state.excludedTaskFields : undefined,
                aspect_ratio: state.aspectRatio,
                resolution: state.resolution,
                use_pro_model: state.useProModel,
                camera_settings: cameraSettings,
            });

            setGenerationResult(result.image);
            if (result.thinking_images) {
                setThinkingImages(result.thinking_images);
            }
            
            dispatch({ type: 'ADD_GENERATED_IMAGE', payload: result.image });
            // Deduct credit after successful generation
            dispatch({ type: 'DEDUCT_CREDIT' });
        } catch (err: any) {
            console.error('Generation error:', err);
            setError(err.message || 'Error generando imagen');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleApprove = async () => {
        if (!generationResult) return;

        setIsApproving(true);
        try {
            const result = await approveGeneratedImage(generationResult.id);
            dispatch({ type: 'APPROVE_IMAGE', payload: generationResult.id });
            setApprovalSuccess(true);
        } catch (err: any) {
            console.error('Approval error:', err);
            setError(err.message || 'Error aprobando imagen');
        } finally {
            setIsApproving(false);
        }
    };

    const handleDownload = async () => {
        if (!generationResult) return;
        
        try {
            const response = await fetch(generationResult.image_url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pixely-${state.taskData?.title?.replace(/\s+/g, '-') || 'image'}-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Download error:', err);
        }
    };

    // Auto-generate on mount if coming from previous step (only if credits available)
    useEffect(() => {
        if (state.currentStep === 5 && !generationResult && !isGenerating && !error && hasCredits) {
            handleGenerate();
        }
    }, [state.currentStep]);

    // No credits warning
    const noCreditsWarning = !hasCredits && !generationResult;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 pb-24"
        >
            {/* HEADER */}
            <div className="bg-white/60 backdrop-blur-md rounded-3xl p-8 border border-white/50 shadow-xl shadow-pink-50/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-pink-100/50 to-transparent rounded-bl-full pointer-events-none" />
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-tr from-pink-500 to-rose-600 rounded-xl flex items-center justify-center text-white">
                            <Wand2 size={20} />
                        </div>
                        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                            Generación con NanoBanana
                        </h2>
                    </div>
                    <p className="text-gray-600 max-w-2xl text-lg leading-relaxed">
                        {isGenerating 
                            ? 'Generando tu imagen con Gemini NanoBanana...' 
                            : approvalSuccess
                                ? '¡Imagen aprobada! La tarea ha sido marcada como completada.'
                                : 'Revisa el resultado y aprueba para cerrar el ciclo.'}
                    </p>
                </div>
            </div>

            {/* NO CREDITS WARNING */}
            {noCreditsWarning && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-8 text-center"
                >
                    <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Coins size={32} className="text-amber-600" />
                    </div>
                    <h3 className="text-xl font-bold text-amber-800 mb-2">
                        Sin créditos disponibles
                    </h3>
                    <p className="text-amber-700 mb-1">
                        Necesitas créditos para generar imágenes con IA.
                    </p>
                    <p className="text-amber-600 text-sm">
                        Contacta al administrador para obtener créditos de generación.
                    </p>
                </motion.div>
            )}

            {/* GENERATION STATUS */}
            {isGenerating && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-br from-pink-500 to-violet-600 rounded-3xl p-12 text-center text-white relative overflow-hidden"
                >
                    {/* Animated background */}
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute w-96 h-96 bg-white/10 rounded-full blur-3xl -top-20 -left-20 animate-pulse" />
                        <div className="absolute w-96 h-96 bg-white/10 rounded-full blur-3xl -bottom-20 -right-20 animate-pulse" style={{ animationDelay: '1s' }} />
                    </div>
                    
                    <div className="relative z-10">
                        <div className="w-20 h-20 mx-auto mb-6 relative">
                            <div className="absolute inset-0 border-4 border-white/30 rounded-full animate-ping" />
                            <div className="absolute inset-2 border-4 border-t-white border-white/30 rounded-full animate-spin" />
                            <Sparkles size={32} className="absolute inset-0 m-auto" />
                        </div>
                        
                        <h3 className="text-2xl font-bold mb-2">Creando tu imagen...</h3>
                        <p className="text-white/80 mb-4">
                            {state.useProModel 
                                ? 'Usando NanoBanana Pro con thinking mode para máxima calidad'
                                : 'Generando con NanoBanana Flash'}
                        </p>

                        <div className="flex items-center justify-center gap-6 text-sm text-white/70">
                            <span className="flex items-center gap-1.5">
                                <ImageIcon size={14} />
                                {(state.selectedStyleReferences.length + (state.selectedProductImage ? 1 : 0))} referencias
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Zap size={14} />
                                {state.resolution}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Clock size={14} />
                                ~15-30s
                            </span>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* ERROR STATE */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 flex items-start gap-4"
                >
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <AlertCircle size={24} className="text-red-600" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-red-800 mb-1">Error en la generación</h4>
                        <p className="text-red-700 text-sm">{error}</p>
                        <button
                            onClick={handleGenerate}
                            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-xl font-semibold text-sm flex items-center gap-2 hover:bg-red-700 transition-colors"
                        >
                            <RefreshCw size={16} />
                            Reintentar
                        </button>
                    </div>
                </motion.div>
            )}

            {/* GENERATED IMAGE */}
            {generationResult && !isGenerating && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-6"
                >
                    {/* Main Image */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-100 shadow-xl">
                        <div className="relative group">
                            <img
                                src={generationResult.image_url}
                                alt="Generated"
                                className="w-full max-h-[600px] object-contain rounded-2xl bg-gray-100"
                            />
                            
                            {/* Overlay with actions */}
                            <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={handleDownload}
                                    className="px-4 py-2 bg-white/90 backdrop-blur-sm rounded-xl font-semibold text-sm flex items-center gap-2 hover:bg-white transition-colors shadow-lg"
                                >
                                    <Download size={16} />
                                    Descargar
                                </button>
                            </div>

                            {approvalSuccess && (
                                <div className="absolute inset-0 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
                                    <div className="bg-white rounded-2xl p-6 text-center shadow-2xl">
                                        <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-3" />
                                        <p className="font-bold text-gray-900">¡Imagen Aprobada!</p>
                                        <p className="text-sm text-gray-500">Tarea marcada como completada</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Generation Info */}
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-gray-50 rounded-xl p-3">
                                <p className="text-xs text-gray-500 font-medium">Modelo</p>
                                <p className="font-semibold text-gray-900">{generationResult.model_used}</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3">
                                <p className="text-xs text-gray-500 font-medium">Aspecto</p>
                                <p className="font-semibold text-gray-900">{generationResult.aspect_ratio}</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3">
                                <p className="text-xs text-gray-500 font-medium">Resolución</p>
                                <p className="font-semibold text-gray-900">{generationResult.resolution}</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3">
                                <p className="text-xs text-gray-500 font-medium">Tiempo</p>
                                <p className="font-semibold text-gray-900">{(generationResult.generation_time_ms / 1000).toFixed(1)}s</p>
                            </div>
                        </div>
                    </div>

                    {/* Thinking Images (Pro Model) */}
                    {thinkingImages.length > 0 && (
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-100 shadow-lg">
                            <button
                                onClick={() => setShowThinking(!showThinking)}
                                className="flex items-center justify-between w-full"
                            >
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                    <Sparkles size={18} className="text-violet-500" />
                                    Proceso de Thinking ({thinkingImages.length} pasos)
                                </h3>
                                <span className="text-sm text-violet-600 font-medium">
                                    {showThinking ? 'Ocultar' : 'Ver proceso'}
                                </span>
                            </button>
                            
                            <AnimatePresence>
                                {showThinking && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mt-4">
                                            {thinkingImages.map((url, idx) => (
                                                <div key={idx} className="relative">
                                                    <img
                                                        src={url}
                                                        alt={`Thinking step ${idx + 1}`}
                                                        className="w-full aspect-square object-cover rounded-xl"
                                                    />
                                                    <span className="absolute top-1 left-1 w-5 h-5 bg-violet-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                                        {idx + 1}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* Final Prompt Used */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-100 shadow-lg">
                        <h3 className="font-bold text-gray-900 mb-3">Prompt Utilizado</h3>
                        <div className="bg-gray-50 rounded-xl p-4 max-h-32 overflow-y-auto">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {generationResult.final_prompt}
                            </p>
                        </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    {!approvalSuccess && (
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || !hasCredits}
                                className={`flex-1 px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors ${
                                    !hasCredits 
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                <RefreshCw size={20} />
                                {!hasCredits ? 'Sin créditos' : 'Regenerar'}
                            </button>
                            <button
                                onClick={handleApprove}
                                disabled={isApproving}
                                className="flex-1 px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-lg shadow-emerald-500/30"
                            >
                                {isApproving ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <ThumbsUp size={20} />
                                )}
                                Aprobar y Cerrar Tarea
                            </button>
                        </div>
                    )}

                    {/* Success Message */}
                    {approvalSuccess && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6 text-center"
                        >
                            <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-3" />
                            <h3 className="text-xl font-bold text-emerald-800 mb-2">
                                ¡Ciclo Completado!
                            </h3>
                            <p className="text-emerald-700 mb-4">
                                La imagen ha sido aprobada y la tarea "{state.taskData?.title}" 
                                ha sido marcada como completada en el calendario.
                            </p>
                            <button
                                onClick={() => dispatch({ type: 'RESET_WIZARD' })}
                                className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors"
                            >
                                Generar Otra Imagen
                            </button>
                        </motion.div>
                    )}
                </motion.div>
            )}

            {/* NAVIGATION (only back button) */}
            {!approvalSuccess && (
                <div className="fixed bottom-8 left-8 z-40">
                    <button
                        onClick={() => dispatch({ type: 'PREV_STEP' })}
                        disabled={isGenerating}
                        className="px-6 py-4 bg-white rounded-2xl font-bold text-gray-700 flex items-center gap-2 shadow-xl hover:bg-gray-50 transition-all disabled:opacity-50"
                    >
                        <ArrowLeft size={18} />
                        Modificar Configuración
                    </button>
                </div>
            )}
        </motion.div>
    );
};
