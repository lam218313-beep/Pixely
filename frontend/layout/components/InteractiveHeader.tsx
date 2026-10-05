import React, { useEffect, useRef } from 'react';

interface InteractiveHeaderProps {
    title: string;
    subtitle?: string;
    supertitle?: string;
    particleCount?: number;
    colors?: string[]; // [primary, secondary]
}

export const InteractiveHeader: React.FC<InteractiveHeaderProps> = ({
    title,
    subtitle,
    supertitle,
    particleCount = 130,
    colors = ['#F20F79', '#E4E4EA']
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle[] = [];
        let mouse = { x: -9999, y: -9999 };

        const connectionDistance = 120;
        const mouseDistance = 180;

        const resize = () => {
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            initParticles();
        };

        class Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;
            color: string;

            constructor() {
                this.x = Math.random() * canvas!.width;
                this.y = Math.random() * canvas!.height;
                this.vx = (Math.random() - 0.5) * 1.2;
                this.vy = (Math.random() - 0.5) * 1.2;
                this.size = Math.random() * 2.5 + 1;
                this.color = Math.random() > 0.8 ? colors[0] : colors[1];
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                if (this.x < 0 || this.x > canvas!.width) this.vx *= -1;
                if (this.y < 0 || this.y > canvas!.height) this.vy *= -1;

                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < mouseDistance) {
                    const forceDirectionX = dx / distance;
                    const forceDirectionY = dy / distance;
                    const force = (mouseDistance - distance) / mouseDistance;

                    const directionX = forceDirectionX * force * 3;
                    const directionY = forceDirectionY * force * 3;

                    this.x -= directionX;
                    this.y -= directionY;
                }
            }

            draw() {
                if (!ctx) return;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
            }
        }

        const initParticles = () => {
            particles = [];
            for (let i = 0; i < particleCount; i++) {
                particles.push(new Particle());
            }
        };

        const drawStatic = () => {
            if (!ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (let a = 0; a < particles.length; a++) {
                for (let b = a; b < particles.length; b++) {
                    const dx = particles[a].x - particles[b].x;
                    const dy = particles[a].y - particles[b].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < connectionDistance) {
                        const opacity = 1 - distance / connectionDistance;
                        ctx.beginPath();

                        const gradient = ctx.createLinearGradient(particles[a].x, particles[a].y, particles[b].x, particles[b].y);
                        gradient.addColorStop(0, particles[a].color);
                        gradient.addColorStop(1, particles[b].color);

                        ctx.strokeStyle = gradient;
                        ctx.globalAlpha = opacity * 0.4;
                        ctx.lineWidth = 1.5;
                        ctx.moveTo(particles[a].x, particles[a].y);
                        ctx.lineTo(particles[b].x, particles[b].y);
                        ctx.stroke();
                        ctx.globalAlpha = 1;
                    }
                }
            }

            particles.forEach(p => {
                // Removed update() call to keep static
                p.draw();
            });
        };

        const handleMouseMove = (e: MouseEvent) => {
            // Interaction removed for static request
        };

        const handleMouseLeave = () => {
            // Interaction removed
        }

        window.addEventListener('resize', resize);
        // container.addEventListener('mousemove', handleMouseMove);
        // container.addEventListener('mouseleave', handleMouseLeave);

        resize();
        drawStatic(); // Call once instead of animate loop

        return () => {
            window.removeEventListener('resize', resize);
            // container.removeEventListener('mousemove', handleMouseMove);
            // container.removeEventListener('mouseleave', handleMouseLeave);
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [colors, particleCount]);

    return (
        <div
            ref={containerRef}
            className="relative w-full h-[280px] rounded-[40px] overflow-hidden mb-12 shrink-0"
        >
            <canvas
                ref={canvasRef}
                className="absolute inset-0 z-0 opacity-80"
            />

            <div className="absolute inset-0 z-10 flex flex-col justify-center items-center text-center px-8 pointer-events-none">
                <div className="relative">
                    <div className="absolute -inset-10 bg-card/40 blur-[80px] rounded-full -z-10"></div>

                    {supertitle && (
                        <span className="block text-pink-text font-bold tracking-[0.2em] uppercase text-sm mb-4 animate-fade-in">
                            {supertitle}
                        </span>
                    )}

                    <h1 className="text-7xl md:text-9xl font-extrabold text-white tracking-tighter drop-shadow-sm mb-2">
                        {title}
                    </h1>

                    {subtitle && (
                        <div className="flex items-center gap-4 justify-center">
                            {!supertitle && <div className="h-0.5 w-12 bg-pink-fill rounded-full"></div>}
                            <p className="text-xl md:text-2xl text-text-3 font-light tracking-wide max-w-2xl">
                                {subtitle}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
