import * as THREE from 'three';
import { PARK_GROUND_Y } from './parkLayout';

export interface EastGardenRig {
  group: THREE.Group;
  lanternGlowMaterial: THREE.MeshStandardMaterial;
  dispose: () => void;
}

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

/**
 * Builds the expanded East Wing of Dolhalmae Park:
 * - Yeongcheon Grapevine Pergola & Wine Oak Barrels (영천 포도 쉼터 & 와인 오크통)
 * - Traditional Octagonal Wooden Jeongja Pavilion (전통 육각 정자)
 * - Tranquil Lotus Pond with Granite Rim Boulders & Lily Pads (연꽃 연못)
 * - Traditional Granite Stone Lanterns (석등)
 */
export function buildEastGarden(
  lightGraniteMat: THREE.Material,
  darkGraniteMat: THREE.Material,
  trunkMat: THREE.Material,
  leafMat: THREE.Material,
  castShadowFlag: boolean,
): EastGardenRig {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const timberMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x6f4b32,
      roughness: 0.78,
      metalness: 0.04,
    }),
  );
  const oakBarrelMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x8a5b39,
      roughness: 0.68,
      metalness: 0.06,
    }),
  );
  const ironHoopMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x24272d,
      roughness: 0.42,
      metalness: 0.72,
    }),
  );
  const grapeMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x5c2d7c,
      roughness: 0.3,
      metalness: 0.08,
    }),
  );
  const roofTileMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x353b44,
      roughness: 0.72,
      metalness: 0.1,
    }),
  );
  const pondWaterMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x2d6b72,
      roughness: 0.14,
      metalness: 0.28,
    }),
  );
  const lotusPadMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x417a3c,
      roughness: 0.65,
      metalness: 0.02,
    }),
  );
  const lotusFlowerMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xf7a8c4,
      emissive: 0x451728,
      emissiveIntensity: 0.25,
      roughness: 0.52,
      metalness: 0.02,
    }),
  );
  const lanternGlowMaterial = track(
    new THREE.MeshStandardMaterial({
      color: 0xffeec2,
      emissive: new THREE.Color(0xffb852),
      emissiveIntensity: 0.75,
      roughness: 0.25,
      metalness: 0.04,
    }),
  );

  // =========================================================================
  // 1. YEONGCHEON GRAPEVINE PERGOLA & WINE OAK BARRELS (center: 24.8, 24.2)
  // =========================================================================
  const pergolaGroup = new THREE.Group();
  pergolaGroup.position.set(24.8, PARK_GROUND_Y, 24.2);
  group.add(pergolaGroup);

  // Ground stone paving slab under pergola
  const pergolaPad = new THREE.Mesh(
    track(new THREE.BoxGeometry(9.6, 0.05, 7.2)),
    lightGraniteMat,
  );
  pergolaPad.position.y = 0.025;
  pergolaPad.receiveShadow = true;
  pergolaGroup.add(pergolaPad);

  // 4 Wooden Corner Posts + Stone Plinths
  const postGeo = track(new THREE.BoxGeometry(0.24, 3.05, 0.24));
  const plinthGeo = track(new THREE.BoxGeometry(0.42, 0.24, 0.42));
  const postCoords: Array<[number, number]> = [
    [-4.2, -3.0],
    [4.2, -3.0],
    [-4.2, 3.0],
    [4.2, 3.0],
  ];
  postCoords.forEach(([px, pz]) => {
    const plinth = new THREE.Mesh(plinthGeo, darkGraniteMat);
    plinth.position.set(px, 0.14, pz);
    pergolaGroup.add(plinth);

    const post = new THREE.Mesh(postGeo, timberMat);
    post.position.set(px, 1.65, pz);
    post.castShadow = castShadowFlag;
    pergolaGroup.add(post);
  });

  // Main longitudinal beams
  const beamXGeo = track(new THREE.BoxGeometry(9.2, 0.22, 0.2));
  [-3.0, 3.0].forEach((bz) => {
    const beam = new THREE.Mesh(beamXGeo, timberMat);
    beam.position.set(0, 3.12, bz);
    beam.castShadow = castShadowFlag;
    pergolaGroup.add(beam);
  });

  // Overhead pergola cross-slats (InstancedMesh: 1 draw call)
  const slatGeo = track(new THREE.BoxGeometry(0.14, 0.14, 6.7));
  const slatCount = 11;
  const slatInst = new THREE.InstancedMesh(slatGeo, timberMat, slatCount);
  for (let i = 0; i < slatCount; i++) {
    const sx = -4.0 + i * 0.8;
    _dummy.position.set(sx, 3.28, 0);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.setScalar(1);
    _dummy.updateMatrix();
    slatInst.setMatrixAt(i, _dummy.matrix);
  }
  slatInst.instanceMatrix.needsUpdate = true;
  slatInst.computeBoundingSphere();
  pergolaGroup.add(slatInst);

  // Leafy grapevine clusters across top lattice (InstancedMesh: 1 draw call)
  const vineLeafGeo = track(new THREE.DodecahedronGeometry(0.55, 0));
  const vineCount = 26;
  const vineInst = new THREE.InstancedMesh(vineLeafGeo, leafMat, vineCount);
  for (let i = 0; i < vineCount; i++) {
    const vx = -3.8 + ((i * 1.93) % 7.6);
    const vz = -2.6 + ((i * 2.37) % 5.2);
    _dummy.position.set(vx, 3.42 + (i % 2) * 0.12, vz);
    _dummy.rotation.set(0, i * 0.9, 0);
    _dummy.scale.set(1.25 + (i % 3) * 0.15, 0.42, 1.15);
    _dummy.updateMatrix();
    vineInst.setMatrixAt(i, _dummy.matrix);
    _color.setHSL(0.28 + (i % 3) * 0.02, 0.42, 0.34 + (i % 2) * 0.05);
    vineInst.setColorAt(i, _color);
  }
  vineInst.instanceMatrix.needsUpdate = true;
  if (vineInst.instanceColor) vineInst.instanceColor.needsUpdate = true;
  vineInst.computeBoundingSphere();
  pergolaGroup.add(vineInst);

  // Hanging Purple Yeongcheon Grape Clusters (InstancedMesh: 1 draw call)
  const grapeGeo = track(new THREE.ConeGeometry(0.13, 0.34, 8));
  grapeGeo.rotateX(Math.PI); // Taper downward like a real grape bunch!
  const grapeCount = 16;
  const grapeInst = new THREE.InstancedMesh(grapeGeo, grapeMat, grapeCount);
  for (let i = 0; i < grapeCount; i++) {
    const gx = -3.4 + ((i * 2.15) % 6.8);
    const gz = -2.2 + ((i * 1.73) % 4.4);
    _dummy.position.set(gx, 2.98 - (i % 3) * 0.08, gz);
    _dummy.rotation.set(0, i * 0.6, 0);
    _dummy.scale.setScalar(0.9 + (i % 3) * 0.15);
    _dummy.updateMatrix();
    grapeInst.setMatrixAt(i, _dummy.matrix);
  }
  grapeInst.instanceMatrix.needsUpdate = true;
  grapeInst.computeBoundingSphere();
  pergolaGroup.add(grapeInst);

  // Crafted Yeongcheon Wine Oak Barrels (LatheGeometry staves + dark iron hoops)
  const barrelProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.32, 0.0),
    new THREE.Vector2(0.38, 0.25),
    new THREE.Vector2(0.42, 0.52),
    new THREE.Vector2(0.38, 0.78),
    new THREE.Vector2(0.32, 1.0),
    new THREE.Vector2(0.0, 1.0),
  ];
  const barrelGeo = track(new THREE.LatheGeometry(barrelProfile, 16));
  const hoopGeo = track(new THREE.TorusGeometry(0.39, 0.018, 6, 18));
  hoopGeo.rotateX(Math.PI / 2);

  const barrelConfigs: Array<[number, number, number]> = [
    [-2.0, 0.0, 0],
    [-2.0, 0.88, 0.3],
    [2.0, 0.0, 0],
    [2.0, -0.88, -0.25],
  ];
  barrelConfigs.forEach(([bx, bz, ry]) => {
    const barrel = new THREE.Group();
    barrel.position.set(bx, 0.05, bz);
    barrel.rotation.y = ry;

    const body = new THREE.Mesh(barrelGeo, oakBarrelMat);
    body.castShadow = castShadowFlag;
    body.receiveShadow = true;
    barrel.add(body);

    [0.18, 0.82].forEach((hy) => {
      const hoop = new THREE.Mesh(hoopGeo, ironHoopMat);
      hoop.position.y = hy;
      hoop.scale.setScalar(0.95);
      barrel.add(hoop);
    });
    const midHoop = new THREE.Mesh(hoopGeo, ironHoopMat);
    midHoop.position.y = 0.52;
    midHoop.scale.setScalar(1.06);
    barrel.add(midHoop);

    pergolaGroup.add(barrel);
  });

  // =========================================================================
  // 2. TRADITIONAL OCTAGONAL JEONGJA PAVILION (전통 육각 정자, 27.5, 15.5)
  // =========================================================================
  const jeongja = new THREE.Group();
  jeongja.position.set(27.5, PARK_GROUND_Y, 15.5);
  group.add(jeongja);

  // Raised octagonal stone deck (+0.32m, walkable/jumpable!)
  const jBase = new THREE.Mesh(
    track(new THREE.CylinderGeometry(3.0, 3.15, 0.32, 8)),
    lightGraniteMat,
  );
  jBase.position.y = 0.16;
  jBase.receiveShadow = true;
  jBase.castShadow = castShadowFlag;
  jeongja.add(jBase);

  // West entry step (+0.16m) facing Lotus Pond & park center
  const jStep = new THREE.Mesh(track(new THREE.BoxGeometry(1.3, 0.16, 2.2)), lightGraniteMat);
  jStep.position.set(-3.15, 0.08, 0);
  jStep.receiveShadow = true;
  jeongja.add(jStep);

  // 4 Sturdy Korean Pine Pillars
  const jPillarGeo = track(new THREE.CylinderGeometry(0.13, 0.15, 2.55, 10));
  [
    [-1.9, -1.9],
    [1.9, -1.9],
    [-1.9, 1.9],
    [1.9, 1.9],
  ].forEach(([px, pz]) => {
    const p = new THREE.Mesh(jPillarGeo, timberMat);
    p.position.set(px, 0.32 + 1.275, pz);
    p.castShadow = castShadowFlag;
    jeongja.add(p);
  });

  // Upper timber frieze collar + Traditional Octagonal Tiled Roof
  const jFrieze = new THREE.Mesh(
    track(new THREE.CylinderGeometry(2.75, 2.75, 0.28, 8)),
    timberMat,
  );
  jFrieze.position.y = 2.95;
  jeongja.add(jFrieze);

  const jRoofLower = new THREE.Mesh(
    track(new THREE.ConeGeometry(4.05, 1.35, 8)),
    roofTileMat,
  );
  jRoofLower.position.y = 3.68;
  jRoofLower.castShadow = castShadowFlag;
  jRoofLower.receiveShadow = true;
  jeongja.add(jRoofLower);

  const jRoofUpper = new THREE.Mesh(
    track(new THREE.ConeGeometry(2.35, 0.95, 8)),
    roofTileMat,
  );
  jRoofUpper.position.y = 4.42;
  jeongja.add(jRoofUpper);

  const jFinial = new THREE.Mesh(track(new THREE.SphereGeometry(0.18, 10, 8)), darkGraniteMat);
  jFinial.position.y = 4.95;
  jeongja.add(jFinial);

  // =========================================================================
  // 3. TRANQUIL LOTUS POND (연꽃 연못, center: 21.8, 13.8)
  // =========================================================================
  const pondGroup = new THREE.Group();
  pondGroup.position.set(21.8, PARK_GROUND_Y, 13.8);
  group.add(pondGroup);

  const pondWater = new THREE.Mesh(
    track(new THREE.CircleGeometry(2.45, 28)),
    pondWaterMat,
  );
  pondWater.rotation.x = -Math.PI / 2;
  pondWater.position.y = 0.04;
  pondWater.receiveShadow = true;
  pondGroup.add(pondWater);

  // Natural granite rim boulders encircling pond (InstancedMesh: 1 draw call)
  const rimRockGeo = track(new THREE.DodecahedronGeometry(0.42, 0));
  const rimCount = 22;
  const rimInst = new THREE.InstancedMesh(rimRockGeo, lightGraniteMat, rimCount);
  for (let i = 0; i < rimCount; i++) {
    const a = (i / rimCount) * Math.PI * 2;
    const r = 2.48 + (i % 3) * 0.08;
    _dummy.position.set(Math.cos(a) * r, 0.14 + (i % 2) * 0.05, Math.sin(a) * r);
    _dummy.rotation.set(i * 0.3, a, i * 0.2);
    _dummy.scale.set(1.15 + (i % 3) * 0.14, 0.62, 0.95);
    _dummy.updateMatrix();
    rimInst.setMatrixAt(i, _dummy.matrix);
  }
  rimInst.instanceMatrix.needsUpdate = true;
  rimInst.computeBoundingSphere();
  pondGroup.add(rimInst);

  // Floating lotus lily pads & pink lotus blossoms (2 InstancedMeshes)
  const padGeo = track(new THREE.CylinderGeometry(0.32, 0.32, 0.02, 12));
  const padCoords: Array<[number, number, number]> = [
    [-0.95, 0.45, 1.0],
    [-0.4, 0.95, 0.85],
    [0.85, 0.65, 1.1],
    [1.15, -0.55, 0.9],
    [0.25, -1.15, 1.05],
    [-1.05, -0.8, 0.95],
    [-0.1, 0.05, 0.82],
    [0.55, -0.25, 0.92],
  ];
  const padInst = new THREE.InstancedMesh(padGeo, lotusPadMat, padCoords.length);
  padCoords.forEach(([px, pz, sc], idx) => {
    _dummy.position.set(px, 0.055, pz);
    _dummy.rotation.set(0, idx * 0.7, 0);
    _dummy.scale.set(sc, 1, sc);
    _dummy.updateMatrix();
    padInst.setMatrixAt(idx, _dummy.matrix);
  });
  padInst.instanceMatrix.needsUpdate = true;
  padInst.computeBoundingSphere();
  pondGroup.add(padInst);

  const blossomGeo = track(new THREE.ConeGeometry(0.14, 0.16, 7));
  blossomGeo.rotateX(Math.PI);
  const flowerCoords: Array<[number, number]> = [
    [-0.95, 0.45],
    [0.85, 0.65],
    [0.25, -1.15],
    [-1.05, -0.8],
  ];
  const flowerInst = new THREE.InstancedMesh(blossomGeo, lotusFlowerMat, flowerCoords.length);
  flowerCoords.forEach(([fx, fz], idx) => {
    _dummy.position.set(fx, 0.14, fz);
    _dummy.rotation.set(0, idx * 1.1, 0);
    _dummy.scale.setScalar(1);
    _dummy.updateMatrix();
    flowerInst.setMatrixAt(idx, _dummy.matrix);
  });
  flowerInst.instanceMatrix.needsUpdate = true;
  flowerInst.computeBoundingSphere();
  pondGroup.add(flowerInst);

  // =========================================================================
  // 4. TRADITIONAL GRANITE GARDEN LANTERNS (석등, InstancedMesh: 3 draw calls)
  // =========================================================================
  const stoneLanternCoords: Array<[number, number]> = [
    [16.2, 21.8],
    [16.2, 16.2],
    [24.4, 18.8],
    [29.8, 20.4],
    [-14.2, 15.8],
    [-14.2, 22.2],
  ];
  const slPillarGeo = track(new THREE.CylinderGeometry(0.14, 0.22, 1.05, 6));
  const slCapGeo = track(new THREE.ConeGeometry(0.42, 0.34, 6));
  const slCoreGeo = track(new THREE.BoxGeometry(0.24, 0.28, 0.24));

  const slPillarInst = new THREE.InstancedMesh(slPillarGeo, lightGraniteMat, stoneLanternCoords.length);
  const slCapInst = new THREE.InstancedMesh(slCapGeo, lightGraniteMat, stoneLanternCoords.length);
  const slCoreInst = new THREE.InstancedMesh(slCoreGeo, lanternGlowMaterial, stoneLanternCoords.length);

  stoneLanternCoords.forEach(([lx, lz], idx) => {
    _dummy.position.set(lx, PARK_GROUND_Y + 0.525, lz);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.setScalar(1);
    _dummy.updateMatrix();
    slPillarInst.setMatrixAt(idx, _dummy.matrix);

    _dummy.position.set(lx, PARK_GROUND_Y + 1.18, lz);
    _dummy.updateMatrix();
    slCoreInst.setMatrixAt(idx, _dummy.matrix);

    _dummy.position.set(lx, PARK_GROUND_Y + 1.48, lz);
    _dummy.updateMatrix();
    slCapInst.setMatrixAt(idx, _dummy.matrix);
  });
  slPillarInst.instanceMatrix.needsUpdate = true;
  slCapInst.instanceMatrix.needsUpdate = true;
  slCoreInst.instanceMatrix.needsUpdate = true;
  slPillarInst.computeBoundingSphere();
  slCapInst.computeBoundingSphere();
  slCoreInst.computeBoundingSphere();
  group.add(slPillarInst, slCapInst, slCoreInst);

  // Suppress unused warning while keeping signature clean
  void trunkMat;

  return {
    group,
    lanternGlowMaterial,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
