export type ZodiacId =
  | 'rat'
  | 'ox'
  | 'tiger'
  | 'rabbit'
  | 'dragon'
  | 'snake'
  | 'horse'
  | 'sheep'
  | 'monkey'
  | 'rooster'
  | 'dog'
  | 'pig';

export interface ZodiacStatueInfo {
  id: ZodiacId;
  order: number;
  koreanName: string;
  branch: string;
  hanja: string;
  title: string;
  blessing: string;
  position: [number, number]; // [x, z]
  yaw: number;
}

/**
 * 12 Chinese Zodiac granite statues (십이지신상) placed along the figure-8
 * walkways and central plaza perimeter of Bugan-myeon Dolhalmae Park.
 */
export const ZODIAC_STATUES: ZodiacStatueInfo[] = [
  // North oval perimeter (6 statues)
  {
    id: 'rat',
    order: 1,
    koreanName: '쥐띠',
    branch: '자',
    hanja: '子',
    title: '쥐띠 (자) · 수호석상',
    blessing: '부지런한 지혜와 맑은 직관으로 작은 기회도 귀한 결실로 이어지는 한 해가 되기를 기원합니다.',
    position: [-8.6, 28.2],
    yaw: Math.atan2(8.6, -3.5),
  },
  {
    id: 'ox',
    order: 2,
    koreanName: '소띠',
    branch: '축',
    hanja: '丑',
    title: '소띠 (축) · 수호석상',
    blessing: '흔들림 없는 우직함과 성실한 걸음마다 든든한 복과 평안이 차곡차곡 쌓이기를 바랍니다.',
    position: [8.6, 28.2],
    yaw: Math.atan2(-8.6, -3.5),
  },
  {
    id: 'tiger',
    order: 3,
    koreanName: '호랑이띠',
    branch: '인',
    hanja: '寅',
    title: '호랑이띠 (인) · 수호석상',
    blessing: '관산의 기운을 닮은 당찬 용기로 망설이던 일에 힘찬 돌파구가 열리기를 기원합니다.',
    position: [-11.8, 22.8],
    yaw: Math.atan2(11.8, -1.5),
  },
  {
    id: 'rabbit',
    order: 4,
    koreanName: '토끼띠',
    branch: '묘',
    hanja: '卯',
    title: '토끼띠 (묘) · 수호석상',
    blessing: '온화한 마음과 영특한 살핌으로 가정과 일터에 화목한 웃음이 가득하기를 바랍니다.',
    position: [11.8, 22.8],
    yaw: Math.atan2(-11.8, -1.5),
  },
  {
    id: 'dragon',
    order: 5,
    koreanName: '용띠',
    branch: '진',
    hanja: '辰',
    title: '용띠 (진) · 수호석상',
    blessing: '구름을 뚫고 오르는 청룡의 기상처럼 뜻한 바가 높고 귀하게 뻗어 나가기를 기원합니다.',
    position: [-6.4, 19.0],
    yaw: Math.PI / 2,
  },
  {
    id: 'snake',
    order: 6,
    koreanName: '뱀띠',
    branch: '사',
    hanja: '巳',
    title: '뱀띠 (사) · 수호석상',
    blessing: '고요히 때를 읽는 깊은 통찰이 빛을 발해 어렵던 매듭이 부드럽게 풀리기를 바랍니다.',
    position: [6.4, 19.0],
    yaw: -Math.PI / 2,
  },
  // South oval perimeter (6 statues)
  {
    id: 'horse',
    order: 7,
    koreanName: '말띠',
    branch: '오',
    hanja: '午',
    title: '말띠 (오) · 수호석상',
    blessing: '넓은 들판을 달리는 자유로운 발걸음처럼 건강과 활력이 온몸에 넘쳐나기를 기원합니다.',
    position: [-11.8, 14.8],
    yaw: Math.atan2(11.8, -1.0),
  },
  {
    id: 'sheep',
    order: 8,
    koreanName: '양띠',
    branch: '미',
    hanja: '未',
    title: '양띠 (미) · 수호석상',
    blessing: '따뜻한 배려와 포근한 인연이 곁에 머물러 마음이 늘 넉넉하고 평온하기를 바랍니다.',
    position: [11.8, 14.8],
    yaw: Math.atan2(-11.8, -1.0),
  },
  {
    id: 'monkey',
    order: 9,
    koreanName: '원숭이띠',
    branch: '신',
    hanja: '申',
    title: '원숭이띠 (신) · 수호석상',
    blessing: '재치 있는 생각과 밝은 웃음이 겹겹이 모여 뜻밖의 기쁜 소식이 찾아오기를 기원합니다.',
    position: [-9.2, 9.2],
    yaw: Math.atan2(9.2, 3.0),
  },
  {
    id: 'rooster',
    order: 10,
    koreanName: '닭띠',
    branch: '유',
    hanja: '酉',
    title: '닭띠 (유) · 수호석상',
    blessing: '새벽을 깨우는 맑은 울음처럼 어둠이 걷히고 희망찬 새 아침이 밝아오기를 바랍니다.',
    position: [9.2, 9.2],
    yaw: Math.atan2(-9.2, 3.0),
  },
  {
    id: 'dog',
    order: 11,
    koreanName: '개띠',
    branch: '술',
    hanja: '戌',
    title: '개띠 (술) · 수호석상',
    blessing: '변함없는 신의와 듬직한 걸음이 소중한 사람들을 지켜주는 든든한 울타리가 되기를 기원합니다.',
    position: [-4.6, 6.8],
    yaw: Math.atan2(4.6, 4.0),
  },
  {
    id: 'pig',
    order: 12,
    koreanName: '돼지띠',
    branch: '해',
    hanja: '亥',
    title: '돼지띠 (해) · 수호석상',
    blessing: '복을 부르는 넉넉한 미소와 함께 재물과 건강의 복이 집안 가득 깃들기를 바랍니다.',
    position: [4.6, 6.8],
    yaw: Math.atan2(-4.6, 4.0),
  },
];

/**
 * Returns the nearest Zodiac statue within `maxDist` meters of (x, z), or null.
 */
export function findNearestZodiac(
  x: number,
  z: number,
  maxDist = 3.2,
): { statue: ZodiacStatueInfo; distance: number } | null {
  let best: ZodiacStatueInfo | null = null;
  let bestDist = maxDist;

  for (const statue of ZODIAC_STATUES) {
    const d = Math.hypot(x - statue.position[0], z - statue.position[1]);
    if (d < bestDist) {
      bestDist = d;
      best = statue;
    }
  }

  return best ? { statue: best, distance: bestDist } : null;
}
