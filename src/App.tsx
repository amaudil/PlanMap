import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import confetti from 'canvas-confetti';
import { PlanExperience, PostcardMemory, Vibe } from './types';
import { VIBES, INITIAL_PLANS, INITIAL_MEMORIES } from './data/mockData';
import { downloadPostcardAsImage } from './utils/postcardCanvas';

export default function App() {
  // Current active view: 'view-welcome' | 'view-map' | 'view-create' | 'view-invite' | 'view-memory'
  const [currentView, setCurrentView] = useState<string>(() => {
    return localStorage.getItem('planmap_onboarding_seen') ? 'view-map' : 'view-welcome';
  });

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

      // Clean default user location marker with neon accent
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
          <p style="color: #8A9590; font-size: 11px; margin-top: 2px;">PlanMap en Vivo</p>
        </div>
      `).openPopup();

      mapInstanceRef.current = map;
    }

    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 300);

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
      }, 300);
    }
  };

  const completeOnboarding = () => {
    localStorage.setItem('planmap_onboarding_seen', 'true');
    switchView('view-map');
  };

  const goToCreatePlan = () => {
    switchView('view-create');
  };

  const goToMemory = () => {
    switchView('view-memory');
  };

  const selectVibe = (vibe: Vibe) => {
    setSelectedVibe(vibe);
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
      inviteCode: `planealo-aqui.netlify.app/join/${randomCode}`,
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
    const rawCode = activePlan?.inviteCode || 'planealo-aqui.netlify.app/join/x9f2';
    const fullUrl = rawCode.startsWith('http') ? rawCode : `https://${rawCode}`;
    navigator.clipboard.writeText(fullUrl);
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
    <div className="min-h-screen bg-[#030404] flex justify-center items-center overflow-hidden w-full select-none">
      <div
        id="app"
        className="bg-[#0A0C0B] w-full max-w-[410px] h-[100dvh] max-h-[850px] relative overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] flex flex-col md:rounded-[44px] md:h-[840px] md:border-2 md:border-white/[0.08]"
      >
        {/* ========================================
             VISTA 0: BIENVENIDA (PRO UI & RESPONSIVE)
             ======================================== */}
        <div
          id="view-welcome"
          className={`view absolute inset-0 w-full h-full flex flex-col justify-between p-[max(24px,env(safe-area-inset-top))_20px_max(24px,env(safe-area-inset-bottom))_20px] bg-gradient-to-b from-[#111513] to-[#0A0C0B] overflow-y-auto transition-all duration-300 ${
            currentView === 'view-welcome' ? 'active' : 'hidden'
          }`}
        >
          <div>
            <div className="welcome-hero-card w-full h-[300px] min-h-[250px] bg-[#161A18] rounded-[28px] overflow-hidden relative border border-white/[0.08] shadow-[0_16px_32px_rgba(0,0,0,0.4)] shrink-0">
              <img
                src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80"
                alt="Experiencia compartida"
                className="welcome-hero-img w-full h-full object-cover filter brightness-[0.85] contrast-[1.05]"
              />
              <div className="hero-gradient-overlay absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-[#161A18]/90 to-transparent"></div>
            </div>
            <h1 className="welcome-title text-[clamp(1.8rem,5vw,2.2rem)] font-extrabold leading-[1.15] tracking-[-0.6px] mt-4 text-white">
              Conecta sin ruido, vive el momento.
            </h1>
            <p className="welcome-subtitle text-[0.9rem] text-[#8A9590] mt-2 leading-[1.4]">
              Organiza planes al instante, reúne a tu gente y conserva recuerdos significativos.
            </p>
          </div>

          <div className="mt-5">
            <button
              className="btn-neon w-full bg-[#CCFF00] hover:bg-[#B5E600] text-[#0A0C0B] p-4 rounded-[22px] text-[1.05rem] font-extrabold border-none cursor-pointer text-center shadow-[0_10px_30px_rgba(204,255,0,0.25)] active:scale-[0.97] transition-transform duration-150"
              onClick={completeOnboarding}
            >
              Comenzar
            </button>
            <p className="text-center text-[0.85rem] text-[#8A9590] mt-3">
              ¿Ya tienes cuenta?{' '}
              <span
                className="text-white font-bold cursor-pointer hover:underline"
                onClick={completeOnboarding}
              >
                Iniciar sesión
              </span>
            </p>
          </div>
        </div>

        {/* ========================================
             VISTA 1: MAPA VIVO
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

          {/* Header flotante */}
          <div className="map-overlay-top absolute top-0 left-0 w-full p-[max(20px,env(safe-area-inset-top))_20px_20px_20px] flex justify-between items-center z-10 pointer-events-none">
            <div className="brand-pill-dark pointer-events-auto bg-[#161A18]/85 backdrop-blur-[16px] px-[18px] py-[10px] rounded-[30px] font-extrabold text-base text-white border border-white/[0.08] shadow-[0_8px_24px_rgba(0,0,0,0.4)] flex items-center gap-1.5">
              <span>PlanMap</span>
              <span className="text-[#CCFF00]">⚡</span>
            </div>

            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                className="icon-btn-dark w-[46px] h-[46px] bg-[#161A18]/85 backdrop-blur-[16px] rounded-full flex items-center justify-center text-[1.2rem] text-white border border-white/[0.08] shadow-[0_8px_24px_rgba(0,0,0,0.4)] cursor-pointer hover:bg-[#222825] active:scale-95 transition-all"
                onClick={() => switchView('view-welcome')}
                title="Ver Bienvenida"
              >
                🏠
              </button>
              <button
                className="icon-btn-dark w-[46px] h-[46px] bg-[#161A18]/85 backdrop-blur-[16px] rounded-full flex items-center justify-center text-[1.2rem] text-white border border-white/[0.08] shadow-[0_8px_24px_rgba(0,0,0,0.4)] cursor-pointer hover:bg-[#222825] active:scale-95 transition-all"
                onClick={goToMemory}
                title="Ver Recuerdos Colectivos"
              >
                🖼️
              </button>
            </div>
          </div>

          {/* Píldora inferior flotante */}
          <div className="map-overlay-bottom absolute bottom-[max(25px,env(safe-area-inset-bottom))] left-0 w-full px-5 z-10 pointer-events-none">
            <div
              className="action-pill-neon pointer-events-auto bg-[#CCFF00] hover:bg-[#B5E600] text-[#0A0C0B] rounded-[32px] p-[16px_22px] flex justify-between items-center cursor-pointer shadow-[0_14px_35px_rgba(204,255,0,0.35)] font-extrabold text-[1.05rem] active:scale-[0.97] transition-transform duration-150"
              onClick={goToCreatePlan}
            >
              <span>¿Cuál es el plan hoy?</span>
              <div className="action-arrow-dark w-9 h-9 bg-[#0A0C0B]/12 rounded-full flex items-center justify-center text-base">
                →
              </div>
            </div>
          </div>
        </div>

        {/* ========================================
             VISTA 2: CREAR PLAN
             ======================================== */}
        <div
          id="view-create"
          className={`solid-view absolute inset-0 w-full h-full p-[max(24px,env(safe-area-inset-top))_20px_max(24px,env(safe-area-inset-bottom))_20px] bg-[#0A0C0B] z-20 flex flex-col overflow-y-auto transition-all duration-250 ${
            currentView === 'view-create' ? 'active' : 'hidden'
          }`}
        >
          <div className="flex justify-between items-center mb-3">
            <h3
              className="cursor-pointer text-[0.95rem] text-[#8A9590] hover:text-white transition-colors"
              onClick={() => switchView('view-map')}
            >
              ← Cancelar
            </h3>
            <span className="font-extrabold text-[#CCFF00] text-[0.9rem]">Paso 1 de 2</span>
          </div>

          <h1 className="text-[1.7rem] font-extrabold text-white mb-1 tracking-[-0.5px]">Nuevo Plan</h1>
          <p className="subtitle text-[0.9rem] text-[#8A9590] mb-5">Define la vibra y el propósito del encuentro.</p>

          <div className="mb-4">
            <label className="text-[0.85rem] font-bold block mb-1.5 text-white">¿Qué van a hacer?</label>
            <input
              type="text"
              id="plan-title"
              className="input-dark w-full p-4 rounded-[18px] border border-white/[0.08] bg-[#161A18] text-white text-base outline-none focus:border-[#CCFF00] transition-colors"
              value={planTitle}
              onChange={(e) => setPlanTitle(e.target.value)}
            />
          </div>

          <label className="text-[0.85rem] font-bold block mb-2.5 text-white">Selecciona la Vibe</label>
          <div className="vibe-grid grid grid-cols-2 gap-2.5 mb-5">
            {VIBES.map((vibe) => {
              const isSelected = selectedVibe.id === vibe.id;
              return (
                <div
                  key={vibe.id}
                  onClick={() => selectVibe(vibe)}
                  className={`vibe-option-dark bg-[#161A18] border-2 rounded-[20px] p-[16px_10px] text-center cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'selected border-[#CCFF00] bg-[rgba(204,255,0,0.06)]'
                      : 'border-white/[0.08] hover:border-white/[0.2]'
                  }`}
                >
                  <div className="vibe-emoji text-[2rem] mb-1.5">{vibe.emoji}</div>
                  <div className="vibe-name font-bold text-[0.9rem] text-white">{vibe.name}</div>
                </div>
              );
            })}
          </div>

          <div className="view-footer mt-auto pt-2.5">
            <button
              className="btn-neon w-full bg-[#CCFF00] hover:bg-[#B5E600] text-[#0A0C0B] p-4 rounded-[22px] text-[1.05rem] font-extrabold border-none cursor-pointer text-center shadow-[0_10px_30px_rgba(204,255,0,0.25)] active:scale-[0.97] transition-transform duration-150"
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
          className={`solid-view absolute inset-0 w-full h-full p-[max(24px,env(safe-area-inset-top))_20px_max(24px,env(safe-area-inset-bottom))_20px] bg-[#0A0C0B] z-20 flex flex-col overflow-y-auto transition-all duration-250 ${
            currentView === 'view-invite' ? 'active' : 'hidden'
          }`}
        >
          <div className="flex justify-between items-center mb-3">
            <h3
              className="cursor-pointer text-[0.95rem] text-[#8A9590] hover:text-white transition-colors"
              onClick={() => switchView('view-map')}
            >
              ✕ Cerrar
            </h3>
            <span className="text-[0.85rem] bg-[rgba(204,255,0,0.1)] text-[#CCFF00] px-3 py-1.5 rounded-xl font-extrabold border border-[#CCFF00]/20">
              Plan Activo
            </span>
          </div>

          <h1 className="text-[1.7rem] font-extrabold text-white mb-1 tracking-[-0.5px]">¡Plan listo para rodar! 🔥</h1>
          <p className="subtitle text-[0.9rem] text-[#8A9590] mb-5" id="invite-subtitle">
            Vibe: {selectedVibe.emoji} {selectedVibe.name} · {activePlan?.locationName}
          </p>

          <div className="card-dark bg-[#161A18] rounded-[24px] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.3)] mb-3.5 border-2 border-dashed border-[#CCFF00]/70 text-center">
            <p className="text-[0.85rem] text-[#8A9590] mb-1.5 font-medium">Enlace rápido para compartir</p>
            <h3 className="text-[#CCFF00] mb-3 text-[1.15rem] font-mono font-bold select-all break-all">
              {activePlan?.inviteCode || 'planealo-aqui.netlify.app/join/x9f2'}
            </h3>
            <div className="flex gap-2">
              <button
                className="btn-neon flex-1 bg-[#CCFF00] hover:bg-[#B5E600] text-[#0A0C0B] p-2.5 rounded-[18px] text-[0.95rem] font-extrabold border-none cursor-pointer shadow-md active:scale-[0.97]"
                onClick={handleCopyLink}
              >
                {copiedLink ? '✓ Copiado' : 'Copiar Enlace'}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `¡Súmate al plan en PlanMap! 🔥 "${activePlan.title}" en ${activePlan.locationName}. Únete aquí: ${
                    (activePlan?.inviteCode || 'planealo-aqui.netlify.app/join/x9f2').startsWith('http')
                      ? activePlan?.inviteCode
                      : `https://${activePlan?.inviteCode || 'planealo-aqui.netlify.app/join/x9f2'}`
                  }`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#25D366] hover:bg-[#20ba59] text-white px-3.5 py-2.5 rounded-[18px] text-[0.95rem] font-extrabold flex items-center justify-center no-underline active:scale-[0.97] transition-all"
                title="Compartir por WhatsApp"
              >
                WhatsApp
              </a>
            </div>
          </div>

          <div className="card-dark bg-[#161A18] rounded-[24px] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.3)] mb-3.5 border border-white/[0.08]">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-[0.95rem] text-white font-bold">
                Amigos en camino ({activePlan?.participants.length || 3})
              </h4>
              <span className="text-[0.78rem] text-[#CCFF00] font-semibold">● 3 activos</span>
            </div>
            <div className="space-y-2.5">
              {activePlan?.participants.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-[34px] h-[34px] rounded-full bg-[#222825] border border-white/[0.08] flex items-center justify-center text-sm">
                      {p.avatar}
                    </div>
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        {p.name}
                        {p.role === 'organizer' && (
                          <span className="text-[9px] bg-[#CCFF00]/15 text-[#CCFF00] px-1.5 py-0.5 rounded-md font-bold">
                            Host
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#8A9590]">
                        {p.status === 'arrived' ? 'En el punto de encuentro' : `En camino · Llega en ${p.eta || 'unos min'}`}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-[#8A9590]">
                    {p.status === 'arrived' ? '📍 Llegó' : '🚲 En ruta'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="view-footer mt-auto pt-2.5">
            <button
              className="btn-neon w-full bg-[#CCFF00] hover:bg-[#B5E600] text-[#0A0C0B] p-4 rounded-[22px] text-[1.05rem] font-extrabold border-none cursor-pointer text-center shadow-[0_10px_30px_rgba(204,255,0,0.25)] active:scale-[0.97] transition-transform duration-150"
              onClick={() => switchView('view-map')}
            >
              Volver al Mapa
            </button>
          </div>
        </div>

        {/* ========================================
             VISTA 4: RECUERDO / POSTAL
             ======================================== */}
        <div
          id="view-memory"
          className={`solid-view absolute inset-0 w-full h-full p-[max(24px,env(safe-area-inset-top))_20px_max(24px,env(safe-area-inset-bottom))_20px] bg-[#0A0C0B] z-20 flex flex-col overflow-y-auto transition-all duration-250 ${
            currentView === 'view-memory' ? 'active' : 'hidden'
          }`}
        >
          <div className="flex justify-between items-center mb-3">
            <h3
              className="cursor-pointer text-[0.95rem] text-[#8A9590] hover:text-white transition-colors"
              onClick={() => switchView('view-map')}
            >
              ← Volver al Mapa
            </h3>
            <span className="font-extrabold text-white text-[0.9rem]">Recuerdo Colectivo</span>
          </div>

          <div className="postal-card-dark bg-gradient-to-br from-[#161A18] to-[#0A0C0B] text-white p-6 rounded-[28px] text-center mb-4 border border-white/[0.08] shadow-[0_16px_35px_rgba(0,0,0,0.5)]">
            <div className="postal-img-placeholder w-full h-[150px] bg-white/[0.03] rounded-[18px] flex items-center justify-center text-[3rem] mb-3.5 border border-white/[0.08]">
              🌅
            </div>
            <h3 className="mb-1 text-[1.3rem] font-extrabold" id="postal-title">
              {activeMemory.title || 'Café y Estudio en Casco'}
            </h3>
            <p className="text-[0.85rem] text-[#8A9590]">Panamá · 6 de Noviembre, 2026</p>
          </div>

          <div className="card-dark bg-[#161A18] rounded-[24px] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.3)] mb-3.5 border border-white/[0.08]">
            <p className="text-[0.9rem] italic text-center text-[#8A9590] leading-relaxed">
              “Un espacio libre de ruido para conectar de verdad.”
            </p>
          </div>

          <div className="view-footer mt-auto pt-2.5 flex gap-2.5">
            <button
              className="input-dark flex-1 text-center cursor-pointer font-bold bg-[#161A18] hover:bg-[#222825] p-3.5 rounded-[18px] text-white border border-white/[0.08] transition-colors"
              onClick={handleSavePostal}
              disabled={isSavingPostal}
            >
              {isSavingPostal ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              className="btn-neon flex-1 p-3.5 rounded-[18px] text-[0.95rem] font-extrabold border-none cursor-pointer shadow-md active:scale-[0.97]"
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
