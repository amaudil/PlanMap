import React from 'react';
import { Home, Compass, MapPin, Image as ImageIcon, PlusCircle } from 'lucide-react';

interface NavigationProps {
  currentView: string;
  onNavigate: (view: string) => void;
  activeCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, onNavigate, activeCount }) => {
  return (
    <nav className="w-full bg-white border-t border-slate-200/80 px-4 py-2.5 flex items-center justify-around select-none z-20">
      <button
        onClick={() => onNavigate('home')}
        className={`flex flex-col items-center gap-1 transition-all py-1 px-2 rounded-xl ${
          currentView === 'home' ? 'text-[#E07A5F] font-bold scale-105' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <Home className="w-5 h-5" />
        <span className="text-[11px]">Inicio</span>
      </button>

      <button
        onClick={() => onNavigate('create')}
        className={`flex flex-col items-center gap-1 transition-all py-1 px-2 rounded-xl ${
          currentView === 'create' ? 'text-[#E07A5F] font-bold scale-105' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <PlusCircle className="w-5 h-5 text-[#E07A5F]" />
        <span className="text-[11px] font-medium text-[#E07A5F]">Nuevo Plan</span>
      </button>

      <button
        onClick={() => onNavigate('map')}
        className={`relative flex flex-col items-center gap-1 transition-all py-1 px-2 rounded-xl ${
          currentView === 'map' ? 'text-[#E07A5F] font-bold scale-105' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <MapPin className="w-5 h-5" />
        <span className="text-[11px]">Mapa Vivo</span>
        {activeCount > 0 && (
          <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-[#E07A5F] ring-2 ring-white animate-pulse" />
        )}
      </button>

      <button
        onClick={() => onNavigate('memories')}
        className={`flex flex-col items-center gap-1 transition-all py-1 px-2 rounded-xl ${
          currentView === 'memories' || currentView === 'memory_view'
            ? 'text-[#E07A5F] font-bold scale-105'
            : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <ImageIcon className="w-5 h-5" />
        <span className="text-[11px]">Recuerdos</span>
      </button>
    </nav>
  );
};
