import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_NICKNAME_LENGTH,
  NICKNAME_STORAGE_KEY,
  YEONGCHEON_POOL_A,
  YEONGCHEON_POOL_B,
  generateRandomNickname,
  loadOrCreateNickname,
  sanitizeNickname,
  saveNickname,
} from './nickname';

test('Yeongcheon nickname pools include all 26 places and 12 visitor nouns', () => {
  assert.equal(YEONGCHEON_POOL_A.length, 26);
  assert.equal(YEONGCHEON_POOL_B.length, 12);
  const first = generateRandomNickname(() => 0);
  assert.equal(first, '북안면 별이');
  const last = generateRandomNickname(() => 0.9999);
  assert.equal(last, '만불산 햇살');
});

test('sanitizeNickname trims whitespace, caps at 12 characters, and rejects blanks', () => {
  assert.equal(sanitizeNickname('   '), '');
  assert.equal(sanitizeNickname('  보현산   달빛  '), '보현산 달빛');
  assert.equal(
    Array.from(sanitizeNickname('영천북안면돌할매공원산책러입니다')).length,
    MAX_NICKNAME_LENGTH,
  );
});

test('loadOrCreateNickname persists generated nickname and saveNickname updates it', () => {
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
  };

  const created = loadOrCreateNickname(mockStorage, () => 0.12);
  assert.ok(created.length > 0);
  assert.equal(store.get(NICKNAME_STORAGE_KEY), created);

  const loadedAgain = loadOrCreateNickname(mockStorage, () => 0.88);
  assert.equal(loadedAgain, created);

  const updated = saveNickname('은해사 구름', mockStorage);
  assert.equal(updated, '은해사 구름');
  assert.equal(store.get(NICKNAME_STORAGE_KEY), '은해사 구름');
  assert.equal(saveNickname('   ', mockStorage), null);
});
