import assert from 'node:assert/strict';
import test from 'node:test';
import {
  JUMP_VELOCITY,
  createInitialJumpState,
  getGroundElevationAt,
  stepJumpPhysics,
} from './jumpPhysics';
import {
  PARK_BOUNDS,
  PLAYER_SPAWN_POS,
  SHRINE_EXIT_POS,
  clampParkDestination,
  dampAngle,
  getCompanionStrollPose,
  isExteriorParkGroundPoint,
  isNearShrineEntrance,
  resolveParkCollision,
} from './parkLayout';
import {
  BOHYEONSAN_CONSTELLATIONS,
  OBSERVATORY_DOME_POS,
  STARLIGHT_TELESCOPE_POS,
  STARLIGHT_WARP_POS,
  isNearStarlightTelescope,
} from './starlightData';
import { ZODIAC_STATUES, findNearestZodiac } from './zodiacData';

test('ZODIAC_STATUES defines all 12 distinct signs in order with Korean copy', () => {
  assert.equal(ZODIAC_STATUES.length, 12);
  const ids = new Set(ZODIAC_STATUES.map((s) => s.id));
  assert.equal(ids.size, 12);

  ZODIAC_STATUES.forEach((statue, index) => {
    assert.equal(statue.order, index + 1);
    assert.ok(statue.koreanName.endsWith('띠'));
    assert.ok(statue.blessing.length >= 20);
    assert.ok(Number.isFinite(statue.position[0]) && Number.isFinite(statue.position[1]));
  });
});

test('findNearestZodiac locates nearby zodiac statues and ignores distant coordinates', () => {
  const tiger = ZODIAC_STATUES.find((s) => s.id === 'tiger')!;
  const near = findNearestZodiac(tiger.position[0] + 1.2, tiger.position[1] - 0.8, 3.2);
  assert.ok(near !== null);
  assert.equal(near.statue.id, 'tiger');
  assert.ok(near.distance < 2.0);

  const far = findNearestZodiac(0, 27.6, 3.0);
  assert.equal(far, null);
});

test('resolveParkCollision keeps spawn/exit/starlight warp clear and blocks solid obstacles cleanly', () => {
  const spawnResolved = resolveParkCollision(PLAYER_SPAWN_POS[0], PLAYER_SPAWN_POS[1]);
  assert.ok(Math.hypot(spawnResolved.x - PLAYER_SPAWN_POS[0], spawnResolved.z - PLAYER_SPAWN_POS[1]) < 0.001);

  const exitResolved = resolveParkCollision(SHRINE_EXIT_POS[0], SHRINE_EXIT_POS[1]);
  assert.ok(Math.hypot(exitResolved.x - SHRINE_EXIT_POS[0], exitResolved.z - SHRINE_EXIT_POS[1]) < 0.001);

  const warpResolved = resolveParkCollision(STARLIGHT_WARP_POS[0], STARLIGHT_WARP_POS[1]);
  assert.ok(Math.hypot(warpResolved.x - STARLIGHT_WARP_POS[0], warpResolved.z - STARLIGHT_WARP_POS[1]) < 0.001);

  // Attempting to walk inside shrine pavilion box pushes mascot outside z >= 3.9 + radius
  const insideShrine = resolveParkCollision(0, 2.0, 0.48);
  assert.ok(insideShrine.z >= 3.9);

  // Attempting to walk outside expanded northwest fence clamps inside PARK_BOUNDS
  const outsideFence = resolveParkCollision(0, 60.0, 0.48);
  assert.ok(outsideFence.z <= PARK_BOUNDS.maxZ);

  // Attempting to walk inside Bohyeonsan Observatory Dome pushes radially outward
  const insideDome = resolveParkCollision(OBSERVATORY_DOME_POS[0] + 0.1, OBSERVATORY_DOME_POS[1], 0.48);
  const distFromDome = Math.hypot(
    insideDome.x - OBSERVATORY_DOME_POS[0],
    insideDome.z - OBSERVATORY_DOME_POS[1],
  );
  assert.ok(distFromDome >= 2.35 + 0.48 - 0.01);

  // Attempting to walk through a Zodiac pedestal pushes radially outward
  const dragon = ZODIAC_STATUES.find((s) => s.id === 'dragon')!;
  const insidePedestal = resolveParkCollision(dragon.position[0] + 0.1, dragon.position[1], 0.48);
  const distFromPedestal = Math.hypot(
    insidePedestal.x - dragon.position[0],
    insidePedestal.z - dragon.position[1],
  );
  assert.ok(distFromPedestal >= 0.92 + 0.48 - 0.01);
});

