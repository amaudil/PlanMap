# Security Specification & Payload-First TDD (`Planealo Aquí`)

## 1. Data Invariants
1. **Master Gate & Relational Integrity:** No `/plans/{planId}/participants/{participantId}` document may exist without a valid parent `/plans/{planId}` document in `status == 'active'` (enforced atomically via `existsAfter` + `getAfter`).
2. **Identity Integrity:**
   - Only verified authenticated users (`request.auth != null && request.auth.token.email_verified == true`) can read or write.
   - `Plan.hostId` MUST equal `request.auth.uid` on creation and is immutable forever.
   - `Participant.uid` and the document ID `{participantId}` MUST equal `request.auth.uid`. One user cannot spoof or overwrite another user's location or alias.
3. **Zero PII Exposure:** Neither `Plan` nor `Participant` stores `email`, `phone`, or `address`. Only public hangout alias (`name`) and emoji `avatar`.
4. **Terminal State Locking:** Once `Plan.status` transitions to `'finished'`, no further updates are permitted to the `Plan` or its `Participant` telemetry.
5. **Temporal Integrity:** `createdAt`, `joinedAt`, and `updatedAt` must strictly equal `request.time` on creation, and `createdAt`/`joinedAt` are immutable on update.
6. **Strict Schema & Bounds:** Every string enforces `.size()` limits, every coordinate enforces geographic bounds (`lat` in `[-90, 90]`, `lng` in `[-180, 180]`), and ghost/shadow fields are rejected via `hasOnly()`.

## 2. The "Dirty Dozen" Adversarial Payloads

| # | Attack Vector | Target Path | Expected Result |
| :-: | :--- | :--- | :---: |
| 1 | Unauthenticated plan creation | `/plans/p1` | `PERMISSION_DENIED` |
| 2 | Unverified email token (`email_verified: false`) | `/plans/p1` | `PERMISSION_DENIED` |
| 3 | Host UID spoofing (`hostId != auth.uid`) | `/plans/p1` | `PERMISSION_DENIED` |
| 4 | Ghost/shadow field injection (`isAdmin: true`) | `/plans/p1` | `PERMISSION_DENIED` |
| 5 | Path ID poisoning (1.5KB string or invalid chars) | `/plans/../../evil` | `PERMISSION_DENIED` |
| 6 | Client-forged `createdAt` timestamp | `/plans/p1` | `PERMISSION_DENIED` |
| 7 | Non-host modifying `Plan.title` or `Plan.status` | `/plans/p1` | `PERMISSION_DENIED` |
| 8 | Mutating a `Plan` after `status == 'finished'` | `/plans/p1` | `PERMISSION_DENIED` |
| 9 | Guest hijacking another participant's doc (`participantId != auth.uid`) | `/plans/p1/participants/victimUid` | `PERMISSION_DENIED` |
| 10 | Guest claiming `role: 'host'` when `auth.uid != plan.hostId` | `/plans/p1/participants/guestUid` | `PERMISSION_DENIED` |
| 11 | Coordinate/string resource poisoning (`lat: 999`, 1MB `name`) | `/plans/p1/participants/guestUid` | `PERMISSION_DENIED` |
| 12 | Blanket list scraping of `/plans` without `hostId == auth.uid` | `/plans` (`list`) | `PERMISSION_DENIED` |
