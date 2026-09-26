/**
 * Admin Panel v2 - Brand-Centric Design
 * =====================================
 * Simple panel for managing brands and their modules.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Building2, Users, ChevronRight, X, Loader2,
    ClipboardList, BookOpen, BarChart2, Target, Calendar,
    Check, Clock, Play, ArrowLeft, Edit2, Trash2, RefreshCw
} from 'lucide-react';
import * as api from '../services/api';

// Import BrandBook for preview
import BrandBookApp from '../brand-book/App';
import StrategyApp from '../estrategia/App';
import PlanningView from './PlanningView';

// =============================================================================
// PLAN CONFIG
// =============================================================================

const PLAN_MODULES: Record<string, string[]> = {
    free_trial: ['analysis', 'schedule'],
    lite: ['interview', 'analysis', 'schedule'],
    basic: ['interview', 'manual', 'analysis', 'schedule'],
    pro: ['interview', 'manual', 'analysis', 'strategy', 'schedule'],
    premium: ['interview', 'manual', 'analysis', 'strategy', 'schedule']
};

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
    free_trial: { label: 'Free Trial', color: 'gray' },
    lite: { label: 'Lite', color: 'blue' },
    basic: { label: 'Basic', color: 'green' },
    pro: { label: 'Pro', color: 'purple' },
    premium: { label: 'Premium', color: 'amber' }
};

const MODULE_CONFIG: Record<string, { name: string; icon: React.ElementType; color: string }> = {
    interview: { name: 'Entrevista', icon: ClipboardList, color: 'blue' },
    manual: { name: 'Manual', icon: BookOpen, color: 'purple' },
    analysis: { name: 'Análisis', icon: BarChart2, color: 'pink' },
    strategy: { name: 'Estrategia', icon: Target, color: 'emerald' },
    schedule: { name: 'Cronograma', icon: Calendar, color: 'orange' }
};

// =============================================================================
// TYPES
// =============================================================================

interface Brand {
    id: string;
    nombre: string;
    plan: string;
    created_at?: string;
    user_count: number;
    modules: string[];
}

interface ModuleStatus {
    id: string;
    name: string;
    icon: string;
    status: 'completed' | 'pending' | 'ready' | 'not_available' | 'processing';
    can_execute: boolean;
}

interface BrandUser {
    id: string;
    email: string;
    full_name?: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface AdminPanelProps {
    onNavigate?: (view: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onNavigate }) => {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

    const loadBrands = async () => {
        setLoading(true);
        try {
            console.log('Fetching brands from:', `${api.API_BASE_URL}/api/admin/brands`);
            const response = await fetch(`${api.API_BASE_URL}/api/admin/brands`, {
                headers: api.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Brands data:', data);

            if (Array.isArray(data)) {
                setBrands(data);
            } else {
                console.error('Data is not an array:', data);
                setBrands([]);
                alert('Error: La respuesta del servidor no es válida (no es una lista de marcas)');
            }
        } catch (error) {
            console.error('Error loading brands:', error);
            setBrands([]);
            // alert('Error al cargar marcas. Ver consola.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBrands();
    }, []);

    if (selectedBrand) {
        return (
            <BrandDetailView
                brandId={selectedBrand}
                onBack={() => {
                    setSelectedBrand(null);
                    loadBrands();
                }}
                onNavigate={onNavigate}
            />
        );
    }

    return (
        <div className="h-full flex flex-col p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900">Panel de Administración</h1>
                    <p className="text-gray-500 mt-1">Gestiona marcas y sus módulos</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-2xl shadow-lg shadow-pink-500/30 hover:shadow-xl transition-all"
                >
                    <Plus size={20} />
                    Nueva Marca
                </button>
            </div>

            {/* Brands Grid */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="animate-spin text-gray-300" size={40} />
                    </div>
                ) : brands.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <Building2 size={48} className="mb-4 opacity-50" />
                        <p className="text-lg font-medium">No hay marcas registradas</p>
                        <p className="text-sm">Crea una marca para comenzar</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {brands.map(brand => (
                            <BrandCard
                                key={brand.id}
                                brand={brand}
                                onClick={() => setSelectedBrand(brand.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <CreateBrandModal
                        onClose={() => setShowCreateModal(false)}
                        onCreated={() => {
                            setShowCreateModal(false);
                            loadBrands();
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// =============================================================================
// BRAND CARD
// =============================================================================

const BrandCard: React.FC<{ brand: Brand; onClick: () => void }> = ({ brand, onClick }) => {
    const planInfo = PLAN_LABELS[brand.plan] || PLAN_LABELS.free_trial;

    const colorClasses: Record<string, string> = {
        gray: 'bg-gray-100 text-gray-600',
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        purple: 'bg-purple-100 text-purple-600',
        amber: 'bg-amber-100 text-amber-600'
    };

    return (
        <motion.button
            onClick={onClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full text-left bg-white rounded-3xl p-6 border border-gray-100 hover:border-gray-200 hover:shadow-xl transition-all group"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                    {brand.nombre.charAt(0).toUpperCase()}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${colorClasses[planInfo.color]}`}>
                    {planInfo.label}
                </span>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-1">{brand.nombre}</h3>

            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <span className="flex items-center gap-1">
                    <Users size={14} />
                    {brand.user_count} usuario{brand.user_count !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Module Icons */}
            <div className="flex gap-2">
                {brand.modules.map(modId => {
                    const mod = MODULE_CONFIG[modId];
                    if (!mod) return null;
                    const Icon = mod.icon;
                    return (
                        <div
                            key={modId}
                            className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400"
                            title={mod.name}
                        >
                            <Icon size={16} />
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 flex items-center justify-end text-gray-400 group-hover:text-pink-500 transition-colors">
                <span className="text-xs font-medium mr-1">Ver detalles</span>
                <ChevronRight size={16} />
            </div>
        </motion.button>
    );
};

// =============================================================================
// CREATE BRAND MODAL
// =============================================================================

const CreateBrandModal: React.FC<{ onClose: () => void; onCreated: () => void }> = ({ onClose, onCreated }) => {
    const [nombre, setNombre] = useState('');
    const [plan, setPlan] = useState('free_trial');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombre.trim()) return;

        setLoading(true);
        try {
            const url = `${api.API_BASE_URL}/api/admin/brands`;
            console.log('Creating brand at:', url);

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...api.getAuthHeaders() },
                body: JSON.stringify({ nombre, plan })
            });

            if (response.ok) {
                console.log('Brand created successfully');
                onCreated();
            } else {
                const error = await response.json();
                console.error('Create brand error:', error);
                alert(`Error al crear marca: ${error.detail || response.statusText}`);
            }
        } catch (error) {
            console.error('Error creating brand:', error);
            alert('Error al crear marca');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black text-gray-900">Nueva Marca</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                            Nombre de la Marca
                        </label>
                        <input
                            type="text"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 outline-none transition-all"
                            placeholder="Ej: Nike, Adidas..."
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                            Plan
                        </label>
                        <select
                            value={plan}
                            onChange={(e) => setPlan(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 outline-none transition-all"
                        >
                            {Object.entries(PLAN_LABELS).map(([key, { label }]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>

                        {/* Preview modules */}
                        <div className="mt-3 flex gap-1.5 flex-wrap">
                            {PLAN_MODULES[plan]?.map(modId => {
                                const mod = MODULE_CONFIG[modId];
                                if (!mod) return null;
                                return (
                                    <span key={modId} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                                        {mod.name}
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !nombre.trim()}
                        className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-xl shadow-lg shadow-pink-500/30 hover:shadow-xl transition-all disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Crear Marca'}
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

// =============================================================================
// BRAND DETAIL VIEW
// =============================================================================

const BrandDetailView: React.FC<{ brandId: string; onBack: () => void; onNavigate?: (view: string) => void }> = ({ brandId, onBack, onNavigate }) => {
    const [loading, setLoading] = useState(true);
    const [brand, setBrand] = useState<any>(null);
    const [modules, setModules] = useState<ModuleStatus[]>([]);
    const [users, setUsers] = useState<BrandUser[]>([]);
    const [showAddUser, setShowAddUser] = useState(false);
    const [showAnalysisModal, setShowAnalysisModal] = useState(false);
    const [showBrandBook, setShowBrandBook] = useState(false);
    const [showStrategy, setShowStrategy] = useState(false);
    const [showSchedule, setShowSchedule] = useState(false);
    const [showStrategyGenModal, setShowStrategyGenModal] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Auto-dismiss toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const loadBrandDetail = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${api.API_BASE_URL}/api/admin/brands/${brandId}`, {
                headers: api.getAuthHeaders()
            });
            const data = await response.json();
            setBrand(data.brand);
            setModules(data.modules);
            setUsers(data.users || []);
        } catch (error) {
            console.error('Error loading brand:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBrandDetail();
    }, [brandId]);

    if (showBrandBook) {
        return (
            <div className="h-full flex flex-col bg-gray-50 relative animate-in fade-in zoom-in duration-300">
                <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-10 shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setShowBrandBook(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                            <ArrowLeft size={20} className="text-gray-600" />
                        </button>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Manual de Marca</h2>
                            <p className="text-xs text-gray-500">{brand?.nombre}</p>
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-8">
                    <BrandBookApp overrideClientId={brandId} />
                </div>
            </div>
        );
    }

    if (showStrategy) {
        return (
            <div className="h-full flex flex-col bg-gray-50 relative animate-in fade-in zoom-in duration-300">
                <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-10 shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setShowStrategy(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                            <ArrowLeft size={20} className="text-gray-600" />
                        </button>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Estrategia Digital</h2>
                            <p className="text-xs text-gray-500">{brand?.nombre}</p>
                        </div>
                    </div>
                    <button
                        onClick={async () => {
                            if (!confirm(`¿Estás seguro de que quieres regenerar la estrategia de ${brand?.nombre} con IA? Esto eliminará la estrategia actual y generará una nueva completa.`)) {
                                return;
                            }
                            try {
                                setToast({ message: 'Regenerando estrategia con IA...', type: 'success' });
                                const response = await fetch(`${api.API_BASE_URL}/api/admin/brands/${brandId}/reset-strategy`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', ...api.getAuthHeaders() }
                                });
                                if (response.ok) {
                                    const result = await response.json();
                                    setToast({ message: `Estrategia regenerada: ${result.nodes_created} nodos creados`, type: 'success' });
                                    // Reload the strategy view
                                    setTimeout(() => window.location.reload(), 2000);
                                } else {
                                    alert('Error al regenerar la estrategia');
                                }
                            } catch (error) {
                                console.error('Error:', error);
                                alert('Error al regenerar la estrategia');
                            }
                        }}
                        className="px-4 py-2 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-colors flex items-center gap-2 text-sm font-medium"
                    >
                        <RefreshCw size={16} />
                        Regenerar con IA
                    </button>
                </div>
                <div className="flex-1 overflow-hidden p-4">
                    <div className='h-full rounded-[30px] overflow-hidden border border-gray-200 shadow-sm bg-white'>
                        <StrategyApp overrideClientId={brandId} />
                    </div>
                </div>
            </div>
        );
    }

    if (showSchedule) {
        return (
            <div className="h-full flex flex-col bg-gray-50 relative animate-in fade-in zoom-in duration-300">
                <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-10 shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setShowSchedule(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                            <ArrowLeft size={20} className="text-gray-600" />
                        </button>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Cronograma de Contenido</h2>
                            <p className="text-xs text-gray-500">{brand?.nombre}</p>
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-hidden p-4">
                    <div className='h-full rounded-[30px] overflow-hidden border border-gray-200 shadow-sm bg-white'>
                        <PlanningView
                            clientId={brandId || ''}
                            onNavigate={onNavigate}
                        />
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-gray-300" size={40} />
            </div>
        );
    }

    const planInfo = brand ? PLAN_LABELS[brand.plan] || PLAN_LABELS.free_trial : PLAN_LABELS.free_trial;
    const colorClasses: Record<string, string> = {
        gray: 'bg-gray-100 text-gray-600',
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        purple: 'bg-purple-100 text-purple-600',
        amber: 'bg-amber-100 text-amber-600'
    };

    return (
        <div className="h-full flex flex-col p-6 overflow-y-auto relative">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                    <ArrowLeft size={24} className="text-gray-600" />
                </button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-black text-gray-900">{brand?.nombre}</h1>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${colorClasses[planInfo.color]}`}>
                            {planInfo.label}
                        </span>
                    </div>
                </div>
            </div>

            {/* Modules Section */}
            <div className="mb-8">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Módulos Disponibles</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    {modules.map(mod => (
                        <ModuleCard
                            key={mod.id}
                            module={mod}
                            onClick={() => {
                                if (mod.id === 'analysis' && mod.can_execute) {
                                    setShowAnalysisModal(true);
                                }
                                if (mod.id === 'manual' && mod.can_execute) {
                                    setShowBrandBook(true);
                                }
                                if (mod.id === 'strategy' && mod.can_execute) {
                                    if (mod.status === 'completed') {
                                        setShowStrategy(true);
                                    } else {
                                        setShowStrategyGenModal(true);
                                    }
                                }
                                if (mod.id === 'schedule' && mod.can_execute) {
                                    setShowSchedule(true);
                                }
                            }}
                        />
                    ))}
                </div>
            </div>

            <AnimatePresence>
                {showStrategyGenModal && (
                    <StrategyGenerationModal
                        brandId={brandId}
                        onClose={() => setShowStrategyGenModal(false)}
                        onGenerated={() => {
                            setShowStrategyGenModal(false);
                            loadBrandDetail();
                            setToast({ message: "Estrategia generada con éxito", type: 'success' });
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Users Section */}
            <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900">Usuarios</h2>
                    <button
                        onClick={() => setShowAddUser(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors"
                    >
                        <Plus size={18} />
                        Agregar Usuario
                    </button>
                </div>

                {users.length === 0 ? (
                    <div className="bg-gray-50 rounded-2xl p-8 text-center text-gray-500">
                        <Users size={32} className="mx-auto mb-2 opacity-50" />
                        <p>No hay usuarios en esta marca</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {users.map(user => (
                            <div key={user.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                                        {user.email.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">{user.full_name || user.email.split('@')[0]}</p>
                                        <p className="text-sm text-gray-500">{user.email}</p>
                                    </div>
                                </div>
                                <button className="p-2 text-gray-400 hover:text-gray-600">
                                    <Edit2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* TOAST Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3"
                    >
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
                            <Check size={18} />
                        </div>
                        <div>
                            <p className="font-bold text-sm">Éxito</p>
                            <p className="text-xs text-gray-300">{toast.message}</p>
                        </div>
                        <button onClick={() => setToast(null)} className="ml-2 text-gray-500 hover:text-white">
                            <X size={16} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add User Modal */}
            <AnimatePresence>
                {showAddUser && (
                    <AddUserModal
                        brandId={brandId}
                        onClose={() => setShowAddUser(false)}
                        onCreated={() => {
                            setShowAddUser(false);
                            loadBrandDetail();
                            setToast({ message: "Usuario agregado exitosamente", type: 'success' });
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Analysis Modal */}
            <AnimatePresence>
                {showAnalysisModal && (
                    <AnalysisModal
                        brandId={brandId}
                        onClose={() => setShowAnalysisModal(false)}
                        onStarted={() => {
                            setShowAnalysisModal(false);
                            loadBrandDetail();
                            setToast({ message: "Análisis iniciado. Puede tardar unos minutos.", type: 'success' });
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// =============================================================================
// MODULE CARD
// =============================================================================

const ModuleCard: React.FC<{ module: ModuleStatus; onClick: () => void }> = ({ module, onClick }) => {
    const config = MODULE_CONFIG[module.id];
    if (!config) return null;

    const Icon = config.icon;

    const statusStyles: Record<string, { bg: string; icon: React.ReactNode }> = {
        completed: { bg: 'bg-green-50 border-green-200', icon: <Check size={14} className="text-green-500" /> },
        pending: { bg: 'bg-gray-50 border-gray-200', icon: <Clock size={14} className="text-gray-400" /> },
        ready: { bg: 'bg-blue-50 border-blue-200', icon: <Play size={14} className="text-blue-500" /> },
        processing: { bg: 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500/20', icon: <Loader2 size={14} className="text-indigo-600 animate-spin" /> },
        not_available: { bg: 'bg-gray-100 border-gray-200 opacity-50', icon: null }
    };

    const style = statusStyles[module.status] || statusStyles.pending;

    return (
        <button
            onClick={onClick}
            disabled={!module.can_execute}
            className={`p-4 rounded-2xl border-2 ${style.bg} transition-all ${module.can_execute ? 'hover:scale-105 cursor-pointer' : 'cursor-default'}`}
        >
            <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl bg-${config.color}-100 flex items-center justify-center text-${config.color}-600`}>
                    <Icon size={20} />
                </div>
                {style.icon}
            </div>
            <p className="text-sm font-bold text-gray-900">{module.name}</p>
            <p className="text-xs text-gray-500 capitalize mt-0.5">
                {module.status === 'completed' ? 'Completado' :
                    module.status === 'ready' ? 'Listo' :
                        module.status === 'processing' ? 'Analizando...' :
                            module.status === 'pending' ? 'Pendiente' : 'N/A'}
            </p>
        </button>
    );
};

// =============================================================================
// ADD USER MODAL
// =============================================================================

const AddUserModal: React.FC<{ brandId: string; onClose: () => void; onCreated: () => void }> = ({ brandId, onClose, onCreated }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await fetch(`${api.API_BASE_URL}/api/admin/brands/${brandId}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...api.getAuthHeaders() },
                body: JSON.stringify({ email, password, full_name: fullName || undefined })
            });

            if (response.ok) {
                onCreated();
            } else {
                const error = await response.json();
                alert(error.detail || 'Error al crear usuario');
            }
        } catch (error) {
            alert('Error al crear usuario');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black text-gray-900">Nuevo Usuario</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-500 outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-500 outline-none"
                            required
                            minLength={6}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Nombre (opcional)</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-500 outline-none"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Crear Usuario'}
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

// =============================================================================
// ANALYSIS MODAL
// =============================================================================

const AnalysisModal: React.FC<{ brandId: string; onClose: () => void; onStarted: () => void }> = ({ brandId, onClose, onStarted }) => {
    const [analysisType, setAnalysisType] = useState<'real' | 'aspirational'>('real');
    const [instagramUrl, setInstagramUrl] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await fetch(`${api.API_BASE_URL}/api/admin/brands/${brandId}/analysis`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...api.getAuthHeaders() },
                body: JSON.stringify({ analysis_type: analysisType, instagram_url: instagramUrl })
            });

            if (response.ok) {
                onStarted();
            } else {
                const error = await response.json();
                alert(error.detail || 'Error al iniciar análisis');
            }
        } catch (error) {
            alert('Error al iniciar análisis');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl"
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black text-gray-900">Ejecutar Análisis</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Analysis Type Selector */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-3">Tipo de Análisis</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setAnalysisType('real')}
                                className={`p-4 rounded-xl border-2 transition-all text-left ${analysisType === 'real'
                                    ? 'border-pink-500 bg-pink-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <p className="font-bold text-gray-900">Marca Real</p>
                                <p className="text-xs text-gray-500 mt-1">Analiza las redes propias de la marca</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => setAnalysisType('aspirational')}
                                className={`p-4 rounded-xl border-2 transition-all text-left ${analysisType === 'aspirational'
                                    ? 'border-purple-500 bg-purple-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <p className="font-bold text-gray-900">Marca Aspiracional</p>
                                <p className="text-xs text-gray-500 mt-1">Analiza al líder del mercado</p>
                            </button>
                        </div>
                    </div>

                    {/* Instagram URL */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                            {analysisType === 'real' ? 'URL de Instagram de la Marca' : 'URL de Instagram del Líder'}
                        </label>
                        <input
                            type="url"
                            value={instagramUrl}
                            onChange={(e) => setInstagramUrl(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-500 outline-none"
                            placeholder="https://instagram.com/..."
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-4 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 ${analysisType === 'real'
                            ? 'bg-gradient-to-r from-pink-500 to-rose-500 shadow-pink-500/30'
                            : 'bg-gradient-to-r from-purple-500 to-indigo-500 shadow-purple-500/30'
                            }`}
                    >
                        {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Iniciar Análisis'}
                    </button>
                </form>
            </motion.div>
        </div>
    );
};


// =============================================================================
// STRATEGY GENERATION MODAL
// =============================================================================

const StrategyGenerationModal: React.FC<{
    brandId: string;
    onClose: () => void;
    onGenerated: () => void
}> = ({ brandId, onClose, onGenerated }) => {
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            // Llamada al nuevo endpoint backend
            const response = await fetch(`${api.API_BASE_URL}/api/admin/brands/${brandId}/strategy/seed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...api.getAuthHeaders() }
            });

            if (response.ok) {
                onGenerated();
            } else {
                const error = await response.json();
                alert(error.detail || 'Error al generar estrategia');
            }
        } catch (error) {
            console.error(error);
            alert('Error de conexión al generar estrategia');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                            <Target size={20} />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900">Generar Estrategia</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                <div className="mb-6 space-y-4 text-gray-600">
                    <p>
                        El sistema utilizará la <strong>Inteligencia Artificial</strong> para cruzar:
                    </p>
                    <ul className="space-y-2 text-sm bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <li className="flex items-center gap-2">
                            <Check size={16} className="text-emerald-500" />
                            <span>Objetivos de la Entrevista</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <Check size={16} className="text-emerald-500" />
                            <span>Oportunidades del Análisis (Gap Score)</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <Check size={16} className="text-emerald-500" />
                            <span>Recomendaciones Tácticas (Q9)</span>
                        </li>
                    </ul>
                    <p className="text-sm">
                        Se creará un árbol de objetivos, estrategias y publicaciones listo para revisión.
                    </p>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" size={20} />
                            <span>Diseñando Estrategia...</span>
                        </>
                    ) : (
                        <>
                            <Play size={20} fill="currentColor" />
                            <span>Ejecutar Generación</span>
                        </>
                    )}
                </button>
            </motion.div>
        </div>
    );
};

export default AdminPanel;
