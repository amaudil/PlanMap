import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import confetti from 'canvas-confetti';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signInWithGoogle, signOutUser } from './firebase';
import {
  createLivePlanRoom,
  finishLivePlan,
  generateSafePlanId,
  joinOrUpdateGuestInRoom,
  LiveParticipantDoc,
  LivePlanDoc,
  sendQuickPulse,
  subscribeToParticipants,
  subscribeToPlan,
  syncMyTelemetry,
} from './services/liveRooms';
import { downloadPostcardAsImage, sharePostcardAsFile } from './utils/postcardCanvas';
import {
  calculateHaversineDistanceMeters,
  formatDistanceETA,
  GEOFENCE_RADIUS_METERS,
  DEFAULT_MEETING_POINT,
} from './utils/geofencing';
import {
  getRecentPlaces,
  PlaceSearchResult,
  saveRecentPlace,
  searchPlaces,
} from './utils/geocoding';

interface PlanData {
  title: string;
  vibe: string;
  lat?: number;
  lng?: number;
}

const VIBE_OPTIONS = [
  { name: 'Chill', emoji: '☕' },
  { name: 'Energía', emoji: '👟' },
  { name: 'Aire libre', emoji: '🌳' },
  { name: 'Nocturno', emoji: '🌙' },
];

const AVATAR_OPTIONS = ['⚡', '🚀', '🔥', '☕', '👟', '🏃', '😎', '🎯'];

