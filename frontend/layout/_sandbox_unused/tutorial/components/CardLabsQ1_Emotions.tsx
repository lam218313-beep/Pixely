import React, { useState, useRef, useMemo, useCallback } from 'react';
import { MousePointer2, Heart } from 'lucide-react';

interface EmotionDataPoint {
  name: string;
  value: number; 
}

interface CardLabsQ1_EmotionsProps {
  data: {
    emociones: EmotionDataPoint[];
  };
}

const PLUTCHIK_AXES = [
  'Alegría', 'Confianza', 'Miedo', 'Sorpresa', 
  'Tristeza', 'Aversión', 'Ira', 'Anticipación'
];

// Palette
const CHART_BLUE = '#63ADF2';
const THEME_MAGENTA = '#F20F79';

export const CardLabsQ1_Emotions: React.FC<CardLabsQ1_EmotionsProps> = ({ data }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [hoveredEmotion, setHoveredEmotion] = useState<{ name: string; value: number } | null>(null);

  // --- 3D Tilt Logic ---
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

  const handleMouseLeave = useCallback(() => {
    setRotation({ x: 0, y: 0 });
    setHoveredEmotion(null);
  }, []);

  // --- Chart Math ---
  const CHART_SIZE = 280;
  const CENTER = CHART_SIZE / 2;
  const RADIUS = 100;

  const chartPoints = useMemo(() => {
    return PLUTCHIK_AXES.map((axisName, index) => {
      const found = data.emociones.find(e => e.name === axisName);
      const rawValue = found ? found.value : 0;
      const normalizedValue = Math.min(Math.max(rawValue, 0), 100) / 100; 
      
      const angle = (Math.PI * 2 * index) / 8 - Math.PI / 2; 
      const x = CENTER + RADIUS * normalizedValue * Math.cos(angle);
      const y = CENTER + RADIUS * normalizedValue * Math.sin(angle);

      return { x, y, value: rawValue, name: axisName, normalizedValue, angle };
    });
  }, [data]);

  const polygonPath = useMemo(() => {
    if (chartPoints.length === 0) return '';
    return chartPoints.map(p => `${p.x},${p.y}`).join(' ');
  }, [chartPoints]);

  const axisLines = useMemo(() => {
    return PLUTCHIK_AXES.map((_, index) => {
      const angle = (Math.PI * 2 * index) / 8 - Math.PI / 2;
      const x = CENTER + RADIUS * Math.cos(angle);
      const y = CENTER + RADIUS * Math.sin(angle);
      return { x1: CENTER, y1: CENTER, x2: x, y2: y };
    });
  }, []);

  const sortedData = useMemo(() => {
    return [...data.emociones].sort((a, b) => b.value - a.value);
  }, [data]);

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
        <div className="absolute inset-0 bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 [backface-visibility:hidden] flex flex-col items-center justify-between z-10">
          <div className="w-full flex justify-between items-center mb-2">
            <div className="flex items-center gap-3">
              {/* Theme Color Icon */}
              <div className="p-2.5 bg-primary-50 rounded-xl text-primary-500">
                <Heart size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 leading-tight">Radar Emocional</h3>
                <p className="text-xs text-gray-400 font-medium">Modelo Plutchik</p>
              </div>
            </div>
          </div>

          <div 
            className="relative flex-1 w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-20">
              <span className="text-2xl font-bold" style={{ color: CHART_BLUE }}>
                {hoveredEmotion ? `${hoveredEmotion.value}%` : ''}
              </span>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                {hoveredEmotion ? hoveredEmotion.name : ''}
              </p>
            </div>

            <svg width={CHART_SIZE} height={CHART_SIZE} viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`} className="overflow-visible">
              <defs>
                <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_BLUE} stopOpacity="0.4" />
                  <stop offset="100%" stopColor={CHART_BLUE} stopOpacity="0.1" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {[0.25, 0.5, 0.75, 1].map((scale, i) => (
                 <circle 
                   key={i} 
                   cx={CENTER} 
                   cy={CENTER} 
                   r={RADIUS * scale} 
                   fill="none" 
                   stroke="#f3f4f6" 
                   strokeWidth="1"
                   strokeDasharray={scale === 1 ? "0" : "4 4"}
                 />
              ))}

              {axisLines.map((line, i) => (
                <line 
                  key={i} 
                  x1={line.x1} 
                  y1={line.y1} 
                  x2={line.x2} 
                  y2={line.y2} 
                  stroke="#e5e7eb" 
                  strokeWidth="1" 
                />
              ))}

              <path
                d={`M ${polygonPath} Z`}
                fill="url(#radarGradient)"
                stroke={CHART_BLUE}
                strokeWidth="2.5"
                filter="url(#glow)"
                className="transition-all duration-300 ease-out"
              />

              {chartPoints.map((p, i) => (
                <g key={i} className="group/point cursor-pointer">
                  <circle 
                    cx={p.x} 
                    cy={p.y} 
                    r="12" 
                    fill="transparent" 
                    onMouseEnter={() => setHoveredEmotion({ name: p.name, value: p.value })}
                  />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="4"
                    fill="white"
                    stroke={CHART_BLUE}
                    strokeWidth="2"
                    className="transition-all duration-200 group-hover/point:r-6 group-hover/point:stroke-[3px]"
                  />
                  <text
                    x={CENTER + (RADIUS + 20) * Math.cos(p.angle)}
                    y={CENTER + (RADIUS + 20) * Math.sin(p.angle)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={`text-[10px] font-semibold fill-gray-400 transition-colors ${hoveredEmotion?.name === p.name ? 'font-bold' : ''}`}
                    style={{ fill: hoveredEmotion?.name === p.name ? CHART_BLUE : undefined }}
                  >
                    {p.name}
                  </text>
                </g>
              ))}
            </svg>
          </div>
          
          <div className="w-full flex items-center gap-2 text-xs text-gray-500 mt-4 bg-gray-50 p-3 rounded-xl">
            <MousePointer2 size={14} className="text-chart-blue" />
            <span>Explora los puntos de datos</span>
          </div>
        </div>

        {/* --- BACK FACE --- */}
        <div className="absolute inset-0 bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col z-20">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900">Datos Brutos</h3>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-400 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">Emoción</th>
                  <th className="px-4 py-3 rounded-r-lg text-right">Intensidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-700">{item.name}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-1 rounded-md font-bold text-xs ${
                        item.value > 75 ? 'bg-chart-blue/10 text-chart-blue' :
                        item.value > 40 ? 'bg-gray-100 text-gray-600' : 
                        'bg-gray-50 text-gray-400'
                      }`}>
                        {item.value}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};