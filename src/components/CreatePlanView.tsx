import React, { useState } from 'react';
import { ArrowLeft, Sparkles, MapPin, Calendar, Clock, Check } from 'lucide-react';
import { Vibe, PlanExperience } from '../types';
import { VIBES, POPULAR_LOCATIONS } from '../data/mockData';
import { soundManager } from '../utils/audio';

interface CreatePlanViewProps {
  onBack: () => void;
  onPlanCreated: (plan: PlanExperience) => void;
  userName: string;
  userAvatar: string;
}

export const CreatePlanView: React.FC<CreatePlanViewProps> = ({
  onBack,
  onPlanCreated,
  userName,
  userAvatar,
}) => {
  const [title, setTitle] = useState('Trabajo grupal de la universidad');
  const [selectedVibe, setSelectedVibe] = useState<Vibe>(VIBES[0]);
  const [selectedLocation, setSelectedLocation] = useState(POPULAR_LOCATIONS[0]);
  const [customAddress, setCustomAddress] = useState('');
  const [dateStr, setDateStr] = useState('Hoy, 6 Noviembre');
  const [timeStr, setTimeStr] = useState('4:30 PM - 6:30 PM');
  const [notes, setNotes] = useState('Mesa con enchufes para laptops. Traer apuntes.');

  const handleSelectVibe = (vibe: Vibe) => {
    setSelectedVibe(vibe);
    soundManager.playChime();
    const matchedLoc = POPULAR_LOCATIONS.find((l: any) => l.vibeId === vibe.id);
    if (matchedLoc) {
      setSelectedLocation(matchedLoc);
    }
  };

  const handleCreate = () => {
    const randomCode = Math.random().toString(36).substring(2, 6);
    const newPlan: PlanExperience = {
      id: `plan-${Date.now()}`,
      title: title.trim() || 'Plan de Estudio y Café',
      vibe: selectedVibe,
      locationName: selectedLocation.name,
      address: customAddress || selectedLocation.address,
      city: selectedLocation.city,
      coordinates: selectedLocation.coords,
      date: dateStr,
      time: timeStr,
      inviteCode: `planealo-aqui.netlify.app/join/${randomCode}`,
      status: 'active',
      notes: notes,
      participants: [
        {
          id: `u-${Date.now()}`,
          name: `${userName} (Organizador)`,
          avatar: userAvatar,
          role: 'organizer',
          status: 'arrived',
          lat: selectedLocation.coords[0],
          lng: selectedLocation.coords[1],
          lastMessage: 'Plan iniciado. ¡Los espero en el punto!',
          signature: `${userName} ☕`,
        },
      ],
    };

    onPlanCreated(newPlan);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#E07A5F] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>
        <span className="text-xs font-bold text-[#E07A5F] bg-[#FFF5F2] px-2.5 py-1 rounded-full">
          Paso 1 de 2
        </span>
      </div>

      <div className="mb-4">
        <h2 className="text-2xl font-black text-[#3D405B] tracking-tight">Nuevo Plan</h2>
        <p className="text-xs text-slate-500 font-medium">
          Define el tono de tu encuentro.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Título del plan */}
        <div>
          <label className="block text-xs font-bold text-[#3D405B] mb-1.5">
            Título del plan
          </label>
          <input
            type="text"
            id="plan-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Trabajo grupal de la universidad"
            className="w-full bg-white border border-slate-200 rounded-2xl px-3.5 py-3 text-sm font-semibold text-[#2D3748] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E07A5F]/40 shadow-xs"
          />
        </div>

        {/* Selector de Vibe */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-[#3D405B]">Elige la Vibe</label>
            <span className="text-[11px] text-slate-400 font-medium">Ambiente sonoro y visual</span>
          </div>

          <div className="vibe-grid grid grid-cols-2 gap-2.5">
            {VIBES.map((vibe) => {
              const isSelected = selectedVibe.id === vibe.id;
              return (
                <div
                  key={vibe.id}
                  onClick={() => handleSelectVibe(vibe)}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer text-center relative select-none ${
                    isSelected
                      ? 'border-[#E07A5F] bg-[#FFF5F2] shadow-sm ring-1 ring-[#E07A5F]/30 scale-[1.02]'
                      : 'border-slate-200/80 bg-white hover:border-slate-300'
                  }`}
                >
                  {isSelected && (
                    <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#E07A5F] text-white flex items-center justify-center text-[10px]">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                  <div className="vibe-emoji text-3xl mb-1.5">{vibe.emoji}</div>
                  <div className="vibe-name font-bold text-xs text-[#3D405B] mb-0.5">{vibe.name}</div>
                  <div className="text-[10px] text-slate-500 leading-tight">{vibe.description}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Punto de encuentro / Ubicación */}
        <div>
          <label className="block text-xs font-bold text-[#3D405B] mb-1.5">
            Punto de encuentro sugerido
          </label>
          <div className="flex flex-col gap-1.5">
            <select
              value={selectedLocation.name}
              onChange={(e) => {
                const loc = POPULAR_LOCATIONS.find((l: any) => l.name === e.target.value);
                if (loc) setSelectedLocation(loc);
              }}
              className="w-full bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-[#2D3748] focus:outline-none focus:ring-2 focus:ring-[#E07A5F]/40 shadow-xs cursor-pointer"
            >
              {POPULAR_LOCATIONS.map((loc: any) => (
                <option key={loc.name} value={loc.name}>
                  {loc.name} ({loc.city})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 px-1 flex items-center gap-1 font-medium">
              <MapPin className="w-3 h-3 text-[#E07A5F]" />
              <span>{selectedLocation.address}</span>
            </p>
          </div>
        </div>

        {/* Horario y Fecha */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-xs font-bold text-[#3D405B] mb-1">Día</label>
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 shadow-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full bg-transparent font-medium focus:outline-none text-[11px]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#3D405B] mb-1">Hora</label>
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 shadow-xs">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="w-full bg-transparent font-medium focus:outline-none text-[11px]"
              />
            </div>
          </div>
        </div>

        {/* Nota / Indicaciones */}
        <div>
          <label className="block text-xs font-bold text-[#3D405B] mb-1.5">
            Nota o recomendación para el grupo
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej. Llevar apuntes o computadoras cargadas..."
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#E07A5F]/40 shadow-xs"
          />
        </div>
      </div>

      <div className="mt-6 pt-2 pb-2">
        <button
          onClick={handleCreate}
          className="btn w-full py-3.5 bg-[#E07A5F] hover:bg-[#d66f54] text-white font-bold rounded-2xl text-sm transition-all shadow-md shadow-[#E07A5F]/25 flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <span>Generar Enlace de Invitación</span>
          <Sparkles className="w-4 h-4 text-amber-200" />
        </button>
      </div>
    </div>
  );
};
