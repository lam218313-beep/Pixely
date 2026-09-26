import React, { useState, useEffect } from 'react';
import { X, Loader2, Check, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import * as api from '../services/api';

interface ImageGenerationModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientId: string;
    taskId?: string;
    conceptId?: string;
    onImageGenerated?: (imageUrl: string, imageId: string) => void;
}

interface GeneratedImage {
    id: string;
    image_url: string;
    final_prompt: string;
    cost_usd: number;
    generation_time_ms: number;
    created_at: string;
}

const STYLE_PRESETS = [
    { id: 'realistic', label: 'Realistic', icon: '📷' },
    { id: 'illustration', label: 'Illustration', icon: '🎨' },
    { id: '3d_render', label: '3D', icon: '🎭' },
    { id: 'minimalist', label: 'Minimal', icon: '⚪' },
];

const ASPECT_RATIOS = [
    { id: '1:1', label: '1:1 Post', icon: '⬜' },
    { id: '9:16', label: '9:16 Story', icon: '📱' },
    { id: '16:9', label: '16:9 Landscape', icon: '🖼️' },
];

export const ImageGenerationModal: React.FC<ImageGenerationModalProps> = ({
    isOpen,
    onClose,
    clientId,
    taskId,
    conceptId,
    onImageGenerated
}) => {
    const [userAdditions, setUserAdditions] = useState('');
    const [stylePreset, setStylePreset] = useState('realistic');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [moodTone, setMoodTone] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('text, watermark, blurry, low quality');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showContext, setShowContext] = useState(true);
    const [showPrompt, setShowPrompt] = useState(false);
    const [contextData, setContextData] = useState<any>(null);

    // Load context data when modal opens
    useEffect(() => {
        if (isOpen && taskId) {
            loadTaskContext();
        }
    }, [isOpen, taskId]);

    const loadTaskContext = async () => {
        try {
            // Fetch task data to show inherited context
            const response = await fetch(`${api.API_BASE_URL}/tasks/${taskId}`);
            if (response.ok) {
                const task = await response.json();
                setContextData(task);
            }
        } catch (err) {
            console.error('Failed to load task context:', err);
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);

        try {
            const response = await fetch(`${api.API_BASE_URL}/images/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    client_id: clientId,
                    task_id: taskId,
                    concept_id: conceptId,
                    user_additions: userAdditions,
                    style_preset: stylePreset,
                    aspect_ratio: aspectRatio,
                    mood_tone: moodTone,
                    negative_prompt: negativePrompt,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Generation failed');
            }

            const data = await response.json();
            setGeneratedImage(data.image);
        } catch (err: any) {
            setError(err.message || 'Failed to generate image');
            console.error('Image generation error:', err);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUseImage = async () => {
        if (!generatedImage || !taskId) return;

        try {
            // Select this image for the task
            await fetch(`${api.API_BASE_URL}/images/${generatedImage.id}/select`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    task_id: taskId,
                }),
            });

            // Notify parent component
            if (onImageGenerated) {
                onImageGenerated(generatedImage.image_url, generatedImage.id);
            }

            onClose();
        } catch (err) {
            console.error('Failed to select image:', err);
            setError('Failed to select image');
        }
    };

    const handleRegenerate = () => {
        setGeneratedImage(null);
        setError(null);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl border border-slate-700/50">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Sparkles className="w-6 h-6 text-blue-400" />
                            <h2 className="text-2xl font-bold text-white">
                                Generar Imagen con IA
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Context Section */}
                    {contextData && (
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                            <button
                                onClick={() => setShowContext(!showContext)}
                                className="flex items-center justify-between w-full text-left"
                            >
                                <span className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                                    Contexto Heredado
                                </span>
                                {showContext ? (
                                    <ChevronUp className="w-4 h-4 text-slate-400" />
                                ) : (
                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                )}
                            </button>

                            {showContext && (
                                <div className="mt-3 space-y-2 text-sm">
                                    {contextData.title && (
                                        <div className="flex items-start gap-2">
                                            <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                            <span className="text-slate-300">
                                                <span className="text-slate-500">Tarea:</span> {contextData.title}
                                            </span>
                                        </div>
                                    )}
                                    {contextData.selected_hook && (
                                        <div className="flex items-start gap-2">
                                            <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                            <span className="text-slate-300">
                                                <span className="text-slate-500">Hook:</span> {contextData.selected_hook}
                                            </span>
                                        </div>
                                    )}
                                    {contextData.key_elements && contextData.key_elements.length > 0 && (
                                        <div className="flex items-start gap-2">
                                            <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                            <span className="text-slate-300">
                                                <span className="text-slate-500">Elementos clave:</span>{' '}
                                                {contextData.key_elements.join(', ')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Generated Image Display */}
                    {generatedImage && (
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                            <img
                                src={generatedImage.image_url}
                                alt="Generated"
                                className="w-full rounded-lg mb-4"
                            />
                            <div className="flex items-center justify-between text-sm text-slate-400">
                                <span>Generado en {(generatedImage.generation_time_ms / 1000).toFixed(1)}s</span>
                                <span>${generatedImage.cost_usd.toFixed(2)} USD</span>
                            </div>
                        </div>
                    )}

                    {/* Input Form */}
                    {!generatedImage && (
                        <>
                            {/* User Additions */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 uppercase tracking-wide mb-2">
                                    Personalización
                                </label>
                                <textarea
                                    value={userAdditions}
                                    onChange={(e) => setUserAdditions(e.target.value)}
                                    placeholder="Detalles adicionales (opcional)"
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                                    rows={3}
                                />
                            </div>

                            {/* Style Preset */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 uppercase tracking-wide mb-2">
                                    Estilo
                                </label>
                                <div className="flex gap-2">
                                    {STYLE_PRESETS.map((style) => (
                                        <button
                                            key={style.id}
                                            onClick={() => setStylePreset(style.id)}
                                            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${stylePreset === style.id
                                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
                                                }`}
                                        >
                                            <span className="mr-1">{style.icon}</span>
                                            {style.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Aspect Ratio */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 uppercase tracking-wide mb-2">
                                    Formato
                                </label>
                                <div className="flex gap-2">
                                    {ASPECT_RATIOS.map((ratio) => (
                                        <button
                                            key={ratio.id}
                                            onClick={() => setAspectRatio(ratio.id)}
                                            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${aspectRatio === ratio.id
                                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
                                                }`}
                                        >
                                            <span className="mr-1">{ratio.icon}</span>
                                            {ratio.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Mood/Tone */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 uppercase tracking-wide mb-2">
                                    Atmósfera
                                </label>
                                <input
                                    type="text"
                                    value={moodTone}
                                    onChange={(e) => setMoodTone(e.target.value)}
                                    placeholder="energético, motivacional"
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                />
                            </div>

                            {/* Negative Prompt */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 uppercase tracking-wide mb-2">
                                    Evitar
                                </label>
                                <input
                                    type="text"
                                    value={negativePrompt}
                                    onChange={(e) => setNegativePrompt(e.target.value)}
                                    placeholder="texto, marcas de agua"
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                />
                            </div>
                        </>
                    )}

                    {/* Error Display */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        {!generatedImage ? (
                            <>
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Generando...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-5 h-5" />
                                            Generar Imagen ($0.03)
                                        </>
                                    )}
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={handleRegenerate}
                                    className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    🔄 Regenerar
                                </button>
                                <button
                                    onClick={handleUseImage}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-medium transition-all shadow-lg shadow-green-500/30 flex items-center justify-center gap-2"
                                >
                                    <Check className="w-5 h-5" />
                                    Usar esta Imagen
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageGenerationModal;
