import React, { useState, useRef, useMemo, useCallback } from 'react';
import { TrendingUp, Activity } from 'lucide-react';

interface WeeklyPoint {
  fecha_semana: string;
  porcentaje_positivo: number; 
  engagement: number;
  topico_principal: string;
}

interface CardLabsQ8_TemporalEvolutionProps {
  data: {
    results: {
      serie_temporal_semanal: WeeklyPoint[];
      resumen_global: {
        tendencia: string;
      };
    };
  };
}

const CHART_BLUE = '#63ADF2';

const getPathData = (points: { x: number; y: number }[]) => {
  if (points.length === 0) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
};

export const CardLabsQ8_TemporalEvolution: React.FC<CardLabsQ8_TemporalEvolutionProps> = ({ data }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const series = data.results.serie_temporal_semanal;

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
    setHoveredIndex(null);
  };

  const SVG_WIDTH = 400; 
  const SVG_HEIGHT = 280; 
  const PADDING_TOP = 20;
  const PADDING_BOTTOM = 30;
  const LABEL_WIDTH = 35; 
  const GRAPH_WIDTH = SVG_WIDTH - LABEL_WIDTH;
  const GRAPH_HEIGHT = SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  const totalEngagement = useMemo(() => series.reduce((acc, curr) => acc + curr.engagement, 0), [series]);
  const avgSentiment = useMemo(() => {
    const total = series.reduce((acc, curr) => acc + curr.porcentaje_positivo, 0);
    return Math.round((total / series.length) * 100);
  }, [series]);

  const chartData = useMemo(() => {
    if (series.length === 0) return { path: '', areaPath: '', points: [], maxVal: 0 };
    const maxVal = Math.max(...series.map(p => p.engagement)) * 1.1; 
    const minVal = 0;
    const points = series.map((p, i) => {
      const x = LABEL_WIDTH + (i / (series.length - 1)) * (GRAPH_WIDTH - 10);
      const y = PADDING_TOP + GRAPH_HEIGHT - ((p.engagement - minVal) / (maxVal - minVal)) * GRAPH_HEIGHT;
      return { x, y, raw: p };
    });
    const curvePath = getPathData(points);
    const areaPath = `${curvePath} L ${points[points.length - 1].x} ${SVG_HEIGHT} L ${points[0].x} ${SVG_HEIGHT} Z`;
    return { path: curvePath, areaPath, points, maxVal };
  }, [series]);

  const yLabels = [
     Math.round(chartData.maxVal),
     Math.round(chartData.maxVal * 0.5),
     0
  ];

  return (
    <div 
      className="relative w-full h-full min-h-[440px] [perspective:1000px] group cursor-pointer"
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
          
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
             <div className="flex items-center gap-3">
                 {/* Theme Icon */}
                 <div className="p-2.5 bg-primary-50 rounded-xl text-primary-500">
                    <TrendingUp size={20} />
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">Evolución Temporal</h3>
                    <p className="text-xs text-gray-400 font-medium">Tendencia Semanal</p>
                 </div>
             </div>
          </div>

          <div className="flex flex-1 gap-6 min-h-0">
            <div 
                className="flex-1 relative flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex-1 w-full min-h-0">
                    <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="chartBlueFade" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART_BLUE} stopOpacity="0.2" />
                            <stop offset="100%" stopColor={CHART_BLUE} stopOpacity="0.0" />
                        </linearGradient>
                        <filter id="glowLine">
                            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor={CHART_BLUE} floodOpacity="0.3"/>
                        </filter>
                    </defs>

                    {yLabels.map((label, i) => {
                        const yPos = PADDING_TOP + (i / (yLabels.length - 1)) * GRAPH_HEIGHT;
                        return (
                            <g key={i}>
                            <text x="0" y={yPos} dy="4" className="text-[10px] fill-gray-300 font-medium" textAnchor="start">
                                {(label / 1000).toFixed(1)}k
                            </text>
                            <line 
                                x1={LABEL_WIDTH} 
                                y1={yPos} 
                                x2={SVG_WIDTH} 
                                y2={yPos} 
                                stroke="#f3f4f6" 
                                strokeWidth="1" 
                                strokeDasharray="4 4"
                            />
                            </g>
                        )
                    })}

                    <path d={chartData.areaPath} fill="url(#chartBlueFade)" stroke="none" />
                    <path d={chartData.path} fill="none" stroke={CHART_BLUE} strokeWidth="3" strokeLinecap="round" filter="url(#glowLine)" />

                    {chartData.points.map((p, i) => (
                        <g key={i} onMouseEnter={() => setHoveredIndex(i)} className="cursor-pointer">
                            <rect x={p.x - 15} y={0} width={30} height={SVG_HEIGHT} fill="transparent" />
                            <line 
                                x1={p.x} y1={PADDING_TOP} x2={p.x} y2={SVG_HEIGHT} 
                                stroke={CHART_BLUE} 
                                strokeWidth="1.5" 
                                strokeDasharray="3 3"
                                className={`transition-opacity duration-200 ${hoveredIndex === i ? 'opacity-100' : 'opacity-0'}`}
                            />
                            <circle 
                                cx={p.x} cy={p.y} r="6" 
                                className={`fill-white stroke-chart-blue stroke-[3px] transition-opacity duration-200 ${hoveredIndex === i ? 'opacity-100' : 'opacity-0'}`}
                            />
                        </g>
                    ))}
                    </svg>

                    {hoveredIndex !== null && chartData.points[hoveredIndex] && (
                    <div 
                        className="absolute top-10 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-xl pointer-events-none z-20"
                        style={{ left: `${(chartData.points[hoveredIndex].x / SVG_WIDTH) * 100}%` }}
                    >
                        <span className="font-bold block">
                            {(chartData.points[hoveredIndex].raw.engagement).toLocaleString()}
                        </span>
                        <span className="text-[9px] text-gray-400 opacity-80">
                            {chartData.points[hoveredIndex].raw.fecha_semana}
                        </span>
                    </div>
                    )}
                </div>
                <div className="flex justify-between pl-8 pr-2 mt-2">
                     {series.map((s, i) => (
                         <span key={i} className="text-[9px] text-gray-400 uppercase font-bold">{s.fecha_semana}</span>
                     ))}
                </div>
            </div>

            <div className="w-[140px] flex flex-col border-l border-gray-100 pl-6 py-2 gap-6 justify-center">
                 
                 <div>
                    <div className="flex items-center gap-1.5 mb-1">
                        <Activity size={12} className="text-chart-blue" />
                        <span className="text-xs font-semibold text-gray-500">Sentimiento</span>
                    </div>
                    <span className="text-2xl font-bold text-gray-900 block">{avgSentiment}%</span>
                    <span className="text-[10px] font-bold text-chart-blue flex items-center bg-chart-blue/10 w-fit px-1.5 py-0.5 rounded-md mt-1">
                        <TrendingUp size={10} className="mr-0.5" /> +19.6%
                    </span>
                 </div>

                 <div>
                    <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-2 h-2 rounded-full bg-chart-blue"></div>
                        <span className="text-xs font-semibold text-gray-500">Total Eng.</span>
                    </div>
                    <span className="text-2xl font-bold text-gray-900 block">{(totalEngagement / 1000).toFixed(1)}k</span>
                    <span className="text-[10px] font-bold text-chart-blue flex items-center bg-chart-blue/10 w-fit px-1.5 py-0.5 rounded-md mt-1">
                        <TrendingUp size={10} className="mr-0.5" /> +2.5%
                    </span>
                 </div>

                 <div className="mt-2 border-t border-gray-50 pt-3 flex-1 flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Top Temas</span>
                    {[...series].reverse().slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex flex-col">
                            <span className="text-[11px] text-gray-700 font-bold truncate" title={item.topico_principal}>{item.topico_principal}</span>
                            <span className="text-[10px] text-gray-400 font-mono">{(item.engagement / 1000).toFixed(1)}k</span>
                        </div>
                    ))}
                 </div>

            </div>

          </div>
        </div>

        {/* --- BACK FACE --- */}
        <div className="absolute inset-0 bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col z-20">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">Detalle Completo</h3>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100">
                        <th className="py-2">Semana</th>
                        <th className="py-2 text-right">Engagement</th>
                     </tr>
                  </thead>
                  <tbody>
                     {series.map((row, idx) => (
                        <tr key={idx} className="border-b border-gray-50 hover:bg-chart-blue/5 transition-colors">
                           <td className="py-3 text-xs font-bold text-gray-700 flex flex-col">
                              {row.fecha_semana}
                              <span className="text-[10px] font-normal text-gray-400">{row.topico_principal}</span>
                           </td>
                           <td className="py-3 text-right text-xs text-gray-600 font-mono">
                              {row.engagement.toLocaleString()}
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
                <span>Tendencia Global:</span>
                <span className={`font-bold ${data.results.resumen_global.tendencia.includes('Deterioro') ? 'text-chart-red' : 'text-chart-green'}`}>
                   {data.results.resumen_global.tendencia}
                </span>
            </div>
        </div>

      </div>
    </div>
  );
};