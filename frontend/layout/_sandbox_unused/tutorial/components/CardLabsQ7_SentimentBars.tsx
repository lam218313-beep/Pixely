import React, { useState, useRef, useMemo, useCallback } from 'react';
import { RotateCw, MoreHorizontal, ChevronDown, BarChart3 } from 'lucide-react';

interface SentimentAggregated {
  Positivo: number;
  Negativo: number;
  Neutral: number;
  Mixto: number;
  subjetividad_promedio_global: number;
  ejemplo_mixto?: string;
}

interface CardLabsQ7_SentimentBarsProps {
  data: {
    results: {
      analisis_agregado: SentimentAggregated;
    };
  };
}

const CATEGORIES = [
  { key: 'Positivo', label: 'Positivo', color: 'bg-chart-green', track: 'bg-chart-green/10', shadow: 'shadow-sm' },
  { key: 'Neutral', label: 'Neutral', color: 'bg-chart-yellow', track: 'bg-chart-yellow/10', shadow: 'shadow-sm' },
  { key: 'Mixto', label: 'Mixto', color: 'bg-chart-blue', track: 'bg-chart-blue/10', shadow: 'shadow-sm' },
  { key: 'Negativo', label: 'Negativo', color: 'bg-chart-red', track: 'bg-chart-red/10', shadow: 'shadow-sm' }
];

export const CardLabsQ7_SentimentBars: React.FC<CardLabsQ7_SentimentBarsProps> = ({ data }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const stats = data.results.analisis_agregado;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || isFlipped) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -5;
    const rotateY = ((x - centerX) / centerX) * 5;
    setRotation({ x: rotateX, y: rotateY });
  }, [isFlipped]);

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
    setHoveredKey(null);
  };

  return (
    <div 
      className="relative w-full h-full min-h-[400px] [perspective:1000px] group cursor-pointer"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div 
        ref={cardRef}
        className="w-full h-full relative transition-all duration-500 ease-out [transform-style:preserve-3d]"
        style={{
          transform: `rotateX(${isFlipped ? 0 : rotation.x}deg) rotateY(${isFlipped ? 180 : rotation.y}deg)`
        }}
      >
        {/* --- FRONT FACE --- */}
        <div className="absolute inset-0 bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 [backface-visibility:hidden] flex flex-col z-10">
          
          {/* Header Row */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
               {/* Theme Icon */}
               <div className="p-2.5 bg-primary-50 rounded-xl text-primary-500">
                   <BarChart3 size={20} />
               </div>
               <div>
                   <h3 className="text-lg font-bold text-gray-900 leading-tight">Dist. de Sentimiento</h3>
                   <p className="text-xs text-gray-400 font-medium">Análisis Global</p>
               </div>
            </div>
          </div>

          {/* Big Number (Hero Metric) */}
          <div className="mb-8">
             <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-gray-900 tracking-tight">
                   {Math.round(stats.subjetividad_promedio_global * 100)}%
                </span>
                <span className="text-xl font-medium text-gray-400">Score</span>
             </div>
             <p className="text-xs text-gray-400 font-medium mt-1">Subjetividad Promedio</p>
          </div>

          {/* Chart Area */}
          <div 
             className="flex-1 w-full flex flex-col justify-center gap-5"
             onClick={(e) => e.stopPropagation()}
          >
             {CATEGORIES.map((cat) => {
                const value = (stats as any)[cat.key] as number;
                const percentage = Math.round(value * 100);
                
                return (
                   <div key={cat.key} className="flex items-center gap-4 group/bar" onMouseEnter={() => setHoveredKey(cat.key)}>
                      {/* Y-Axis Label */}
                      <div className="w-16 text-xs font-bold text-gray-400 group-hover/bar:text-gray-700 transition-colors">
                         {cat.label}
                      </div>

                      {/* Bar Container */}
                      <div className="flex-1 h-8 relative bg-gray-50 rounded-lg overflow-hidden flex items-center">
                         {/* Background Track (Dynamic Color) */}
                         <div className={`absolute inset-0 w-full opacity-0 group-hover/bar:opacity-100 transition-opacity ${cat.track}`}></div>

                         {/* Value Bar (Dynamic Color) */}
                         <div 
                            className={`h-full rounded-lg relative z-10 transition-all duration-500 ease-out ${cat.color} ${cat.shadow}`}
                            style={{ width: `${percentage}%` }}
                         ></div>

                         {/* Value Label */}
                         <span className="absolute right-3 text-xs font-bold text-gray-500 z-20">
                            {percentage}%
                         </span>
                      </div>
                   </div>
                )
             })}
          </div>

          {/* X-Axis / Legend / Footer */}
          <div className="mt-8 flex items-center gap-6">
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-chart-blue shadow-sm"></div>
                <span className="text-xs font-bold text-gray-700">Porcentaje Relativo</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-gray-100"></div>
                <span className="text-xs font-bold text-gray-400">Capacidad Total</span>
             </div>
          </div>

        </div>

        {/* --- BACK FACE --- */}
        <div className="absolute inset-0 bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col z-20">
          
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800">Detalle</h3>
          </div>

          <div className="flex-1 space-y-4">
             {/* Stats Table */}
             <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                {CATEGORIES.map((cat, i) => (
                    <div key={i} className="flex justify-between items-center p-3 border-b border-gray-100 last:border-0 hover:bg-white transition-colors">
                        <span className="text-sm text-gray-600 font-medium">{cat.label}</span>
                        <span className={`text-sm font-bold ${cat.color.replace('bg-', 'text-')}`}>{((stats as any)[cat.key] * 100).toFixed(1)}%</span>
                    </div>
                ))}
             </div>

             {/* Mixed Insight */}
             <div className="bg-chart-blue/10 p-4 rounded-xl border border-chart-blue/20">
                <div className="flex items-center gap-2 mb-2">
                    <RotateCw size={14} className="text-chart-blue"/>
                    <span className="text-xs font-bold text-chart-blue uppercase">Análisis Contextual</span>
                </div>
                <p className="text-xs text-gray-600 italic leading-relaxed">
                   {stats.ejemplo_mixto || "La subjetividad promedio indica que las opiniones están altamente polarizadas este mes."}
                </p>
             </div>
          </div>

        </div>

      </div>
    </div>
  );
};