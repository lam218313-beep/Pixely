import React from 'react';
import { AnimatedHeaderCard } from './AnimatedHeaderCard';
import StrategyMap from '../estrategia/App';

export const StrategyView: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
    return (
        <div className='p-4 md:p-8 h-full overflow-y-auto custom-scrollbar animate-fade-in-up bg-brand-bg'>
            <div className="max-w-7xl mx-auto">

                <AnimatedHeaderCard
                    supertitle="Tu marca"
                    title="Estrategia"
                    subtitle="Qué quiere lograr tu negocio, cómo lo haremos y con qué contenido."
                />

                {/* Strategy Map Module */}
                <div className='h-[600px] rounded-[30px] overflow-hidden border border-gray-200 shadow-sm bg-white'>
                    <StrategyMap />
                </div>
            </div>
        </div>
    );
};