const PULSE_OPTIONS = [
  'Ya salí 👟',
  '5 min tarde ⏱️',
  'Ya pedí mesa ☕',
  '¡Llegué! 🎯',
];

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getStoredString(key: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  // ========================================
  // AUTENTICACIÓN & IDENTIDAD DEL USUARIO
  // ========================================
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [authBusy, setAuthBusy] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [userAlias, setUserAlias] = useState<string>(() =>
    getStoredString('planealo_user_alias', '')
  );
  const [userAvatar, setUserAvatar] = useState<string>(() =>
    getStoredString('planealo_user_avatar', '⚡')
  );

  // ========================================
  // SALAS EN TIEMPO REAL (FIRESTORE)
  // ========================================
  const [livePlanId, setLivePlanId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const urlParams = new URLSearchParams(window.location.search);
    const idParam = urlParams.get('id');
    if (idParam) return idParam;
    try {
      return localStorage.getItem('planealo_active_plan_id');
    } catch {
      return null;
    }
  });
  const [livePlan, setLivePlan] = useState<LivePlanDoc | null>(null);
  const [liveParticipants, setLiveParticipants] = useState<LiveParticipantDoc[]>([]);
  const [creatingPlan, setCreatingPlan] = useState<boolean>(false);
  const [joiningRoom, setJoiningRoom] = useState<boolean>(false);
  const [sendingPulse, setSendingPulse] = useState<boolean>(false);
  const [finishingPlan, setFinishingPlan] = useState<boolean>(false);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ========================================
  // GESTIÓN DE VISTAS Y FORMULARIO
  // ========================================
  const [currentView, setCurrentView] = useState<string>('view-welcome');
  const [isGuestMode, setIsGuestMode] = useState<boolean>(false);
  const [guestJoined, setGuestJoined] = useState<boolean>(false);

  const [planTitle, setPlanTitle] = useState<string>('Café y estudio en Casco Antiguo');
  const [selectedVibeText, setSelectedVibeText] = useState<string>('☕ Chill');
  const [inviteSubtitle, setInviteSubtitle] = useState<string>(
    'Vibe: ☕ Chill · Café y estudio en Casco Antiguo'
  );
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
    const host =
      typeof window !== 'undefined' && window.location.host
        ? window.location.host
        : 'planealo-aqui.netlify.app';
    return `https://${host}/?t=${encodeURIComponent(
      'Café y estudio en Casco Antiguo'
    )}&v=${encodeURIComponent('☕ Chill')}`;
  });
  const [postalTitle, setPostalTitle] = useState<string>('Café y Estudio en Casco');
  const [currentStyle, setCurrentStyle] = useState<'postal' | 'collage' | 'meme'>('postal');
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ========================================
  // MOTOR DE GEOFENCING Y TELEMETRÍA GPS
  // ========================================
  const [targetCoords, setTargetCoords] = useState<[number, number]>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const latParam = urlParams.get('lat');
      const lngParam = urlParams.get('lng');
      if (latParam && lngParam) {
        const pLat = parseFloat(latParam);
        const pLng = parseFloat(lngParam);
        if (!isNaN(pLat) && !isNaN(pLng)) {
          return [pLat, pLng];
        }
      }
      try {
        const saved = localStorage.getItem('planealo_active_plan');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.lat && parsed.lng) {
            return [Number(parsed.lat), Number(parsed.lng)];
          }
        }
      } catch {
        // safe fallback
      }
    }
    return DEFAULT_MEETING_POINT;
  });

  const [isSelectingLocationMode, setIsSelectingLocationMode] = useState<boolean>(false);
  const [isMapPanning, setIsMapPanning] = useState<boolean>(false);
  const [placeQuery, setPlaceQuery] = useState<string>('');
  const [placeResults, setPlaceResults] = useState<PlaceSearchResult[]>([]);
  const [searchingPlaces, setSearchingPlaces] = useState<boolean>(false);
  const [selectedPlaceLabel, setSelectedPlaceLabel] = useState<string | null>(null);
  const [recentPlaces, setRecentPlaces] = useState<PlaceSearchResult[]>(() => getRecentPlaces());
  const [userCoords, setUserCoords] = useState<[number, number]>([8.9839, -79.5212]);
  const [isSimulatedArrival, setIsSimulatedArrival] = useState<boolean>(false);
  const [hasCelebratedArrival, setHasCelebratedArrival] = useState<boolean>(false);

  const distanceMeters = calculateHaversineDistanceMeters(
    userCoords[0],
    userCoords[1],
    targetCoords[0],
    targetCoords[1]
  );
  const distanceETA = formatDistanceETA(distanceMeters);
  const isInsideGeofence = distanceETA.isInside;

  // Leaflet map refs & layers
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const targetMarkerRef = useRef<L.Marker | null>(null);
  const geofenceCircleRef = useRef<L.Circle | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const otherMarkersRef = useRef<Record<string, L.Marker>>({});
  const watchIdRef = useRef<number | null>(null);

  // Telemetry, picker & toast refs
  const lastTelemetrySyncAtRef = useRef<number>(0);
  const lastTelemetryInsideRef = useRef<boolean | null>(null);
  const hasPannedForPlanRef = useRef<string | null>(null);
  const savedTargetBeforePickRef = useRef<[number, number] | null>(null);
  const isProgrammaticFlyRef = useRef<boolean>(false);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Persist alias & avatar locally
  const updateUserAlias = (nextAlias: string) => {
    setUserAlias(nextAlias);
    try {
      localStorage.setItem('planealo_user_alias', nextAlias);
    } catch {
      // ignore storage errors
    }
  };

  const updateUserAvatar = (nextAvatar: string) => {
    setUserAvatar(nextAvatar);
    try {
      localStorage.setItem('planealo_user_avatar', nextAvatar);
    } catch {
      // ignore storage errors
    }
  };

  const resolvedAlias = useMemo(() => {
    const clean = userAlias.trim();
    if (clean) return clean.slice(0, 40);
    if (authUser?.displayName) return authUser.displayName.split(' ')[0].slice(0, 40);
    return 'Explorador';
  }, [userAlias, authUser]);

  // ========================================
  // SUSCRIPCIÓN FIREBASE AUTH
  // ========================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthReady(true);
      if (user) {
        setAuthError(null);
        try {
          const existingAlias = localStorage.getItem('planealo_user_alias');
          if (!existingAlias && user.displayName) {
            const first = user.displayName.split(' ')[0].slice(0, 32);
            setUserAlias(first);
            localStorage.setItem('planealo_user_alias', first);
          }
        } catch {
          // safe fallback
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async (): Promise<User | null> => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const cred = await signInWithGoogle();
      showToast(`Conectado como ${cred.user.displayName || 'Usuario'} ⚡`);
      return cred.user;
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setAuthError('Inicio de sesión cancelado. Conecta tu Google para sincronizar la sala.');
      } else {
        setAuthError('No se pudo iniciar sesión con Google. Revisa si el popup fue bloqueado.');
      }
      return null;
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setLiveParticipants([]);
      showToast('Sesión cerrada');
    } catch {
      showToast('No se pudo cerrar sesión');
    }
  };

  // ========================================
  // GPS REAL
  // ========================================
  useEffect(() => {
    if (isSimulatedArrival) return;
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserCoords([position.coords.latitude, position.coords.longitude]);
        },
        () => {
          // Mantiene posición inicial si no hay permiso GPS
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
      );
      watchIdRef.current = watchId;

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    }
  }, [isSimulatedArrival]);

  // Trigger automático de Check-in al cruzar el perímetro de 50m
  useEffect(() => {
    if (isInsideGeofence && !hasCelebratedArrival) {
      setHasCelebratedArrival(true);
      confetti({
        particleCount: 55,
        spread: 65,
        origin: { y: 0.6 },
        colors: ['#CCFF00', '#FFFFFF', '#25D366'],
      });
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([80, 50, 80]);
        } catch {
          // safe fallback
        }
      }
    } else if (!isInsideGeofence && hasCelebratedArrival) {
      setHasCelebratedArrival(false);
    }
  }, [isInsideGeofence, hasCelebratedArrival]);

  const toggleSimulateArrival = () => {
    if (!isSimulatedArrival) {
      setIsSimulatedArrival(true);
      setUserCoords([targetCoords[0] + 0.00003, targetCoords[1] + 0.00003]);
    } else {
      setIsSimulatedArrival(false);
      setUserCoords([targetCoords[0] - 0.0016, targetCoords[1] - 0.0013]);
    }
  };

  // ========================================
  // RUTEO INICIAL POR URL
  // ========================================
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const idParam = urlParams.get('id');
    const titleParam = urlParams.get('t');
    const vibeParam = urlParams.get('v');
    const latParam = urlParams.get('lat');
    const lngParam = urlParams.get('lng');
    const planParam = urlParams.get('plan');
    const seenWelcome = localStorage.getItem('planealo_onboarding_seen');
    const currentDomain = window.location.host || 'planealo-aqui.netlify.app';

    if (latParam && lngParam) {
      const pLat = parseFloat(latParam);
      const pLng = parseFloat(lngParam);
      if (!isNaN(pLat) && !isNaN(pLng)) {
        setTargetCoords([pLat, pLng]);
      }
    }

    if (idParam) {
      setLivePlanId(idParam);
      setIsGuestMode(true);
      if (titleParam || vibeParam) {
        const decodedTitle = titleParam ? decodeURIComponent(titleParam) : 'Plan en grupo';
        const decodedVibe = vibeParam ? decodeURIComponent(vibeParam) : '☕ Chill';
        setPlanTitle(decodedTitle);
        setSelectedVibeText(decodedVibe);
        setInviteSubtitle(`Vibe: ${decodedVibe} · ${decodedTitle}`);
        setPostalTitle(decodedTitle);
        const lat = latParam || targetCoords[0].toFixed(5);
        const lng = lngParam || targetCoords[1].toFixed(5);
        setInviteUrl(
          `https://${currentDomain}/?id=${encodeURIComponent(idParam)}&t=${encodeURIComponent(
            decodedTitle
          )}&v=${encodeURIComponent(decodedVibe)}&lat=${lat}&lng=${lng}`
        );
      } else {
        setInviteUrl(`https://${currentDomain}/?id=${encodeURIComponent(idParam)}`);
        setInviteSubtitle('Conectando con la sala en vivo...');
      }
      switchView('view-invite');
    } else if (titleParam || vibeParam) {
      const decodedTitle = titleParam ? decodeURIComponent(titleParam) : 'Plan en grupo';
      const decodedVibe = vibeParam ? decodeURIComponent(vibeParam) : '☕ Chill';
      setPlanTitle(decodedTitle);
      setSelectedVibeText(decodedVibe);
      setInviteSubtitle(`Vibe: ${decodedVibe} · ${decodedTitle}`);
      setPostalTitle(decodedTitle);
      setIsGuestMode(true);
      const lat = latParam || targetCoords[0].toFixed(5);
      const lng = lngParam || targetCoords[1].toFixed(5);
      setInviteUrl(
        `https://${currentDomain}/?t=${encodeURIComponent(decodedTitle)}&v=${encodeURIComponent(
          decodedVibe
        )}&lat=${lat}&lng=${lng}`
      );
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

  // ========================================
  // SUSCRIPCIÓN FIRESTORE EN TIEMPO REAL
  // ========================================
  useEffect(() => {
    if (!authReady || !authUser || !livePlanId) {
      return;
    }

    setRoomError(null);

    const unsubPlan = subscribeToPlan(
      livePlanId,
      (plan) => {
        if (!plan) {
          setLivePlan(null);
          const urlId = new URLSearchParams(window.location.search).get('id');
          if (!urlId) {
            try {
              localStorage.removeItem('planealo_active_plan_id');
              localStorage.removeItem('planealo_active_plan');
            } catch {
              // ignore
            }
            setActivePlan(null);
            setLivePlanId(null);
          } else {
            setRoomError('Esta sala no existe o el enlace ya no está disponible.');
          }
          return;
        }

        setLivePlan(plan);
        setPlanTitle(plan.title);
        setSelectedVibeText(plan.vibe);
        setInviteSubtitle(`Vibe: ${plan.vibe} · ${plan.title}`);
        setPostalTitle(plan.title);
        setTargetCoords([plan.targetLat, plan.targetLng]);

        if (plan.status === 'active') {
          const planData: PlanData = {
            title: plan.title,
            vibe: plan.vibe,
            lat: plan.targetLat,
            lng: plan.targetLng,
          };
          setActivePlan(planData);
          try {
            localStorage.setItem('planealo_active_plan', JSON.stringify(planData));
            localStorage.setItem('planealo_active_plan_id', plan.id);
          } catch {
            // ignore
          }
        } else {
          setActivePlan(null);
        }

        const currentDomain =
          (typeof window !== 'undefined' && window.location.host) || 'planealo-aqui.netlify.app';
        setInviteUrl(
          `https://${currentDomain}/?id=${encodeURIComponent(plan.id)}&t=${encodeURIComponent(
            plan.title
          )}&v=${encodeURIComponent(plan.vibe)}&lat=${plan.targetLat.toFixed(
            5
          )}&lng=${plan.targetLng.toFixed(5)}`
        );

        if (
          mapInstanceRef.current &&
          !isSelectingLocationMode &&
          hasPannedForPlanRef.current !== plan.id
        ) {
          hasPannedForPlanRef.current = plan.id;
          mapInstanceRef.current.panTo([plan.targetLat, plan.targetLng], { animate: true });
        }
      },
      () => {
        setRoomError('No se pudo sincronizar la sala en tiempo real.');
      }
    );

    const unsubParticipants = subscribeToParticipants(
      livePlanId,
      (participants) => {
        setLiveParticipants(participants);
      },
      () => {
        setRoomError('No se pudo leer la lista de participantes.');
      }
    );

    return () => {
      unsubPlan();
      unsubParticipants();
    };
  }, [authReady, authUser, livePlanId, isSelectingLocationMode]);

  const myParticipantRecord = useMemo(
    () => (authUser ? liveParticipants.find((p) => p.uid === authUser.uid) || null : null),
    [authUser, liveParticipants]
  );

  const hasJoinedCurrentRoom = Boolean(myParticipantRecord);
  const isHostOfCurrentPlan = Boolean(
    authUser && livePlan && livePlan.hostId === authUser.uid
  );

  useEffect(() => {
    setGuestJoined(hasJoinedCurrentRoom);
  }, [hasJoinedCurrentRoom]);

  // ========================================
  // SINCRONIZACIÓN DE TELEMETRÍA GPS EN VIVO
  // ========================================
  useEffect(() => {
    if (!authUser || !livePlanId || !hasJoinedCurrentRoom || livePlan?.status !== 'active') {
      return;
    }

    const now = Date.now();
    const insideChanged = lastTelemetryInsideRef.current !== isInsideGeofence;
    const elapsed = now - lastTelemetrySyncAtRef.current;

    if (!insideChanged && elapsed < 4000) {
      return;
    }

    lastTelemetryInsideRef.current = isInsideGeofence;
    lastTelemetrySyncAtRef.current = now;

    syncMyTelemetry({
      planId: livePlanId,
      uid: authUser.uid,
      lat: userCoords[0],
      lng: userCoords[1],
      distanceMeters,
      etaLabel: distanceETA.etaLabel,
      isInside: isInsideGeofence,
    }).catch(() => {
      // No interrumpir UX en segundo plano si la sala se cerró justo en ese instante
    });
  }, [
    authUser,
    livePlanId,
    hasJoinedCurrentRoom,
    livePlan?.status,
    userCoords,
    distanceMeters,
    distanceETA.etaLabel,
    isInsideGeofence,
  ]);

  // ========================================
  // INICIALIZACIÓN DEL MAPA LEAFLET
  // ========================================
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
      }).setView(targetCoords, 16);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  // Actualización reactiva de capas de Geocerca en el mapa
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // 1. Radio de Geocerca (Círculo de 50 metros)
    if (!geofenceCircleRef.current) {
      geofenceCircleRef.current = L.circle(targetCoords, {
        radius: GEOFENCE_RADIUS_METERS,
        color: '#CCFF00',
        fillColor: '#CCFF00',
        fillOpacity: 0.14,
        weight: 2,
        dashArray: '6, 8',
      }).addTo(map);
    } else {
      geofenceCircleRef.current.setLatLng(targetCoords);
    }

    // 2. Marcador del Punto de Encuentro (Destino dinámico y arrastrable)
    if (!targetMarkerRef.current) {
      const targetIcon = L.divIcon({
        className: 'custom-target-marker',
        html: `
          <div style="background: #161A18; border: 2px solid #CCFF00; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 16px rgba(204,255,0,0.5); font-size: 20px; cursor: move;">
            📍
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
      targetMarkerRef.current = L.marker(targetCoords, { icon: targetIcon, draggable: true })
        .addTo(map)
        .bindPopup(`
          <div style="text-align: center; padding: 4px;">
            <b style="color: #CCFF00; font-size: 13px;">Punto de Encuentro 📍</b>
            <p style="color: #8A9590; font-size: 11px; margin-top: 2px;">Arrastra o toca para reubicar</p>
          </div>
        `);

      targetMarkerRef.current.on('dragend', (e) => {
        const marker = e.target as L.Marker;
        const pos = marker.getLatLng();
        setSelectedPlaceLabel(null);
        setTargetCoords([pos.lat, pos.lng]);
      });
    } else {
      targetMarkerRef.current.setLatLng(targetCoords);
    }

    // Ocultar el pin clásico mientras está activa la mira fija central
    targetMarkerRef.current.setOpacity(isSelectingLocationMode ? 0 : 1);

    // 3. Marcador Neón del Usuario con ping
    if (!userMarkerRef.current) {
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
      userMarkerRef.current = L.marker(userCoords, { icon: neonIcon })
        .addTo(map)
        .bindPopup(`
          <div style="text-align: center; padding: 2px;">
            <b style="color: #CCFF00; font-size: 13px;">Tú estás aquí ✨</b>
            <p style="color: #8A9590; font-size: 11px; margin-top: 2px;">Distancia: ${distanceETA.distanceLabel}</p>
          </div>
        `);
    } else {
      userMarkerRef.current.setLatLng(userCoords);
      userMarkerRef.current.setPopupContent(`
        <div style="text-align: center; padding: 2px;">
          <b style="color: #CCFF00; font-size: 13px;">Tú estás aquí ✨</b>
          <p style="color: #8A9590; font-size: 11px; margin-top: 2px;">Distancia: ${distanceETA.distanceLabel} (${distanceETA.etaLabel})</p>
        </div>
      `);
    }

    // 4. Línea de proximidad discontinua (solo si está fuera de la geocerca)
    if (!isInsideGeofence) {
      if (!polylineRef.current) {
        polylineRef.current = L.polyline([userCoords, targetCoords], {
          color: '#CCFF00',
          weight: 2,
          dashArray: '5, 8',
          opacity: 0.6,
        }).addTo(map);
      } else {
        polylineRef.current.setLatLngs([userCoords, targetCoords]);
      }
    } else if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }
  }, [
    userCoords,
    targetCoords,
    isInsideGeofence,
    isSelectingLocationMode,
    distanceETA.distanceLabel,
    distanceETA.etaLabel,
  ]);

  // 5. Marcadores en vivo de otros participantes en la sala
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const activeOthers = livePlanId
      ? liveParticipants.filter((p) => p.uid !== authUser?.uid)
      : [];
    const activeIds = new Set(activeOthers.map((p) => p.uid));

    // Limpiar marcadores de participantes que salieron o de salas previas
    Object.keys(otherMarkersRef.current).forEach((uid) => {
      if (!activeIds.has(uid)) {
        map.removeLayer(otherMarkersRef.current[uid]);
        delete otherMarkersRef.current[uid];
      }
    });

    activeOthers.forEach((p) => {
      const arrived = p.status === 'arrived';
      const safeName = escapeHtml(p.name);
      const safeAvatar = escapeHtml(p.avatar || '⚡');
      const safePulse = p.quickPulse ? escapeHtml(p.quickPulse) : '';
      const distInfo = formatDistanceETA(p.distanceMeters);
      const borderColor = arrived ? '#CCFF00' : '#FFFFFF';
      const statusLine = arrived
        ? '📍 En el punto (Check-in ✅)'
        : `🚀 A ${escapeHtml(distInfo.distanceLabel)} (${escapeHtml(p.etaLabel)})`;

      const iconHtml = `
        <div style="display:flex; flex-direction:column; align-items:center; transform: translateY(-4px);">
          <div style="background:#161A18; border:2px solid ${borderColor}; border-radius:50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; font-size:17px; box-shadow:0 4px 14px rgba(0,0,0,0.6);">
            ${safeAvatar}
          </div>
          <span style="margin-top:2px; background:#0A0C0B; color:${borderColor}; border:1px solid rgba(255,255,255,0.2); padding:1px 6px; border-radius:8px; font-size:10px; font-weight:800; white-space:nowrap;">
            ${safeName}
          </span>
        </div>
      `;

      const popupHtml = `
        <div style="text-align:center; padding:3px; min-width:130px;">
          <b style="color:${borderColor}; font-size:13px;">${safeAvatar} ${safeName}${
        p.role === 'host' ? ' (Host)' : ''
      }</b>
          <p style="color:#E6E8E7; font-size:11px; margin-top:3px;">${statusLine}</p>
          ${
            safePulse
              ? `<p style="color:#CCFF00; font-size:11px; font-weight:700; margin-top:3px;">⚡ ${safePulse}</p>`
              : ''
          }
        </div>
      `;

      const existingMarker = otherMarkersRef.current[p.uid];
      if (!existingMarker) {
        const icon = L.divIcon({
          className: 'custom-participant-marker',
          html: iconHtml,
          iconSize: [70, 56],
          iconAnchor: [35, 28],
        });
        otherMarkersRef.current[p.uid] = L.marker([p.lat, p.lng], { icon })
          .addTo(map)
          .bindPopup(popupHtml);
      } else {
        existingMarker.setLatLng([p.lat, p.lng]);
        existingMarker.setIcon(
          L.divIcon({
            className: 'custom-participant-marker',
            html: iconHtml,
            iconSize: [70, 56],
            iconAnchor: [35, 28],
          })
        );
        existingMarker.setPopupContent(popupHtml);
      }
    });
  }, [liveParticipants, authUser, livePlanId]);

  // Motor de Mira Fija Central (estilo Uber/InDrive) y toque para centrar
  useEffect(() => {
    if (!mapInstanceRef.current || !isSelectingLocationMode) return;
    const map = mapInstanceRef.current;

    const handleMoveStart = () => {
      setIsMapPanning(true);
    };

    const handleMove = () => {
      const center = map.getCenter();
      if (geofenceCircleRef.current) {
        geofenceCircleRef.current.setLatLng(center);
      }
    };

    const handleMoveEnd = () => {
      setIsMapPanning(false);
      const center = map.getCenter();
      if (isProgrammaticFlyRef.current) {
        isProgrammaticFlyRef.current = false;
      } else {
        setSelectedPlaceLabel(null);
      }
      setTargetCoords([center.lat, center.lng]);
    };

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      setSelectedPlaceLabel(null);
      map.panTo(e.latlng, { animate: true });
    };

    map.on('movestart', handleMoveStart);
    map.on('move', handleMove);
    map.on('moveend', handleMoveEnd);
    map.on('click', handleMapClick);

    return () => {
      map.off('movestart', handleMoveStart);
      map.off('move', handleMove);
      map.off('moveend', handleMoveEnd);
      map.off('click', handleMapClick);
    };
  }, [isSelectingLocationMode]);

  // Buscador de lugares con debounce (350ms)
  useEffect(() => {
    if (!isSelectingLocationMode) return;
    const trimmed = placeQuery.trim();
    if (trimmed.length < 2) {
      setPlaceResults([]);
      setSearchingPlaces(false);
      return;
    }

    const controller = new AbortController();
    setSearchingPlaces(true);
    const timer = window.setTimeout(async () => {
      const results = await searchPlaces(trimmed, userCoords, controller.signal);
      if (!controller.signal.aborted) {
        setPlaceResults(results);
        setSearchingPlaces(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [placeQuery, isSelectingLocationMode, userCoords]);

  const selectSearchResult = (place: PlaceSearchResult) => {
    isProgrammaticFlyRef.current = true;
    setSelectedPlaceLabel(place.name);
    setTargetCoords([place.lat, place.lng]);
    setPlaceResults([]);
    setPlaceQuery('');
    const updatedRecents = saveRecentPlace(place);
    setRecentPlaces(updatedRecents);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([place.lat, place.lng], 16, { duration: 0.85 });
    }
    showToast(`📍 ${place.name}`);
  };

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const handleCenterMapOnMyGps = () => {
    const flyToCoords = (coords: [number, number]) => {
      if (isSelectingLocationMode) {
        isProgrammaticFlyRef.current = true;
        setSelectedPlaceLabel('Mi ubicación GPS');
        setTargetCoords(coords);
      }
      mapInstanceRef.current?.flyTo(coords, 16, { duration: 0.7 });
      showToast('Centrado en tu ubicación 🎯');
    };

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const fresh: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserCoords(fresh);
          flyToCoords(fresh);
        },
        () => flyToCoords(userCoords),
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      flyToCoords(userCoords);
    }
  };

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

  const signInAndContinueOnboarding = async () => {
    await handleGoogleLogin();
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

  const startPickingLocationOnMap = () => {
    savedTargetBeforePickRef.current = [targetCoords[0], targetCoords[1]];
    setPlaceQuery('');
    setPlaceResults([]);
    setRecentPlaces(getRecentPlaces());
    setIsSelectingLocationMode(true);
    switchView('view-map');
    if (mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
        const currentZoom = mapInstanceRef.current?.getZoom() ?? 15;
        mapInstanceRef.current?.setView(targetCoords, Math.min(currentZoom, 15), {
          animate: true,
        });
      }, 220);
    }
  };

  const confirmLocationSelection = () => {
    let finalCoords = targetCoords;
    if (mapInstanceRef.current) {
      const center = mapInstanceRef.current.getCenter();
      finalCoords = [center.lat, center.lng];
      setTargetCoords(finalCoords);
    }
    const placeToSave: PlaceSearchResult = {
      id: `picked_${finalCoords[0].toFixed(4)}_${finalCoords[1].toFixed(4)}`,
      name:
        selectedPlaceLabel ||
        `Punto (${finalCoords[0].toFixed(3)}, ${finalCoords[1].toFixed(3)})`,
      subtitle: `${finalCoords[0].toFixed(4)}, ${finalCoords[1].toFixed(4)}`,
      lat: finalCoords[0],
      lng: finalCoords[1],
    };
    setRecentPlaces(saveRecentPlace(placeToSave));
    setIsSelectingLocationMode(false);
    setPlaceQuery('');
    setPlaceResults([]);
    switchView('view-create');
  };

  const cancelLocationSelection = () => {
    if (savedTargetBeforePickRef.current) {
      setTargetCoords(savedTargetBeforePickRef.current);
      mapInstanceRef.current?.setView(savedTargetBeforePickRef.current, 16, { animate: false });
    }
    setIsSelectingLocationMode(false);
    setPlaceQuery('');
    setPlaceResults([]);
    switchView('view-create');
  };

  const useCurrentLocationAsTarget = () => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setTargetCoords([pos.coords.latitude, pos.coords.longitude]);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.panTo([pos.coords.latitude, pos.coords.longitude], {
              animate: true,
            });
          }
          showToast('Punto fijado en tu GPS actual 🎯');
        },
        () => {
          setTargetCoords([userCoords[0], userCoords[1]]);
          showToast('Punto fijado en tu posición del mapa');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setTargetCoords([userCoords[0], userCoords[1]]);
    }
  };

  // ========================================
  // CREACIÓN DE SALA EN VIVO (HOST)
  // ========================================
  const generateInvite = async () => {
    if (creatingPlan) return;
    setRoomError(null);

    let activeUser = auth.currentUser;
    if (!activeUser) {
      activeUser = await handleGoogleLogin();
      if (!activeUser) return;
    }

    const title = planTitle.trim() || 'Plan en grupo';
    const hostAlias =
      userAlias.trim() ||
      activeUser.displayName?.split(' ')[0] ||
      'Anfitrión';
    if (!userAlias.trim()) {
      updateUserAlias(hostAlias);
    }

    const newPlanId = generateSafePlanId();
    const planData: PlanData = {
      title,
      vibe: selectedVibeText,
      lat: targetCoords[0],
      lng: targetCoords[1],
    };

    setCreatingPlan(true);
    try {
      await createLivePlanRoom({
        planId: newPlanId,
        title,
        vibe: selectedVibeText,
        targetLat: targetCoords[0],
        targetLng: targetCoords[1],
        hostUid: activeUser.uid,
        hostName: hostAlias,
        hostAvatar: userAvatar || '⚡',
        hostLat: userCoords[0],
        hostLng: userCoords[1],
        distanceMeters,
        etaLabel: distanceETA.etaLabel,
        isInside: isInsideGeofence,
      });

      try {
        localStorage.setItem('planealo_active_plan', JSON.stringify(planData));
        localStorage.setItem('planealo_active_plan_id', newPlanId);
      } catch {
        // safe fallback
      }

      setActivePlan(planData);
      setLivePlanId(newPlanId);
      setIsGuestMode(false);
      setInviteSubtitle(`Vibe: ${selectedVibeText} · ${title}`);
      setPostalTitle(title);

      const currentDomain =
        (typeof window !== 'undefined' && window.location.host) || 'planealo-aqui.netlify.app';
      const lat = targetCoords[0].toFixed(5);
      const lng = targetCoords[1].toFixed(5);
      const fullInviteUrl = `https://${currentDomain}/?id=${encodeURIComponent(
        newPlanId
      )}&t=${encodeURIComponent(title)}&v=${encodeURIComponent(
        selectedVibeText
      )}&lat=${lat}&lng=${lng}`;
      setInviteUrl(fullInviteUrl);

      showToast('Sala en vivo creada ⚡');
      switchView('view-invite');
    } catch {
      setRoomError('Error al crear la sala en vivo. Verifica tu conexión e inténtalo de nuevo.');
    } finally {
      setCreatingPlan(false);
    }
  };

  const openActivePlan = () => {
    if (livePlan) {
      setInviteSubtitle(`Vibe: ${livePlan.vibe} · ${livePlan.title}`);
      setPostalTitle(livePlan.title);
    } else if (activePlan) {
      setInviteSubtitle(`Vibe: ${activePlan.vibe} · ${activePlan.title}`);
      setPostalTitle(activePlan.title);
      const currentDomain =
        (typeof window !== 'undefined' && window.location.host) || 'planealo-aqui.netlify.app';
      const lat = (activePlan.lat ?? targetCoords[0]).toFixed(5);
      const lng = (activePlan.lng ?? targetCoords[1]).toFixed(5);
      const idQuery = livePlanId ? `id=${encodeURIComponent(livePlanId)}&` : '';
      setInviteUrl(
        `https://${currentDomain}/?${idQuery}t=${encodeURIComponent(
          activePlan.title
        )}&v=${encodeURIComponent(activePlan.vibe)}&lat=${lat}&lng=${lng}`
      );
    }
    setIsGuestMode(!isHostOfCurrentPlan);
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
    const currentDomain =
      (typeof window !== 'undefined' && window.location.host) || 'planealo-aqui.netlify.app';
    setInviteUrl(`https://${currentDomain}/?plan=${planId}`);
  };

  // ========================================
  // UNIRSE COMO INVITADO & PULSOS RÁPIDOS
  // ========================================
  const joinAsGuest = async () => {
    if (joiningRoom) return;
    setRoomError(null);

    if (!livePlanId) {
      setGuestJoined(true);
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#CCFF00', '#B5E600', '#FFFFFF', '#161A18'],
      });
      return;
    }

    let activeUser = auth.currentUser;
    if (!activeUser) {
      activeUser = await handleGoogleLogin();
      if (!activeUser) return;
    }

    const cleanAlias =
      userAlias.trim() ||
      activeUser.displayName?.split(' ')[0] ||
      'Invitado';
    if (!userAlias.trim()) {
      updateUserAlias(cleanAlias);
    }

    setJoiningRoom(true);
    try {
      await joinOrUpdateGuestInRoom({
        planId: livePlanId,
        uid: activeUser.uid,
        name: cleanAlias,
        avatar: userAvatar || '🏃',
        lat: userCoords[0],
        lng: userCoords[1],
        distanceMeters,
        etaLabel: distanceETA.etaLabel,
        isInside: isInsideGeofence,
      });

      setGuestJoined(true);
      lastTelemetryInsideRef.current = isInsideGeofence;
      lastTelemetrySyncAtRef.current = Date.now();

      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#CCFF00', '#B5E600', '#FFFFFF', '#161A18'],
      });
      showToast('¡Conectado en vivo al plan! 🚀');
    } catch {
      setRoomError('No pudimos unirte a esta sala. Verifica si el encuentro sigue activo.');
    } finally {
      setJoiningRoom(false);
    }
  };

  const handleQuickPulse = async (pulse: string) => {
    if (!authUser || !livePlanId || !hasJoinedCurrentRoom || livePlan?.status !== 'active') return;
    if (sendingPulse) return;

    setSendingPulse(true);
    try {
      await sendQuickPulse({
        planId: livePlanId,
        uid: authUser.uid,
        name: resolvedAlias,
        avatar: userAvatar || '⚡',
        quickPulse: pulse,
      });
      showToast(`Pulso enviado: ${pulse}`);
    } catch {
      setRoomError('No se pudo enviar el pulso rápido.');
    } finally {
      setSendingPulse(false);
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard
      .writeText(inviteUrl)
      .then(() => {
        showToast('¡Enlace en vivo copiado al portapapeles! 🔗');
      })
      .catch(() => {
        showToast('Copia el enlace manualmente arriba');
      });
  };

  const whatsappShareHref = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `¡Únete en vivo a "${planTitle}" en Planealo Aquí! ⚡ Mira dónde vamos y haz check-in aquí: ${inviteUrl}`
  )}`;

  const finishPlanAndCapture = async () => {
    if (finishingPlan) return;
    setFinishingPlan(true);

    try {
      if (livePlanId && livePlan?.status === 'active' && isHostOfCurrentPlan) {
        await finishLivePlan(livePlanId);
      }
      try {
        localStorage.removeItem('planealo_active_plan');
        localStorage.removeItem('planealo_active_plan_id');
      } catch {
        // safe fallback
      }
      setActivePlan(null);
      switchView('view-memory');
    } catch {
      setRoomError('No se pudo finalizar el encuentro. Intenta de nuevo.');
    } finally {
      setFinishingPlan(false);
    }
  };

  // ========================================
  // RECUERDO / POSTAL COLECTIVA
  // ========================================
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

  const getMemoryQuote = () => {
    if (currentStyle === 'postal') {
      return '“Un espacio libre de ruido para conectar de verdad.”';
    } else if (currentStyle === 'collage') {
      return '📸 Colección de momentos épicos en grupo.';
    } else {
      return '🤪 Misión cumplida: Sobrevivimos al plan sin perdernos.';
    }
  };

  const formattedTodayDate = useMemo(() => {
    try {
      return new Date().toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return 'Hoy';
    }
  }, []);

  const memoryAttendees = useMemo(() => {
    if (liveParticipants.length > 0) {
      return liveParticipants.map((p) => ({
        name: p.name,
        role: p.role === 'host' ? 'Host' : undefined,
        avatar: p.avatar || '👤',
      }));
    }
    return [{ name: resolvedAlias || 'Tú', role: 'Host', avatar: userAvatar || '⚡' }];
  }, [liveParticipants, resolvedAlias, userAvatar]);

  const arrivedCount = useMemo(
    () => liveParticipants.filter((p) => p.status === 'arrived').length,
    [liveParticipants]
  );

  const handleSavePostal = async () => {
    try {
      await downloadPostcardAsImage({
        title: postalTitle || planTitle || 'Plan en grupo',
        vibeText: selectedVibeText,
        style: currentStyle,
        quote: getMemoryQuote(),
        uploadedPhotoUrl: uploadedPhoto,
        date: formattedTodayDate,
        location: `${targetCoords[0].toFixed(3)}, ${targetCoords[1].toFixed(3)}`,
        attendees: memoryAttendees,
      });
      showToast('¡Recuerdo descargado como PNG de alta calidad! 💾');
    } catch {
      showToast('No se pudo generar la descarga PNG');
    }
  };

  const shareMemory = async () => {
    try {
      const shared = await sharePostcardAsFile({
        title: postalTitle || planTitle || 'Plan en grupo',
        vibeText: selectedVibeText,
        style: currentStyle,
        quote: getMemoryQuote(),
        uploadedPhotoUrl: uploadedPhoto,
        date: formattedTodayDate,
        location: `${targetCoords[0].toFixed(3)}, ${targetCoords[1].toFixed(3)}`,
        attendees: memoryAttendees,
      });
      if (shared) {
        showToast('¡Recuerdo listo para compartir! 🚀');
      } else {
        showToast('Compartir cancelado o no disponible');
      }
    } catch {
      showToast('No se pudo compartir la postal');
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
              Organiza planes al instante, coordina llegadas en vivo y conserva recuerdos significativos.
            </p>
          </div>

          <div style={{ marginTop: '20px' }}>
            <button className="btn-neon" onClick={completeOnboarding}>
              Comenzar
            </button>
            <p
              style={{
                textAlign: 'center',
                fontSize: '0.85rem',
                color: 'var(--text-gray)',
                marginTop: '12px',
              }}
            >
              ¿Ya tienes cuenta?{' '}
              <span
                style={{ color: 'var(--text-white)', fontWeight: 700, cursor: 'pointer' }}
                onClick={signInAndContinueOnboarding}
              >
                {authBusy ? 'Conectando...' : 'Iniciar sesión con Google'}
              </span>
            </p>
          </div>
        </div>

        {/* ========================================
             VISTA 1: MAPA VIVO
             ======================================== */}
        <div id="view-map" className={`view ${currentView === 'view-map' ? 'active' : ''}`}>
          <div id="map-container" ref={mapContainerRef}></div>

          {/* Mira Fija Central estilo Uber/InDrive al mover en mapa */}
          {isSelectingLocationMode && (
            <div className={`map-center-crosshair ${isMapPanning ? 'panning' : ''}`}>
              <div className="crosshair-pin">
                <div className="crosshair-pin-inner" />
              </div>
              <div className="crosshair-shadow" />
            </div>
          )}

          {/* Controles táctiles rápidos de Zoom y GPS */}
          <div
            className="map-controls-stack"
            style={{ bottom: isSelectingLocationMode ? '32px' : '108px' }}
          >
            <button
              type="button"
              className="map-ctrl-btn"
              onClick={handleZoomIn}
              title="Acercar"
              aria-label="Acercar mapa"
            >
              +
            </button>
            <button
              type="button"
              className="map-ctrl-btn"
              onClick={handleZoomOut}
              title="Alejar"
              aria-label="Alejar mapa"
            >
              −
            </button>
            <button
              type="button"
              className="map-ctrl-btn"
              onClick={handleCenterMapOnMyGps}
              title="Centrar en mi GPS"
              aria-label="Centrar en mi GPS"
            >
              🎯
            </button>
          </div>

          <div className="map-overlay-top">
            <div className="top-row">
              <div className="brand-pill-dark">Planealo Aquí ⚡</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="radar-btn-sim"
                  style={{
                    background: 'rgba(22, 26, 24, 0.88)',
                    backdropFilter: 'blur(16px)',
                    padding: '9px 12px',
                    borderRadius: '24px',
                    border: authUser
                      ? '1px solid rgba(204, 255, 0, 0.4)'
                      : '1px solid var(--card-border)',
                    color: authUser ? '#CCFF00' : '#FFFFFF',
                  }}
                  onClick={() => (authUser ? handleSignOut() : handleGoogleLogin())}
                  disabled={authBusy}
                  title={authUser ? 'Cerrar sesión' : 'Conectar con Google'}
                >
                  {authBusy
                    ? '...'
                    : authUser
                    ? `${userAvatar} ${resolvedAlias}`
                    : '🔐 Conectar'}
                </button>
                <button className="icon-btn-dark" onClick={goToMemory} title="Recuerdos">
                  📸
                </button>
              </div>
            </div>

            {/* Banner interactivo de búsqueda y mira central */}
            {isSelectingLocationMode ? (
              <div className="selector-banner">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '0.74rem',
                      color: 'var(--accent-neon)',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span
                      className="radar-pulse-dot"
                      style={{ backgroundColor: '#CCFF00', boxShadow: '0 0 8px #CCFF00' }}
                    ></span>
                    BUSCA O DESLIZA EL MAPA
                  </span>
                  <button
                    type="button"
                    onClick={cancelLocationSelection}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-gray)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ✕ Cancelar
                  </button>
                </div>

                {/* Buscador instantáneo de lugares, direcciones o enlaces de Maps */}
                <div className="place-search-box">
                  <span style={{ fontSize: '0.9rem' }}>🔍</span>
                  <input
                    type="text"
                    className="place-search-input"
                    placeholder="Buscar lugar, barrio o pegar coords/Maps..."
                    value={placeQuery}
                    onChange={(e) => setPlaceQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && placeResults.length > 0) {
                        e.preventDefault();
                        selectSearchResult(placeResults[0]);
                      }
                    }}
                  />
                  {placeQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setPlaceQuery('');
                        setPlaceResults([]);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-gray)',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {searchingPlaces && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-gray)' }}>
                    Buscando ubicaciones...
                  </span>
                )}

                {!searchingPlaces && placeResults.length > 0 && (
                  <div className="place-results-list">
                    {placeResults.map((place) => (
                      <button
                        key={place.id}
                        type="button"
                        className="place-result-item"
                        onClick={() => selectSearchResult(place)}
                      >
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-white)' }}>
                          📍 {place.name}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-gray)' }}>
                          {place.subtitle}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {!searchingPlaces && placeQuery.trim().length >= 2 && placeResults.length === 0 && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-gray)' }}>
                    Sin coincidencias exactas. Usa − para alejar o pega coordenadas.
                  </span>
                )}

                {/* Atajos rápidos de lugares recientes */}
                {placeQuery.trim().length === 0 && recentPlaces.length > 0 && (
                  <div className="recent-places-row">
                    {recentPlaces.map((rp) => (
                      <button
                        key={rp.id}
                        type="button"
                        className="recent-place-btn"
                        onClick={() => selectSearchResult(rp)}
                        title={rp.name}
                      >
                        🕒 {rp.name}
                      </button>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: selectedPlaceLabel ? 'var(--text-white)' : 'var(--text-gray)',
                      background: 'rgba(255,255,255,0.06)',
                      padding: '6px 9px',
                      borderRadius: '8px',
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontWeight: selectedPlaceLabel ? 700 : 500,
                    }}
                  >
                    📍{' '}
                    {selectedPlaceLabel ||
                      `${targetCoords[0].toFixed(4)}, ${targetCoords[1].toFixed(4)}`}
                  </span>
                  <button
                    type="button"
                    className="radar-btn-sim"
                    style={{
                      background: 'var(--accent-neon)',
                      color: '#0A0C0B',
                      border: 'none',
                      padding: '6px 12px',
                      fontWeight: 800,
                    }}
                    onClick={confirmLocationSelection}
                  >
                    Confirmar Punto ✅
                  </button>
                </div>
              </div>
            ) : (
              /* Radar GPS de Geocerca en Tiempo Real */
              <div className={`radar-pill ${isInsideGeofence ? 'inside' : ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    className="radar-pulse-dot"
                    style={{ backgroundColor: isInsideGeofence ? '#CCFF00' : '#8A9590' }}
                  />
                  <div>
                    <span
                      style={{
                        fontWeight: 800,
                        color: isInsideGeofence ? '#CCFF00' : '#FFFFFF',
                        display: 'block',
                        fontSize: '0.8rem',
                      }}
                    >
                      {isInsideGeofence
                        ? '📍 DENTRO DEL PERÍMETRO (<50m)'
                        : `RADAR GPS: A ${distanceETA.distanceLabel}`}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-gray)' }}>
                      {isInsideGeofence
                        ? '✅ Check-in automático confirmado'
                        : `${distanceETA.etaLabel} · Radio Geocerca: 50m`}
                    </span>
                  </div>
                </div>
                <button className="radar-btn-sim" onClick={toggleSimulateArrival}>
                  {isSimulatedArrival ? 'GPS Real' : 'Simular Llegada'}
                </button>
              </div>
            )}

            {/* Píldora flotante para supervisar la sala en vivo */}
            {!isSelectingLocationMode && (activePlan || livePlan) && livePlan?.status !== 'finished' && (
              <div className="active-plan-pill" id="map-plan-pill" onClick={openActivePlan}>
                <div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--accent-neon)',
                      fontWeight: 800,
                      display: 'block',
                    }}
                  >
                    ⚡ SALA EN VIVO
                  </span>
                  <span
                    style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-white)' }}
                    id="map-pill-title"
                  >
                    {livePlan?.title || activePlan?.title}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '0.82rem',
                    background: 'rgba(204,255,0,0.15)',
                    color: 'var(--accent-neon)',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                  }}
                  id="map-pill-count"
                >
                  {liveParticipants.length > 0
                    ? `${arrivedCount}/${liveParticipants.length} en punto →`
                    : 'Abrir sala →'}
                </span>
              </div>
            )}
          </div>

          {!isSelectingLocationMode && (
            <div className="map-overlay-bottom">
              <div className="action-pill-neon" onClick={goToCreatePlan}>
                <span>¿Cuál es el plan hoy?</span>
                <div className="action-arrow-dark">→</div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================
             VISTA 2: CREAR PLAN
             ======================================== */}
        <div
          id="view-create"
          className={`solid-view ${currentView === 'view-create' ? 'active' : ''}`}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}
          >
            <h3
              style={{ cursor: 'pointer', fontSize: '0.95rem', color: 'var(--text-gray)' }}
              onClick={() => switchView('view-map')}
            >
              ← Cancelar
            </h3>
            <span style={{ fontWeight: 800, color: 'var(--accent-neon)', fontSize: '0.9rem' }}>
              Sala en Vivo
            </span>
          </div>
          <h1>Nuevo Plan</h1>
          <p className="subtitle">Define la vibra, el punto y tu alias para la sala.</p>

          <div style={{ marginBottom: '14px' }}>
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
              maxLength={100}
              value={planTitle}
              onChange={(e) => setPlanTitle(e.target.value)}
            />
          </div>

          <label
            style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              display: 'block',
              marginBottom: '8px',
              color: 'var(--text-white)',
            }}
          >
            Selecciona la Vibe
          </label>
          <div className="vibe-grid" style={{ marginBottom: '14px' }}>
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

          {/* Identidad rápida en la sala */}
          <div
            className="card-dark"
            style={{ marginBottom: '14px', padding: '16px', border: '1px solid var(--card-border)' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}
            >
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-white)' }}>
                Tu Alias en el Plan
              </label>
              <span
                style={{
                  fontSize: '0.72rem',
                  color: authUser ? 'var(--accent-neon)' : 'var(--text-gray)',
                  fontWeight: 700,
                }}
              >
                {authUser ? `✓ ${authUser.email}` : 'Google requerido al crear'}
              </span>
            </div>
            <input
              type="text"
              className="input-dark"
              style={{ padding: '12px 14px', fontSize: '0.92rem', marginBottom: '10px' }}
              placeholder="Ej. Carlos M."
              maxLength={40}
              value={userAlias}
              onChange={(e) => updateUserAlias(e.target.value)}
            />
            <div className="avatar-row">
              {AVATAR_OPTIONS.map((av) => (
                <button
                  key={av}
                  type="button"
                  className={`avatar-chip ${userAvatar === av ? 'selected' : ''}`}
                  onClick={() => updateUserAvatar(av)}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          {/* Selector dinámico de Punto de Encuentro */}
          <div
            className="card-dark"
            style={{ marginBottom: '16px', padding: '16px', border: '1px solid var(--card-border)' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
              }}
            >
              <label
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: 'var(--text-white)',
                  marginBottom: 0,
                }}
              >
                📍 Punto de Encuentro
              </label>
              <span
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--accent-neon)',
                  background: 'rgba(204,255,0,0.12)',
                  padding: '2px 8px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  maxWidth: '55%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {selectedPlaceLabel || `${targetCoords[0].toFixed(4)}, ${targetCoords[1].toFixed(4)}`}
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-gray)', marginBottom: '10px' }}>
              Ubicación exacta donde se trazará la geocerca activa de 50 metros.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn-location-action"
                onClick={startPickingLocationOnMap}
              >
                🗺️ Mover en Mapa
              </button>
              <button
                type="button"
                className="btn-location-action"
                onClick={useCurrentLocationAsTarget}
              >
                🎯 Mi GPS Aquí
              </button>
            </div>
          </div>

          {(authError || roomError) && (
            <p style={{ color: '#ff8585', fontSize: '0.8rem', marginBottom: '10px', textAlign: 'center' }}>
              {authError || roomError}
            </p>
          )}

          <div className="view-footer">
            <button className="btn-neon" onClick={generateInvite} disabled={creatingPlan || authBusy}>
              {creatingPlan
                ? 'Creando sala en vivo...'
                : authUser
                ? 'Armar enlace en vivo ⚡'
                : 'Conectar con Google y armar sala ⚡'}
            </button>
          </div>
        </div>

        {/* ========================================
             VISTA 3: SALA DE INVITACIÓN EN VIVO
             ======================================== */}
        <div
          id="view-invite"
          className={`solid-view ${currentView === 'view-invite' ? 'active' : ''}`}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}
          >
            <h3
              style={{ cursor: 'pointer', fontSize: '0.95rem', color: 'var(--text-gray)' }}
              onClick={() => switchView('view-map')}
            >
              ← Volver al Mapa
            </h3>
            <span className={`live-badge ${livePlan?.status === 'finished' ? 'finished' : ''}`}>
              {livePlan?.status === 'finished'
                ? '🏁 Finalizado'
                : liveParticipants.length > 0
                ? `⚡ En vivo · ${arrivedCount}/${liveParticipants.length} en punto`
                : '⚡ Sala Activa'}
            </span>
          </div>

          <h1>
            {livePlan?.status === 'finished'
              ? '¡Encuentro completado! 🏁'
              : '¡Plan listo para rodar! 🔥'}
          </h1>
          <p className="subtitle" id="invite-subtitle">
            {inviteSubtitle}
          </p>

          {(authError || roomError) && (
            <div
              className="card-dark"
              style={{
                borderColor: 'rgba(255, 107, 107, 0.45)',
                background: 'rgba(255, 107, 107, 0.08)',
                padding: '12px 16px',
              }}
            >
              <p style={{ color: '#ff9b9b', fontSize: '0.82rem', margin: 0 }}>
                {authError || roomError}
              </p>
            </div>
          )}

          {/* Bloque de Compartir Enlace */}
          <div
            className="card-dark"
            style={{ textAlign: 'center', border: '2px dashed var(--accent-neon)', padding: '16px' }}
          >
            <p style={{ fontSize: '0.8rem', color: 'var(--text-gray)', marginBottom: '6px' }}>
              Enlace en tiempo real para compartir
            </p>
            <h3
              id="invite-url-text"
              style={{
                color: 'var(--accent-neon)',
                marginBottom: '12px',
                fontSize: '0.95rem',
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
                  fontWeight: 700,
                }}
                onClick={copyInviteLink}
              >
                Copiar Enlace
              </button>
              <a
                className="btn-whatsapp"
                style={{ padding: '10px', fontSize: '0.85rem' }}
                href={whatsappShareHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </a>
            </div>
          </div>

          {/* Paso 1 para invitado no conectado: Login rápido con Google */}
          {!authUser && (
            <div
              className="card-dark"
              style={{ borderColor: 'rgba(204, 255, 0, 0.4)', padding: '16px' }}
            >
              <h4 style={{ fontSize: '0.95rem', marginBottom: '6px', color: 'var(--text-white)' }}>
                Conéctate para entrar en vivo ⚡
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-gray)', marginBottom: '12px' }}>
                Inicia sesión con Google en 1 toque para ver al grupo en el mapa, enviar pulsos y
                marcar tu llegada.
              </p>
              <button
                className="btn-neon"
                style={{ padding: '13px', fontSize: '0.95rem' }}
                onClick={handleGoogleLogin}
                disabled={authBusy}
              >
                {authBusy ? 'Conectando...' : 'Conectar con Google ⚡'}
              </button>
            </div>
          )}

          {/* Paso 2 para invitado autenticado que aún no se une a la sala */}
          {authUser &&
            livePlanId &&
            !hasJoinedCurrentRoom &&
            livePlan?.status !== 'finished' && (
              <div
                className="card-dark"
                style={{ borderColor: 'rgba(204, 255, 0, 0.4)', padding: '16px' }}
              >
                <h4
                  style={{ fontSize: '0.92rem', marginBottom: '8px', color: 'var(--text-white)' }}
                >
                  ¿Cómo quieres aparecer en la sala?
                </h4>
                <input
                  type="text"
                  className="input-dark"
                  style={{ padding: '11px 14px', fontSize: '0.9rem', marginBottom: '10px' }}
                  placeholder="Tu nombre o apodo"
                  maxLength={40}
                  value={userAlias}
                  onChange={(e) => updateUserAlias(e.target.value)}
                />
                <div className="avatar-row" style={{ marginBottom: '12px' }}>
                  {AVATAR_OPTIONS.map((av) => (
                    <button
                      key={av}
                      type="button"
                      className={`avatar-chip ${userAvatar === av ? 'selected' : ''}`}
                      onClick={() => updateUserAvatar(av)}
                    >
                      {av}
                    </button>
                  ))}
                </div>
                <button
                  className="btn-neon"
                  onClick={joinAsGuest}
                  id="join-btn"
                  disabled={joiningRoom}
                  style={{ padding: '13px', fontSize: '0.95rem' }}
                >
                  {joiningRoom ? 'Conectando a sala...' : '¡Voy en camino! 🏃‍♂️'}
                </button>
              </div>
            )}

          {/* Pulsos Tácticos Instantáneos (cero ruido de chat) */}
          {authUser &&
            livePlanId &&
            hasJoinedCurrentRoom &&
            livePlan?.status === 'active' && (
              <div className="card-dark" style={{ padding: '14px 16px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-white)' }}>
                    ⚡ Pulso rápido (1 toque)
                  </span>
                  <button
                    type="button"
                    className="radar-btn-sim"
                    onClick={toggleSimulateArrival}
                  >
                    {isSimulatedArrival ? 'GPS Real' : 'Simular Llegada'}
                  </button>
                </div>
                <div className="pulse-grid">
                  {PULSE_OPTIONS.map((pulse) => {
                    const isCurrent = myParticipantRecord?.quickPulse === pulse;
                    return (
                      <button
                        key={pulse}
                        type="button"
                        className={`pulse-chip-btn ${isCurrent ? 'active' : ''}`}
                        onClick={() => handleQuickPulse(pulse)}
                        disabled={sendingPulse}
                      >
                        {pulse}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          {/* Lista de Participantes en Tiempo Real */}
          <div className="card-dark" style={{ padding: '16px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px',
              }}
            >
              <h4
                id="participants-title"
                style={{ fontSize: '0.95rem', margin: 0, color: 'var(--text-white)' }}
              >
                En la sala ({liveParticipants.length})
              </h4>
              {liveParticipants.length > 0 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-neon)', fontWeight: 700 }}>
                  {arrivedCount} en el punto
                </span>
              )}
            </div>

            {!authUser ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-gray)', margin: 0 }}>
                Conecta tu cuenta de Google para ver quién ya va en camino en tiempo real.
              </p>
            ) : liveParticipants.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-gray)', margin: 0 }}>
                {livePlanId
                  ? 'Sincronizando participantes en vivo...'
                  : 'Crea un enlace para activar el radar multiusuario.'}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {liveParticipants.map((p) => {
                  const isMe = p.uid === authUser?.uid;
                  const arrived = p.status === 'arrived';
                  const pDist = formatDistanceETA(p.distanceMeters);
                  return (
                    <div key={p.uid} className={`participant-row ${isMe ? 'is-me' : ''}`}>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.86rem',
                            color: 'var(--text-white)',
                            fontWeight: 700,
                          }}
                        >
                          <span>{p.avatar || '👤'}</span>
                          <span
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {p.name}
                            {isMe ? ' (Tú)' : ''}
                          </span>
                          {p.role === 'host' && (
                            <span
                              style={{
                                background: 'rgba(204,255,0,0.15)',
                                color: 'var(--accent-neon)',
                                padding: '2px 6px',
                                borderRadius: '6px',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                              }}
                            >
                              Host
                            </span>
                          )}
                        </div>
                        {p.quickPulse && (
                          <div
                            style={{
                              fontSize: '0.72rem',
                              color: 'var(--text-gray)',
                              marginTop: '2px',
                            }}
                          >
                            {p.quickPulse}
                          </div>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: arrived ? '#CCFF00' : '#ff9f68',
                          textAlign: 'right',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {arrived ? '📍 En el punto ✅' : `🚀 A ${pDist.distanceLabel}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="view-footer">
            {livePlan?.status === 'finished' ? (
              <button
                className="btn-neon"
                onClick={() => switchView('view-memory')}
                style={{ marginBottom: '8px' }}
              >
                📸 Ver & Descargar Recuerdo Colectivo
              </button>
            ) : (
              (isHostOfCurrentPlan || !livePlanId) && (
                <button
                  className="btn-neon"
                  onClick={finishPlanAndCapture}
                  disabled={finishingPlan}
                  style={{ backgroundColor: '#ff6b6b', color: '#fff', marginBottom: '8px' }}
                >
                  {finishingPlan ? 'Finalizando...' : '🏁 Finalizar Encuentro & Recuerdo'}
                </button>
              )
            )}
            <button
              className="btn-neon"
              onClick={() => switchView('view-map')}
              style={{
                background: 'var(--card-dark)',
                color: 'var(--text-white)',
                border: '1px solid var(--card-border)',
              }}
            >
              Ver Mapa en Vivo
            </button>
          </div>
        </div>

        {/* ========================================
             VISTA 4: RECUERDO / POSTAL & SELFIE COLECTIVA
             ======================================== */}
        <div
          id="view-memory"
          className={`solid-view ${currentView === 'view-memory' ? 'active' : ''}`}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}
          >
            <h3
              style={{ cursor: 'pointer', fontSize: '0.95rem', color: 'var(--text-gray)' }}
              onClick={() => switchView('view-map')}
            >
              ← Volver al Mapa
            </h3>
            <span style={{ fontWeight: 800, color: 'var(--accent-neon)' }}>
              Recuerdo Colectivo 📸
            </span>
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
            <p
              style={{ fontSize: '0.8rem', color: 'var(--accent-neon)', fontWeight: 700 }}
              id="postal-tagline"
            >
              ✨ Vibe: {selectedVibeText}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-gray)', marginTop: '4px' }}>
              {formattedTodayDate}
            </p>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '6px',
                marginTop: '10px',
              }}
            >
              {memoryAttendees.map((att, idx) => (
                <span
                  key={`${att.name}-${idx}`}
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '4px 9px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border:
                      att.role === 'Host'
                        ? '1px solid rgba(204, 255, 0, 0.45)'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                    color: att.role === 'Host' ? 'var(--accent-neon)' : 'var(--text-white)',
                  }}
                >
                  {att.avatar} {att.name}
                </span>
              ))}
            </div>
          </div>

          <div className="card-dark" style={{ padding: '12px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-gray)' }} id="memory-quote">
              {getMemoryQuote()}
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
              onClick={handleSavePostal}
            >
              Guardar 💾
            </button>
            <button className="btn-neon" style={{ flex: 1, marginTop: 0 }} onClick={shareMemory}>
              Compartir 🚀
            </button>
          </div>
        </div>

        {/* Non-blocking Dark Pro Toast */}
        {toastMessage && <div className="toast-banner">{toastMessage}</div>}
      </div>
    </div>
  );
}
