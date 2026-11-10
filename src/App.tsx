import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import confetti from 'canvas-confetti';
import { downloadPostcardAsImage } from './utils/postcardCanvas';
import { PostcardMemory } from './types';

interface PlanData {
  title: string;
  vibe: string;
}

const VIBE_OPTIONS = [
  { name: 'Chill', emoji: '☕' },
  { name: 'Energía', emoji: '👟' },
  { name: 'Aire libre', emoji: '🌳' },
  { name: 'Nocturno', emoji: '🌙' },
];

export default function App() {
  // GESTIÓN INTELIGENTE DE RUTAS POR URL
  const [currentView, setCurrentView] = useState<string>('view-welcome');
  const [isGuestMode, setIsGuestMode] = useState<boolean>(false);
  const [guestJoined, setGuestJoined] = useState<boolean>(false);

  // Form & Plan state
  const [planTitle, setPlanTitle] = useState<string>('Café y estudio en Casco Antiguo');
  const [selectedVibeText, setSelectedVibeText] = useState<string>('☕ Chill');
  const [inviteSubtitle, setInviteSubtitle] = useState<string>('Vibe: ☕ Chill · Café y estudio en Casco Antiguo');
  const [activePlan, setActivePlan] = useState<PlanData | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('planealo_active_plan');
        return saved ? JSON.parse(saved) : null;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [inviteUrl, setInviteUrl] = useState<string>(() => {
    const host = typeof window !== 'undefined' && window.location.host ? window.location.host : 'planealo-aqui.netlify.app';
    return `https://${host}/?t=${encodeURIComponent('Café y estudio en Casco Antiguo')}&v=${encodeURIComponent('☕ Chill')}`;
  });
  const [postalTitle, setPostalTitle] = useState<string>('Café y Estudio en Casco');
  const [currentStyle, setCurrentStyle] = useState<'postal' | 'collage' | 'meme'>('postal');
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Leaflet map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Initial routing on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const titleParam = urlParams.get('t');
    const vibeParam = urlParams.get('v');
    const planParam = urlParams.get('plan');
    const seenWelcome = localStorage.getItem('planealo_onboarding_seen');

    if (titleParam || vibeParam) {
      const decodedTitle = titleParam ? decodeURIComponent(titleParam) : 'Plan en grupo';
      const decodedVibe = vibeParam ? decodeURIComponent(vibeParam) : '☕ Chill';
      setPlanTitle(decodedTitle);
      setSelectedVibeText(decodedVibe);
      setInviteSubtitle(`Vibe: ${decodedVibe} · ${decodedTitle}`);
      setPostalTitle(decodedTitle);
      setIsGuestMode(true);
      const currentDomain = window.location.host || 'planealo-aqui.netlify.app';
      setInviteUrl(`https://${currentDomain}/?t=${encodeURIComponent(decodedTitle)}&v=${encodeURIComponent(decodedVibe)}`);
      switchView('view-invite');
    } else if (planParam) {
      loadSharedPlan(planParam);
      setIsGuestMode(true);
      switchView('view-invite');
    } else if (seenWelcome) {
      switchView('view-map');
    } else {
      switchView('view-welcome');
    }
  }, []);

  // Initialize and resize Leaflet map
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

      // Neon user location pin
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
          <p style="color: #8A9590; font-size: 11px; margin-top: 2px;">Planealo Aquí en Vivo</p>
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
    localStorage.setItem('planealo_onboarding_seen', 'true');
    switchView('view-map');
  };

  const goToCreatePlan = () => {
    switchView('view-create');
  };

  const goToMemory = () => {
    switchView('view-memory');
  };

  const selectVibe = (vibeName: string, emoji: string) => {
    setSelectedVibeText(`${emoji} ${vibeName}`);
  };

  const generateInvite = () => {
    const title = planTitle.trim() || 'Plan en grupo';
    const planData: PlanData = { title, vibe: selectedVibeText };

    // Guardar como plan activo en localStorage para que el Host lo tenga persistente
    try {
      localStorage.setItem('planealo_active_plan', JSON.stringify(planData));
    } catch {
      // safe fallback
    }
    setActivePlan(planData);

    setInviteSubtitle(`Vibe: ${selectedVibeText} · ${title}`);
    setPostalTitle(title);

    // Tomar el dominio actual del navegador de forma automática y limpia
    const currentDomain = (typeof window !== 'undefined' && window.location.host) || 'planealo-aqui.netlify.app';
    const encodedTitle = encodeURIComponent(title);
    const encodedVibe = encodeURIComponent(selectedVibeText);

    const fullInviteUrl = `https://${currentDomain}/?t=${encodedTitle}&v=${encodedVibe}`;
    setInviteUrl(fullInviteUrl);

    switchView('view-invite');
  };

  const openActivePlan = () => {
    if (activePlan) {
      setInviteSubtitle(`Vibe: ${activePlan.vibe} · ${activePlan.title}`);
      setPostalTitle(activePlan.title);
      const currentDomain = (typeof window !== 'undefined' && window.location.host) || 'planealo-aqui.netlify.app';
      const encodedTitle = encodeURIComponent(activePlan.title);
      const encodedVibe = encodeURIComponent(activePlan.vibe);
      setInviteUrl(`https://${currentDomain}/?t=${encodedTitle}&v=${encodedVibe}`);
    }
    setIsGuestMode(false);
    switchView('view-invite');
  };

  const loadSharedPlan = (planId: string) => {
    try {
      const savedData = localStorage.getItem(planId);
      if (savedData) {
        const plan: PlanData = JSON.parse(savedData);
        setInviteSubtitle(`Vibe: ${plan.vibe} · ${plan.title}`);
        setPostalTitle(plan.title);
        setPlanTitle(plan.title);
        setSelectedVibeText(plan.vibe);
      } else {
        setInviteSubtitle('Vibe: ☕ Chill · Café en grupo');
      }
    } catch {
      setInviteSubtitle('Vibe: ☕ Chill · Café en grupo');
    }
    const currentDomain = (typeof window !== 'undefined' && window.location.host) || 'planealo-aqui.netlify.app';
    setInviteUrl(`https://${currentDomain}/?plan=${planId}`);
  };

  const joinAsGuest = () => {
    setGuestJoined(true);
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#CCFF00', '#B5E600', '#FFFFFF', '#161A18'],
    });
  };

  const copyInviteLink = () => {
    navigator.clipboard
      .writeText(inviteUrl)
      .then(() => {
        alert('¡Enlace copiado al portapapeles!');
      })
      .catch(() => {
        alert('Enlace listo: ' + inviteUrl);
      });
  };

  const shareOnWhatsApp = () => {
    const message = encodeURIComponent(`¡Únete a Planealo Aquí! Coordinemos el punto de encuentro aquí: ${inviteUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${message}`, '_blank');
  };

  const finishPlanAndCapture = () => {
    try {
      localStorage.removeItem('planealo_active_plan');
    } catch {
      // safe fallback
    }
    setActivePlan(null);
    switchView('view-memory');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setUploadedPhoto(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const setMemoryStyle = (style: 'postal' | 'collage' | 'meme') => {
    setCurrentStyle(style);
  };

  const shareMemory = () => {
    if (navigator.share) {
      navigator
        .share({
          title: 'Recuerdo - Planealo Aquí',
          text: `¡Mira nuestro recuerdo de "${planTitle}" en Planealo Aquí!`,
          url: window.location.origin,
        })
        .catch(() => {});
    } else {
      alert('¡Recuerdo listo para compartir!');
    }
  };

  const handleSavePostal = async () => {
    alert('¡Postal guardada!');
    try {
      const memory: PostcardMemory = {
        id: `postal-${Date.now()}`,
        campfireId: 'planealo-active',
        title: postalTitle,
        vibeEmoji: selectedVibeText.split(' ')[0] || '☕',
        vibeName: selectedVibeText.split(' ')[1] || 'Chill',
        date: '6 de Noviembre, 2026',
        city: 'Ciudad de Panamá',
        location: 'Panamá',
        heroImage: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
        quote: '“Un espacio libre de ruido para conectar de verdad.”',
        theme: 'twilight',
        stampText: 'PANAMÁ · PLANEALO AQUÍ',
        attendees: [
          { name: 'Tú', avatar: '👤', signature: 'Tú ⚡' },
          { name: 'Sofía', avatar: '👩💻', signature: 'Sofía R.' },
          { name: 'Mateo', avatar: '🧑🎨', signature: 'Mateo V.' },
        ],
      };
      await downloadPostcardAsImage(memory);
    } catch {
      // safe fallback
    }
  };

  const handleSharePostal = () => {
    alert('¡Abriendo menú para compartir!');
    if (navigator.share) {
      navigator
        .share({
          title: `Postal Colectiva: ${postalTitle}`,
          text: `“Un espacio libre de ruido para conectar de verdad.” - Planealo Aquí`,
          url: inviteUrl,
        })
        .catch(() => {});
    }
  };

  return (
    <div className="min-h-screen bg-[#030404] flex justify-center items-center overflow-hidden w-full select-none">
      <div id="app">
        {/* ========================================
             VISTA 0: BIENVENIDA
             ======================================== */}
        <div id="view-welcome" className={`view ${currentView === 'view-welcome' ? 'active' : ''}`}>
          <div>
            <div className="welcome-hero-card">
              <img
                src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80"
                alt="Experiencia compartida"
                className="welcome-hero-img"
              />
              <div className="hero-gradient-overlay"></div>
            </div>
            <h1 className="welcome-title">Conecta sin ruido, vive el momento.</h1>
            <p className="welcome-subtitle">
              Organiza planes al instante, reúne a tu gente y conserva recuerdos significativos.
            </p>
          </div>

          <div style={{ marginTop: '20px' }}>
            <button className="btn-neon" onClick={completeOnboarding}>
              Comenzar
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-gray)', marginTop: '12px' }}>
              ¿Ya tienes cuenta?{' '}
              <span
                style={{ color: 'var(--text-white)', fontWeight: 700, cursor: 'pointer' }}
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
        <div id="view-map" className={`view ${currentView === 'view-map' ? 'active' : ''}`}>
          <div id="map-container" ref={mapContainerRef}></div>

          <div className="map-overlay-top">
            <div className="top-row">
              <div className="brand-pill-dark">Planealo Aquí ⚡</div>
              <button className="icon-btn-dark" onClick={goToMemory}>
                📸
              </button>
            </div>
            {/* Píldora flotante para que el Host supervise su plan activo en cualquier momento */}
            {activePlan && (
              <div
                className="active-plan-pill"
                id="map-plan-pill"
                onClick={openActivePlan}
              >
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-neon)', fontWeight: 800, display: 'block' }}>
                    ⚡ PLAN ACTIVO
                  </span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-white)' }} id="map-pill-title">
                    {activePlan.title}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '0.85rem',
                    background: 'rgba(204,255,0,0.15)',
                    color: 'var(--accent-neon)',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontWeight: 800,
                  }}
                  id="map-pill-count"
                >
                  {guestJoined ? '4' : '3'} en camino →
                </span>
              </div>
            )}
          </div>

          <div className="map-overlay-bottom">
            <div className="action-pill-neon" onClick={goToCreatePlan}>
              <span>¿Cuál es el plan hoy?</span>
              <div className="action-arrow-dark">→</div>
            </div>
          </div>
        </div>

        {/* ========================================
             VISTA 2: CREAR PLAN
             ======================================== */}
        <div id="view-create" className={`solid-view ${currentView === 'view-create' ? 'active' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3
              style={{ cursor: 'pointer', fontSize: '0.95rem', color: 'var(--text-gray)' }}
              onClick={() => switchView('view-map')}
            >
              ← Cancelar
            </h3>
            <span style={{ fontWeight: 800, color: 'var(--accent-neon)', fontSize: '0.9rem' }}>Paso 1 de 2</span>
          </div>
          <h1>Nuevo Plan</h1>
          <p className="subtitle">Define la vibra y el propósito del encuentro.</p>

          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'block',
                marginBottom: '6px',
                color: 'var(--text-white)',
              }}
            >
              ¿Qué van a hacer?
            </label>
            <input
              type="text"
              id="plan-title"
              className="input-dark"
              value={planTitle}
              onChange={(e) => setPlanTitle(e.target.value)}
            />
          </div>

          <label
            style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              display: 'block',
              marginBottom: '10px',
              color: 'var(--text-white)',
            }}
          >
            Selecciona la Vibe
          </label>
          <div className="vibe-grid">
            {VIBE_OPTIONS.map((v) => {
              const isSelected = selectedVibeText.includes(v.name);
              return (
                <div
                  key={v.name}
                  className={`vibe-option-dark ${isSelected ? 'selected' : ''}`}
                  onClick={() => selectVibe(v.name, v.emoji)}
                >
                  <div className="vibe-emoji">{v.emoji}</div>
                  <div className="vibe-name">{v.name}</div>
                </div>
              );
            })}
          </div>

          <div className="view-footer">
            <button className="btn-neon" onClick={generateInvite}>
              Armar enlace de invitación
            </button>
          </div>
        </div>

        {/* ========================================
             VISTA 3: SALA DE INVITACIÓN
             ======================================== */}
        <div id="view-invite" className={`solid-view ${currentView === 'view-invite' ? 'active' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3
              style={{ cursor: 'pointer', fontSize: '0.95rem', color: 'var(--text-gray)' }}
              onClick={() => switchView('view-map')}
            >
              ← Volver al Mapa
            </h3>
            <span
              style={{
                fontSize: '0.85rem',
                background: 'rgba(204,255,0,0.1)',
                color: 'var(--accent-neon)',
                padding: '6px 12px',
                borderRadius: '12px',
                fontWeight: 800,
              }}
            >
              Plan Activo
            </span>
          </div>
          <h1>¡Plan listo para rodar! 🔥</h1>
          <p className="subtitle" id="invite-subtitle">
            {inviteSubtitle}
          </p>

          <div className="card-dark" style={{ textAlign: 'center', border: '2px dashed var(--accent-neon)' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-gray)', marginBottom: '6px' }}>
              Enlace rápido para compartir
            </p>
            <h3
              id="invite-url-text"
              style={{
                color: 'var(--accent-neon)',
                marginBottom: '12px',
                fontSize: '1.1rem',
                wordBreak: 'break-all',
              }}
            >
              {inviteUrl.replace(/^https?:\/\//, '')}
            </h3>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="input-dark"
                style={{
                  padding: '10px',
                  fontSize: '0.85rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: 'var(--bg-dark)',
                }}
                onClick={copyInviteLink}
              >
                Copiar Enlace
              </button>
              <button
                className="btn-whatsapp"
                style={{ padding: '10px', fontSize: '0.85rem' }}
                onClick={shareOnWhatsApp}
              >
                WhatsApp
              </button>
            </div>
          </div>

          <div className="card-dark">
            <h4 id="participants-title" style={{ fontSize: '0.95rem', marginBottom: '8px', color: 'var(--text-white)' }}>
              Amigos en camino ({3 + (guestJoined ? 1 : 0)})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.85rem',
                }}
              >
                <span style={{ color: 'var(--text-white)' }}>
                  👤 Tú{' '}
                  <span
                    style={{
                      background: 'rgba(204,255,0,0.15)',
                      color: 'var(--accent-neon)',
                      padding: '2px 6px',
                      borderRadius: '6px',
                      fontSize: '0.7rem',
                    }}
                  >
                    Host
                  </span>
                </span>
                <span style={{ color: '#ff6b6b' }}>📍 En el punto</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.85rem',
                }}
              >
                <span style={{ color: 'var(--text-gray)' }}>👩💻 Sofía R.</span>
                <span
                  style={{ color: guestJoined ? '#CCFF00' : 'var(--accent-neon)' }}
                  id="status-sofia"
                >
                  {guestJoined ? '✅ ¡Ya vas en camino!' : '🚀 En camino (5 min)'}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.85rem',
                }}
              >
                <span style={{ color: 'var(--text-gray)' }}>🧑🎨 Mateo V.</span>
                <span style={{ color: 'var(--accent-neon)' }}>🚀 En camino (8 min)</span>
              </div>
            </div>
          </div>

          <div className="view-footer">
            <button
              className="btn-neon"
              onClick={joinAsGuest}
              id="join-btn"
              disabled={guestJoined}
              style={{
                marginBottom: '10px',
                display: isGuestMode || guestJoined ? 'block' : 'none',
                opacity: guestJoined ? 0.7 : 1,
              }}
            >
              {guestJoined ? '¡Conectado al Plan! 🚀' : '¡Voy en camino! 🏃‍♂️'}
            </button>
            <button
              className="btn-neon"
              onClick={finishPlanAndCapture}
              style={{ backgroundColor: '#ff6b6b', color: '#fff', marginBottom: '8px' }}
            >
              🏁 Finalizar Encuentro & Recuerdo
            </button>
            <button
              className="btn-neon"
              onClick={() => switchView('view-map')}
              style={{ background: 'var(--card-dark)', color: 'var(--text-white)', border: '1px solid var(--card-border)' }}
            >
              Ver Mapa en Vivo
            </button>
          </div>
        </div>

        {/* ========================================
             VISTA 4: RECUERDO / POSTAL & SELFIE COLECTIVA
             ======================================== */}
        <div id="view-memory" className={`solid-view ${currentView === 'view-memory' ? 'active' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3
              style={{ cursor: 'pointer', fontSize: '0.95rem', color: 'var(--text-gray)' }}
              onClick={() => switchView('view-map')}
            >
              ← Volver al Mapa
            </h3>
            <span style={{ fontWeight: 800, color: 'var(--accent-neon)' }}>Recuerdo Colectivo 📸</span>
          </div>

          <div className="style-selector">
            <div
              className={`style-btn ${currentStyle === 'postal' ? 'active' : ''}`}
              onClick={() => setMemoryStyle('postal')}
            >
              ✉️ Postal Pro
            </div>
            <div
              className={`style-btn ${currentStyle === 'collage' ? 'active' : ''}`}
              onClick={() => setMemoryStyle('collage')}
            >
              📸 Collage
            </div>
            <div
              className={`style-btn ${currentStyle === 'meme' ? 'active' : ''}`}
              onClick={() => setMemoryStyle('meme')}
            >
              🤪 Vibe / Meme
            </div>
          </div>

          <div className="postal-card-dark" id="memory-card-preview">
            <div
              className="postal-img-container"
              id="image-box"
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadedPhoto ? (
                <img
                  id="uploaded-photo"
                  src={uploadedPhoto}
                  alt="Selfie grupal"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span id="camera-icon-placeholder" style={{ textAlign: 'center' }}>
                  📷
                  <br />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-gray)' }}>
                    Toca para tomar selfie grupal
                  </span>
                </span>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              id="selfie-input"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleImageUpload}
            />

            <h3 style={{ marginBottom: '4px', fontSize: '1.2rem' }} id="postal-title">
              {postalTitle}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--accent-neon)', fontWeight: 700 }} id="postal-tagline">
              ✨ Vibe: {selectedVibeText}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-gray)', marginTop: '4px' }}>
              Panamá · 6 de Noviembre, 2026
            </p>
          </div>

          <div className="card-dark" style={{ padding: '12px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-gray)' }} id="memory-quote">
              {currentStyle === 'postal' && '“Un espacio libre de ruido para conectar de verdad.”'}
              {currentStyle === 'collage' && '📸 Colección de momentos épicos en grupo.'}
              {currentStyle === 'meme' && '🤪 Misión cumplida: Sobrevivimos al plan sin perdernos.'}
            </p>
          </div>

          <div className="view-footer" style={{ display: 'flex', gap: '10px' }}>
            <button
              className="input-dark"
              style={{
                flex: 1,
                textAlign: 'center',
                cursor: 'pointer',
                fontWeight: 700,
                background: 'var(--card-dark)',
              }}
              onClick={() => alert('¡Recuerdo guardado en tu galería!')}
            >
              Guardar
            </button>
            <button className="btn-neon" style={{ flex: 1, marginTop: 0 }} onClick={shareMemory}>
              Compartir 🚀
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
