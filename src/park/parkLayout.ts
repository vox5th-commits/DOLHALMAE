import { ZODIAC_STATUES } from './zodiacData';

export type MascotId = 'byeori' | 'bichi';
export type ViewMode = 'park' | 'shrine';

export const PARK_GROUND_Y = -0.45;
export const PLAYER_SPAWN_POS: [number, number] = [0, 27.6];
export const PLAYER_SPAWN_YAW = Math.PI; // Facing -Z (south toward Central Plaza & Dolhalmae Shrine)
export const SHRINE_EXIT_POS: [number, number] = [0, 6.2];
export const SHRINE_EXIT_YAW = Math.PI;

export interface CircleCollider {
  kind: 'circle';
  x: number;
  z: number;
  r: number;
}

export interface BoxCollider {
  kind: 'box';
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export type ParkCollider = CircleCollider | BoxCollider;

/**
 * Expanded walkable bounds of Yeongcheon Bugan-myeon Dolhalmae Park
 * (West Wing: Bohyeonsan Starlight Zone, Center: Dolhalmae & 12 Zodiacs,
 * East Wing: Yeongcheon Grape Pergola, Pond & Jeongja Pavilion).
 */
export const PARK_BOUNDS = {
  minX: -36.4,
  maxX: 36.4,
  minZ: 4.1,
  maxZ: 44.2,
};

/**
 * Solid obstacles in the expanded Dolhalmae Park (shrine terrace, building,
 * entrance bollards, grass mound monument, central monument, cairns, 12 zodiac
 * stone pedestals, Bohyeonsan Observatory dome/pillars, and East Wing structures).
 */
export const PARK_COLLIDERS: ParkCollider[] = [
  // Dolhalmae shrine pavilion & terrace steps (player enters via prompt at z ~ 4.1..7.4)
  { kind: 'box', minX: -3.5, maxX: 3.5, minZ: -3.2, maxZ: 3.9 },
  // Management / restroom building (right side of entrance)
  { kind: 'box', minX: 4.6, maxX: 14.2, minZ: 29.8, maxZ: 35.8 },
  // Entrance circular grass mound + shade tree + "돌할매 공원" stone monument (left side)
  { kind: 'circle', x: -10.4, z: 31.4, r: 3.6 },
  // Entrance 3 cylindrical bollards along expanded Dolhalmae-ro entrance
  { kind: 'circle', x: -2.4, z: 43.8, r: 0.36 },
  { kind: 'circle', x: -1.0, z: 43.8, r: 0.36 },
  { kind: 'circle', x: 0.4, z: 43.8, r: 0.36 },
  // Central circular plaza stone monument
  { kind: 'circle', x: 0, z: 19.0, r: 1.55 },
  // Stone cairns (돌탑) in the lawn islands & expanded garden corners
  { kind: 'circle', x: -5.2, z: 24.4, r: 0.85 },
  { kind: 'circle', x: 5.2, z: 24.4, r: 0.85 },
  { kind: 'circle', x: -5.2, z: 13.4, r: 0.85 },
  { kind: 'circle', x: 5.2, z: 13.4, r: 0.85 },
  { kind: 'circle', x: -18.5, z: 11.2, r: 0.85 },
  { kind: 'circle', x: 18.5, z: 11.2, r: 0.85 },
  // West Wing: Bohyeonsan Observatory Dome building & telescope tripod
  { kind: 'circle', x: -29.0, z: 16.5, r: 3.15 },
  { kind: 'circle', x: -23.4, z: 21.6, r: 0.62 },
  // West Wing: Starlight Photo-Zone Arch left/right stone pillars (open center walkway!)
  { kind: 'circle', x: -16.6, z: 16.4, r: 0.48 },
  { kind: 'circle', x: -16.6, z: 21.6, r: 0.48 },
  // East Wing: Yeongcheon Wine Oak Barrel display & Grape Pergola corner posts
  { kind: 'circle', x: 22.8, z: 24.2, r: 0.95 },
  { kind: 'circle', x: 26.8, z: 24.2, r: 0.95 },
  { kind: 'circle', x: 20.6, z: 21.2, r: 0.34 },
  { kind: 'circle', x: 29.0, z: 21.2, r: 0.34 },
  { kind: 'circle', x: 20.6, z: 27.2, r: 0.34 },
  { kind: 'circle', x: 29.0, z: 27.2, r: 0.34 },
  // East Wing: Lotus Pond water basin (rimmed with stepping stones)
  { kind: 'circle', x: 21.8, z: 13.8, r: 2.65 },
  // East Wing: Jeongja Pavilion perimeter pillars (center deck walkable!)
  { kind: 'circle', x: 27.5 - 1.9, z: 15.5 - 1.9, r: 0.28 },
  { kind: 'circle', x: 27.5 + 1.9, z: 15.5 - 1.9, r: 0.28 },
  { kind: 'circle', x: 27.5 - 1.9, z: 15.5 + 1.9, r: 0.28 },
  { kind: 'circle', x: 27.5 + 1.9, z: 15.5 + 1.9, r: 0.28 },
  // 12 Zodiac statue square pedestals
  ...ZODIAC_STATUES.map(
    (s): CircleCollider => ({
      kind: 'circle',
      x: s.position[0],
      z: s.position[1],
      r: 0.92,
    }),
  ),
];

/**
 * Resolves 2D XZ circle collision against park perimeter bounds and obstacles
 * so Byeori/Bichi glides smoothly along walkways, fences, and pedestals.
 */
export function resolveParkCollision(
  x: number,
  z: number,
  actorRadius = 0.48,
  colliders: ParkCollider[] = PARK_COLLIDERS,
): { x: number; z: number } {
  let nx = Math.max(PARK_BOUNDS.minX + actorRadius, Math.min(PARK_BOUNDS.maxX - actorRadius, x));
  let nz = Math.max(PARK_BOUNDS.minZ + actorRadius, Math.min(PARK_BOUNDS.maxZ - actorRadius, z));

  // Two passes resolve corner/adjacent overlaps cleanly
  for (let pass = 0; pass < 2; pass++) {
    for (const c of colliders) {
      if (c.kind === 'circle') {
        const dx = nx - c.x;
        const dz = nz - c.z;
        const minD = c.r + actorRadius;
        const distSq = dx * dx + dz * dz;
        if (distSq < minD * minD) {
          const dist = Math.sqrt(distSq);
          if (dist > 0.0001) {
            const push = minD - dist;
            nx += (dx / dist) * push;
            nz += (dz / dist) * push;
          } else {
            nz = c.z + minD;
          }
        }
      } else {
        const closestX = Math.max(c.minX, Math.min(c.maxX, nx));
        const closestZ = Math.max(c.minZ, Math.min(c.maxZ, nz));
        const dx = nx - closestX;
        const dz = nz - closestZ;
        const distSq = dx * dx + dz * dz;
        if (distSq < actorRadius * actorRadius) {
          const dist = Math.sqrt(distSq);
          if (dist > 0.0001) {
            const push = actorRadius - dist;
            nx += (dx / dist) * push;
            nz += (dz / dist) * push;
          } else {
            // Inside box: push out toward nearest face
            const dLeft = Math.abs(nx - c.minX);
            const dRight = Math.abs(c.maxX - nx);
            const dTop = Math.abs(nz - c.minZ);
            const dBot = Math.abs(c.maxZ - nz);
            const minFace = Math.min(dLeft, dRight, dTop, dBot);
            if (minFace === dBot) nz = c.maxZ + actorRadius;
            else if (minFace === dTop) nz = c.minZ - actorRadius;
            else if (minFace === dLeft) nx = c.minX - actorRadius;
            else nx = c.maxX + actorRadius;
          }
        }
      }
    }
    nx = Math.max(PARK_BOUNDS.minX + actorRadius, Math.min(PARK_BOUNDS.maxX - actorRadius, nx));
    nz = Math.max(PARK_BOUNDS.minZ + actorRadius, Math.min(PARK_BOUNDS.maxZ - actorRadius, nz));
  }

  return { x: nx, z: nz };
}

/**
 * Returns true when the mascot is standing in front of the Dolhalmae Shrine entrance
 * steps where the interactive prayer transition prompt should appear.
 */
export function isNearShrineEntrance(x: number, z: number): boolean {
  return Math.abs(x) <= 2.9 && z >= 3.8 && z <= 7.4;
}

/**
 * Smooth closed figure-8 strolling path for the AI companion mascot.
 */
export function getCompanionStrollPose(timeSec: number): {
  x: number;
  z: number;
  yaw: number;
} {
  const omega = 0.22; // gentle leisurely stroll
  const t = timeSec * omega;
  const x = Math.sin(t) * 7.4;
  const z = 19.0 + Math.sin(t * 2) * 5.6;

  // Tangent vector for smooth heading
  const dx = Math.cos(t) * 7.4 * omega;
  const dz = Math.cos(t * 2) * 5.6 * 2 * omega;
  const yaw = Math.atan2(dx, dz);

  return { x, z, yaw };
}

/**
 * Shortest-angle interpolation for smooth character turning.
 */
export function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * (1 - Math.exp(-lambda * dt));
}

/**
 * Clamps and resolves a mouse-clicked ground coordinate into a valid walkable
 * park destination inside bounds and outside solid colliders.
 */
export function clampParkDestination(
  x: number,
  z: number,
  actorRadius = 0.48,
): { x: number; z: number } {
  return resolveParkCollision(x, z, actorRadius);
}

/**
 * Returns true when a clicked 3D ground point during 1st-person shrine mode
 * lies on the surrounding park terrain/courtyard outside the immediate altar pedestal.
 */
export function isExteriorParkGroundPoint(x: number, z: number): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  // Exclude immediate center around pedestal & Dolhalmae stone
  const distFromStone = Math.hypot(x, z);
  if (distFromStone < 1.85) return false;
  // Require reasonable park distance so wild horizon rays don't misfire
  return Math.abs(x) <= 52 && z >= -8 && z <= 54;
}

