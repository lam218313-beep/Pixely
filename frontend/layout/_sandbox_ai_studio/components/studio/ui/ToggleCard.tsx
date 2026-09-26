import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface ToggleCardProps {
    title: string;
    content: string;
    isSelected: boolean;
    onToggle: () => void;
}

export const ToggleCard: React.FC<ToggleCardProps> = ({ title, content, isSelected, onToggle }) => {
    return (
        <motion.div
            layout
            onClick={onToggle}
            className={`
                relative p-5 rounded-2xl border cursor-pointer transition-all duration-300 group
                ${isSelected
                    ? 'bg-white border-primary-500 ring-2 ring-primary-100 shadow-lg shadow-primary-500/10'
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-white'
                }
            `}
        >
            <div className="flex justify-between items-start mb-3">
                <h4 className={`font-bold text-sm ${isSelected ? 'text-primary-700' : 'text-gray-700'}`}>
                    {title}
                </h4>

                <div className={`
                    w-6 h-6 rounded-full flex items-center justify-center transition-colors
                    ${isSelected ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-400'}
                `}>
                    {isSelected ? <Check size={14} /> : <div className="w-2 h-2 rounded-full bg-gray-400" />}
                </div>
            </div>

            <p className={`text-xs leading-relaxed line-clamp-4 ${isSelected ? 'text-gray-700' : 'text-gray-500'}`}>
                {content}
            </p>
        </motion.div>
    );
};
