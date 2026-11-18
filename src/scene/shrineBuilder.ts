import * as THREE from 'three';
import {
  createAgedWoodTextures,
  createContactShadowTexture,
  createDarkGraniteTextures,
  createDonationBoxSignTexture,
  createLightGraniteTextures,
  createMossyBedrockTextures,
  createRadialGlowTexture,
  createRitualGuideBoardTexture,
  createRoofTileTextures,
  createWishTagTexture,
} from './proceduralTextures';
import type { SavedWishTag } from '../ritual/ritualLogic';

export interface SwayingLanternRef {
  pivot: THREE.Group;
  phase: number;
  baseEmissive: THREE.Color;
  bodyMaterial: THREE.MeshStandardMaterial;
  tagPivot: THREE.Group;
  tagMesh: THREE.Mesh;
}

export interface SpiritWispRef {
  sprite: THREE.Sprite;
  basePos: THREE.Vector3;
  phase: number;
}

export interface ShrineSceneRig {
  root: THREE.Group;
  dolhalmaeGroup: THREE.Group;
  dolhalmaeRestY: number;
  dolhalmaeRaycastMesh: THREE.Mesh;
  dolhalmaeAuraMaterial: THREE.MeshBasicMaterial;
  dolhalmaePointLight: THREE.PointLight;
  lanterns: SwayingLanternRef[];
  lanternLights: THREE.PointLight[];
  spiritWisps: SpiritWispRef[];
  motePoints: THREE.Points;
  moteBasePositions: Float32Array;
  emberPoints: THREE.Points;
  emberMaterial: THREE.PointsMaterial;
  emberVelocities: Float32Array;
  emberPositions: Float32Array;
  addUserWishTag: (tag: SavedWishTag) => void;
  dispose: () => void;
}

