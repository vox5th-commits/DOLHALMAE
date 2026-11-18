import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateWishGrantProbability,
  resolveSecondLiftOutcome,
  validateWishInput,
  stepStoneLiftPhysics,
  parseSavedWishTags,
  createWishTagEntry,
  driftVisitorCount,
  DEFAULT_WISH_TAGS,
  type LiftPhysicsState,
} from './ritualLogic';

test('wish grant probability scales from 0.65 base to 0.85 max with patience', () => {
  assert.equal(calculateWishGrantProbability(0), 0.65);
  assert.equal(calculateWishGrantProbability(-5), 0.65);
  assert.equal(calculateWishGrantProbability(5), 0.75);
  assert.equal(calculateWishGrantProbability(10), 0.85);
  assert.equal(calculateWishGrantProbability(30), 0.85);
});

test('resolveSecondLiftOutcome returns granted below threshold and retry at or above threshold', () => {
  assert.equal(resolveSecondLiftOutcome(0, 0.64), 'granted');
  assert.equal(resolveSecondLiftOutcome(0, 0.65), 'retry');
  assert.equal(resolveSecondLiftOutcome(10, 0.84), 'granted');
  assert.equal(resolveSecondLiftOutcome(10, 0.85), 'retry');
});

test('validateWishInput rejects empty/single-char wishes and accepts sincere Korean wishes', () => {
  assert.equal(validateWishInput('').valid, false);
  assert.equal(validateWishInput('   ').valid, false);
  assert.equal(validateWishInput('복').valid, false);
  assert.equal(validateWishInput('가족 모두 건강하길 바랍니다').valid, true);
});

test('stepStoneLiftPhysics lifts smoothly in normal_lift mode and stays anchored in heavy_immovable mode', () => {
  let normalState: LiftPhysicsState = {
    liftProgress: 0,
    velocity: 0,
    isPulling: true,
    holdSeconds: 0,
    trembleAmplitude: 0,
  };

  for (let i = 0; i < 40; i++) {
    normalState = stepStoneLiftPhysics(normalState, 0.03, 'normal_lift');
  }
  assert.ok(normalState.liftProgress > 0.75, 'Normal lift should rise significantly');
  assert.ok(normalState.holdSeconds > 1.0, 'Hold time should accumulate');

  let heavyState: LiftPhysicsState = {
    liftProgress: 0,
    velocity: 0,
    isPulling: true,
    holdSeconds: 0,
    trembleAmplitude: 0,
  };
  for (let i = 0; i < 40; i++) {
    heavyState = stepStoneLiftPhysics(heavyState, 0.03, 'heavy_immovable');
  }
  assert.ok(heavyState.liftProgress <= 0.06, 'Heavy immovable stone must stay anchored near pedestal');
  assert.ok(heavyState.trembleAmplitude > 0.5, 'Heavy immovable stone should tremble under strain');
});

test('parseSavedWishTags falls back to seed tags on invalid JSON and preserves valid entries', () => {
  assert.equal(parseSavedWishTags(null).length, DEFAULT_WISH_TAGS.length);
  assert.equal(parseSavedWishTags('{invalid').length, DEFAULT_WISH_TAGS.length);

  const custom = createWishTagEntry('영천시 홍길동', '부모님 만수무강', 'granted', 1710000000000);
  assert.equal(custom.identity, '영천시 홍길동');
  assert.equal(custom.wish, '부모님 만수무강');

  const parsed = parseSavedWishTags(JSON.stringify([custom]));
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].wish, '부모님 만수무강');
});

test('driftVisitorCount stays within calm sanctuary bounds [7, 19]', () => {
  assert.equal(driftVisitorCount(7, 0.1), 7);
  assert.equal(driftVisitorCount(19, 0.9), 19);
  assert.equal(driftVisitorCount(11, 0.1), 10);
  assert.equal(driftVisitorCount(11, 0.9), 12);
  assert.equal(driftVisitorCount(11, 0.5), 11);
});
