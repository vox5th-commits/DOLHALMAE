import * as THREE from 'three';
import { createZodiacPlaqueTexture } from '../scene/proceduralTextures';
import { PARK_GROUND_Y } from './parkLayout';
import { ZODIAC_STATUES, type ZodiacId, type ZodiacStatueInfo } from './zodiacData';

export interface ZodiacStatueRig {
  group: THREE.Group;
  raycastMeshes: THREE.Mesh[];
  dispose: () => void;
}

/**
 * Builds distinct sculpted light-gray granite composite figures on top of each pedestal
 * so all 12 Chinese Zodiac signs read immediately as unique traditional Korean stone carvings.
 */
function populateZodiacSculpture(
  headGroup: THREE.Group,
  id: ZodiacId,
  graniteMat: THREE.Material,
  track: <T extends { dispose: () => void }>(item: T) => T,
  castShadowFlag: boolean,
): void {
  const addMesh = (
    geo: THREE.BufferGeometry,
    x: number,
    y: number,
    z: number,
    rx = 0,
    ry = 0,
    rz = 0,
    sx = 1,
    sy = 1,
    sz = 1,
  ) => {
    const m = new THREE.Mesh(track(geo), graniteMat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.scale.set(sx, sy, sz);
    m.castShadow = castShadowFlag;
    m.receiveShadow = true;
    headGroup.add(m);
    return m;
  };

  // Shared serene seated body torso + granite lotus/robe base
  addMesh(new THREE.CylinderGeometry(0.18, 0.24, 0.42, 12), 0, 0.21, 0);
  // Folded serene arms across front belly
  addMesh(new THREE.CylinderGeometry(0.06, 0.06, 0.28, 8), 0, 0.24, 0.14, 0, 0, Math.PI / 2);

  // Base rounded animal head
  const head = addMesh(new THREE.SphereGeometry(0.155, 14, 12), 0, 0.52, 0.02);

  switch (id) {
    case 'rat': {
      // Large round ears + pointed snout
      addMesh(new THREE.SphereGeometry(0.075, 10, 8), -0.11, 0.65, 0.0, 0, 0, 0, 1, 1, 0.45);
      addMesh(new THREE.SphereGeometry(0.075, 10, 8), 0.11, 0.65, 0.0, 0, 0, 0, 1, 1, 0.45);
      addMesh(new THREE.ConeGeometry(0.07, 0.16, 10), 0, 0.49, 0.18, Math.PI / 2, 0, 0);
      break;
    }
    case 'ox': {
      // Broad muzzle + curved sweeping horns
      head.scale.set(1.12, 0.96, 1.15);
      addMesh(new THREE.BoxGeometry(0.18, 0.11, 0.14), 0, 0.47, 0.16);
      addMesh(new THREE.ConeGeometry(0.036, 0.2, 8), -0.16, 0.65, 0.02, 0, 0, 0.65);
      addMesh(new THREE.ConeGeometry(0.036, 0.2, 8), 0.16, 0.65, 0.02, 0, 0, -0.65);
      break;
    }
    case 'tiger': {
      // Rounded cat ears + strong square snout + mane ruff
      addMesh(new THREE.SphereGeometry(0.055, 8, 8), -0.11, 0.64, 0.01);
      addMesh(new THREE.SphereGeometry(0.055, 8, 8), 0.11, 0.64, 0.01);
      addMesh(new THREE.BoxGeometry(0.15, 0.11, 0.12), 0, 0.48, 0.15);
      addMesh(new THREE.TorusGeometry(0.16, 0.04, 8, 16), 0, 0.51, -0.02);
      break;
    }
    case 'rabbit': {
      // Tall upright rabbit ears + fluffy tail
      addMesh(new THREE.CapsuleGeometry(0.04, 0.22, 5, 8), -0.065, 0.77, -0.01, -0.1, 0, 0.12);
      addMesh(new THREE.CapsuleGeometry(0.04, 0.22, 5, 8), 0.065, 0.77, -0.01, -0.1, 0, -0.12);
      addMesh(new THREE.SphereGeometry(0.05, 8, 8), 0, 0.49, 0.16);
      break;
    }
    case 'dragon': {
      // Swept antler horns + elongated snout + dorsal crest
      head.scale.set(0.95, 1.0, 1.3);
      addMesh(new THREE.ConeGeometry(0.03, 0.24, 8), -0.09, 0.72, -0.04, -0.35, 0, 0.3);
      addMesh(new THREE.ConeGeometry(0.03, 0.24, 8), 0.09, 0.72, -0.04, -0.35, 0, -0.3);
      addMesh(new THREE.BoxGeometry(0.13, 0.1, 0.2), 0, 0.49, 0.17);
      addMesh(new THREE.ConeGeometry(0.05, 0.16, 6), 0, 0.68, -0.05, -0.4, 0, 0);
      break;
    }
    case 'snake': {
      // Sleek hooded cobra crest + raised coiled neck
      head.scale.set(0.92, 0.82, 1.25);
      addMesh(new THREE.CylinderGeometry(0.19, 0.12, 0.26, 10), 0, 0.52, -0.04, 0, 0, 0, 1.1, 1, 0.35);
      addMesh(new THREE.SphereGeometry(0.08, 8, 8), 0, 0.5, 0.14);
      break;
    }
    case 'horse': {
      // Long noble equine muzzle + upright ears + vertical mane ridge
      head.scale.set(0.88, 1.05, 1.35);
      addMesh(new THREE.BoxGeometry(0.12, 0.11, 0.22), 0, 0.48, 0.19, 0.22, 0, 0);
      addMesh(new THREE.ConeGeometry(0.038, 0.13, 8), -0.075, 0.68, 0.0);
      addMesh(new THREE.ConeGeometry(0.038, 0.13, 8), 0.075, 0.68, 0.0);
      addMesh(new THREE.BoxGeometry(0.05, 0.24, 0.1), 0, 0.58, -0.12);
      break;
    }
    case 'sheep': {
      // Curled ram horns framing head + fluffy fleece crown
      addMesh(new THREE.TorusGeometry(0.085, 0.032, 8, 14, Math.PI * 1.4), -0.13, 0.55, 0.0, 0, Math.PI / 2, 0.3);
      addMesh(new THREE.TorusGeometry(0.085, 0.032, 8, 14, Math.PI * 1.4), 0.13, 0.55, 0.0, 0, -Math.PI / 2, -0.3);
      addMesh(new THREE.SphereGeometry(0.11, 10, 8), 0, 0.62, 0.02, 0, 0, 0, 1.1, 0.7, 1.0);
      break;
    }
    case 'monkey': {
      // Prominent side ears + brow crest + cheerful round face
      addMesh(new THREE.SphereGeometry(0.07, 8, 8), -0.17, 0.53, 0.0, 0, 0, 0, 0.85, 1, 0.45);
      addMesh(new THREE.SphereGeometry(0.07, 8, 8), 0.17, 0.53, 0.0, 0, 0, 0, 0.85, 1, 0.45);
      addMesh(new THREE.SphereGeometry(0.1, 10, 8), 0, 0.47, 0.12, 0, 0, 0, 1.0, 0.8, 0.8);
      break;
    }
    case 'rooster': {
      // Tall scalloped comb on crown + pointed beak + folded wings
      addMesh(new THREE.BoxGeometry(0.045, 0.16, 0.16), 0, 0.68, 0.01);
      addMesh(new THREE.ConeGeometry(0.048, 0.14, 8), 0, 0.5, 0.19, Math.PI / 2, 0, 0);
      addMesh(new THREE.SphereGeometry(0.11, 10, 8), -0.17, 0.23, 0.0, 0, 0, 0.25, 0.55, 1.2, 0.9);
      addMesh(new THREE.SphereGeometry(0.11, 10, 8), 0.17, 0.23, 0.0, 0, 0, -0.25, 0.55, 1.2, 0.9);
      break;
    }
    case 'dog': {
      // Floppy pendant ears + loyal rounded muzzle
      addMesh(new THREE.CapsuleGeometry(0.045, 0.13, 4, 8), -0.14, 0.52, 0.02, 0, 0, 0.25);
      addMesh(new THREE.CapsuleGeometry(0.045, 0.13, 4, 8), 0.14, 0.52, 0.02, 0, 0, -0.25);
      addMesh(new THREE.BoxGeometry(0.14, 0.1, 0.15), 0, 0.48, 0.16);
      break;
    }
    case 'pig': {
      // Wide flat disc snout + triangular forward ears
      head.scale.set(1.12, 1.0, 1.04);
      addMesh(new THREE.CylinderGeometry(0.075, 0.08, 0.09, 12), 0, 0.48, 0.18, Math.PI / 2, 0, 0);
      addMesh(new THREE.ConeGeometry(0.06, 0.12, 6), -0.11, 0.64, 0.04, 0.45, 0, 0.35);
      addMesh(new THREE.ConeGeometry(0.06, 0.12, 6), 0.11, 0.64, 0.04, 0.45, 0, -0.35);
      break;
    }
  }
}

export function buildZodiacStatuesGroup(
  lightGraniteMat: THREE.Material,
  pedestalMat: THREE.Material,
  contactShadowTex: THREE.Texture,
  anisotropy: number,
  castShadowFlag: boolean,
): ZodiacStatueRig {
  const group = new THREE.Group();
  const raycastMeshes: THREE.Mesh[] = [];
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const basePlinthGeo = track(new THREE.BoxGeometry(0.92, 0.14, 0.92));
  const pedBodyGeo = track(new THREE.BoxGeometry(0.74, 0.54, 0.74));
  const pedCapGeo = track(new THREE.BoxGeometry(0.84, 0.09, 0.84));
  const plaqueGeo = track(new THREE.PlaneGeometry(0.56, 0.35));
  const proxyGeo = track(new THREE.CylinderGeometry(0.58, 0.58, 1.65, 10));
  const proxyMat = track(new THREE.MeshBasicMaterial({ visible: false }));
  const shadowGeo = track(new THREE.PlaneGeometry(1.35, 1.35));
  const shadowMat = track(
    new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
    }),
  );

  ZODIAC_STATUES.forEach((info: ZodiacStatueInfo) => {
    const statueGroup = new THREE.Group();
    statueGroup.position.set(info.position[0], PARK_GROUND_Y, info.position[1]);
    statueGroup.rotation.y = info.yaw;

    // Contact shadow
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.015;
    statueGroup.add(shadow);

    // Square granite pedestal
    const plinth = new THREE.Mesh(basePlinthGeo, pedestalMat);
    plinth.position.y = 0.07;
    plinth.castShadow = castShadowFlag;
    plinth.receiveShadow = true;
    statueGroup.add(plinth);

    const pedBody = new THREE.Mesh(pedBodyGeo, pedestalMat);
    pedBody.position.y = 0.41;
    pedBody.castShadow = castShadowFlag;
    pedBody.receiveShadow = true;
    statueGroup.add(pedBody);

    const pedCap = new THREE.Mesh(pedCapGeo, lightGraniteMat);
    pedCap.position.y = 0.725;
    pedCap.castShadow = castShadowFlag;
    pedCap.receiveShadow = true;
    statueGroup.add(pedCap);

    // Engraved Zodiac plaque on front face (+Z in local frame)
    const plaqueTex = track(
      createZodiacPlaqueTexture(info.koreanName, info.branch, info.hanja, anisotropy),
    );
    const plaqueMat = track(
      new THREE.MeshStandardMaterial({
        map: plaqueTex,
        roughness: 0.55,
        metalness: 0.06,
      }),
    );
    const plaque = new THREE.Mesh(plaqueGeo, plaqueMat);
    plaque.position.set(0, 0.42, 0.376);
    statueGroup.add(plaque);

    // Granite Zodiac Animal Statue mounted atop pedestal (y = 0.77)
    const figureGroup = new THREE.Group();
    figureGroup.position.y = 0.77;
    populateZodiacSculpture(figureGroup, info.id, lightGraniteMat, track, castShadowFlag);
    statueGroup.add(figureGroup);

    // Invisible layer-2 raycast hit proxy for direct click interaction
    const hitProxy = new THREE.Mesh(proxyGeo, proxyMat);
    hitProxy.position.y = 0.85;
    hitProxy.layers.set(2);
    hitProxy.userData.zodiacId = info.id;
    statueGroup.add(hitProxy);
    raycastMeshes.push(hitProxy);

    group.add(statueGroup);
  });

  return {
    group,
    raycastMeshes,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
