import React from 'react';
import { useStudio } from '../../contexts/StudioContext';
import { motion } from 'framer-motion';
import { Sparkles, Check, ChevronRight, Coins } from 'lucide-react';

interface StudioLayoutProps {
    children: React.ReactNode;
}

const STEPS = [
    { id: 1, label: 'ADN Visual' },
    { id: 2, label: 'Banco' },
    { id: 3, label: 'Tarea' },
    { id: 4, label: 'Referencias' },
    { id: 5, label: 'Generar' },
];

export const StudioLayout: React.FC<StudioLayoutProps> = ({ children }) => {
    const { state } = useStudio();
    const progress = (state.currentStep / state.totalSteps) * 100;

    return (
        <div className="min-h-screen bg-brand-bg relative overflow-hidden flex flex-col">
            {/* Background Gradients (Orbital Effect) */}
            <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-white/80 to-transparent z-0 pointer-events-none" />
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary-100/30 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-[10%] right-[-10%] w-[40%] h-[40%] bg-blue-100/30 rounded-full blur-[100px] pointer-events-none" />

            {/* MAIN CONTAINER */}
            <div className="relative z-10 flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 md:px-6 lg:px-8 py-6">

                {/* HEADER CARD */}
                <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-xl shadow-brand-dark/5 rounded-[2rem] p-6 mb-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        {/* Title & Brand */}
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-tr from-primary-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary-500/30">
                                <Sparkles size={24} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                                    Studio Creativo
                                </h1>
                                <p className="text-sm text-gray-500 font-medium">Asistente de Generación IA v2.0</p>
                            </div>
                        </div>

                        {/* Credits Badge */}
                        {state.credits.loaded && (
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-sm font-bold transition-colors ${
                                state.credits.available >= 10
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                    : state.credits.available > 0
                                        ? 'bg-amber-50 border-amber-200 text-amber-700'
                                        : 'bg-red-50 border-red-200 text-red-600'
                            }`}>
                                <Coins size={16} />
                                <span>{state.credits.available} crédito{state.credits.available !== 1 ? 's' : ''}</span>
                            </div>
                        )}

                        {/* STEPPER */}
                        <div className="flex items-center gap-1 md:gap-3 bg-white/50 px-4 py-2 rounded-2xl border border-white/50">
                            {STEPS.map((step, idx) => (
                                <React.Fragment key={step.id}>
                                    <div className="flex flex-col items-center relative group">
                                        <div
                                            className={`
                                                w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 relative z-10
                                                ${state.currentStep === step.id
                                                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/40 scale-110'
                                                    : state.currentStep > step.id
                                                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                                                        : 'bg-gray-100 text-gray-400 border border-gray-200'
                                                }
                                            `}
                                        >
                                            {state.currentStep > step.id ? <Check size={14} strokeWidth={3} /> : step.id}
                                        </div>
                                        <span className={`
                                            absolute -bottom-6 text-[10px] font-bold tracking-wide whitespace-nowrap transition-colors duration-300
                                            ${state.currentStep === step.id ? 'text-primary-700' : 'text-gray-400'}
                                        `}>
                                            {step.label}
                                        </span>
                                    </div>

                                    {/* Connector Line */}
                                    {idx < STEPS.length - 1 && (
                                        <div className="w-6 md:w-12 h-[2px] rounded-full bg-gray-200 relative overflow-hidden">
                                            <div
                                                className={`absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 to-primary-500 transition-all duration-500 ease-out`}
                                                style={{ width: state.currentStep > step.id ? '100%' : '0%' }}
                                            />
                                        </div>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {/* PROGRESS BAR (Subtle bottom line) */}
                    <div className="w-full h-1 bg-gray-100 rounded-full mt-8 overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-primary-500 to-indigo-600 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ type: "spring", stiffness: 50, damping: 15 }}
                        />
                    </div>
                </div>

                {/* DYNAMIC CONTENT AREA (Card Style) */}
                <main className="flex-1 min-h-0 relative">
                    {/* The content itself (KnowledgeInput, etc) should handle its own layout/cards, 
                         but we provide a wrapper if needed. For now, just render children directly 
                         so they can use full width grids. */}
                    {children}
                </main>

            </div>
        </div>
    );
};
