import React, { useEffect, useRef } from 'react';

interface AnimatedHeaderCardProps {
    supertitle: string;
    title: string;
    subtitle: string;
}

export const AnimatedHeaderCard: React.FC<AnimatedHeaderCardProps> = ({
    supertitle,
    title,
    subtitle
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

        const primaryColor = '#F20F79';
        const secondaryColor = '#E4E4EA';
        const connectionDistance = 100;
        const mouseDistance = 150;
        const particleCount = 80;

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
            baseX: number;
            baseY: number;

            constructor() {
                this.x = Math.random() * canvas!.width;
                this.y = Math.random() * canvas!.height;
                this.baseX = this.x;
                this.baseY = this.y;
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = (Math.random() - 0.5) * 0.5;
                this.size = Math.random() * 2 + 1;
                this.color = Math.random() > 0.85 ? primaryColor : secondaryColor;
            }

            update() {
                // Gentle floating motion
                this.x += this.vx;
                this.y += this.vy;

                // Bounce off edges
                if (this.x < 0 || this.x > canvas!.width) this.vx *= -1;
                if (this.y < 0 || this.y > canvas!.height) this.vy *= -1;

                // Mouse interaction - attract gently
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < mouseDistance) {
                    const force = (mouseDistance - distance) / mouseDistance;
                    const angle = Math.atan2(dy, dx);
                    this.x += Math.cos(angle) * force * 2;
                    this.y += Math.sin(angle) * force * 2;
                }
            }

            draw() {
                if (!ctx) return;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.globalAlpha = 0.6;
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }

        const initParticles = () => {
            particles = [];
            for (let i = 0; i < particleCount; i++) {
                particles.push(new Particle());
            }
        };

        const drawConnections = () => {
            for (let a = 0; a < particles.length; a++) {
                for (let b = a + 1; b < particles.length; b++) {
                    const dx = particles[a].x - particles[b].x;
                    const dy = particles[a].y - particles[b].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < connectionDistance) {
                        const opacity = (1 - distance / connectionDistance) * 0.3;
                        ctx!.beginPath();
                        ctx!.strokeStyle = secondaryColor;
                        ctx!.globalAlpha = opacity;
                        ctx!.lineWidth = 1;
                        ctx!.moveTo(particles[a].x, particles[a].y);
                        ctx!.lineTo(particles[b].x, particles[b].y);
                        ctx!.stroke();
                        ctx!.globalAlpha = 1;
                    }
                }
            }
        };

        const animate = () => {
            ctx!.clearRect(0, 0, canvas.width, canvas.height);

            drawConnections();
            particles.forEach(p => {
                p.update();
                p.draw();
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        const handleMouseMove = (e: MouseEvent) => {
            const rect = container.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        };

        const handleMouseLeave = () => {
            mouse.x = -9999;
            mouse.y = -9999;
        };

        window.addEventListener('resize', resize);
        container.addEventListener('mousemove', handleMouseMove);
        container.addEventListener('mouseleave', handleMouseLeave);

        resize();
        animate();

        return () => {
            window.removeEventListener('resize', resize);
            container.removeEventListener('mousemove', handleMouseMove);
            container.removeEventListener('mouseleave', handleMouseLeave);
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="relative bg-card rounded-[30px] shadow-sm border border-edge py-12 mb-8 overflow-hidden"
        >
            {/* Animation Canvas */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 z-0"
            />

            {/* Glass Overlay */}
            <div className="absolute inset-0 z-10 bg-card/70 backdrop-blur-[2px]" />

            {/* Text Content */}
            <div className="relative z-20 text-center">
                <span className="block text-pink-text font-bold tracking-[0.2em] uppercase text-sm mb-4">
                    {supertitle}
                </span>
                <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tighter mb-4 break-words">
                    {title}
                </h1>
                <p className="text-lg text-text-3 font-light">
                    {subtitle}
                </p>
            </div>
        </div>
    );
};
