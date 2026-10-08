import React, { useEffect, useRef } from 'react';
import { MODE_DRAWS, resolvePreset } from 'thinking-orbs/engine';

type OrbState = 'working' | 'searching' | 'solving' | 'listening' | 'connecting' | 'weaving' | 'composing' | 'breathing' | 'shaping';

/**
 * Orbe de puntos que "piensa" (thinking-orbs, MIT) para las esperas. Toma el color del texto
 * (`currentColor`), así que se pinta con clases como `text-pink`. Tamaños afinados: 64 y 20.
 */
export const ThinkingOrb: React.FC<{ state?: OrbState; size?: 64 | 20; className?: string }> = ({ state = 'working', size = 64, className = '' }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = canvas.height = Math.round(size * dpr);
    const tint = getComputedStyle(canvas).color;
    const { mode, speed, opts } = resolvePreset(state, size);
    const draw = MODE_DRAWS[mode];

    const frame = (t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, size, size);
      draw(ctx, size, t, true, opts);
      draw(ctx, size, t, true, opts); // doble pasada: los colores oscuros de marca se perderían sobre negro
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, size, size);
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { frame(0.6); return; }

    let raf = 0;
    const loop = () => { frame((performance.now() / 1000) * speed); raf = requestAnimationFrame(loop); };
    // Solo se anima mientras se ve
    const io = new IntersectionObserver(([e]) => { cancelAnimationFrame(raf); if (e.isIntersecting) raf = requestAnimationFrame(loop); });
    io.observe(canvas);
    frame(0);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [state, size]);

  return <canvas ref={ref} aria-hidden className={`block ${className}`} style={{ width: size, height: size }} />;
};
