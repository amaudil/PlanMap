export type VibeCategory = 'chill' | 'energia' | 'aire_libre' | 'nocturno' | 'creativo' | 'gastro';

export interface Vibe {
  id: VibeCategory;
  name: string;
  emoji: string;
  color: string;
  lightBg: string;
  borderColor: string;
  description: string;
  soundType: 'coffee' | 'park' | 'night' | 'creativity' | 'fire' | 'upbeat';
}

export interface Participant {
  id: string;
  name: string;
  avatar: string;
  role: 'organizer' | 'member';
  status: 'arrived' | 'on_the_way' | 'confirmed';
  eta?: string;
  lat: number;
  lng: number;
  lastMessage?: string;
  signature?: string;
}

export interface PlanExperience {
  id: string;
  title: string;
  vibe: Vibe;
  locationName: string;
  address: string;
  city: string;
  coordinates: [number, number];
  date: string;
  time: string;
  inviteCode: string;
  status: 'active' | 'in_progress' | 'completed';
  participants: Participant[];
  notes?: string;
  postcard?: PostcardMemory;
}

// Backward-compatibility alias
export type CampfireExperience = PlanExperience;

export interface PostcardMemory {
  id: string;
  campfireId: string;
  title: string;
  vibeEmoji: string;
  vibeName: string;
  date: string;
  city: string;
  location: string;
  heroImage: string;
  quote: string;
  theme: 'terracotta' | 'sage' | 'twilight' | 'sand';
  attendees: { name: string; avatar: string; signature: string }[];
  soundtrack?: string;
  stampText: string;
}
