import React, { useState } from 'react';
import { ArrowLeft, Sparkles, Filter, Calendar, MapPin, Download, Share2 } from 'lucide-react';
import { PostcardMemory } from '../types';
import { downloadPostcardAsImage } from '../utils/postcardCanvas';

interface MemoriesGalleryViewProps {
  memories: PostcardMemory[];
  onSelectMemory: (memory: PostcardMemory) => void;
  onBack: () => void;
}

export const MemoriesGalleryView: React.FC<MemoriesGalleryViewProps> = ({
  memories,
  onSelectMemory,
  onBack,
}) => {
  const [filterVibe, setFilterVibe] = useState<string>('all');

  const filteredMemories =
    filterVibe === 'all'
      ? memories
      : memories.filter((m) => m.vibeName.toLowerCase().includes(filterVibe.toLowerCase()));

  return (
    <div className="flex-1 flex flex-col overflow-y-auto animate-in fade-in duration-300 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#E07A5F] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>
        <span className="text-xs font-bold text-[#E07A5F] bg-[#FFF5F2] px-2.5 py-1 rounded-full">
          Álbum Colectivo ({memories.length})
        </span>
      </div>

      <div className="mb-4">
        <h2 className="text-2xl font-black text-[#3D405B] tracking-tight">Recuerdos</h2>
        <p className="text-xs text-slate-500 font-medium">
          Postales y huellas de las fogatas que has vivido.
        </p>
      </div>

      {/* Filter tags */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
        <button
          onClick={() => setFilterVibe('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
            filterVibe === 'all'
              ? 'bg-[#3D405B] text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Todas ({memories.length})
        </button>
        <button
          onClick={() => setFilterVibe('chill')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
            filterVibe === 'chill'
              ? 'bg-[#E07A5F] text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          ☕ Chill
        </button>
        <button
          onClick={() => setFilterVibe('aire libre')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
            filterVibe === 'aire libre'
              ? 'bg-[#81B29A] text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          🌳 Aire libre
        </button>
        <button
          onClick={() => setFilterVibe('nocturno')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
            filterVibe === 'nocturno'
              ? 'bg-[#3D405B] text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          🌙 Nocturno
        </button>
      </div>

      {/* Postcards Grid */}
      <div className="flex flex-col gap-3.5">
        {filteredMemories.map((m) => (
          <div
            key={m.id}
            onClick={() => onSelectMemory(m)}
            className="group bg-white rounded-3xl p-3.5 border border-slate-200/80 shadow-xs hover:shadow-lg transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="relative h-44 rounded-2xl overflow-hidden mb-3 bg-slate-100">
              <img
                src={m.heroImage}
                alt={m.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

              {/* Top badges */}
              <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-xs text-[#2D3748] shadow-xs">
                  {m.vibeEmoji} {m.vibeName}
                </span>
                <span className="w-7 h-7 rounded-full bg-white/90 backdrop-blur-xs text-[#E07A5F] flex items-center justify-center text-xs font-bold shadow-xs">
                  📮
                </span>
              </div>

              {/* Title on bottom of photo */}
              <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
                <h4 className="font-bold text-sm leading-tight drop-shadow-md">{m.title}</h4>
                <p className="text-[10px] text-white/90 font-medium drop-shadow-sm flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-amber-300" />
                  <span>{m.location}</span>
                </p>
              </div>
            </div>

            {/* Postcard quote preview */}
            <p className="font-handwriting text-base text-[#3D405B] line-clamp-2 italic px-1 mb-2.5">
              {m.quote}
            </p>

            {/* Bottom metadata */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
              <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                <Calendar className="w-3 h-3" />
                <span>{m.date}</span>
              </span>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-[#E07A5F]">
                <span>Ver postal completa</span>
                <span>→</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
