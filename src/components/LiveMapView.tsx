import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import confetti from 'canvas-confetti';
import { Sparkles, Navigation, Users, CheckCircle, ArrowLeft, Crosshair, MapPin } from 'lucide-react';
import { PlanExperience } from '../types';
import { soundManager } from '../utils/audio';

interface LiveMapViewProps {
  plan: PlanExperience;
  onExit: () => void;
  onFinishAndCreateMemory: () => void;
  userName: string;
}

export const LiveMapView: React.FC<LiveMapViewProps> = ({
  plan,
  onExit,
  onFinishAndCreateMemory,
  userName,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [distanceInfo, setDistanceInfo] = useState<string>('En el radio del punto');

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const center: [number, number] = plan.coordinates || [8.9824, -79.5199];

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
    }).setView(center, 15);

    L.control.zoom({ position: 'topright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Plan Epicenter Pulsing Marker
    const planIcon = L.divIcon({
      className: 'custom-campfire-marker',
      html: `
        <div style="position: relative; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 52px; height: 52px; border-radius: 50%; background: ${plan.vibe.color}; opacity: 0.25; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: white; box-shadow: 0 4px 14px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; font-size: 22px; border: 3px solid ${plan.vibe.color}; z-index: 10;">
            ${plan.vibe.emoji}
          </div>
        </div>
      `,
      iconSize: [56, 56],
      iconAnchor: [28, 28],
    });

    const planMarker = L.marker(center, { icon: planIcon }).addTo(map);
    planMarker.bindPopup(`
      <div style="text-align: center; padding: 4px;">
        <b style="color: #3D405B; font-size: 13px;">${plan.title}</b>
        <p style="color: #718096; font-size: 11px; margin: 4px 0 0;">Punto de encuentro PlanMap</p>
        <p style="color: #A0AEC0; font-size: 10px; margin: 2px 0 0;">${plan.locationName}</p>
        <div style="margin-top: 6px; font-size: 10px; background: #FFF5F2; color: #E07A5F; padding: 2px 6px; border-radius: 6px; font-weight: bold; display: inline-block;">
          Vibe: ${plan.vibe.name}
        </div>
      </div>
    `).openPopup();
    markersRef.current.push(planMarker);

    // Participant Markers
    plan.participants.forEach((p) => {
      const participantIcon = L.divIcon({
        className: 'custom-participant-marker',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: white; border: 2px solid ${
              p.status === 'arrived' ? '#81B29A' : '#E07A5F'
            }; box-shadow: 0 3px 8px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; font-size: 16px;">
              ${p.avatar}
            </div>
            <div style="background: rgba(45, 55, 72, 0.88); backdrop-filter: blur(4px); color: white; font-size: 9px; font-weight: bold; padding: 1px 5px; border-radius: 8px; margin-top: 2px; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
              ${p.name.split(' ')[0]}
            </div>
          </div>
        `,
        iconSize: [40, 48],
        iconAnchor: [20, 24],
      });

      const pMarker = L.marker([p.lat, p.lng], { icon: participantIcon }).addTo(map);
      pMarker.bindPopup(`
        <div style="font-size: 12px;">
          <b>${p.name}</b><br/>
          <span style="color: #718096; font-size: 10px;">${
            p.status === 'arrived' ? '✅ Ya en el punto' : `🚲 ${p.eta || 'En camino'}`
          }</span>
          ${p.lastMessage ? `<p style="margin-top: 4px; font-style: italic; color: #4A5568;">"${p.lastMessage}"</p>` : ''}
        </div>
      `);
      markersRef.current.push(pMarker);
    });

    mapInstanceRef.current = map;

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [plan]);

  const handleLocateMe = () => {
    if (!navigator.geolocation || !mapInstanceRef.current) {
      alert('Geolocalización no soportada o bloqueada en tu navegador.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserCoords([latitude, longitude]);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 17);

          const myIcon = L.divIcon({
            className: 'my-loc-marker',
            html: `
              <div style="width: 20px; height: 20px; border-radius: 50%; background: #3B82F6; border: 3px solid white; box-shadow: 0 0 10px #3B82F6; animation: pulse 1.5s infinite;"></div>
            `,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          });

          L.marker([latitude, longitude], { icon: myIcon })
            .addTo(mapInstanceRef.current)
            .bindPopup('📍 Estás aquí')
            .openPopup();
        }
      },
      () => {
        if (mapInstanceRef.current) {
          const simLat = plan.coordinates[0] + 0.0008;
          const simLng = plan.coordinates[1] + 0.0006;
          mapInstanceRef.current.setView([simLat, simLng], 17);
          setDistanceInfo('Aprox. 45 metros del punto');
        }
      }
    );
  };

  const handleCheckIn = () => {
    setIsCheckedIn(true);
    soundManager.playChime();
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#E07A5F', '#81B29A', '#F4A261', '#3D405B'],
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden animate-in fade-in duration-300">
      {/* Header bar */}
      <div className="flex items-center justify-between px-2 py-2 mb-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={onExit}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <h3 className="font-bold text-xs text-[#3D405B]">📍 Mapa Vivo Activo</h3>
            </div>
            <p className="text-[10px] text-slate-400 font-medium truncate max-w-[170px]">
              {plan.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleLocateMe}
            title="Centrar en mi posición"
            className="p-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors text-xs flex items-center gap-1 font-semibold"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onExit}
            className="btn-outline px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Salir
          </button>
        </div>
      </div>

      {/* Floating Status Pill */}
      <div className="flex items-center justify-between px-3 py-1.5 mb-2 bg-[#FFF5F2] border border-[#E07A5F]/20 rounded-xl text-xs text-[#E07A5F]">
        <span className="flex items-center gap-1 font-semibold truncate">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{plan.locationName}</span>
        </span>
        <span className="text-[11px] font-bold shrink-0 bg-white px-2 py-0.5 rounded-md shadow-2xs">
          {plan.participants.length} en el Plan
        </span>
      </div>

      {/* Map Container */}
      <div id="map-container" className="relative flex-1 w-full min-h-[340px] rounded-2xl overflow-hidden border border-slate-200/80 shadow-inner mb-3">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Check-in floating pill */}
        <div className="absolute bottom-3 left-3 right-3 z-[1000] flex gap-2">
          {!isCheckedIn ? (
            <button
              onClick={handleCheckIn}
              className="flex-1 py-2 px-3 bg-white/95 backdrop-blur-md border border-slate-200 text-[#3D405B] font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 hover:bg-white active:scale-95 transition-all"
            >
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Marcar mi Check-in 📍</span>
            </button>
          ) : (
            <div className="flex-1 py-2 px-3 bg-emerald-500/95 backdrop-blur-md text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>¡Check-in confirmado en el punto!</span>
            </div>
          )}
        </div>
      </div>

      {/* Primary Action Button */}
      <button
        onClick={onFinishAndCreateMemory}
        className="btn w-full py-3.5 bg-gradient-to-r from-[#E07A5F] via-[#e2694b] to-[#E07A5F] hover:opacity-95 text-white font-bold rounded-2xl text-sm transition-all shadow-md shadow-[#E07A5F]/25 flex items-center justify-center gap-2 active:scale-[0.98] shrink-0"
      >
        <Sparkles className="w-4 h-4 text-amber-200 animate-spin" style={{ animationDuration: '4s' }} />
        <span>✨ Finalizar y Crear Recuerdo</span>
      </button>
    </div>
  );
};
