import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mail, Lock, ArrowRight, Eye, EyeOff, Loader2, AlertCircle, Database, Target, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import pixelyLogo from '../src/assets/logo.png';

// --- 1. Interactive Workflow Card ---
export const WorkflowVisual: React.FC = () => {
    const [rotation, setRotation] = useState({ x: 0, y: 0 });
    const cardRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Calculate tilt
        const rotateX = ((y - centerY) / centerY) * -8;
        const rotateY = ((x - centerX) / centerX) * 8;
        setRotation({ x: rotateX, y: rotateY });
    }, []);

    const handleMouseLeave = () => setRotation({ x: 0, y: 0 });

    return (
        <div
            className="w-full max-w-md aspect-square [perspective:1000px]"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <div
                ref={cardRef}
                className="w-full h-full relative transition-all duration-200 ease-out [transform-style:preserve-3d]"
                style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` }}
            >
                {/* Base Card */}
                <div className="absolute inset-0 bg-card/40 backdrop-blur-md rounded-[40px] border border-edge/50 shadow-xl [transform:translateZ(0px)]"></div>

                {/* Decorative Grid Background inside card */}
                <div className="absolute inset-4 rounded-[32px] overflow-hidden opacity-30">
                    <div className="w-full h-full" style={{
                        backgroundImage: 'radial-gradient(#F20F79 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                    }}></div>
                </div>

                {/* Node 1: Data Ingestion */}
                <div className="absolute top-1/4 left-1/4 bg-card p-4 rounded-2xl shadow-lg border border-edge flex items-center gap-3 [transform:translateZ(40px)] transition-transform duration-500">
                    <div className="p-2 bg-raised rounded-xl text-text-3"><Database size={20} /></div>
                    <div>
                        <div className="h-2 w-16 bg-edge rounded-full mb-1"></div>
                        <div className="h-1.5 w-10 bg-raised rounded-full"></div>
                    </div>
                </div>

                {/* Connecting Line 1 (SVG) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none [transform:translateZ(20px)]">
                    <path d="M 160 140 C 160 180, 240 180, 240 220" fill="none" stroke="#F20F79" strokeWidth="2" strokeDasharray="6 4" className="opacity-40" />
                </svg>

                {/* Node 2: market intelligence (illustrative, no figures) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 [transform:translateZ(60px)] z-10 w-48">
                    <MarketMini />
                </div>

                {/* Connecting Line 2 */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none [transform:translateZ(20px)]">
                    <path d="M 240 280 C 240 320, 140 320, 140 360" fill="none" stroke="#F20F79" strokeWidth="2" strokeDasharray="6 4" className="opacity-40" />
                    <path d="M 240 280 C 240 320, 340 320, 340 360" fill="none" stroke="#33333C" strokeWidth="2" strokeDasharray="6 4" className="opacity-40" />
                </svg>

                {/* Node 3: Strategy */}
                <div className="absolute bottom-1/4 left-[15%] bg-card p-3 rounded-2xl shadow-lg border border-line flex items-center gap-3 [transform:translateZ(40px)]">
                    <div className="p-2 bg-raised rounded-xl text-text-2"><Target size={18} /></div>
                    <div className="text-xs font-bold text-text-2">Estrategia</div>
                </div>

                {/* Node 4: Insights */}
                <div className="absolute bottom-1/4 right-[15%] bg-card p-3 rounded-2xl shadow-sm border border-edge opacity-60 flex items-center gap-3 [transform:translateZ(30px)]">
                    <div className="p-2 bg-raised rounded-xl text-text-3"><Sparkles size={18} /></div>
                </div>

            </div>
        </div>
    );
};

/** Decorative mini card for the login illustration: the three content pillars Mercado tracks. */
const MarketMini: React.FC = () => {
    const pilares = [
        { label: 'Problema', color: '#D90B66', share: 0.38 },
        { label: 'Identidad', color: '#E4E4EA', share: 0.25 },
        { label: 'Prueba', color: '#8A8A96', share: 0.37 },
    ];
    const R = 30;
    const C = 2 * Math.PI * R;
    let offset = 0;
    return (
        <div className="bg-card rounded-2xl border border-pink shadow-xl shadow-primary-500/20 p-4">
            <p className="text-[11px] font-bold text-white mb-0.5">Inteligencia de mercado</p>
            <p className="text-[10px] text-text-3 mb-3">Tu mercado, en 3 pilares</p>
            <div className="flex items-center gap-3">
                <svg width="72" height="72" viewBox="0 0 80 80" className="-rotate-90 shrink-0" aria-hidden="true">
                    {pilares.map((p) => {
                        const len = p.share * C;
                        const seg = <circle key={p.label} cx="40" cy="40" r={R} fill="none" stroke={p.color} strokeWidth={10} strokeDasharray={`${len - 2} ${C}`} strokeDashoffset={-offset} />;
                        offset += len;
                        return seg;
                    })}
                </svg>
                <ul className="space-y-1">
                    {pilares.map((p) => (
                        <li key={p.label} className="flex items-center gap-1.5 text-[10px] font-semibold text-text-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />{p.label}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

// --- 2. Login Form with Progress Bar ---
interface LoginFormProps {
    onLogin: (email: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
    const { login, error: authError, clearError, isLoading: authLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [localError, setLocalError] = useState<string | null>(null);

    // Clear errors when user types
    useEffect(() => {
        if (authError) clearError();
        if (localError) setLocalError(null);
    }, [email, password]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading || authLoading) return;

        setIsLoading(true);
        setProgress(0);
        setLocalError(null);

        // Start progress animation
        const progressInterval = setInterval(() => {
            setProgress(prev => Math.min(prev + 5, 90)); // Max 90% until actual response
        }, 50);

        try {
            await login(email, password);

            // Complete progress animation
            clearInterval(progressInterval);
            setProgress(100);

            // Delay for visual feedback then call onLogin
            setTimeout(() => {
                onLogin(email.split('@')[0]);
            }, 300);
        } catch (err: any) {
            clearInterval(progressInterval);
            setProgress(0);
            setLocalError(err.message || 'Error de autenticación');
        } finally {
            setIsLoading(false);
        }
    };

    const displayError = localError || authError;

    return (
        <div className="w-full max-w-sm mx-auto animate-fade-in-up scale-[0.85] origin-center flex flex-col justify-center min-h-[500px]">
            <div className="mb-2 text-left">
                <div className="w-32 h-32 rounded-3xl flex items-center justify-center mb-4 overflow-hidden">
                    <img src={pixelyLogo} alt="Pixely Logo" className="w-full h-full object-contain" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">Bienvenido!</h1>
                <p className="text-text-3 text-sm">Ingresa tus credenciales para acceder a tu workspace.</p>
            </div>

            {/* Error Display */}
            {displayError && (
                <div className="mb-4 p-3 bg-raised border border-pink/40 rounded-xl flex items-center gap-2 text-pink-text text-sm animate-fade-in">
                    <AlertCircle size={16} />
                    <span>{displayError}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-2 ml-1">Email</label>
                    <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-3 group-focus-within:text-pink-text transition-colors" size={18} />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={`w-full bg-raised border text-white text-sm rounded-xl focus:ring-2 focus:ring-pink focus:border-pink block w-full pl-11 p-3.5 outline-none transition-all ${displayError ? 'border-pink/40' : 'border-edge'}`}
                            placeholder="tu@email.com"
                            required
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="flex justify-between items-center ml-1">
                        <label className="text-xs font-bold text-text-2">Contraseña</label>
                        <a href="#" className="text-xs text-pink-text hover:text-pink-text font-bold">¿Olvidaste?</a>
                    </div>
                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-3 group-focus-within:text-pink-text transition-colors" size={18} />
                        <input
                            type={showPass ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`w-full bg-raised border text-white text-sm rounded-xl focus:ring-2 focus:ring-pink focus:border-pink block w-full pl-11 pr-11 p-3.5 outline-none transition-all ${displayError ? 'border-pink/40' : 'border-edge'}`}
                            placeholder="••••••••"
                            required
                            disabled={isLoading}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPass(!showPass)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-text-3 hover:text-text-2"
                        >
                            {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <div className="flex items-center pt-2">
                    <input id="remember-me" type="checkbox" className="w-4 h-4 text-pink-text bg-raised border-line rounded focus:ring-pink focus:ring-2" />
                    <label htmlFor="remember-me" className="ml-2 text-sm font-medium text-text-3">Recordarme</label>
                </div>

                {/* Progress Button */}
                <button
                    type="submit"
                    disabled={isLoading}
                    className="relative w-full h-[56px] overflow-hidden rounded-xl bg-raised text-white font-bold text-sm shadow-xl shadow-black/10 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-wait"
                >
                    {/* Background Progress Fill */}
                    <div
                        className="absolute inset-0 bg-pink-fill transition-all ease-linear"
                        style={{ width: `${progress}%` }}
                    ></div>

                    {/* Content Layer */}
                    <div className="relative z-10 flex items-center justify-center gap-2 w-full h-full">
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <span className="uppercase tracking-widest text-xs">Autenticando</span>
                                <span className="font-mono text-xs">{Math.round(progress)}%</span>
                            </span>
                        ) : (
                            <>Ingresar <ArrowRight size={18} /></>
                        )}
                    </div>
                </button>
            </form>

            <div className="mt-8">
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-edge"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-card text-text-3 text-xs">O continúa con</span>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                    <button type="button" disabled className="flex items-center justify-center gap-2 bg-card border border-edge rounded-xl py-2.5 text-sm font-bold text-text-3 cursor-not-allowed opacity-50">
                        <span className="text-lg">G</span> Google
                    </button>
                    <button type="button" disabled className="flex items-center justify-center gap-2 bg-card border border-edge rounded-xl py-2.5 text-sm font-bold text-text-3 cursor-not-allowed opacity-50">
                        <span className="text-lg"></span> Apple
                    </button>
                </div>

                <p className="mt-8 text-center text-sm text-text-3">
                    ¿No tienes cuenta? <a href="https://wa.me/51949268607" target="_blank" rel="noopener noreferrer" className="font-bold text-pink-text hover:underline">Contacta a Pixely</a>
                </p>
            </div>
        </div>
    );
};

// --- 3. Success Animation with Solid Background and Spinning Check ---
export const SuccessAnimation: React.FC<{ username: string; isExiting: boolean }> = ({ username, isExiting }) => {
    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden transition-all duration-1000 ease-in-out bg-pink-fill ${isExiting ? 'opacity-0 scale-105 filter blur-sm' : 'opacity-100 scale-100'
                }`}
        >
            {/* Background is handled by the container class 'bg-pink-fill' */}

            {/* Radial Vignette for slight depth */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.15)_100%)]"></div>

            {/* Content Container */}
            <div className="relative z-10 text-center flex flex-col items-center justify-center p-8">

                {/* Large Spinning Check Icon Container (Circle) */}
                <div className="mb-12 relative">
                    <div className="absolute inset-0 bg-card blur-[80px] opacity-20 rounded-full animate-pulse"></div>
                    {/* Increased size w-56 h-56 and rounded-full */}
                    <div className="relative w-56 h-56 bg-white/10 backdrop-blur-xl border border-edge rounded-full flex items-center justify-center shadow-2xl animate-rotate-in">
                        <svg className="w-28 h-28 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                                className="animate-draw"
                            />
                        </svg>
                    </div>
                </div>

                {/* Typography */}
                <div className="space-y-4">
                    <p className="text-2xl md:text-3xl text-white/80 font-medium tracking-wide animate-[fade-in_0.8s_ease-out_0.2s_both]">
                        Bienvenido a
                    </p>
                    <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter animate-[fade-in_0.8s_ease-out_0.4s_both] drop-shadow-sm">
                        Pixely Partners
                    </h2>
                    <div className="h-1.5 w-24 bg-white/30 rounded-full mx-auto my-6 animate-[scale-up-center_0.8s_ease-out_0.6s_both]"></div>
                    <p className="text-3xl md:text-4xl text-white font-light tracking-wide animate-[fade-in_0.8s_ease-out_0.8s_both]">
                        @{username}
                    </p>
                </div>

                {/* Status Pill */}
                <div className="mt-14 animate-[fade-in_1s_ease-out_1s_both]">
                    <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 border border-edge rounded-full backdrop-blur-md shadow-lg">
                        <Loader2 size={16} className="text-white animate-spin" />
                        <span className="text-xs font-bold text-white uppercase tracking-widest">Iniciando Dashboard</span>
                    </div>
                </div>
            </div>
        </div>
    );
};