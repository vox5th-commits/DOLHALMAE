import * as THREE from 'three';

export interface MaterialTextureSet {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
}

function seededRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function configureTexture(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = Math.max(1, anisotropy);
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.needsUpdate = true;
  return tex;
}

/**
 * Dark-gray speckled granite for the sacred ovoid Dolhalmae stone.
 */
export function createDarkGraniteTextures(anisotropy: number): MaterialTextureSet {
  const size = 512;
  const albedo = document.createElement('canvas');
  albedo.width = size;
  albedo.height = size;
  const ctx = albedo.getContext('2d')!;

  const bump = document.createElement('canvas');
  bump.width = size;
  bump.height = size;
  const bCtx = bump.getContext('2d')!;

  ctx.fillStyle = '#3f4246';
  ctx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  const rand = seededRand(104729);
  // Subtle mineral mottling
  for (let i = 0; i < 420; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 8 + rand() * 28;
    const shade = Math.floor(48 + rand() * 34);
    ctx.fillStyle = `rgba(${shade}, ${shade + 2}, ${shade + 5}, 0.16)`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fine quartz, feldspar, and dark biotite mica speckles
  for (let i = 0; i < 6500; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 0.7 + rand() * 2.1;
    const t = rand();
    if (t < 0.34) {
      ctx.fillStyle = 'rgba(28, 30, 33, 0.75)';
      bCtx.fillStyle = 'rgba(75, 75, 75, 0.7)';
    } else if (t < 0.72) {
      ctx.fillStyle = 'rgba(130, 134, 140, 0.45)';
      bCtx.fillStyle = 'rgba(165, 165, 165, 0.5)';
    } else {
      ctx.fillStyle = 'rgba(205, 203, 196, 0.42)';
      bCtx.fillStyle = 'rgba(200, 200, 200, 0.55)';
    }
    ctx.fillRect(x, y, r, r);
    bCtx.fillRect(x, y, r, r);
  }

  // Warm hand-touched patina sheen near stone equator
  const patina = ctx.createLinearGradient(0, 0, 0, size);
  patina.addColorStop(0, 'rgba(30, 32, 34, 0.15)');
  patina.addColorStop(0.5, 'rgba(92, 84, 72, 0.12)');
  patina.addColorStop(1, 'rgba(30, 32, 34, 0.18)');
  ctx.fillStyle = patina;
  ctx.fillRect(0, 0, size, size);

  return {
    map: configureTexture(albedo, true, anisotropy, 2, 2),
    bumpMap: configureTexture(bump, false, anisotropy, 2, 2),
  };
}

/**
 * Weathered light-gray Yeongcheon granite for square pedestal, pillars, balustrade, and stone floor.
 */
export function createLightGraniteTextures(
  anisotropy: number,
  repeatX = 2,
  repeatY = 2,
): MaterialTextureSet {
  const size = 512;
  const albedo = document.createElement('canvas');
  albedo.width = size;
  albedo.height = size;
  const ctx = albedo.getContext('2d')!;

  const bump = document.createElement('canvas');
  bump.width = size;
  bump.height = size;
  const bCtx = bump.getContext('2d')!;

  ctx.fillStyle = '#a9a7a2';
  ctx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#828282';
  bCtx.fillRect(0, 0, size, size);

  const rand = seededRand(88321);
  for (let i = 0; i < 380; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 10 + rand() * 34;
    const v = Math.floor(142 + rand() * 36);
    ctx.fillStyle = `rgba(${v + 4}, ${v + 2}, ${v - 2}, 0.14)`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 5500; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const w = 1 + rand() * 2.2;
    const t = rand();
    if (t < 0.36) {
      ctx.fillStyle = 'rgba(72, 74, 78, 0.48)';
      bCtx.fillStyle = 'rgba(90, 90, 90, 0.55)';
    } else if (t < 0.72) {
      ctx.fillStyle = 'rgba(220, 217, 210, 0.45)';
      bCtx.fillStyle = 'rgba(180, 180, 180, 0.5)';
    } else {
      ctx.fillStyle = 'rgba(148, 142, 132, 0.35)';
      bCtx.fillStyle = 'rgba(140, 140, 140, 0.4)';
    }
    ctx.fillRect(x, y, w, w);
    bCtx.fillRect(x, y, w, w);
  }

  return {
    map: configureTexture(albedo, true, anisotropy, repeatX, repeatY),
    bumpMap: configureTexture(bump, false, anisotropy, repeatX, repeatY),
  };
}

/**
 * Natural mossy mountain bedrock cliff texture (deep damp granite + lush forest moss patches).
 */
export function createMossyBedrockTextures(anisotropy: number): MaterialTextureSet {
  const size = 512;
  const albedo = document.createElement('canvas');
  albedo.width = size;
  albedo.height = size;
  const ctx = albedo.getContext('2d')!;

  const bump = document.createElement('canvas');
  bump.width = size;
  bump.height = size;
  const bCtx = bump.getContext('2d')!;

  ctx.fillStyle = '#333633';
  ctx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#707070';
  bCtx.fillRect(0, 0, size, size);

  const rand = seededRand(55219);
  // Subtle natural rock fracture shading
  for (let i = 0; i < 90; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const w = 36 + rand() * 140;
    const h = 10 + rand() * 34;
    ctx.fillStyle = rand() > 0.5 ? 'rgba(22, 24, 23, 0.28)' : 'rgba(72, 74, 68, 0.22)';
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
    bCtx.fillStyle = rand() > 0.5 ? 'rgba(50, 50, 50, 0.42)' : 'rgba(155, 155, 155, 0.36)';
    bCtx.fillRect(x - w / 2, y - h / 2, w, h);
  }

  // Fine mineral grain
  for (let i = 0; i < 6200; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const s = 1 + rand() * 2.4;
    const g = Math.floor(32 + rand() * 54);
    ctx.fillStyle = `rgba(${g}, ${g + 2}, ${g - 1}, 0.45)`;
    ctx.fillRect(x, y, s, s);
    bCtx.fillStyle = `rgba(${g + 55}, ${g + 55}, ${g + 55}, 0.48)`;
    bCtx.fillRect(x, y, s, s);
  }

  // Organic deep forest moss clusters (irregular stippled patches instead of hard circles)
  for (let i = 0; i < 42; i++) {
    const cx = rand() * size;
    const cy = rand() * size;
    const count = 24 + Math.floor(rand() * 28);
    for (let j = 0; j < count; j++) {
      const angle = rand() * Math.PI * 2;
      const dist = rand() * 38;
      const mx = cx + Math.cos(angle) * dist * 1.4;
      const my = cy + Math.sin(angle) * dist * 0.85;
      const r = 3 + rand() * 10;
      ctx.fillStyle =
        rand() > 0.45 ? 'rgba(42, 74, 34, 0.42)' : 'rgba(58, 92, 42, 0.35)';
      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return {
    map: configureTexture(albedo, true, anisotropy, 2, 2),
    bumpMap: configureTexture(bump, false, anisotropy, 2, 2),
  };
}

/**
 * Korean traditional dark-gray giwa (기와) roof tile texture & bump map.
 */
export function createRoofTileTextures(anisotropy: number): MaterialTextureSet {
  const size = 512;
  const albedo = document.createElement('canvas');
  albedo.width = size;
  albedo.height = size;
  const ctx = albedo.getContext('2d')!;

  const bump = document.createElement('canvas');
  bump.width = size;
  bump.height = size;
  const bCtx = bump.getContext('2d')!;

  ctx.fillStyle = '#2d3137';
  ctx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#606060';
  bCtx.fillRect(0, 0, size, size);

  const cols = 12;
  const rows = 14;
  const colW = size / cols;
  const rowH = size / rows;

  for (let r = 0; r < rows; r++) {
    const y = r * rowH;
    // Horizontal tile overlap shadow
    ctx.fillStyle = 'rgba(14, 16, 20, 0.45)';
    ctx.fillRect(0, y + rowH - 4, size, 4);
    bCtx.fillStyle = '#282828';
    bCtx.fillRect(0, y + rowH - 4, size, 4);

    for (let c = 0; c < cols; c++) {
      const x = c * colW;
      // Scalloped concave pan + convex ridge rib (암키와 / 수키와)
      const panGrad = ctx.createLinearGradient(x, 0, x + colW, 0);
      panGrad.addColorStop(0, '#1e2126');
      panGrad.addColorStop(0.32, '#3a3f47');
      panGrad.addColorStop(0.68, '#363b42');
      panGrad.addColorStop(0.84, '#4c525b');
      panGrad.addColorStop(1, '#1c1f24');
      ctx.fillStyle = panGrad;
      ctx.fillRect(x, y, colW, rowH - 3);

      const bumpGrad = bCtx.createLinearGradient(x, 0, x + colW, 0);
      bumpGrad.addColorStop(0, '#303030');
      bumpGrad.addColorStop(0.35, '#808080');
      bumpGrad.addColorStop(0.72, '#9a9a9a');
      bumpGrad.addColorStop(0.88, '#ececec');
      bumpGrad.addColorStop(1, '#303030');
      bCtx.fillStyle = bumpGrad;
      bCtx.fillRect(x, y, colW, rowH - 3);
    }
  }

  return {
    map: configureTexture(albedo, true, anisotropy, 4, 3),
    bumpMap: configureTexture(bump, false, anisotropy, 4, 3),
  };
}

/**
 * Warm aged Korean pine wood texture for rafters, beams, and donation box.
 */
export function createAgedWoodTextures(anisotropy: number): MaterialTextureSet {
  const size = 512;
  const albedo = document.createElement('canvas');
  albedo.width = size;
  albedo.height = size;
  const ctx = albedo.getContext('2d')!;

  const bump = document.createElement('canvas');
  bump.width = size;
  bump.height = size;
  const bCtx = bump.getContext('2d')!;

  ctx.fillStyle = '#5c3f2b';
  ctx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  const rand = seededRand(3119);
  for (let i = 0; i < 220; i++) {
    const y = rand() * size;
    const h = 1 + rand() * 3.5;
    const tone = rand() > 0.4 ? 'rgba(42, 26, 16, 0.35)' : 'rgba(116, 82, 54, 0.25)';
    ctx.fillStyle = tone;
    ctx.fillRect(0, y, size, h);
    bCtx.fillStyle = rand() > 0.5 ? 'rgba(100, 100, 100, 0.35)' : 'rgba(155, 155, 155, 0.35)';
    bCtx.fillRect(0, y, size, h);
  }

  return {
    map: configureTexture(albedo, true, anisotropy, 1, 2),
    bumpMap: configureTexture(bump, false, anisotropy, 1, 2),
  };
}

/**
 * Wooden calligraphy plaque for the traditional donation box (복전함).
 */
export function createDonationBoxSignTexture(anisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#3b281c';
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = '#8b6a46';
  ctx.lineWidth = 8;
  ctx.strokeRect(16, 16, 480, 224);

  ctx.fillStyle = '#e7d5b2';
  ctx.font = 'bold 76px "Noto Serif KR", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('복 전 함', 256, 114);

  ctx.fillStyle = '#bfa67a';
  ctx.font = '28px "Noto Serif KR", Georgia, serif';
  ctx.fillText('福 錢 函', 256, 184);

  return configureTexture(canvas, true, anisotropy, 1, 1);
}

/**
 * Unobtrusive wooden ritual guide plaque (돌할매 기도 순서 안내판).
 */
export function createRitualGuideBoardTexture(anisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 640;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#3c2b1e';
  ctx.fillRect(0, 0, 512, 640);

  // Inner pale wood board
  ctx.fillStyle = '#dfd3be';
  ctx.fillRect(28, 28, 456, 584);

  ctx.strokeStyle = '#5c4430';
  ctx.lineWidth = 4;
  ctx.strokeRect(42, 42, 428, 556);

  ctx.fillStyle = '#2a2118';
  ctx.font = 'bold 34px "Noto Serif KR", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('돌할매 기도 순서', 256, 108);

  ctx.strokeStyle = '#7d6852';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(86, 134);
  ctx.lineTo(426, 134);
  ctx.stroke();

  const lines = [
    ['一. 합장 삼배', '경건한 마음으로 세 번 절합니다.'],
    ['二. 첫 번째 들기', '아무 생각 없이 돌의 무게를 봅니다.'],
    ['三. 신분과 소원', '주소·성명·나이와 소원을 고합니다.'],
    ['四. 두 번째 들기', '들리지 않으면 소원이 이루어집니다.'],
  ];

  ctx.textAlign = 'left';
  lines.forEach(([title, desc], idx) => {
    const y = 200 + idx * 96;
    ctx.fillStyle = '#3a2818';
    ctx.font = 'bold 24px "Noto Serif KR", Georgia, serif';
    ctx.fillText(title, 76, y);

    ctx.fillStyle = '#594b3c';
    ctx.font = '20px "Gowun Dodum", sans-serif';
    ctx.fillText(desc, 76, y + 34);
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = '#6f5d4b';
  ctx.font = '18px "Noto Serif KR", Georgia, serif';
  ctx.fillText('영천 북안면 관리 관산 자락', 256, 570);

  return configureTexture(canvas, true, anisotropy, 1, 1);
}

/**
 * Vertical white hanji paper wish tag (소원지) texture.
 */
export function createWishTagTexture(
  wishText: string,
  identityText: string,
  anisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Warm Korean hanji white paper
  ctx.fillStyle = '#f6f1e6';
  ctx.fillRect(0, 0, 192, 512);

  // Subtle fiber flecks
  const rand = seededRand(wishText.length * 97 + 13);
  for (let i = 0; i < 180; i++) {
    ctx.fillStyle = 'rgba(180, 165, 140, 0.16)';
    ctx.fillRect(rand() * 192, rand() * 512, 3 + rand() * 8, 1);
  }

  // Red traditional border
  ctx.strokeStyle = '#9c3e32';
  ctx.lineWidth = 4;
  ctx.strokeRect(14, 18, 164, 476);

  // Top knot hole ring
  ctx.fillStyle = '#8b2f24';
  ctx.beginPath();
  ctx.arc(96, 38, 6, 0, Math.PI * 2);
  ctx.fill();

  // Header
  ctx.fillStyle = '#8b2f24';
  ctx.font = 'bold 20px "Noto Serif KR", serif';
  ctx.textAlign = 'center';
  ctx.fillText('소 원 성 취', 96, 80);

  // Vertical-feel wrapped wish text
  ctx.fillStyle = '#25221e';
  ctx.font = '20px "Gowun Dodum", sans-serif';
  const chars = Array.from(wishText.trim().slice(0, 28));
  const lines: string[] = [];
  for (let i = 0; i < chars.length; i += 6) {
    lines.push(chars.slice(i, i + 6).join(''));
  }
  lines.slice(0, 5).forEach((line, idx) => {
    ctx.fillText(line, 96, 150 + idx * 42);
  });

  // Identity footer
  ctx.fillStyle = '#5c5348';
  ctx.font = '16px "Noto Serif KR", serif';
  ctx.fillText(identityText.slice(0, 12), 96, 456);

  return configureTexture(canvas, true, anisotropy, 1, 1);
}

/**
 * Soft radial glow sprite texture for lanterns, golden embers, and spirit wisps.
 */
export function createRadialGlowTexture(innerHex = '#ffe2a6', outerHex = 'rgba(255,190,90,0)'): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.28, innerHex);
  grad.addColorStop(1, outerHex);

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Soft radial contact shadow texture for grounding rocks, pedestal, and props.
 */
export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(12, 10, 8, 0.72)');
  grad.addColorStop(0.6, 'rgba(12, 10, 8, 0.25)');
  grad.addColorStop(1, 'rgba(12, 10, 8, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