test('isNearShrineEntrance activates only at the Dolhalmae shrine pavilion threshold', () => {
  assert.equal(isNearShrineEntrance(0, 5.4), true);
  assert.equal(isNearShrineEntrance(1.4, 4.6), true);
  assert.equal(isNearShrineEntrance(0, 19.0), false);
  assert.equal(isNearShrineEntrance(8.0, 5.4), false);
});

test('Bohyeonsan Starlight Zone telescope proximity and constellation data are valid', () => {
  assert.ok(BOHYEONSAN_CONSTELLATIONS.length >= 4);
  for (const c of BOHYEONSAN_CONSTELLATIONS) {
    assert.ok(c.koreanName.length > 0 && c.description.length > 20 && c.blessing.length > 10);
    assert.ok(c.points.length >= 4 && c.edges.length >= 3);
  }
  assert.equal(isNearStarlightTelescope(STARLIGHT_TELESCOPE_POS[0] + 1.1, STARLIGHT_TELESCOPE_POS[1]), true);
  assert.equal(isNearStarlightTelescope(0, 27.6), false);
});

test('stepJumpPhysics performs clean parabolic arc, squash/stretch, and landing on ground or decks', () => {
  let state = createInitialJumpState();
  const takeoff = stepJumpPhysics(state, 0.016, 0, true);
  assert.equal(takeoff.justJumped, true);
  assert.equal(takeoff.state.isGrounded, false);
  assert.ok(takeoff.state.vy > JUMP_VELOCITY * 0.8);
  assert.ok(takeoff.visualScaleY > 1.0);
  state = takeoff.state;

  // Mid-air ascent & descent until landing
  let peakY = state.y;
  let landed = false;
  for (let i = 0; i < 120; i++) {
    const res = stepJumpPhysics(state, 0.016, 0, false);
    state = res.state;
    if (state.y > peakY) peakY = state.y;
    if (res.justLanded) {
      landed = true;
      assert.ok(res.visualScaleY <= 1.0);
      break;
    }
  }
  assert.ok(peakY > 0.85 && peakY < 1.35, `Expected cute chibi jump apex ~1.1m, got ${peakY}`);
  assert.equal(landed, true);
  assert.equal(state.isGrounded, true);
  assert.equal(state.y, 0);

  // Elevated platforms: Observatory deck, East Jeongja deck, Central plaza, and granite bench
  assert.equal(getGroundElevationAt(-27.5, 17.0), 0.34);
  assert.equal(getGroundElevationAt(27.5, 15.5), 0.32);
  assert.equal(getGroundElevationAt(0, 19.0), 0.06);
  assert.equal(getGroundElevationAt(-4.3, 21.8), 0.42);
  assert.equal(getGroundElevationAt(0, 27.6), 0);
});

test('getCompanionStrollPose generates finite continuous park coordinates', () => {
  const p0 = getCompanionStrollPose(0);
  const p1 = getCompanionStrollPose(0.5);
  assert.ok(Number.isFinite(p0.x) && Number.isFinite(p0.z) && Number.isFinite(p0.yaw));
  assert.ok(Math.hypot(p1.x - p0.x, p1.z - p0.z) > 0.1);
  assert.ok(Math.hypot(p1.x - p0.x, p1.z - p0.z) < 2.5);
});

test('dampAngle wraps cleanly across +/- PI', () => {
  const a = dampAngle(Math.PI - 0.1, -Math.PI + 0.1, 10, 0.05);
  assert.ok(Math.abs(Math.abs(a) - Math.PI) < 0.2);
});

test('clampParkDestination keeps mouse-clicked destinations walkable inside expanded bounds', () => {
  const dest = clampParkDestination(100, -10);
  assert.ok(dest.x <= PARK_BOUNDS.maxX && dest.z >= PARK_BOUNDS.minZ);
});

test('isExteriorParkGroundPoint excludes altar pedestal and accepts expanded park ground', () => {
  assert.equal(isExteriorParkGroundPoint(0, 0), false);
  assert.equal(isExteriorParkGroundPoint(0.5, 0.5), false);
  assert.equal(isExteriorParkGroundPoint(0, 6.4), true);
  assert.equal(isExteriorParkGroundPoint(-26.0, 19.0), true);
  assert.equal(isExteriorParkGroundPoint(28.0, 22.0), true);
  assert.equal(isExteriorParkGroundPoint(0, 200), false);
});
