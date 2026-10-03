import React, { useState, useEffect } from 'react';
import { Zap, Sparkles, Users, Palette, BarChart3, Target, ListChecks, Check } from 'lucide-react';
import OrbitalHero from './OrbitalHero';
import TetrisCards from './TetrisCards';
import { TutorialModal } from './TutorialModal';

interface PartnersViewProps {
  onShowTutorial?: () => void;
}

const TUTORIAL_SLIDES = [
  {
    title: "Tu Socio Estratégico",
    description: "Descubre cómo nuestra agencia transforma datos en decisiones. Tecnología al servicio de tu crecimiento.",
    icon: Sparkles,
    audioUrl: "/assets/audio/tutorial_step1_intro.mp3"
  },
  {
    title: "Conociendo Tu Negocio",
    description: "Profundizamos en tu marca, productos, precios y público objetivo para construir estrategias personalizadas.",
    icon: Users,
    audioUrl: "/assets/audio/tutorial_step2_interview.mp3"
  },
  {
    title: "Identidad Visual Coherente",
    description: "Tu marca necesita un diseño que comunique tus valores. Creamos manuales que garantizan consistencia en cada pieza.",
    icon: Palette,
    audioUrl: "/assets/audio/tutorial_step3_brand.mp3"
  },
  {
    title: "Conocemos tu Mercado",
    description: "Estudiamos a tu competencia, sus precios y promociones, y la vigilamos cada mes para encontrar oportunidades reales.",
    icon: BarChart3,
    audioUrl: "/assets/audio/tutorial_step4_analysis.mp3"
  },
  {
    title: "Estrategias Basadas en Evidencia",
    description: "Con el panorama claro, diseñamos tácticas sin margen de error. Cada decisión respaldada por data real.",
    icon: Target,
    audioUrl: "/assets/audio/tutorial_step5_strategy.mp3"
  },
  {
    title: "De la Idea a la Acción",
    description: "Sigue cada pieza del mes en una sola línea: en producción, en tu revisión, programada y publicada. Apruebas con un click y sin caos.",
    icon: ListChecks,
    audioUrl: "/assets/audio/tutorial_step6_planning.mp3"
  },
  {
    title: "Comencemos Tu Historia",
    description: "El próximo paso es simple: la entrevista inicial. Desde ahí, construimos juntos tu camino al éxito.",
    icon: Check,
    audioUrl: "/assets/audio/tutorial_step8_closing.mp3"
  }
];

const PartnersView: React.FC<PartnersViewProps> = ({ onShowTutorial }) => {
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  // Auto-open tutorial for new users
  useEffect(() => {
    const hasSeen = localStorage.getItem('pixely_partners_tutorial_seen');
    if (!hasSeen) {
      // Small delay for better UX on entry
      const timer = setTimeout(() => {
        setIsTutorialOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleOpenTutorial = () => {
    setIsTutorialOpen(true);
  };

  const handleCloseTutorial = () => {
    setIsTutorialOpen(false);
    localStorage.setItem('pixely_partners_tutorial_seen', 'true');
  };

  return (
    <div className="col-span-12 flex flex-col items-center pb-10 overflow-x-hidden bg-brand-bg relative">

      {/* Tutorial Modal */}
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={handleCloseTutorial}
        slides={TUTORIAL_SLIDES}
      />

      {/* Header Text - Enhanced Typography */}
      <div className="text-center pt-10 pb-12 px-4 z-10 animate-fade-in-up max-w-4xl mx-auto">
        <span className="text-primary-600 font-bold tracking-[0.2em] uppercase text-sm md:text-base mb-4 block">
          Pixely Partners
        </span>
        <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-8 leading-tight tracking-tight">
          Tecnología y Partners <br className="hidden lg:block" /> con Pixely
        </h1>
        <p className="max-w-3xl mx-auto text-gray-500 text-xl md:text-2xl leading-relaxed font-light mb-8">
          No somos una herramienta pasiva; somos una alianza bilateral donde nuestra tecnología diagnostica, valida tu mercado y minimiza la incertidumbre en tus decisiones.
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={handleOpenTutorial}
            className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-bold shadow-lg shadow-white/10 hover:shadow-xl hover:scale-105 transition-all flex items-center gap-3 border border-slate-200"
          >
            <Zap size={20} className="text-yellow-500 fill-yellow-500" /> Ver Tutorial
          </button>
        </div>
      </div>

      {/* Hero Section - Orbital System */}
      <div className="w-full flex justify-center mb-16 relative overflow-hidden">
        {/* Gradient Fade for seamless integration */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-brand-bg to-transparent z-40 pointer-events-none"></div>
        <OrbitalHero />
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-brand-bg to-transparent z-40 pointer-events-none"></div>
      </div>

      {/* Bottom Section - Tetris/Bento Grid */}
      <div className="w-full max-w-7xl px-4 md:px-8 z-20">
        <div className="mb-10 flex items-center space-x-4">
          <div className="h-12 w-1 bg-primary-500 rounded-full"></div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Capacidades</h2>
        </div>
        <TetrisCards />
      </div>

    </div>
  );
};

export default PartnersView;
