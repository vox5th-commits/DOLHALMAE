export interface ConstellationStory {
  id: string;
  koreanName: string;
  englishName: string;
  season: string;
  starsLabel: string;
  description: string;
  blessing: string;
  /** Normalized 2D star points (x, y in 0..100) for clean SVG constellation diagram. */
  points: Array<[number, number]>;
  /** Edges connecting point indices. */
  edges: Array<[number, number]>;
}

/**
 * Center coordinates for the Bohyeonsan Starlight Experience Zone (보현산 별빛체험존)
 * on the expanded West Wing of Dolhalmae Park.
 */
export const STARLIGHT_ZONE_CENTER: [number, number] = [-25.5, 19.0];
export const OBSERVATORY_DOME_POS: [number, number] = [-29.0, 16.5];
export const STARLIGHT_TELESCOPE_POS: [number, number] = [-23.4, 21.6];
export const STARLIGHT_ARCH_POS: [number, number] = [-16.6, 19.0];
export const STARLIGHT_WARP_POS: [number, number] = [-21.0, 23.0];

export const BOHYEONSAN_CONSTELLATIONS: ConstellationStory[] = [
  {
    id: 'big-dipper',
    koreanName: '북두칠성 (큰곰자리)',
    englishName: 'Ursa Major · Big Dipper',
    season: '사계절 · 보현산 북쪽 하늘',
    starsLabel: '일곱 별의 길잡이',
    description:
      '영천 보현산 천문대(해발 1,124m)의 맑은 밤하늘에서 가장 또렷이 빛나는 국자 모양 별자리입니다. 예로부터 길 잃은 이의 방향을 밝혀주고 수명과 복을 관장하는 별로 사랑받았습니다.',
    blessing: '오늘 밤 북두칠성의 맑은 빛이 당신의 앞길을 환하게 비추어 주기를 바랍니다.',
    points: [
      [14, 34],
      [30, 38],
      [44, 48],
      [56, 56],
      [58, 74],
      [78, 72],
      [84, 52],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 3],
    ],
  },
  {
    id: 'cassiopeia',
    koreanName: '카시오페이아자리',
    englishName: 'Cassiopeia',
    season: '가을·겨울 · 영천 은하수 길',
    starsLabel: '하늘의 W자 별빛 왕관',
    description:
      '북극성을 사이에 두고 북두칠성과 마주 보는 아름다운 W 모양 별자리입니다. 영천 보현산 별빛마을의 깨끗한 대기 아래에서는 별자리 뒤로 흐르는 은하수까지 함께 감상할 수 있습니다.',
    blessing: '흔들리지 않는 별빛 왕관처럼 소중한 꿈이 단단히 빛나기를 기원합니다.',
    points: [
      [14, 38],
      [32, 66],
      [50, 44],
      [68, 70],
      [86, 34],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
  {
    id: 'orion',
    koreanName: '오리온자리',
    englishName: 'Orion',
    season: '겨울 · 보현산 남쪽 하늘',
    starsLabel: '삼태성과 베텔게우스',
    description:
      '가운데 나란히 늘어선 세 별(삼태성)과 붉은 베텔게우스, 푸른 리겔이 어우러진 겨울 밤하늘의 대표 별자리입니다. 별의 도시 영천에서 망원경으로 보면 오리온 대성운의 신비로운 빛을 만날 수 있습니다.',
    blessing: '삼태성의 조화로운 기운처럼 건강과 용기가 늘 함께하기를 바랍니다.',
    points: [
      [26, 20],
      [72, 24],
      [42, 48],
      [50, 50],
      [58, 52],
      [28, 80],
      [74, 78],
    ],
    edges: [
      [0, 2],
      [1, 4],
      [2, 3],
      [3, 4],
      [2, 5],
      [4, 6],
      [0, 1],
      [5, 6],
    ],
  },
  {
    id: 'cygnus',
    koreanName: '백조자리 (북십자성)',
    englishName: 'Cygnus',
    season: '여름 · 보현산 은하수 중심',
    starsLabel: '은하수를 나는 별빛 날개',
    description:
      '여름철 영천 보현산 천문과학관 위를 가로지르는 은하수 한가운데서 힘차게 날개를 펼친 별자리입니다. 꼬리의 데네브는 직녀성·견우성과 함께 여름철 대삼각형을 이룹니다.',
    blessing: '은하수를 가로지르는 백조처럼 마음이 가볍고 자유롭게 비상하기를 바랍니다.',
    points: [
      [50, 16],
      [50, 44],
      [50, 82],
      [18, 48],
      [82, 40],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [3, 1],
      [1, 4],
    ],
  },
];

/**
 * Returns true when the mascot is near the Bohyeonsan Starlight Viewing Telescope
 * or Observatory Deck so the contextual stargazing prompt can appear.
 */
export function isNearStarlightTelescope(x: number, z: number, maxDist = 3.8): boolean {
  const dTel = Math.hypot(x - STARLIGHT_TELESCOPE_POS[0], z - STARLIGHT_TELESCOPE_POS[1]);
  const dObs = Math.hypot(x - (OBSERVATORY_DOME_POS[0] + 2.8), z - (OBSERVATORY_DOME_POS[1] + 2.2));
  return dTel <= maxDist || dObs <= 3.1;
}
