import React from 'react';
import pixelyLogo from '../src/assets/logo.png';

// Simple SVG placeholders for logos to avoid external image dependencies
const PixelyLogo = () => (
  <div className="w-[100px] h-[100px] rounded-full flex items-center justify-center overflow-hidden bg-card shadow-2xl p-2">
    <img src={pixelyLogo} alt="Pixely Logo" className="w-full h-full object-contain" />
  </div>
);

const PartnerLogo = ({ label, color = "#8A8A96" }: { label: string; color?: string }) => (
  <div className="bg-card rounded-full p-3 shadow-md flex items-center justify-center w-16 h-16 md:w-20 md:h-20 border border-edge hover:scale-110 transition-transform duration-300 cursor-pointer will-change-transform">
    <div className="text-xs md:text-sm font-bold text-center leading-tight" style={{ color }}>
      {label}
    </div>
  </div>
);

const OrbitalHero: React.FC = () => {
  return (
    <div className="relative w-full h-[600px] md:h-[750px] flex items-center justify-center overflow-visible bg-ink">

      {/* Central Hub */}
      <div className="absolute z-30 flex flex-col items-center justify-center">
        <PixelyLogo />
      </div>

      {/* Orbit 1 (Inner) - Smallest */}
      <div className="absolute w-[300px] h-[300px] md:w-[380px] md:h-[380px] border border-pink/20 rounded-full animate-orbit-slow pointer-events-none">
        {/* Items on Orbit 1 */}
        {/* Top (12 o'clock) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
          <div className="animate-reverse-orbit-slow">
            <PartnerLogo label="Google" color="#B4B4BE" />
          </div>
        </div>
        {/* Bottom (6 o'clock) */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 pointer-events-auto">
          <div className="animate-reverse-orbit-slow">
            <PartnerLogo label="Meta" color="#B4B4BE" />
          </div>
        </div>
      </div>

      {/* Orbit 2 (Middle) - Equilateral Triangle Layout */}
      <div className="absolute w-[500px] h-[500px] md:w-[600px] md:h-[600px] border border-pink/20 rounded-full animate-orbit-medium pointer-events-none">

        {/* Item 1: Top Left (300 degrees / 10 o'clock position) */}
        <div className="absolute top-[25%] left-[6.7%] -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
          <div className="animate-reverse-orbit-medium">
            <PartnerLogo label="Intel" color="#B4B4BE" />
          </div>
        </div>

        {/* Item 2: Top Right (60 degrees / 2 o'clock position) */}
        <div className="absolute top-[25%] right-[6.7%] translate-x-1/2 -translate-y-1/2 pointer-events-auto">
          <div className="animate-reverse-orbit-medium">
            <PartnerLogo label="AWS" color="#B4B4BE" />
          </div>
        </div>

        {/* Item 3: Bottom Center (180 degrees / 6 o'clock position) */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 pointer-events-auto">
          <div className="animate-reverse-orbit-medium">
            <PartnerLogo label="Microsoft" color="#8A8A96" />
          </div>
        </div>
      </div>

      {/* Orbit 3 (Outer) - Square Layout */}
      <div className="absolute w-[700px] h-[700px] md:w-[850px] md:h-[850px] border border-pink/20 rounded-full animate-orbit-fast pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
          <div className="animate-reverse-orbit-fast">
            <PartnerLogo label="OpenAI" color="#B4B4BE" />
          </div>
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 pointer-events-auto">
          <div className="animate-reverse-orbit-fast">
            <PartnerLogo label="Nvidia" color="#B4B4BE" />
          </div>
        </div>
        <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
          <div className="animate-reverse-orbit-fast">
            <PartnerLogo label="IBM" color="#B4B4BE" />
          </div>
        </div>
        <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 pointer-events-auto">
          <div className="animate-reverse-orbit-fast">
            <PartnerLogo label="Oracle" color="#B4B4BE" />
          </div>
        </div>
      </div>

      {/* Decorative Background Glow - Scaled Up */}
      <div className="absolute w-[900px] h-[900px] bg-pink-fill/5 rounded-full blur-3xl -z-10"></div>
    </div>
  );
};

export default OrbitalHero;
