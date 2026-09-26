import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AlertTriangle, CheckCircle, HelpCircle, Hash, ArrowRight } from 'lucide-react';

interface TopicData {
  topic: string;
  frecuencia_relativa: number; 
  sentimiento_promedio: number; 
}

interface CardLabsQ3_TopTopicsProps {
  data: {
    results: {
      analisis_agregado: TopicData[];
    };
  };
}

const RADIUS = 42; 
const STROKE_WIDTH = 12; 
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Palette
const GREEN = '#41ead4';
const RED = '#ee4266';
const YELLOW = '#f3dfa2';

const getSentimentConfig = (score: number) => {
  if (score > 0.4) {
    return {
      color: 'text-chart-green',
      stroke: GREEN,
      track: '#e0f5ee',  
      bg: 'bg-chart-green/10',
      icon: CheckCircle,
      label: 'Positivo'
    };
  } else if (score < -0.1) {
    return {
      color: 'text-chart-red',
      stroke: RED,
      track: '#fce8ea',  
      bg: 'bg-chart-red/10',
      icon: AlertTriangle,
      label: 'Crítico'
    };
  } else {
    return {
      color: 'text-chart-yellow',
      stroke: YELLOW,
      track: '#fdf5e6', 
      bg: 'bg-chart-yellow/10',
      icon: HelpCircle,
      label: 'Neutral'
    };
  }
};

const MicroTopicCard: React.FC<{ topic: TopicData; index: number }> = ({ topic, index }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  const config = getSentimentConfig(topic.sentimiento_promedio);

  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress(topic.frecuencia_relativa);
    }, index * 200 + 100); 
    return () => clearTimeout(timer);
  }, [topic.frecuencia_relativa, index]);

  const strokeDashoffset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;

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
      className="relative h-[240px] w-full [perspective:1000px] group cursor-pointer"
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
        <div className="absolute inset-0 bg-white rounded-[32px] p-5 shadow-sm border border-gray-100 [backface-visibility:hidden] flex flex-col items-center">
          
          <div className="w-full flex items-start mb-2">
            <div className="flex items-center gap-3 w-full overflow-hidden">
                {/* Theme Icon */}
                <div className="p-2.5 bg-primary-50 rounded-xl text-primary-500 shrink-0">
                    <Hash size={20} />
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold text-gray-900 leading-tight truncate" title={topic.topic}>
                        {topic.topic}
                    </h3>
                    <p className="text-xs text-gray-400 font-medium truncate">Análisis de Tópico</p>
                </div>
            </div>
          </div>

          <div 
             className="flex-1 flex items-center justify-center w-full relative"
             onClick={(e) => e.stopPropagation()} 
          >
            <div className="relative w-32 h-32">
               <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                 {/* Background Circle */}
                 <circle 
                    cx="50" 
                    cy="50" 
                    r={RADIUS} 
                    stroke={config.track} 
                    strokeWidth={STROKE_WIDTH} 
                    fill="none" 
                 />
                 {/* Progress Circle */}
                 <circle 
                    cx="50" 
                    cy="50" 
                    r={RADIUS} 
                    stroke={config.stroke} 
                    strokeWidth={STROKE_WIDTH} 
                    fill="none" 
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                 />
               </svg>
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-gray-800 tracking-tight">{Math.round(progress)}%</span>
                  <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider mt-1">Freq</span>
               </div>
            </div>
          </div>
          
          <div className={`flex items-center justify-center gap-1.5 px-3 py-1 rounded-full ${config.bg} ${config.color} w-fit mt-1`}>
                <config.icon size={12} />
                <span className="text-[10px] font-bold uppercase tracking-wider">{config.label}</span>
          </div>

        </div>

        {/* --- BACK FACE --- */}
        <div className="absolute inset-0 bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-between items-center text-center">
           <div className="w-full flex justify-end"></div>
           
           <div className="flex flex-col items-center justify-center flex-1">
                <h4 className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-2">Sentimiento</h4>
                <span className={`text-4xl font-bold mb-3 ${config.color}`}>
                    {topic.sentimiento_promedio > 0 ? '+' : ''}{topic.sentimiento_promedio}
                </span>
                <p className="text-[10px] text-gray-500 max-w-[150px] leading-relaxed">
                    Puntaje normalizado basado en análisis de sentimiento semántico.
                </p>
           </div>
           
           <div className="w-full border-t border-gray-50 pt-3 flex items-center justify-center gap-1 text-xs text-gray-400 font-medium group-hover:text-gray-600 transition-colors cursor-pointer">
             <span>Ver verbatim</span>
             <ArrowRight size={12} />
           </div>
        </div>
      </div>
    </div>
  );
};

export const CardLabsQ3_TopTopics: React.FC<CardLabsQ3_TopTopicsProps> = ({ data }) => {
  const topTopics = [...data.results.analisis_agregado]
    .sort((a, b) => b.frecuencia_relativa - a.frecuencia_relativa) 
    .slice(0, 3) 
    .sort((a, b) => b.sentimiento_promedio - a.sentimiento_promedio); 

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 h-full">
      {topTopics.map((topic, index) => (
        <MicroTopicCard key={`${topic.topic}-${index}`} topic={topic} index={index} />
      ))}
    </div>
  );
};