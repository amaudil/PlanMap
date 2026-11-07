import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { ArrowLeft, Download, Share2, Sparkles, Image, Check, Heart, Camera, Music, RefreshCw } from 'lucide-react';
import { PostcardMemory, CampfireExperience } from '../types';
import { SAMPLE_POSTCARD_PHOTOS } from '../data/mockData';
import { downloadPostcardAsImage } from '../utils/postcardCanvas';
import { soundManager } from '../utils/audio';

interface MemoryPostalViewProps {
  memory: PostcardMemory;
  onBack: () => void;
  onSaveToAlbum: (updatedMemory: PostcardMemory) => void;
  campfireSource?: CampfireExperience | null;
}

const THEMES = [
  { id: 'terracotta', label: 'Terracotta', bg: 'from-[#E07A5F] to-[#C8644A]', text: 'text-white' },
  { id: 'sage', label: 'Sage Verde', bg: 'from-[#81B29A] to-[#588B74]', text: 'text-white' },
  { id: 'twilight', label: 'Crepúsculo', bg: 'from-[#3D405B] to-[#2D3748]', text: 'text-white' },
  { id: 'sand', label: 'Arena Cálida', bg: 'from-[#F4F1DE] to-[#E5DFC5]', text: 'text-[#3D405B]' },
];

const INSPIRATIONAL_QUOTES = [
  '“Un espacio para desconectar del ruido y conectar de verdad.”',
  '“Las mejores historias ocurren cuando dejamos las pantallas a un lado.”',
  '“Caminar juntos, hablar sin prisa y celebrar el presente.”',
  '“El café sabe mejor cuando viene acompañado de risas compartidas.”',
  '“Atardeceres que se quedan grabados en la memoria colectiva.”',
];

