import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import type { MascotId } from '../park/parkLayout';
import { sanitizeNickname } from './nickname';

export type PlayerActivityState = 'walking' | 'praying';
export type PlayerEmoteKind = 'pray' | 'wave';

export interface PlayerPresenceState {
  userId: string;
  nickname: string;
  character: MascotId;
  state: PlayerActivityState;
}

export interface PlayerMovePayload {
  userId: string;
  x: number;
  z: number;
  /** Optional vertical jump offset above PARK_GROUND_Y in meters. */
  y?: number;
  rotationY: number;
  isMoving: boolean;
}

export interface PlayerEmotePayload {
  userId: string;
  emote: PlayerEmoteKind;
  sentAt: number;
}

export interface AiVisitorPose {
  userId: string;
  nickname: string;
  character: MascotId;
  x: number;
  z: number;
  rotationY: number;
  isMoving: boolean;
  state: PlayerActivityState;
}

export const DOLHALMAE_CHANNEL_NAME = 'yeongcheon-dolhalmae-park';
export const MOVE_BROADCAST_INTERVAL_MS = 100; // ~10 updates/sec

export function hasSupabaseEnv(
  url: string | undefined = import.meta.env?.VITE_SUPABASE_URL,
  anonKey: string | undefined = import.meta.env?.VITE_SUPABASE_ANON_KEY,
): boolean {
  if (!url || !anonKey) return false;
  const trimmedUrl = url.trim();
  const trimmedKey = anonKey.trim();
  if (!trimmedUrl || !trimmedKey) return false;
  if (!/^https?:\/\//i.test(trimmedUrl)) return false;
  if (trimmedUrl.includes('YOUR_') || trimmedKey.includes('YOUR_')) return false;
  return true;
}

export function parsePresenceUsers(
  presenceState: Record<string, Array<Record<string, unknown>>>,
  selfUserId: string,
): PlayerPresenceState[] {
  const byId = new Map<string, PlayerPresenceState>();
  for (const [presenceKey, entries] of Object.entries(presenceState)) {
    if (!Array.isArray(entries) || entries.length === 0) continue;
    const raw = entries[entries.length - 1];
    if (!raw || typeof raw !== 'object') continue;
    const userId =
      typeof raw.userId === 'string' && raw.userId.trim() ? raw.userId.trim() : presenceKey;
    if (!userId || userId === selfUserId) continue;

    const nickname =
      typeof raw.nickname === 'string' ? sanitizeNickname(raw.nickname) || '영천 산책객' : '영천 산책객';
    const character: MascotId = raw.character === 'bichi' ? 'bichi' : 'byeori';
    const state: PlayerActivityState = raw.state === 'praying' ? 'praying' : 'walking';
    byId.set(userId, { userId, nickname, character, state });
  }
  return Array.from(byId.values());
}

export function shouldSendMoveBroadcast(
  nowMs: number,
  lastSentMs: number,
  prev: PlayerMovePayload | null,
  next: PlayerMovePayload,
  minIntervalMs: number = MOVE_BROADCAST_INTERVAL_MS,
): boolean {
  if (nowMs - lastSentMs < minIntervalMs) return false;
  if (!prev) return true;
  if (prev.isMoving !== next.isMoving) return true;
  const dist = Math.hypot(next.x - prev.x, next.z - prev.z);
  const yDiff = Math.abs((next.y ?? 0) - (prev.y ?? 0));
  const yawDiff = Math.abs(next.rotationY - prev.rotationY);
  return dist > 0.015 || yDiff > 0.025 || yawDiff > 0.03;
}

/**
 * Provides 2 gentle AI-wandering Byeori & Bichi visitors in local fallback mode
 * when Supabase Realtime keys are not configured.
 */
export function computeAiFallbackVisitors(elapsedSec: number): AiVisitorPose[] {
  // Visitor 1: Bichi strolling figure-8 walkway around central plaza
  const omega1 = 0.21;
  const t1 = elapsedSec * omega1 + 0.42;
  const x1 = Math.sin(t1) * 7.2;
  const z1 = 19.0 + Math.sin(t1 * 2) * 5.4;
  const dx1 = Math.cos(t1) * 7.2 * omega1;
  const dz1 = Math.cos(t1 * 2) * 5.4 * 2 * omega1;

  // Visitor 2: Byeori gently exploring near the Zodiac avenue & central plaza
  const omega2 = 0.16;
  const t2 = elapsedSec * omega2 + 2.35;
  const x2 = Math.cos(t2) * 6.4;
  const z2 = 16.5 + Math.sin(t2) * 5.2;
  const dx2 = -Math.sin(t2) * 6.4 * omega2;
  const dz2 = Math.cos(t2) * 5.2 * omega2;

  return [
    {
      userId: 'ai-visitor-bichi',
      nickname: '은해사 달빛',
      character: 'bichi',
      x: x1,
      z: z1,
      rotationY: Math.atan2(dx1, dz1),
      isMoving: true,
      state: 'walking',
    },
    {
      userId: 'ai-visitor-byeori',
      nickname: '보현산 산책러',
      character: 'byeori',
      x: x2,
      z: z2,
      rotationY: Math.atan2(dx2, dz2),
      isMoving: true,
      state: 'walking',
    },
  ];
}

export interface ParkRealtimeCallbacks {
  onConnectionChange: (connected: boolean, totalCount: number) => void;
  onRemotePlayersChange: (players: PlayerPresenceState[]) => void;
  onRemoteMove: (payload: PlayerMovePayload) => void;
  onRemoteEmote: (payload: PlayerEmotePayload) => void;
}

export class ParkRealtimeClient {
  private supabase: SupabaseClient | null = null;
  private channel: RealtimeChannel | null = null;
  private userId: string;
  private currentPresence: PlayerPresenceState;
  private callbacks: ParkRealtimeCallbacks;
  private lastSentMs = 0;
  private lastSentMove: PlayerMovePayload | null = null;
  private isConnected = false;

  constructor(
    initialPresence: PlayerPresenceState,
    callbacks: ParkRealtimeCallbacks,
    url?: string,
    anonKey?: string,
  ) {
    this.userId = initialPresence.userId;
    this.currentPresence = initialPresence;
    this.callbacks = callbacks;

    if (!hasSupabaseEnv(url, anonKey)) {
      return;
    }

    const resolvedUrl = (url ?? import.meta.env.VITE_SUPABASE_URL).trim();
    const resolvedKey = (anonKey ?? import.meta.env.VITE_SUPABASE_ANON_KEY).trim();

    this.supabase = createClient(resolvedUrl, resolvedKey, {
      realtime: {
        params: {
          eventsPerSecond: 12,
        },
      },
    });
  }

  public get isMultiplayerConfigured(): boolean {
    return this.supabase !== null;
  }

  public connect(): void {
    if (!this.supabase || this.channel) return;

    const channel = this.supabase.channel(DOLHALMAE_CHANNEL_NAME, {
      config: {
        presence: { key: this.userId },
        broadcast: { self: false },
      },
    });
    this.channel = channel;

    const handlePresenceSync = () => {
      if (!this.channel) return;
      const state = this.channel.presenceState() as Record<string, Array<Record<string, unknown>>>;
      const remotes = parsePresenceUsers(state, this.userId);
      const totalOnline = remotes.length + 1;
      this.callbacks.onRemotePlayersChange(remotes);
      this.callbacks.onConnectionChange(this.isConnected, totalOnline);
    };

    channel
      .on('presence', { event: 'sync' }, handlePresenceSync)
      .on('presence', { event: 'join' }, handlePresenceSync)
      .on('presence', { event: 'leave' }, handlePresenceSync)
      .on('broadcast', { event: 'player:move' }, ({ payload }) => {
        if (!payload || typeof payload !== 'object') return;
        const p = payload as Partial<PlayerMovePayload>;
        if (
          typeof p.userId !== 'string' ||
          p.userId === this.userId ||
          typeof p.x !== 'number' ||
          typeof p.z !== 'number' ||
          typeof p.rotationY !== 'number'
        ) {
          return;
        }
        this.callbacks.onRemoteMove({
          userId: p.userId,
          x: p.x,
          z: p.z,
          y: typeof p.y === 'number' && Number.isFinite(p.y) ? Math.max(0, p.y) : 0,
          rotationY: p.rotationY,
          isMoving: Boolean(p.isMoving),
        });
      })
      .on('broadcast', { event: 'player:emote' }, ({ payload }) => {
        if (!payload || typeof payload !== 'object') return;
        const p = payload as Partial<PlayerEmotePayload>;
        if (typeof p.userId !== 'string' || p.userId === this.userId) return;
        if (p.emote !== 'pray' && p.emote !== 'wave') return;
        this.callbacks.onRemoteEmote({
          userId: p.userId,
          emote: p.emote,
          sentAt: typeof p.sentAt === 'number' ? p.sentAt : Date.now(),
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          this.isConnected = true;
          try {
            await channel.track(this.currentPresence);
          } catch {
            // ignore transient presence track failure
          }
          handlePresenceSync();
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.isConnected = false;
          this.callbacks.onConnectionChange(false, 1);
        }
      });
  }

  public updatePresence(next: Partial<Omit<PlayerPresenceState, 'userId'>>): void {
    this.currentPresence = {
      ...this.currentPresence,
      ...next,
      userId: this.userId,
    };
    if (this.channel && this.isConnected) {
      void this.channel.track(this.currentPresence).catch(() => {
        // ignore transient presence errors
      });
    }
  }

  public sendMove(
    x: number,
    z: number,
    rotationY: number,
    isMoving: boolean,
    force = false,
    y = 0,
  ): void {
    if (!this.channel || !this.isConnected) return;
    const now = performance.now();
    const payload: PlayerMovePayload = {
      userId: this.userId,
      x,
      z,
      y,
      rotationY,
      isMoving,
    };
    if (!force && !shouldSendMoveBroadcast(now, this.lastSentMs, this.lastSentMove, payload)) {
      return;
    }
    this.lastSentMs = now;
    this.lastSentMove = payload;
    void this.channel.send({
      type: 'broadcast',
      event: 'player:move',
      payload,
    });
  }

  public sendEmote(emote: PlayerEmoteKind): void {
    if (!this.channel || !this.isConnected) return;
    void this.channel.send({
      type: 'broadcast',
      event: 'player:emote',
      payload: {
        userId: this.userId,
        emote,
        sentAt: Date.now(),
      } satisfies PlayerEmotePayload,
    });
  }

  public disconnect(): void {
    this.isConnected = false;
    if (this.channel && this.supabase) {
      void this.supabase.removeChannel(this.channel);
    }
    this.channel = null;
  }
}
