import React, { useState, useRef, useMemo, useCallback } from 'react';
import { Zap, Info } from 'lucide-react';

interface TopicData {
  topic: string;
  frecuencia_relativa: number;
  sentimiento_promedio: number;
}

interface CardLabsQ3_ConclusionGaugeProps {
  data: {
    results: {
      analisis_agregado: TopicData[];
    };
  };
}

const GREEN = '#41ead4';
const YELLOW = '#f3dfa2';
const RED = '#ee4266';

export const CardLabsQ3_ConclusionGauge: React.FC<CardLabsQ3_ConclusionGaugeProps> = ({ data }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  const { normalizedScore, rawWeightedAvg } = useMemo(() => {
    const items = data.results.analisis_agregado;
    const totalFreq = items.reduce((acc, curr) => acc + curr.frecuencia_relativa, 0);
    const weightedSum = items.reduce((acc, curr) => acc + (curr.sentimiento_promedio * curr.frecuencia_relativa), 0);
    const rawAvg = totalFreq > 0 ? weightedSum / totalFreq : 0;
    const score = Math.min(Math.max(((rawAvg + 1) / 2) * 100, 0), 100);
    return { normalizedScore: Math.round(score), rawWeightedAvg: rawAvg.toFixed(2) };
  }, [data]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || isFlipped) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((e.clientY - rect.top - centerY) / centerY) * -5;
    const rotateY = ((e.clientX - rect.left - centerX) / centerX) * 5;
    setRotation({ x: rotateX, y: rotateY });
  }, [isFlipped]);

  const handleMouseLeave = () => setRotation({ x: 0, y: 0 });

  // Half Donut Config
  const RADIUS = 80;
  const STROKE_WIDTH = 20; 
  const ARC_LENGTH = Math.PI * RADIUS; 
  const dashArray = (normalizedScore / 100) * ARC_LENGTH;

  // Gradient Colors
  const getGradientColors = () => {
    if (normalizedScore >= 70) return [GREEN, GREEN]; 
    if (normalizedScore >= 40) return [YELLOW, YELLOW];
    return [RED, RED];
  };

  const [startColor, endColor] = getGradientColors();

  return (
    <div 
      className="relative w-full h-full min-h-[220px] [perspective:1000px] group cursor-pointer"
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
        {/* --- FRONT FACE (THEME BACKGROUND) --- */}
        <div className="absolute inset-0 bg-primary-500 rounded-[32px] p-6 shadow-xl border border-white/20 [backface-visibility:hidden] flex flex-col items-center justify-between z-10">
           
           <div className="w-full flex justify-between items-start mb-1 relative z-20">
             <div className="flex items-center gap-3">
               {/* Icon white/20 for contrast on theme bg */}
               <div className="p-2.5 bg-white/20 rounded-xl text-white border border-white/10 shadow-inner">
                 <Zap size={20} />
               </div>
               <div>
                 <h3 className="text-lg font-bold text-white leading-tight">NPS Predictivo</h3>
                 <p className="text-xs text-white/80 font-medium">Score Global</p>
               </div>
             </div>
             <div className="p-1.5 rounded-full bg-white/20 text-white border border-white/10">
                <Info size={14} />
             </div>
           </div>

           <div 
             className="relative w-full flex-1 flex flex-col items-center justify-center"
             onClick={(e) => e.stopPropagation()} 
           >
              <svg width="220" height="120" viewBox="0 0 200 120" className="overflow-visible">
                <defs>
                  <linearGradient id="meterGradientScore" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={startColor} /> 
                    <stop offset="100%" stopColor={endColor} /> 
                  </linearGradient>
                  <filter id="glowMeterScore">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                
                {/* Track (White with low opacity) */}
                <path 
                    d="M 20 100 A 80 80 0 0 1 180 100" 
                    fill="none" 
                    stroke="rgba(255,255,255,0.2)" 
                    strokeWidth={STROKE_WIDTH} 
                    strokeLinecap="round" 
                />
                
                <path 
                  d="M 20 100 A 80 80 0 0 1 180 100" 
                  fill="none" 
                  stroke="url(#meterGradientScore)" 
                  strokeWidth={STROKE_WIDTH} 
                  strokeLinecap="round" 
                  filter="url(#glowMeterScore)"
                  strokeDasharray={`${dashArray} ${ARC_LENGTH}`}
                  className="transition-all duration-1000 ease-out"
                />

                <g className="translate-y-2">
                    <text x="100" y="85" textAnchor="middle" className="text-5xl font-extrabold fill-white drop-shadow-md">
                        {normalizedScore}
                    </text>
                    <text x="100" y="105" textAnchor="middle" className="text-[10px] font-bold fill-white/80 uppercase tracking-widest">
                        Puntos NPS
                    </text>
                </g>

                <text x="10" y="115" className="text-[10px] fill-white/60 font-bold" textAnchor="middle">0</text>
                <text x="190" y="115" className="text-[10px] fill-white/60 font-bold" textAnchor="middle">100</text>
              </svg>
           </div>
        </div>

        {/* --- BACK FACE (THEME BACKGROUND) --- */}
        <div className="absolute inset-0 bg-primary-500 rounded-[32px] p-6 shadow-xl border border-white/20 [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col z-20 items-center justify-center text-center">
            <h4 className="text-white/80 text-xs font-bold uppercase tracking-widest mb-4">Metodología</h4>
            
            <div className="space-y-4 w-full">
              <div className="bg-white/10 p-4 rounded-2xl border border-white/20 backdrop-blur-sm">
                <span className="block text-xs text-white/90 font-bold mb-1">Sentimiento Ponderado</span>
                <span className="text-3xl font-bold text-white">{rawWeightedAvg}</span>
                <span className="block text-[10px] text-white/70 mt-1">Escala -1.0 a +1.0</span>
              </div>
              <div className="text-xs text-white/80 leading-relaxed px-2">
                Basado en frecuencia relativa de tópicos × sentimiento promedio.
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};