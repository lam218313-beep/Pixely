import React, { useEffect, useState } from 'react';
import { useStudio, StyleAnalysis } from '../../../contexts/StudioContext';
import { getGenerationTemplates, GenerationTemplate, analyzeReferenceStyle } from '../../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Layers, ArrowRight, ArrowLeft, Loader2, Check, 
    Sparkles, Zap, Image, Package, Settings2, Camera, 
    Wand2, Copy, Eye, Palette, Sun, Layout
} from 'lucide-react';

// All valid aspect ratios from NanoBanana Pro documentation
const ASPECT_RATIOS = [
    { id: '1:1', label: '1:1', desc: 'Cuadrado (Post)', icon: '◻️' },
    { id: '4:5', label: '4:5', desc: 'Retrato Instagram', icon: '📱' },
    { id: '9:16', label: '9:16', desc: 'Vertical (Story/Reel)', icon: '📲' },
    { id: '2:3', label: '2:3', desc: 'Pinterest', icon: '📌' },
    { id: '3:4', label: '3:4', desc: 'Retrato clásico', icon: '🖼️' },
    { id: '16:9', label: '16:9', desc: 'Horizontal (Cover)', icon: '🖥️' },
    { id: '3:2', label: '3:2', desc: 'Landscape', icon: '🌅' },
    { id: '4:3', label: '4:3', desc: 'TV clásico', icon: '📺' },
    { id: '5:4', label: '5:4', desc: 'Cuadrado ancho', icon: '🔳' },
    { id: '21:9', label: '21:9', desc: 'Ultra-wide cinematic', icon: '🎬' },
];

const RESOLUTIONS = [
    { id: '1K', label: '1K', desc: 'Rápido (~10s)' },
    { id: '2K', label: '2K', desc: 'Balanceado (~20s)' },
    { id: '4K', label: '4K', desc: 'Alta calidad (~40s)' },
];

// Camera angle options
const CAMERA_ANGLES = [
    { id: 'eye-level', label: 'A nivel de ojos' },
    { id: '45-degree elevated', label: 'Elevado 45°' },
    { id: 'low-angle', label: 'Contrapicado' },
    { id: 'high-angle', label: 'Picado' },
    { id: 'birds-eye', label: 'Cenital' },
];

// Shot type options
const SHOT_TYPES = [
    { id: 'close-up', label: 'Close-up' },
    { id: 'macro', label: 'Macro' },
    { id: 'medium shot', label: 'Plano medio' },
    { id: 'wide shot', label: 'Plano general' },
    { id: 'full shot', label: 'Plano entero' },
];

// Lens options
const LENS_OPTIONS = [
    { id: '35mm wide-angle', label: '35mm (Angular)' },
    { id: '50mm portrait', label: '50mm (Retrato)' },
    { id: '85mm bokeh', label: '85mm (Bokeh)' },
    { id: '100mm macro', label: '100mm (Macro)' },
];

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
    'product': <Package size={20} />,
    'product_hero': <Package size={20} />,
    'lifestyle': <Sparkles size={20} />,
    'promotional': <Zap size={20} />,
    'minimalist': <span className="text-lg">⚪</span>,
    'editorial': <span className="text-lg">📰</span>,
    'seasonal': <span className="text-lg">🎄</span>,
};

