import React, { useState } from 'react';
import { Brain, Cpu, Fingerprint, Target, Radar, Megaphone, ListTodo, Calendar, ArrowRight } from 'lucide-react';

interface CardData {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  gridClass: string;
  hoverClass: string;
}

const cards: CardData[] = [
  {
    id: 1,
    title: "Inteligencia de Mercado",
    description: "No adivinamos: estudiamos tu mercado. Mapeamos a tu competencia, sus precios, sus promociones y su tráfico real, y lo vigilamos cada mes para saber qué cambia antes que nadie.",
    icon: <Brain className="w-8 h-8 md:w-10 md:h-10 text-primary-500" />,
    gridClass: "md:col-span-2 md:row-span-1",
    hoverClass: "md:group-hover:h-[calc(200%+1rem)]"
  },
  {
    id: 2,
    title: "Tecnología",
    description: "Combinamos inteligencia artificial con criterio humano: cada estudio, plan y pieza se trabaja a mano, con fuentes verificadas y sin automatización ciega. Tu mercado no se entiende solo con datos.",
    icon: <Cpu className="w-8 h-8 md:w-10 md:h-10 text-blue-500" />,
    gridClass: "md:col-span-1 md:row-span-2",
    hoverClass: "md:group-hover:w-[calc(200%+1rem)]"
  },
  {
    id: 3,
    title: "Muéstrate",
    description: "Definimos cómo habla tu marca —su tono, las palabras que usa y las que evita— y tú la apruebas. Cada publicación sale con esa voz.",
    icon: <Fingerprint className="w-8 h-8 md:w-10 md:h-10 text-purple-500" />,
    gridClass: "md:col-span-1 md:row-span-1",
    hoverClass: "md:group-hover:h-[calc(200%+1rem)]"
  },
  {
    id: 4,
    title: "Acierta",
    description: "Elimina la subjetividad. Cada idea de contenido nace de un hallazgo real de tu mercado, con su nivel de confianza.",
    icon: <Target className="w-8 h-8 md:w-10 md:h-10 text-teal-500" />,
    gridClass: "md:col-span-1 md:row-span-1",
    hoverClass: "md:group-hover:w-[calc(200%+1rem)]"
  },
  {
    id: 5,
    title: "Anticipa",
    description: "Vigilamos a tu competencia cada mes: si un rival lanza una promoción o empieza a pagar anuncios, lo sabrás a tiempo.",
    icon: <Radar className="w-8 h-8 md:w-10 md:h-10 text-indigo-500" />,
    gridClass: "md:col-span-1 md:row-span-1",
    hoverClass: "md:group-hover:w-[calc(200%+1rem)] md:group-hover:-ml-[calc(100%+1rem)]"
  },
  {
    id: 6,
    title: "Destaca",
    description: "Conoces las promociones que ya usa tu competencia y la vara de calidad de tu mercado, para que tu marca no sea una más.",
    icon: <Megaphone className="w-8 h-8 md:w-10 md:h-10 text-yellow-500" />,
    gridClass: "md:col-span-1 md:row-span-1",
    hoverClass: "md:group-hover:h-[calc(200%+1rem)] md:group-hover:-mt-[calc(100%+1rem)]"
  },
  {
    id: 7,
    title: "Apruebas tú",
    description: "Ves cada pieza antes de que salga: apruebas o pides cambios con un comentario, y el equipo la corrige. Nada se publica sin tu visto bueno.",
    icon: <ListTodo className="w-8 h-8 md:w-10 md:h-10 text-cyan-500" />,
    gridClass: "md:col-span-2 md:row-span-1",
    hoverClass: "md:group-hover:w-[calc(200%+1rem)]"
  },
  {
    id: 8,
    title: "30 días",
    description: "Cada mes: plan, producción, tu revisión y publicación programada. Todo lo publicado queda archivado en tu Repositorio, mes a mes.",
    icon: <Calendar className="w-8 h-8 md:w-10 md:h-10 text-rose-500" />,
    gridClass: "md:col-span-2 md:row-span-1",
    hoverClass: "md:group-hover:w-[calc(200%+1rem)] md:group-hover:-ml-[calc(100%+1rem)]"
  }
];

const TetrisCards: React.FC = () => {
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full auto-rows-[220px] relative isolate">
      {cards.map((card) => {
        const isHovered = hoveredId === card.id;
        const isBlurred = hoveredId !== null && hoveredId !== card.id;

        return (
          <div
            key={card.id}
            className={`
              relative group 
              ${card.gridClass}
              ${isHovered ? 'z-50' : 'z-0'}
            `}
            onMouseEnter={() => setHoveredId(card.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div
              className={`
                absolute inset-0 
                bg-white rounded-[30px] shadow-sm border border-gray-100
                flex flex-col justify-between overflow-hidden
                transition-all duration-700 ease-[cubic-bezier(0.2,0,0.2,1)]
                cursor-pointer
                ${isHovered ? `shadow-2xl border-primary-100 ${card.hoverClass}` : ''}
                ${isBlurred ? 'blur-[2px] opacity-60 scale-[0.98] grayscale-[0.2]' : ''}
              `}
            >
              <div className="p-6 md:p-8 h-full flex flex-col relative z-20">
                {/* Header Section */}
                <div className="flex flex-col items-start space-y-4 mb-4">
                  <div className={`
                      p-3 rounded-2xl bg-gray-50 transition-all duration-500 
                      origin-left
                      ${isHovered ? 'bg-primary-50 scale-105' : ''}
                    `}>
                    {card.icon}
                  </div>
                  <h3 className={`
                      text-xl md:text-2xl font-bold text-gray-900 leading-tight transition-transform duration-500
                      ${isHovered ? 'translate-y-0' : ''}
                    `}>
                    {card.title}
                  </h3>
                </div>

                {/* Content Section - Revealed nicely on expand */}
                <div className={`
                    mt-auto flex flex-col space-y-4 transition-all duration-700 delay-100
                    ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                  `}>
                  <p className="text-gray-600 text-base leading-relaxed">
                    {card.description}
                  </p>

                </div>
              </div>

              {/* Background Decor - Only visible on hover */}
              <div className={`
                absolute -right-16 -bottom-16 w-64 h-64 bg-gradient-to-tl from-primary-100/40 to-transparent rounded-full 
                transition-opacity duration-700 pointer-events-none z-10
                ${isHovered ? 'opacity-100' : 'opacity-0'}
              `}></div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TetrisCards;
