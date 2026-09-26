import React, { useState, useRef, useMemo, useCallback } from 'react';
import { Layers, MessageSquareQuote, TrendingUp, Circle } from 'lucide-react';
import { formatInterpretationHtml } from '../../utils/formatInterpretation';

interface FrameDistribution {
  Positivo: number;
  Negativo: number;
  Aspiracional: number;
}

interface EvolutionPoint {
  semana: number;
  marcos_distribucion: FrameDistribution;
}

interface CardLabsQ4_NarrativeFramesProps {
  data: {
    results: {
      analisis_agregado: FrameDistribution;
      evolucion_temporal: EvolutionPoint[];
    };
    interpretation_text?: string;
  };
}

const GREEN = '#41ead4';
const YELLOW = '#f3dfa2';
const RED = '#ee4266';

const CONFIG = {
  Positivo: {
    color: GREEN,
    label: 'Validación',
    desc: 'Experiencias positivas confirmadas',
    radius: 70
  },
  Aspiracional: {
    color: YELLOW,
    label: 'Deseo',
    desc: 'Expectativas y necesidades futuras',
    radius: 55
  },
  Negativo: {
    color: RED,
    label: 'Fricción',
    desc: 'Puntos de dolor y quejas',
    radius: 40
  },
};

const NARRATIVE_EXAMPLES: Record<string, string> = {
  Positivo: "La atención fue rápida y resolvieron mi duda al instante.",
  Negativo: "Es frustrante repetir mis datos tres veces al operador.",
  Aspiracional: "Me gustaría planes más personalizados para familias."
};

export const CardLabsQ4_NarrativeFrames: React.FC<CardLabsQ4_NarrativeFramesProps> = ({ data }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [hoveredKey, setHoveredKey] = useState<keyof FrameDistribution | null>(null);

  const aggr = data.results.analisis_agregado;
  const total = aggr.Positivo + aggr.Negativo + aggr.Aspiracional;

  const chartData = useMemo(() => {
    return (Object.keys(CONFIG) as Array<keyof FrameDistribution>).map(key => {
      const value = aggr[key];
      const percent = (value / total) * 100;
      return {
        key,
        value,
        percent,
        ...CONFIG[key]
      };
    });
  }, [aggr, total]);

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

  const areaPaths = useMemo(() => {
    const history = data.results.evolucion_temporal;
    if (!history.length) return [];
    const width = 300;
    const height = 100;
    const xStep = width / (history.length - 1);

    const generatePath = (key: keyof FrameDistribution) => {
      let path = '';
      history.forEach((point, i) => {
        const val = point.marcos_distribucion[key];
        const y = height - (val * 2 * height);
        const command = i === 0 ? 'M' : 'L';
        path += `${command} ${i * xStep},${Math.max(0, y)} `;
      });
      return path;
    };

    return chartData.map(item => ({
      key: item.key,
      d: generatePath(item.key as keyof FrameDistribution),
      color: item.color
    }));
  }, [data, chartData]);


  return (
    <div
      className="relative w-full h-full min-h-[320px] [perspective:1000px] group cursor-pointer"
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
        {/* FRONT FACE */}
        <div className="absolute inset-0 bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 [backface-visibility:hidden] flex flex-col z-10">

          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary-50 rounded-xl text-primary-500">
                <Layers size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 leading-tight">¿Qué narrativas impulsan tu marca?</h3>
                <p className="text-xs text-gray-400 font-medium">Marcos Narrativos</p>
              </div>
            </div>
            <div className="text-gray-300">
              <TrendingUp size={16} />
            </div>
          </div>

          <div className="flex-1 flex flex-col md:flex-row items-center justify-between gap-4">

            <div className="relative w-40 h-40 flex-shrink-0 flex items-center justify-center">
              <svg width="160" height="160" viewBox="0 0 160 160" className="transform -rotate-90">
                {chartData.map((item) => {
                  const circumference = 2 * Math.PI * item.radius;
                  const offset = circumference - (item.percent / 100) * circumference;
                  const isHovered = hoveredKey === item.key;
                  const isDimmed = hoveredKey && hoveredKey !== item.key;

                  return (
                    <g key={item.key}>
                      <circle
                        cx="80" cy="80" r={item.radius}
                        fill="none" stroke="#f3f4f6" strokeWidth="10"
                      />
                      <circle
                        cx="80" cy="80" r={item.radius}
                        fill="none" stroke={item.color} strokeWidth="10" strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        className={`transition-all duration-300 ${isDimmed ? 'opacity-20' : 'opacity-100'}`}
                      />
                    </g>
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-gray-800 transition-all">
                  {hoveredKey ? `${Math.round(aggr[hoveredKey] * 100)}%` : '100%'}
                </span>
                <span className="text-[10px] text-gray-400 font-bold uppercase">
                  {hoveredKey ? hoveredKey.slice(0, 3) : 'Total'}
                </span>
              </div>
            </div>

            <div className="flex-1 w-full space-y-3">
              {chartData.map((item) => {
                const isHovered = hoveredKey === item.key;
                const isDimmed = hoveredKey && hoveredKey !== item.key;

                return (
                  <div
                    key={item.key}
                    onMouseEnter={() => setHoveredKey(item.key as keyof FrameDistribution)}
                    className={`flex items-start gap-3 p-2 rounded-xl transition-all duration-200 cursor-pointer ${isHovered ? 'bg-gray-50 transform scale-105' : 'hover:bg-gray-50'} ${isDimmed ? 'opacity-40' : 'opacity-100'}`}
                  >
                    <div className="mt-1">
                      <Circle size={10} fill={item.color} stroke="none" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-700">{item.label}</span>
                        <span className="text-xs font-bold" style={{ color: item.color }}>{Math.round(item.percent)}%</span>
                      </div>
                      <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{item.desc}</p>

                      <div className={`overflow-hidden transition-all duration-300 ${isHovered ? 'max-h-20 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                        <div className="flex gap-2 bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                          <MessageSquareQuote size={12} className="text-gray-400 shrink-0 mt-0.5" />
                          <p className="text-[10px] text-gray-500 italic">{NARRATIVE_EXAMPLES[item.key]}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>

        {/* BACK FACE: INTERPRETATION */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 to-white rounded-[32px] p-6 shadow-sm border border-primary-100 [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col z-20">
          <div className="flex items-center gap-3 mb-4 shrink-0">
            <div className="p-2.5 bg-primary-100 rounded-xl text-primary-600">
              <Layers size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Interpretación</h3>
              <p className="text-xs text-gray-400">Marcos Narrativos</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {data.interpretation_text ? (
              <p className="text-sm text-gray-700 leading-relaxed px-1 text-justify"
                dangerouslySetInnerHTML={{ __html: formatInterpretationHtml(data.interpretation_text) }}
              />
            ) : (
              <div className="space-y-3">
                {chartData.map((item) => (
                  <div key={item.key} className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <div className="flex-1">
                      <span className="text-xs font-bold text-gray-700">{item.label}</span>
                      <span className="text-xs text-gray-400 ml-2">{Math.round(item.percent)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-center text-xs text-gray-400 pt-4 border-t border-gray-100 shrink-0">
            Clic para volver al gráfico
          </div>
        </div>
      </div>
    </div>
  );
};