export const ReferenceSelectorStep: React.FC = () => {
    const { state, dispatch } = useStudio();
    const [templates, setTemplates] = useState<GenerationTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load templates
    useEffect(() => {
        const loadTemplates = async () => {
            try {
                const result = await getGenerationTemplates();
                // Ensure result.templates is always an array
                setTemplates(Array.isArray(result.templates) ? result.templates : []);
            } catch (err) {
                console.error('Error loading templates:', err);
                // Fallback to empty array on error
                setTemplates([]);
            } finally {
                setIsLoading(false);
            }
        };
        loadTemplates();
    }, []);

    const toggleReference = (imageId: string) => {
        dispatch({ type: 'TOGGLE_STYLE_REFERENCE', payload: imageId });
    };

    const setProductImage = (imageId: string | undefined) => {
        dispatch({ type: 'SET_PRODUCT_IMAGE', payload: imageId });
    };

    const selectTemplate = (template: GenerationTemplate | undefined) => {
        dispatch({ type: 'SET_TEMPLATE', payload: template });
    };

    // Copy Style feature handlers
    const handleModeToggle = (mode: 'visual' | 'copy_style') => {
        dispatch({ type: 'SET_REFERENCE_MODE', payload: mode });
    };

    const handleAnalyzeStyle = async (imageId: string) => {
        if (state.isAnalyzingStyle) return;
        
        dispatch({ type: 'SET_ANALYZING_STYLE', payload: true });
        
        try {
            const analysis = await analyzeReferenceStyle(imageId);
            dispatch({ type: 'SET_STYLE_ANALYSIS', payload: { analysis, imageId } });
        } catch (error) {
            console.error('Error analyzing style:', error);
            dispatch({ type: 'SET_ANALYZING_STYLE', payload: false });
        }
    };

    const handleApplyStyle = () => {
        dispatch({ type: 'APPLY_STYLE_ANALYSIS' });
    };

    const handleClearAnalysis = () => {
        dispatch({ type: 'CLEAR_STYLE_ANALYSIS' });
    };

    // Filter images by category for easier selection (with null-safety)
    const productImages = (state.imageBank || []).filter(img => img && img.category === 'product');
    const styleReferences = (state.imageBank || []).filter(img => 
        img && (img.category === 'reference' || img.category === 'lifestyle' || img.category === 'background')
    );

    const canProceed = state.selectedStyleReferences.length > 0 || state.selectedProductImage;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 pb-24"
        >
            {/* HEADER */}
            <div className="bg-white/60 backdrop-blur-md rounded-3xl p-8 border border-white/50 shadow-xl shadow-indigo-50/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-100/50 to-transparent rounded-bl-full pointer-events-none" />
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center text-white">
                            <Layers size={20} />
                        </div>
                        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                            Configurar Generación
                        </h2>
                    </div>
                    <p className="text-gray-600 max-w-2xl text-lg leading-relaxed">
                        Selecciona las imágenes de referencia que guiarán el estilo. NanoBanana puede usar 
                        <strong className="text-indigo-700"> hasta 14 referencias</strong> para mantener alta fidelidad.
                    </p>
                </div>
            </div>

            {/* GENERATION TEMPLATES */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-100 shadow-lg">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Settings2 size={18} className="text-indigo-500" />
                    Template de Generación
                </h3>
                
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="animate-spin text-indigo-500" size={32} />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {templates.map(template => (
                            <button
                                key={template.id}
                                onClick={() => selectTemplate(
                                    state.selectedTemplate?.id === template.id ? undefined : template
                                )}
                                className={`p-4 rounded-xl text-center transition-all border-2 ${
                                    state.selectedTemplate?.id === template.id
                                        ? 'bg-indigo-100 border-indigo-500 shadow-lg'
                                        : 'bg-white border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                                }`}
                            >
                                <div className="w-10 h-10 mx-auto mb-2 bg-gray-100 rounded-xl flex items-center justify-center">
                                    {TEMPLATE_ICONS[template.category] || <Sparkles size={20} />}
                                </div>
                                <p className="font-semibold text-sm text-gray-900">{template.display_name}</p>
                                <p className="text-xs text-gray-500 mt-1">{template.description?.slice(0, 40)}</p>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* PRODUCT IMAGE SELECTOR */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-100 shadow-lg">
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <Package size={18} className="text-emerald-500" />
                    Imagen de Producto (Alta Fidelidad)
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                    Selecciona UNA imagen de producto para preservar detalles exactos (etiquetas, colores, forma).
                </p>

                {productImages.length === 0 ? (
                    <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-500">
                        <Package size={32} className="mx-auto mb-2 opacity-50" />
                        <p>No hay imágenes de producto en el banco</p>
                        <p className="text-sm">Sube productos en el paso anterior</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                        {productImages.map(img => (
                            <button
                                key={img.id}
                                onClick={() => setProductImage(
                                    state.selectedProductImage === img.id ? undefined : img.id
                                )}
                                className={`relative aspect-square rounded-xl overflow-hidden border-3 transition-all ${
                                    state.selectedProductImage === img.id
                                        ? 'border-emerald-500 ring-4 ring-emerald-200'
                                        : 'border-transparent hover:border-gray-300'
                                }`}
                            >
                                <img
                                    src={img.thumbnail_url || img.image_url}
                                    alt={img.name || 'Product'}
                                    className="w-full h-full object-cover"
                                />
                                {state.selectedProductImage === img.id && (
                                    <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                                        <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                                            <Check size={14} className="text-white" />
                                        </div>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* STYLE REFERENCES SELECTOR */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-100 shadow-lg">
                {/* Header with mode toggle */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Sparkles size={18} className="text-violet-500" />
                        Referencias de Estilo
                    </h3>
                    
                    {/* Mode Toggle */}
                    <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
                        <button
                            onClick={() => handleModeToggle('visual')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${
                                state.referenceMode === 'visual'
                                    ? 'bg-white text-violet-700 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Eye size={14} />
                            Visual
                        </button>
                        <button
                            onClick={() => handleModeToggle('copy_style')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${
                                state.referenceMode === 'copy_style'
                                    ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Wand2 size={14} />
                            Copiar Estilo
                        </button>
                    </div>
                </div>

                {/* Mode-specific description */}
                <p className="text-sm text-gray-500 mb-4">
                    {state.referenceMode === 'visual' 
                        ? 'Selecciona hasta 6 imágenes para transferir estilo, composición y mood.'
                        : 'Haz clic en una imagen para analizar su estilo y auto-configurar la generación.'
                    }
                </p>

                {/* Selection/Analysis Counter */}
                {state.referenceMode === 'visual' && (
                    <div className="flex justify-end mb-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            state.selectedStyleReferences.length >= 6 
                                ? 'bg-amber-100 text-amber-700' 
                                : 'bg-gray-100 text-gray-600'
                        }`}>
                            {state.selectedStyleReferences.length} / 6 seleccionadas
                        </span>
                    </div>
                )}

                {/* Style Analysis Result Panel */}
                <AnimatePresence>
                    {state.referenceMode === 'copy_style' && state.styleAnalysis && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-6 overflow-hidden"
                        >
                            <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-2xl p-6 border border-violet-200">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-bold text-violet-900 flex items-center gap-2">
                                        <Wand2 size={18} className="text-violet-600" />
                                        Análisis de Estilo Completado
                                    </h4>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleApplyStyle}
                                            className="px-4 py-2 bg-violet-600 text-white rounded-lg font-medium text-sm hover:bg-violet-700 transition-colors flex items-center gap-2"
                                        >
                                            <Check size={14} />
                                            Aplicar Configuración
                                        </button>
                                        <button
                                            onClick={handleClearAnalysis}
                                            className="px-3 py-2 bg-white text-gray-600 rounded-lg text-sm hover:bg-gray-100 transition-colors"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>

                                {/* Analysis Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    {/* Composition */}
                                    <div className="bg-white/80 rounded-xl p-3">
                                        <div className="flex items-center gap-2 text-violet-700 font-semibold mb-2">
                                            <Layout size={14} />
                                            Composición
                                        </div>
                                        <p className="text-gray-600"><strong>Ángulo:</strong> {state.styleAnalysis.composition.camera_angle}</p>
                                        <p className="text-gray-600"><strong>Plano:</strong> {state.styleAnalysis.composition.shot_type}</p>
                                        <p className="text-gray-600"><strong>Ratio:</strong> {state.styleAnalysis.composition.aspect_ratio}</p>
                                    </div>

                                    {/* Lighting */}
                                    <div className="bg-white/80 rounded-xl p-3">
                                        <div className="flex items-center gap-2 text-amber-700 font-semibold mb-2">
                                            <Sun size={14} />
                                            Iluminación
                                        </div>
                                        <p className="text-gray-600"><strong>Tipo:</strong> {state.styleAnalysis.lighting.type}</p>
                                        <p className="text-gray-600"><strong>Dirección:</strong> {state.styleAnalysis.lighting.direction}</p>
                                        <p className="text-gray-600"><strong>Temperatura:</strong> {state.styleAnalysis.lighting.color_temperature}</p>
                                    </div>

                                    {/* Colors */}
                                    <div className="bg-white/80 rounded-xl p-3">
                                        <div className="flex items-center gap-2 text-pink-700 font-semibold mb-2">
                                            <Palette size={14} />
                                            Colores
                                        </div>
                                        <div className="flex gap-2 mb-2">
                                            <div 
                                                className="w-6 h-6 rounded-full border border-gray-300" 
                                                style={{ backgroundColor: state.styleAnalysis.color_palette.primary }}
                                                title="Primario"
                                            />
                                            <div 
                                                className="w-6 h-6 rounded-full border border-gray-300" 
                                                style={{ backgroundColor: state.styleAnalysis.color_palette.secondary }}
                                                title="Secundario"
                                            />
                                            {state.styleAnalysis.color_palette.accent && (
                                                <div 
                                                    className="w-6 h-6 rounded-full border border-gray-300" 
                                                    style={{ backgroundColor: state.styleAnalysis.color_palette.accent }}
                                                    title="Acento"
                                                />
                                            )}
                                        </div>
                                        <p className="text-gray-600 text-xs">{state.styleAnalysis.color_palette.mood}</p>
                                    </div>

                                    {/* Style */}
                                    <div className="bg-white/80 rounded-xl p-3">
                                        <div className="flex items-center gap-2 text-emerald-700 font-semibold mb-2">
                                            <Sparkles size={14} />
                                            Estilo
                                        </div>
                                        <p className="text-gray-600"><strong>Estética:</strong> {state.styleAnalysis.style.aesthetic}</p>
                                        <p className="text-gray-600"><strong>Mood:</strong> {state.styleAnalysis.style.mood}</p>
                                        <p className="text-gray-600"><strong>Arquetipo:</strong> {state.styleAnalysis.archetype_suggestion}</p>
                                    </div>
                                </div>

                                {/* Reconstruction Summary */}
                                {state.styleAnalysis.reconstruction_summary && (
                                    <div className="mt-4 bg-white/80 rounded-xl p-3">
                                        <p className="text-sm font-semibold text-gray-700 mb-1">Prompt sugerido:</p>
                                        <p className="text-gray-600 text-sm italic">"{state.styleAnalysis.reconstruction_summary}"</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Loading State for Analysis */}
                {state.isAnalyzingStyle && (
                    <div className="mb-6 bg-violet-50 rounded-xl p-6 flex items-center justify-center gap-3">
                        <Loader2 className="animate-spin text-violet-600" size={24} />
                        <span className="text-violet-700 font-medium">Analizando estilo con IA...</span>
                    </div>
                )}

                {/* Image Grid */}
                {styleReferences.length === 0 ? (
                    <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-500">
                        <Image size={32} className="mx-auto mb-2 opacity-50" />
                        <p>No hay referencias de estilo en el banco</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                        {styleReferences.map(img => {
                            const isSelected = state.selectedStyleReferences.includes(img.id);
                            const selectionIndex = state.selectedStyleReferences.indexOf(img.id);
                            const isAnalyzed = state.analyzedImageId === img.id;
                            
                            return (
                                <button
                                    key={img.id}
                                    onClick={() => {
                                        if (state.referenceMode === 'copy_style') {
                                            handleAnalyzeStyle(img.id);
                                        } else {
                                            toggleReference(img.id);
                                        }
                                    }}
                                    disabled={
                                        state.isAnalyzingStyle || 
                                        (state.referenceMode === 'visual' && !isSelected && state.selectedStyleReferences.length >= 6)
                                    }
                                    className={`relative aspect-square rounded-xl overflow-hidden border-3 transition-all ${
                                        state.referenceMode === 'copy_style'
                                            ? isAnalyzed
                                                ? 'border-fuchsia-500 ring-4 ring-fuchsia-200'
                                                : 'border-transparent hover:border-fuchsia-300 hover:scale-105'
                                            : isSelected
                                                ? 'border-violet-500 ring-4 ring-violet-200'
                                                : state.selectedStyleReferences.length >= 6
                                                    ? 'border-transparent opacity-40 cursor-not-allowed'
                                                    : 'border-transparent hover:border-gray-300'
                                    }`}
                                >
                                    <img
                                        src={img.thumbnail_url || img.image_url}
                                        alt={img.name || 'Reference'}
                                        className="w-full h-full object-cover"
                                    />
                                    
                                    {/* Visual Mode: Selection indicator */}
                                    {state.referenceMode === 'visual' && isSelected && (
                                        <div className="absolute top-1 right-1 w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                            {selectionIndex + 1}
                                        </div>
                                    )}
                                    
                                    {/* Copy Style Mode: Wand indicator */}
                                    {state.referenceMode === 'copy_style' && (
                                        <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                                            isAnalyzed ? 'bg-fuchsia-500/30' : 'bg-black/0 hover:bg-black/20'
                                        }`}>
                                            {isAnalyzed ? (
                                                <Check size={24} className="text-white drop-shadow-lg" />
                                            ) : (
                                                <Wand2 size={20} className="text-white opacity-0 hover:opacity-100 drop-shadow-lg transition-opacity" />
                                            )}
                                        </div>
                                    )}
                                    
                                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-[10px] rounded">
                                        {img.category}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ASPECT RATIO & RESOLUTION */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-100 shadow-lg">
                    <h3 className="font-bold text-gray-900 mb-4">Aspect Ratio</h3>
                    <div className="grid grid-cols-5 gap-2">
                        {ASPECT_RATIOS.slice(0, 5).map(ar => (
                            <button
                                key={ar.id}
                                onClick={() => dispatch({ type: 'SET_ASPECT_RATIO', payload: ar.id })}
                                className={`p-2 rounded-xl text-center transition-all border-2 ${
                                    state.aspectRatio === ar.id
                                        ? 'bg-indigo-100 border-indigo-500'
                                        : 'bg-gray-50 border-gray-200 hover:border-indigo-300'
                                }`}
                            >
                                <span className="text-lg">{ar.icon}</span>
                                <p className="font-bold text-sm text-gray-900">{ar.label}</p>
                                <p className="text-[10px] text-gray-500 leading-tight">{ar.desc}</p>
                            </button>
                        ))}
                    </div>
                    <div className="grid grid-cols-5 gap-2 mt-2">
                        {ASPECT_RATIOS.slice(5).map(ar => (
                            <button
                                key={ar.id}
                                onClick={() => dispatch({ type: 'SET_ASPECT_RATIO', payload: ar.id })}
                                className={`p-2 rounded-xl text-center transition-all border-2 ${
                                    state.aspectRatio === ar.id
                                        ? 'bg-indigo-100 border-indigo-500'
                                        : 'bg-gray-50 border-gray-200 hover:border-indigo-300'
                                }`}
                            >
                                <span className="text-lg">{ar.icon}</span>
                                <p className="font-bold text-sm text-gray-900">{ar.label}</p>
                                <p className="text-[10px] text-gray-500 leading-tight">{ar.desc}</p>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-100 shadow-lg">
                    <h3 className="font-bold text-gray-900 mb-4">Resolución</h3>
                    <div className="grid grid-cols-3 gap-3">
                        {RESOLUTIONS.map(res => (
                            <button
                                key={res.id}
                                onClick={() => dispatch({ type: 'SET_RESOLUTION', payload: res.id as '1K' | '2K' | '4K' })}
                                className={`p-4 rounded-xl text-center transition-all border-2 ${
                                    state.resolution === res.id
                                        ? 'bg-indigo-100 border-indigo-500'
                                        : 'bg-gray-50 border-gray-200 hover:border-indigo-300'
                                }`}
                            >
                                <p className="font-bold text-lg text-gray-900">{res.label}</p>
                                <p className="text-xs text-gray-500">{res.desc}</p>
                            </button>
                        ))}
                    </div>

                    {/* Pro Model Toggle */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <label className="flex items-center justify-between cursor-pointer">
                            <div>
                                <p className="font-semibold text-gray-900">Usar Modelo Pro</p>
                                <p className="text-xs text-gray-500">Mejor calidad, hasta 14 referencias</p>
                            </div>
                            <div 
                                onClick={() => dispatch({ type: 'SET_USE_PRO_MODEL', payload: !state.useProModel })}
                                className={`w-12 h-6 rounded-full transition-all relative ${
                                    state.useProModel ? 'bg-indigo-600' : 'bg-gray-300'
                                }`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow ${
                                    state.useProModel ? 'left-7' : 'left-1'
                                }`} />
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            {/* CAMERA CONTROLS (Advanced) */}
            <details className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-lg">
                <summary className="p-6 cursor-pointer flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Camera size={18} className="text-amber-500" />
                        <h3 className="font-bold text-gray-900">Control de Cámara (Avanzado)</h3>
                    </div>
                    <span className="text-sm text-gray-500">Opcional</span>
                </summary>
                <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Camera Angle */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Ángulo de cámara</label>
                        <select 
                            value={state.cameraSettings?.angle || ''}
                            onChange={(e) => dispatch({ 
                                type: 'SET_CAMERA_SETTING', 
                                payload: { key: 'angle', value: e.target.value || undefined }
                            })}
                            className="w-full p-3 rounded-xl border border-gray-200 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                        >
                            <option value="">Auto (según arquetipo)</option>
                            {CAMERA_ANGLES.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Shot Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de plano</label>
                        <select 
                            value={state.cameraSettings?.shot || ''}
                            onChange={(e) => dispatch({ 
                                type: 'SET_CAMERA_SETTING', 
                                payload: { key: 'shot', value: e.target.value || undefined }
                            })}
                            className="w-full p-3 rounded-xl border border-gray-200 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                        >
                            <option value="">Auto (según arquetipo)</option>
                            {SHOT_TYPES.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Lens */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Lente</label>
                        <select 
                            value={state.cameraSettings?.lens || ''}
                            onChange={(e) => dispatch({ 
                                type: 'SET_CAMERA_SETTING', 
                                payload: { key: 'lens', value: e.target.value || undefined }
                            })}
                            className="w-full p-3 rounded-xl border border-gray-200 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                        >
                            <option value="">Auto (según arquetipo)</option>
                            {LENS_OPTIONS.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </details>

            {/* SELECTION SUMMARY */}
            {(state.selectedProductImage || state.selectedStyleReferences.length > 0) && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5">
                    <h4 className="font-bold text-indigo-800 mb-2">Resumen de Configuración</h4>
                    <ul className="space-y-1 text-sm text-indigo-700">
                        {state.selectedProductImage && <li>✅ 1 imagen de producto (alta fidelidad)</li>}
                        {state.selectedStyleReferences.length > 0 && (
                            <li>✅ {state.selectedStyleReferences.length} referencias de estilo</li>
                        )}
                        <li>📐 Aspect ratio: {state.aspectRatio}</li>
                        <li>🖼️ Resolución: {state.resolution}</li>
                        {state.useProModel && <li>⚡ Modelo Pro activado (hasta 14 referencias)</li>}
                        {state.cameraSettings?.angle && <li>📷 Ángulo: {state.cameraSettings.angle}</li>}
                        {state.cameraSettings?.shot && <li>🎬 Plano: {state.cameraSettings.shot}</li>}
                        {state.cameraSettings?.lens && <li>🔭 Lente: {state.cameraSettings.lens}</li>}
                    </ul>
                </div>
            )}

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
                            ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:scale-105'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                >
                    Generar Imagen
                    <Sparkles size={20} />
                </button>
            </div>
        </motion.div>
    );
};
