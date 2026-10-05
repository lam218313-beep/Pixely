import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Volume2, VolumeX, Play, Pause, Sparkles, Users, Palette, BarChart3, Target, ListChecks, TrendingUp, Check } from 'lucide-react';

interface TutorialSlide {
    title: string;
    description: string;
    icon: any;
    audioUrl?: string;
    duration?: number;
}

interface TutorialModalProps {
    isOpen: boolean;
    onClose: () => void;
    slides: TutorialSlide[];
}

// Premium Icon Graphic Component with Pixely corporate colors
const SlideGraphic: React.FC<{ Icon: any; isActive: boolean; slideIndex: number }> = ({ Icon, isActive, slideIndex }) => {
    // Pixely corporate magenta/pink gradient (rgb(242, 15, 121))
    const pixelyGradient = 'from-pink-500 via-rose-500 to-pink-600';

    return (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            {/* Animated gradient orbs - glassmorphism style with Pixely colors */}
            <motion.div
                animate={{
                    scale: isActive ? [1, 1.3, 1] : 1,
                    opacity: isActive ? [0.15, 0.25, 0.15] : 0.15,
                    rotate: [0, 180, 360]
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className={`absolute w-96 h-96 rounded-full bg-gradient-to-br ${pixelyGradient} blur-3xl`}
            />
            <motion.div
                animate={{
                    scale: isActive ? [1, 1.2, 1] : 1,
                    opacity: isActive ? [0.1, 0.2, 0.1] : 0.1,
                    rotate: [360, 180, 0]
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear", delay: 0.5 }}
                className={`absolute w-80 h-80 rounded-full bg-gradient-to-tr ${pixelyGradient} blur-3xl`}
            />

            {/* Main Icon with glassmorphism container */}
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10"
            >
                <div className="relative">
                    {/* Icon glassmorphism card */}
                    <motion.div
                        animate={{
                            y: isActive ? [0, -8, 0] : 0,
                        }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="relative bg-white/20 backdrop-blur-xl rounded-[32px] p-12 border-2 border-edge/30"
                        style={{
                            boxShadow: '0 20px 60px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.6)',
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.1))'
                        }}
                    >
                        <div className="relative">
                            {/* Icon glow with Pixely colors */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${pixelyGradient} rounded-2xl blur-xl opacity-50`} />

                            {/* Icon */}
                            <Icon size={100} className="relative text-white drop-shadow-2xl" strokeWidth={1.5} />
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
};

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose, slides }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(0);
            setIsPlaying(true);
        } else {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const currentSlide = slides[currentIndex];

        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = currentSlide.audioUrl || '';
            if (currentSlide.audioUrl && isPlaying) {
                audioRef.current.play().catch(e => console.log("Audio play failed:", e));
            }
        }
    }, [currentIndex, isOpen, isPlaying, slides]);

    const handleNext = () => {
        if (currentIndex < slides.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setIsPlaying(true);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setIsPlaying(true);
        }
    };

    const toggleAudio = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const toggleMute = () => {
        if (audioRef.current) {
            audioRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop with subtle gradient */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-gradient-to-br from-ink/40 via-ink/30 to-ink/40 backdrop-blur-md"
                    />

                    {/* Premium Glassmorphism Modal Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="relative w-full max-w-5xl flex flex-col md:flex-row h-auto md:h-[560px] rounded-[40px] overflow-hidden"
                        style={{
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85))',
                            backdropFilter: 'blur(40px)',
                            boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255,255,255,0.8) inset',
                            border: '2px solid rgba(255,255,255,0.5)'
                        }}
                    >
                        {/* Left Panel - Graphic Section with premium glassmorphism */}
                        <div
                            className="relative w-full md:w-[45%] h-[320px] md:h-full flex items-center justify-center overflow-hidden"
                            style={{
                                background: 'linear-gradient(135deg, rgba(245,248,255,0.8), rgba(237,242,255,0.6))',
                            }}
                        >
                            {/* Subtle grid pattern overlay */}
                            <div className="absolute inset-0 opacity-[0.03]" style={{
                                backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(0,0,0) 1px, transparent 0)',
                                backgroundSize: '24px 24px'
                            }} />

                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentIndex}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.5 }}
                                    className="absolute inset-0"
                                >
                                    <SlideGraphic
                                        Icon={slides[currentIndex].icon}
                                        isActive={isOpen}
                                        slideIndex={currentIndex}
                                    />
                                </motion.div>
                            </AnimatePresence>

                            {/* Premium Audio Visualizer */}
                            {isPlaying && !isMuted && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="absolute bottom-7 left-7 flex gap-2 items-end h-14 px-4 py-3 rounded-2xl"
                                    style={{
                                        background: 'rgba(255,255,255,0.35)',
                                        backdropFilter: 'blur(20px)',
                                        border: '1.5px solid rgba(255,255,255,0.5)',
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)'
                                    }}
                                >
                                    {[1, 2, 3, 4, 5, 4, 3, 2].map((i, idx) => (
                                        <motion.div
                                            key={idx}
                                            animate={{ height: [12, 18 + i * 4, 12] }}
                                            transition={{ repeat: Infinity, duration: 0.5 + idx * 0.07 }}
                                            className="w-1.5 rounded-full bg-gradient-to-t from-pink-600 via-rose-500 to-pink-400"
                                        />
                                    ))}
                                </motion.div>
                            )}
                        </div>

                        {/* Right Panel - Content Section with glassmorphism */}
                        <div className="flex-1 flex flex-col relative">
                            {/* Modern Premium Header */}
                            <div
                                className="px-10 md:px-12 py-6 border-b border-edge/40"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(255,255,255,0.6), rgba(255,255,255,0.4))',
                                    backdropFilter: 'blur(10px)'
                                }}
                            >
                                <div className="flex items-center justify-between">
                                    {/* Logo/Brand */}
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                                            style={{
                                                background: 'linear-gradient(135deg, #EB0C6E, #EB0C6E)',
                                                boxShadow: '0 4px 12px rgba(236, 72, 153, 0.3)'
                                            }}
                                        >
                                            <Sparkles size={20} className="text-white" strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-white">Pixely Partners</h3>
                                            <p className="text-xs text-text-3 font-medium">Tutorial Interactivo</p>
                                        </div>
                                    </div>

                                    {/* Slide Counter */}
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="px-4 py-2 rounded-xl text-sm font-bold text-text-2"
                                            style={{
                                                background: 'rgba(255,255,255,0.5)',
                                                border: '1.5px solid rgba(255,255,255,0.8)'
                                            }}
                                        >
                                            <span className="text-pink-text">{currentIndex + 1}</span>
                                            <span className="text-text-3 mx-1">/</span>
                                            <span className="text-text-3">{slides.length}</span>
                                        </div>

                                        {/* Close Button */}
                                        <button
                                            onClick={onClose}
                                            className="p-2.5 rounded-xl text-text-3 hover:text-white transition-all"
                                            style={{
                                                background: 'rgba(255,255,255,0.5)',
                                                border: '1.5px solid rgba(255,255,255,0.7)'
                                            }}
                                        >
                                            <X size={18} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Text Content */}
                            <div className="flex-1 flex flex-col justify-center p-10 md:p-12 pr-6">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentIndex}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-ink via-ink to-ink mb-6 leading-tight tracking-tight">
                                            {slides[currentIndex].title}
                                        </h2>
                                        <p className="text-text-2 text-lg md:text-xl leading-relaxed font-medium">
                                            {slides[currentIndex].description}
                                        </p>
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {/* Controls - Premium glassmorphism */}
                            <div className="mt-10 flex items-center justify-between">
                                {/* Audio Controls */}
                                <div className="flex items-center gap-2.5">
                                    <button
                                        onClick={toggleAudio}
                                        className="p-3 rounded-full text-text-2 hover:text-text-2 transition-all"
                                        style={{
                                            background: 'rgba(255,255,255,0.5)',
                                            backdropFilter: 'blur(10px)',
                                            border: '1.5px solid rgba(255,255,255,0.7)'
                                        }}
                                        title={isPlaying ? "Pausar" : "Reproducir"}
                                    >
                                        {isPlaying ? <Pause size={18} strokeWidth={2.5} /> : <Play size={18} strokeWidth={2.5} />}
                                    </button>
                                    <button
                                        onClick={toggleMute}
                                        className="p-3 rounded-full text-text-2 hover:text-text-2 transition-all"
                                        style={{
                                            background: 'rgba(255,255,255,0.5)',
                                            backdropFilter: 'blur(10px)',
                                            border: '1.5px solid rgba(255,255,255,0.7)'
                                        }}
                                        title={isMuted ? "Activar" : "Silenciar"}
                                    >
                                        {isMuted ? <VolumeX size={18} strokeWidth={2.5} /> : <Volume2 size={18} strokeWidth={2.5} />}
                                    </button>
                                </div>

                                {/* Navigation */}
                                <div className="flex items-center gap-4">
                                    {/* Progress Dots */}
                                    <div className="flex gap-2.5 mr-3">
                                        {slides.map((_, idx) => (
                                            <div
                                                key={idx}
                                                className={`h-2 rounded-full transition-all duration-500 ${idx === currentIndex
                                                    ? 'w-10 bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500'
                                                    : 'w-2 bg-line/60'
                                                    }`}
                                            />
                                        ))}
                                    </div>

                                    <button
                                        onClick={handlePrev}
                                        disabled={currentIndex === 0}
                                        className={`p-3.5 rounded-full transition-all ${currentIndex === 0
                                            ? 'text-mute cursor-not-allowed'
                                            : 'text-text-2 hover:text-pink-text'
                                            }`}
                                        style={{
                                            background: currentIndex === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.5)',
                                            backdropFilter: 'blur(10px)',
                                            border: `1.5px solid ${currentIndex === 0 ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.7)'}`
                                        }}
                                    >
                                        <ChevronLeft size={20} strokeWidth={2.5} />
                                    </button>

                                    <button
                                        onClick={handleNext}
                                        className="flex items-center gap-2.5 px-8 py-4 text-white font-bold rounded-2xl transition-all shadow-xl group"
                                        style={{
                                            background: 'linear-gradient(135deg, #EB0C6E 0%, #EB0C6E 100%)',
                                            boxShadow: '0 10px 40px rgba(236, 72, 153, 0.4), inset 0 1px 0 rgba(255,255,255,0.3)'
                                        }}
                                    >
                                        <span className="text-base">{currentIndex === slides.length - 1 ? 'Empezar' : 'Siguiente'}</span>
                                        {currentIndex < slides.length - 1 && (
                                            <ChevronRight size={20} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Hidden Audio Element */}
                    <audio ref={audioRef} onEnded={() => setIsPlaying(false)} className="hidden" />
                </div>
            )}
        </AnimatePresence>
    );
};
