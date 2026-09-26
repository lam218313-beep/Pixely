import React, { useState, useRef, useMemo, useCallback } from 'react';
import { Medal, Quote } from 'lucide-react';

interface Influencer {
  username: string;
  autoridad_promedio: number;
  afinidad_promedio: number;
  menciones: number;
  score_centralidad: number;
  sentimiento: number;
  comentario_evidencia: string;
}

interface CardLabsQ5_InfluencerRankingProps {
  data: {
    results: {
      influenciadores_globales: Influencer[];
    };
  };
}

const getInitials = (name: string) => name.substring(0, 2).toUpperCase();

// Semantic Mapping with strict palette
const getSentimentColor = (score: number) => {
  if (score > 0.2) return 'bg-chart-green border-chart-green'; 
  if (score < -0.2) return 'bg-chart-red border-chart-red'; 
  return 'bg-chart-blue border-chart-blue'; // Using Blue for neutral/mixed in this context
};

export const CardLabsQ5_InfluencerRanking: React.FC<CardLabsQ5_InfluencerRankingProps> = ({ data }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  const topInfluencers = useMemo(() => {
    return [...data.results.influenciadores_globales]
      .sort((a, b) => b.score_centralidad - a.score_centralidad)
      .slice(0, 5);
  }, [data]);

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

  const handleMouseLeave = () => setRotation({ x: 0, y: 0 });

  return (
    <div 
      className="relative w-full h-auto min-h-[440px] [perspective:1000px] group cursor-pointer"
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
          
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-3">
              {/* Theme Icon */}
              <div className="p-2.5 bg-primary-50 rounded-xl text-primary-500">
                <Medal size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 leading-tight">Top Influencers</h3>
                <p className="text-xs text-gray-400 font-medium">Ranking Centralidad</p>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-3">
            {topInfluencers.map((inf, idx) => (
              <div key={inf.username} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50/50 hover:bg-white border border-transparent hover:border-gray-100 hover:shadow-sm transition-all group/item">
                <div className="relative w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-xs font-bold text-gray-600 border-2 border-white shadow-sm">
                  {getInitials(inf.username)}
                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${getSentimentColor(inf.sentimiento)}`}></div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="text-sm font-bold text-gray-700 truncate pr-2">{inf.username}</h4>
                    <span className="text-xs font-bold text-chart-blue">{Math.round(inf.score_centralidad * 100)}%</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex flex-col gap-1">
                        {/* Autoridad Bar (Darker Blue) */}
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-chart-blue rounded-full" style={{ width: `${inf.autoridad_promedio}%` }}></div>
                        </div>
                        {/* Afinidad Bar (Lighter Blue/Cyan? -> Using Blue with opacity for simplicity or just Blue) */}
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-chart-blue/60 rounded-full" style={{ width: `${inf.afinidad_promedio}%` }}></div>
                        </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-2 flex justify-between items-center text-[10px] text-gray-400 px-2">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-chart-blue"></div>Autoridad</div>
                <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-chart-blue/60"></div>Afinidad</div>
            </div>
          </div>
        </div>

        {/* --- BACK FACE --- */}
        <div className="absolute inset-0 bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col z-20">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <Quote size={18} className="text-gray-400"/>
                    <h3 className="text-base font-bold text-gray-800">Evidencia</h3>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-4">
                {topInfluencers.map((inf) => (
                    <div key={inf.username} className="relative pl-4 border-l-2 border-chart-blue/20">
                        <p className="text-xs text-gray-500 italic leading-relaxed mb-1">
                            "{inf.comentario_evidencia}"
                        </p>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-700">{inf.username}</span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">{inf.menciones} menciones</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};