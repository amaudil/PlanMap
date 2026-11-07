import React, { useState } from 'react';
import { X, Check, Award, Compass, Heart } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userAvatar: string;
  onUpdateUser: (name: string, avatar: string) => void;
  memoriesCount: number;
  campfiresCount: number;
}

const AVATARS = ['👤', '👩💻', '🧑🎨', '🏕️', '🌸', '✨', '☕', '🕶️', '🌿', '🎧'];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  userName,
  userAvatar,
  onUpdateUser,
  memoriesCount,
  campfiresCount,
}) => {
  const [name, setName] = useState(userName);
  const [avatar, setAvatar] = useState(userAvatar);

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdateUser(name.trim() || 'Aventurero', avatar);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[#3D405B]">Tu Perfil en PlanMap</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Avatar Selection */}
        <div className="flex flex-col items-center mb-5">
          <div className="w-20 h-20 rounded-full bg-[#FFF5F2] border-2 border-[#E07A5F] flex items-center justify-center text-4xl shadow-inner mb-3">
            {avatar}
          </div>
          <span className="text-xs text-slate-400 mb-2 font-medium">Elige tu avatar de presencia:</span>
          <div className="flex flex-wrap justify-center gap-2 max-w-[260px]">
            {AVATARS.map((av) => (
              <button
                key={av}
                onClick={() => setAvatar(av)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl transition-all ${
                  avatar === av
                    ? 'bg-[#E07A5F] text-white scale-110 shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200'
                }`}
              >
                {av}
              </button>
            ))}
          </div>
        </div>

        {/* Name input */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tu Nombre o Alias</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#E07A5F]/40 focus:border-[#E07A5F]"
            placeholder="Ej. Sofía R."
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6 bg-slate-50 p-3 rounded-2xl border border-slate-100">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-[#E07A5F] mb-0.5">
              <Compass className="w-4 h-4" />
              <span className="text-base font-bold">{campfiresCount}</span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Planes Activos</span>
          </div>
          <div className="text-center border-l border-slate-200">
            <div className="flex items-center justify-center gap-1 text-[#81B29A] mb-0.5">
              <Award className="w-4 h-4" />
              <span className="text-base font-bold">{memoriesCount}</span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Recuerdos Guardados</span>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-3 bg-[#E07A5F] hover:bg-[#d66f54] text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-[#E07A5F]/20 flex items-center justify-center gap-1.5"
        >
          <Check className="w-4 h-4" /> Guardar Cambios
        </button>
      </div>
    </div>
  );
};
