import React from 'react';
import BrandBookApp from '../brand-book/App';
import { AnimatedHeaderCard } from './AnimatedHeaderCard';

export const BrandView: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
    return (
        <div className="h-full overflow-y-auto custom-scrollbar animate-fade-in-up bg-[#F4F7FE] p-4 md:p-8">
            <div className="max-w-7xl mx-auto">

                <AnimatedHeaderCard
                    supertitle="Tu marca"
                    title="Voz de marca"
                    subtitle="Cómo habla tu marca en cada publicación. Apruébala y la usamos al escribir tu contenido."
                />

                <BrandBookApp />
            </div>
        </div>
    );
};
