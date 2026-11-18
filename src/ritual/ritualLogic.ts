export type TimeOfDay = 'dawn' | 'sunset' | 'night';

export type RitualStep = 1 | 2 | 3 | 4 | 'result';

export type RitualOutcome = 'granted' | 'retry';

export interface SavedWishTag {
  id: string;
  identity: string;
  wish: string;
  createdAt: number;
  outcome: RitualOutcome;
}

export interface LiftPhysicsState {
  /** Normalized lift height 0..1 (1 = ~15cm lifted off pedestal) */
  liftProgress: number;
  /** Vertical velocity */
  velocity: number;
  /** Whether the user is actively holding/pulling the stone */
  isPulling: boolean;
  /** Accumulated hold/meditation time in seconds */
  holdSeconds: number;
  /** Subtle horizontal tremble amplitude when stone refuses to budge (Outcome A) */
  trembleAmplitude: number;
}

export const WISH_STORAGE_KEY = 'dolhalmae_saved_wishes_v1';

export const DEFAULT_WISH_TAGS: SavedWishTag[] = [
  {
    id: 'seed-1',
    identity: '영천시 완산동',
    wish: '올해 농사 풍년 들고 온 가족 건강하게 하소서',
    createdAt: 1700000000000,
    outcome: 'granted',
  },
  {
    id: 'seed-2',
    identity: '대구 수성구',
    wish: '어머니 무릎 편찮으시지 않게 보살펴 주소서',
    createdAt: 1700000100000,
    outcome: 'granted',
  },
  {
    id: 'seed-3',
    identity: '경주시 안강읍',
    wish: '준비하는 시험 좋은 결실 맺게 도와주소서',
    createdAt: 1700000200000,
    outcome: 'granted',
  },
];

/**
 * Computes the probability (0.65 .. 0.85) of the stone feeling heavy and immovable ("소원 성취").
 * Holding/meditating patiently in Steps 2 & 3 & 4 increases the probability up to 85%.
 */
export function calculateWishGrantProbability(patienceSeconds: number): number {
  const safeSeconds = Math.max(0, Number.isFinite(patienceSeconds) ? patienceSeconds : 0);
  // Scales smoothly from 0.65 (at 0s) up to 0.85 (at 10s+ of calm meditation/hold)
  const bonus = Math.min(0.2, (safeSeconds / 10) * 0.2);
  return Math.round((0.65 + bonus) * 1000) / 1000;
}

/**
 * Determines Outcome A ('granted' - heavy & unmovable) vs Outcome B ('retry' - lifts lightly).
 * Accepts an explicit random roll [0, 1) for deterministic testing.
 */
export function resolveSecondLiftOutcome(
  patienceSeconds: number,
  randomRoll: number = Math.random(),
): RitualOutcome {
  const threshold = calculateWishGrantProbability(patienceSeconds);
  const clampedRoll = Math.max(0, Math.min(0.999999, randomRoll));
  return clampedRoll < threshold ? 'granted' : 'retry';
}

/**
 * Validates the user's wish text before dissolving into embers.
 */
export function validateWishInput(wishText: string): { valid: boolean; error?: string } {
  const trimmed = wishText.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: '마음속 간절한 한 가지 소원을 적어주세요.' };
  }
  if (trimmed.length < 2) {
    return { valid: false, error: '소원을 조금 더 정성껏 적어주세요.' };
  }
  return { valid: true };
}

/**
 * Advances the stone's vertical spring/lift physics for a clamped timestep dt (<= 0.05s).
 */
export function stepStoneLiftPhysics(
  prev: LiftPhysicsState,
  dtRaw: number,
  mode: 'normal_lift' | 'heavy_immovable',
): LiftPhysicsState {
  const dt = Math.min(Math.max(dtRaw, 0), 0.05);
  let { liftProgress, velocity, isPulling, holdSeconds, trembleAmplitude } = prev;

  if (isPulling) {
    holdSeconds += dt;
  }

  if (mode === 'heavy_immovable') {
    // Outcome A: Stone resists like a magnet anchored to bedrock; slight heavy tremble (< 0.04 lift)
    const targetLift = isPulling ? 0.032 : 0;
    const stiffness = isPulling ? 55 : 90;
    const damping = 16;
    const accel = (targetLift - liftProgress) * stiffness - velocity * damping;
    velocity += accel * dt;
    liftProgress = Math.max(0, Math.min(0.06, liftProgress + velocity * dt));
    trembleAmplitude = isPulling ? Math.min(1, trembleAmplitude + dt * 4.5) : Math.max(0, trembleAmplitude - dt * 6);
  } else {
    // Step 2 or Outcome B: Stone lifts ~15cm smoothly and settles back with solid granite weight
    const targetLift = isPulling ? 1.0 : 0;
    const stiffness = isPulling ? 18 : 34;
    const damping = isPulling ? 7.5 : 10.5;
    const accel = (targetLift - liftProgress) * stiffness - velocity * damping;
    velocity += accel * dt;
    liftProgress += velocity * dt;
    if (liftProgress < 0) {
      liftProgress = 0;
      if (velocity < 0) velocity = 0;
    } else if (liftProgress > 1.08) {
      liftProgress = 1.08;
    }
    trembleAmplitude = Math.max(0, trembleAmplitude - dt * 5);
  }

  return {
    liftProgress,
    velocity,
    isPulling,
    holdSeconds,
    trembleAmplitude,
  };
}

/**
 * Safely parses wish tags from JSON string (e.g. localStorage).
 */
export function parseSavedWishTags(rawJson: string | null): SavedWishTag[] {
  if (!rawJson) return [...DEFAULT_WISH_TAGS];
  try {
    const parsed = JSON.parse(rawJson);
    if (!Array.isArray(parsed)) return [...DEFAULT_WISH_TAGS];
    const valid = parsed.filter(
      (item): item is SavedWishTag =>
        Boolean(item) &&
        typeof item.id === 'string' &&
        typeof item.wish === 'string' &&
        typeof item.identity === 'string' &&
        typeof item.createdAt === 'number' &&
        (item.outcome === 'granted' || item.outcome === 'retry'),
    );
    return valid.length > 0 ? valid : [...DEFAULT_WISH_TAGS];
  } catch {
    return [...DEFAULT_WISH_TAGS];
  }
}

/**
 * Adds a newly hung wish tag and caps the stored list at 24 items.
 */
export function createWishTagEntry(
  identity: string,
  wish: string,
  outcome: RitualOutcome,
  now: number = Date.now(),
): SavedWishTag {
  return {
    id: `wish-${now}-${Math.random().toString(36).slice(2, 7)}`,
    identity: identity.trim() || '어느 참배객',
    wish: wish.trim(),
    createdAt: now,
    outcome,
  };
}

/**
 * Slowly drifts the quiet visitor count in [7, 19] for the "loose connection" presence indicator.
 */
export function driftVisitorCount(current: number, roll: number = Math.random()): number {
  if (roll < 0.35 && current > 7) return current - 1;
  if (roll > 0.65 && current < 19) return current + 1;
  return current;
}
