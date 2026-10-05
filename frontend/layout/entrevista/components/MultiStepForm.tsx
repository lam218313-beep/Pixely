import React, { useState, useEffect, useRef } from 'react';
import {
    Building2,
    Target,
    Lightbulb,
    CheckCircle2,
    ArrowRight,
    ArrowLeft,
    Plus,
    X,
    Edit2,
    Upload,
    FileText,
    Loader2,
    Users,
    BrainCircuit,
    Wallet,
    Activity,
    ChevronDown,
    Check,
    DollarSign,
    ShoppingBag,
    Globe,
    Store,
    MessageCircle,
    TrendingUp,
    TrendingDown,
    Link as LinkIcon,
    Tag,
    Share2,
    UserCog,
    Megaphone,
    ThumbsDown,
    LayoutTemplate,
    Trash2,
    Flag,
    Trophy,
    Compass,
    Star,
    Send
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { saveInterview, getInterview } from '../../services/api';

// Step Definition
const STEPS = [
    { id: 1, title: 'Negocio y Productos', icon: Building2, desc: 'Identidad y oferta' },
    { id: 2, title: 'Audiencia Objetivo', icon: Users, desc: 'Definición del cliente' },
    { id: 3, title: 'Análisis de Mercado', icon: Lightbulb, desc: 'Competencia y nicho' },
    { id: 4, title: 'Situación Actual', icon: Share2, desc: 'Presencia y gestión' },
    { id: 5, title: 'Objetivos', icon: Target, desc: 'Metas y visión' },
    { id: 6, title: 'Confirmación', icon: CheckCircle2, desc: 'Revisión final' }
];

// Internal Steps for Audience
const AUDIENCE_STEPS = [
    { id: 0, title: 'Demográfico', icon: Users },
    { id: 1, title: 'Psicográfico', icon: BrainCircuit },
    { id: 2, title: 'Económico', icon: Wallet },
    { id: 3, title: 'Comportamiento', icon: Activity }
];

// --- COMPONENTS ---

interface ListInputProps {
    label: string;
    items: string[];
    onItemsChange: (items: string[]) => void;
    placeholder: string;
    maxItems?: number;
    icon?: React.ElementType;
    disabled?: boolean;
}

const ListInput: React.FC<ListInputProps> = ({ label, items, onItemsChange, placeholder, maxItems, icon: Icon, disabled }) => {
    const [inputValue, setInputValue] = useState('');
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editValue, setEditValue] = useState('');

    const handleAdd = () => {
        if (inputValue.trim() && !disabled) {
            if (maxItems && items.length >= maxItems) return;
            onItemsChange([...items, inputValue.trim()]);
            setInputValue('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
        }
    };

    const deleteItem = (index: number) => {
        if (disabled) return;
        onItemsChange(items.filter((_, i) => i !== index));
    };

    const startEdit = (index: number) => {
        if (disabled) return;
        setEditingIndex(index);
        setEditValue(items[index]);
    };

    const saveEdit = (index: number) => {
        if (editValue.trim()) {
            const newItems = [...items];
            newItems[index] = editValue.trim();
            onItemsChange(newItems);
        }
        setEditingIndex(null);
    };

    const cancelEdit = () => {
        setEditingIndex(null);
    };

    const isFull = maxItems ? items.length >= maxItems : false;

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-text-2 ml-1 flex items-center gap-2">
                    {Icon && <Icon size={14} className="text-pink-text" />}
                    {label}
                </label>
                {maxItems && !disabled && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isFull ? 'bg-raised text-pink-text' : 'bg-raised text-text-3'}`}>
                        {items.length}/{maxItems}
                    </span>
                )}
            </div>

            {!disabled && (
                <div className="relative">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={isFull ? `Máximo ${maxItems} items alcanzado` : placeholder}
                        disabled={isFull || disabled}
                        className={`w-full bg-raised border border-edge rounded-xl px-4 py-3 pr-12 text-white placeholder-text-3 focus:outline-none focus:ring-2 focus:ring-pink/20 focus:border-pink transition-all ${isFull ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                    <button
                        onClick={handleAdd}
                        type="button"
                        disabled={isFull || disabled}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${isFull ? 'text-mute' : 'text-pink-text hover:bg-pink/15'}`}
                    >
                        <Plus size={20} />
                    </button>
                </div>
            )}

            <div className="space-y-2">
                {items.map((item, index) => (
                    <div key={index} className={`flex items-start gap-3 bg-card border border-edge p-3 rounded-xl shadow-sm group transition-all ${!disabled ? 'hover:shadow-md' : ''}`}>
                        <div className="flex-1 min-w-0 pt-0.5">
                            {editingIndex === index ? (
                                <input
                                    autoFocus
                                    type="text"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveEdit(index);
                                        if (e.key === 'Escape') cancelEdit();
                                    }}
                                    onBlur={() => saveEdit(index)}
                                    className="w-full bg-raised border border-pink rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-pink/20"
                                />
                            ) : (
                                <p className="text-sm text-text-2 font-medium break-words leading-relaxed flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-pink-fill shrink-0"></span>
                                    {item}
                                </p>
                            )}
                        </div>

                        {!disabled && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity self-start">
                                {editingIndex !== index && (
                                    <>
                                        <button
                                            onClick={() => startEdit(index)}
                                            className="p-1.5 text-text-3 hover:text-pink-text hover:bg-pink/15 rounded-lg transition-colors"
                                            title="Editar"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            onClick={() => deleteItem(index)}
                                            className="p-1.5 text-text-3 hover:text-pink-text hover:bg-raised rounded-lg transition-colors"
                                            title="Eliminar"
                                        >
                                            <X size={14} />
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                ))}
                {items.length === 0 && disabled && (
                    <div className="p-3 bg-raised rounded-xl border border-edge border-dashed text-center">
                        <p className="text-sm text-text-3 italic">Sin datos registrados.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- MODERN CUSTOM SELECT ---
interface CustomSelectProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: string[];
    placeholder: string;
    disabled?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ label, value, onChange, options, placeholder, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (option: string) => {
        if (disabled) return;
        onChange(option);
        setIsOpen(false);
    };

    return (
        <div className="space-y-2 relative" ref={containerRef}>
            {label && <label className="text-sm font-bold text-text-2 ml-1">{label}</label>}
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full bg-raised border rounded-xl px-4 py-3 flex items-center justify-between transition-all duration-200 ${disabled ? 'cursor-default bg-raised' : 'cursor-pointer hover:border-line hover:bg-raised'} ${isOpen ? 'border-pink ring-2 ring-pink/20 bg-card' : 'border-edge'}`}
            >
                <span className={`text-sm ${value ? 'text-white font-medium' : 'text-text-3'}`}>
                    {value || placeholder}
                </span>
                {!disabled && <ChevronDown size={18} className={`text-text-3 transition-transform duration-300 ${isOpen ? 'rotate-180 text-pink-text' : ''}`} />}
            </div>

            {/* Dropdown Menu */}
            {isOpen && !disabled && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-edge rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[240px] overflow-y-auto custom-scrollbar">
                    {options.map((option, idx) => (
                        <div
                            key={idx}
                            onClick={() => handleSelect(option)}
                            className={`px-4 py-3 text-sm cursor-pointer flex items-center justify-between hover:bg-pink/15 transition-colors ${value === option ? 'bg-pink/15 text-pink-text font-bold' : 'text-text-2'}`}
                        >
                            {option}
                            {value === option && <Check size={16} className="text-pink-text" />}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};



// --- SIMPLE INPUT FIELD COMPONENT (Module Level) ---
interface InputFieldProps {
    label: string;
    name: string;
    value: string;
    onChange: (name: string, value: string) => void;
    placeholder: string;
    type?: string;
    options?: string[];
    disabled?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({ label, name, value, onChange, placeholder, type = "text", options = [], disabled }) => {
    if (options.length > 0) {
        return (
            <CustomSelect
                label={label}
                value={value}
                onChange={(val) => onChange(name, val)}
                options={options}
                placeholder={placeholder}
                disabled={disabled}
            />
        );
    }

    return (
        <div className="space-y-2">
            {label && <label className="text-sm font-bold text-text-2 ml-1">{label}</label>}
            <input
                type={type}
                name={name}
                value={value}
                onChange={(e) => onChange(name, e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className={`w-full bg-raised border rounded-xl px-4 py-3 text-white placeholder-text-3 focus:outline-none focus:ring-2 focus:ring-pink/20 focus:border-pink transition-all ${disabled ? 'border-edge bg-raised cursor-default' : 'border-edge'}`}
            />
        </div>
    );
};

// --- MAIN FORM COMPONENT ---

/** `editMode`: an existing interview opens unlocked at step 1 (updating the Ficha) instead of as a read-only record. */
export const MultiStepForm: React.FC<{ editMode?: boolean; onSaved?: () => void }> = ({ editMode = false, onSaved }) => {
    const { user } = useAuth();
    const clientId = user?.fichaClienteId;

    const [currentStep, setCurrentStep] = useState(1);
    const [audienceStep, setAudienceStep] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFinished, setIsFinished] = useState(false);

    const [formData, setFormData] = useState({
        businessName: '',
        history: '',
        productFile: null as File | null,
        differentiator: [] as string[],
        vision: '',
        // Step 2 Data
        audience: {
            ageRange: '',
            gender: '',
            location: '',
            occupation: '',
            maritalStatus: '',
            interests: '',
            values: '',
            painPoints: '',
            desires: '',
            lifestyle: '',
            incomeLevel: '',
            priceSensitivity: '',
            spendingHabits: '',
            frequency: '',
            loyalty: '',
            decisionRole: '',
            usage: ''
        },
        // Step 3 Data (Market)
        market: {
            priceRange: '',
            promotions: '',
            channels: [] as string[],
            bestSellers: [] as string[],
            worstSellers: [] as string[],
            competitors: [] as string[]
        },
        // Step 4 Data (Brand / Situación Actual)
        brand: {
            socialNetworks: [] as { platform: string; link: string; frequency: string }[],
            socialManager: '',
            adsExperience: '',
            bestContent: [] as string[],
            badExperiences: ''
        },
        // Step 5 Data (Goals)
        goals: {
            salesGoals: [] as string[],
            brandGoals: [] as string[],
            growthStrategy: [] as string[],
            positioning: [] as string[]
        }
    });

    // Load existing interview data on mount
    useEffect(() => {
        const loadExistingInterview = async () => {
            if (!clientId) return;

            try {
                setIsLoading(true);
                const result = await getInterview(clientId);

                if (result?.data && Object.keys(result.data).length > 0) {
                    // Data exists, populate form
                    const data = result.data;

                    setFormData(prev => ({
                        ...prev,
                        businessName: data.businessName || '',
                        history: data.history || '',
                        differentiator: data.differentiator || [],
                        vision: data.vision || '',
                        audience: {
                            ...prev.audience,
                            ...data.audience
                        },
                        market: {
                            ...prev.market,
                            ...data.market
                        },
                        brand: {
                            ...prev.brand,
                            ...data.brand
                        },
                        goals: {
                            ...prev.goals,
                            ...data.goals
                        }
                    }));

                    // Already submitted: read-only record, unless the client chose to update it
                    if (!editMode) {
                        setIsFinished(true);
                        setCurrentStep(6); // Go to confirmation step
                    }
                }
            } catch (error) {
                console.error('Error loading existing interview:', error);
                // If error, just start fresh
            } finally {
                setIsLoading(false);
            }
        };

        loadExistingInterview();
    }, [clientId, editMode]);

    const [socialInput, setSocialInput] = useState({ platform: '', link: '', frequency: '' });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAudienceChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            audience: { ...prev.audience, [name]: value }
        }));
    };

    const handleAudienceFieldChange = (name: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            audience: { ...prev.audience, [name]: value }
        }));
    };

    const handleMarketChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            market: { ...prev.market, [name]: value }
        }));
    };

    const handleBrandChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            brand: { ...prev.brand, [name]: value }
        }));
    };

    const handleGoalsListChange = (name: 'growthStrategy' | 'salesGoals' | 'brandGoals' | 'positioning', items: string[]) => {
        setFormData(prev => ({
            ...prev,
            goals: { ...prev.goals, [name]: items }
        }));
    };

    const handleAudienceSelect = (name: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            audience: { ...prev.audience, [name]: value }
        }));
    };

    const handleListChange = (name: 'differentiator', items: string[]) => {
        setFormData(prev => ({ ...prev, [name]: items }));
    };

    const handleMarketListChange = (name: 'bestSellers' | 'worstSellers' | 'competitors', items: string[]) => {
        setFormData(prev => ({
            ...prev,
            market: { ...prev.market, [name]: items }
        }));
    };

    const handleBrandListChange = (name: 'bestContent', items: string[]) => {
        setFormData(prev => ({
            ...prev,
            brand: { ...prev.brand, [name]: items }
        }));
    };

    const addSocialNetwork = () => {
        if (socialInput.platform && socialInput.link) {
            setFormData(prev => ({
                ...prev,
                brand: {
                    ...prev.brand,
                    socialNetworks: [...prev.brand.socialNetworks, socialInput]
                }
            }));
            setSocialInput({ platform: '', link: '', frequency: '' });
        }
    };

    const removeSocialNetwork = (index: number) => {
        const updated = formData.brand.socialNetworks.filter((_, i) => i !== index);
        setFormData(prev => ({
            ...prev,
            brand: { ...prev.brand, socialNetworks: updated }
        }));
    };

    const toggleChannel = (channel: string) => {
        if (isFinished) return;
        const current = formData.market.channels;
        let updated;
        if (current.includes(channel)) {
            updated = current.filter(c => c !== channel);
        } else {
            updated = [...current, channel];
        }
        setFormData(prev => ({
            ...prev,
            market: { ...prev.market, channels: updated }
        }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData(prev => ({ ...prev, productFile: e.target.files![0] }));
        }
    };

    const removeFile = (e: React.MouseEvent) => {
        e.preventDefault();
        if (isFinished) return;
        setFormData(prev => ({ ...prev, productFile: null }));
    };

    const nextStep = async () => {
        // Logic for Audience Step (Step 2)
        if (currentStep === 2) {
            if (audienceStep < 3) {
                setAudienceStep(prev => prev + 1);
                return;
            }
        }

        if (currentStep < 6) {
            setIsLoading(true);
            await new Promise(resolve => setTimeout(resolve, 500));
            setCurrentStep(prev => prev + 1);
            setIsLoading(false);
        }
    };

    const prevStep = () => {
        if (currentStep === 2 && audienceStep > 0) {
            setAudienceStep(prev => prev - 1);
            return;
        }
        if (currentStep > 1 && !isLoading) setCurrentStep(prev => prev - 1);
    };

    const jumpToStep = (stepId: number) => {
        if (isLoading || isSubmitting) return;

        // Allow jumping freely if finished, otherwise restrict to visited steps
        if (isFinished || stepId <= currentStep) {
            setCurrentStep(stepId);
        }
    };

    const handleFinalize = async () => {
        if (!clientId) {
            alert("Error: No client context found.");
            return;
        }

        setIsSubmitting(true);
        try {
            await saveInterview(clientId, formData, formData.productFile);
            setIsFinished(true);
            onSaved?.();
        } catch (error) {
            console.error("Error saving data:", error);
            alert("Hubo un error al guardar los datos.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-card rounded-[40px] shadow-2xl flex flex-col lg:flex-row min-h-[800px] animate-fade-in-up">

            {/* LEFT SIDEBAR - Navigation Only */}
            <div className="lg:w-1/3 bg-raised p-8 lg:p-12 flex flex-col border-r border-edge relative rounded-l-[40px]">
                <div className="absolute top-0 left-0 w-64 h-64 bg-pink/15 rounded-full mix-blend-multiply filter blur-3xl opacity-20 pointer-events-none"></div>

                {/* Logo Removed */}

                <div className="flex-1 flex flex-col justify-center space-y-2 relative z-10">
                    {STEPS.map((step) => {
                        const isActive = step.id === currentStep;
                        const isCompleted = step.id < currentStep || isFinished;
                        const isClickable = (step.id <= currentStep && !isLoading && !isSubmitting) || isFinished;

                        return (
                            <div
                                key={step.id}
                                onClick={() => isClickable && jumpToStep(step.id)}
                                className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${isActive
                                    ? 'bg-card shadow-md border border-edge scale-105'
                                    : isClickable ? 'cursor-pointer hover:bg-card/50 text-text-3' : 'opacity-50 cursor-not-allowed text-mute'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${isActive ? 'bg-pink-fill text-white shadow-md' :
                                    isCompleted ? 'bg-pink/15 text-pink-text' : 'bg-edge text-text-3'
                                    }`}>
                                    {isCompleted ? <CheckCircle2 size={20} /> : <step.icon size={20} />}
                                </div>
                                <div>
                                    <h4 className={`text-xl font-bold ${isActive ? 'text-white' : ''}`}>
                                        {step.title}
                                    </h4>
                                    <p className="text-sm">{step.desc}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Support Box Removed */}
            </div>

            {/* RIGHT CONTENT - Form Area */}
            <div className="lg:w-2/3 p-8 lg:p-16 bg-card relative rounded-r-[40px] overflow-y-auto max-h-[85vh]">
                <div className="max-w-2xl mx-auto h-full flex flex-col">

                    {/* Form Header */}
                    {!isFinished && !isSubmitting && (
                        <div className="mb-8 text-center">
                            <span className="text-pink-text font-bold tracking-widest uppercase text-xs mb-2 block">Paso {currentStep} de 6</span>
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
                                {currentStep === 1 && 'Cuéntanos sobre tu Negocio'}
                                {currentStep === 2 && 'Describe a tu cliente usual'}
                                {currentStep === 3 && 'Análisis de Mercado'}
                                {currentStep === 4 && 'Situación Actual'}
                                {currentStep === 5 && 'Objetivos'}
                                {currentStep === 6 && 'Confirmación'}
                            </h2>
                            <p className="text-text-3 text-base max-w-lg mx-auto leading-relaxed">
                                {currentStep === 1 && 'Completa la información básica para que podamos entender el ADN de tu marca.'}
                                {currentStep === 2 && 'Define el perfil de tu cliente objetivo paso a paso.'}
                                {currentStep === 3 && 'Entendamos tu posición actual, qué vendes y contra quién compites.'}
                                {currentStep === 4 && 'Vamos a definir cómo te comunicas y gestionas tu presencia digital.'}
                                {currentStep === 5 && 'Define tus metas de ventas y marca para trazar el camino al éxito.'}
                                {currentStep === 6 && 'Revisa que todo esté correcto antes de generar tu estrategia.'}
                            </p>
                        </div>
                    )}

                    {/* Navigation Buttons (Top Position) */}
                    {(!isFinished) && (
                        <div className="mb-6 flex items-center justify-between pb-4 border-b border-edge">
                            <button
                                onClick={prevStep}
                                disabled={(currentStep === 1 && audienceStep === 0) || isLoading || isSubmitting}
                                className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all ${(currentStep === 1) || isSubmitting
                                    ? 'text-mute cursor-not-allowed'
                                    : 'text-text-2 hover:bg-raised'
                                    }`}
                            >
                                <ArrowLeft size={18} />
                                {(currentStep === 2 && audienceStep > 0) ? 'Anterior' : 'Atrás'}
                            </button>

                            {/* Only show Next/Continue if NOT on the final step */}
                            {currentStep < 6 && (
                                <button
                                    onClick={nextStep}
                                    disabled={isLoading || isSubmitting}
                                    className="flex items-center gap-2 bg-pink-fill text-white px-8 py-3 rounded-full font-bold text-sm shadow-lg shadow-primary-600/20 hover:bg-pink-fill hover:shadow-primary-600/40 transition-all transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-80 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            <span>Procesando...</span>
                                        </>
                                    ) : (
                                        <>
                                            {(currentStep === 2 && audienceStep < 3) ? 'Siguiente' : 'Continuar'}
                                            <ArrowRight size={18} />
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    )}

                    {/* AUDIENCE STEP PROGRESS (Only for Step 2) */}
                    {currentStep === 2 && (
                        <div className="mb-8 flex gap-2">
                            {AUDIENCE_STEPS.map((step, idx) => (
                                <div
                                    key={step.id}
                                    className={`h-1.5 rounded-full flex-1 transition-all duration-500 ${idx <= audienceStep ? 'bg-pink-fill' : 'bg-raised'}`}
                                />
                            ))}
                        </div>
                    )}

                    {/* FORM CONTENT */}
                    <div className={`flex-1 relative overflow-y-auto pr-2 custom-scrollbar ${isFinished && currentStep !== 6 ? 'pointer-events-none select-none' : ''}`} style={{ maxHeight: isFinished ? 'calc(100vh - 200px)' : '750px' }}>

                        {/* STEP 1: BUSINESS INFO */}
                        {currentStep === 1 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* ... Input fields same as before, just kept concise for XML ... */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-text-2 ml-1">Nombre del Negocio</label>
                                    <input type="text" name="businessName" value={formData.businessName} onChange={handleChange} disabled={isFinished} placeholder="Ej. TechSolutions S.A." className={`w-full bg-raised border rounded-xl px-4 py-3 text-white placeholder-text-3 focus:outline-none focus:ring-2 focus:ring-pink/20 focus:border-pink transition-all ${isFinished ? 'border-edge bg-raised cursor-default' : 'border-edge'}`} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-text-2 ml-1">Historia del Negocio</label>
                                    <textarea name="history" value={formData.history} onChange={handleChange} disabled={isFinished} rows={3} placeholder="¿Cómo empezó todo? Breve resumen..." className={`w-full bg-raised border rounded-xl px-4 py-3 text-white placeholder-text-3 focus:outline-none focus:ring-2 focus:ring-pink/20 focus:border-pink transition-all resize-none ${isFinished ? 'border-edge bg-raised cursor-default' : 'border-edge'}`} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-sm font-bold text-text-2 ml-1">Productos o Servicios</label>
                                        <div className={`relative border-2 border-dashed border-edge rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all group h-[200px] ${isFinished ? 'opacity-70 cursor-default' : 'hover:bg-raised hover:border-pink cursor-pointer'}`}>
                                            <input type="file" accept=".pdf,.xls,.xlsx" onChange={handleFileChange} disabled={isFinished} className={`absolute inset-0 w-full h-full opacity-0 ${isFinished ? 'pointer-events-none' : 'cursor-pointer'} ${formData.productFile ? 'pointer-events-none' : ''}`} />
                                            {formData.productFile ? (
                                                <div className="flex flex-col items-center gap-3 z-10 w-full animate-in zoom-in-50 duration-300">
                                                    <div className="w-12 h-12 bg-pink/15 text-pink-text rounded-xl flex items-center justify-center shadow-sm"><FileText size={24} /></div>
                                                    <div className="text-center w-full px-2"><p className="text-sm font-bold text-white truncate max-w-full">{formData.productFile.name}</p><p className="text-[10px] text-text-3 font-medium uppercase mt-0.5">{(formData.productFile.size / 1024 / 1024).toFixed(2)} MB</p></div>
                                                    {!isFinished && <button onClick={removeFile} className="mt-2 text-xs font-bold text-pink-text bg-raised px-3 py-1.5 rounded-full hover:bg-raised transition-colors flex items-center gap-1"><X size={12} /> Eliminar</button>}
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="w-12 h-12 bg-pink/15 text-pink-text rounded-full flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-pink-fill group-hover:text-white transition-all shadow-sm group-hover:shadow-lg group-hover:shadow-primary-500/30"><Upload size={20} /></div>
                                                    <p className="text-sm font-bold text-text-2 group-hover:text-pink-text transition-colors">Haz clic o arrastra</p>
                                                    <p className="text-xs text-text-3 mt-1">PDF o Excel (Max. 10MB)</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <ListInput label="Diferenciador (USP)" placeholder="Añade un factor diferencial..." items={formData.differentiator} onItemsChange={(items) => handleListChange('differentiator', items)} disabled={isFinished} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-text-2 ml-1">Visión a Mediano/Largo Plazo</label>
                                    <textarea name="vision" value={formData.vision} onChange={handleChange} disabled={isFinished} rows={3} placeholder="¿Dónde ves el negocio en 5 años?" className={`w-full bg-raised border rounded-xl px-4 py-3 text-white placeholder-text-3 focus:outline-none focus:ring-2 focus:ring-pink/20 focus:border-pink transition-all resize-none ${isFinished ? 'border-edge bg-raised cursor-default' : 'border-edge'}`} />
                                </div>
                            </div>
                        )}

                        {/* STEP 2: AUDIENCE TARGETING */}
                        {currentStep === 2 && (
                            <div className="h-full">
                                {/* 2.0 DEMOGRAPHIC */}
                                {audienceStep === 0 && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                            <Users className="text-pink-text" /> Perfil Demográfico
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <InputField label="Rango de Edad" name="ageRange" value={formData.audience.ageRange} onChange={handleAudienceFieldChange} placeholder="Ej. 25-34 años" options={['18-24', '25-34', '35-44', '45-54', '55+']} disabled={isFinished} />
                                            <InputField label="Género" name="gender" value={formData.audience.gender} onChange={handleAudienceFieldChange} placeholder="Ej. Femenino" options={['Masculino', 'Femenino', 'Mixto/Todos']} disabled={isFinished} />
                                            <InputField label="Ubicación" name="location" value={formData.audience.location} onChange={handleAudienceFieldChange} placeholder="Ej. Madrid, España (Urbano)" disabled={isFinished} />
                                            <InputField label="Ocupación/Rol" name="occupation" value={formData.audience.occupation} onChange={handleAudienceFieldChange} placeholder="Ej. Profesionales de Marketing" disabled={isFinished} />
                                            <InputField label="Estado Civil/Familiar" name="maritalStatus" value={formData.audience.maritalStatus} onChange={handleAudienceFieldChange} placeholder="Ej. Solteros sin hijos" options={['Soltero', 'Casado', 'Con hijos', 'Sin hijos']} disabled={isFinished} />
                                        </div>
                                    </div>
                                )}

                                {/* 2.1 PSYCHOGRAPHIC */}
                                {audienceStep === 1 && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                            <BrainCircuit className="text-pink-text" /> Perfil Psicográfico
                                        </h3>
                                        <div className="grid grid-cols-1 gap-6">
                                            <InputField label="Intereses" name="interests" value={formData.audience.interests} onChange={handleAudienceFieldChange} placeholder="Ej. Tecnología, Viajes, Fitness" disabled={isFinished} />
                                            <InputField label="Valores Principales" name="values" value={formData.audience.values} onChange={handleAudienceFieldChange} placeholder="Ej. Sostenibilidad, Innovación, Calidad" disabled={isFinished} />
                                            <InputField label="Dolores (Pain Points)" name="painPoints" value={formData.audience.painPoints} onChange={handleAudienceFieldChange} placeholder="¿Qué problema les quita el sueño?" disabled={isFinished} />
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <InputField label="Deseos/Metas" name="desires" value={formData.audience.desires} onChange={handleAudienceFieldChange} placeholder="¿Qué transformación buscan?" disabled={isFinished} />
                                                <InputField label="Estilo de Vida" name="lifestyle" value={formData.audience.lifestyle} onChange={handleAudienceFieldChange} placeholder="Ej. Nómada digital, Saludable" disabled={isFinished} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 2.2 ECONOMIC */}
                                {audienceStep === 2 && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                            <Wallet className="text-pink-text" /> Perfil Económico
                                        </h3>
                                        <div className="grid grid-cols-1 gap-6">
                                            <InputField label="Nivel de Ingresos" name="incomeLevel" value={formData.audience.incomeLevel} onChange={handleAudienceFieldChange} placeholder="Ej. Medio-Alto" options={['Bajo', 'Medio', 'Medio-Alto', 'Alto', 'Premium']} disabled={isFinished} />
                                            <InputField label="Sensibilidad al Precio" name="priceSensitivity" value={formData.audience.priceSensitivity} onChange={handleAudienceFieldChange} placeholder="Ej. Busca valor sobre precio" options={['Busca Ofertas', 'Equilibrado', 'Paga por Valor', 'Sin restricciones']} disabled={isFinished} />
                                            <InputField label="Hábitos de Gasto" name="spendingHabits" value={formData.audience.spendingHabits} onChange={handleAudienceFieldChange} placeholder="Ej. Planificado vs Impulsivo" disabled={isFinished} />
                                        </div>
                                    </div>
                                )}

                                {/* 2.3 BEHAVIORAL */}
                                {audienceStep === 3 && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                            <Activity className="text-pink-text" /> Comportamiento
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <InputField label="Frecuencia de Compra" name="frequency" value={formData.audience.frequency} onChange={handleAudienceFieldChange} placeholder="Ej. Mensual" options={['Diaria', 'Semanal', 'Mensual', 'Anual', 'Esporádica']} disabled={isFinished} />
                                            <InputField label="Nivel de Lealtad" name="loyalty" value={formData.audience.loyalty} onChange={handleAudienceFieldChange} placeholder="Ej. Recurrente" options={['Nuevo', 'Recurrente', 'Embajador de Marca']} disabled={isFinished} />
                                            <InputField label="Rol en la Decisión" name="decisionRole" value={formData.audience.decisionRole} onChange={handleAudienceFieldChange} placeholder="Ej. Decisor Final" options={['Usuario', 'Influenciador', 'Decisor Final']} disabled={isFinished} />
                                            <InputField label="Uso del Producto" name="usage" value={formData.audience.usage} onChange={handleAudienceFieldChange} placeholder="Ej. Diario/Intensivo" disabled={isFinished} />
                                        </div>
                                    </div>
                                )}


                            </div>
                        )}

                        {/* STEP 3: MARKET ANALYSIS */}
                        {currentStep === 3 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-4">

                                {/* 1. Price Range & Promotion */}
                                <div className="space-y-6">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-edge pb-2">
                                        <DollarSign className="text-pink-text" size={20} /> Posicionamiento y Oferta
                                    </h3>

                                    <div className="space-y-3">
                                        <label className="text-sm font-bold text-text-2 ml-1">Rango de Precios</label>
                                        <div className="grid grid-cols-4 gap-3">
                                            {['Bajo', 'Medio', 'Alto', 'Lujo'].map((range, idx) => {
                                                const isSelected = formData.market.priceRange === range;
                                                return (
                                                    <button
                                                        key={range}
                                                        onClick={() => setFormData(prev => ({ ...prev, market: { ...prev.market, priceRange: range } }))}
                                                        disabled={isFinished}
                                                        className={`py-3 px-2 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${isFinished ? 'opacity-70 cursor-default border-edge' : ''} ${isSelected ? 'border-pink bg-pink/15 text-pink-text shadow-md transform scale-105' : 'border-edge bg-card text-text-3 hover:border-pink hover:bg-raised'}`}
                                                    >
                                                        <span className="text-xs font-bold">{Array(idx + 1).fill('$').join('')}</span>
                                                        <span className="text-sm font-medium">{range}</span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-text-2 ml-1 flex items-center gap-2"><Tag size={14} /> Promociones y Campañas Estacionales</label>
                                        <textarea
                                            name="promotions"
                                            value={formData.market.promotions}
                                            onChange={handleMarketChange}
                                            disabled={isFinished}
                                            rows={2}
                                            placeholder="Ej. Descuentos en Black Friday, 2x1 en Verano..."
                                            className={`w-full bg-raised border rounded-xl px-4 py-3 text-white placeholder-text-3 focus:outline-none focus:ring-2 focus:ring-pink/20 focus:border-pink transition-all resize-none ${isFinished ? 'border-edge bg-raised cursor-default' : 'border-edge'}`}
                                        />
                                    </div>
                                </div>

                                {/* 2. Active Channels */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-edge pb-2">
                                        <Store className="text-pink-text" size={20} /> Canales de Venta Activos
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {[
                                            { id: 'online', label: 'Tienda Online', icon: Globe },
                                            { id: 'social', label: 'Redes Sociales', icon: Users },
                                            { id: 'physical', label: 'Tienda Física', icon: Store },
                                            { id: 'whatsapp', label: 'WhatsApp/Chat', icon: MessageCircle },
                                            { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag },
                                            { id: 'b2b', label: 'Venta Directa B2B', icon: Building2 },
                                        ].map((channel) => {
                                            const isSelected = formData.market.channels.includes(channel.label);
                                            return (
                                                <button
                                                    key={channel.id}
                                                    onClick={() => toggleChannel(channel.label)}
                                                    disabled={isFinished}
                                                    className={`p-3 rounded-xl border flex items-center gap-3 transition-all text-left ${isFinished ? 'opacity-70 cursor-default border-edge' : ''} ${isSelected ? 'border-pink bg-pink/15 text-pink-text shadow-sm' : 'border-edge bg-card text-text-2 hover:bg-raised'}`}
                                                >
                                                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-card text-pink-text' : 'bg-raised text-text-3'}`}>
                                                        <channel.icon size={16} />
                                                    </div>
                                                    <span className="text-sm font-medium">{channel.label}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* 3. Products Portfolio (Best/Worst) */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-edge pb-2">
                                        <ShoppingBag className="text-pink-text" size={20} /> Rendimiento de Productos
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <ListInput
                                            label="Más Vendidos"
                                            icon={TrendingUp}
                                            placeholder="Producto estrella..."
                                            items={formData.market.bestSellers}
                                            onItemsChange={(items) => handleMarketListChange('bestSellers', items)}
                                            maxItems={5}
                                            disabled={isFinished}
                                        />
                                        <ListInput
                                            label="Menos Vendidos"
                                            icon={TrendingDown}
                                            placeholder="Producto con baja rotación..."
                                            items={formData.market.worstSellers}
                                            onItemsChange={(items) => handleMarketListChange('worstSellers', items)}
                                            maxItems={5}
                                            disabled={isFinished}
                                        />
                                    </div>
                                </div>

                                {/* 4. Competitors */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-edge pb-2">
                                        <Compass className="text-pink-text" size={20} /> Competencia y Referentes
                                    </h3>
                                    <ListInput
                                        label="Links de Referencia (Instagram/TikTok)"
                                        icon={LinkIcon}
                                        placeholder="https://instagram.com/competidor..."
                                        items={formData.market.competitors}
                                        onItemsChange={(items) => handleMarketListChange('competitors', items)}
                                        disabled={isFinished}
                                    />
                                </div>

                            </div>
                        )}

                        {/* STEP 4: CURRENT SITUATION (Was Brand Strategy) */}
                        {currentStep === 4 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-4">

                                {/* 4.1 SOCIAL MEDIA PRESENCE */}
                                <div className="space-y-6">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-edge pb-2">
                                        <Share2 className="text-pink-text" size={20} /> Presencia Digital
                                    </h3>

                                    {/* Social Media List Builder */}
                                    <div className="space-y-3">
                                        <label className="text-sm font-bold text-text-2 ml-1">Redes Sociales Actuales</label>

                                        {/* Input Row */}
                                        <div className="flex flex-col md:flex-row gap-3">
                                            <div className="md:w-1/4">
                                                <CustomSelect
                                                    label=""
                                                    value={socialInput.platform}
                                                    onChange={(val) => setSocialInput(prev => ({ ...prev, platform: val }))}
                                                    options={['Instagram', 'TikTok', 'Facebook', 'LinkedIn', 'YouTube', 'X (Twitter)', 'Otra']}
                                                    placeholder="Plataforma"
                                                    disabled={isFinished}
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <input
                                                    type="text"
                                                    placeholder="Enlace o Usuario (ej. @marca)"
                                                    value={socialInput.link}
                                                    onChange={(e) => setSocialInput(prev => ({ ...prev, link: e.target.value }))}
                                                    disabled={isFinished}
                                                    className={`w-full bg-raised border rounded-xl px-4 py-3 text-white placeholder-text-3 focus:outline-none focus:ring-2 focus:ring-pink/20 focus:border-pink transition-all h-[46px] ${isFinished ? 'border-edge bg-raised cursor-default' : 'border-edge'}`}
                                                />
                                            </div>
                                            <div className="md:w-1/4">
                                                <CustomSelect
                                                    label=""
                                                    value={socialInput.frequency}
                                                    onChange={(val) => setSocialInput(prev => ({ ...prev, frequency: val }))}
                                                    options={['Diaria', '3-4/Semana', 'Semanal', 'Quincenal', 'Esporádica']}
                                                    placeholder="Frecuencia"
                                                    disabled={isFinished}
                                                />
                                            </div>
                                            <button
                                                onClick={addSocialNetwork}
                                                disabled={isFinished || !socialInput.platform || !socialInput.link}
                                                className="bg-pink-fill text-white rounded-xl px-4 flex items-center justify-center hover:bg-pink-fill transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-[46px]"
                                            >
                                                <Plus size={20} />
                                            </button>
                                        </div>

                                        {/* Active List */}
                                        <div className="space-y-2 mt-2">
                                            {formData.brand.socialNetworks.length === 0 && (
                                                <div className="text-center py-6 bg-raised rounded-xl border border-dashed border-edge text-text-3 text-sm">
                                                    No has añadido redes sociales aún.
                                                </div>
                                            )}
                                            {formData.brand.socialNetworks.map((net, idx) => (
                                                <div key={idx} className="flex items-center justify-between bg-card border border-edge p-3 rounded-xl shadow-sm">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-pink/15 text-pink-text flex items-center justify-center font-bold text-xs">
                                                            {net.platform.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-white">{net.platform}</p>
                                                            <a href="#" className="text-xs text-text-2 hover:underline">{net.link}</a>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-xs font-medium px-2 py-1 bg-raised rounded-full text-text-3">{net.frequency}</span>
                                                        {!isFinished && (
                                                            <button onClick={() => removeSocialNetwork(idx)} className="text-text-3 hover:text-pink-text transition-colors">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Manager Selection */}
                                    <div className="space-y-3 pt-2">
                                        <label className="text-sm font-bold text-text-2 ml-1 flex items-center gap-2"><UserCog size={14} /> Administrador Actual</label>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {[
                                                { id: 'internal', label: 'Equipo Interno', desc: 'In-house staff', icon: Users },
                                                { id: 'external', label: 'Agencia / Freelance', desc: 'Servicio externo', icon: Globe },
                                                { id: 'self', label: 'Propietario', desc: 'Yo mismo', icon: UserCog },
                                            ].map((type) => {
                                                const isSelected = formData.brand.socialManager === type.label;
                                                return (
                                                    <button
                                                        key={type.id}
                                                        onClick={() => setFormData(prev => ({ ...prev, brand: { ...prev.brand, socialManager: type.label } }))}
                                                        disabled={isFinished}
                                                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center text-center gap-2 ${isFinished ? 'opacity-70 cursor-default border-edge' : ''} ${isSelected ? 'border-pink bg-pink/15 text-pink-text shadow-md' : 'border-edge bg-card text-text-3 hover:border-edge'}`}
                                                    >
                                                        <type.icon size={24} className={isSelected ? 'text-pink-text' : 'text-text-3'} />
                                                        <div>
                                                            <span className="block text-sm font-bold">{type.label}</span>
                                                            <span className="block text-xs opacity-70">{type.desc}</span>
                                                        </div>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* 4.2 ADS & CONTENT */}
                                <div className="space-y-6">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-edge pb-2">
                                        <Megaphone className="text-pink-text" size={20} /> Publicidad y Contenido
                                    </h3>

                                    <div className="grid grid-cols-1 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-text-2 ml-1">Experiencia en Publicidad Pagada</label>
                                            <textarea
                                                name="adsExperience"
                                                value={formData.brand.adsExperience}
                                                onChange={handleBrandChange}
                                                disabled={isFinished}
                                                rows={3}
                                                placeholder="Describe tus campañas anteriores, presupuestos aproximados y resultados generales..."
                                                className={`w-full bg-raised border rounded-xl px-4 py-3 text-white placeholder-text-3 focus:outline-none focus:ring-2 focus:ring-pink/20 focus:border-pink transition-all resize-none ${isFinished ? 'border-edge bg-raised cursor-default' : 'border-edge'}`}
                                            />
                                        </div>

                                        <ListInput
                                            label="Formatos/Temas Ganadores"
                                            icon={LayoutTemplate}
                                            placeholder="Ej. Reels educativos, Testimonios, Unboxing..."
                                            items={formData.brand.bestContent}
                                            onItemsChange={(items) => handleBrandListChange('bestContent', items)}
                                            maxItems={5}
                                            disabled={isFinished}
                                        />
                                    </div>
                                </div>

                                {/* 4.3 NEGATIVE HISTORY */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-edge pb-2">
                                        <ThumbsDown className="text-pink-text" size={20} /> Historial Negativo
                                    </h3>
                                    <div className="bg-raised/50 p-4 rounded-2xl border border-pink/40">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-text-2 ml-1 text-pink-text">Malas Experiencias Previas</label>
                                            <textarea
                                                name="badExperiences"
                                                value={formData.brand.badExperiences}
                                                onChange={handleBrandChange}
                                                disabled={isFinished}
                                                rows={2}
                                                placeholder="¿Qué NO ha funcionado? ¿Problemas con agencias anteriores?"
                                                className={`w-full bg-card border border-pink/40 rounded-xl px-4 py-3 text-white placeholder-text-3 focus:outline-none focus:ring-2 focus:ring-pink/40 focus:border-pink/40 transition-all resize-none ${isFinished ? 'opacity-70 cursor-default' : ''}`}
                                            />
                                            <p className="text-xs text-pink-text pl-1 flex items-center gap-1">
                                                <Flag size={10} /> Esta información es vital para no repetir errores.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        )}

                        {/* STEP 5: OBJECTIVES (NEW - LISTS) */}
                        {currentStep === 5 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-4">

                                <div className="space-y-6">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-edge pb-2">
                                        <Target className="text-pink-text" size={20} /> Metas Principales
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <ListInput
                                            label="Objetivos de Ventas"
                                            icon={TrendingUp}
                                            placeholder="Añadir objetivo (ej. 20% anual...)"
                                            items={formData.goals.salesGoals}
                                            onItemsChange={(items) => handleGoalsListChange('salesGoals', items)}
                                            disabled={isFinished}
                                        />
                                        <ListInput
                                            label="Objetivos de Marca"
                                            icon={Flag}
                                            placeholder="Añadir objetivo (ej. Top of mind...)"
                                            items={formData.goals.brandGoals}
                                            onItemsChange={(items) => handleGoalsListChange('brandGoals', items)}
                                            disabled={isFinished}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-edge pb-2">
                                        <Compass className="text-pink-text" size={20} /> Estrategia y Visión
                                    </h3>

                                    <ListInput
                                        label="Estrategias de Crecimiento"
                                        icon={Trophy}
                                        placeholder="Ej. Expansión internacional, Nuevos productos..."
                                        items={formData.goals.growthStrategy}
                                        onItemsChange={(items) => handleGoalsListChange('growthStrategy', items)}
                                        disabled={isFinished}
                                    />

                                    <ListInput
                                        label="Liderazgo o Posicionamiento Esperado"
                                        icon={Star}
                                        placeholder="Añadir atributo (ej. Innovador...)"
                                        items={formData.goals.positioning}
                                        onItemsChange={(items) => handleGoalsListChange('positioning', items)}
                                        disabled={isFinished}
                                    />
                                </div>

                            </div>
                        )}

                        {/* STEP 6: READY / SUBMIT / SUCCESS */}
                        {currentStep === 6 && (
                            <div className="flex-1 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[500px]">

                                {/* STATE 1: READY TO LAUNCH */}
                                {!isSubmitting && !isFinished && (
                                    <div className="flex flex-col items-center justify-center animate-in fade-in duration-500">
                                        <div className="w-32 h-32 bg-raised rounded-full flex items-center justify-center mb-6 border-4 border-edge">
                                            <Send size={48} className="text-pink-text" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-white mb-2">Todo listo para despegar</h3>
                                        <p className="text-text-3 max-w-sm mb-8">
                                            Hemos guardado toda la información. Haz clic en "Finalizar" para generar tu estrategia.
                                        </p>
                                        <button
                                            onClick={handleFinalize}
                                            className="bg-pink-fill text-white px-10 py-4 rounded-full font-bold text-lg shadow-xl shadow-primary-600/30 hover:bg-pink-fill hover:shadow-primary-600/50 transition-all transform hover:-translate-y-1 active:translate-y-0"
                                        >
                                            Finalizar y Enviar
                                        </button>
                                    </div>
                                )}

                                {/* STATE 2: ROCKET FLYING ANIMATION (SUBMITTING) */}
                                {isSubmitting && (
                                    <div className="relative w-full h-full flex flex-col items-center justify-center">
                                        {/* Rocket */}
                                        <div className="relative z-10 animate-[rocket-fly_3s_ease-in-out_infinite]">
                                            <div className="w-32 h-32 bg-pink/15 rounded-full flex items-center justify-center shadow-2xl shadow-primary-500/30 relative">
                                                <Send size={64} className="text-pink-text transform -rotate-45" strokeWidth={1.5} fill="currentColor" fillOpacity={0.1} />
                                                {/* Engine Fire */}
                                                <div className="absolute -bottom-4 left-0 w-full flex justify-center opacity-70">
                                                    <div className="w-2 h-6 bg-pink-fill rounded-full blur-[2px] animate-pulse"></div>
                                                    <div className="w-2 h-8 bg-pink-fill rounded-full blur-[2px] mx-1 animate-pulse delay-75"></div>
                                                    <div className="w-2 h-6 bg-pink-fill rounded-full blur-[2px] animate-pulse delay-150"></div>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Moving Lines */}
                                        <div className="absolute inset-0 z-0 opacity-10">
                                            <div className="absolute top-1/4 left-1/4 w-1 h-20 bg-line rounded-full animate-[rain_2s_linear_infinite]"></div>
                                            <div className="absolute top-1/2 right-1/4 w-1 h-32 bg-line rounded-full animate-[rain_3s_linear_infinite] delay-500"></div>
                                            <div className="absolute bottom-1/4 left-1/2 w-1 h-16 bg-line rounded-full animate-[rain_2.5s_linear_infinite] delay-200"></div>
                                        </div>
                                        <h3 className="mt-8 text-xl font-bold text-white animate-pulse">Subiendo datos a la central...</h3>
                                    </div>
                                )}

                                {/* STATE 3: SUCCESS (FINISHED) */}
                                {isFinished && (
                                    <div className="relative w-full h-full flex flex-col items-center justify-center">
                                        <div className="w-40 h-40 bg-raised rounded-full flex items-center justify-center shadow-2xl shadow-black/20 mb-8 border-[6px] border-line animate-in zoom-in duration-500 relative z-10">
                                            <CheckCircle2 size={80} className="text-text-2" />
                                        </div>

                                        <h3 className="text-5xl font-extrabold text-white mb-4 tracking-tight">¡Enhorabuena!</h3>
                                        <div className="text-center space-y-3 max-w-md relative z-10">
                                            <p className="text-lg text-text-2 font-medium">
                                                Hemos recopilado todos los datos clave de tu negocio.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <style>{`
                            @keyframes orbit {
                                from { transform: rotate(var(--tw-rotate)) translateX(140px) rotate(calc(var(--tw-rotate) * -1)); }
                                to { transform: rotate(calc(var(--tw-rotate) + 360deg)) translateX(140px) rotate(calc((var(--tw-rotate) + 360deg) * -1)); }
                            }
                            @keyframes rocket-fly {
                                0% { transform: translateY(0px) rotate(0deg); }
                                50% { transform: translateY(-15px) rotate(2deg); }
                                100% { transform: translateY(0px) rotate(0deg); }
                            }
                             @keyframes rain {
                                0% { transform: translateY(-100px); opacity: 0; }
                                50% { opacity: 1; }
                                100% { transform: translateY(400px); opacity: 0; }
                            }
                        `}</style>
                            </div>
                        )}
                    </div>



                </div>
            </div>
        </div>
    );
};