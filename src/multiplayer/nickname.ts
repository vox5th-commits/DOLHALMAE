export const YEONGCHEON_POOL_A = [
  '북안면',
  '금호읍',
  '완산동',
  '중앙동',
  '동부동',
  '서부동',
  '남부동',
  '청통면',
  '신녕면',
  '화산면',
  '화북면',
  '화남면',
  '자양면',
  '임고면',
  '고경면',
  '대창면',
  '보현산',
  '은해사',
  '돌할매',
  '별빛',
  '치산계곡',
  '임고서원',
  '금호강',
  '영천포도',
  '운주산',
  '만불산',
] as const;

export const YEONGCHEON_POOL_B = [
  '별이',
  '빛이',
  '산책러',
  '소원꾼',
  '구름',
  '달빛',
  '바람',
  '발걸음',
  '여행자',
  '참배객',
  '별똥별',
  '햇살',
] as const;

export const NICKNAME_STORAGE_KEY = 'dolhalmae_yeongcheon_nickname';
export const VISITOR_ID_STORAGE_KEY = 'dolhalmae_visitor_id';
export const MAX_NICKNAME_LENGTH = 12;

export function generateRandomNickname(rng: () => number = Math.random): string {
  const aIdx = Math.min(
    YEONGCHEON_POOL_A.length - 1,
    Math.max(0, Math.floor(rng() * YEONGCHEON_POOL_A.length)),
  );
  const bIdx = Math.min(
    YEONGCHEON_POOL_B.length - 1,
    Math.max(0, Math.floor(rng() * YEONGCHEON_POOL_B.length)),
  );
  const candidate = `${YEONGCHEON_POOL_A[aIdx]} ${YEONGCHEON_POOL_B[bIdx]}`;
  return candidate.slice(0, MAX_NICKNAME_LENGTH).trim();
}

export function sanitizeNickname(raw: string): string {
  const normalized = raw.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return Array.from(normalized).slice(0, MAX_NICKNAME_LENGTH).join('').trim();
}

export function loadOrCreateNickname(
  storage: Pick<Storage, 'getItem' | 'setItem'> | null | undefined =
    typeof window !== 'undefined' ? window.localStorage : null,
  rng: () => number = Math.random,
): string {
  try {
    const saved = storage?.getItem(NICKNAME_STORAGE_KEY);
    if (saved) {
      const cleaned = sanitizeNickname(saved);
      if (cleaned) return cleaned;
    }
  } catch {
    // ignore storage read errors
  }

  const generated = generateRandomNickname(rng);
  try {
    storage?.setItem(NICKNAME_STORAGE_KEY, generated);
  } catch {
    // ignore storage write errors
  }
  return generated;
}

export function saveNickname(
  rawNickname: string,
  storage: Pick<Storage, 'setItem'> | null | undefined =
    typeof window !== 'undefined' ? window.localStorage : null,
): string | null {
  const cleaned = sanitizeNickname(rawNickname);
  if (!cleaned) return null;
  try {
    storage?.setItem(NICKNAME_STORAGE_KEY, cleaned);
  } catch {
    // ignore storage write errors
  }
  return cleaned;
}

export function getOrCreateVisitorId(
  storage: Pick<Storage, 'getItem' | 'setItem'> | null | undefined =
    typeof window !== 'undefined' ? window.localStorage : null,
): string {
  try {
    const existing = storage?.getItem(VISITOR_ID_STORAGE_KEY);
    if (existing && existing.trim().length >= 8) {
      return existing.trim();
    }
  } catch {
    // ignore storage read errors
  }

  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `yc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  try {
    storage?.setItem(VISITOR_ID_STORAGE_KEY, randomPart);
  } catch {
    // ignore storage write errors
  }
  return randomPart;
}
