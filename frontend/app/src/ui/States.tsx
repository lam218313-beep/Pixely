import React from 'react';
import { WifiOff } from 'lucide-react';
import { Button } from './Button';
import { ThinkingOrb } from './ThinkingOrb';

export const Loading: React.FC<{ label?: string }> = ({ label = 'Cargando' }) => (
  <div role="status" className="flex flex-col items-center justify-center gap-3 py-20 text-text-3">
    <ThinkingOrb className="text-pink" />
    <span className="text-sm font-semibold">{label}</span>
  </div>
);

export const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div role="alert" className="flex flex-col items-center text-center gap-3 py-16 px-6">
    <span className="w-14 h-14 rounded-full bg-raised flex items-center justify-center text-text-2"><WifiOff size={24} /></span>
    <p className="m-0 text-[15px] text-text-2 max-w-[280px]">{message}</p>
    {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Intentar de nuevo</Button>}
  </div>
);

/** Nothing here yet: says why and, when there is one, what happens next. */
export const EmptyState: React.FC<{ icon: React.ReactNode; title: string; text: string; action?: React.ReactNode }> = ({ icon, title, text, action }) => (
  <div className="flex flex-col items-center text-center gap-3 py-16 px-6">
    <span className="w-16 h-16 rounded-full bg-pink/15 text-pink-text flex items-center justify-center">{icon}</span>
    <h2 className="font-display font-bold text-xl m-0">{title}</h2>
    <p className="m-0 text-[15px] leading-relaxed text-text-2 max-w-[300px]">{text}</p>
    {action}
  </div>
);
