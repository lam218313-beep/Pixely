import React, { useState, useRef, MouseEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { RefreshCw, Calendar, User } from 'lucide-react';

// =============================================================================
// TILT & FLIP CARD WRAPPER
// =============================================================================

interface MagicCardProps {
  children: React.ReactNode; // Front content
  backContent?: React.ReactNode; // Back content
  className?: string;
  isFlippable?: boolean;
}

export const MagicCard: React.FC<MagicCardProps> = ({ 
  children, 
  backContent, 
  className = "", 
  isFlippable = true 
}) => {
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [isFlipped, setIsFlipped] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || isFlipped) return;

    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -5; // Max 5 deg rotation
    const rotateY = ((x - centerX) / centerX) * 5;

    setRotate({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
  };

  const handleClick = () => {
    if (isFlippable && backContent) {
      setIsFlipped(!isFlipped);
      setRotate({ x: 0, y: 0 }); // Reset tilt when flipped
    }
  };

  return (
    <div 
      className={`perspective-1000 ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <div 
        ref={cardRef}
        className={`relative w-full h-full transition-all duration-500 transform-style-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}
        style={{
          transform: isFlipped 
            ? 'rotateY(180deg)' 
            : `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale3d(1, 1, 1)`,
        }}
      >
        {/* FRONT FACE */}
        <div className="absolute inset-0 backface-hidden w-full h-full">
          {children}
        </div>

        {/* BACK FACE */}
        <div className="absolute inset-0 backface-hidden w-full h-full rotate-y-180 bg-card rounded-[32px] shadow-xl border border-edge overflow-hidden">
          {backContent || (
            <div className="flex items-center justify-center h-full text-text-3 p-6 text-center">
              <p>Detalles adicionales no disponibles</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// DASHBOARD HEADER CARD
// =============================================================================

export const DashboardHeader: React.FC<{ onRefresh?: () => void }> = ({ onRefresh }) => {
  const { user } = useAuth();
  const date = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="w-full bg-gradient-to-r from-primary-600 to-primary-800 rounded-[32px] p-8 text-white shadow-lg mb-8 relative overflow-hidden group">
      {/* Background Pattern */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-raised/10 rounded-full -ml-10 -mb-10 blur-2xl"></div>

      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 text-pink-soft mb-2 text-sm font-medium">
            <Calendar size={16} />
            <span className="capitalize">{date}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-1 tracking-tight">
            Dashboard Ejecutivo
          </h1>
          <p className="text-pink-soft text-lg opacity-90">
            Análisis Estratégico Q1-Q10
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end mr-2">
            <span className="text-sm font-bold">{user?.email || 'Usuario'}</span>
            <span className="text-xs text-pink-soft bg-pink-fill/30 px-2 py-0.5 rounded-full">
              {user?.tenantId || 'Tenant'}
            </span>
          </div>
          {/* Avatar with Initial or Logo */}
          <div className="w-12 h-12 rounded-full border-2 border-edge shadow-inner bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center overflow-hidden">
            {user?.logoUrl ? (
              <img
                src={user.logoUrl}
                alt="User"
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <span className="text-white font-bold text-2xl">
                {user?.email ? user.email.charAt(0).toUpperCase() : "U"}
              </span>
            )}
          </div>
          {onRefresh && (
            <button
              onClick={(e) => { e.stopPropagation(); onRefresh(); }}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors backdrop-blur-sm border border-edge"
              title="Actualizar Datos"
            >
              <RefreshCw size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
