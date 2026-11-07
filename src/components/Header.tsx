import React, { useState } from 'react';
import { Volume2, VolumeX, Maximize2, Minimize2, Flame } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface HeaderProps {
  onOpenProfile: () => void;
  userAvatar: string;
  userName: string;
  isWideMode: boolean;
  onToggleWideMode: () => void;
  activeVibeSound?: 'coffee' | 'park' | 'night' | 'creativity' | 'fire' | 'upbeat';
}

export const Header: React.FC<HeaderProps> = ({
  onOpenProfile,
  userAvatar,
  userName,
  isWideMode,
  onToggleWideMode,
  activeVibeSound = 'fire',
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  const toggleSound = () => {
    if (isPlayingAudio) {
      soundManager.stop();
      setIsPlayingAudio(false);
    } else {
      soundManager.playAmbience(activeVibeSound);
      setIsPlayingAudio(true);
    }
  };

  return (
    <header className="flex items-center justify-between pb-3 select-none">
      <div className="flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#E07A5F] to-[#F4A261] flex items-center justify-center text-white shadow-md shadow-[#E07A5F]/20">
          <Flame className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-bold tracking-tight text-[#3D405B]">PlanMap</h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-[#81B29A]/15 text-[#588B74]">
              Vivo
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">Experiencias Compartidas</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Ambience audio toggle button */}
        <button
          onClick={toggleSound}
          title={isPlayingAudio ? 'Silenciar ambiente de fondo' : 'Activar sonido ambiental'}
          className={`p-2 rounded-xl transition-all border ${
            isPlayingAudio
              ? 'bg-[#E07A5F]/15 border-[#E07A5F] text-[#E07A5F] ring-2 ring-[#E07A5F]/20 animate-pulse'
              : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          {isPlayingAudio ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Device frame switch button (desktop only helper) */}
        <button
          onClick={onToggleWideMode}
          title={isWideMode ? 'Modo vista móvil' : 'Modo vista ampliada'}
          className="hidden md:flex p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all"
        >
          {isWideMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* User avatar button */}
        <button
          onClick={onOpenProfile}
          title={`Perfil de ${userName}`}
          className="w-9 h-9 rounded-full bg-[#EDF2F7] border border-slate-200 flex items-center justify-center text-base hover:ring-2 hover:ring-[#E07A5F]/40 transition-all cursor-pointer shadow-sm"
        >
          {userAvatar}
        </button>
      </div>
    </header>
  );
};
