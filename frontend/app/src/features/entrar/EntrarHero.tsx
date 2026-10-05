import React from 'react';
import { Wordmark } from '@/ui';

/** The night-sky frame of the sign-in screens: rings, the pink dot, and the sheet at the bottom. */
export const EntrarFrame: React.FC<{ hero: React.ReactNode; children: React.ReactNode }> = ({ hero, children }) => (
  <div className="relative min-h-full mx-auto max-w-[480px] flex flex-col overflow-hidden">
    <div aria-hidden className="absolute -right-[120px] top-[90px] w-[340px] h-[340px] rounded-full border border-[#2A2A32]" />
    <div aria-hidden className="absolute -right-[60px] top-[150px] w-[220px] h-[220px] rounded-full border border-[#2A2A32]" />
    <div aria-hidden className="absolute right-[52px] top-[182px] w-3.5 h-3.5 rounded-full bg-pink shadow-[0_0_0_8px_rgba(235,12,110,0.18)]" />
    <header className="relative px-7 pt-safe">
      <div className="pt-8 flex items-center justify-between">
        <Wordmark />
        <span className="text-xs font-bold tracking-[0.12em] uppercase text-text-3">Partners</span>
      </div>
    </header>
    <div className="relative flex-1 px-7 flex flex-col justify-center gap-5 py-10">{hero}</div>
    <div className="relative bg-card border-t border-edge rounded-t-[32px] px-6 pt-7 pb-safe flex flex-col gap-3.5">
      <span className="w-10 h-1 rounded-full bg-line self-center mb-1.5" />
      {children}
    </div>
  </div>
);
