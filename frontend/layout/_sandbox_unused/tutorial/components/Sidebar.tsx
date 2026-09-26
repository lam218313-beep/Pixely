import React from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  GraduationCap, 
  MessageSquare, 
  Bell, 
  CalendarDays, 
  Users, 
  Settings,
  ArrowUpRight
} from 'lucide-react';
import { NavItem } from '../types';

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', active: true },
  { icon: BookOpen, label: 'My Courses' },
  { icon: GraduationCap, label: 'My Classes' },
  { icon: MessageSquare, label: 'Messages' },
  { icon: Bell, label: 'Notifications', badge: 2 },
  { icon: CalendarDays, label: 'Calendars' },
  { icon: Users, label: 'Community' },
  { icon: Settings, label: 'Settings' },
];

export const Sidebar: React.FC<{ isOpen: boolean, toggle: () => void }> = ({ isOpen, toggle }) => {
  return (
    <aside 
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-edu-sidebar text-white transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } flex flex-col h-screen lg:rounded-r-[40px] shadow-2xl overflow-y-auto`}
    >
      {/* Logo */}
      <div className="p-8 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full border-4 border-white flex items-center justify-center">
           <div className="w-2 h-2 bg-white rounded-full"></div>
        </div>
        <span className="text-2xl font-bold tracking-tight">Eduplex</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.label}
            className={`w-full flex items-center justify-between px-6 py-4 rounded-[20px] transition-all duration-200 group ${
              item.active 
                ? 'bg-edu-accent text-edu-dark font-semibold shadow-[0_0_20px_rgba(217,242,126,0.3)]' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-4">
              <item.icon size={20} strokeWidth={item.active ? 2.5 : 2} />
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span className={`flex items-center justify-center w-6 h-6 text-xs rounded-full ${
                item.active ? 'bg-edu-dark text-white' : 'bg-white text-edu-dark'
              }`}>
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Promo Card (Bottom) */}
      <div className="p-6 mt-auto">
        <div className="bg-edu-accent/90 rounded-[30px] p-6 relative overflow-hidden group cursor-pointer transition-transform hover:scale-[1.02]">
           {/* Decorative circles */}
           <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full border-2 border-edu-dark/10"></div>
           <div className="absolute right-2 top-8 w-10 h-10 rounded-full border-2 border-edu-dark/10"></div>

           <div className="relative z-10 flex flex-col gap-4">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <ArrowUpRight size={20} className="text-edu-dark" />
              </div>
              <div>
                <p className="text-edu-dark font-bold text-lg leading-tight">Download our<br/>mobile app</p>
              </div>
           </div>
           
           {/* Mobile lines decoration mock */}
           <div className="absolute bottom-4 right-4 flex flex-col gap-1 opacity-20">
             <div className="w-8 h-1 bg-black rounded-full"></div>
             <div className="w-8 h-1 bg-black rounded-full"></div>
             <div className="w-8 h-1 bg-black rounded-full"></div>
             <div className="w-8 h-1 bg-black rounded-full"></div>
           </div>
        </div>
      </div>
    </aside>
  );
};