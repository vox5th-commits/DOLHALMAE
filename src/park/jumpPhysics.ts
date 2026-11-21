export interface JumpPhysicsState {
  /** Height offset above PARK_GROUND_Y in meters (>= 0). */
  y: number;
  /** Vertical velocity in m/s. */
  vy: number;
  /** True while standing on ground or an elevated walkable surface. */
  isGrounded: boolean;
  /** Remaining coyote-time window in seconds after leaving a ledge. */
  coyoteTimer: number;
  /** Remaining landing squash animation timer in seconds. */
  landSquashTimer: number;
  /** Remaining takeoff stretch timer in seconds. */
  takeoffTimer: number;
}

export interface JumpStepResult {
  state: JumpPhysicsState;
  justJumped: boolean;
  justLanded: boolean;
  /** Visual squash/stretch scale multiplier on Y axis (1.0 = neutral). */
  visualScaleY: number;
  /** Visual squash/stretch scale multiplier on X/Z axes (1.0 = neutral). */
  visualScaleXZ: number;
}

export const JUMP_VELOCITY = 6.4;
export const JUMP_GRAVITY = 18.8;
export const COYOTE_TIME_SEC = 0.085;
export const LAND_SQUASH_SEC = 0.16;
export const TAKEOFF_STRETCH_SEC = 0.12;

export function createInitialJumpState(): JumpPhysicsState {
  return {
    y: 0,
    vy: 0,
    isGrounded: true,
    coyoteTimer: COYOTE_TIME_SEC,
    landSquashTimer: 0,
    takeoffTimer: 0,
  };
}

/**
 * Returns the walkable surface elevation offset (above PARK_GROUND_Y) at (x, z).
 * Allows Byeori/Bichi to walk smoothly onto stepped plazas and jump onto
 * the Bohyeonsan Observatory deck, East Pavilion deck, and granite benches.
 */
export function getGroundElevationAt(x: number, z: number): number {
  let maxElev = 0;

  // 1. Bohyeonsan Starlight Observatory circular viewing deck at (-27.5, 17.0)
  const obsDist = Math.hypot(x - -27.5, z - 17.0);
  if (obsDist <= 6.1) {
    maxElev = Math.max(maxElev, 0.34);
  } else if (x >= -21.8 && x <= -20.2 && z >= 15.2 && z <= 18.8) {
    // Broad eastern approach steps to Observatory deck
    maxElev = Math.max(maxElev, 0.17);
  }

  // 2. Central circular stone plaza subtle raised pad at (0, 19.0)
  const centralDist = Math.hypot(x, z - 19.0);
  if (centralDist <= 5.3) {
    maxElev = Math.max(maxElev, 0.06);
  }

  // 3. East Wing Traditional Jeongja (정자) timber viewing deck at (27.5, 15.5)
  const jeongjaDist = Math.hypot(x - 27.5, z - 15.5);
  if (jeongjaDist <= 2.95) {
    maxElev = Math.max(maxElev, 0.32);
  } else if (x >= 23.7 && x <= 25.0 && z >= 14.3 && z <= 16.7) {
    maxElev = Math.max(maxElev, 0.16);
  }

  // 4. Granite benches around Central Plaza & wings (can jump up onto bench seats!)
  const benches: Array<[number, number]> = [
    [-4.3, 21.8],
    [4.3, 21.8],
    [-4.3, 16.2],
    [4.3, 16.2],
    [-19.0, 26.5],
    [19.0, 26.5],
  ];
  for (let i = 0; i < benches.length; i++) {
    const dx = Math.abs(x - benches[i][0]);
    const dz = Math.abs(z - benches[i][1]);
    if (dx <= 0.68 && dz <= 0.52) {
      maxElev = Math.max(maxElev, 0.42);
    }
  }

  return maxElev;
}

/**
 * Steps vertical jump physics and computes squash-and-stretch scale multipliers.
 */
export function stepJumpPhysics(
  prev: JumpPhysicsState,
  dt: number,
  groundY: number,
  jumpRequested: boolean,
): JumpStepResult {
  const safeDt = Math.min(Math.max(dt, 0.0001), 0.05);
  let y = prev.y;
  let vy = prev.vy;
  let isGrounded = prev.isGrounded;
  let coyoteTimer = prev.coyoteTimer;
  let landSquashTimer = Math.max(0, prev.landSquashTimer - safeDt);
  let takeoffTimer = Math.max(0, prev.takeoffTimer - safeDt);
  let justJumped = false;
  let justLanded = false;

  // Step-up forgiveness for low stairs (<= 0.22m step height when walking)
  const stepDiff = groundY - y;
  if (isGrounded && stepDiff > 0 && stepDiff <= 0.22) {
    y = groundY;
  }

  // Detect walking off a raised ledge
  if (isGrounded && y > groundY + 0.04) {
    isGrounded = false;
  }

  if (isGrounded) {
    coyoteTimer = COYOTE_TIME_SEC;
    y = Math.max(y, groundY);
  } else {
    coyoteTimer = Math.max(0, coyoteTimer - safeDt);
  }

  // Execute jump when grounded or within coyote window
  if (jumpRequested && (isGrounded || coyoteTimer > 0)) {
    vy = JUMP_VELOCITY;
    isGrounded = false;
    coyoteTimer = 0;
    takeoffTimer = TAKEOFF_STRETCH_SEC;
    landSquashTimer = 0;
    justJumped = true;
  }

  // Integrate vertical motion while airborne
  if (!isGrounded) {
    vy -= JUMP_GRAVITY * safeDt;
    y += vy * safeDt;

    if (y <= groundY && vy <= 0) {
      const impactSpeed = Math.abs(vy);
      y = groundY;
      vy = 0;
      isGrounded = true;
      coyoteTimer = COYOTE_TIME_SEC;
      if (impactSpeed > 2.2) {
        landSquashTimer = LAND_SQUASH_SEC;
        justLanded = true;
      }
    }
  } else {
    vy = 0;
    // Smoothly track ground elevation down if standing on a low step
    if (y > groundY) {
      y = groundY;
    }
  }

  // Compute cute chibi squash-and-stretch multipliers (peaks immediately on takeoff/landing)
  let visualScaleY = 1.0;
  if (takeoffTimer > 0) {
    const t = takeoffTimer / TAKEOFF_STRETCH_SEC;
    visualScaleY = 1.0 + 0.15 * Math.sin(t * Math.PI * 0.5);
  } else if (landSquashTimer > 0) {
    const t = landSquashTimer / LAND_SQUASH_SEC;
    visualScaleY = 1.0 - 0.16 * Math.sin(t * Math.PI * 0.5);
  } else if (!isGrounded) {
    // Gentle stretch while soaring upward, slight compression near apex
    visualScaleY = 1.0 + Math.max(-0.04, Math.min(0.08, vy * 0.012));
  }
  const visualScaleXZ = 1 / Math.sqrt(visualScaleY);

  return {
    state: {
      y,
      vy,
      isGrounded,
      coyoteTimer,
      landSquashTimer,
      takeoffTimer,
    },
    justJumped,
    justLanded,
    visualScaleY,
    visualScaleXZ,
  };
}
