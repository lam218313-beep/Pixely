import React from 'react';
import { Link, NavLink } from 'react-router';
import { House, CalendarDays, SquareCheckBig, ChartColumn, CircleDot } from 'lucide-react';

export interface TabBadges { plan?: number; validar?: number }

export const TABS = [
  { to: '/', label: 'Inicio', Icon: House, end: true, badge: undefined },
  { to: '/plan', label: 'Plan', Icon: CalendarDays, badge: 'plan' as const },
  { to: '/validar', label: 'Validar', Icon: SquareCheckBig, badge: 'validar' as const },
  { to: '/resultados', label: 'Resultados', Icon: ChartColumn, badge: undefined },
  { to: '/marca', label: 'Marca', Icon: CircleDot, badge: undefined },
];

/** Floating bottom bar with the five tabs. Pink dot = where you are; pink bubble = things waiting for you. */
export const TabBar: React.FC<{ badges?: TabBadges }> = ({ badges = {} }) => (
  <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 px-3 pb-safe pt-8 bg-gradient-to-b from-transparent to-ink to-40% pointer-events-none">
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

/**
 * On a computer the five tabs live in a fixed column on the left (same pink dot and bubbles),
 * with the account at the bottom.
 */
export const SideNav: React.FC<{ badges?: TabBadges; account: string; wordmark: React.ReactNode }> = ({ badges = {}, account, wordmark }) => (
  <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-[260px] flex-col border-r border-edge bg-ink px-4 py-7">
    <div className="px-3 flex items-baseline justify-between">
      {wordmark}
      <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-text-3">Partners</span>
    </div>
    <nav aria-label="Principal" className="mt-10 flex flex-col gap-1">
      {TABS.map(({ to, label, Icon, end, badge }) => {
        const n = badge ? badges[badge] ?? 0 : 0;
        return (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => `relative flex items-center gap-3 h-12 px-3 rounded-[14px] no-underline transition ${isActive ? 'bg-card text-white' : 'text-text-3 hover:text-white hover:bg-card/60'}`}>
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={2.2} />
                <span className={`flex-1 text-[15px] ${isActive ? 'font-extrabold' : 'font-bold'}`}>{label}</span>
                {n > 0 && <span className="min-w-5 h-5 px-1.5 rounded-full bg-pink-fill text-white text-[11px] font-extrabold flex items-center justify-center" aria-label={`${n} pendientes`}>{n > 9 ? '9+' : n}</span>}
                {isActive && n === 0 && <span className="w-1.5 h-1.5 rounded-full bg-pink" />}
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
    <Link to="/cuenta" className="mt-auto flex items-center gap-3 px-3 py-3 rounded-[16px] border border-edge bg-card text-white no-underline hover:bg-raised transition">
      <span className="w-9 h-9 rounded-full border border-line flex items-center justify-center font-display font-bold text-sm shrink-0">{account.charAt(0).toUpperCase()}</span>
      <span className="min-w-0"><span className="block text-[13px] font-extrabold">Tu cuenta</span><span className="block text-xs text-text-3 truncate">{account}</span></span>
    </Link>
  </aside>
);
