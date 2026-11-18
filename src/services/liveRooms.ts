import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

export interface LivePlanDoc {
  id: string;
  title: string;
  vibe: string;
  targetLat: number;
  targetLng: number;
  hostId: string;
  hostName: string;
  status: 'active' | 'finished';
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface LiveParticipantDoc {
  uid: string;
  planId: string;
  name: string;
  avatar: string;
  role: 'host' | 'guest';
  status: 'on_the_way' | 'arrived';
  quickPulse: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  etaLabel: string;
  joinedAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

// =========================================================
// BLUEPRINT LIMITS (Synced with firebase-blueprint.json)
// =========================================================
const MAX_TITLE_LEN = 100;
const MAX_VIBE_LEN = 40;
const MAX_HOST_NAME_LEN = 50;
const MAX_PARTICIPANT_NAME_LEN = 40;
const MAX_AVATAR_LEN = 12;
const MAX_PULSE_LEN = 60;
const MAX_ETA_LEN = 40;
const MAX_DISTANCE_METERS = 20000000;

function clampStr(val: string, maxLen: number, fallback: string): string {
  const trimmed = (val || '').trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLen);
}

function clampLat(lat: number): number {
  if (!Number.isFinite(lat)) return 8.9824;
  return Math.max(-90, Math.min(90, lat));
}

function clampLng(lng: number): number {
  if (!Number.isFinite(lng)) return -79.5199;
  return Math.max(-180, Math.min(180, lng));
}

function clampDist(meters: number): number {
  if (!Number.isFinite(meters) || meters < 0) return 0;
  return Math.min(MAX_DISTANCE_METERS, Math.round(meters));
}

export function generateSafePlanId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let suffix = '';
  const bytes = new Uint8Array(10);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
    for (let i = 0; i < bytes.length; i++) {
      suffix += chars[bytes[i] % chars.length];
    }
  } else {
    suffix = Math.random().toString(36).slice(2, 12);
  }
  return `plan_${suffix}`;
}

