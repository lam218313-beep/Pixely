import React, { useState, useRef, useMemo, useCallback } from 'react';
import { Target, Zap, ArrowRight, MousePointer2, MoveUpRight, CheckCircle2, TrendingUp } from 'lucide-react';

interface Opportunity {
  oportunidad: string;
  gap_score: number;
  competencia_score: number;
  recomendacion_accion: string;
  detalle: string;
}

interface CardLabsQ6_OpportunitiesMatrixProps {
  data: {
    results: {
      oportunidades: Opportunity[];
    };
  };
}

// Strict Palette
const GREEN = '#41ead4';
const YELLOW = '#f3dfa2';
const RED = '#ee4266';
const BLUE = '#63ADF2';

const QUADRANTS = [
  { id: 'q1', label: 'Quick Wins', color: GREEN, x: 50, y: 50, w: 50, h: 50, bg: 'rgba(65, 234, 212, 0.05)' }, // Top Right
  { id: 'q2', label: 'Sustain', color: BLUE, x: 0, y: 50, w: 50, h: 50, bg: 'rgba(99, 173, 242, 0.05)' },    // Top Left
  { id: 'q3', label: 'Invest', color: YELLOW, x: 50, y: 0, w: 50, h: 50, bg: 'rgba(243, 223, 162, 0.05)' },   // Bottom Right
  { id: 'q4', label: 'Drop', color: RED, x: 0, y: 0, w: 50, h: 50, bg: 'rgba(238, 66, 102, 0.03)' },       // Bottom Left
];

