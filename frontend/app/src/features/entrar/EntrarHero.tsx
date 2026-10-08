import React, { useEffect, useState } from 'react';
import { Wordmark } from '@/ui';

/**
 * The night-sky frame of the sign-in screens: rings, the pink dot, and the sheet at the bottom.
 * On a computer the sky takes the left half and the sheet becomes a card on the right.
 */
const PLAYED = 'pixely_entrada_vista';
let played = false;

/** The entrance plays once per visit: not again when coming back to this screen. */
function useFirstVisit() {
  const [play] = useState(() => {
    if (played) return false;
    try { return !sessionStorage.getItem(PLAYED); } catch { return true; }
  });
  useEffect(() => {
    played = true;
    try { sessionStorage.setItem(PLAYED, '1'); } catch { /* private mode: it just plays again */ }
  }, []);
  return play;
}

export const EntrarFrame: React.FC<{ hero: React.ReactNode; children: React.ReactNode }> = ({ hero, children }) => {
  const play = useFirstVisit();
  return (
  <div className={`relative min-h-full mx-auto max-w-[480px] flex flex-col overflow-hidden lg:max-w-none lg:min-h-dvh lg:grid lg:grid-cols-2 ${play ? 'entrar-play' : ''}`}>
    <div className="relative flex-1 flex flex-col lg:border-r lg:border-edge lg:px-10 lg:overflow-hidden">
      <div aria-hidden className="en-ring absolute -right-[120px] top-[90px] w-[340px] h-[340px] lg:w-[560px] lg:h-[560px] lg:top-[16%] rounded-full border border-[#2A2A32]" />
      <div aria-hidden className="en-ring absolute -right-[60px] top-[150px] w-[220px] h-[220px] lg:w-[360px] lg:h-[360px] lg:top-[26%] rounded-full border border-[#2A2A32]" />
      <div aria-hidden className="en-dot absolute right-[52px] top-[182px] lg:right-[120px] lg:top-[32%] w-3.5 h-3.5 rounded-full bg-pink shadow-[0_0_0_8px_rgba(235,12,110,0.18)]" />
      <header className="en-fade relative px-7 pt-safe">
        <div className="pt-8 lg:pt-10 flex items-center justify-between">
          <Wordmark />
          <span className="text-xs font-bold tracking-[0.12em] uppercase text-text-3">Partners</span>
        </div>
      </header>
      <div className="relative flex-1 px-7 flex flex-col justify-center gap-5 py-10 lg:max-w-[560px]">{hero}</div>
    </div>
    <div className="relative lg:flex lg:items-center lg:justify-center lg:p-10">
      <div className="en-sheet relative bg-card border-t border-edge rounded-t-[32px] px-6 pt-7 pb-safe flex flex-col gap-3.5 lg:w-full lg:max-w-[440px] lg:border lg:rounded-[32px] lg:p-8">
        <span className="w-10 h-1 rounded-full bg-line self-center mb-1.5 lg:hidden" />
        {children}
      </div>
    </div>
  </div>
  );
};
