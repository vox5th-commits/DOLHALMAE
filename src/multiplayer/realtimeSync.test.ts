import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeAiFallbackVisitors,
  hasSupabaseEnv,
  parsePresenceUsers,
  shouldSendMoveBroadcast,
} from './realtimeSync';

test('hasSupabaseEnv rejects empty or placeholder values and accepts real URL + anon key', () => {
  assert.equal(hasSupabaseEnv('', ''), false);
  assert.equal(hasSupabaseEnv(undefined, undefined), false);
  assert.equal(hasSupabaseEnv('YOUR_SUPABASE_URL', 'anon'), false);
  assert.equal(hasSupabaseEnv('https://example.supabase.co', 'YOUR_KEY'), false);
  assert.equal(hasSupabaseEnv('https://xyzcompany.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test'), true);
});

test('parsePresenceUsers extracts remote players, excludes self, and preserves praying state', () => {
  const presenceState = {
    'user-self': [{ userId: 'user-self', nickname: '북안면 별빛', character: 'byeori', state: 'walking' }],
    'user-2': [{ userId: 'user-2', nickname: '보현산 소원꾼', character: 'bichi', state: 'praying' }],
    'user-3': [{ userId: 'user-3', nickname: '금호읍 구름', character: 'byeori', state: 'walking' }],
  };

  const remotes = parsePresenceUsers(presenceState, 'user-self');
  assert.equal(remotes.length, 2);
  assert.deepEqual(remotes[0], {
    userId: 'user-2',
    nickname: '보현산 소원꾼',
    character: 'bichi',
    state: 'praying',
  });
  assert.deepEqual(remotes[1], {
    userId: 'user-3',
    nickname: '금호읍 구름',
    character: 'byeori',
    state: 'walking',
  });
});

test('shouldSendMoveBroadcast throttles to ~10Hz and detects meaningful horizontal and vertical jump movement', () => {
  const p1 = { userId: 'u1', x: 0, z: 20, y: 0, rotationY: 0, isMoving: true };
  assert.equal(shouldSendMoveBroadcast(1000, 950, p1, p1, 100), false);
  assert.equal(shouldSendMoveBroadcast(1200, 950, p1, p1, 100), false);

  const p2 = { userId: 'u1', x: 0.4, z: 20, y: 0, rotationY: 0, isMoving: true };
  assert.equal(shouldSendMoveBroadcast(1080, 1000, p1, p2, 100), false);
  assert.equal(shouldSendMoveBroadcast(1105, 1000, p1, p2, 100), true);

  // Standing in place but jumping vertically triggers broadcast
  const pJump = { userId: 'u1', x: 0, z: 20, y: 0.45, rotationY: 0, isMoving: false };
  assert.equal(shouldSendMoveBroadcast(1110, 1000, p1, pJump, 100), true);
});

test('computeAiFallbackVisitors returns 2 finite wandering mascots in local mode', () => {
  const visitors = computeAiFallbackVisitors(4.5);
  assert.equal(visitors.length, 2);
  assert.notEqual(visitors[0].character, visitors[1].character);
  for (const v of visitors) {
    assert.ok(Number.isFinite(v.x) && Number.isFinite(v.z) && Number.isFinite(v.rotationY));
    assert.ok(v.nickname.length > 0);
  }
});
