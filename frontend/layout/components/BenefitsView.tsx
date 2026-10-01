/**
 * BenefitsView
 *
 * Shows 5 benefit cards (mock AI tools).
 */

import React from 'react';
import { WorkflowStepper } from './WorkflowStepper';
import { AnimatedHeaderCard } from './AnimatedHeaderCard';
import { Sparkles, Brain, Target, TrendingUp, Wand2 } from 'lucide-react';

// Benefit definitions
const BENEFITS = [
    {
        id: 'benefit_1',
        name: 'Generador de Copies',
        description: 'Crea textos persuasivos para tus redes sociales con IA.',
        icon: Wand2,
        color: 'from-blue-500 to-cyan-500',
    },
    {
        id: 'benefit_2',
        name: 'Análisis de Competencia',
        description: 'Compara tu marca con la competencia automáticamente.',
        icon: Target,
        color: 'from-purple-500 to-pink-500',
    },
    {
        id: 'benefit_3',
        name: 'Predictor de Tendencias',
        description: 'Anticipa qué contenido funcionará mejor esta semana.',
        icon: TrendingUp,
        color: 'from-green-500 to-emerald-500',
    },
    {
        id: 'benefit_4',
        name: 'Asistente Estratégico',
        description: 'Tu consultor de marketing personal disponible 24/7.',
        icon: Brain,
        color: 'from-orange-500 to-red-500',
    },
    {
        id: 'benefit_5',
        name: 'Suite Creativa Premium',
        description: 'Acceso completo a todas las herramientas creativas.',
        icon: Sparkles,
        color: 'from-amber-400 to-yellow-500',
    },
];

// Individual Benefit Card Component
const BenefitCard: React.FC<{ benefit: typeof BENEFITS[0] }> = ({ benefit }) => {
    const Icon = benefit.icon;

    return (
        <div className="relative group">
            {/* Card */}
            <div className="relative overflow-hidden rounded-3xl border bg-white border-gray-100 hover:border-gray-200 hover:shadow-xl cursor-pointer transition-all duration-300">

                {/* Gradient Background (subtle) */}
                <div className={`absolute inset-0 bg-gradient-to-br ${benefit.color} opacity-5`} />

                {/* Content */}
                <div className="relative p-6">
                    {/* Icon */}
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${benefit.color} flex items-center justify-center mb-4 shadow-lg`}>
                        <Icon size={28} className="text-white" />
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold mb-2 text-gray-800">
                        {benefit.name}
                    </h3>

                    {/* Description */}
                    <p className="text-sm leading-relaxed text-gray-600">
                        {benefit.description}
                    </p>

                    {/* Access Status */}
                    <div className="mt-4 flex items-center gap-2 text-green-600">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-xs font-medium">Disponible</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const BenefitsView: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
    return (
        <div className='p-8 h-full overflow-y-auto custom-scrollbar animate-fade-in-up bg-brand-bg'>
            <div className="max-w-7xl mx-auto">
                <WorkflowStepper currentStep={6} onNavigate={onNavigate} />

                <AnimatedHeaderCard
                    supertitle="Fase 6: Resultados"
                    title="Beneficios"
                    subtitle="Más beneficios esperan por ti."
                />

                {/* Benefits Grid */}
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                    {BENEFITS.map((benefit) => (
                        <BenefitCard key={benefit.id} benefit={benefit} />
                    ))}
                </div>

                {/* Footer Note */}
                <div className="mt-12 text-center">
                    <p className="text-gray-400 text-sm">
                        Nuevos beneficios se agregan mensualmente.
                    </p>
                </div>
            </div>
        </div>
    );
};
