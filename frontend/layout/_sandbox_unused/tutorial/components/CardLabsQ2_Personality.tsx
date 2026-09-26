import React, { useState, useRef, useMemo, useCallback } from 'react';
import { MousePointer2, Fingerprint } from 'lucide-react';

interface PersonalityData {
  Sinceridad: number;
  Emocion: number;
  Competencia: number;
  Sofisticacion: number;
  Rudeza: number;
}

interface CardLabsQ2_PersonalityProps {
  data: {
    resumen_global_personalidad: PersonalityData;
  };
}

const TRAITS_ORDER: (keyof PersonalityData)[] = [
  'Sinceridad', 'Emocion', 'Competencia', 'Sofisticacion', 'Rudeza'
];

const CHART_BLUE = '#63ADF2';
const THEME_MAGENTA = '#F20F79';

export const CardLabsQ2_Personality: React.FC<CardLabsQ2_PersonalityProps> = ({ data }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [hoveredTrait, setHoveredTrait] = useState<{ name: string; value: number } | null>(null);

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
    setHoveredTrait(null);
  }, []);

  const CHART_SIZE = 280;
  const CENTER = CHART_SIZE / 2;
  const MAX_RADIUS = 100;
  const SIDES = 5;

  const chartConfig = useMemo(() => {
    const rawData = data.resumen_global_personalidad;
    return TRAITS_ORDER.map((trait, index) => {
      const value = rawData[trait];
      const normalizedValue = Math.min(Math.max(value, 0), 100) / 100;
      const angle = (Math.PI * 2 * index) / SIDES - Math.PI / 2;
      const x = CENTER + MAX_RADIUS * normalizedValue * Math.cos(angle);
      const y = CENTER + MAX_RADIUS * normalizedValue * Math.sin(angle);
      const axisX = CENTER + MAX_RADIUS * Math.cos(angle);
      const axisY = CENTER + MAX_RADIUS * Math.sin(angle);
      const labelX = CENTER + (MAX_RADIUS + 25) * Math.cos(angle);
      const labelY = CENTER + (MAX_RADIUS + 15) * Math.sin(angle);
      return { trait, value, x, y, angle, axisX, axisY, labelX, labelY };
    });
  }, [data]);

  const polygonPath = useMemo(() => chartConfig.map(p => `${p.x},${p.y}`).join(' '), [chartConfig]);

  const gridLevels = [0.25, 0.50, 0.75, 1.0];
  const gridPaths = useMemo(() => {
    return gridLevels.map(level => {
      return TRAITS_ORDER.map((_, index) => {
        const angle = (Math.PI * 2 * index) / SIDES - Math.PI / 2;
        const r = MAX_RADIUS * level;
        return `${CENTER + r * Math.cos(angle)},${CENTER + r * Math.sin(angle)}`;
      }).join(' ');
    });
  }, []);

  const sortedData = useMemo(() => {
    return (Object.entries(data.resumen_global_personalidad) as [string, number][])
      .map(([key, value]) => ({ name: key, value }))
      .sort((a, b) => b.value - a.value);
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
              {/* Theme Icon */}
              <div className="p-2.5 bg-primary-50 rounded-xl text-primary-500">
                <Fingerprint size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 leading-tight">Identidad</h3>
                <p className="text-xs text-gray-400 font-medium">Espectro de Marca</p>
              </div>
            </div>
          </div>

          <div 
            className="relative flex-1 w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-20">
               <span className="text-2xl font-bold" style={{ color: CHART_BLUE }}>
                {hoveredTrait ? hoveredTrait.value : ''}
              </span>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                {hoveredTrait ? hoveredTrait.name : ''}
              </p>
            </div>

            <svg width={CHART_SIZE} height={CHART_SIZE} viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`} className="overflow-visible">
              <defs>
                <linearGradient id="pentagonGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_BLUE} stopOpacity="0.4" />
                  <stop offset="100%" stopColor={CHART_BLUE} stopOpacity="0.1" />
                </linearGradient>
                <filter id="glowBlue">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {gridPaths.map((path, i) => (
                <polygon key={i} points={path} fill="none" stroke="#f1f5f9" strokeWidth="1.5" />
              ))}

              {chartConfig.map((p, i) => (
                <line key={i} x1={CENTER} y1={CENTER} x2={p.axisX} y2={p.axisY} stroke="#e2e8f0" strokeWidth="1" />
              ))}

              <polygon
                points={polygonPath}
                fill="url(#pentagonGradient)"
                stroke={CHART_BLUE}
                strokeWidth="2.5"
                filter="url(#glowBlue)"
                className="transition-all duration-300 ease-out"
              />

              {chartConfig.map((p, i) => (
                <g key={i} className="group/point">
                  <text
                    x={p.labelX} y={p.labelY}
                    textAnchor="middle" dominantBaseline="middle"
                    className={`text-[10px] font-semibold fill-gray-400 transition-colors ${hoveredTrait?.name === p.trait ? 'font-bold' : ''}`}
                    style={{ fill: hoveredTrait?.name === p.trait ? CHART_BLUE : undefined }}
                  >
                    {p.trait}
                  </text>
                  <circle 
                    cx={p.x} cy={p.y} r="12" fill="transparent" className="cursor-pointer"
                    onMouseEnter={() => setHoveredTrait({ name: p.trait, value: p.value })}
                  />
                  <circle
                    cx={p.x} cy={p.y} r="4" fill="white" stroke={CHART_BLUE} strokeWidth="2"
                    className="pointer-events-none transition-all duration-200 group-hover/point:r-6 group-hover/point:stroke-[3px]"
                  />
                </g>
              ))}
            </svg>
          </div>
          
          <div className="w-full flex items-center gap-2 text-xs text-gray-500 mt-4 bg-gray-50 p-3 rounded-xl">
            <MousePointer2 size={14} className="text-chart-blue" />
            <span>Hover en vértices para detalles</span>
          </div>
        </div>

        {/* --- BACK FACE --- */}
        <div className="absolute inset-0 bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col z-20">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900">Rasgos</h3>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-400 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">Rasgo</th>
                  <th className="px-4 py-3 rounded-r-lg text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-700">{item.name}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-1 rounded-md font-bold text-xs ${
                        item.value >= 80 ? 'bg-chart-blue/10 text-chart-blue' :
                        item.value >= 50 ? 'bg-gray-100 text-gray-700' : 
                        'bg-gray-50 text-gray-500'
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