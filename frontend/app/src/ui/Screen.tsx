import React from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { IconButton } from './Button';

/** The brand mark: the word with a pink dot, the same dot that ends every title. */
export const Dot: React.FC = () => <span className="text-pink">.</span>;

export const Wordmark: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <span className="font-display font-extrabold" style={{ fontSize: size }}>pixely<Dot /></span>
);

/**
 * A tab's main screen: big title with the pink dot and an optional action on the right.
 * Leaves room at the bottom for the floating tab bar.
 */
export const Screen: React.FC<{ title: string; action?: React.ReactNode; children: React.ReactNode }> = ({ title, action, children }) => (
  <div className="min-h-full px-5 pt-safe pb-36 lg:pb-14">
    <header className="flex items-center justify-between gap-3 pt-4 lg:pt-10 mb-5 lg:mb-7">
      <h1 className="font-display font-bold text-[28px] lg:text-[36px] m-0">{title}<Dot /></h1>
      {action}
    </header>
    <div className="flex flex-col gap-3">{children}</div>
  </div>
);

/** A detail screen: back arrow, optional centre and right items, no tab bar. */
export const DetailScreen: React.FC<{ center?: React.ReactNode; right?: React.ReactNode; back?: string; footer?: React.ReactNode; children: React.ReactNode }> = ({ center, right, back, footer, children }) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-full flex flex-col">
      <header className="px-5 pt-safe flex items-center justify-between gap-3">
        <div className="pt-4 lg:pt-8 flex items-center justify-between gap-3 w-full">
          <IconButton label="Volver" onClick={() => (back ? navigate(back) : navigate(-1))}><ArrowLeft size={20} strokeWidth={2.5} /></IconButton>
          <div className="flex-1 min-w-0 flex justify-center">{center}</div>
          <div className="min-w-11 flex justify-end">{right}</div>
        </div>
      </header>
      <main className={`flex-1 px-5 pt-6 flex flex-col gap-5 ${footer ? 'pb-36' : 'pb-safe'}`}>{children}</main>
      {footer && (
        <div className="fixed inset-x-0 lg:left-[260px] bottom-0 z-30 bg-ink border-t border-edge px-5 pt-3.5 pb-safe lg:pb-4">
          <div className="mx-auto max-w-[480px] lg:max-w-[712px]">{footer}</div>
        </div>
      )}
    </div>
  );
};
