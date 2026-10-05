import React from 'react';
import { NavLink } from 'react-router';

/** Two or three views of the same screen (Ideas / Mezcla, Próximas / Publicadas), each with its own URL. */
export const Segmented: React.FC<{ label: string; items: { to: string; label: string; end?: boolean }[] }> = ({ label, items }) => (
  <nav aria-label={label} className="grid bg-card border border-edge rounded-[16px] p-1" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
    {items.map((it) => (
      <NavLink key={it.to} to={it.to} end={it.end ?? true} replace
        className={({ isActive }) => `h-10 rounded-[12px] flex items-center justify-center text-sm no-underline transition ${isActive ? 'bg-edge text-white font-extrabold' : 'text-text-3 font-bold'}`}>
        {it.label}
      </NavLink>
    ))}
  </nav>
);
