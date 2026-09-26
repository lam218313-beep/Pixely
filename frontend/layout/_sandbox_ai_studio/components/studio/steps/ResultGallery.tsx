import React, { useState, useEffect } from 'react';
import { useStudio } from '../../../contexts/StudioContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Sparkles, RefreshCw, Download, Check, ArrowLeft, Loader2, 
    AlertCircle, Copy, ExternalLink, ThumbsUp, ThumbsDown, Wand2
} from 'lucide-react';
import { API_BASE_URL } from '../../../services/api';

/**
 * Step 5: Result Gallery
 * The final step where images are generated and displayed.
 * Users can regenerate, download, or select the final image.
 */

interface GeneratedImage {
    id: string;
    image_url: string;
    prompt: string;
    revised_prompt?: string;
    style_preset: string;
    aspect_ratio: string;
    mood_tone: string;
    generation_time_ms: number;
    cost_usd: number;
    created_at: string;
}

interface StyleConfig {
    style: string;
    ratio: string;
    mood: string;
    palette: string;
    customPrompt: string;
}

export const ResultGallery: React.FC = () => {
    const { state, dispatch } = useStudio();
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
    const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [styleConfig, setStyleConfig] = useState<StyleConfig | null>(null);

    // Load style config from previous step
    useEffect(() => {
        const savedConfig = localStorage.getItem('studio_style_config');
        if (savedConfig) {
            setStyleConfig(JSON.parse(savedConfig));
        }
    }, []);

    // Auto-generate on mount if no images
    useEffect(() => {
        if (styleConfig && generatedImages.length === 0 && !isGenerating) {
            handleGenerate();
        }
    }, [styleConfig]);

    const getMoodLabel = (mood: string) => {
        const moods: Record<string, string> = {
            energetic: 'energético y dinámico',
            calm: 'calmado y sereno',
            warm: 'cálido y acogedor',
            inspiring: 'inspirador y motivacional'
        };
        return moods[mood] || mood;
    };

    const handleGenerate = async () => {
        if (!state.clientId) {
            setError('No hay cliente seleccionado');
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            // Build the user additions from task data and custom prompt
            let userAdditions = '';
            
            if (state.taskData) {
                const parts = [];
                if (state.taskData.title) parts.push(state.taskData.title);
                if (state.taskData.selected_hook) parts.push(`Hook: "${state.taskData.selected_hook}"`);
                if (state.taskData.key_elements?.length) {
                    parts.push(`Elementos: ${state.taskData.key_elements.join(', ')}`);
                }
                userAdditions = parts.join('. ');
            }

            if (styleConfig?.customPrompt) {
                userAdditions += `. ${styleConfig.customPrompt}`;
            }

            // Get mood from config
            const moodTone = styleConfig ? getMoodLabel(styleConfig.mood) : '';

            const response = await fetch(`${API_BASE_URL}/images/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    client_id: state.clientId,
                    task_id: state.taskId || undefined,
                    user_additions: userAdditions,
                    style_preset: styleConfig?.style || 'realistic',
                    aspect_ratio: styleConfig?.ratio || '1:1',
                    mood_tone: moodTone,
                    negative_prompt: 'text, watermark, blurry, low quality, distorted, deformed'
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Error en la generación');
            }

            const data = await response.json();
            
            if (data.image) {
                setGeneratedImages(prev => [data.image, ...prev]);
                setSelectedImageId(data.image.id);
            }

        } catch (err: any) {
            console.error('Generation error:', err);
            setError(err.message || 'Error al generar la imagen');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSelectImage = async (imageId: string) => {
        if (!state.taskId) {
            setSelectedImageId(imageId);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/images/${imageId}/select`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task_id: state.taskId }),
            });

            if (response.ok) {
                setSelectedImageId(imageId);
            }
        } catch (err) {
            console.error('Failed to select image:', err);
        }
    };

    const handleDownload = async (imageUrl: string, imageId: string) => {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pixely-${imageId}.png`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch (err) {
            console.error('Download failed:', err);
        }
    };

    const handleCopyPrompt = (prompt: string) => {
        navigator.clipboard.writeText(prompt);
    };

    const selectedImage = generatedImages.find(img => img.id === selectedImageId);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 pb-24"
        >
            {/* Header */}
            <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-3xl p-8 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,...')] opacity-10" />
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-extrabold tracking-tight">
                                Generación con IA
                            </h2>
                            <p className="text-white/80 text-sm">Powered by DALL·E 3</p>
                        </div>
                    </div>
                    <p className="text-white/90 max-w-2xl text-lg leading-relaxed mt-4">
                        Tu imagen está siendo creada con inteligencia artificial. 
                        Puedes regenerar hasta obtener el resultado perfecto.
                    </p>
                </div>
            </div>

            {/* Generation Status */}
            <AnimatePresence mode="wait">
                {isGenerating && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-3xl p-12 shadow-2xl border border-gray-100 text-center"
                    >
                        <div className="w-24 h-24 mx-auto mb-6 relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-pulse opacity-30" />
                            <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                                <Wand2 size={32} className="text-indigo-600 animate-bounce" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Generando tu imagen...</h3>
                        <p className="text-gray-500 mb-6">Esto puede tomar entre 10-30 segundos</p>
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                            <Loader2 size={16} className="animate-spin" />
                            Procesando con DALL·E 3
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error State */}
            {error && !isGenerating && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-4">
                    <AlertCircle size={24} className="text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <h4 className="font-bold text-red-800 mb-1">Error en la generación</h4>
                        <p className="text-red-600 text-sm">{error}</p>
                    </div>
                    <button
                        onClick={handleGenerate}
                        className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium text-sm transition-colors"
                    >
                        Reintentar
                    </button>
                </div>
            )}

            {/* Generated Images */}
            {!isGenerating && generatedImages.length > 0 && (
                <div className="space-y-6">
                    {/* Main Selected Image */}
                    {selectedImage && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden"
                        >
                            <div className="relative aspect-square md:aspect-auto md:h-[500px] bg-gray-100">
                                <img
                                    src={selectedImage.image_url}
                                    alt="Generated"
                                    className="w-full h-full object-contain"
                                />
                                
                                {/* Overlay Actions */}
                                <div className="absolute bottom-4 right-4 flex gap-2">
                                    <button
                                        onClick={() => handleDownload(selectedImage.image_url, selectedImage.id)}
                                        className="px-4 py-2 bg-white/90 backdrop-blur-sm hover:bg-white text-gray-800 rounded-xl font-medium shadow-lg transition-all flex items-center gap-2"
                                    >
                                        <Download size={18} />
                                        Descargar
                                    </button>
                                    <button
                                        onClick={() => window.open(selectedImage.image_url, '_blank')}
                                        className="p-2 bg-white/90 backdrop-blur-sm hover:bg-white text-gray-800 rounded-xl shadow-lg transition-all"
                                    >
                                        <ExternalLink size={18} />
                                    </button>
                                </div>

                                {/* Selected Badge */}
                                <div className="absolute top-4 left-4 px-3 py-1.5 bg-green-500 text-white rounded-full text-sm font-bold flex items-center gap-1.5 shadow-lg">
                                    <Check size={14} />
                                    Seleccionada
                                </div>
                            </div>

                            {/* Image Details */}
                            <div className="p-6 border-t border-gray-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <span className="flex items-center gap-1">
                                            ⏱️ {(selectedImage.generation_time_ms / 1000).toFixed(1)}s
                                        </span>
                                        <span className="flex items-center gap-1">
                                            💰 ${selectedImage.cost_usd?.toFixed(3) || '0.040'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            📐 {selectedImage.aspect_ratio}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-green-500">
                                            <ThumbsUp size={18} />
                                        </button>
                                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-red-500">
                                            <ThumbsDown size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Revised Prompt */}
                                {selectedImage.revised_prompt && (
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                Prompt Optimizado por IA
                                            </span>
                                            <button
                                                onClick={() => handleCopyPrompt(selectedImage.revised_prompt || '')}
                                                className="text-gray-400 hover:text-primary-500 transition-colors"
                                            >
                                                <Copy size={14} />
                                            </button>
                                        </div>
                                        <p className="text-gray-600 text-sm leading-relaxed">
                                            {selectedImage.revised_prompt}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* Thumbnail Gallery (if multiple images) */}
                    {generatedImages.length > 1 && (
                        <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
                            <h4 className="font-bold text-gray-800 mb-3 text-sm">Variaciones generadas</h4>
                            <div className="flex gap-3 overflow-x-auto pb-2">
                                {generatedImages.map((img) => (
                                    <button
                                        key={img.id}
                                        onClick={() => handleSelectImage(img.id)}
                                        className={`
                                            shrink-0 w-24 h-24 rounded-xl overflow-hidden border-2 transition-all
                                            ${selectedImageId === img.id 
                                                ? 'border-primary-500 ring-2 ring-primary-200' 
                                                : 'border-gray-200 hover:border-gray-300'}
                                        `}
                                    >
                                        <img
                                            src={img.image_url}
                                            alt="Variation"
                                            className="w-full h-full object-cover"
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Regenerate Button */}
                    <div className="text-center">
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all flex items-center gap-2 mx-auto disabled:opacity-50"
                        >
                            <RefreshCw size={18} className={isGenerating ? 'animate-spin' : ''} />
                            Generar otra variación
                        </button>
                    </div>
                </div>
            )}

            {/* Empty State (before first generation) */}
            {!isGenerating && generatedImages.length === 0 && !error && (
                <div className="bg-white rounded-3xl p-12 shadow-lg border border-gray-100 text-center">
                    <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Sparkles size={36} className="text-indigo-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Listo para generar</h3>
                    <p className="text-gray-500 mb-6 max-w-md mx-auto">
                        Toda la configuración está lista. Haz clic en el botón para crear tu imagen con IA.
                    </p>
                    <button
                        onClick={handleGenerate}
                        className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:shadow-xl transition-all flex items-center gap-2 mx-auto"
                    >
                        <Sparkles size={20} />
                        Generar Imagen
                    </button>
                </div>
            )}

            {/* Navigation Buttons */}
            <div className="fixed bottom-8 right-8 z-50 flex items-center gap-3">
                <button
                    onClick={() => dispatch({ type: 'PREV_STEP' })}
                    className="px-5 py-3 bg-white border border-gray-200 text-gray-700 rounded-full font-medium transition-all hover:bg-gray-50 shadow-lg flex items-center gap-2"
                >
                    <ArrowLeft size={18} />
                    <span className="hidden md:inline">Ajustar Estilo</span>
                </button>
                
                {selectedImage && (
                    <button
                        onClick={() => {
                            // Mark as final and close/navigate back
                            if (state.taskId) {
                                handleSelectImage(selectedImage.id);
                            }
                            // Could navigate back to planning view here
                            dispatch({ type: 'RESET_WIZARD' });
                        }}
                        className="px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full font-bold transition-all hover:shadow-green-500/40 hover:scale-105 active:scale-95 shadow-2xl ring-2 ring-white/20 flex items-center gap-3"
                    >
                        <Check size={20} />
                        <span className="hidden md:inline">Usar esta Imagen</span>
                    </button>
                )}
            </div>
        </motion.div>
    );
};
