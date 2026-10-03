import React from 'react';
import { motion } from 'framer-motion';
import { CalendarRange, CheckCircle2, Images, Send } from 'lucide-react';

interface WorkflowStepperProps {
    currentStep: 1 | 2 | 3 | 4;
    onNavigate: (viewId: string) => void;
}

// Only "Tu mes": the content production line. Brand pages (Ficha, Manual, Análisis,
// Mercado, Estrategia) are reference material, not steps, so they carry no stepper.
const TABS = [
    { id: 'work', label: 'Planificación', icon: CalendarRange, desc: 'Plan del mes y piezas en producción' },
    { id: 'validacion', label: 'Validación', icon: CheckCircle2, desc: 'Aprobación del cliente' },
    { id: 'publicacion', label: 'Publicación', icon: Send, desc: 'Aprobadas y programadas' },
    { id: 'repositorio', label: 'Repositorio', icon: Images, desc: 'Archivo de lo publicado' },
];

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({ currentStep, onNavigate }) => {
    // Convert 1-based step to 0-based index
    const activeTab = currentStep - 1;

    return (
        <div className="w-full mb-8">

            {/* --- TAB NAVIGATION BAR --- */}
            <div className="relative px-2 md:px-8 py-6 w-full">

                {/* Progress Line Background */}
                {/* Line runs through the circle centers: py-6 + half a circle, minus half the line height */}
                <div className="absolute top-[39px] md:top-[45px] left-[26px] right-[26px] md:left-[60px] md:right-[60px] h-1.5 bg-gray-300 rounded-full z-0 overflow-hidden">
                    {/* Animated Progress Line Foreground */}
                    <motion.div
                        className="h-full bg-primary-500 rounded-full"
                        initial={{ width: '0%' }}
                        animate={{ width: `${(activeTab / (TABS.length - 1)) * 100}%` }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                </div>

                {/* Tab Items */}
                <div className="relative z-10 flex justify-between items-start">
                    {TABS.map((tab, index) => {
                        const isActive = index === activeTab;
                        const isCompleted = index < activeTab;

                        return (
                            <div
                                key={tab.id}
                                className="flex flex-col items-center gap-3 group cursor-pointer"
                                onClick={() => onNavigate(tab.id)}
                            >
                                {/* Icon Circle */}
                                <motion.div
                                    className={`w-9 h-9 md:w-12 md:h-12 rounded-full flex items-center justify-center border-4 transition-colors duration-300 relative ${isActive
                                        ? 'bg-primary-500 border-primary-100 text-white shadow-[0_0_20px_rgba(242,15,121,0.4)]'
                                        : isCompleted
                                            ? 'bg-primary-500 border-primary-500 text-white'
                                            : 'bg-white border-gray-300 text-gray-400 hover:border-primary-200 hover:text-primary-500'
                                        }`}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    animate={{ scale: isActive ? 1.15 : 1 }}
                                >
                                    <tab.icon size={20} className="w-4 h-4 md:w-5 md:h-5" strokeWidth={isActive ? 2.5 : 2} />

                                    {/* Ripple effect for active */}
                                    {isActive && (
                                        <motion.div
                                            className="absolute inset-0 rounded-full border-2 border-primary-500"
                                            initial={{ scale: 1, opacity: 1 }}
                                            animate={{ scale: 1.6, opacity: 0 }}
                                            transition={{ repeat: Infinity, duration: 1.5 }}
                                        />
                                    )}
                                </motion.div>

                                {/* Label (desktop only: 8 labels don't fit side by side on a phone) */}
                                <div className="text-center hidden md:block">
                                    <p className={`text-sm font-bold transition-colors duration-300 ${isActive ? 'text-primary-600' : isCompleted ? 'text-brand-dark' : 'text-gray-400'
                                        }`}>
                                        {tab.label}
                                    </p>

                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Phone: name only the current step */}
                <p className="md:hidden mt-3 text-center text-sm font-bold text-primary-600">
                    Paso {currentStep} de {TABS.length} · {TABS[activeTab].label}
                </p>
            </div>
        </div>
    );
};
