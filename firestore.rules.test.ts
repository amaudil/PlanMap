export interface SecurityTestCase {
  id: number;
  name: string;
  operation: 'create' | 'update' | 'get' | 'list' | 'delete';
  path: string;
  auth: { uid: string; emailVerified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_PAYLOADS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Unauthenticated plan creation',
    operation: 'create',
    path: '/plans/plan_test_01',
    auth: null,
    payload: { title: 'Café', vibe: '☕ Chill', hostId: 'anon', status: 'active' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified email user blocked',
    operation: 'create',
    path: '/plans/plan_test_02',
    auth: { uid: 'user_unverified', emailVerified: false },
    payload: { title: 'Café', vibe: '☕ Chill', hostId: 'user_unverified', status: 'active' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Host UID spoofing on create',
    operation: 'create',
    path: '/plans/plan_test_03',
    auth: { uid: 'attacker_uid', emailVerified: true },
    payload: { title: 'Café', vibe: '☕ Chill', hostId: 'victim_uid', status: 'active' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow/ghost field injection',
    operation: 'create',
    path: '/plans/plan_test_04',
    auth: { uid: 'user_1', emailVerified: true },
    payload: { title: 'Café', vibe: '☕ Chill', hostId: 'user_1', status: 'active', isAdmin: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Path ID poisoning with oversized or invalid characters',
    operation: 'create',
    path: `/plans/${'a'.repeat(200)}`,
    auth: { uid: 'user_1', emailVerified: true },
    payload: { title: 'Café', vibe: '☕ Chill', hostId: 'user_1', status: 'active' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Client-forged createdAt timestamp',
    operation: 'create',
    path: '/plans/plan_test_06',
    auth: { uid: 'user_1', emailVerified: true },
    payload: { title: 'Café', hostId: 'user_1', createdAt: '1999-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Non-host attempting to update Plan status or coordinates',
    operation: 'update',
    path: '/plans/plan_owned_by_host',
    auth: { uid: 'guest_uid', emailVerified: true },
    payload: { status: 'finished', targetLat: 0, targetLng: 0 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Mutating a Plan after terminal status finished',
    operation: 'update',
    path: '/plans/plan_already_finished',
    auth: { uid: 'host_uid', emailVerified: true },
    payload: { status: 'active', title: 'Reopened' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Guest hijacking another participant document',
    operation: 'update',
    path: '/plans/plan_active/participants/other_uid',
    auth: { uid: 'attacker_uid', emailVerified: true },
    payload: { uid: 'other_uid', name: 'Hacked', status: 'arrived' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Guest self-assigning host role',
    operation: 'create',
    path: '/plans/plan_active/participants/guest_uid',
    auth: { uid: 'guest_uid', emailVerified: true },
    payload: { uid: 'guest_uid', planId: 'plan_active', role: 'host', name: 'Guest' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Out-of-bounds coordinates and oversized string poisoning',
    operation: 'update',
    path: '/plans/plan_active/participants/guest_uid',
    auth: { uid: 'guest_uid', emailVerified: true },
    payload: { lat: 999, lng: -999, name: 'X'.repeat(5000) },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Blanket collection list scraping on /plans',
    operation: 'list',
    path: '/plans',
    auth: { uid: 'scraper_uid', emailVerified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
];
