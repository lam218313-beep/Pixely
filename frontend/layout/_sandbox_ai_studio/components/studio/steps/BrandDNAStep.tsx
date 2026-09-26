import React, { useEffect, useState } from 'react';
import { useStudio } from '../../../contexts/StudioContext';
import { getBrandDNA, saveBrandDNA, getClients, Client } from '../../../services/api';
import { motion } from 'framer-motion';
import { 
    Palette, Sun, Heart, Sparkles, Save, Check, 
    AlertCircle, Loader2, ArrowRight, Settings2 
} from 'lucide-react';

const LIGHTING_OPTIONS = [
    { value: 'studio', label: 'Studio profesional' },
    { value: 'natural', label: 'Luz natural suave' },
    { value: 'golden_hour', label: 'Golden hour' },
    { value: 'dramatic', label: 'Dramático con sombras' },
    { value: 'soft', label: 'Luz plana editorial' },
    { value: 'neon', label: 'Neón/Artificial' }
];

const MOOD_OPTIONS = [
    { value: 'luxurious', label: 'Aspiracional y premium' },
    { value: 'playful', label: 'Amigable y cercano' },
    { value: 'professional', label: 'Minimalista y clean' },
    { value: 'energetic', label: 'Energético y vibrante' },
    { value: 'calm', label: 'Sereno y wellness' },
    { value: 'bold', label: 'Bold y disruptivo' }
];

const ARCHETYPE_OPTIONS = [
    { id: 'promotional', label: 'Promocional', icon: '🏷️' },
    { id: 'lifestyle', label: 'Lifestyle', icon: '✨' },
    { id: 'product_hero', label: 'Producto', icon: '📦' },
    { id: 'minimalist', label: 'Minimal', icon: '⚪' },
    { id: 'editorial', label: 'Editorial', icon: '📰' },
];

