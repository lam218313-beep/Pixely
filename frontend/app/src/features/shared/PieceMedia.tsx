import React, { useRef, useState } from 'react';
import { isVideo } from '@/lib/content';

/** The finished piece: one image, a carousel (swipe sideways) or the Reel video. */
export const PieceMedia: React.FC<{ urls: string[]; className?: string; rounded?: string; interactive?: boolean }> = ({ urls, className = '', rounded = '', interactive = true }) => {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  if (urls.length === 0) return <div className={`bg-raised ${rounded} ${className}`} />;
  const onScroll = () => {
    const el = track.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };
  return (
    <div className={`relative overflow-hidden bg-raised ${rounded} ${className}`}>
      <div ref={track} onScroll={onScroll} className={`flex h-full w-full ${interactive ? 'overflow-x-auto snap-x snap-mandatory' : 'overflow-hidden'} [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}>
        {urls.map((u, i) => (
          <div key={u} className="h-full w-full shrink-0 snap-center flex items-center justify-center">
            {isVideo(u)
              ? <video src={u} className="h-full w-full object-contain bg-black" controls={interactive} playsInline muted={!interactive} preload="metadata" />
              : <img src={u} alt={`Pieza, imagen ${i + 1} de ${urls.length}`} className="h-full w-full object-cover" draggable={false} loading={i === 0 ? 'eager' : 'lazy'} />}
          </div>
        ))}
      </div>
      {urls.length > 1 && (
        <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5 pointer-events-none">
          {urls.map((u, i) => <span key={u} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-[18px] bg-white' : 'w-1.5 bg-white/40'}`} />)}
        </div>
      )}
    </div>
  );
};
