import React from 'react';
import { 
  LayoutGrid, 
  GitFork, 
  Share2, 
  Settings,
  Layers,
  Zap
} from 'lucide-react';
import { NavItem } from '../types';

const navItems: NavItem[] = [
  { icon: GitFork, label: 'Strategy Map', active: true },
  { icon: LayoutGrid, label: 'Templates' },
  { icon: Layers, label: 'Assets' },
  { icon: Share2, label: 'Share' },
  { icon: Settings, label: 'Settings' },
];

export const Sidebar: React.FC<{ isOpen: boolean, toggle: () => void }> = ({ isOpen, toggle }) => {
  return (
    <aside 
      className={`fixed inset-y-0 left-0 z-50 w-20 lg:w-64 bg-raised text-white transition-all duration-300 ease-in-out flex flex-col h-screen shadow-2xl z-[100]`}
    >
      {/* Logo */}
      <div className="h-20 flex items-center justify-center lg:justify-start lg:px-8 border-b border-edge">
        <div className="w-8 h-8 rounded-lg bg-pink-fill flex items-center justify-center shrink-0">
           <Zap className="text-white" size={18} fill="currentColor" />
        </div>
        <span className="ml-3 font-bold text-xl tracking-tight hidden lg:block">StratMap</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-2 lg:px-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.label}
            className={`w-full flex items-center justify-center lg:justify-start px-0 lg:px-4 py-3 rounded-xl transition-all duration-200 group relative ${
              item.active 
                ? 'bg-pink-fill text-white shadow-lg shadow-primary-500/30' 
                : 'text-text-3 hover:text-white hover:bg-white/5'
            }`}
          >
            <item.icon size={22} strokeWidth={item.active ? 2.5 : 2} />
            <span className="ml-3 font-medium hidden lg:block">{item.label}</span>
            
            {/* Tooltip for small screen */}
            {!item.active && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-edge text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none lg:hidden whitespace-nowrap z-50">
                    {item.label}
                </div>
            )}
          </button>
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-edge">
        <div className="flex items-center gap-3 justify-center lg:justify-start">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary-400 to-primary-600 border-2 border-edge"></div>
            <div className="hidden lg:block">
                <p className="text-sm font-bold text-white">Admin User</p>
                <p className="text-xs text-text-3">Pro Plan</p>
            </div>
        </div>
      </div>
    </aside>
  );
};