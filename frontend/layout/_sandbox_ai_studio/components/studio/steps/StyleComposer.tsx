import React, { useState } from 'react';
import { useStudio } from '../../../contexts/StudioContext';
import { motion } from 'framer-motion';
import { Palette, Sun, Moon, Zap, Heart, Minimize2, Camera, Paintbrush, Box, Aperture, ArrowRight, ArrowLeft, Check } from 'lucide-react';

/**
 * Step 4: Style Composer
 * Configure the visual style, mood, and parameters for image generation.
 */

// Style Presets
const STYLE_PRESETS = [
    { id: 'realistic', label: 'Realista', icon: Camera, description: 'Fotografía profesional y natural', gradient: 'from-gray-600 to-gray-800' },
    { id: 'illustration', label: 'Ilustración', icon: Paintbrush, description: 'Arte digital vibrante', gradient: 'from-pink-500 to-purple-600' },
    { id: '3d_render', label: '3D Render', icon: Box, description: 'Modelado tridimensional moderno', gradient: 'from-cyan-500 to-blue-600' },
    { id: 'minimalist', label: 'Minimalista', icon: Minimize2, description: 'Limpio, simple y elegante', gradient: 'from-gray-300 to-gray-500' },
    { id: 'vintage', label: 'Vintage', icon: Aperture, description: 'Estética retro nostálgica', gradient: 'from-amber-500 to-orange-600' },
];

// Aspect Ratios
const ASPECT_RATIOS = [
    { id: '1:1', label: 'Cuadrado', sublabel: '1:1', icon: '⬜', description: 'Post de feed' },
    { id: '9:16', label: 'Vertical', sublabel: '9:16', icon: '📱', description: 'Story / Reel' },
    { id: '16:9', label: 'Horizontal', sublabel: '16:9', icon: '🖼️', description: 'Cover / Banner' },
];

// Mood Options
const MOOD_OPTIONS = [
    { id: 'energetic', label: 'Energético', icon: Zap, color: 'text-yellow-500 bg-yellow-50 border-yellow-200' },
    { id: 'calm', label: 'Calmado', icon: Moon, color: 'text-blue-500 bg-blue-50 border-blue-200' },
    { id: 'warm', label: 'Cálido', icon: Sun, color: 'text-orange-500 bg-orange-50 border-orange-200' },
    { id: 'inspiring', label: 'Inspirador', icon: Heart, color: 'text-pink-500 bg-pink-50 border-pink-200' },
];

// Color Palettes
const COLOR_PALETTES = [
    { id: 'brand', label: 'Colores de Marca', colors: ['#6366f1', '#8b5cf6', '#a855f7'] },
    { id: 'warm', label: 'Cálidos', colors: ['#f59e0b', '#ef4444', '#f97316'] },
    { id: 'cool', label: 'Fríos', colors: ['#06b6d4', '#3b82f6', '#6366f1'] },
    { id: 'nature', label: 'Naturaleza', colors: ['#22c55e', '#84cc16', '#10b981'] },
    { id: 'neutral', label: 'Neutros', colors: ['#6b7280', '#9ca3af', '#d1d5db'] },
    { id: 'vibrant', label: 'Vibrantes', colors: ['#ec4899', '#8b5cf6', '#06b6d4'] },
];

