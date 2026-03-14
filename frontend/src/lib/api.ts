import type { Session, EngagementEvent, LearnerProfile } from '../types';

// ── Config ─────────────────────────────────────────────
// Falls back to localStorage when backend is unreachable (demo mode)
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api';
const SNOWFLAKE_BASE = import.meta.env.VITE_SNOWFLAKE_URL ?? '';

let backendAvailable: boolean | null = null;

async function checkBackend(): Promise<boolean> {
  if (backendAvailable !== null) return backendAvailable;
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2000) });
    backendAvailable = res.ok;
  } catch {
    backendAvailable = false;
  }
  return backendAvailable;
}

// ── Profile sync ───────────────────────────────────────
export async function fetchProfile(userId: string): Promise<Partial<LearnerProfile> | null> {
  if (!await checkBackend()) return null;
  try {
    const res = await fetch(`${API_BASE}/profile/${userId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

export async function syncProfile(profile: LearnerProfile): Promise<void> {
  if (!await checkBackend()) return;
  try {
    await fetch(`${API_BASE}/profile/${profile.userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xp: profile.xp, streak: profile.streak, knowledge: profile.knowledge }),
    });
  } catch {}
}

// ── Session persistence ────────────────────────────────
export async function saveSession(session: Session, userId: string): Promise<void> {
  if (!await checkBackend()) return;
  try {
    await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...session, userId }),
    });
  } catch {}
  // Also send to Snowflake analytics pipeline
  await ingestToSnowflake('sessions', { ...session, userId, eventTime: new Date().toISOString() });
}

// ── Kafka event streaming ──────────────────────────────
// Events are batched and sent to the Spring Boot Kafka producer endpoint
// The Kafka consumer updates feed scores in real-time on the server side

const eventQueue: EngagementEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function streamEvent(event: EngagementEvent, userId: string): void {
  eventQueue.push({ ...event, userId: userId as any });
  // Debounce flush — send in batches every 2s
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => flushEvents(userId), 2000);
}

async function flushEvents(userId: string): Promise<void> {
  if (eventQueue.length === 0) return;
  const batch = eventQueue.splice(0, eventQueue.length);
  if (!await checkBackend()) return;
  try {
    // POST to Spring Boot → Kafka producer → topic: intoit.engagement.events
    await fetch(`${API_BASE}/events/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, events: batch }),
    });
  } catch {}
  // Send to Snowflake
  await ingestToSnowflake('engagement_events', { userId, events: batch, batchTime: new Date().toISOString() });
}

// ── Snowflake analytics ingestion ──────────────────────
// Data flows: Frontend → Spring Boot → Kafka → Snowflake Kafka Connector → Fact Table
// This function sends directly as a fallback / supplement

export async function ingestToSnowflake(table: string, payload: Record<string, unknown>): Promise<void> {
  if (!SNOWFLAKE_BASE || !await checkBackend()) return;
  try {
    await fetch(`${API_BASE}/analytics/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, payload, timestamp: Date.now() }),
    });
  } catch {}
}

// ── Backend availability indicator ────────────────────
export function isBackendConnected(): boolean {
  return backendAvailable === true;
}

export async function pingBackend(): Promise<boolean> {
  backendAvailable = null; // force recheck
  return checkBackend();
}
