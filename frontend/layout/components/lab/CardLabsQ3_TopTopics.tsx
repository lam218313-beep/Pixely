import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AlertTriangle, CheckCircle, HelpCircle, Hash, ArrowRight, TrendingUp, Tag, Activity } from 'lucide-react';
import { formatInterpretationHtml } from '../../utils/formatInterpretation';

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
    interpretation_text?: string;
  };
}

const RADIUS = 46;
const STROKE_WIDTH = 10;
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
      border: 'border-chart-green/20',
      icon: CheckCircle,
      label: 'Positivo',
      keywords: ['Excelente', 'Rápido', 'Solución', 'Amable']
    };
  } else if (score < -0.1) {
    return {
      color: 'text-chart-red',
      stroke: RED,
      track: '#fce8ea',
      bg: 'bg-chart-red/10',
      border: 'border-chart-red/20',
      icon: AlertTriangle,
      label: 'Crítico',
      keywords: ['Lento', 'Error', 'Caro', 'Malo']
    };
  } else {
    return {
      color: 'text-chart-yellow',
      stroke: YELLOW,
      track: '#fdf5e6',
      bg: 'bg-chart-yellow/10',
      border: 'border-chart-yellow/20',
      icon: HelpCircle,
      label: 'Neutral',
      keywords: ['Normal', 'Promedio', 'Bien', 'Regular']
    };
  }
};

const MicroTopicCard: React.FC<{ topic: TopicData; index: number; interpretation_text?: string }> = ({ topic, index, interpretation_text }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  const config = getSentimentConfig(topic.sentimiento_promedio);

  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress(topic.frecuencia_relativa);
    }, index * 200 + 100);
    return () => clearTimeout(timer);
  }, [topic.frecuencia_relativa, index]);

  const strokeDashoffset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || !contentRef.current || isFlipped) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -3;
    const rotateY = ((x - centerX) / centerX) * 3;
    contentRef.current.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  };

  const handleMouseLeave = () => {
    if (contentRef.current && !isFlipped) {
      contentRef.current.style.transform = `rotateX(0deg) rotateY(0deg)`;
    }
  };

  // Reset transform when flipped changes
  React.useEffect(() => {
    if (contentRef.current) {
      contentRef.current.style.transform = isFlipped
        ? 'rotateX(0deg) rotateY(180deg)'
        : 'rotateX(0deg) rotateY(0deg)';
    }
  }, [isFlipped]);

  return (
    <div
      ref={cardRef}
      className="relative h-full min-h-[400px] w-full [perspective:1000px] group cursor-pointer"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div
        ref={contentRef}
        className="w-full h-full relative transition-transform duration-100 ease-out [transform-style:preserve-3d]"
      >
        {/* --- FRONT FACE --- */}
        <div className="absolute inset-0 bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 [backface-visibility:hidden] flex flex-col">

          {/* Header */}
          <div className="w-full flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary-50 rounded-xl text-primary-500 shrink-0">
                <Hash size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 leading-tight">
                  {topic.topic}
                </h3>
                <p className="text-xs text-gray-400 font-medium">¿De qué están hablando?</p>
              </div>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${config.bg} ${config.color} border ${config.border}`}>
              <config.icon size={12} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{config.label}</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-between">

            {/* Main Visual: Circle Chart + Big Number */}
            <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
              <div className="relative w-28 h-28 shrink-0">
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r={RADIUS} stroke={config.track} strokeWidth={STROKE_WIDTH} fill="none" />
                  <circle cx="50" cy="50" r={RADIUS} stroke={config.stroke} strokeWidth={STROKE_WIDTH} fill="none" strokeDasharray={CIRCUMFERENCE} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-gray-800">{Math.round(progress)}%</span>
                </div>
              </div>

              <div className="flex-1 space-y-3">
                <div>
                  <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block mb-1">Impacto en Retención</span>
                  <div className="flex items-center gap-1 text-sm font-bold text-gray-800">
                    <Activity size={16} className={config.color} />
                    {topic.sentimiento_promedio < 0 ? 'Alto Riesgo' : 'Factor Fidelidad'}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block mb-1">Volumen</span>
                  <div className="flex items-center gap-1 text-sm font-bold text-gray-800">
                    <TrendingUp size={16} className="text-gray-400" />
                    Alto (3.4k menciones)
                  </div>
                </div>
              </div>
            </div>

            {/* Keywords Section to fill space */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <Tag size={14} className="text-gray-400" />
                <span className="text-xs font-bold text-gray-600 uppercase">Conceptos Clave</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {config.keywords.map((kw, i) => (
                  <span key={i} className="px-2.5 py-1 bg-gray-50 text-gray-600 text-[10px] font-bold rounded-lg border border-gray-100">
                    #{kw}
                  </span>
                ))}
                <span className="px-2.5 py-1 text-gray-400 text-[10px] font-medium">+4</span>
              </div>
            </div>

          </div>

        </div>

        {/* --- BACK FACE --- */}
        <div className="absolute inset-0 bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-between items-center text-center">
          <div className="w-full flex justify-end"></div>

          <div className="flex flex-col items-center justify-center flex-1 overflow-y-auto px-1">
            {interpretation_text ? (
              <p className="text-sm text-gray-700 leading-relaxed text-justify"
                dangerouslySetInnerHTML={{ __html: formatInterpretationHtml(interpretation_text) }}
              />
            ) : (
              <>
                <h4 className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-2">Sentimiento Semántico</h4>
                <span className={`text-5xl font-extrabold mb-4 ${config.color}`}>
                  {topic.sentimiento_promedio > 0 ? '+' : ''}{topic.sentimiento_promedio}
                </span>
                <p className="text-xs text-gray-500 max-w-[180px] leading-relaxed">
                  Este tópico está {topic.sentimiento_promedio > 0 ? 'impulsando' : 'frenando'} la percepción de marca significativamente.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const CardLabsQ3_TopTopics: React.FC<CardLabsQ3_TopTopicsProps> = ({ data }) => {
  // Taking top 2 to perfectly fill the grid
  const topTopics = [...data.results.analisis_agregado]
    .sort((a, b) => b.frecuencia_relativa - a.frecuencia_relativa)
    .slice(0, 2);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
      {topTopics.map((topic, index) => (
        <MicroTopicCard
          key={`${topic.topic}-${index}`}
          topic={topic}
          index={index}
          interpretation_text={data.interpretation_text}
        />
      ))}
    </div>
  );
};
