import React from 'react';
import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';

export const Card: React.FC<React.HTMLAttributes<HTMLElement> & { as?: 'section' | 'div' | 'article' }> = ({ as: Tag = 'section', className = '', ...rest }) => (
  <Tag className={`bg-card border border-edge rounded-[24px] p-[18px] ${className}`} {...rest} />
);

export const Section: React.FC<{ title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, action, children, className = '' }) => (
  <section className={`flex flex-col gap-2.5 ${className}`}>
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="eyebrow m-0">{title}</h2>
      {action}
    </div>
    {children}
  </section>
);

/** Square tile that holds a row's icon. `accent` = pink tint for things that need the client. */
export const IconTile: React.FC<{ children: React.ReactNode; accent?: boolean; size?: number }> = ({ children, accent, size = 44 }) => (
  <span className={`shrink-0 rounded-[14px] flex items-center justify-center ${accent ? 'bg-pink/15 text-pink-text' : 'bg-raised text-text-2'}`} style={{ width: size, height: size }}>
    {children}
  </span>
);

/** A tappable row: icon, title, detail and a chevron. */
export const ListRow: React.FC<{ to?: string; href?: string; icon?: React.ReactNode; accent?: boolean; title: React.ReactNode; detail?: React.ReactNode; trailing?: React.ReactNode }> = ({ to, href, icon, accent, title, detail, trailing }) => {
  const inner = (
    <>
      {icon && <IconTile accent={accent}>{icon}</IconTile>}
      <span className="flex-1 min-w-0">
        <span className="block text-[15px] font-extrabold">{title}</span>
        {detail && <span className="block text-[13px] text-text-3 mt-0.5">{detail}</span>}
      </span>
      {trailing ?? <ChevronRight size={20} className="text-text-3 shrink-0" />}
    </>
  );
  const cls = 'flex items-center gap-3.5 bg-card border border-edge rounded-[22px] px-4 py-3.5 text-white no-underline active:bg-raised transition';
  if (to) return <Link to={to} className={cls}>{inner}</Link>;
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>;
  return <div className={cls}>{inner}</div>;
};
