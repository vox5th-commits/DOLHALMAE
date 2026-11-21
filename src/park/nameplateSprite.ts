import * as THREE from 'three';
import type { PlayerEmoteKind } from '../multiplayer/realtimeSync';

export interface MascotOverheadRig {
  setIdentity: (nickname: string, praying: boolean) => void;
  triggerEmote: (emote: PlayerEmoteKind) => void;
  update: (nowMs: number, elapsedSec: number) => boolean;
  dispose: () => void;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function createMascotOverheadRig(
  parentRoot: THREE.Group,
  initialNickname: string,
  maxAnisotropy = 4,
): MascotOverheadRig {
  // 1. High-DPI Nameplate + optional Praying Badge Sprite
  const nameCanvas = document.createElement('canvas');
  nameCanvas.width = 512;
  nameCanvas.height = 176;
  const nameCtx = nameCanvas.getContext('2d');

  const nameTexture = new THREE.CanvasTexture(nameCanvas);
  nameTexture.colorSpace = THREE.SRGBColorSpace;
  nameTexture.anisotropy = maxAnisotropy;
  nameTexture.minFilter = THREE.LinearFilter;
  nameTexture.magFilter = THREE.LinearFilter;

  const nameMaterial = new THREE.SpriteMaterial({
    map: nameTexture,
    transparent: true,
    depthWrite: false,
    depthTest: true,
  });
  const nameSprite = new THREE.Sprite(nameMaterial);
  nameSprite.position.set(0, 1.72, 0);
  nameSprite.scale.set(1.68, 0.58, 1);
  nameSprite.renderOrder = 10;
  parentRoot.add(nameSprite);

  let currentNickname = '';
  let currentPraying = false;

  const renderNameplate = (nickname: string, praying: boolean) => {
    if (!nameCtx) return;
    if (nickname === currentNickname && praying === currentPraying) return;
    currentNickname = nickname;
    currentPraying = praying;

    const W = nameCanvas.width;
    const H = nameCanvas.height;
    nameCtx.clearRect(0, 0, W, H);

    // Optional golden "🙏 소원 비는 중" badge above nameplate
    if (praying) {
      nameCtx.font = '600 24px "Gowun Dodum", "Noto Sans KR", sans-serif';
      const badgeText = '🙏 소원 비는 중';
      const badgeMetrics = nameCtx.measureText(badgeText);
      const bw = Math.min(W - 24, Math.max(180, badgeMetrics.width + 44));
      const bh = 44;
      const bx = (W - bw) / 2;
      const by = 18;

      drawRoundedRect(nameCtx, bx, by, bw, bh, 22);
      nameCtx.fillStyle = 'rgba(245, 194, 91, 0.92)';
      nameCtx.fill();
      nameCtx.lineWidth = 2;
      nameCtx.strokeStyle = 'rgba(255, 244, 214, 0.9)';
      nameCtx.stroke();

      nameCtx.fillStyle = '#1b150c';
      nameCtx.textAlign = 'center';
      nameCtx.textBaseline = 'middle';
      nameCtx.fillText(badgeText, W / 2, by + bh / 2 + 1);
    }

    // Minimalist dark translucent Korean nameplate pill
    nameCtx.font = '600 32px "Gowun Dodum", "Noto Sans KR", sans-serif';
    const displayText = nickname || '영천 산책객';
    const textW = nameCtx.measureText(displayText).width;
    const pw = Math.min(W - 20, Math.max(150, textW + 52));
    const ph = 54;
    const px = (W - pw) / 2;
    const py = H - ph - 14;

    drawRoundedRect(nameCtx, px, py, pw, ph, 27);
    nameCtx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    nameCtx.fill();
    nameCtx.lineWidth = 2.5;
    nameCtx.strokeStyle = praying
      ? 'rgba(246, 206, 118, 0.75)'
      : 'rgba(255, 255, 255, 0.28)';
    nameCtx.stroke();

    nameCtx.fillStyle = '#f8fafc';
    nameCtx.textAlign = 'center';
    nameCtx.textBaseline = 'middle';
    nameCtx.fillText(displayText, W / 2, py + ph / 2 + 1);

    nameTexture.needsUpdate = true;
  };

  renderNameplate(initialNickname, false);

  // 2. Gentle Golden Ground Glow Ring for Praying State
  const auraGeo = new THREE.RingGeometry(0.42, 0.68, 28);
  auraGeo.rotateX(-Math.PI / 2);
  const auraMat = new THREE.MeshBasicMaterial({
    color: 0xf7ca62,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const auraMesh = new THREE.Mesh(auraGeo, auraMat);
  auraMesh.position.set(0, 0.025, 0);
  auraMesh.visible = false;
  parentRoot.add(auraMesh);

  // 3. 3-Second Floating Non-Verbal Emote Bubble Sprite
  const emoteCanvas = document.createElement('canvas');
  emoteCanvas.width = 288;
  emoteCanvas.height = 128;
  const emoteCtx = emoteCanvas.getContext('2d');

  const emoteTexture = new THREE.CanvasTexture(emoteCanvas);
  emoteTexture.colorSpace = THREE.SRGBColorSpace;
  emoteTexture.anisotropy = maxAnisotropy;
  emoteTexture.minFilter = THREE.LinearFilter;
  emoteTexture.magFilter = THREE.LinearFilter;

  const emoteMaterial = new THREE.SpriteMaterial({
    map: emoteTexture,
    transparent: true,
    depthWrite: false,
    depthTest: true,
  });
  const emoteSprite = new THREE.Sprite(emoteMaterial);
  emoteSprite.position.set(0, 2.22, 0);
  emoteSprite.scale.set(1.12, 0.5, 1);
  emoteSprite.visible = false;
  emoteSprite.renderOrder = 12;
  parentRoot.add(emoteSprite);

  let emoteStartMs = 0;
  let emoteExpiresMs = 0;
  const EMOTE_DURATION_MS = 3000;

  const triggerEmote = (emote: PlayerEmoteKind) => {
    if (!emoteCtx) return;
    const W = emoteCanvas.width;
    const H = emoteCanvas.height;
    emoteCtx.clearRect(0, 0, W, H);

    // Rounded speech-bubble pill
    drawRoundedRect(emoteCtx, 16, 10, W - 32, H - 36, 42);
    emoteCtx.fillStyle = 'rgba(254, 243, 199, 0.96)';
    emoteCtx.fill();
    emoteCtx.lineWidth = 4;
    emoteCtx.strokeStyle = 'rgba(217, 119, 6, 0.9)';
    emoteCtx.stroke();

    // Downward pointer triangle
    emoteCtx.beginPath();
    emoteCtx.moveTo(W / 2 - 14, H - 28);
    emoteCtx.lineTo(W / 2 + 14, H - 28);
    emoteCtx.lineTo(W / 2, H - 6);
    emoteCtx.closePath();
    emoteCtx.fillStyle = 'rgba(254, 243, 199, 0.96)';
    emoteCtx.fill();

    // Crisp vector accent badge + Korean label (guaranteed visible even without OS color emoji font)
    emoteCtx.fillStyle = '#1e293b';
    emoteCtx.font = '700 34px "Gowun Dodum", "Noto Sans KR", sans-serif';
    emoteCtx.textAlign = 'center';
    emoteCtx.textBaseline = 'middle';
    const label = emote === 'pray' ? '🙏 합장' : '👋 인사';
    emoteCtx.fillText(label, W / 2, (H - 18) / 2);

    emoteTexture.needsUpdate = true;
    const now = performance.now();
    emoteStartMs = now;
    emoteExpiresMs = now + EMOTE_DURATION_MS;
    emoteMaterial.opacity = 1;
    emoteSprite.visible = true;
  };

  const update = (nowMs: number, elapsedSec: number): boolean => {
    let animating = false;

    if (currentPraying) {
      auraMesh.visible = true;
      const pulse = 0.5 + 0.5 * Math.sin(elapsedSec * 3.1);
      auraMat.opacity = 0.28 + pulse * 0.26;
      const s = 0.96 + pulse * 0.12;
      auraMesh.scale.set(s, 1, s);
      animating = true;
    } else {
      auraMesh.visible = false;
    }

    if (emoteSprite.visible) {
      if (nowMs >= emoteExpiresMs) {
        emoteSprite.visible = false;
      } else {
        const ageMs = nowMs - emoteStartMs;
        const remainingMs = emoteExpiresMs - nowMs;
        const bob = Math.sin((ageMs / 1000) * 5.2) * 0.06;
        emoteSprite.position.y = (currentPraying ? 2.34 : 2.18) + bob;
        emoteMaterial.opacity = remainingMs < 450 ? Math.max(0, remainingMs / 450) : 1;
        animating = true;
      }
    }

    return animating;
  };

  const dispose = () => {
    parentRoot.remove(nameSprite);
    parentRoot.remove(auraMesh);
    parentRoot.remove(emoteSprite);
    nameTexture.dispose();
    nameMaterial.dispose();
    auraGeo.dispose();
    auraMat.dispose();
    emoteTexture.dispose();
    emoteMaterial.dispose();
  };

  return {
    setIdentity: (nickname: string, praying: boolean) => {
      renderNameplate(nickname, praying);
      auraMesh.visible = praying;
    },
    triggerEmote,
    update,
    dispose,
  };
}
