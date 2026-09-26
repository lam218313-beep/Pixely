import React from 'react';
import { LayoutGrid, Users, Layers, FileText, BookOpen, Power, Hexagon, Shield, ClipboardList, Palette, CalendarRange, CheckCircle, CheckCircle2 } from 'lucide-react';
import pixelyLogo from '../src/assets/logo.png';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
    isExpanded: boolean;
    setIsExpanded: (expanded: boolean) => void;
    activeView: string;
    setActiveView: (view: string) => void;
    onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isExpanded, setIsExpanded, activeView, setActiveView, onLogout }) => {
    const { user } = useAuth();

    return (
        <aside
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
            className={`
                relative flex flex-col z-40 transition-all duration-300 ease-in-out group overflow-hidden shadow-xl 
                rounded-[30px] border border-gray-200 font-sans bg-white text-gray-600
                my-4 mx-2 h-[calc(100vh-2rem)]
                w-full
            `}
        /* Note: Width is now controlled by the parent container in App.tsx */
        >

            {/* Logo Area */}
            <div className="h-28 flex items-center justify-center relative shrink-0 w-full">
                <div className="w-24 h-24 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 ease-out group-hover:scale-105 overflow-hidden">
                    <img src={pixelyLogo} alt="Pixely Logo" className="w-full h-full object-contain" />
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 flex flex-col justify-center space-y-2 px-2 w-full overflow-y-auto custom-scrollbar" role="navigation" aria-label="Navegación principal">

                {/* 1. Partners */}
                <SidebarItem
                    icon={Users}
                    label="Partners"
                    viewId="partners"
                    isActive={activeView === 'partners'}
                    onClick={setActiveView}
                />

                {/* 2. Entrevista */}
                <SidebarItem
                    icon={ClipboardList}
                    label="Entrevista"
                    viewId="interview"
                    isActive={activeView === 'interview'}
                    onClick={setActiveView}
                />

                {/* 3. Manual */}
                <SidebarItem
                    icon={Palette}
                    label="Manual"
                    viewId="brand"
                    isActive={activeView === 'brand'}
                    onClick={setActiveView}
                />

                {/* 4. Análisis */}
                <SidebarItem
                    icon={Layers}
                    label="Análisis"
                    viewId="lab"
                    isActive={activeView === 'lab'}
                    onClick={setActiveView}
                />

                {/* 5. Estrategia */}
                <SidebarItem
                    icon={LayoutGrid}
                    label="Estrategia"
                    viewId="strategy"
                    isActive={activeView === 'strategy'}
                    onClick={setActiveView}
                />

                {/* 6. Planificación */}
                <SidebarItem
                    icon={CalendarRange}
                    label="Planificación"
                    viewId="work"
                    isActive={activeView === 'work'}
                    onClick={setActiveView}
                />

                {/* 7. Beneficios - Temporalmente oculto */}
                {/* <SidebarItem
                    icon={CheckCircle2}
                    label="Beneficios"
                    viewId="benefits"
                    isActive={activeView === 'benefits'}
                    onClick={setActiveView}
                /> */}

                {/* 9. Wiki */}
                <SidebarItem
                    icon={BookOpen}
                    label="Wiki"
                    viewId="wiki"
                    isActive={activeView === 'wiki'}
                    onClick={setActiveView}
                />



                {/* Admin Panel - Only visible for admin users */}
                {user?.isAdmin && (
                    <div className="pt-4 mt-4 border-t border-gray-200">
                        <SidebarItem
                            icon={Shield}
                            label="Admin"
                            viewId="admin"
                            isActive={activeView === 'admin'}
                            onClick={setActiveView}
                        />
                    </div>
                )}
            </nav>

            {/* --- Bottom User Section --- */}
            <div className="px-3 mb-2 w-full shrink-0">
                <div className="flex items-center p-3 rounded-[20px] bg-gray-50 border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors overflow-hidden relative h-[68px] group/user">

                    {/* Avatar with Initial */}
                    <div className="relative w-10 h-10 shrink-0">
                        {user?.logoUrl ? (
                            <img
                                src={user.logoUrl}
                                alt="User"
                                className="w-full h-full object-cover rounded-full border-2 border-gray-200 shadow-sm"
                            />
                        ) : (
                            <div className="w-full h-full rounded-full border-2 border-gray-200 shadow-sm bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                                <span className="text-white font-bold text-lg">
                                    {user?.email ? user.email.charAt(0).toUpperCase() : "U"}
                                </span>
                            </div>
                        )}
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>

                    {/* User Info (Reveals on hover) */}
                    <div className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 min-w-[120px]">
                        <span className="block text-sm font-bold text-gray-800 leading-none mb-1">{user?.email ? user.email.split('@')[0] : "Usuario Demo"}</span>
                        <span className="block text-[10px] text-gray-500 font-medium">{user?.email || "admin@pixely.com"}</span>
                    </div>

                    {/* Logout / Power Icon (Absolute right, reveals on hover) */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onLogout();
                        }}
                        className="absolute right-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        aria-label="Cerrar sesión"
                    >
                        <Power size={18} />
                    </button>
                </div>
            </div>
        </aside>
    );
};

// Helper Component for Items
interface SidebarItemProps {
    icon: any;
    label: string;
    viewId: string;
    isActive: boolean;
    onClick: (view: string) => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, viewId, isActive, onClick }) => (
    <button
        onClick={() => onClick(viewId)}
        className={`w-full flex items-center h-12 rounded-[18px] transition-all duration-200 relative group/item overflow-hidden px-4 ${isActive
            ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/30'
            : 'text-gray-500 hover:text-primary-600 hover:bg-primary-50'
            }`}
        aria-label={`Ir a ${label}`}
        aria-current={isActive ? 'page' : undefined}
    >
        {/* Icon container */}
        <div className="w-8 flex items-center justify-center shrink-0">
            <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
        </div>

        {/* Label */}
        <span className={`ml-3 whitespace-nowrap font-medium text-sm transition-all duration-300 opacity-0 max-w-0 group-hover:opacity-100 group-hover:max-w-[150px] overflow-hidden ${isActive ? 'font-bold' : ''
            }`}>
            {label}
        </span>

        {/* Active Indicator Dot */}
        {isActive && (
            <div className="absolute right-4 w-1.5 h-1.5 bg-white rounded-full shadow-glow opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        )}
    </button>
);