export const BrandDNAStep: React.FC = () => {
    const { state, dispatch } = useStudio();
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoadingClients, setIsLoadingClients] = useState(true);
    const [isLoadingDNA, setIsLoadingDNA] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Local form state
    const [formData, setFormData] = useState({
        color_primary_name: '',
        color_primary_hex: '#000000',
        color_secondary_name: '',
        color_secondary_hex: '#666666',
        color_accent_name: '',
        color_accent_hex: '#FF5500',
        default_style: 'natural' as 'natural' | 'vivid',
        default_lighting: 'studio',
        default_mood: 'luxurious',
        default_resolution: '2K',
        preferred_archetypes: [] as string[],
        always_exclude: ['text', 'letters', 'words', 'logos', 'watermarks'],
        brand_essence: '',
        visual_keywords: [] as string[],
        industry_leader_instagram: '',
    });
    const [keywordInput, setKeywordInput] = useState('');

    // Load clients
    useEffect(() => {
        const loadClients = async () => {
            try {
                const data = await getClients();
                setClients(data);
            } catch (err) {
                setError('Error cargando clientes');
            } finally {
                setIsLoadingClients(false);
            }
        };
        loadClients();
    }, []);

    // Load Brand DNA when client changes
    useEffect(() => {
        if (!state.clientId) return;
        
        const loadDNA = async () => {
            setIsLoadingDNA(true);
            setError(null);
            try {
                const result = await getBrandDNA(state.clientId);
                if (result.dna) {
                    setFormData({
                        color_primary_name: result.dna.color_primary_name || '',
                        color_primary_hex: result.dna.color_primary_hex || '#000000',
                        color_secondary_name: result.dna.color_secondary_name || '',
                        color_secondary_hex: result.dna.color_secondary_hex || '#666666',
                        color_accent_name: result.dna.color_accent_name || '',
                        color_accent_hex: result.dna.color_accent_hex || '#FF5500',
                        default_style: result.dna.default_style || 'natural',
                        default_lighting: result.dna.default_lighting || 'studio',
                        default_mood: result.dna.default_mood || 'luxurious',
                        default_resolution: result.dna.default_resolution || '2K',
                        preferred_archetypes: result.dna.preferred_archetypes || [],
                        always_exclude: result.dna.always_exclude || ['text', 'letters', 'words', 'logos', 'watermarks'],
                        brand_essence: result.dna.brand_essence || '',
                        visual_keywords: result.dna.visual_keywords || [],
                        industry_leader_instagram: result.dna.industry_leader_instagram || '',
                    });
                    dispatch({ 
                        type: 'LOAD_BRAND_DNA', 
                        payload: { dna: result.dna, isConfigured: result.is_configured } 
                    });
                }
            } catch (err) {
                console.error('Error loading brand DNA:', err);
            } finally {
                setIsLoadingDNA(false);
            }
        };
        loadDNA();
    }, [state.clientId, dispatch]);

    const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        dispatch({ type: 'SET_CLIENT', payload: e.target.value });
    };

    const toggleArchetype = (id: string) => {
        setFormData(prev => ({
            ...prev,
            preferred_archetypes: prev.preferred_archetypes.includes(id)
                ? prev.preferred_archetypes.filter(a => a !== id)
                : [...prev.preferred_archetypes, id]
        }));
    };

    const addKeyword = () => {
        if (keywordInput.trim() && !formData.visual_keywords.includes(keywordInput.trim())) {
            setFormData(prev => ({
                ...prev,
                visual_keywords: [...prev.visual_keywords, keywordInput.trim()]
            }));
            setKeywordInput('');
        }
    };

    const removeKeyword = (keyword: string) => {
        setFormData(prev => ({
            ...prev,
            visual_keywords: prev.visual_keywords.filter(k => k !== keyword)
        }));
    };

    const handleSave = async () => {
        if (!state.clientId) return;
        
        setIsSaving(true);
        setSaveSuccess(false);
        try {
            const result = await saveBrandDNA(state.clientId, formData);
            dispatch({ 
                type: 'LOAD_BRAND_DNA', 
                payload: { dna: result.dna, isConfigured: true } 
            });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            setError('Error guardando configuración');
        } finally {
            setIsSaving(false);
        }
    };

    const canProceed = state.clientId && state.isBrandDNAConfigured;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 pb-24"
        >
            {/* HEADER */}
            <div className="bg-white/60 backdrop-blur-md rounded-3xl p-8 border border-white/50 shadow-xl shadow-indigo-50/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-violet-100/50 to-transparent rounded-bl-full pointer-events-none" />
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-tr from-violet-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
                            <Palette size={20} />
                        </div>
                        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                            ADN Visual de Marca
                        </h2>
                    </div>
                    <p className="text-gray-600 max-w-2xl text-lg leading-relaxed">
                        Configura la identidad visual persistente de tu marca. Esta información se usará en 
                        <strong className="text-violet-700"> todas las generaciones</strong> para mantener consistencia.
                    </p>
                </div>
            </div>

            {/* CLIENT SELECTOR */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-100 shadow-lg">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Seleccionar Cliente
                </label>
                {isLoadingClients ? (
                    <div className="flex items-center gap-2 text-gray-500">
                        <Loader2 className="animate-spin" size={18} />
                        <span>Cargando clientes...</span>
                    </div>
                ) : (
                    <select
                        value={state.clientId}
                        onChange={handleClientChange}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    >
                        <option value="">Selecciona un cliente...</option>
                        {clients.map(client => (
                            <option key={client.id} value={client.id}>
                                {client.nombre}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {/* DNA CONFIGURATION */}
            {state.clientId && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    {isLoadingDNA ? (
                        <div className="bg-white/80 rounded-2xl p-12 flex items-center justify-center">
                            <Loader2 className="animate-spin text-violet-500" size={32} />
                        </div>
                    ) : (
                        <>
                            {/* COLORS */}
                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-100 shadow-lg">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Palette size={18} className="text-violet-500" />
                                    Paleta de Colores
                                </h3>
                                <p className="text-sm text-gray-500 mb-4">
                                    Usa nombres descriptivos (ej: "azul océano profundo") - la IA entiende mejor colores en lenguaje natural.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {['primary', 'secondary', 'accent'].map((type) => (
                                        <div key={type} className="space-y-2">
                                            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                                Color {type === 'primary' ? 'Principal' : type === 'secondary' ? 'Secundario' : 'Acento'}
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="color"
                                                    value={(formData as any)[`color_${type}_hex`]}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, [`color_${type}_hex`]: e.target.value }))}
                                                    className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="ej: azul eléctrico"
                                                    value={(formData as any)[`color_${type}_name`]}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, [`color_${type}_name`]: e.target.value }))}
                                                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* STYLE & LIGHTING */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-100 shadow-lg">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <Sun size={18} className="text-amber-500" />
                                        Iluminación Default
                                    </h3>
                                    <div className="space-y-2">
                                        {LIGHTING_OPTIONS.map(option => (
                                            <button
                                                key={option.value}
                                                onClick={() => setFormData(prev => ({ ...prev, default_lighting: option.value }))}
                                                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                                    formData.default_lighting === option.value
                                                        ? 'bg-amber-100 text-amber-800 border-2 border-amber-400'
                                                        : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                                                }`}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-100 shadow-lg">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <Heart size={18} className="text-rose-500" />
                                        Mood / Tono Visual
                                    </h3>
                                    <div className="space-y-2">
                                        {MOOD_OPTIONS.map(option => (
                                            <button
                                                key={option.value}
                                                onClick={() => setFormData(prev => ({ ...prev, default_mood: option.value }))}
                                                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                                    formData.default_mood === option.value
                                                        ? 'bg-rose-100 text-rose-800 border-2 border-rose-400'
                                                        : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                                                }`}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* ARCHETYPES */}
                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-100 shadow-lg">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Settings2 size={18} className="text-indigo-500" />
                                    Arquetipos Preferidos
                                </h3>
                                <div className="flex flex-wrap gap-3">
                                    {ARCHETYPE_OPTIONS.map(arch => (
                                        <button
                                            key={arch.id}
                                            onClick={() => toggleArchetype(arch.id)}
                                            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                                                formData.preferred_archetypes.includes(arch.id)
                                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        >
                                            <span>{arch.icon}</span>
                                            {arch.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* VISUAL KEYWORDS */}
                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-100 shadow-lg">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Sparkles size={18} className="text-violet-500" />
                                    Keywords Visuales
                                </h3>
                                <p className="text-sm text-gray-500 mb-4">
                                    Palabras que definen la estética (ej: "minimalista", "orgánico", "tech-forward")
                                </p>
                                <div className="flex gap-2 mb-3">
                                    <input
                                        type="text"
                                        value={keywordInput}
                                        onChange={(e) => setKeywordInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                                        placeholder="Añadir keyword..."
                                        className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500"
                                    />
                                    <button
                                        onClick={addKeyword}
                                        className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors"
                                    >
                                        Añadir
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {formData.visual_keywords.map(kw => (
                                        <span
                                            key={kw}
                                            className="px-3 py-1.5 bg-violet-100 text-violet-800 rounded-full text-sm font-medium flex items-center gap-1.5"
                                        >
                                            {kw}
                                            <button
                                                onClick={() => removeKeyword(kw)}
                                                className="hover:text-violet-600"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* BRAND ESSENCE */}
                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-100 shadow-lg">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">
                                    Esencia de Marca (Opcional)
                                </h3>
                                <textarea
                                    value={formData.brand_essence}
                                    onChange={(e) => setFormData(prev => ({ ...prev, brand_essence: e.target.value }))}
                                    placeholder="Una frase que capture la esencia visual de la marca..."
                                    rows={3}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 resize-none"
                                />
                            </div>

                            {/* SAVE BUTTON */}
                            <div className="flex justify-end">
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className={`px-6 py-3 rounded-xl font-bold text-white transition-all flex items-center gap-2 ${
                                        saveSuccess
                                            ? 'bg-emerald-500'
                                            : 'bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-500/30'
                                    }`}
                                >
                                    {isSaving ? (
                                        <Loader2 className="animate-spin" size={18} />
                                    ) : saveSuccess ? (
                                        <Check size={18} />
                                    ) : (
                                        <Save size={18} />
                                    )}
                                    {saveSuccess ? 'Guardado' : 'Guardar ADN Visual'}
                                </button>
                            </div>
                        </>
                    )}
                </motion.div>
            )}

            {/* ERROR */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            {/* NEXT BUTTON */}
            <div className="fixed bottom-8 right-8 z-50">
                <button
                    onClick={() => dispatch({ type: 'NEXT_STEP' })}
                    disabled={!canProceed}
                    className={`px-8 py-4 rounded-2xl font-bold text-lg flex items-center gap-3 transition-all shadow-2xl ${
                        canProceed
                            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:scale-105'
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
