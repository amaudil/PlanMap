import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import confetti from 'canvas-confetti';
import { PlanExperience, PostcardMemory, Vibe } from './types';
import { VIBES, INITIAL_PLANS, INITIAL_MEMORIES } from './data/mockData';
import { downloadPostcardAsImage } from './utils/postcardCanvas';

export default function App() {
  // Current view: 'view-welcome' | 'view-map' | 'view-create' | 'view-invite' | 'view-memory'
  const [currentView, setCurrentView] = useState<string>('view-welcome');

  // Plan state
  const [plans, setPlans] = useState<PlanExperience[]>(INITIAL_PLANS);
  const [activePlan, setActivePlan] = useState<PlanExperience>(INITIAL_PLANS[0]);
  const [selectedVibe, setSelectedVibe] = useState<Vibe>(VIBES[0]);
  const [planTitle, setPlanTitle] = useState<string>('Café y estudio en Casco Antiguo');

  // Memory state
  const [memories, setMemories] = useState<PostcardMemory[]>(INITIAL_MEMORIES);
  const [activeMemory, setActiveMemory] = useState<PostcardMemory>(INITIAL_MEMORIES[0]);

  // Leaflet map reference
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  // UI state
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSavingPostal, setIsSavingPostal] = useState(false);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
      }).setView([8.9824, -79.5199], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      // Clean default user location marker with neon styling
      const neonIcon = L.divIcon({
        className: 'custom-neon-marker',
        html: `
          <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: #CCFF00; opacity: 0.3; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: absolute; width: 20px; height: 20px; border-radius: 50%; background: #CCFF00; border: 3px solid #0A0C0B; box-shadow: 0 0 12px #CCFF00;"></div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const userMarker = L.marker([8.9824, -79.5199], { icon: neonIcon }).addTo(map);
      userMarker.bindPopup(`
        <div style="text-align: center; padding: 2px;">
          <b style="color: #CCFF00; font-size: 13px;">Tú estás aquí ✨</b>
          <p style="color: #8A9590; font-size: 11px; margin-top: 2px;">PlanMap Vivo Dark Pro</p>
        </div>
      `).openPopup();

      mapInstanceRef.current = map;
    }

    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [currentView]);

  // Update map markers when activePlan changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (activePlan) {
      const planIcon = L.divIcon({
        className: 'custom-plan-marker',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
            <div style="width: 42px; height: 42px; border-radius: 50%; background: #161A18; border: 2.5px solid #CCFF00; box-shadow: 0 4px 14px rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; font-size: 20px;">
              ${activePlan.vibe.emoji}
            </div>
            <div style="background: rgba(10, 12, 11, 0.9); border: 1px solid rgba(255,255,255,0.1); color: #CCFF00; font-size: 9px; font-weight: 800; padding: 2px 7px; border-radius: 10px; margin-top: 3px; white-space: nowrap;">
              ${activePlan.title.split(' ')[0]}
            </div>
          </div>
        `,
        iconSize: [44, 52],
        iconAnchor: [22, 26],
      });

      const planMarker = L.marker(activePlan.coordinates, { icon: planIcon }).addTo(mapInstanceRef.current);
      planMarker.bindPopup(`
        <div style="text-align: center; padding: 4px;">
          <b style="color: #FFFFFF; font-size: 13px;">${activePlan.title}</b>
          <p style="color: #CCFF00; font-size: 11px; font-weight: 700; margin: 4px 0 2px;">Vibe: ${activePlan.vibe.emoji} ${activePlan.vibe.name}</p>
          <span style="font-size: 10px; color: #8A9590;">${activePlan.locationName}</span>
        </div>
      `);
      markersRef.current.push(planMarker);
    }
  }, [activePlan]);

  const switchView = (viewId: string) => {
    setCurrentView(viewId);
    if (viewId === 'view-map') {
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 150);
    }
  };

  const generateInvite = () => {
    const randomCode = Math.random().toString(36).substring(2, 6);
    const newPlan: PlanExperience = {
      id: `plan-${Date.now()}`,
      title: planTitle.trim() || 'Café y estudio en Casco Antiguo',
      vibe: selectedVibe,
      locationName: 'Casco Antiguo · Café Unido',
      address: 'Av. A y Calle 4ta, San Felipe',
      city: 'Panamá',
      coordinates: [8.9824, -79.5199],
      date: 'Hoy, 6 Noviembre',
      time: '4:30 PM - 6:30 PM',
      inviteCode: `planmap.app/join/${randomCode}`,
      status: 'active',
      participants: [
        {
          id: 'u-1',
          name: 'Tú',
          avatar: '👤',
          role: 'organizer',
          status: 'arrived',
          lat: 8.9824,
          lng: -79.5199,
          signature: 'Tú ⚡',
        },
        {
          id: 'u-2',
          name: 'Sofía R.',
          avatar: '👩💻',
          role: 'member',
          status: 'on_the_way',
          eta: '5 min',
          lat: 8.9835,
          lng: -79.5185,
          signature: 'Sofía 🌿',
        },
        {
          id: 'u-3',
          name: 'Mateo V.',
          avatar: '🧑🎨',
          role: 'member',
          status: 'on_the_way',
          eta: '8 min',
          lat: 8.9810,
          lng: -79.5210,
          signature: 'Mateo 🚲',
        },
      ],
    };

    setPlans((prev) => [newPlan, ...prev]);
    setActivePlan(newPlan);

    const newMemory: PostcardMemory = {
      id: `mem-${Date.now()}`,
      campfireId: newPlan.id,
      title: newPlan.title,
      vibeEmoji: newPlan.vibe.emoji,
      vibeName: newPlan.vibe.name,
      date: '6 de Noviembre, 2026',
      city: 'Ciudad de Panamá',
      location: 'Panamá',
      heroImage: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
      quote: '“Un espacio libre de ruido para conectar de verdad.”',
      theme: 'twilight',
      stampText: 'PANAMÁ · PLANMAP DARK PRO',
      attendees: [
        { name: 'Tú', avatar: '👤', signature: 'Tú ⚡' },
        { name: 'Sofía', avatar: '👩💻', signature: 'Sofía R.' },
        { name: 'Mateo', avatar: '🧑🎨', signature: 'Mateo V.' },
      ],
    };

    setMemories((prev) => [newMemory, ...prev]);
    setActiveMemory(newMemory);

    switchView('view-invite');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://${activePlan?.inviteCode || 'planmap.app/join/x9f2'}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const handleSavePostal = async () => {
    setIsSavingPostal(true);
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#CCFF00', '#B5E600', '#FFFFFF', '#161A18'],
    });
    try {
      await downloadPostcardAsImage(activeMemory);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingPostal(false);
    }
  };

  const handleSharePostal = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Postal Colectiva: ${activeMemory.title}`,
          text: `${activeMemory.title} · ${activeMemory.quote}`,
          url: window.location.href,
        });
        return;
      } catch {
        // Fallback
      }
    }
    navigator.clipboard.writeText(`💌 Postal Colectiva PlanMap: "${activeMemory.title}"\n${activeMemory.quote}`);
    alert('¡Enlace copiado al portapapeles!');
  };

  return (
    <div className="min-h-screen bg-[#030404] flex items-center justify-center p-0 md:p-4 select-none">
      <div
        id="app"
        className="bg-[#0A0C0B] w-full max-w-[410px] h-screen md:h-[840px] relative overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] md:rounded-[44px] flex flex-col border border-white/[0.08]"
      >
        {/* ========================================
           VISTA 0: BIENVENIDA (PRO UI)
           ======================================== */}
        <div
          id="view-welcome"
          className={`view absolute inset-0 w-full h-full flex flex-col justify-between p-[28px_22px_36px_22px] bg-gradient-to-b from-[#111513] to-[#0A0C0B] transition-all duration-300 ${
            currentView === 'view-welcome' ? 'active' : 'hidden'
          }`}
        >
          {/* Welcome Hero Card */}
          <div className="welcome-hero-card w-full h-[340px] bg-[#161A18] rounded-[32px] overflow-hidden relative border border-white/[0.08] shadow-[0_16px_32px_rgba(0,0,0,0.4)]">
            <img
              src="https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80"
              alt="PlanMap Hero"
              className="welcome-hero-img w-full h-full object-cover filter brightness-[0.85] contrast-[1.05]"
            />
            <div className="hero-gradient-overlay absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-[#161A18]/95 to-transparent flex items-end p-5">
              <span className="text-xs font-mono font-bold tracking-wider text-[#CCFF00] bg-[#0A0C0B]/80 px-2.5 py-1 rounded-full border border-[#CCFF00]/20">
                LIVE SPATIAL SOCIAL
              </span>
            </div>
          </div>

          {/* Copy section */}
          <div>
            <h1 className="welcome-title text-[2.1rem] font-extrabold leading-[1.15] tracking-[-0.6px] mt-4 text-white">
              Conecta en vivo.<br />
              <span className="text-[#CCFF00]">Arma el plan.</span>
            </h1>
            <p className="welcome-subtitle text-[0.92rem] text-[#8A9590] mt-2.5 leading-[1.5]">
              Encuentros sin fricción. Mira a tus amigos en camino sobre el mapa en tiempo real y guarda el recuerdo colectivo.
            </p>
          </div>

          {/* Action button */}
          <div>
            <button
              className="btn-neon w-full bg-[#CCFF00] hover:bg-[#B5E600] text-[#0A0C0B] p-[18px] rounded-[24px] text-[1.05rem] font-extrabold border-none cursor-pointer text-center shadow-[0_10px_30px_rgba(204,255,0,0.25)] active:scale-[0.97] transition-transform duration-150"
              onClick={() => switchView('view-map')}
            >
              Explorar Mapa en Vivo →
            </button>
          </div>
        </div>

        {/* ========================================
           VISTA 1: MAPA VIVO (Dark Pro)
           ======================================== */}
        <div
          id="view-map"
          className={`view absolute inset-0 w-full h-full flex flex-col transition-all duration-300 ${
            currentView === 'view-map' ? 'active' : 'hidden'
          }`}
        >
          {/* Map canvas with dark invert filter */}
          <div
            id="map-container"
            ref={mapContainerRef}
            className="dark-leaflet-map absolute inset-0 w-full h-full z-1"
          />

          {/* Header flotante limpio */}
          <div className="map-overlay-top absolute top-0 left-0 w-full p-6 flex justify-between items-center z-10 pointer-events-none">
            <div className="brand-pill pointer-events-auto bg-[#161A18]/90 backdrop-blur-md px-4 py-2 rounded-full font-bold text-sm text-white border border-white/[0.08] shadow-lg flex items-center gap-1.5">
              <span>PlanMap</span>
              <span className="text-[#CCFF00]">✨</span>
            </div>

            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                className="icon-btn w-11 h-11 bg-[#161A18]/90 backdrop-blur-md rounded-full flex items-center justify-center text-lg text-white border border-white/[0.08] shadow-lg cursor-pointer hover:bg-[#202623] active:scale-95 transition-all"
                onClick={() => switchView('view-welcome')}
                title="Ver Bienvenida"
              >
                🏠
              </button>
              <button
                className="icon-btn w-11 h-11 bg-[#161A18]/90 backdrop-blur-md rounded-full flex items-center justify-center text-lg text-white border border-white/[0.08] shadow-lg cursor-pointer hover:bg-[#202623] active:scale-95 transition-all"
                onClick={() => switchView('view-memory')}
                title="Ver Recuerdos Colectivos"
              >
                🖼️
              </button>
            </div>
          </div>

          {/* Píldora de acción principal abajo */}
          <div className="map-overlay-bottom absolute bottom-8 left-0 w-full px-5 z-10 flex flex-col gap-3 pointer-events-none">
            <div
              className="action-pill pointer-events-auto bg-[#161A18]/95 hover:bg-[#202623] border border-white/[0.1] text-white rounded-full py-4 px-6 flex justify-between items-center cursor-pointer shadow-[0_12px_32px_rgba(0,0,0,0.8)] active:scale-[0.98] transition-all"
              onClick={() => switchView('view-create')}
            >
              <span className="font-bold text-[1.05rem] tracking-tight">¿Cuál es el plan hoy?</span>
              <div className="action-arrow w-8 h-8 bg-[#CCFF00] text-[#0A0C0B] rounded-full flex items-center justify-center text-sm font-black shadow-sm">
                →
              </div>
            </div>
          </div>
        </div>

        {/* ========================================
           VISTA 2: CREAR PLAN (Elegir Vibe y Título)
           ======================================== */}
        <div
          id="view-create"
          className={`solid-view absolute inset-0 w-full h-full p-6 bg-[#0A0C0B] z-20 flex flex-col overflow-y-auto transition-all duration-300 ${
            currentView === 'view-create' ? 'active' : 'hidden'
          }`}
        >
          <div className="flex justify-between items-center mb-4">
            <h3
              className="cursor-pointer text-sm font-semibold text-[#8A9590] hover:text-white transition-colors"
              onClick={() => switchView('view-map')}
            >
              ← Cancelar
            </h3>
            <span className="font-bold text-[#CCFF00] text-xs bg-[#CCFF00]/10 px-2.5 py-1 rounded-full border border-[#CCFF00]/20">
              Paso 1 de 2
            </span>
          </div>

          <h1 className="text-[1.8rem] font-extrabold text-white mb-1">Nuevo Plan</h1>
          <p className="subtitle text-sm text-[#8A9590] mb-6">Elige el tono de tu salida con amigos.</p>

          <div className="mb-5">
            <label className="text-xs font-bold text-white block mb-2">
              ¿Qué van a hacer?
            </label>
            <input
              type="text"
              id="plan-title"
              value={planTitle}
              onChange={(e) => setPlanTitle(e.target.value)}
              placeholder="Ej. Café y estudio en Casco Antiguo"
              className="w-full p-4 rounded-2xl border border-white/[0.08] text-sm font-semibold outline-none bg-[#161A18] text-white focus:border-[#CCFF00] transition-colors"
            />
          </div>

          <label className="text-xs font-bold text-white block mb-2.5">
            Selecciona la Vibe
          </label>
          <div className="vibe-grid grid grid-cols-2 gap-3 mb-6">
            {VIBES.map((vibe) => {
              const isSelected = selectedVibe.id === vibe.id;
              return (
                <div
                  key={vibe.id}
                  onClick={() => setSelectedVibe(vibe)}
                  className={`vibe-option p-4 rounded-2xl border transition-all text-center cursor-pointer ${
                    isSelected
                      ? 'border-[#CCFF00] bg-[#CCFF00]/10 shadow-[0_0_15px_rgba(204,255,0,0.15)]'
                      : 'border-white/[0.08] bg-[#161A18] hover:border-white/[0.2]'
                  }`}
                >
                  <div className="vibe-emoji text-3xl mb-1.5">{vibe.emoji}</div>
                  <div className="vibe-name font-bold text-sm text-white">{vibe.name}</div>
                </div>
              );
            })}
          </div>

          <div className="mt-auto pt-2">
            <button
              className="btn-neon w-full bg-[#CCFF00] hover:bg-[#B5E600] text-[#0A0C0B] p-[18px] rounded-[24px] text-[1.05rem] font-extrabold border-none cursor-pointer text-center shadow-[0_10px_30px_rgba(204,255,0,0.25)] active:scale-[0.97] transition-transform duration-150"
              onClick={generateInvite}
            >
              Armar enlace de invitación
            </button>
          </div>
        </div>

        {/* ========================================
           VISTA 3: SALA DE INVITACIÓN
           ======================================== */}
        <div
          id="view-invite"
          className={`solid-view absolute inset-0 w-full h-full p-6 bg-[#0A0C0B] z-20 flex flex-col overflow-y-auto transition-all duration-300 ${
            currentView === 'view-invite' ? 'active' : 'hidden'
          }`}
        >
          <div className="flex justify-between items-center mb-4">
            <h3
              className="cursor-pointer text-sm font-semibold text-[#8A9590] hover:text-white transition-colors"
              onClick={() => switchView('view-map')}
            >
              ✕ Cerrar
            </h3>
            <span className="text-xs bg-[#CCFF00]/10 text-[#CCFF00] px-3 py-1.5 rounded-xl font-bold border border-[#CCFF00]/25">
              Plan Activo
            </span>
          </div>

          <h1 className="text-[1.8rem] font-extrabold text-white mb-1">¡Plan listo para rodar! 🔥</h1>
          <p className="subtitle text-sm text-[#8A9590] mb-6" id="invite-subtitle">
            Vibe: {selectedVibe.emoji} {selectedVibe.name}
          </p>

          <div className="card bg-[#161A18] rounded-3xl p-5 shadow-xs mb-4 text-center border-2 border-dashed border-[#CCFF00]/60">
            <p className="text-xs text-[#8A9590] mb-1.5 font-medium">
              Enlace rápido para compartir por WhatsApp
            </p>
            <h3 className="text-lg font-bold text-[#CCFF00] mb-3 font-mono">
              {activePlan?.inviteCode || 'planmap.app/join/x9f2'}
            </h3>
            <button
              className="w-full bg-[#0A0C0B] text-white border border-white/[0.12] hover:bg-black p-3.5 rounded-2xl text-sm font-bold cursor-pointer transition-colors"
              onClick={handleCopyLink}
            >
              {copiedLink ? '¡Enlace copiado al portapapeles!' : 'Copiar Enlace'}
            </button>
          </div>

          <div className="card bg-[#161A18] rounded-3xl p-5 shadow-xs mb-4 border border-white/[0.08]">
            <h4 className="text-sm font-bold text-white mb-3">
              Amigos en camino ({activePlan?.participants.length || 3})
            </h4>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-[#0A0C0B] border border-white/[0.1] flex items-center justify-center text-base">
                👤
              </div>
              <div className="w-10 h-10 rounded-full bg-[#0A0C0B] border border-white/[0.1] flex items-center justify-center text-base">
                👩💻
              </div>
              <div className="w-10 h-10 rounded-full bg-[#0A0C0B] border border-white/[0.1] flex items-center justify-center text-base">
                🧑🎨
              </div>
              <span className="text-xs text-[#8A9590] ml-2 font-medium">+ Tú organizando</span>
            </div>
          </div>

          <div className="mt-auto pt-2">
            <button
              className="btn-neon w-full bg-[#CCFF00] hover:bg-[#B5E600] text-[#0A0C0B] p-[18px] rounded-[24px] text-[1.05rem] font-extrabold border-none cursor-pointer text-center shadow-[0_10px_30px_rgba(204,255,0,0.25)] active:scale-[0.97] transition-transform duration-150"
              onClick={() => switchView('view-map')}
            >
              Volver al Mapa Vivo
            </button>
          </div>
        </div>

        {/* ========================================
           VISTA 4: RECUERDO COLECTIVO (POSTAL)
           ======================================== */}
        <div
          id="view-memory"
          className={`solid-view absolute inset-0 w-full h-full p-6 bg-[#0A0C0B] z-20 flex flex-col overflow-y-auto transition-all duration-300 ${
            currentView === 'view-memory' ? 'active' : 'hidden'
          }`}
        >
          <div className="flex justify-between items-center mb-4">
            <h3
              className="cursor-pointer text-sm font-semibold text-[#8A9590] hover:text-white transition-colors"
              onClick={() => switchView('view-map')}
            >
              ← Volver al Mapa
            </h3>
            <span className="font-bold text-white text-sm">Recuerdo Colectivo</span>
          </div>

          <div className="postal-card bg-gradient-to-br from-[#161A18] to-[#0A0C0B] border border-[#CCFF00]/30 text-white p-6 rounded-3xl text-center mb-4 shadow-[0_12px_28px_rgba(0,0,0,0.6)]">
            <div className="postal-img-placeholder w-full h-44 bg-black/40 rounded-2xl flex items-center justify-center text-5xl mb-4 border border-white/[0.06] shadow-inner">
              🌅
            </div>
            <h3 className="text-xl font-extrabold mb-1" id="postal-title">
              {activeMemory.title || 'Café y Estudio en Casco'}
            </h3>
            <p className="text-xs text-[#8A9590] font-medium">Panamá · 6 de Noviembre, 2026</p>
          </div>

          <div className="card bg-[#161A18] rounded-3xl p-5 shadow-xs mb-4 border border-white/[0.08]">
            <p className="text-sm italic text-center text-[#8A9590] leading-relaxed">
              “Un espacio libre de ruido para conectar de verdad.”
            </p>
          </div>

          <div className="mt-auto pt-2 flex gap-3">
            <button
              className="flex-1 bg-transparent text-white border-2 border-white/[0.12] hover:bg-white/[0.05] p-4 rounded-2xl text-sm font-bold cursor-pointer transition-colors"
              onClick={handleSavePostal}
              disabled={isSavingPostal}
            >
              {isSavingPostal ? 'Guardando...' : 'Guardar Postal'}
            </button>
            <button
              className="btn-neon flex-1 bg-[#CCFF00] hover:bg-[#B5E600] text-[#0A0C0B] border-none p-4 rounded-2xl text-sm font-extrabold cursor-pointer shadow-lg active:scale-[0.98] transition-all"
              onClick={handleSharePostal}
            >
              Compartir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
