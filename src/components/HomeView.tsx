import React from 'react';
import { Sparkles, MapPin, ArrowRight, Users, Plus, Compass, Clock } from 'lucide-react';
import { PlanExperience, PostcardMemory } from '../types';

interface HomeViewProps {
  plans: PlanExperience[];
  memories: PostcardMemory[];
  onSelectPlan: (plan: PlanExperience) => void;
  onCreatePlan: () => void;
  onGoToMapView: () => void;
  onGoToMemories: () => void;
  onSelectMemory: (memory: PostcardMemory) => void;
  onJoinByCode: (code: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  plans,
  memories,
  onSelectPlan,
  onCreatePlan,
  onGoToMapView,
  onGoToMemories,
  onSelectMemory,
  onJoinByCode,
}) => {
  const [inputCode, setInputCode] = React.useState('');
  const [codeError, setCodeError] = React.useState('');

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    const cleanCode = inputCode.trim().toLowerCase();
    const found = plans.find((c) =>
      c.inviteCode.toLowerCase().includes(cleanCode) || c.id.toLowerCase() === cleanCode
    );
    if (found) {
      setCodeError('');
      onSelectPlan(found);
    } else {
      setCodeError('Código no encontrado. Prueba x9f2 u omar-sun');
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-5 overflow-y-auto pb-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-black text-[#3D405B] tracking-tight">PlanMap</h2>
        <p className="text-sm text-slate-500 font-medium">
          Conecta, vive y guarda el momento.
        </p>
      </div>

      {/* Hero Card: Arma un Plan */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#81B29A] via-[#6FA38B] to-[#588B74] text-white p-5 shadow-lg shadow-[#81B29A]/20">
        <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>✨ Arma un Plan</span>
          </div>
          <h3 className="text-xl font-bold tracking-tight mb-1.5">Crea un Encuentro</h3>
          <p className="text-xs text-white/90 leading-relaxed mb-4 max-w-[280px]">
            Organiza un encuentro sin fricción y genera un recuerdo colectivo.
          </p>
          <button
            onClick={onCreatePlan}
            className="w-full py-3 bg-white text-[#3D405B] font-bold rounded-2xl text-sm transition-all hover:bg-slate-50 active:scale-[0.98] shadow-sm flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4 text-[#E07A5F]" />
            <span>Crear Plan</span>
          </button>
        </div>
      </div>

      {/* Quick Join With Code */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200/70 shadow-xs">
        <form onSubmit={handleJoin} className="flex gap-2">
          <input
            type="text"
            value={inputCode}
            onChange={(e) => {
              setInputCode(e.target.value);
              setCodeError('');
            }}
            placeholder="¿Tienes un código? ej. x9f2"
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E07A5F]/40"
          />
          <button
            type="submit"
            className="px-3.5 py-2 bg-[#3D405B] text-white text-xs font-semibold rounded-xl hover:bg-[#2e3146] transition-colors"
          >
            Unirme
          </button>
        </form>
        {codeError && <p className="text-[11px] text-rose-500 mt-1 font-medium">{codeError}</p>}
      </div>

      {/* Planes Activos */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-sm font-bold text-[#3D405B] uppercase tracking-wider">
            Tus Planes Activos ({plans.length})
          </h3>
          <button
            onClick={onGoToMapView}
            className="text-xs font-semibold text-[#E07A5F] hover:underline flex items-center gap-0.5"
          >
            <span>Ver mapa</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {plans.map((plan) => (
            <div
              key={plan.id}
              onClick={() => onSelectPlan(plan)}
              className="group bg-white rounded-2xl p-4 border border-slate-200/70 hover:border-[#E07A5F]/40 shadow-xs hover:shadow-md transition-all cursor-pointer relative"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-lg flex items-center gap-1"
                      style={{
                        backgroundColor: plan.vibe.lightBg,
                        color: plan.vibe.color,
                      }}
                    >
                      <span>{plan.vibe.emoji}</span>
                      <span>{plan.vibe.name}</span>
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3" />
                      <span>{plan.time.split('-')[0]}</span>
                    </span>
                  </div>

                  <h4 className="font-bold text-[#2D3748] text-sm leading-snug group-hover:text-[#E07A5F] transition-colors truncate">
                    {plan.title}
                  </h4>

                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1 truncate max-w-[160px]">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{plan.locationName}</span>
                    </span>
                    <span className="flex items-center gap-1 shrink-0 font-medium text-slate-600">
                      <Users className="w-3.5 h-3.5 text-[#81B29A]" />
                      <span>{plan.participants.length}</span>
                    </span>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-[#FFF5F2] group-hover:text-[#E07A5F] text-slate-400 flex items-center justify-center transition-all shrink-0">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recuerdos Colectivos Recientes */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-sm font-bold text-[#3D405B] uppercase tracking-wider">
            Últimas Postales Guardadas
          </h3>
          <button
            onClick={onGoToMemories}
            className="text-xs font-semibold text-[#81B29A] hover:underline"
          >
            Ver álbum completo
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {memories.slice(0, 2).map((memory) => (
            <div
              key={memory.id}
              onClick={() => onSelectMemory(memory)}
              className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="h-24 w-full relative overflow-hidden bg-slate-100">
                <img
                  src={memory.heroImage}
                  alt={memory.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-xs shadow-xs">
                  {memory.vibeEmoji}
                </span>
              </div>
              <div className="p-2.5">
                <h5 className="font-bold text-xs text-[#2D3748] truncate mb-0.5">{memory.title}</h5>
                <p className="text-[10px] text-slate-400 font-medium truncate">{memory.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
