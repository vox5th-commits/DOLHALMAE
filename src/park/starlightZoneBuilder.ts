import * as THREE from 'three';
import { createStarlightArchSignTexture } from '../scene/proceduralTextures';
import { PARK_GROUND_Y } from './parkLayout';
import {
  OBSERVATORY_DOME_POS,
  STARLIGHT_ARCH_POS,
  STARLIGHT_TELESCOPE_POS,
} from './starlightData';

export interface StarlightZoneRig {
  group: THREE.Group;
  telescopeRaycastMesh: THREE.Mesh;
  update: (dt: number, elapsed: number, nightFactor: number) => void;
  triggerMeteorShower: () => void;
  dispose: () => void;
}

interface MeteorEntry {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  active: boolean;
  progress: number;
  duration: number;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  cooldown: number;
}

const _dummy = new THREE.Object3D();
const _meteorPos = new THREE.Vector3();

function createFivePointStarGeometry(outerR: number, innerR: number, depth: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  geo.center();
  return geo;
}

export function buildStarlightZone(
  lightGraniteMat: THREE.Material,
  darkGraniteMat: THREE.Material,
  anisotropy: number,
  castShadowFlag: boolean,
): StarlightZoneRig {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  // Shared materials for Bohyeonsan Starlight Experience Zone (varied roughness/metalness)
  const navyMetalMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x1b2b4a,
      roughness: 0.36,
      metalness: 0.62,
    }),
  );
  const ivoryWallMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xf1efe8,
      roughness: 0.78,
      metalness: 0.04,
    }),
  );
  const silverDomeMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xd9e2ec,
      roughness: 0.24,
      metalness: 0.78,
    }),
  );
  const darkSlitMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x121826,
      roughness: 0.55,
      metalness: 0.25,
    }),
  );
  const brassMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xd9b15f,
      roughness: 0.28,
      metalness: 0.82,
    }),
  );
  const starGlowMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffdf7d,
      emissive: new THREE.Color(0xffbe42),
      emissiveIntensity: 0.85,
      roughness: 0.26,
      metalness: 0.35,
    }),
  );
  const obsWindowMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x9ec5e8,
      emissive: new THREE.Color(0xffcf77),
      emissiveIntensity: 0.45,
      roughness: 0.2,
      metalness: 0.35,
    }),
  );
  const indigoPlazaMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x1c2539,
      roughness: 0.62,
      metalness: 0.14,
    }),
  );
  const fireflyMat = track(
    new THREE.MeshBasicMaterial({
      color: 0xffe999,
      transparent: true,
      opacity: 0.8,
    }),
  );

  // =========================================================================
  // 1. "별의 도시 영천" STARLIGHT PHOTO-ZONE ARCHWAY (x = -16.6, z = 19.0)
  // =========================================================================
  const archGroup = new THREE.Group();
  archGroup.position.set(STARLIGHT_ARCH_POS[0], PARK_GROUND_Y, STARLIGHT_ARCH_POS[1]);
  group.add(archGroup);

  // Twin granite bases framing the 5.2m wide walkway
  const archBaseGeo = track(new THREE.BoxGeometry(0.76, 0.72, 0.76));
  const archCapGeo = track(new THREE.BoxGeometry(0.88, 0.12, 0.88));
  [-2.6, 2.6].forEach((az) => {
    const base = new THREE.Mesh(archBaseGeo, lightGraniteMat);
    base.position.set(0, 0.36, az);
    base.castShadow = castShadowFlag;
    base.receiveShadow = true;
    archGroup.add(base);

    const cap = new THREE.Mesh(archCapGeo, darkGraniteMat);
    cap.position.set(0, 0.78, az);
    archGroup.add(cap);
  });

  // Sweeping curved steel arch spanning Z in [-2.6, 2.6]
  const archCurvePoints: THREE.Vector3[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const angle = Math.PI * t;
    archCurvePoints.push(
      new THREE.Vector3(0, 0.82 + Math.sin(angle) * 3.55, Math.cos(angle) * 2.6),
    );
  }
  const archCurve = new THREE.CatmullRomCurve3(archCurvePoints);
  const archTubeGeo = track(new THREE.TubeGeometry(archCurve, 28, 0.12, 10, false));
  const archTube = new THREE.Mesh(archTubeGeo, navyMetalMat);
  archTube.castShadow = castShadowFlag;
  archGroup.add(archTube);

  // Golden star crest atop the arch apex
  const heroStarGeo = track(createFivePointStarGeometry(0.56, 0.25, 0.12));
  const heroStar = new THREE.Mesh(heroStarGeo, starGlowMat);
  heroStar.position.set(0, 4.78, 0);
  heroStar.rotation.y = Math.PI / 2;
  archGroup.add(heroStar);

  // Instanced glowing starlight fairy bulbs along the arch curve (1 draw call)
  const bulbGeo = track(new THREE.SphereGeometry(0.085, 8, 6));
  const bulbCount = 13;
  const archBulbs = new THREE.InstancedMesh(bulbGeo, starGlowMat, bulbCount);
  for (let i = 0; i < bulbCount; i++) {
    const pt = archCurve.getPoint((i + 1) / (bulbCount + 1));
    _dummy.position.set(pt.x, pt.y - 0.16, pt.z);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.setScalar(1);
    _dummy.updateMatrix();
    archBulbs.setMatrixAt(i, _dummy.matrix);
  }
  archBulbs.instanceMatrix.needsUpdate = true;
  archBulbs.computeBoundingSphere();
  archGroup.add(archBulbs);

  // Hanging double-sided plaque reading "별의 도시 영천 · 보현산 별빛체험존"
  const archSignTex = track(createStarlightArchSignTexture(anisotropy));
  const archSignMat = track(
    new THREE.MeshStandardMaterial({
      map: archSignTex,
      roughness: 0.42,
      metalness: 0.12,
    }),
  );
  const signFrame = new THREE.Mesh(track(new THREE.BoxGeometry(0.12, 0.88, 2.74)), brassMat);
  signFrame.position.set(0, 3.68, 0);
  archGroup.add(signFrame);

  const signPlaneGeo = track(new THREE.PlaneGeometry(2.6, 0.78));
  const signEast = new THREE.Mesh(signPlaneGeo, archSignMat);
  signEast.position.set(0.068, 3.68, 0);
  signEast.rotation.y = Math.PI / 2;
  archGroup.add(signEast);

  const signWest = new THREE.Mesh(signPlaneGeo, archSignMat);
  signWest.position.set(-0.068, 3.68, 0);
  signWest.rotation.y = -Math.PI / 2;
  archGroup.add(signWest);

  // =========================================================================
  // 2. BOHYEONSAN MINI OBSERVATORY DOME (보현산 천문대 돔, x = -29.0, z = 16.5)
  // =========================================================================
  const obsDeckGroup = new THREE.Group();
  obsDeckGroup.position.set(-27.5, PARK_GROUND_Y, 17.0);
  group.add(obsDeckGroup);

  // Raised circular granite viewing deck (+0.34m, walkable/jumpable!)
  const obsDeck = new THREE.Mesh(
    track(new THREE.CylinderGeometry(6.15, 6.35, 0.34, 36)),
    lightGraniteMat,
  );
  obsDeck.position.y = 0.17;
  obsDeck.receiveShadow = true;
  obsDeck.castShadow = castShadowFlag;
  obsDeckGroup.add(obsDeck);

  // Golden brass perimeter inlay ring on deck floor
  const deckRingGeo = track(new THREE.RingGeometry(5.65, 5.82, 36));
  deckRingGeo.rotateX(-Math.PI / 2);
  const deckRing = new THREE.Mesh(deckRingGeo, brassMat);
  deckRing.position.y = 0.348;
  obsDeckGroup.add(deckRing);

  // Broad east entry step leading onto the observatory deck (+0.17m)
  const deckStep = new THREE.Mesh(track(new THREE.BoxGeometry(1.7, 0.17, 3.6)), lightGraniteMat);
  deckStep.position.set(6.4, 0.085, 0);
  deckStep.receiveShadow = true;
  obsDeckGroup.add(deckStep);

  // Observatory Tower Building perched on the western side of the deck
  const obsTower = new THREE.Group();
  obsTower.position.set(OBSERVATORY_DOME_POS[0], PARK_GROUND_Y + 0.34, OBSERVATORY_DOME_POS[1]);
  group.add(obsTower);

  // Cylindrical lower plinth + main ivory architectural drum
  const towerPlinth = new THREE.Mesh(
    track(new THREE.CylinderGeometry(3.15, 3.25, 0.52, 24)),
    darkGraniteMat,
  );
  towerPlinth.position.y = 0.26;
  towerPlinth.receiveShadow = true;
  obsTower.add(towerPlinth);

  const towerDrum = new THREE.Mesh(
    track(new THREE.CylinderGeometry(2.85, 2.95, 3.35, 24)),
    ivoryWallMat,
  );
  towerDrum.position.y = 2.18;
  towerDrum.castShadow = castShadowFlag;
  towerDrum.receiveShadow = true;
  obsTower.add(towerDrum);

  // Architectural dark-navy vertical pilaster ribs (InstancedMesh: 1 draw call)
  const ribGeo = track(new THREE.BoxGeometry(0.16, 3.32, 0.24));
  const ribInst = new THREE.InstancedMesh(ribGeo, navyMetalMat, 8);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    _dummy.position.set(Math.cos(a) * 2.92, 2.18, Math.sin(a) * 2.92);
    _dummy.rotation.set(0, -a + Math.PI / 2, 0);
    _dummy.scale.setScalar(1);
    _dummy.updateMatrix();
    ribInst.setMatrixAt(i, _dummy.matrix);
  }
  ribInst.instanceMatrix.needsUpdate = true;
  ribInst.computeBoundingSphere();
  obsTower.add(ribInst);

  // Warm glowing observatory windows around drum (InstancedMesh: 1 draw call)
  const winGeo = track(new THREE.BoxGeometry(0.72, 0.92, 0.08));
  const winInst = new THREE.InstancedMesh(winGeo, obsWindowMat, 6);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    _dummy.position.set(Math.cos(a) * 2.92, 2.25, Math.sin(a) * 2.92);
    _dummy.rotation.set(0, -a + Math.PI / 2, 0);
    _dummy.scale.setScalar(1);
    _dummy.updateMatrix();
    winInst.setMatrixAt(i, _dummy.matrix);
  }
  winInst.instanceMatrix.needsUpdate = true;
  winInst.computeBoundingSphere();
  obsTower.add(winInst);

  // Upper rotating dome collar ring
  const domeCollar = new THREE.Mesh(
    track(new THREE.TorusGeometry(2.92, 0.16, 10, 28)),
    navyMetalMat,
  );
  domeCollar.rotation.x = Math.PI / 2;
  domeCollar.position.y = 3.88;
  obsTower.add(domeCollar);

  // Rotating Metallic Hemispherical Observatory Dome + Slit + Main Optical Telescope
  const domePivot = new THREE.Group();
  domePivot.position.y = 3.92;
  domePivot.rotation.y = 0.72; // Facing east-northeast toward park visitors initially
  obsTower.add(domePivot);

  const domeShell = new THREE.Mesh(
    track(new THREE.SphereGeometry(2.88, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.52)),
    silverDomeMat,
  );
  domeShell.castShadow = castShadowFlag;
  domeShell.receiveShadow = true;
  domePivot.add(domeShell);

  // Observation slit housing arch
  const slitArch = new THREE.Mesh(
    track(new THREE.TorusGeometry(2.89, 0.24, 8, 18, Math.PI * 0.58)),
    darkSlitMat,
  );
  slitArch.rotation.y = Math.PI / 2;
  slitArch.rotation.z = 0.08;
  domePivot.add(slitArch);

  // Main giant optical telescope barrel peeking out of the Bohyeonsan dome slit
  const giantScopeGroup = new THREE.Group();
  giantScopeGroup.position.set(0, 1.55, 1.35);
  giantScopeGroup.rotation.x = -0.58;
  domePivot.add(giantScopeGroup);

  const giantTube = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.32, 0.36, 2.2, 16)),
    ivoryWallMat,
  );
  giantTube.rotation.x = Math.PI / 2;
  giantScopeGroup.add(giantTube);

  const giantRim = new THREE.Mesh(
    track(new THREE.TorusGeometry(0.33, 0.045, 8, 16)),
    brassMat,
  );
  giantRim.position.z = 1.08;
  giantScopeGroup.add(giantRim);

  // Subtle glowing apex star beacon atop dome
  const apexBeacon = new THREE.Mesh(track(new THREE.SphereGeometry(0.15, 10, 8)), starGlowMat);
  apexBeacon.position.y = 3.04;
  domePivot.add(apexBeacon);

  // =========================================================================
  // 3. CONSTELLATION FLOOR MOSAIC & INTERACTIVE VIEWING TELESCOPE (-23.4, 21.6)
  // =========================================================================
  const constellationGroup = new THREE.Group();
  constellationGroup.position.set(
    STARLIGHT_TELESCOPE_POS[0],
    PARK_GROUND_Y + 0.032,
    STARLIGHT_TELESCOPE_POS[1],
  );
  group.add(constellationGroup);

  const starPlazaDisc = new THREE.Mesh(
    track(new THREE.CylinderGeometry(3.45, 3.55, 0.06, 32)),
    indigoPlazaMat,
  );
  starPlazaDisc.position.y = 0.03;
  starPlazaDisc.receiveShadow = true;
  constellationGroup.add(starPlazaDisc);

  const compassOuterRing = new THREE.Mesh(
    track(new THREE.RingGeometry(3.25, 3.42, 32)),
    brassMat,
  );
  compassOuterRing.rotation.x = -Math.PI / 2;
  compassOuterRing.position.y = 0.065;
  constellationGroup.add(compassOuterRing);

  // Big Dipper (북두칠성) inlaid golden star medallions on plaza floor
  const dipperCoords: Array<[number, number]> = [
    [-2.1, -0.9],
    [-1.25, -0.55],
    [-0.45, -0.1],
    [0.35, 0.25],
    [0.55, 1.35],
    [1.75, 1.2],
    [1.95, 0.1],
  ];
  const floorStarGeo = track(new THREE.CylinderGeometry(0.14, 0.14, 0.025, 8));
  const floorStarInst = new THREE.InstancedMesh(floorStarGeo, starGlowMat, dipperCoords.length);
  dipperCoords.forEach(([sx, sz], idx) => {
    _dummy.position.set(sx, 0.068, sz);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.setScalar(1);
    _dummy.updateMatrix();
    floorStarInst.setMatrixAt(idx, _dummy.matrix);
  });
  floorStarInst.instanceMatrix.needsUpdate = true;
  floorStarInst.computeBoundingSphere();
  constellationGroup.add(floorStarInst);

  // Connecting golden constellation line segments on floor
  const dipperEdges: Array<[number, number]> = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
    [6, 3],
  ];
  const lineVerts: number[] = [];
  dipperEdges.forEach(([a, b]) => {
    lineVerts.push(dipperCoords[a][0], 0.072, dipperCoords[a][1]);
    lineVerts.push(dipperCoords[b][0], 0.072, dipperCoords[b][1]);
  });
  const lineGeo = track(new THREE.BufferGeometry());
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(lineVerts, 3));
  const lineMat = track(new THREE.LineBasicMaterial({ color: 0xf7d983 }));
  constellationGroup.add(new THREE.LineSegments(lineGeo, lineMat));

  // Crafted Interactive Viewing Telescope on Tripod (체험용 천체망원경)
  const tripodGroup = new THREE.Group();
  tripodGroup.position.set(0, 0.06, 0);
  constellationGroup.add(tripodGroup);

  const legGeo = track(new THREE.CylinderGeometry(0.026, 0.032, 1.24, 8));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(legGeo, navyMetalMat);
    leg.position.set(Math.cos(a) * 0.24, 0.56, Math.sin(a) * 0.24);
    leg.rotation.z = Math.cos(a) * 0.34;
    leg.rotation.x = -Math.sin(a) * 0.34;
    leg.castShadow = castShadowFlag;
    tripodGroup.add(leg);
  }

  const mountHead = new THREE.Mesh(track(new THREE.CylinderGeometry(0.11, 0.13, 0.22, 12)), brassMat);
  mountHead.position.y = 1.18;
  tripodGroup.add(mountHead);

  const scopePivot = new THREE.Group();
  scopePivot.position.set(0, 1.32, 0);
  scopePivot.rotation.set(-0.46, 0.52, 0);
  tripodGroup.add(scopePivot);

  const scopeMainTube = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.085, 0.11, 1.15, 14)),
    ivoryWallMat,
  );
  scopeMainTube.rotation.x = Math.PI / 2;
  scopeMainTube.castShadow = castShadowFlag;
  scopePivot.add(scopeMainTube);

  const scopeCollar = new THREE.Mesh(track(new THREE.CylinderGeometry(0.116, 0.116, 0.14, 14)), brassMat);
  scopeCollar.rotation.x = Math.PI / 2;
  scopeCollar.position.z = 0.45;
  scopePivot.add(scopeCollar);

  const finderTube = new THREE.Mesh(track(new THREE.CylinderGeometry(0.024, 0.026, 0.36, 8)), brassMat);
  finderTube.rotation.x = Math.PI / 2;
  finderTube.position.set(0.08, 0.12, 0.08);
  scopePivot.add(finderTube);

  // Invisible Layer-3 Raycast Hit Proxy for direct click-to-stargaze interaction
  const telescopeRaycastMesh = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.75, 0.75, 1.9, 10)),
    track(new THREE.MeshBasicMaterial({ visible: false })),
  );
  telescopeRaycastMesh.position.y = 0.95;
  telescopeRaycastMesh.layers.set(3);
  telescopeRaycastMesh.userData.interactable = 'starlight-telescope';
  tripodGroup.add(telescopeRaycastMesh);

  // =========================================================================
  // 4. CELESTIAL NIGHT SKY STARFIELD + SHOOTING STARS + STARLIGHT FIREFLIES
  // =========================================================================
  const starCount = 240;
  const starPositions = new Float32Array(starCount * 3);
  let seed = 7731;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < starCount; i++) {
    const theta = rand() * Math.PI * 2;
    const phi = 0.14 + rand() * (Math.PI * 0.36);
    const radius = 84 + rand() * 14;
    starPositions[i * 3] = Math.cos(theta) * Math.cos(phi) * radius;
    starPositions[i * 3 + 1] = Math.sin(phi) * radius + 4;
    starPositions[i * 3 + 2] = 18 + Math.sin(theta) * Math.cos(phi) * radius;
  }
  const starGeo = track(new THREE.BufferGeometry());
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starFieldMat = track(
    new THREE.PointsMaterial({
      color: 0xfff5d6,
      size: 0.95,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    }),
  );
  const starField = new THREE.Points(starGeo, starFieldMat);
  starField.frustumCulled = false;
  group.add(starField);

  // 5 reusable Shooting Star Meteor Streaks across the Bohyeonsan sky
  const meteorGeo = track(new THREE.CylinderGeometry(0.025, 0.11, 3.8, 6));
  meteorGeo.rotateX(Math.PI / 2);
  const meteors: MeteorEntry[] = [];
  for (let i = 0; i < 5; i++) {
    const mat = track(
      new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xfff0a8 : 0xb8e6ff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    const mesh = new THREE.Mesh(meteorGeo, mat);
    mesh.visible = false;
    group.add(mesh);
    meteors.push({
      mesh,
      mat,
      active: false,
      progress: 0,
      duration: 1.2,
      startPos: new THREE.Vector3(),
      endPos: new THREE.Vector3(),
      cooldown: 2.5 + i * 3.1,
    });
  }

  const launchMeteor = (m: MeteorEntry, showerBoost = false) => {
    const baseX = -38 + Math.random() * 44;
    const baseZ = -18 + Math.random() * 34;
    const startY = showerBoost ? 24 + Math.random() * 14 : 30 + Math.random() * 16;
    m.startPos.set(baseX, startY, baseZ);
    m.endPos.set(baseX + 14 + Math.random() * 12, startY - 9 - Math.random() * 6, baseZ + 8);
    m.progress = 0;
    m.duration = showerBoost ? 0.95 + Math.random() * 0.45 : 1.15 + Math.random() * 0.5;
    m.active = true;
    m.mesh.visible = true;
    m.mesh.position.copy(m.startPos);
    m.mesh.lookAt(m.endPos);
  };

  let showerRemaining = 0;
  let showerTimer = 0;

  const triggerMeteorShower = () => {
    showerRemaining = 5;
    showerTimer = 0;
    // Immediately launch first 2 bright shooting stars so user sees instant magic
    launchMeteor(meteors[0], true);
    launchMeteor(meteors[1], true);
    showerRemaining = 3;
    showerTimer = 0.22;
  };

  // 12 gentle golden starlight fireflies orbiting Bohyeonsan Starlight Zone (1 draw call)
  const fireflyCount = 12;
  const fireflyGeo = track(new THREE.SphereGeometry(0.065, 6, 6));
  const fireflyInst = new THREE.InstancedMesh(fireflyGeo, fireflyMat, fireflyCount);
  fireflyInst.frustumCulled = false;
  group.add(fireflyInst);

  // Subtle architectural illumination for Observatory Dome, Constellation Mosaic & Telescope
  const starlightLamp = new THREE.PointLight(0xd4e2ff, 0.9, 24, 1.3);
  starlightLamp.position.set(-24.2, PARK_GROUND_Y + 5.2, 20.6);
  group.add(starlightLamp);

  const update = (dt: number, elapsed: number, nightFactor: number) => {
    // Slow graceful Observatory dome rotation & Arch star shimmer
    domePivot.rotation.y = 0.72 + Math.sin(elapsed * 0.14) * 0.55;
    heroStar.rotation.z = Math.sin(elapsed * 1.1) * 0.08;

    // Scale emissive & celestial starfield brightness with nightFactor (0=dawn, 0.5=sunset, 1=night)
    const glowLevel = 0.55 + nightFactor * 1.45;
    starGlowMat.emissiveIntensity = glowLevel + Math.sin(elapsed * 2.4) * 0.12;
    obsWindowMat.emissiveIntensity = 0.35 + nightFactor * 1.25;
    starlightLamp.intensity = 0.65 + nightFactor * 1.25;
    starFieldMat.opacity = Math.max(0.08, nightFactor * 0.96);
    starField.rotation.y = elapsed * 0.008;

    // Gentle firefly orbit around Starlight Zone
    fireflyMat.opacity = 0.35 + nightFactor * 0.6;
    for (let i = 0; i < fireflyCount; i++) {
      const a = elapsed * (0.28 + (i % 4) * 0.07) + i * 1.1;
      const r = 3.2 + (i % 5) * 1.6;
      const fx = -24.5 + Math.cos(a) * r;
      const fz = 19.2 + Math.sin(a * 0.9) * r;
      const fy = PARK_GROUND_Y + 0.9 + Math.sin(elapsed * 1.9 + i * 1.7) * 0.55;
      _dummy.position.set(fx, fy, fz);
      _dummy.rotation.set(0, 0, 0);
      const pulse = 0.7 + 0.35 * Math.sin(elapsed * 3.5 + i);
      _dummy.scale.setScalar(pulse);
      _dummy.updateMatrix();
      fireflyInst.setMatrixAt(i, _dummy.matrix);
    }
    fireflyInst.instanceMatrix.needsUpdate = true;

    // Handle active Meteor Shower triggers
    if (showerRemaining > 0) {
      showerTimer -= dt;
      if (showerTimer <= 0) {
        const idle = meteors.find((m) => !m.active) ?? meteors[showerRemaining % meteors.length];
        launchMeteor(idle, true);
        showerRemaining--;
        showerTimer = 0.26;
      }
    }

    // Step all shooting star streaks
    for (let i = 0; i < meteors.length; i++) {
      const m = meteors[i];
      if (!m.active) {
        if (nightFactor > 0.35) {
          m.cooldown -= dt;
          if (m.cooldown <= 0) {
            launchMeteor(m, false);
            m.cooldown = 4.5 + Math.random() * 6.0;
          }
        }
        continue;
      }
      m.progress += dt / m.duration;
      if (m.progress >= 1) {
        m.active = false;
        m.mesh.visible = false;
        m.mat.opacity = 0;
        continue;
      }
      _meteorPos.lerpVectors(m.startPos, m.endPos, m.progress);
      m.mesh.position.copy(_meteorPos);
      const fade = Math.sin(m.progress * Math.PI);
      m.mat.opacity = fade * (0.65 + nightFactor * 0.35);
    }
  };

  return {
    group,
    telescopeRaycastMesh,
    update,
    triggerMeteorShower,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