export async function createLivePlanRoom(params: {
  planId: string;
  title: string;
  vibe: string;
  targetLat: number;
  targetLng: number;
  hostUid: string;
  hostName: string;
  hostAvatar: string;
  hostLat: number;
  hostLng: number;
  distanceMeters: number;
  etaLabel: string;
  isInside: boolean;
}): Promise<void> {
  const { planId, hostUid } = params;
  const planPath = `plans/${planId}`;
  const participantPath = `plans/${planId}/participants/${hostUid}`;

  const cleanTitle = clampStr(params.title, MAX_TITLE_LEN, 'Plan en grupo');
  const cleanVibe = clampStr(params.vibe, MAX_VIBE_LEN, '☕ Chill');
  const cleanHostName = clampStr(params.hostName, MAX_HOST_NAME_LEN, 'Anfitrión');
  const cleanParticipantName = clampStr(params.hostName, MAX_PARTICIPANT_NAME_LEN, 'Anfitrión');
  const cleanAvatar = clampStr(params.hostAvatar, MAX_AVATAR_LEN, '⚡');
  const cleanEta = clampStr(params.etaLabel, MAX_ETA_LEN, 'En camino');

  try {
    const batch = writeBatch(db);
    const planRef = doc(db, 'plans', planId);
    const hostParticipantRef = doc(db, 'plans', planId, 'participants', hostUid);

    batch.set(planRef, {
      title: cleanTitle,
      vibe: cleanVibe,
      targetLat: clampLat(params.targetLat),
      targetLng: clampLng(params.targetLng),
      hostId: hostUid,
      hostName: cleanHostName,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(hostParticipantRef, {
      uid: hostUid,
      planId,
      name: cleanParticipantName,
      avatar: cleanAvatar,
      role: 'host',
      status: params.isInside ? 'arrived' : 'on_the_way',
      quickPulse: '⚡ Sala creada',
      lat: clampLat(params.hostLat),
      lng: clampLng(params.hostLng),
      distanceMeters: clampDist(params.distanceMeters),
      etaLabel: cleanEta,
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${planPath} & ${participantPath}`);
  }
}

export async function fetchPlanById(planId: string): Promise<LivePlanDoc | null> {
  const path = `plans/${planId}`;
  try {
    const snap = await getDoc(doc(db, 'plans', planId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<LivePlanDoc, 'id'>) };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function joinOrUpdateGuestInRoom(params: {
  planId: string;
  uid: string;
  name: string;
  avatar: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  etaLabel: string;
  isInside: boolean;
}): Promise<void> {
  const { planId, uid } = params;
  const path = `plans/${planId}/participants/${uid}`;
  const cleanName = clampStr(params.name, MAX_PARTICIPANT_NAME_LEN, 'Invitado');
  const cleanAvatar = clampStr(params.avatar, MAX_AVATAR_LEN, '🏃');
  const cleanEta = clampStr(params.etaLabel, MAX_ETA_LEN, 'En camino');

  try {
    const participantRef = doc(db, 'plans', planId, 'participants', uid);
    const existingSnap = await getDoc(participantRef);

    if (!existingSnap.exists()) {
      await setDoc(participantRef, {
        uid,
        planId,
        name: cleanName,
        avatar: cleanAvatar,
        role: 'guest',
        status: params.isInside ? 'arrived' : 'on_the_way',
        quickPulse: params.isInside ? '📍 ¡Ya llegué!' : '🚀 Voy en camino',
        lat: clampLat(params.lat),
        lng: clampLng(params.lng),
        distanceMeters: clampDist(params.distanceMeters),
        etaLabel: cleanEta,
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(participantRef, {
        name: cleanName,
        avatar: cleanAvatar,
        quickPulse: params.isInside ? '📍 ¡Ya llegué!' : '🚀 Voy en camino',
        updatedAt: serverTimestamp(),
      });
      await updateDoc(participantRef, {
        status: params.isInside ? 'arrived' : 'on_the_way',
        lat: clampLat(params.lat),
        lng: clampLng(params.lng),
        distanceMeters: clampDist(params.distanceMeters),
        etaLabel: cleanEta,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncMyTelemetry(params: {
  planId: string;
  uid: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  etaLabel: string;
  isInside: boolean;
}): Promise<void> {
  const { planId, uid } = params;
  const path = `plans/${planId}/participants/${uid}`;
  const cleanEta = clampStr(params.etaLabel, MAX_ETA_LEN, 'En camino');

  try {
    await updateDoc(doc(db, 'plans', planId, 'participants', uid), {
      status: params.isInside ? 'arrived' : 'on_the_way',
      lat: clampLat(params.lat),
      lng: clampLng(params.lng),
      distanceMeters: clampDist(params.distanceMeters),
      etaLabel: cleanEta,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function sendQuickPulse(params: {
  planId: string;
  uid: string;
  name: string;
  avatar: string;
  quickPulse: string;
}): Promise<void> {
  const { planId, uid } = params;
  const path = `plans/${planId}/participants/${uid}`;

  try {
    await updateDoc(doc(db, 'plans', planId, 'participants', uid), {
      name: clampStr(params.name, MAX_PARTICIPANT_NAME_LEN, 'Participante'),
      avatar: clampStr(params.avatar, MAX_AVATAR_LEN, '⚡'),
      quickPulse: clampStr(params.quickPulse, MAX_PULSE_LEN, ''),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function finishLivePlan(planId: string): Promise<void> {
  const path = `plans/${planId}`;
  try {
    await updateDoc(doc(db, 'plans', planId), {
      status: 'finished',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeToPlan(
  planId: string,
  onPlan: (plan: LivePlanDoc | null) => void,
  onError?: (err: unknown) => void
) {
  const path = `plans/${planId}`;
  return onSnapshot(
    doc(db, 'plans', planId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onPlan(null);
        return;
      }
      onPlan({ id: snapshot.id, ...(snapshot.data() as Omit<LivePlanDoc, 'id'>) });
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeToParticipants(
  planId: string,
  onParticipants: (participants: LiveParticipantDoc[]) => void,
  onError?: (err: unknown) => void
) {
  const path = `plans/${planId}/participants`;
  const q = query(collection(db, 'plans', planId, 'participants'), where('planId', '==', planId));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: LiveParticipantDoc[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as LiveParticipantDoc);
      });
      // Ordenar: Host primero, luego llegados, luego por distancia ascendente
      list.sort((a, b) => {
        if (a.role === 'host' && b.role !== 'host') return -1;
        if (b.role === 'host' && a.role !== 'host') return 1;
        if (a.status === 'arrived' && b.status !== 'arrived') return -1;
        if (b.status === 'arrived' && a.status !== 'arrived') return 1;
        return a.distanceMeters - b.distanceMeters;
      });
      onParticipants(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}