export const CardLabsQ6_OpportunitiesMatrix: React.FC<CardLabsQ6_OpportunitiesMatrixProps> = ({ data }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [hoveredOpp, setHoveredOpp] = useState<string | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || isFlipped) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -3; // Subtle tilt
    const rotateY = ((x - centerX) / centerX) * 3;
    setRotation({ x: rotateX, y: rotateY });
  }, [isFlipped]);

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
    setHoveredOpp(null);
  };

  const getPointColor = (gap: number, comp: number) => {
    if (gap > 50 && comp > 50) return GREEN;
    if (gap <= 50 && comp > 50) return BLUE;
    if (gap > 50 && comp <= 50) return YELLOW;
    return RED;
  };

  const points = useMemo(() => {
    return data.results.oportunidades.map((opp) => ({
      ...opp,
      x: opp.gap_score,
      y: opp.competencia_score,
      color: getPointColor(opp.gap_score, opp.competencia_score)
    }));
  }, [data]);

  const topPriorities = useMemo(() => {
    return [...points]
      .sort((a, b) => (b.gap_score + b.competencia_score) - (a.gap_score + a.competencia_score))
      .slice(0, 3);
  }, [points]);

  return (
    <div 
      className="relative w-full h-full min-h-[340px] [perspective:1000px] group cursor-pointer"
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
        <div className="absolute inset-0 bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 [backface-visibility:hidden] flex flex-col z-10">
          
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary-50 rounded-xl text-primary-500">
                <Target size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 leading-tight">Matriz de Oportunidades</h3>
                <p className="text-xs text-gray-400 font-medium">Priorización Estratégica</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
               <MousePointer2 size={12} /> Interactúa
            </div>
          </div>

          <div className="flex-1 flex gap-6 min-h-0">
            
            {/* LEFT: CHART AREA */}
            <div className="relative flex-1 bg-white rounded-2xl border border-gray-100 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="absolute inset-0 flex flex-col">
                    <div className="flex-1 flex">
                        {/* Q2: Sustain */}
                        <div className="flex-1 border-r border-b border-gray-100 relative group/q">
                            <span className="absolute top-2 left-2 text-[10px] font-bold text-chart-blue uppercase tracking-wider opacity-50 group-hover/q:opacity-100 transition-opacity">Sustain</span>
                            <div className="absolute inset-0 bg-chart-blue/5"></div>
                        </div>
                        {/* Q1: Quick Wins */}
                        <div className="flex-1 border-b border-gray-100 relative group/q">
                             <span className="absolute top-2 right-2 text-[10px] font-bold text-chart-green uppercase tracking-wider opacity-50 group-hover/q:opacity-100 transition-opacity">Quick Wins</span>
                             <div className="absolute inset-0 bg-chart-green/5"></div>
                        </div>
                    </div>
                    <div className="flex-1 flex">
                        {/* Q4: Drop */}
                        <div className="flex-1 border-r border-gray-100 relative group/q">
                            <span className="absolute bottom-2 left-2 text-[10px] font-bold text-chart-red uppercase tracking-wider opacity-50 group-hover/q:opacity-100 transition-opacity">Drop</span>
                            <div className="absolute inset-0 bg-chart-red/5"></div>
                        </div>
                        {/* Q3: Invest */}
                        <div className="flex-1 relative group/q">
                            <span className="absolute bottom-2 right-2 text-[10px] font-bold text-chart-yellow uppercase tracking-wider opacity-50 group-hover/q:opacity-100 transition-opacity">Invest</span>
                            <div className="absolute inset-0 bg-chart-yellow/5"></div>
                        </div>
                    </div>
                </div>

                {/* Axes Labels */}
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-bold text-gray-400 uppercase tracking-widest bg-white/50 px-2 rounded backdrop-blur-sm">
                    Gap de Mercado →
                </div>
                <div className="absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 text-[9px] font-bold text-gray-400 uppercase tracking-widest bg-white/50 px-2 rounded backdrop-blur-sm origin-center">
                    Capacidad Interna →
                </div>

                {/* Bubbles */}
                <div className="absolute inset-4">
                    {points.map((p, i) => {
                        const isHovered = hoveredOpp === p.oportunidad;
                        const isDimmed = hoveredOpp && hoveredOpp !== p.oportunidad;

                        return (
                            <div 
                                key={i}
                                className={`absolute w-4 h-4 rounded-full border-2 bg-white shadow-sm cursor-pointer transition-all duration-300 flex items-center justify-center group/bubble ${isHovered ? 'z-20 scale-150' : 'z-10 scale-100'} ${isDimmed ? 'opacity-20' : 'opacity-100'}`}
                                style={{ 
                                    left: `${p.x}%`, 
                                    bottom: `${p.y}%`, 
                                    borderColor: p.color,
                                    transform: 'translate(-50%, 50%)'
                                }}
                                onMouseEnter={() => setHoveredOpp(p.oportunidad)}
                                onMouseLeave={() => setHoveredOpp(null)}
                            >
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }}></div>
                                
                                {/* Tooltip on Hover Chart */}
                                {isHovered && (
                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none shadow-xl">
                                        {p.oportunidad}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* RIGHT: TOP LIST */}
            <div className="w-1/3 flex flex-col gap-3 min-w-[140px]">
                <div className="flex items-center gap-1.5 pb-2 border-b border-gray-100">
                    <Zap size={14} className="text-chart-yellow fill-chart-yellow" />
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Prioridades</span>
                </div>
                
                <div className="flex flex-col gap-2">
                    {topPriorities.map((item, idx) => {
                         const isHovered = hoveredOpp === item.oportunidad;
                         return (
                            <div 
                                key={idx}
                                className={`p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                                    isHovered 
                                        ? 'bg-gray-50 border-gray-200 shadow-sm translate-x-1' 
                                        : 'bg-white border-transparent hover:border-gray-100'
                                }`}
                                onMouseEnter={() => setHoveredOpp(item.oportunidad)}
                                onMouseLeave={() => setHoveredOpp(null)}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }}></div>
                                    <h4 className={`text-xs font-bold truncate ${isHovered ? 'text-gray-900' : 'text-gray-600'}`}>
                                        {item.oportunidad}
                                    </h4>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-gray-400">Gap Score</span>
                                    <span className="text-[10px] font-bold text-gray-700">{item.gap_score}</span>
                                </div>
                                <div className="mt-1 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${item.gap_score}%`, backgroundColor: item.color }}></div>
                                </div>
                            </div>
                         );
                    })}
                </div>

                <div className="mt-auto pt-2 text-center">
                    <span className="text-[10px] text-gray-400 font-medium">Ver 3 oportunidades más →</span>
                </div>
            </div>

          </div>
        </div>

        {/* --- BACK FACE --- */}
        <div className="absolute inset-0 bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col z-20">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800">Plan de Acción</h3>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
             <div className="flex flex-col gap-3">
                {points
                  .sort((a, b) => (b.gap_score + b.competencia_score) - (a.gap_score + a.competencia_score))
                  .map((opp, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-xl p-3 border border-gray-100 hover:border-chart-blue/30 transition-colors group">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <span className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white shadow-sm" style={{ backgroundColor: opp.color }}>
                                    {idx + 1}
                                </span>
                                <h4 className="text-xs font-bold text-gray-800">{opp.oportunidad}</h4>
                            </div>
                            <div className="flex gap-1">
                                {opp.gap_score > 80 && <Zap size={12} className="text-chart-yellow fill-chart-yellow" />}
                            </div>
                        </div>
                        
                        <div className="flex gap-2 mb-2">
                           <div className="h-1 flex-1 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${opp.gap_score}%`, backgroundColor: opp.color }}></div>
                           </div>
                        </div>

                        <div className="flex items-start gap-2 mt-2 bg-white p-2 rounded-lg border border-gray-100">
                             <TrendingUp size={12} className="text-gray-400 mt-0.5 shrink-0"/>
                             <p className="text-xs text-gray-600 font-medium leading-relaxed">
                                {opp.recomendacion_accion}
                             </p>
                        </div>
                    </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};