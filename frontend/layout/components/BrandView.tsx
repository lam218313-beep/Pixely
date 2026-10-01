import React from 'react';
import BrandBookApp from '../brand-book/App';
import { WorkflowStepper } from './WorkflowStepper';
import { AnimatedHeaderCard } from './AnimatedHeaderCard';

export const BrandView: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
    return (
        <div className="h-full overflow-y-auto custom-scrollbar animate-fade-in-up bg-[#F4F7FE] p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <WorkflowStepper currentStep={2} onNavigate={onNavigate} />

                <AnimatedHeaderCard
                    supertitle="Fase 2: Identidad"
                    title="Manual"
                    subtitle="Guía de identidad visual de la marca."
                />

                <BrandBookApp />
            </div>
        </div>
    );
};
