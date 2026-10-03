import React, { useEffect, useState } from 'react';
import { LayoutGrid, Home, Layers, BookOpen, Power, Shield, ClipboardList, Palette, CalendarRange, CheckCircle2, Radar, Images, Send } from 'lucide-react';
import pixelyLogo from '../src/assets/logo.png';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../services/api';
import { pieceStage } from './content/ContentPieceUI';

interface SidebarProps {
    isExpanded: boolean;
    setIsExpanded: (expanded: boolean) => void;
    activeView: string;
    setActiveView: (view: string) => void;
    onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isExpanded, setIsExpanded, activeView, setActiveView, onLogout }) => {
    const { user } = useAuth();
    // The one place the client has to act: surface it from anywhere in the app.
    // Re-counted on every navigation so it drops right after the client reviews.
    const [toReview, setToReview] = useState(0);
    const clientId = user?.fichaClienteId;
    useEffect(() => {
        if (!clientId) return;
        let cancelled = false;
        api.getContentPieces(clientId)
            .then((pieces) => { if (!cancelled) setToReview(pieces.filter((p) => pieceStage(p) === 'revision').length); })
            .catch(() => { /* the badge is a hint; never block the menu on it */ });
        return () => { cancelled = true; };
    }, [clientId, activeView]);

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

            {/* Navigation: grouped by what each page is for, not a flat list of steps */}
            <nav className="flex-1 flex flex-col justify-center gap-1 px-2 w-full overflow-y-auto custom-scrollbar" role="navigation" aria-label="Navegación principal">
                <SidebarItem icon={Home} label="Inicio" viewId="partners" isActive={activeView === 'partners'} onClick={setActiveView} />

                <SidebarGroup label="Tu marca">
                    <SidebarItem icon={ClipboardList} label="Ficha" viewId="interview" isActive={activeView === 'interview'} onClick={setActiveView} />
                    <SidebarItem icon={Palette} label="Manual" viewId="brand" isActive={activeView === 'brand'} onClick={setActiveView} />
                    <SidebarItem icon={Layers} label="Análisis" viewId="lab" isActive={activeView === 'lab'} onClick={setActiveView} />
                    <SidebarItem icon={Radar} label="Mercado" viewId="mercado" isActive={activeView === 'mercado'} onClick={setActiveView} />
                    <SidebarItem icon={LayoutGrid} label="Estrategia" viewId="strategy" isActive={activeView === 'strategy'} onClick={setActiveView} />
                </SidebarGroup>

                <SidebarGroup label="Tu mes">
                    <SidebarItem icon={CalendarRange} label="Planificación" viewId="work" isActive={activeView === 'work'} onClick={setActiveView} />
                    <SidebarItem icon={CheckCircle2} label="Validación" viewId="validacion" isActive={activeView === 'validacion'} onClick={setActiveView} badge={toReview} />
                    <SidebarItem icon={Send} label="Publicación" viewId="publicacion" isActive={activeView === 'publicacion'} onClick={setActiveView} />
                </SidebarGroup>

                <SidebarGroup label="Archivo">
                    <SidebarItem icon={Images} label="Repositorio" viewId="repositorio" isActive={activeView === 'repositorio'} onClick={setActiveView} />
                </SidebarGroup>

                <div className="pt-3 mt-2 border-t border-gray-100">
                    <SidebarItem icon={BookOpen} label="Wiki" viewId="wiki" isActive={activeView === 'wiki'} onClick={setActiveView} />
                    {/* Admin Panel - Only visible for admin users */}
                    {user?.isAdmin && (
                        <SidebarItem icon={Shield} label="Admin" viewId="admin" isActive={activeView === 'admin'} onClick={setActiveView} />
                    )}
                </div>
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
    badge?: number;
}

/** Section label shows with the expanded rail; collapsed, a hairline keeps the groups apart. */
const SidebarGroup: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="pt-3 mt-1 border-t border-gray-100 group-hover:border-transparent transition-colors" role="group" aria-label={label}>
        <p className="h-0 group-hover:h-5 overflow-hidden px-4 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap">{label}</p>
        <div className="space-y-1">{children}</div>
    </div>
);

const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, viewId, isActive, onClick, badge }) => (
    <button
        onClick={() => onClick(viewId)}
        className={`w-full flex items-center h-11 rounded-[18px] transition-all duration-200 relative group/item overflow-hidden px-4 ${isActive
            ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/30'
            : 'text-gray-500 hover:text-primary-600 hover:bg-primary-50'
            }`}
        aria-label={`Ir a ${label}${badge ? ` (${badge} por revisar)` : ''}`}
        aria-current={isActive ? 'page' : undefined}
    >
        {/* Icon container */}
        <div className="w-8 flex items-center justify-center shrink-0 relative">
            <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            {!!badge && (
                <span className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ring-2 ${isActive ? 'bg-white text-primary-600 ring-primary-500' : 'bg-primary-600 text-white ring-white'}`}>
                    {badge}
                </span>
            )}
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