export const MemoryPostalView: React.FC<MemoryPostalViewProps> = ({
  memory: initialMemory,
  onBack,
  onSaveToAlbum,
}) => {
  const [memory, setMemory] = useState<PostcardMemory>(initialMemory);
  const [isEditingQuote, setIsEditingQuote] = useState(false);
  const [customQuote, setCustomQuote] = useState(initialMemory.quote);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [showPhotoSelector, setShowPhotoSelector] = useState(false);

  React.useEffect(() => {
    // Blast celebratory confetti on arrival
    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#E07A5F', '#81B29A', '#F4A261', '#3D405B'],
    });
    soundManager.playChime();
  }, []);

  const handleSelectPhoto = (url: string) => {
    const updated = { ...memory, heroImage: url };
    setMemory(updated);
    onSaveToAlbum(updated);
    setShowPhotoSelector(false);
  };

  const handleUploadCustomPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          const updated = { ...memory, heroImage: uploadEvent.target.result as string };
          setMemory(updated);
          onSaveToAlbum(updated);
          setShowPhotoSelector(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleShuffleQuote = () => {
    const filtered = INSPIRATIONAL_QUOTES.filter((q) => q !== customQuote);
    const randomQ = filtered[Math.floor(Math.random() * filtered.length)];
    setCustomQuote(randomQ);
    const updated = { ...memory, quote: randomQ };
    setMemory(updated);
    onSaveToAlbum(updated);
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    soundManager.playChime();
    try {
      await downloadPostcardAsImage(memory);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Postal Colectiva: ${memory.title}`,
          text: `${memory.title} - ${memory.quote} en ${memory.location}`,
          url: window.location.href,
        });
      } catch {
        // Fallback to copy
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(
      `💌 Postal Colectiva PlanMap: "${memory.title}" en ${memory.location} (${memory.date})\n${memory.quote}`
    );
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  const selectedTheme = THEMES.find((t) => t.id === memory.theme) || THEMES[2];

  return (
    <div className="flex-1 flex flex-col overflow-y-auto animate-in fade-in duration-300 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#E07A5F] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Inicio</span>
        </button>
        <span className="text-xs font-bold text-[#3D405B] flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Recuerdo Colectivo
        </span>
      </div>

      {/* Main Postal Card */}
      <div
        className={`relative rounded-3xl p-5 shadow-xl transition-all duration-300 bg-gradient-to-br ${selectedTheme.bg} ${selectedTheme.text} mb-4 overflow-hidden border border-white/20`}
      >
        {/* Subtle decorative postal postmark */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {/* Postmark stamp */}
          <div className="w-14 h-16 bg-white/95 rounded-lg border-2 border-dashed border-[#E07A5F] p-1 flex flex-col items-center justify-between shadow-md rotate-3">
            <span className="text-[8px] font-bold text-[#E07A5F] tracking-tighter uppercase">
              PLANMAP
            </span>
            <span className="text-xl">{memory.vibeEmoji}</span>
            <span className="text-[7px] font-semibold text-slate-500 uppercase">OFICIAL</span>
          </div>
          {/* Postmark cancellation circle */}
          <div className="w-12 h-12 rounded-full border border-white/50 flex flex-col items-center justify-center text-[7px] text-white/80 font-mono tracking-tighter -rotate-12">
            <span>PANAMÁ</span>
            <span className="font-bold">2026</span>
          </div>
        </div>

        {/* Hero Image / Photo */}
        <div className="relative w-full h-44 rounded-2xl overflow-hidden mb-3.5 bg-black/20 shadow-inner group">
          <img
            src={memory.heroImage}
            alt={memory.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <button
            onClick={() => setShowPhotoSelector(!showPhotoSelector)}
            className="absolute bottom-2.5 right-2.5 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-[11px] font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Cambiar foto</span>
          </button>
        </div>

        {/* Title & metadata */}
        <div className="mb-3 pr-24">
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-xs inline-block mb-1">
            {memory.vibeEmoji} {memory.vibeName}
          </span>
          <h3 className="text-lg font-black tracking-tight leading-snug">{memory.title}</h3>
          <p className="text-xs opacity-90 mt-0.5 font-medium">
            {memory.location} · {memory.date}
          </p>
        </div>

        {/* Quote inside postcard */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 mb-3.5">
          <p className="font-handwriting text-lg md:text-xl text-center italic leading-relaxed">
            {customQuote}
          </p>
          <div className="flex justify-center mt-1">
            <button
              onClick={handleShuffleQuote}
              className="text-[10px] opacity-75 hover:opacity-100 flex items-center gap-1 transition-opacity pt-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Inspirar otra frase</span>
            </button>
          </div>
        </div>

        {/* Attendees Signatures */}
        <div>
          <span className="text-[10px] uppercase tracking-wider font-bold opacity-75 block mb-1.5">
            Firmas del grupo ({memory.attendees.length}):
          </span>
          <div className="flex flex-wrap gap-2">
            {memory.attendees.map((att, i) => (
              <span
                key={i}
                className="font-handwriting text-base px-2.5 py-0.5 rounded-lg bg-white/15 backdrop-blur-xs border border-white/20"
              >
                ✍️ {att.signature || att.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Photo Selector Drawer if active */}
      {showPhotoSelector && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 mb-4 shadow-sm animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-[#3D405B]">Elige una foto para tu postal</h4>
            <label className="text-xs text-[#E07A5F] font-bold cursor-pointer hover:underline flex items-center gap-1">
              <Camera className="w-3.5 h-3.5" />
              <span>Subir de tu cámara/galería</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadCustomPhoto}
                className="hidden"
              />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {SAMPLE_POSTCARD_PHOTOS.map((p) => (
              <div
                key={p.id}
                onClick={() => handleSelectPhoto(p.url)}
                className="relative h-20 rounded-xl overflow-hidden cursor-pointer border-2 hover:border-[#E07A5F] transition-all group"
              >
                <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
                <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white px-1 rounded truncate max-w-[85%]">
                  {p.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Theme Picker */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 mb-4 shadow-xs">
        <label className="text-xs font-bold text-[#3D405B] block mb-2">
          Estilo y Color de la Postal
        </label>
        <div className="flex gap-2">
          {THEMES.map((th) => (
            <button
              key={th.id}
              onClick={() => {
                const updated = { ...memory, theme: th.id as any };
                setMemory(updated);
                onSaveToAlbum(updated);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                memory.theme === th.id
                  ? 'border-[#3D405B] shadow-sm ring-2 ring-[#3D405B]/20 scale-102'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {th.label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary Actions: Guardar (PNG export) & Compartir */}
      <div className="mt-auto pt-2 flex gap-2.5">
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex-1 py-3.5 bg-white border-2 border-[#E07A5F] text-[#E07A5F] hover:bg-[#FFF5F2] font-bold rounded-2xl text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-[0.98]"
        >
          <Download className="w-4 h-4" />
          <span>{isDownloading ? 'Generando...' : 'Guardar Postal'}</span>
        </button>

        <button
          onClick={handleShare}
          className="flex-1 py-3.5 bg-[#E07A5F] hover:bg-[#d66f54] text-white font-bold rounded-2xl text-xs transition-all shadow-md shadow-[#E07A5F]/25 flex items-center justify-center gap-1.5 active:scale-[0.98]"
        >
          <Share2 className="w-4 h-4" />
          <span>{copiedShare ? '¡Copiado!' : 'Compartir'}</span>
        </button>
      </div>
    </div>
  );
};
