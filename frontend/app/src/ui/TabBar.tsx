import React from 'react';
import { NavLink } from 'react-router';
import { House, CalendarDays, SquareCheckBig, ChartColumn, CircleDot } from 'lucide-react';

export interface TabBadges { plan?: number; validar?: number }

const TABS = [
  { to: '/', label: 'Inicio', Icon: House, end: true, badge: undefined },
  { to: '/plan', label: 'Plan', Icon: CalendarDays, badge: 'plan' as const },
  { to: '/validar', label: 'Validar', Icon: SquareCheckBig, badge: 'validar' as const },
  { to: '/resultados', label: 'Resultados', Icon: ChartColumn, badge: undefined },
  { to: '/marca', label: 'Marca', Icon: CircleDot, badge: undefined },
];

/** Floating bottom bar with the five tabs. Pink dot = where you are; pink bubble = things waiting for you. */
export const TabBar: React.FC<{ badges?: TabBadges }> = ({ badges = {} }) => (
  <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-safe pt-8 bg-gradient-to-b from-transparent to-ink to-40% pointer-events-none">
    <nav aria-label="Principal" className="pointer-events-auto mx-auto max-w-[480px] grid grid-cols-5 bg-card border border-edge rounded-[26px] p-1.5 shadow-[0_-12px_30px_rgba(0,0,0,0.5)]">
      {TABS.map(({ to, label, Icon, end, badge }) => {
        const n = badge ? badges[badge] ?? 0 : 0;
        return (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `relative flex flex-col items-center gap-1 py-2 no-underline ${isActive ? 'text-white' : 'text-text-3'}`}>
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={2.2} />
                <span className={`text-[10px] ${isActive ? 'font-extrabold' : 'font-bold'}`}>{label}</span>
                <span className={`w-1 h-1 rounded-full ${isActive ? 'bg-pink' : 'bg-transparent'}`} />
                {n > 0 && (
                  <span className="absolute top-1 right-[calc(50%-22px)] min-w-4 h-4 px-1 rounded-full bg-pink-fill text-white text-[10px] font-extrabold flex items-center justify-center" aria-label={`${n} pendientes`}>
                    {n > 9 ? '9+' : n}
                  </span>
                )}
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  </div>
);
