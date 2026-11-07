import { Vibe, PlanExperience, PostcardMemory } from '../types';

export const VIBES: Vibe[] = [
  {
    id: 'chill',
    name: 'Chill',
    emoji: '☕',
    color: '#CCFF00',
    lightBg: 'rgba(204, 255, 0, 0.12)',
    borderColor: '#CCFF00',
    description: 'Cafés tranquilos, estudio enfocado y charla sin prisa.',
    soundType: 'coffee',
  },
  {
    id: 'energia',
    name: 'Energía',
    emoji: '👟',
    color: '#CCFF00',
    lightBg: 'rgba(204, 255, 0, 0.12)',
    borderColor: '#CCFF00',
    description: 'Running, paseo activo al sol, patines y buen ritmo.',
    soundType: 'upbeat',
  },
  {
    id: 'aire_libre',
    name: 'Aire libre',
    emoji: '🌳',
    color: '#CCFF00',
    lightBg: 'rgba(204, 255, 0, 0.12)',
    borderColor: '#CCFF00',
    description: 'Parques arbolados, picnics en la hierba y desconexión.',
    soundType: 'park',
  },
  {
    id: 'nocturno',
    name: 'Nocturno',
    emoji: '🌙',
    color: '#CCFF00',
    lightBg: 'rgba(204, 255, 0, 0.12)',
    borderColor: '#CCFF00',
    description: 'Rooftops estrellados, brisa nocturna y luces de la ciudad.',
    soundType: 'night',
  },
];

export const POPULAR_LOCATIONS = [
  {
    name: 'Casco Antiguo · Café Unido',
    address: 'Av. A y Calle 4ta, San Felipe',
    city: 'Ciudad de Panamá',
    coords: [8.9824, -79.5199] as [number, number],
    vibeId: 'chill',
  },
  {
    name: 'Parque Omar · Colina Verde',
    address: 'Vía Porras, San Francisco',
    city: 'Ciudad de Panamá',
    coords: [8.9953, -79.5015] as [number, number],
    vibeId: 'aire_libre',
  },
  {
    name: 'Cinta Costera · Mirador',
    address: 'Av. Balboa frente a Bahía',
    city: 'Ciudad de Panamá',
    coords: [8.9734, -79.5255] as [number, number],
    vibeId: 'energia',
  },
  {
    name: 'Causeway de Amador',
    address: 'Calzada de Amador',
    city: 'Ciudad de Panamá',
    coords: [8.9192, -79.5447] as [number, number],
    vibeId: 'nocturno',
  },
];

export const INITIAL_PLANS: PlanExperience[] = [
  {
    id: 'plan-1',
    title: 'Café y estudio en Casco Antiguo',
    vibe: VIBES[0], // Chill ☕
    locationName: 'Casco Antiguo · Café Unido',
    address: 'Av. A y Calle 4ta, San Felipe',
    city: 'Panamá',
    coordinates: [8.9824, -79.5199],
    date: 'Hoy, 6 Noviembre',
    time: '4:30 PM - 6:30 PM',
    inviteCode: 'planmap.app/join/x9f2',
    status: 'active',
    notes: 'Mesa al fondo cerca del patio interior con enchufes. Traigan laptops o apuntes.',
    participants: [
      {
        id: 'u-1',
        name: 'Tú',
        avatar: '👤',
        role: 'organizer',
        status: 'arrived',
        lat: 8.9824,
        lng: -79.5199,
        lastMessage: 'Tú estás aquí ✨',
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
        lastMessage: 'Llegando con los apuntes listos!',
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
        lastMessage: 'Estacionando la bici cerca',
        signature: 'Mateo 🚲',
      },
    ],
  },
];

export const INITIAL_MEMORIES: PostcardMemory[] = [
  {
    id: 'mem-1',
    campfireId: 'plan-1',
    title: 'Café y Estudio en Casco',
    vibeEmoji: '🌅',
    vibeName: 'Chill',
    date: '6 de Noviembre, 2026',
    city: 'Ciudad de Panamá',
    location: 'Panamá',
    heroImage: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
    quote: '“Un espacio libre de ruido para conectar de verdad.”',
    theme: 'twilight',
    stampText: 'PANAMÁ · PLANMAP DARK PRO',
    soundtrack: 'Lo-Fi Chill & Focus Beats',
    attendees: [
      { name: 'Tú', avatar: '👤', signature: 'Tú ⚡' },
      { name: 'Sofía', avatar: '👩💻', signature: 'Sofía R.' },
      { name: 'Mateo', avatar: '🧑🎨', signature: 'Mateo V.' },
    ],
  },
];

export const SAMPLE_POSTCARD_PHOTOS = [
  {
    id: 'coffee1',
    label: 'Mesa de estudio y café',
    url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
    vibe: 'chill',
  },
  {
    id: 'sunset1',
    label: 'Atardecer en la bahía',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    vibe: 'nocturno',
  },
  {
    id: 'park1',
    label: 'Parque y calma',
    url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80',
    vibe: 'aire_libre',
  },
];