export const StyleComposer: React.FC = () => {
    const { state, dispatch } = useStudio();
    
    // Local state for style configuration
    const [selectedStyle, setSelectedStyle] = useState('realistic');
    const [selectedRatio, setSelectedRatio] = useState('1:1');
    const [selectedMood, setSelectedMood] = useState('energetic');
    const [selectedPalette, setSelectedPalette] = useState('brand');
    const [customPrompt, setCustomPrompt] = useState('');

    // Derive aspect ratio from task format if available
    React.useEffect(() => {
        if (state.taskData?.format) {
            const format = state.taskData.format.toLowerCase();
            if (format.includes('story') || format.includes('reel')) {
                setSelectedRatio('9:16');
            } else if (format.includes('cover') || format.includes('banner')) {
                setSelectedRatio('16:9');
            } else {
                setSelectedRatio('1:1');
            }
        }
    }, [state.taskData]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 pb-24"
        >
            {/* Header */}
            <div className="bg-white/60 backdrop-blur-md rounded-3xl p-8 border border-white/50 shadow-xl shadow-indigo-50/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-pink-100/50 to-transparent rounded-bl-full pointer-events-none" />
                <div className="relative z-10">
                    <h2 className="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">
                        Estilo Visual
                    </h2>
                    <p className="text-gray-600 max-w-2xl text-lg leading-relaxed">
                        Define la dirección artística de tu imagen. Estos parámetros guiarán a la IA 
                        para crear exactamente lo que necesitas.
                    </p>
                </div>
            </div>

            {/* Style Presets */}
            <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                        <Palette size={20} className="text-purple-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg">Estilo de Imagen</h3>
                        <p className="text-gray-500 text-sm">Selecciona el look general</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {STYLE_PRESETS.map((style) => {
                        const Icon = style.icon;
                        const isSelected = selectedStyle === style.id;
                        return (
                            <button
                                key={style.id}
                                onClick={() => setSelectedStyle(style.id)}
                                className={`
                                    relative p-5 rounded-2xl border-2 transition-all text-left group
                                    ${isSelected 
                                        ? 'border-primary-500 bg-primary-50 shadow-lg shadow-primary-100' 
                                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}
                                `}
                            >
                                {isSelected && (
                                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                                        <Check size={14} className="text-white" />
                                    </div>
                                )}
                                <div className={`
                                    w-12 h-12 rounded-xl bg-gradient-to-br ${style.gradient} 
                                    flex items-center justify-center mb-3 transition-transform group-hover:scale-105
                                `}>
                                    <Icon size={24} className="text-white" />
                                </div>
                                <h4 className="font-bold text-gray-800 text-sm">{style.label}</h4>
                                <p className="text-gray-500 text-xs mt-1 leading-tight">{style.description}</p>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Aspect Ratio */}
            <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <span className="text-xl">📐</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg">Formato</h3>
                        <p className="text-gray-500 text-sm">Dimensiones de la imagen</p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    {ASPECT_RATIOS.map((ratio) => {
                        const isSelected = selectedRatio === ratio.id;
                        return (
                            <button
                                key={ratio.id}
                                onClick={() => setSelectedRatio(ratio.id)}
                                className={`
                                    relative p-6 rounded-2xl border-2 transition-all text-center
                                    ${isSelected 
                                        ? 'border-primary-500 bg-primary-50 shadow-lg shadow-primary-100' 
                                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}
                                `}
                            >
                                {isSelected && (
                                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                                        <Check size={14} className="text-white" />
                                    </div>
                                )}
                                <span className="text-3xl mb-2 block">{ratio.icon}</span>
                                <h4 className="font-bold text-gray-800">{ratio.label}</h4>
                                <p className="text-gray-400 text-xs mt-1">{ratio.sublabel}</p>
                                <p className="text-gray-500 text-xs mt-2">{ratio.description}</p>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Mood & Atmosphere */}
            <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                        <Sun size={20} className="text-amber-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg">Atmósfera</h3>
                        <p className="text-gray-500 text-sm">Emoción que debe transmitir</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {MOOD_OPTIONS.map((mood) => {
                        const Icon = mood.icon;
                        const isSelected = selectedMood === mood.id;
                        return (
                            <button
                                key={mood.id}
                                onClick={() => setSelectedMood(mood.id)}
                                className={`
                                    relative p-5 rounded-2xl border-2 transition-all flex flex-col items-center
                                    ${isSelected 
                                        ? 'border-primary-500 bg-primary-50 shadow-lg shadow-primary-100' 
                                        : `border-gray-100 hover:border-gray-200 ${mood.color.split(' ')[1]}`}
                                `}
                            >
                                {isSelected && (
                                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                                        <Check size={14} className="text-white" />
                                    </div>
                                )}
                                <Icon size={28} className={mood.color.split(' ')[0]} />
                                <span className="font-bold text-gray-800 mt-2">{mood.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Color Palette */}
            <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-purple-500 rounded-xl flex items-center justify-center">
                        <span className="text-white text-lg">🎨</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg">Paleta de Colores</h3>
                        <p className="text-gray-500 text-sm">Tonos dominantes</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {COLOR_PALETTES.map((palette) => {
                        const isSelected = selectedPalette === palette.id;
                        return (
                            <button
                                key={palette.id}
                                onClick={() => setSelectedPalette(palette.id)}
                                className={`
                                    relative p-5 rounded-2xl border-2 transition-all
                                    ${isSelected 
                                        ? 'border-primary-500 bg-primary-50 shadow-lg shadow-primary-100' 
                                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}
                                `}
                            >
                                {isSelected && (
                                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                                        <Check size={14} className="text-white" />
                                    </div>
                                )}
                                <div className="flex gap-2 mb-3 justify-center">
                                    {palette.colors.map((color, idx) => (
                                        <div
                                            key={idx}
                                            className="w-8 h-8 rounded-full shadow-inner"
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                                <h4 className="font-bold text-gray-800 text-sm text-center">{palette.label}</h4>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Custom Instructions */}
            <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                        <span className="text-lg">✏️</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg">Instrucciones Adicionales</h3>
                        <p className="text-gray-500 text-sm">Detalles específicos para la generación</p>
                    </div>
                </div>

                <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Ej: Incluir una persona sonriendo, fondo con elementos de naturaleza, luz dorada de atardecer..."
                    className="w-full h-32 bg-gray-50 hover:bg-white border border-gray-200 rounded-2xl p-5 text-gray-800 resize-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all placeholder-gray-400 text-base leading-relaxed"
                />
            </div>

            {/* Summary Preview */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 text-white">
                <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Palette size={20} />
                    Resumen de Configuración
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                        <span className="text-gray-400 block text-xs uppercase tracking-wider mb-1">Estilo</span>
                        <span className="font-bold">{STYLE_PRESETS.find(s => s.id === selectedStyle)?.label}</span>
                    </div>
                    <div>
                        <span className="text-gray-400 block text-xs uppercase tracking-wider mb-1">Formato</span>
                        <span className="font-bold">{ASPECT_RATIOS.find(r => r.id === selectedRatio)?.sublabel}</span>
                    </div>
                    <div>
                        <span className="text-gray-400 block text-xs uppercase tracking-wider mb-1">Atmósfera</span>
                        <span className="font-bold">{MOOD_OPTIONS.find(m => m.id === selectedMood)?.label}</span>
                    </div>
                    <div>
                        <span className="text-gray-400 block text-xs uppercase tracking-wider mb-1">Paleta</span>
                        <span className="font-bold">{COLOR_PALETTES.find(p => p.id === selectedPalette)?.label}</span>
                    </div>
                </div>
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
                    onClick={() => {
                        // Save style config to context before advancing
                        // For now, we store in localStorage as a simple solution
                        localStorage.setItem('studio_style_config', JSON.stringify({
                            style: selectedStyle,
                            ratio: selectedRatio,
                            mood: selectedMood,
                            palette: selectedPalette,
                            customPrompt
                        }));
                        dispatch({ type: 'NEXT_STEP' });
                    }}
                    className="px-6 py-4 bg-gradient-to-r from-primary-600 to-indigo-600 text-white rounded-full font-bold transition-all hover:shadow-primary-500/40 hover:scale-105 active:scale-95 shadow-2xl ring-2 ring-white/20 flex items-center gap-3"
                >
                    <span className="hidden md:inline">Generar Imagen</span>
                    <ArrowRight size={20} />
                </button>
            </div>
        </motion.div>
    );
};