function displaceRockGeometry(
  geometry: THREE.BufferGeometry,
  seed: number,
  amp = 0.14,
): THREE.BufferGeometry {
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n =
      Math.sin(x * 3.7 + seed) * Math.cos(y * 4.3 - seed * 0.5) * 0.55 +
      Math.sin(z * 5.1 + seed * 1.3) * 0.45;
    const scale = 1 + n * amp;
    pos.setXYZ(i, x * scale, y * scale, z * scale);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

export function buildShrineScene(
  anisotropy: number,
  initialWishTags: SavedWishTag[],
  isSoftwareGl: boolean,
): ShrineSceneRig {
  const root = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  // Shared Procedural Textures
  const darkGraniteTex = createDarkGraniteTextures(anisotropy);
  const lightGraniteTex = createLightGraniteTextures(anisotropy, 2, 2);
  const floorGraniteTex = createLightGraniteTextures(anisotropy, 5, 5);
  const mossyRockTex = createMossyBedrockTextures(anisotropy);
  const roofTileTex = createRoofTileTextures(anisotropy);
  const woodTex = createAgedWoodTextures(anisotropy);
  const donationSignTex = createDonationBoxSignTexture(anisotropy);
  const guideBoardTex = createRitualGuideBoardTexture(anisotropy);
  const glowTex = createRadialGlowTexture('#ffe4a3', 'rgba(255, 195, 95, 0)');
  const wispTex = createRadialGlowTexture('#fff0c8', 'rgba(255, 220, 145, 0)');
  const contactShadowTex = createContactShadowTexture();

  [
    darkGraniteTex.map,
    darkGraniteTex.bumpMap,
    lightGraniteTex.map,
    lightGraniteTex.bumpMap,
    floorGraniteTex.map,
    floorGraniteTex.bumpMap,
    mossyRockTex.map,
    mossyRockTex.bumpMap,
    roofTileTex.map,
    roofTileTex.bumpMap,
    woodTex.map,
    woodTex.bumpMap,
    donationSignTex,
    guideBoardTex,
    glowTex,
    wispTex,
    contactShadowTex,
  ].forEach(track);

  // Shared PBR Materials
  const dolhalmaeMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: darkGraniteTex.map,
      bumpMap: darkGraniteTex.bumpMap,
      bumpScale: 0.008,
      roughness: 0.44, // Smooth from centuries of reverent hands
      metalness: 0.05,
    }),
  );

  const pedestalGraniteMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xf4f2ed,
      map: lightGraniteTex.map,
      bumpMap: lightGraniteTex.bumpMap,
      bumpScale: 0.015,
      roughness: 0.84,
      metalness: 0.02,
    }),
  );

  const whiteBalustradeMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: lightGraniteTex.map,
      bumpMap: lightGraniteTex.bumpMap,
      bumpScale: 0.012,
      roughness: 0.78,
      metalness: 0.02,
    }),
  );

  const floorGraniteMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xe6e3dc,
      map: floorGraniteTex.map,
      bumpMap: floorGraniteTex.bumpMap,
      bumpScale: 0.016,
      roughness: 0.88,
      metalness: 0.02,
    }),
  );

  const bedrockMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: mossyRockTex.map,
      bumpMap: mossyRockTex.bumpMap,
      bumpScale: 0.045,
      roughness: 0.92,
      metalness: 0.02,
    }),
  );

  const mossMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x3b6131,
      roughness: 0.96,
      metalness: 0.0,
    }),
  );

  const woodMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: woodTex.map,
      bumpMap: woodTex.bumpMap,
      bumpScale: 0.012,
      roughness: 0.78,
      metalness: 0.04,
    }),
  );

  const darkWoodMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x4b3322,
      map: woodTex.map,
      bumpMap: woodTex.bumpMap,
      bumpScale: 0.01,
      roughness: 0.72,
      metalness: 0.05,
    }),
  );

  const roofTileMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: roofTileTex.map,
      bumpMap: roofTileTex.bumpMap,
      bumpScale: 0.028,
      roughness: 0.74,
      metalness: 0.08,
    }),
  );

  const brassMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xc29b52,
      roughness: 0.34,
      metalness: 0.78,
    }),
  );

  const contactShadowMat = track(
    new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
    }),
  );

  const castShadowFlag = !isSoftwareGl;

  // =========================================================================
  // 1. SURROUNDING MT. GWANSAN TERRAIN & PAVILION STONE TERRACE
  // =========================================================================
  const groundGeo = track(new THREE.PlaneGeometry(110, 110, 24, 24));
  groundGeo.rotateX(-Math.PI / 2);
  const gPos = groundGeo.attributes.position;
  for (let i = 0; i < gPos.count; i++) {
    const x = gPos.getX(i);
    const z = gPos.getZ(i);
    const dist = Math.hypot(x, z);
    let y = -0.45;
    if (dist > 5.5) {
      // Gentle mountain valley rise around the back and sides, lower foreground path
      const backSlope = z < -2 ? Math.pow((-z - 2) * 0.22, 1.35) * 0.7 : 0;
      const sideRoll = Math.sin(x * 0.14) * Math.cos(z * 0.11) * 0.9 + (dist - 5.5) * 0.09;
      y = -0.45 + backSlope + Math.max(0, sideRoll * 0.55);
      // Keep front approach trail level
      if (z > 2 && Math.abs(x) < 2.2) {
        y = -0.45 - Math.min(0.35, (z - 2) * 0.02);
      }
    }
    gPos.setY(i, y);
  }
  groundGeo.computeVertexNormals();

  const groundMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x4a4d3b,
      roughness: 0.96,
      metalness: 0.0,
    }),
  );
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.receiveShadow = true;
  root.add(groundMesh);

  // Pavilion stone terrace base
  const terraceBaseGeo = track(new THREE.BoxGeometry(6.3, 0.45, 5.5));
  const terraceBase = new THREE.Mesh(terraceBaseGeo, floorGraniteMat);
  terraceBase.position.set(0, -0.225, 0);
  terraceBase.receiveShadow = true;
  terraceBase.castShadow = castShadowFlag;
  root.add(terraceBase);

  // Upper paved granite flagstone slab (offset +0.02 to avoid z-fighting)
  const terraceTopGeo = track(new THREE.BoxGeometry(6.1, 0.05, 5.3));
  const terraceTop = new THREE.Mesh(terraceTopGeo, floorGraniteMat);
  terraceTop.position.set(0, 0.015, 0);
  terraceTop.receiveShadow = true;
  root.add(terraceTop);

  // Front stone entry steps (3 wide granite steps)
  for (let s = 0; s < 3; s++) {
    const stepGeo = track(new THREE.BoxGeometry(2.1 + s * 0.16, 0.14, 0.36));
    const stepMesh = new THREE.Mesh(stepGeo, pedestalGraniteMat);
    stepMesh.position.set(0, -0.06 - s * 0.14, 2.86 + s * 0.34);
    stepMesh.receiveShadow = true;
    stepMesh.castShadow = castShadowFlag;
    root.add(stepMesh);
  }

  // =========================================================================
  // 2. SQUARE GRANITE PEDESTAL (사각형 돌 좌대) WITH CIRCULAR BOWL RECESS
  // =========================================================================
  const pedestalGroup = new THREE.Group();
  pedestalGroup.position.set(0, 0.04, 0);
  root.add(pedestalGroup);

  // Contact shadow under pedestal
  const pedShadow = new THREE.Mesh(track(new THREE.PlaneGeometry(1.45, 1.45)), contactShadowMat);
  pedShadow.rotation.x = -Math.PI / 2;
  pedShadow.position.y = 0.005;
  pedestalGroup.add(pedShadow);

  // Part 1: Broad base plinth
  const basePlinth = new THREE.Mesh(
    track(new THREE.BoxGeometry(1.02, 0.14, 1.02)),
    pedestalGraniteMat,
  );
  basePlinth.position.y = 0.07;
  basePlinth.castShadow = castShadowFlag;
  basePlinth.receiveShadow = true;
  pedestalGroup.add(basePlinth);

  // Part 2: Chamfered waist collar
  const waistBlock = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.86, 0.1, 0.86)),
    pedestalGraniteMat,
  );
  waistBlock.position.y = 0.19;
  waistBlock.castShadow = castShadowFlag;
  waistBlock.receiveShadow = true;
  pedestalGroup.add(waistBlock);

  // Part 3: Main square pedestal body (lower solid portion)
  const mainBody = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.78, 0.44, 0.78)),
    pedestalGraniteMat,
  );
  mainBody.position.y = 0.46;
  mainBody.castShadow = castShadowFlag;
  mainBody.receiveShadow = true;
  pedestalGroup.add(mainBody);

  // Part 4: Top square collar with circular hole for the carved bowl recess
  const topOuterSize = 0.78;
  const half = topOuterSize / 2;
  const bowlRadius = 0.195;
  const topShape = new THREE.Shape();
  topShape.moveTo(-half, -half);
  topShape.lineTo(half, -half);
  topShape.lineTo(half, half);
  topShape.lineTo(-half, half);
  topShape.closePath();

  const holePath = new THREE.Path();
  holePath.absarc(0, 0, bowlRadius, 0, Math.PI * 2, true);
  topShape.holes.push(holePath);

  const collarGeo = track(
    new THREE.ExtrudeGeometry(topShape, {
      depth: 0.12,
      bevelEnabled: true,
      bevelThickness: 0.014,
      bevelSize: 0.014,
      bevelSegments: 2,
      curveSegments: 32,
    }),
  );
  collarGeo.rotateX(-Math.PI / 2);
  const topCollar = new THREE.Mesh(collarGeo, pedestalGraniteMat);
  topCollar.position.y = 0.68;
  topCollar.castShadow = castShadowFlag;
  topCollar.receiveShadow = true;
  pedestalGroup.add(topCollar);

  // Part 5: Concave circular granite bowl inside the recess (LatheGeometry)
  const bowlProfile: THREE.Vector2[] = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.06, 0.006),
    new THREE.Vector2(0.125, 0.028),
    new THREE.Vector2(0.17, 0.068),
    new THREE.Vector2(0.198, 0.118),
    new THREE.Vector2(0.21, 0.118),
  ];
  const bowlGeo = track(new THREE.LatheGeometry(bowlProfile, 32));
  const bowlMesh = new THREE.Mesh(bowlGeo, pedestalGraniteMat);
  bowlMesh.position.y = 0.695;
  bowlMesh.receiveShadow = true;
  pedestalGroup.add(bowlMesh);

  // Soft shadow inside bowl recess
  const recessShadow = new THREE.Mesh(
    track(new THREE.CircleGeometry(0.16, 24)),
    contactShadowMat,
  );
  recessShadow.rotation.x = -Math.PI / 2;
  recessShadow.position.y = 0.725;
  pedestalGroup.add(recessShadow);

  // =========================================================================
  // 3. THE SACRED STONE ("돌할매") - SMOOTH EGG-SHAPED OVOID GRANITE (~25cm)
  // =========================================================================
  const dolhalmaeRestY = 0.875;
  const dolhalmaeGroup = new THREE.Group();
  dolhalmaeGroup.position.set(0, dolhalmaeRestY, 0);
  root.add(dolhalmaeGroup);

  // Ovoid sculpted geometry (~26cm height, ~22cm width)
  const stoneGeo = track(new THREE.SphereGeometry(1, 36, 28));
  const sPos = stoneGeo.attributes.position;
  for (let i = 0; i < sPos.count; i++) {
    let x = sPos.getX(i);
    let y = sPos.getY(i);
    let z = sPos.getZ(i);

    // Egg-like taper: slightly fuller lower belly, gently tapered top crown
    const eggTaper = y > 0 ? 1 - y * 0.14 : 1 + (-y) * 0.05;
    x *= 0.118 * eggTaper;
    z *= 0.112 * eggTaper;
    y *= 0.145;

    // Subtle organic weathered river-stone asymmetry
    const organic =
      Math.sin(x * 16 + 0.5) * 0.0025 +
      Math.cos(z * 14 - 0.3) * 0.0025 +
      Math.sin(y * 12 + x * 8) * 0.002;
    sPos.setXYZ(i, x + organic, y, z - organic * 0.7);
  }
  stoneGeo.computeVertexNormals();

  const dolhalmaeMesh = new THREE.Mesh(stoneGeo, dolhalmaeMat);
  dolhalmaeMesh.castShadow = castShadowFlag;
  dolhalmaeMesh.receiveShadow = true;
  dolhalmaeGroup.add(dolhalmaeMesh);

  // Subtle warm golden aura shell (activated during Wish Ember absorption & Outcome A)
  const dolhalmaeAuraMaterial = track(
    new THREE.MeshBasicMaterial({
      color: 0xf4bd58,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide,
    }),
  );
  const auraMesh = new THREE.Mesh(stoneGeo, dolhalmaeAuraMaterial);
  auraMesh.scale.setScalar(1.14);
  dolhalmaeGroup.add(auraMesh);

  // Dedicated invisible proxy sphere on layer 1 for smooth pointer raycasting
  const proxyGeo = track(new THREE.SphereGeometry(0.24, 16, 12));
  const proxyMat = track(new THREE.MeshBasicMaterial({ visible: false }));
  const dolhalmaeRaycastMesh = new THREE.Mesh(proxyGeo, proxyMat);
  dolhalmaeRaycastMesh.layers.set(1);
  dolhalmaeGroup.add(dolhalmaeRaycastMesh);

  // Warm sacred point light hovering near Dolhalmae (subtle accent in dusk/night)
  const dolhalmaePointLight = new THREE.PointLight(0xffb85c, 0.35, 3.2, 2);
  dolhalmaePointLight.position.set(0, 1.15, 0.25);
  root.add(dolhalmaePointLight);

  // =========================================================================
  // 4. NATURAL MOSSY BEDROCK CLIFF FACE (자연 암반) BEHIND & BENEATH PEDESTAL
  // =========================================================================
  const bedrockGroup = new THREE.Group();
  root.add(bedrockGroup);

  const rockClusters: Array<{
    pos: [number, number, number];
    scale: [number, number, number];
    rot: [number, number, number];
    seed: number;
  }> = [
    { pos: [0, 0.95, -1.55], scale: [1.55, 1.35, 0.95], rot: [0.1, 0.2, 0.05], seed: 1.1 },
    { pos: [-1.15, 0.78, -1.35], scale: [1.1, 1.15, 0.85], rot: [0.2, -0.4, 0.1], seed: 2.4 },
    { pos: [1.18, 0.82, -1.32], scale: [1.15, 1.2, 0.85], rot: [-0.15, 0.5, -0.1], seed: 3.7 },
    { pos: [-0.55, 1.78, -1.68], scale: [1.25, 0.95, 0.8], rot: [0.25, 0.1, -0.2], seed: 4.9 },
    { pos: [0.62, 1.72, -1.65], scale: [1.2, 0.92, 0.82], rot: [-0.1, -0.25, 0.15], seed: 5.5 },
    { pos: [-1.85, 0.55, -0.95], scale: [0.85, 0.88, 0.75], rot: [0.1, 0.8, 0.2], seed: 6.2 },
    { pos: [1.85, 0.58, -0.92], scale: [0.85, 0.86, 0.75], rot: [-0.2, -0.7, -0.1], seed: 7.4 },
    { pos: [0, 0.14, -0.82], scale: [1.35, 0.38, 0.55], rot: [0.05, 0.1, 0], seed: 8.8 },
    { pos: [0, 2.28, -1.85], scale: [1.75, 0.85, 0.9], rot: [0.15, 0, 0], seed: 9.3 },
  ];

  rockClusters.forEach((cfg) => {
    const geo = track(displaceRockGeometry(new THREE.SphereGeometry(1, 18, 14), cfg.seed, 0.14));
    const mesh = new THREE.Mesh(geo, bedrockMat);
    mesh.position.set(...cfg.pos);
    mesh.scale.set(...cfg.scale);
    mesh.rotation.set(...cfg.rot);
    mesh.castShadow = castShadowFlag;
    mesh.receiveShadow = true;
    bedrockGroup.add(mesh);
  });

  // Lush moss cushion accents nestled on bedrock ledges
  const mossCushions: Array<[number, number, number, number]> = [
    [-0.75, 1.28, -1.05, 0.34],
    [0.82, 1.22, -1.02, 0.32],
    [0.05, 1.62, -1.16, 0.38],
    [-1.35, 0.92, -0.88, 0.28],
    [1.42, 0.95, -0.86, 0.3],
    [-0.38, 0.32, -0.62, 0.22],
    [0.44, 0.28, -0.64, 0.24],
  ];
  mossCushions.forEach(([x, y, z, r], idx) => {
    const geo = track(displaceRockGeometry(new THREE.SphereGeometry(r, 14, 10), idx + 11, 0.16));
    const cushion = new THREE.Mesh(geo, mossMat);
    cushion.position.set(x, y, z);
    cushion.scale.set(1.3, 0.48, 0.95);
    cushion.receiveShadow = true;
    bedrockGroup.add(cushion);
  });

  // =========================================================================
  // 5. STONE-PILLARED TILED PAVILION (돌기둥 기와 전각) & GRANITE BALUSTRADE
  // =========================================================================
  const pavilionGroup = new THREE.Group();
  root.add(pavilionGroup);

  // 6 Round Light-Gray Granite Pillars (둥근 화강암 돌기둥)
  const pillarPositions: Array<[number, number]> = [
    [-2.55, 2.15],
    [2.55, 2.15],
    [-2.55, 0.0],
    [2.55, 0.0],
    [-2.55, -2.05],
    [2.55, -2.05],
  ];

  const plinthGeo = track(new THREE.BoxGeometry(0.46, 0.16, 0.46));
  const shaftProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.185, 0.0),
    new THREE.Vector2(0.18, 0.65),
    new THREE.Vector2(0.172, 1.75),
    new THREE.Vector2(0.162, 2.55),
    new THREE.Vector2(0.0, 2.55),
  ];
  const shaftGeo = track(new THREE.LatheGeometry(shaftProfile, 24));
  const capitalGeo = track(new THREE.BoxGeometry(0.42, 0.16, 0.42));

  pillarPositions.forEach(([px, pz]) => {
    const pillar = new THREE.Group();
    pillar.position.set(px, 0.04, pz);

    const plinth = new THREE.Mesh(plinthGeo, pedestalGraniteMat);
    plinth.position.y = 0.08;
    plinth.castShadow = castShadowFlag;
    plinth.receiveShadow = true;
    pillar.add(plinth);

    const shaft = new THREE.Mesh(shaftGeo, whiteBalustradeMat);
    shaft.position.y = 0.16;
    shaft.castShadow = castShadowFlag;
    shaft.receiveShadow = true;
    pillar.add(shaft);

    const capital = new THREE.Mesh(capitalGeo, pedestalGraniteMat);
    capital.position.y = 2.79;
    capital.castShadow = castShadowFlag;
    capital.receiveShadow = true;
    pillar.add(capital);

    pavilionGroup.add(pillar);
  });

  // White Granite Stone Balustrade / Railing (화강암 석조 난간)
  const postBodyGeo = track(new THREE.BoxGeometry(0.16, 0.72, 0.16));
  const postCapProfile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.095, 0),
    new THREE.Vector2(0.095, 0.04),
    new THREE.Vector2(0.055, 0.07),
    new THREE.Vector2(0.075, 0.12),
    new THREE.Vector2(0.04, 0.17),
    new THREE.Vector2(0, 0.2),
  ];
  const postCapGeo = track(new THREE.LatheGeometry(postCapProfile, 16));
  const balusterGeo = track(new THREE.CylinderGeometry(0.042, 0.048, 0.42, 12));

  const addBalustradeSection = (x1: number, z1: number, x2: number, z2: number, balustersCount: number) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);

    const bay = new THREE.Group();
    bay.position.set(x1, 0.04, z1);
    bay.rotation.y = angle;

    // Two end posts
    [0, len].forEach((offset) => {
      const post = new THREE.Mesh(postBodyGeo, whiteBalustradeMat);
      post.position.set(0, 0.36, offset);
      post.castShadow = castShadowFlag;
      post.receiveShadow = true;
      bay.add(post);

      const cap = new THREE.Mesh(postCapGeo, whiteBalustradeMat);
      cap.position.set(0, 0.72, offset);
      cap.castShadow = castShadowFlag;
      bay.add(cap);
    });

    // Top & bottom granite rails
    const railGeo = track(new THREE.BoxGeometry(0.11, 0.08, len));
    const topRail = new THREE.Mesh(railGeo, whiteBalustradeMat);
    topRail.position.set(0, 0.62, len / 2);
    topRail.castShadow = castShadowFlag;
    bay.add(topRail);

    const botRail = new THREE.Mesh(railGeo, whiteBalustradeMat);
    botRail.position.set(0, 0.14, len / 2);
    botRail.castShadow = castShadowFlag;
    bay.add(botRail);

    // Vertical balusters
    for (let i = 1; i <= balustersCount; i++) {
      const bz = (len / (balustersCount + 1)) * i;
      const bal = new THREE.Mesh(balusterGeo, whiteBalustradeMat);
      bal.position.set(0, 0.38, bz);
      bal.castShadow = castShadowFlag;
      bay.add(bal);
    }

    pavilionGroup.add(bay);
  };

  // Front left & right balustrades (central doorway open at x in [-0.95, 0.95])
  addBalustradeSection(-2.35, 2.15, -0.95, 2.15, 3);
  addBalustradeSection(0.95, 2.15, 2.35, 2.15, 3);
  // Left & right side balustrades
  addBalustradeSection(-2.55, 1.95, -2.55, 0.2, 4);
  addBalustradeSection(2.55, 1.95, 2.55, 0.2, 4);

  // Wooden Beams & Rafters (서까래 및 대들보)
  const timberGroup = new THREE.Group();
  timberGroup.position.y = 2.98;
  pavilionGroup.add(timberGroup);

  // Longitudinal & cross tie-beams
  const frontBackBeamGeo = track(new THREE.BoxGeometry(5.6, 0.22, 0.22));
  [2.15, 0.0, -2.05].forEach((bz) => {
    const beam = new THREE.Mesh(frontBackBeamGeo, woodMat);
    beam.position.set(0, 0, bz);
    beam.castShadow = castShadowFlag;
    timberGroup.add(beam);
  });

  const sideBeamGeo = track(new THREE.BoxGeometry(0.22, 0.22, 4.7));
  [-2.55, 2.55].forEach((bx) => {
    const beam = new THREE.Mesh(sideBeamGeo, woodMat);
    beam.position.set(bx, 0.08, 0.05);
    beam.castShadow = castShadowFlag;
    timberGroup.add(beam);
  });

  // Exposed wooden rafters (서까래) extending out under the eaves
  const rafterGeo = track(new THREE.CylinderGeometry(0.052, 0.058, 3.15, 10));
  for (let i = -7; i <= 7; i++) {
    const rx = i * 0.42;
    // Front slope rafters
    const fRafter = new THREE.Mesh(rafterGeo, woodMat);
    fRafter.position.set(rx, 0.46, 1.48);
    fRafter.rotation.x = Math.PI / 2 - 0.36;
    timberGroup.add(fRafter);

    // Rear slope rafters
    const bRafter = new THREE.Mesh(rafterGeo, woodMat);
    bRafter.position.set(rx, 0.46, -1.38);
    bRafter.rotation.x = -(Math.PI / 2 - 0.36);
    timberGroup.add(bRafter);
  }

  // Traditional Korean Dark-Gray Tiled Roof (한식 기와지붕)
  const roofGroup = new THREE.Group();
  roofGroup.position.set(0, 3.08, 0.05);
  pavilionGroup.add(roofGroup);

  // Front & back main tiled roof slopes
  const slopeGeo = track(new THREE.BoxGeometry(7.0, 0.14, 3.28));
  const frontSlope = new THREE.Mesh(slopeGeo, roofTileMat);
  frontSlope.position.set(0, 0.56, 1.46);
  frontSlope.rotation.x = 0.36;
  frontSlope.castShadow = castShadowFlag;
  frontSlope.receiveShadow = true;
  roofGroup.add(frontSlope);

  const backSlope = new THREE.Mesh(slopeGeo, roofTileMat);
  backSlope.position.set(0, 0.56, -1.46);
  backSlope.rotation.x = -0.36;
  backSlope.castShadow = castShadowFlag;
  backSlope.receiveShadow = true;
  roofGroup.add(backSlope);

  // Left & right hipped eave wings
  const hipGeo = track(new THREE.BoxGeometry(1.5, 0.12, 5.7));
  const leftHip = new THREE.Mesh(hipGeo, roofTileMat);
  leftHip.position.set(-3.12, 0.32, 0);
  leftHip.rotation.z = 0.42;
  leftHip.castShadow = castShadowFlag;
  roofGroup.add(leftHip);

  const rightHip = new THREE.Mesh(hipGeo, roofTileMat);
  rightHip.position.set(3.12, 0.32, 0);
  rightHip.rotation.z = -0.42;
  rightHip.castShadow = castShadowFlag;
  roofGroup.add(rightHip);

  // Main ridge beam (용마루) + upturned end-caps (치미)
  const ridgeBeam = new THREE.Mesh(track(new THREE.BoxGeometry(5.8, 0.24, 0.28)), roofTileMat);
  ridgeBeam.position.set(0, 1.18, 0);
  ridgeBeam.castShadow = castShadowFlag;
  roofGroup.add(ridgeBeam);

  [-2.92, 2.92].forEach((rx) => {
    const endCap = new THREE.Mesh(track(new THREE.BoxGeometry(0.18, 0.36, 0.34)), roofTileMat);
    endCap.position.set(rx, 1.24, 0);
    endCap.rotation.z = rx < 0 ? 0.25 : -0.25;
    roofGroup.add(endCap);
  });

  // Four diagonal corner hip ridges (추녀마루)
  const cornerRidgeGeo = track(new THREE.BoxGeometry(0.18, 0.16, 2.8));
  [
    [-2.95, 1.5, 0.42, -0.34],
    [2.95, 1.5, -0.42, -0.34],
    [-2.95, -1.5, 0.42, 0.34],
    [2.95, -1.5, -0.42, 0.34],
  ].forEach(([cx, cz, rz, rx]) => {
    const cr = new THREE.Mesh(cornerRidgeGeo, roofTileMat);
    cr.position.set(cx, 0.56, cz);
    cr.rotation.set(rx, 0, rz);
    roofGroup.add(cr);
  });

  // =========================================================================
  // 6. WOODEN DONATION BOX (복전함) & RITUAL GUIDE PLAQUE (기도 순서 안내판)
  // =========================================================================
  // Donation Box (복전함) at front-right
  const donationGroup = new THREE.Group();
  donationGroup.position.set(1.52, 0.04, 1.32);
  donationGroup.rotation.y = -0.38;
  root.add(donationGroup);

  const boxBase = new THREE.Mesh(track(new THREE.BoxGeometry(0.56, 0.54, 0.38)), darkWoodMat);
  boxBase.position.y = 0.27;
  boxBase.castShadow = castShadowFlag;
  boxBase.receiveShadow = true;
  donationGroup.add(boxBase);

  const boxLid = new THREE.Mesh(track(new THREE.BoxGeometry(0.62, 0.07, 0.44)), woodMat);
  boxLid.position.y = 0.56;
  boxLid.castShadow = castShadowFlag;
  donationGroup.add(boxLid);

  const coinSlot = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.24, 0.02, 0.03)),
    track(new THREE.MeshStandardMaterial({ color: 0x15110d, roughness: 0.9 })),
  );
  coinSlot.position.set(0, 0.6, 0);
  donationGroup.add(coinSlot);

  const clasp = new THREE.Mesh(track(new THREE.BoxGeometry(0.08, 0.11, 0.03)), brassMat);
  clasp.position.set(0, 0.48, 0.195);
  donationGroup.add(clasp);

  const signMat = track(
    new THREE.MeshStandardMaterial({
      map: donationSignTex,
      roughness: 0.65,
      metalness: 0.05,
    }),
  );
  const signFace = new THREE.Mesh(track(new THREE.PlaneGeometry(0.42, 0.21)), signMat);
  signFace.position.set(0, 0.31, 0.195);
  donationGroup.add(signFace);

  // Wooden Ritual Guide Plaque (돌할매 기도 순서 안내판) at front-left
  const guideGroup = new THREE.Group();
  guideGroup.position.set(-1.68, 0.04, 1.24);
  guideGroup.rotation.y = 0.46;
  root.add(guideGroup);

  const gPostGeo = track(new THREE.BoxGeometry(0.06, 1.15, 0.06));
  [-0.26, 0.26].forEach((px) => {
    const post = new THREE.Mesh(gPostGeo, darkWoodMat);
    post.position.set(px, 0.575, 0);
    post.castShadow = castShadowFlag;
    guideGroup.add(post);
  });

  const frameBoard = new THREE.Mesh(track(new THREE.BoxGeometry(0.62, 0.74, 0.045)), darkWoodMat);
  frameBoard.position.set(0, 0.88, 0);
  frameBoard.castShadow = castShadowFlag;
  guideGroup.add(frameBoard);

  const guideFaceMat = track(
    new THREE.MeshStandardMaterial({
      map: guideBoardTex,
      roughness: 0.72,
      metalness: 0.02,
    }),
  );
  const guideFace = new THREE.Mesh(track(new THREE.PlaneGeometry(0.54, 0.66)), guideFaceMat);
  guideFace.position.set(0, 0.88, 0.025);
  guideGroup.add(guideFace);

  // Small protective wooden gable rooflet over guide board
  [-0.12, 0.12].forEach((rz, idx) => {
    const rooflet = new THREE.Mesh(track(new THREE.BoxGeometry(0.76, 0.035, 0.24)), roofTileMat);
    rooflet.position.set(0, 1.32, idx === 0 ? 0.09 : -0.09);
    rooflet.rotation.x = idx === 0 ? 0.38 : -0.38;
    guideGroup.add(rooflet);
  });

  // =========================================================================
  // 7. HANGING LOTUS LANTERNS & WISH TAGS (연등과 소원지)
  // =========================================================================
  const lanternColors = [0xe86c8b, 0x62ab7d, 0xebb144]; // Pink, Green, Gold
  const lanterns: SwayingLanternRef[] = [];
  const lanternLights: THREE.PointLight[] = [];

  const cordGeo = track(new THREE.CylinderGeometry(0.005, 0.005, 0.36, 6));
  const cordMat = track(new THREE.MeshStandardMaterial({ color: 0x3b2f24, roughness: 0.9 }));
  const calyxGeo = track(new THREE.ConeGeometry(0.088, 0.05, 10));
  const petalLowerGeo = track(new THREE.CylinderGeometry(0.115, 0.068, 0.105, 12));
  const petalUpperGeo = track(new THREE.CylinderGeometry(0.075, 0.115, 0.095, 12));
  const tasselGeo = track(new THREE.CylinderGeometry(0.012, 0.004, 0.1, 8));
  const tagGeo = track(new THREE.PlaneGeometry(0.095, 0.27));

  const lanternCoords: Array<[number, number, number]> = [
    // Front row under eaves
    [-2.0, 2.78, 1.65],
    [-1.2, 2.78, 1.65],
    [-0.4, 2.78, 1.65],
    [0.4, 2.78, 1.65],
    [1.2, 2.78, 1.65],
    [2.0, 2.78, 1.65],
    // Inner row framing the Dolhalmae
    [-1.85, 2.82, 0.65],
    [-1.05, 2.82, 0.65],
    [1.05, 2.82, 0.65],
    [1.85, 2.82, 0.65],
    // Side eaves lanterns
    [-2.35, 2.76, -0.4],
    [2.35, 2.76, -0.4],
  ];

  // Add 2 warm interior lantern PointLights (balanced illumination, light on shader cost)
  [
    [-1.05, 2.35, 1.15],
    [1.05, 2.35, 1.15],
  ].forEach(([lx, ly, lz]) => {
    const pLight = new THREE.PointLight(0xffb562, 0.55, 6.2, 1.7);
    pLight.position.set(lx, ly, lz);
    root.add(pLight);
    lanternLights.push(pLight);
  });

  lanternCoords.forEach(([lx, ly, lz], idx) => {
    const pivot = new THREE.Group();
    pivot.position.set(lx, ly, lz);
    root.add(pivot);

    const colHex = lanternColors[idx % lanternColors.length];
    const baseEmissive = new THREE.Color(colHex);
    const bodyMat = track(
      new THREE.MeshStandardMaterial({
        color: colHex,
        emissive: baseEmissive,
        emissiveIntensity: 0.42,
        roughness: 0.55,
        metalness: 0.02,
      }),
    );

    const cord = new THREE.Mesh(cordGeo, cordMat);
    cord.position.y = -0.19;
    pivot.add(cord);

    const calyx = new THREE.Mesh(calyxGeo, darkWoodMat);
    calyx.position.y = -0.37;
    pivot.add(calyx);

    const upperTier = new THREE.Mesh(petalUpperGeo, bodyMat);
    upperTier.position.y = -0.44;
    pivot.add(upperTier);

    const lowerTier = new THREE.Mesh(petalLowerGeo, bodyMat);
    lowerTier.position.y = -0.56;
    pivot.add(lowerTier);

    const tassel = new THREE.Mesh(tasselGeo, bodyMat);
    tassel.position.y = -0.68;
    pivot.add(tassel);

    // Hanging white Korean wish tag (흰색 소원지)
    const tagPivot = new THREE.Group();
    tagPivot.position.set(0, -0.73, 0);
    pivot.add(tagPivot);

    const wishData = initialWishTags[idx % initialWishTags.length];
    const tagTex = track(createWishTagTexture(wishData.wish, wishData.identity, anisotropy));
    const tagMat = track(
      new THREE.MeshStandardMaterial({
        map: tagTex,
        side: THREE.DoubleSide,
        roughness: 0.88,
        metalness: 0.0,
      }),
    );
    const tagMesh = new THREE.Mesh(tagGeo, tagMat);
    tagMesh.position.y = -0.16;
    tagPivot.add(tagMesh);

    lanterns.push({
      pivot,
      phase: idx * 0.72,
      baseEmissive,
      bodyMaterial: bodyMat,
      tagPivot,
      tagMesh,
    });
  });

  // Method to dynamically hang a newly written wish tag onto the front center lanterns
  let nextDynamicSlot = 2;
  const addUserWishTag = (tag: SavedWishTag) => {
    const slotIdx = nextDynamicSlot % lanterns.length;
    nextDynamicSlot = (nextDynamicSlot + 1) % lanterns.length;
    const targetLantern = lanterns[slotIdx];
    const newTex = track(createWishTagTexture(tag.wish, tag.identity, anisotropy));
    const mat = targetLantern.tagMesh.material as THREE.MeshStandardMaterial;
    mat.map = newTex;
    mat.needsUpdate = true;
    // Highlight sway gently
    targetLantern.pivot.rotation.z = 0.12;
  };

  // =========================================================================
  // 8. SURROUNDING MT. GWANSAN PINE FOREST, STONE CAIRNS & MOUNTAINS
  // =========================================================================
  const barkMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x6e4736, // Korean red pine warm reddish-brown bark
      roughness: 0.9,
      metalness: 0.02,
    }),
  );
  const pineNeedleMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x264428,
      roughness: 0.9,
      metalness: 0.0,
    }),
  );
  const needleGeo = track(new THREE.DodecahedronGeometry(1.15, 1));

  const pineCoords: Array<[number, number, number, number]> = [
    [-4.55, -0.35, -2.6, 1.05],
    [-5.6, -0.2, 0.4, 1.18],
    [-4.4, -0.38, 3.3, 0.92],
    [4.65, -0.35, -2.5, 1.08],
    [5.7, -0.22, 0.6, 1.15],
    [4.45, -0.38, 3.4, 0.95],
    [-4.2, 0.4, -6.4, 1.4],
    [4.4, 0.35, -6.2, 1.35],
    [-8.5, 0.3, -5.5, 1.45],
    [8.8, 0.25, -5.8, 1.4],
    [-8.4, -0.1, 4.4, 1.15],
    [8.4, -0.15, 4.6, 1.2],
  ];

  pineCoords.forEach(([tx, ty, tz, scale], idx) => {
    const tree = new THREE.Group();
    tree.position.set(tx, ty, tz);
    tree.scale.setScalar(scale);

    // Curved Korean red pine trunk (TubeGeometry)
    const leanX = Math.sin(idx * 1.7) * 0.45;
    const leanZ = Math.cos(idx * 2.1) * 0.3;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(leanX * 0.4, 1.6, leanZ * 0.4),
      new THREE.Vector3(leanX, 3.2, leanZ),
      new THREE.Vector3(leanX * 0.7, 4.6, leanZ * 0.8),
    ]);
    const trunkGeo = track(new THREE.TubeGeometry(curve, 12, 0.16, 8, false));
    const trunk = new THREE.Mesh(trunkGeo, barkMat);
    trunk.castShadow = castShadowFlag;
    tree.add(trunk);

    // Tiered flat pine needle canopies (3–4 puffs per pine)
    const canopyOffsets: Array<[number, number, number, number]> = [
      [leanX * 0.7, 4.75, leanZ * 0.8, 1.15],
      [leanX + 0.7, 3.95, leanZ + 0.4, 0.88],
      [leanX - 0.65, 3.65, leanZ - 0.35, 0.82],
    ];
    canopyOffsets.forEach(([cx, cy, cz, cs]) => {
      const puff = new THREE.Mesh(needleGeo, pineNeedleMat);
      puff.position.set(cx, cy, cz);
      puff.scale.set(cs * 1.3, cs * 0.48, cs * 1.25);
      puff.castShadow = castShadowFlag;
      puff.receiveShadow = true;
      tree.add(puff);
    });

    root.add(tree);
  });

  // Stacked Stone Wish Cairns (돌탑) flanking the front courtyard
  const cairnRockGeo = track(displaceRockGeometry(new THREE.SphereGeometry(0.28, 12, 9), 42, 0.12));
  const cairnCoords: Array<[number, number, number]> = [
    [-3.35, -0.4, 2.7],
    [3.4, -0.4, 2.65],
    [-3.95, -0.35, 1.2],
    [4.0, -0.35, 1.25],
  ];
  cairnCoords.forEach(([cx, cy, cz], cIdx) => {
    const cairn = new THREE.Group();
    cairn.position.set(cx, cy, cz);
    let curY = 0.08;
    for (let layer = 0; layer < 6; layer++) {
      const s = 1.0 - layer * 0.13;
      const stone = new THREE.Mesh(cairnRockGeo, pedestalGraniteMat);
      stone.scale.set(s * 1.2, s * 0.45, s * 1.1);
      stone.position.set(
        Math.sin(layer + cIdx) * 0.02,
        curY,
        Math.cos(layer + cIdx) * 0.02,
      );
      stone.rotation.y = layer * 0.8 + cIdx;
      stone.castShadow = castShadowFlag;
      stone.receiveShadow = true;
      cairn.add(stone);
      curY += 0.22 * s;
    }
    root.add(cairn);
  });

  // Distant Mt. Gwansan mountain horizon ring
  const mountainMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x35403a,
      roughness: 0.96,
      metalness: 0.0,
    }),
  );
  const mountainGeo = track(new THREE.ConeGeometry(16, 13, 7));
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const dist = 34 + (i % 3) * 6;
    const peak = new THREE.Mesh(mountainGeo, mountainMat);
    peak.position.set(Math.cos(angle) * dist, 3.5 + (i % 2) * 2.5, Math.sin(angle) * dist);
    peak.scale.set(1.2 + (i % 3) * 0.25, 0.85 + (i % 4) * 0.2, 1.1);
    peak.rotation.y = i * 0.5;
    root.add(peak);
  }

  // =========================================================================
  // 9. SPIRIT WISPS (참배객의 온기), DRIFTING MOTES & GOLDEN WISH EMBERS
  // =========================================================================
  const spiritWisps: SpiritWispRef[] = [];
  const wispCoords: Array<[number, number, number]> = [
    [-1.4, 1.2, 2.4],
    [1.7, 1.35, 2.25],
    [-2.75, 1.55, 0.8],
    [2.8, 1.45, -0.6],
  ];
  wispCoords.forEach(([wx, wy, wz], idx) => {
    const mat = track(
      new THREE.SpriteMaterial({
        map: wispTex,
        color: 0xffdfa8,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(wx, wy, wz);
    sprite.scale.setScalar(0.28);
    root.add(sprite);
    spiritWisps.push({
      sprite,
      basePos: new THREE.Vector3(wx, wy, wz),
      phase: idx * 1.5,
    });
  });

  // Softly drifting mountain light motes / autumn leaves
  const moteCount = 90;
  const motePositions = new Float32Array(moteCount * 3);
  const moteBasePositions = new Float32Array(moteCount * 3);
  for (let i = 0; i < moteCount; i++) {
    const x = (Math.random() - 0.5) * 14;
    const y = 0.2 + Math.random() * 3.6;
    const z = (Math.random() - 0.5) * 12;
    motePositions[i * 3] = x;
    motePositions[i * 3 + 1] = y;
    motePositions[i * 3 + 2] = z;
    moteBasePositions[i * 3] = x;
    moteBasePositions[i * 3 + 1] = y;
    moteBasePositions[i * 3 + 2] = z;
  }
  const moteGeo = track(new THREE.BufferGeometry());
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
  const moteMat = track(
    new THREE.PointsMaterial({
      map: glowTex,
      color: 0xffdea0,
      size: 0.12,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const motePoints = new THREE.Points(moteGeo, moteMat);
  root.add(motePoints);

  // Golden Wish Embers particle pool (Step 3 dissolution into stone & rising to lanterns)
  const emberCount = 80;
  const emberPositions = new Float32Array(emberCount * 3);
  const emberVelocities = new Float32Array(emberCount * 3);
  for (let i = 0; i < emberCount; i++) {
    emberPositions[i * 3] = 0;
    emberPositions[i * 3 + 1] = -20; // hidden until triggered
    emberPositions[i * 3 + 2] = 0;
  }
  const emberGeo = track(new THREE.BufferGeometry());
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3));
  const emberMaterial = track(
    new THREE.PointsMaterial({
      map: glowTex,
      color: 0xffcc66,
      size: 0.16,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const emberPoints = new THREE.Points(emberGeo, emberMaterial);
  emberPoints.frustumCulled = false;
  root.add(emberPoints);

  return {
    root,
    dolhalmaeGroup,
    dolhalmaeRestY,
    dolhalmaeRaycastMesh,
    dolhalmaeAuraMaterial,
    dolhalmaePointLight,
    lanterns,
    lanternLights,
    spiritWisps,
    motePoints,
    moteBasePositions,
    emberPoints,
    emberMaterial,
    emberVelocities,
    emberPositions,
    addUserWishTag,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
