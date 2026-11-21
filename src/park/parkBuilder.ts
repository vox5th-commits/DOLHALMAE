import * as THREE from 'three';
import {
  createContactShadowTexture,
  createDarkGraniteTextures,
  createInterlockingPaverTextures,
  createLawnGrassTextures,
  createLightGraniteTextures,
  createParkDirectionSignTexture,
  createParkSignTexture,
  createWireFenceTexture,
} from '../scene/proceduralTextures';
import { buildEastGarden } from './eastGardenBuilder';
import { PARK_GROUND_Y } from './parkLayout';
import { buildStarlightZone, type StarlightZoneRig } from './starlightZoneBuilder';
import { buildZodiacStatuesGroup } from './zodiacBuilder';

export interface ParkSceneRig {
  root: THREE.Group;
  lampBulbMaterials: THREE.MeshStandardMaterial[];
  plazaPointLight: THREE.PointLight;
  zodiacRaycastMeshes: THREE.Mesh[];
  starlightRig: StarlightZoneRig;
  dispose: () => void;
}

export function buildParkScene(
  anisotropy: number,
  isSoftwareGl: boolean,
): ParkSceneRig {
  const root = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const castShadowFlag = !isSoftwareGl;
  const dummy = new THREE.Object3D();
  const tempColor = new THREE.Color();

  // Shared Procedural Textures
  const paverTex = createInterlockingPaverTextures(anisotropy, 8, 8);
  const plazaPaverTex = createInterlockingPaverTextures(anisotropy, 4, 4);
  const grassTex = createLawnGrassTextures(anisotropy, 16, 12);
  const islandGrassTex = createLawnGrassTextures(anisotropy, 3, 3);
  const lightGraniteTex = createLightGraniteTextures(anisotropy, 2, 2);
  const darkGraniteTex = createDarkGraniteTextures(anisotropy);
  const wireFenceTex = createWireFenceTexture(anisotropy, 16, 2);
  const parkSignTex = createParkSignTexture(anisotropy);
  const dirSignTex = createParkDirectionSignTexture(anisotropy);
  const contactShadowTex = createContactShadowTexture();

  [
    paverTex.map,
    paverTex.bumpMap,
    plazaPaverTex.map,
    plazaPaverTex.bumpMap,
    grassTex.map,
    grassTex.bumpMap,
    islandGrassTex.map,
    islandGrassTex.bumpMap,
    lightGraniteTex.map,
    lightGraniteTex.bumpMap,
    darkGraniteTex.map,
    darkGraniteTex.bumpMap,
    wireFenceTex,
    parkSignTex,
    dirSignTex,
    contactShadowTex,
  ].forEach(track);

  // Shared PBR Materials
  const mountainEarthMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x4b563c,
      roughness: 0.96,
      metalness: 0.0,
    }),
  );

  const grassMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: grassTex.map,
      bumpMap: grassTex.bumpMap,
      bumpScale: 0.014,
      roughness: 0.92,
      metalness: 0.0,
    }),
  );

  const islandGrassMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: islandGrassTex.map,
      bumpMap: islandGrassTex.bumpMap,
      bumpScale: 0.013,
      roughness: 0.9,
      metalness: 0.0,
    }),
  );

  const paverMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: paverTex.map,
      bumpMap: paverTex.bumpMap,
      bumpScale: 0.013,
      roughness: 0.85,
      metalness: 0.02,
    }),
  );

  const plazaPaverMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xdedbd4,
      map: plazaPaverTex.map,
      bumpMap: plazaPaverTex.bumpMap,
      bumpScale: 0.012,
      roughness: 0.82,
      metalness: 0.02,
    }),
  );

  const lightGraniteMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xf0eee9,
      map: lightGraniteTex.map,
      bumpMap: lightGraniteTex.bumpMap,
      bumpScale: 0.014,
      roughness: 0.8,
      metalness: 0.03,
    }),
  );

  const darkGraniteMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: darkGraniteTex.map,
      bumpMap: darkGraniteTex.bumpMap,
      bumpScale: 0.01,
      roughness: 0.45,
      metalness: 0.06,
    }),
  );

  const roadAsphaltMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x2c2f34,
      roughness: 0.92,
      metalness: 0.02,
    }),
  );

  const roadLineMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xd9c273,
      roughness: 0.78,
      metalness: 0.0,
    }),
  );

  const wireFencePostMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x255a37,
      roughness: 0.6,
      metalness: 0.25,
    }),
  );

  const wireFenceMeshMat = track(
    new THREE.MeshStandardMaterial({
      map: wireFenceTex,
      alphaTest: 0.4,
      transparent: false,
      side: THREE.DoubleSide,
      roughness: 0.55,
      metalness: 0.2,
    }),
  );

  const shrubMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff, // Tinted per-instance via setColorAt
      roughness: 0.88,
      metalness: 0.0,
    }),
  );

  const foliageInstMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff, // Tinted per-instance (lush green, cherry blossom, golden maple)
      roughness: 0.86,
      metalness: 0.0,
    }),
  );

  const leafMatA = track(
    new THREE.MeshStandardMaterial({
      color: 0x4b7b3b,
      roughness: 0.86,
      metalness: 0.0,
    }),
  );

  const leafMatB = track(
    new THREE.MeshStandardMaterial({
      color: 0x5c8942,
      roughness: 0.86,
      metalness: 0.0,
    }),
  );

  const pineNeedleMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x254627,
      roughness: 0.9,
      metalness: 0.0,
    }),
  );

  const trunkMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x624432,
      roughness: 0.9,
      metalness: 0.02,
    }),
  );

  const bambooMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x4c7c3e,
      roughness: 0.65,
      metalness: 0.05,
    }),
  );

  const ironMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x202328,
      roughness: 0.42,
      metalness: 0.65,
    }),
  );

  const buildingDarkMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x3b4047,
      roughness: 0.72,
      metalness: 0.08,
    }),
  );

  const buildingWhiteMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xeae8e3,
      roughness: 0.74,
      metalness: 0.02,
    }),
  );

  const silverAwningMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xc8d4df,
      roughness: 0.24,
      metalness: 0.45,
      transparent: !isSoftwareGl,
      opacity: isSoftwareGl ? 1.0 : 0.78,
      side: THREE.DoubleSide,
    }),
  );

  // Single shared emissive material for all 16 classic park streetlamps!
  const sharedLampBulbMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xfff0c8,
      emissive: new THREE.Color(0xffbe5e),
      emissiveIntensity: 0.65,
      roughness: 0.22,
      metalness: 0.05,
    }),
  );

  // =========================================================================
  // 1. EXPANDED MT. GWANSAN & BOHYEONSAN VALLEY TERRAIN + PARK LAWN
  // =========================================================================
  const terrainGeo = track(new THREE.PlaneGeometry(240, 240, 46, 46));
  terrainGeo.rotateX(-Math.PI / 2);
  const tPos = terrainGeo.attributes.position;
  for (let i = 0; i < tPos.count; i++) {
    const x = tPos.getX(i);
    const z = tPos.getZ(i);

    let y = PARK_GROUND_Y;
    const inParkCore = Math.abs(x) <= 39.5 && z >= -4.5 && z <= 51.0;
    if (!inParkCore) {
      const dx = Math.max(0, Math.abs(x) - 39.5);
      const dzSouth = z < -4.5 ? -4.5 - z : 0;
      const dzNorth = z > 51.0 ? z - 51.0 : 0;
      const backSlope = dzSouth > 0 ? Math.pow(dzSouth * 0.24, 1.32) * 0.95 : 0;
      const flankSlope = dx > 0 ? Math.pow(dx * 0.18, 1.24) * 0.78 : 0;
      const gentleRoll =
        Math.sin(x * 0.08) * Math.cos(z * 0.07) * 0.7 + dzNorth * 0.04;
      y = PARK_GROUND_Y + backSlope + flankSlope + Math.max(0, gentleRoll);
    }
    tPos.setY(i, y);
  }
  terrainGeo.computeVertexNormals();

  const terrainMesh = new THREE.Mesh(terrainGeo, mountainEarthMat);
  terrainMesh.receiveShadow = true;
  root.add(terrainMesh);

  // Expanded manicured park grass carpet (74.8m × 41.2m)
  const parkLawn = new THREE.Mesh(
    track(new THREE.PlaneGeometry(74.8, 41.2)),
    grassMat,
  );
  parkLawn.rotation.x = -Math.PI / 2;
  parkLawn.position.set(0, PARK_GROUND_Y + 0.012, 24.4);
  parkLawn.receiveShadow = true;
  root.add(parkLawn);

  // =========================================================================
  // 2. FIGURE-8 WALKWAYS, GRAND EAST-WEST PROMENADE & CENTRAL PLAZA
  // =========================================================================
  // Extended North-South Spine Walkway (Shrine at z=4.1 to Expanded Entrance at z=44.8)
  const spineWalkway = new THREE.Mesh(
    track(new THREE.PlaneGeometry(4.4, 41.2)),
    paverMat,
  );
  spineWalkway.rotation.x = -Math.PI / 2;
  spineWalkway.position.set(0, PARK_GROUND_Y + 0.022, 24.4);
  spineWalkway.receiveShadow = true;
  root.add(spineWalkway);

  // Grand East-West Cross Promenade linking Bohyeonsan Starlight Zone (-27.5) <-> Plaza <-> Jeongja/Pergola (+27.5)
  const crossPromenade = new THREE.Mesh(
    track(new THREE.PlaneGeometry(54.0, 3.8)),
    paverMat,
  );
  crossPromenade.rotation.x = -Math.PI / 2;
  crossPromenade.position.set(0, PARK_GROUND_Y + 0.021, 19.0);
  crossPromenade.receiveShadow = true;
  root.add(crossPromenade);

  // West Wing Bohyeonsan Starlight Courtyard paving
  const westStarPlaza = new THREE.Mesh(
    track(new THREE.CircleGeometry(10.8, 36)),
    plazaPaverMat,
  );
  westStarPlaza.rotation.x = -Math.PI / 2;
  westStarPlaza.position.set(-25.4, PARK_GROUND_Y + 0.02, 19.2);
  westStarPlaza.receiveShadow = true;
  root.add(westStarPlaza);

  // East Wing Grape & Pond Garden Courtyard paving
  const eastGardenPlaza = new THREE.Mesh(
    track(new THREE.CircleGeometry(10.4, 36)),
    plazaPaverMat,
  );
  eastGardenPlaza.rotation.x = -Math.PI / 2;
  eastGardenPlaza.position.set(24.6, PARK_GROUND_Y + 0.02, 19.6);
  eastGardenPlaza.receiveShadow = true;
  root.add(eastGardenPlaza);

  // North Entrance Plaza interlocking stone apron (z in [38.2, 45.0])
  const entrancePlaza = new THREE.Mesh(
    track(new THREE.BoxGeometry(11.4, 0.04, 6.8)),
    paverMat,
  );
  entrancePlaza.position.set(0, PARK_GROUND_Y + 0.02, 41.6);
  entrancePlaza.receiveShadow = true;
  root.add(entrancePlaza);

  // Paved walkway apron under management building patio
  const buildingApron = new THREE.Mesh(
    track(new THREE.BoxGeometry(10.8, 0.038, 7.6)),
    paverMat,
  );
  buildingApron.position.set(9.4, PARK_GROUND_Y + 0.019, 32.8);
  buildingApron.receiveShadow = true;
  root.add(buildingApron);

  // Double-Oval / Figure-8 Walkway Rings (North oval z=24.4, South oval z=13.4)
  const addOvalWalkway = (centerZ: number, rxOuter: number, rzOuter: number, rxInner: number, rzInner: number) => {
    const outerPaveGeo = track(new THREE.CircleGeometry(1, 44));
    outerPaveGeo.rotateX(-Math.PI / 2);
    const outerPave = new THREE.Mesh(outerPaveGeo, paverMat);
    outerPave.scale.set(rxOuter, 1, rzOuter);
    outerPave.position.set(0, PARK_GROUND_Y + 0.024, centerZ);
    outerPave.receiveShadow = true;
    root.add(outerPave);

    const islandCurbGeo = track(new THREE.RingGeometry(0.97, 1.03, 44));
    islandCurbGeo.rotateX(-Math.PI / 2);
    const islandCurb = new THREE.Mesh(islandCurbGeo, lightGraniteMat);
    islandCurb.scale.set(rxInner, 1, rzInner);
    islandCurb.position.set(0, PARK_GROUND_Y + 0.032, centerZ);
    islandCurb.receiveShadow = true;
    root.add(islandCurb);

    const islandGeo = track(new THREE.CircleGeometry(1, 44));
    islandGeo.rotateX(-Math.PI / 2);
    const island = new THREE.Mesh(islandGeo, islandGrassMat);
    island.scale.set(rxInner * 0.97, 1, rzInner * 0.97);
    island.position.set(0, PARK_GROUND_Y + 0.036, centerZ);
    island.receiveShadow = true;
    root.add(island);
  };

  addOvalWalkway(24.4, 12.6, 7.8, 8.2, 4.6);
  addOvalWalkway(13.4, 12.6, 7.8, 8.2, 4.6);

  // Central Circular Stone Plaza (z=19.0)
  const centralPlazaCenterZ = 19.0;
  const plazaBase = new THREE.Mesh(
    track(new THREE.CylinderGeometry(5.3, 5.45, 0.07, 40)),
    plazaPaverMat,
  );
  plazaBase.position.set(0, PARK_GROUND_Y + 0.038, centralPlazaCenterZ);
  plazaBase.receiveShadow = true;
  root.add(plazaBase);

  [5.25, 3.65, 1.85].forEach((ringR, idx) => {
    const ringGeo = track(new THREE.RingGeometry(ringR - 0.14, ringR, 40));
    ringGeo.rotateX(-Math.PI / 2);
    const ring = new THREE.Mesh(ringGeo, idx === 1 ? darkGraniteMat : lightGraniteMat);
    ring.position.set(0, PARK_GROUND_Y + 0.076, centralPlazaCenterZ);
    ring.receiveShadow = true;
    root.add(ring);
  });

  // Central Circular Plaza Feature Monument (중앙 석조 기념비)
  const centralMonument = new THREE.Group();
  centralMonument.position.set(0, PARK_GROUND_Y + 0.075, centralPlazaCenterZ);
  root.add(centralMonument);

  const monShadow = new THREE.Mesh(
    track(new THREE.PlaneGeometry(3.4, 3.4)),
    track(
      new THREE.MeshBasicMaterial({
        map: contactShadowTex,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      }),
    ),
  );
  monShadow.rotation.x = -Math.PI / 2;
  monShadow.position.y = 0.01;
  centralMonument.add(monShadow);

  const monStep1 = new THREE.Mesh(track(new THREE.CylinderGeometry(1.35, 1.48, 0.18, 16)), lightGraniteMat);
  monStep1.position.y = 0.09;
  monStep1.castShadow = castShadowFlag;
  monStep1.receiveShadow = true;
  centralMonument.add(monStep1);

  const monStep2 = new THREE.Mesh(track(new THREE.CylinderGeometry(0.95, 1.05, 0.22, 16)), lightGraniteMat);
  monStep2.position.y = 0.28;
  monStep2.castShadow = castShadowFlag;
  monStep2.receiveShadow = true;
  centralMonument.add(monStep2);

  const monPillar = new THREE.Mesh(track(new THREE.CylinderGeometry(0.42, 0.56, 1.15, 12)), lightGraniteMat);
  monPillar.position.y = 0.92;
  monPillar.castShadow = castShadowFlag;
  monPillar.receiveShadow = true;
  centralMonument.add(monPillar);

  const monOrb = new THREE.Mesh(track(new THREE.SphereGeometry(0.46, 18, 14)), darkGraniteMat);
  monOrb.scale.set(1, 1.16, 1);
  monOrb.position.y = 1.82;
  monOrb.castShadow = castShadowFlag;
  monOrb.receiveShadow = true;
  centralMonument.add(monOrb);

  const plazaPointLight = new THREE.PointLight(0xffcf88, 0.4, 18, 1.4);
  plazaPointLight.position.set(0, PARK_GROUND_Y + 3.2, centralPlazaCenterZ);
  root.add(plazaPointLight);

  const shrineApron = new THREE.Mesh(track(new THREE.BoxGeometry(7.2, 0.045, 3.6)), paverMat);
  shrineApron.position.set(0, PARK_GROUND_Y + 0.025, 5.2);
  shrineApron.receiveShadow = true;
  root.add(shrineApron);

  // =========================================================================
  // 3. EXPANDED NORTH ROADSIDE (돌할매로), WIRE FENCE, BOLLARDS & SIGNPOST
  // =========================================================================
  const roadStrip = new THREE.Mesh(track(new THREE.BoxGeometry(92, 0.06, 5.6)), roadAsphaltMat);
  roadStrip.position.set(0, PARK_GROUND_Y - 0.02, 48.0);
  roadStrip.receiveShadow = true;
  root.add(roadStrip);

  const centerRoadLine = new THREE.Mesh(track(new THREE.BoxGeometry(88, 0.015, 0.14)), roadLineMat);
  centerRoadLine.position.set(0, PARK_GROUND_Y + 0.015, 48.0);
  root.add(centerRoadLine);

  const curbStone = new THREE.Mesh(track(new THREE.BoxGeometry(75.6, 0.16, 0.28)), lightGraniteMat);
  curbStone.position.set(0, PARK_GROUND_Y + 0.06, 45.2);
  curbStone.receiveShadow = true;
  root.add(curbStone);

  // 3 Black Cylindrical Bollards at the north park entrance (z = 43.8)
  const bollardGeo = track(new THREE.CylinderGeometry(0.11, 0.115, 0.78, 10));
  const bollardReflectGeo = track(new THREE.CylinderGeometry(0.114, 0.114, 0.07, 10));
  const bollardReflectMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xf4d262,
      emissive: 0x6b5314,
      emissiveIntensity: 0.4,
      roughness: 0.35,
    }),
  );

  [-2.4, -1.0, 0.4].forEach((bx) => {
    const bollard = new THREE.Mesh(bollardGeo, ironMat);
    bollard.position.set(bx, PARK_GROUND_Y + 0.39, 43.8);
    bollard.castShadow = castShadowFlag;
    root.add(bollard);

    const band = new THREE.Mesh(bollardReflectGeo, bollardReflectMat);
    band.position.set(bx, PARK_GROUND_Y + 0.65, 43.8);
    root.add(band);
  });

  // Wooden Park Wayfinding Signpost near Central-North junction (x = 3.2, z = 28.4)
  const wayfinder = new THREE.Group();
  wayfinder.position.set(3.2, PARK_GROUND_Y, 28.4);
  wayfinder.rotation.y = -0.32;
  root.add(wayfinder);

  [-0.55, 0.55].forEach((px) => {
    const p = new THREE.Mesh(track(new THREE.BoxGeometry(0.1, 1.65, 0.1)), trunkMat);
    p.position.set(px, 0.825, 0);
    p.castShadow = castShadowFlag;
    wayfinder.add(p);
  });
  const wfBoard = new THREE.Mesh(track(new THREE.BoxGeometry(1.48, 0.78, 0.08)), trunkMat);
  wfBoard.position.set(0, 1.32, 0);
  wfBoard.castShadow = castShadowFlag;
  wayfinder.add(wfBoard);

  const wfFaceMat = track(new THREE.MeshStandardMaterial({ map: dirSignTex, roughness: 0.65 }));
  const wfFace = new THREE.Mesh(track(new THREE.PlaneGeometry(1.38, 0.68)), wfFaceMat);
  wfFace.position.set(0, 1.32, 0.044);
  wayfinder.add(wfFace);

  // Expanded Green Wire-Mesh Perimeter Fence (x = ±37.2, z = 44.8)
  const fencePanelHeight = 1.18;
  const fenceSegments: Array<{ x1: number; z1: number; x2: number; z2: number }> = [
    { x1: -37.2, z1: 44.8, x2: -3.4, z2: 44.8 },
    { x1: 1.8, z1: 44.8, x2: 37.2, z2: 44.8 },
    { x1: -37.2, z1: 44.8, x2: -37.2, z2: 4.5 },
    { x1: 37.2, z1: 44.8, x2: 37.2, z2: 4.5 },
  ];

  const postPositions: Array<[number, number]> = [];
  fenceSegments.forEach(({ x1, z1, x2, z2 }) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);
    const numBays = Math.max(2, Math.round(len / 2.6));

    const panelGeo = track(new THREE.PlaneGeometry(len, fencePanelHeight));
    const panel = new THREE.Mesh(panelGeo, wireFenceMeshMat);
    panel.position.set((x1 + x2) / 2, PARK_GROUND_Y + fencePanelHeight / 2 + 0.08, (z1 + z2) / 2);
    panel.rotation.y = angle + Math.PI / 2;
    root.add(panel);

    const topRailGeo = track(new THREE.BoxGeometry(0.045, 0.045, len));
    const topRail = new THREE.Mesh(topRailGeo, wireFencePostMat);
    topRail.position.set((x1 + x2) / 2, PARK_GROUND_Y + fencePanelHeight + 0.08, (z1 + z2) / 2);
    topRail.rotation.y = angle;
    root.add(topRail);

    for (let i = 0; i <= numBays; i++) {
      const t = i / numBays;
      postPositions.push([x1 + dx * t, z1 + dz * t]);
    }
  });

  const fencePostGeo = track(new THREE.CylinderGeometry(0.04, 0.045, fencePanelHeight + 0.16, 6));
  const fencePostInst = new THREE.InstancedMesh(fencePostGeo, wireFencePostMat, postPositions.length);
  postPositions.forEach(([px, pz], idx) => {
    dummy.position.set(px, PARK_GROUND_Y + (fencePanelHeight + 0.16) / 2, pz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    fencePostInst.setMatrixAt(idx, dummy.matrix);
  });
  fencePostInst.instanceMatrix.needsUpdate = true;
  fencePostInst.computeBoundingSphere();
  root.add(fencePostInst);

  // Boxwood Shrubs (회양목) along expanded perimeter, entrance mound & garden borders (1 InstancedMesh)
  const shrubCoords: Array<[number, number, number]> = [];
  for (let x = -35.8; x <= -4.4; x += 2.1) {
    shrubCoords.push([x, 43.9, 0.46 + ((Math.abs(x) * 1.3) % 0.14)]);
  }
  for (let x = 3.0; x <= 35.8; x += 2.1) {
    shrubCoords.push([x, 43.9, 0.46 + ((x * 1.1) % 0.14)]);
  }
  for (let z = 6.5; z <= 42.5; z += 2.6) {
    shrubCoords.push([-36.2, z, 0.48 + (z % 0.12)]);
    shrubCoords.push([36.2, z, 0.48 + ((z + 0.5) % 0.12)]);
  }
  // Ring around entrance grass mound (-10.4, 31.4)
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    shrubCoords.push([-10.4 + Math.cos(a) * 3.15, 31.4 + Math.sin(a) * 3.15, 0.42 + (i % 3) * 0.06]);
  }
  // Decorative shrubs framing West Starlight Zone & East Vineyard
  [
    [-16.2, 14.5, 0.55],
    [-16.2, 23.5, 0.55],
    [-21.2, 27.8, 0.52],
    [-29.5, 27.5, 0.58],
    [16.8, 25.4, 0.52],
    [17.4, 12.2, 0.54],
    [32.2, 22.8, 0.58],
    [32.4, 13.8, 0.56],
  ].forEach(([sx, sz, s]) => shrubCoords.push([sx, sz, s]));

  const shrubGeo = track(new THREE.DodecahedronGeometry(0.55, 1));
  const shrubInst = new THREE.InstancedMesh(shrubGeo, shrubMat, shrubCoords.length);
  shrubCoords.forEach(([sx, sz, s], idx) => {
    dummy.position.set(sx, PARK_GROUND_Y + s * 0.42, sz);
    dummy.rotation.set(0, idx * 0.9, 0);
    dummy.scale.set(s * 1.45, s * 0.98, s * 1.38);
    dummy.updateMatrix();
    shrubInst.setMatrixAt(idx, dummy.matrix);
    tempColor.setHSL(0.3 + (idx % 4) * 0.014, 0.36, 0.31 + (idx % 3) * 0.035);
    shrubInst.setColorAt(idx, tempColor);
  });
  shrubInst.instanceMatrix.needsUpdate = true;
  if (shrubInst.instanceColor) shrubInst.instanceColor.needsUpdate = true;
  shrubInst.receiveShadow = true;
  shrubInst.computeBoundingSphere();
  root.add(shrubInst);

  // Classic Park Streetlamps (16 lamps rendered via 5 InstancedMeshes instead of 80 meshes!)
  const streetlampCoords: Array<[number, number]> = [
    [-4.2, 43.2],
    [2.6, 43.2],
    [-15.5, 43.2],
    [15.5, 43.2],
    [-28.5, 43.2],
    [28.5, 43.2],
    [-11.8, 25.0],
    [11.8, 25.0],
    [-11.8, 12.6],
    [11.8, 12.6],
    [-21.0, 26.2],
    [-21.0, 12.4],
    [-33.5, 24.5],
    [21.0, 29.0],
    [32.5, 25.2],
    [32.5, 12.2],
  ];
  const lampCount = streetlampCoords.length;
  const lampBaseInst = new THREE.InstancedMesh(track(new THREE.CylinderGeometry(0.14, 0.18, 0.36, 8)), ironMat, lampCount);
  const lampPoleInst = new THREE.InstancedMesh(track(new THREE.CylinderGeometry(0.055, 0.085, 3.2, 8)), ironMat, lampCount);
  const lampNeckInst = new THREE.InstancedMesh(track(new THREE.CylinderGeometry(0.09, 0.055, 0.14, 8)), ironMat, lampCount);
  const lampGlobeInst = new THREE.InstancedMesh(track(new THREE.SphereGeometry(0.21, 10, 8)), sharedLampBulbMat, lampCount);
  const lampHatInst = new THREE.InstancedMesh(track(new THREE.ConeGeometry(0.27, 0.14, 10)), ironMat, lampCount);

  streetlampCoords.forEach(([lx, lz], idx) => {
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1);

    dummy.position.set(lx, PARK_GROUND_Y + 0.18, lz);
    dummy.updateMatrix();
    lampBaseInst.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(lx, PARK_GROUND_Y + 1.75, lz);
    dummy.updateMatrix();
    lampPoleInst.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(lx, PARK_GROUND_Y + 3.38, lz);
    dummy.updateMatrix();
    lampNeckInst.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(lx, PARK_GROUND_Y + 3.58, lz);
    dummy.updateMatrix();
    lampGlobeInst.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(lx, PARK_GROUND_Y + 3.78, lz);
    dummy.updateMatrix();
    lampHatInst.setMatrixAt(idx, dummy.matrix);
  });
  [lampBaseInst, lampPoleInst, lampNeckInst, lampGlobeInst, lampHatInst].forEach((inst) => {
    inst.instanceMatrix.needsUpdate = true;
    inst.computeBoundingSphere();
    root.add(inst);
  });
  lampPoleInst.castShadow = castShadowFlag;

  // =========================================================================
  // 4. LEFT ENTRANCE: CIRCULAR GRASS MOUND, SHADE TREE & "돌할매 공원" MONUMENT
  // =========================================================================
  const moundGroup = new THREE.Group();
  moundGroup.position.set(-10.4, PARK_GROUND_Y, 31.4);
  root.add(moundGroup);

  const moundMesh = new THREE.Mesh(
    track(new THREE.SphereGeometry(3.2, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5)),
    islandGrassMat,
  );
  moundMesh.scale.set(1.0, 0.28, 1.0);
  moundMesh.receiveShadow = true;
  moundGroup.add(moundMesh);

  const shadeTrunk = new THREE.Mesh(track(new THREE.CylinderGeometry(0.2, 0.28, 2.7, 8)), trunkMat);
  shadeTrunk.position.set(-0.7, 1.85, -0.5);
  shadeTrunk.castShadow = castShadowFlag;
  moundGroup.add(shadeTrunk);

  const shadeCrownGeo = track(new THREE.DodecahedronGeometry(1.45, 1));
  [
    [-0.7, 3.5, -0.5, 1.15],
    [-1.4, 3.1, -0.1, 0.85],
    [0.1, 3.2, -0.8, 0.9],
    [-0.6, 4.1, -0.4, 0.88],
  ].forEach(([cx, cy, cz, cs], idx) => {
    const crown = new THREE.Mesh(shadeCrownGeo, idx % 2 === 0 ? leafMatA : leafMatB);
    crown.position.set(cx, cy, cz);
    crown.scale.set(cs * 1.1, cs * 0.88, cs * 1.1);
    crown.castShadow = castShadowFlag;
    crown.receiveShadow = true;
    moundGroup.add(crown);
  });

  const signMonument = new THREE.Group();
  signMonument.position.set(1.35, 0.52, 1.35);
  signMonument.rotation.y = 0.55;
  moundGroup.add(signMonument);

  const signBase = new THREE.Mesh(track(new THREE.BoxGeometry(1.75, 0.34, 0.72)), lightGraniteMat);
  signBase.position.y = 0.17;
  signBase.castShadow = castShadowFlag;
  signBase.receiveShadow = true;
  signMonument.add(signBase);

  const signBody = new THREE.Mesh(track(new THREE.BoxGeometry(1.42, 1.32, 0.44)), darkGraniteMat);
  signBody.position.y = 0.96;
  signBody.castShadow = castShadowFlag;
  signBody.receiveShadow = true;
  signMonument.add(signBody);

  const signFaceMat = track(
    new THREE.MeshStandardMaterial({
      map: parkSignTex,
      roughness: 0.38,
      metalness: 0.08,
    }),
  );
  const signFace = new THREE.Mesh(track(new THREE.PlaneGeometry(1.28, 1.18)), signFaceMat);
  signFace.position.set(0, 0.96, 0.225);
  signMonument.add(signFace);

  // =========================================================================
  // 5. RIGHT ENTRANCE: MANAGEMENT BUILDING (관리동) & INSTANCED BALUSTRADE
  // =========================================================================
  const mgmtGroup = new THREE.Group();
  mgmtGroup.position.set(9.4, PARK_GROUND_Y, 32.8);
  root.add(mgmtGroup);

  const bPlinth = new THREE.Mesh(track(new THREE.BoxGeometry(8.8, 0.28, 5.2)), lightGraniteMat);
  bPlinth.position.y = 0.14;
  bPlinth.receiveShadow = true;
  bPlinth.castShadow = castShadowFlag;
  mgmtGroup.add(bPlinth);

  const bMainWalls = new THREE.Mesh(track(new THREE.BoxGeometry(8.3, 2.75, 4.7)), buildingWhiteMat);
  bMainWalls.position.y = 1.65;
  bMainWalls.castShadow = castShadowFlag;
  bMainWalls.receiveShadow = true;
  mgmtGroup.add(bMainWalls);

  const bDarkTrim = new THREE.Mesh(track(new THREE.BoxGeometry(8.55, 0.62, 4.95)), buildingDarkMat);
  bDarkTrim.position.y = 2.95;
  bDarkTrim.castShadow = castShadowFlag;
  mgmtGroup.add(bDarkTrim);

  const bRoof = new THREE.Mesh(track(new THREE.BoxGeometry(9.0, 0.18, 5.4)), buildingDarkMat);
  bRoof.position.y = 3.34;
  bRoof.rotation.x = 0.04;
  bRoof.castShadow = castShadowFlag;
  mgmtGroup.add(bRoof);

  const doorMat = track(new THREE.MeshStandardMaterial({ color: 0x3b3026, roughness: 0.6, metalness: 0.1 }));
  const windowMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x425666,
      emissive: 0x3a2e18,
      emissiveIntensity: 0.25,
      roughness: 0.25,
      metalness: 0.35,
    }),
  );

  const awningGeo = track(new THREE.CylinderGeometry(0.95, 0.95, 2.2, 14, 1, true, 0, Math.PI * 0.45));
  [-1.9, 1.9].forEach((dx) => {
    const door = new THREE.Mesh(track(new THREE.BoxGeometry(1.15, 2.05, 0.08)), doorMat);
    door.position.set(dx, 1.3, -2.35);
    mgmtGroup.add(door);

    const win = new THREE.Mesh(track(new THREE.BoxGeometry(1.0, 0.9, 0.08)), windowMat);
    win.position.set(dx * 0.15, 1.75, -2.35);
    mgmtGroup.add(win);

    const awning = new THREE.Mesh(awningGeo, silverAwningMat);
    awning.rotation.z = Math.PI / 2;
    awning.rotation.y = Math.PI / 2;
    awning.position.set(dx, 1.85, -2.32);
    mgmtGroup.add(awning);
  });

  const sideWin = new THREE.Mesh(track(new THREE.BoxGeometry(0.08, 1.05, 1.7)), windowMat);
  sideWin.position.set(-4.16, 1.75, 0);
  mgmtGroup.add(sideWin);

  const sideAwning = new THREE.Mesh(awningGeo, silverAwningMat);
  sideAwning.rotation.x = Math.PI / 2;
  sideAwning.rotation.z = -Math.PI / 2;
  sideAwning.position.set(-4.15, 1.85, 0);
  mgmtGroup.add(sideAwning);

  // White Granite Park Balustrade (InstancedMesh for posts, caps & balusters)
  const balSegments: Array<[number, number, number, number]> = [
    [3.8, 35.4, 3.8, 25.4],
    [3.8, 12.2, 3.8, 5.2],
  ];
  const parkBalPosts: Array<[number, number]> = [];
  const parkBalBars: Array<[number, number]> = [];

  balSegments.forEach(([x1, z1, x2, z2]) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);
    const segGroup = new THREE.Group();
    segGroup.position.set(x1, PARK_GROUND_Y, z1);
    segGroup.rotation.y = angle;

    const topRail = new THREE.Mesh(track(new THREE.BoxGeometry(0.11, 0.08, len)), lightGraniteMat);
    topRail.position.set(0, 0.64, len / 2);
    segGroup.add(topRail);

    const botRail = new THREE.Mesh(track(new THREE.BoxGeometry(0.12, 0.08, len)), lightGraniteMat);
    botRail.position.set(0, 0.14, len / 2);
    segGroup.add(botRail);
    root.add(segGroup);

    const numPosts = Math.max(2, Math.round(len / 2.6) + 1);
    for (let p = 0; p < numPosts; p++) {
      const t = p / (numPosts - 1);
      parkBalPosts.push([x1 + dx * t, z1 + dz * t]);
    }
    const numBals = Math.floor(len / 0.44);
    for (let b = 1; b < numBals; b++) {
      const t = b / numBals;
      parkBalBars.push([x1 + dx * t, z1 + dz * t]);
    }
  });

  const balPostInst = new THREE.InstancedMesh(track(new THREE.BoxGeometry(0.16, 0.72, 0.16)), lightGraniteMat, parkBalPosts.length);
  const balCapInst = new THREE.InstancedMesh(track(new THREE.SphereGeometry(0.11, 8, 6)), lightGraniteMat, parkBalPosts.length);
  parkBalPosts.forEach(([px, pz], idx) => {
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1);
    dummy.position.set(px, PARK_GROUND_Y + 0.36, pz);
    dummy.updateMatrix();
    balPostInst.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(px, PARK_GROUND_Y + 0.78, pz);
    dummy.updateMatrix();
    balCapInst.setMatrixAt(idx, dummy.matrix);
  });
  balPostInst.instanceMatrix.needsUpdate = true;
  balCapInst.instanceMatrix.needsUpdate = true;
  balPostInst.computeBoundingSphere();
  balCapInst.computeBoundingSphere();
  root.add(balPostInst, balCapInst);

  const balBarInst = new THREE.InstancedMesh(track(new THREE.CylinderGeometry(0.04, 0.045, 0.44, 6)), lightGraniteMat, parkBalBars.length);
  parkBalBars.forEach(([bx, bz], idx) => {
    dummy.position.set(bx, PARK_GROUND_Y + 0.39, bz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    balBarInst.setMatrixAt(idx, dummy.matrix);
  });
  balBarInst.instanceMatrix.needsUpdate = true;
  balBarInst.computeBoundingSphere();
  root.add(balBarInst);

  // =========================================================================
  // 6. EXPANDED LUSH PARK TREES, WILDFLOWERS, GRANITE BENCHES & CAIRNS (INSTANCED!)
  // =========================================================================
  // 34 park trees across Center, North Promenade, West Starlight Zone & East Garden (only 2 draw calls!)
  // Third element = scale, Fourth = tint ('green' | 'blossom' | 'gold')
  const parkTreeConfigs: Array<[number, number, number, 'green' | 'blossom' | 'gold']> = [
    // Center lawn islands (wide open central vista framing Dolhalmae Shrine)
    [-5.4, 24.8, 0.96, 'green'],
    [5.6, 24.6, 0.94, 'green'],
    [-7.8, 24.0, 0.88, 'blossom'],
    [7.8, 24.0, 0.9, 'green'],
    [-5.2, 13.4, 0.98, 'green'],
    [5.2, 13.2, 0.96, 'gold'],
    [-7.6, 13.6, 0.88, 'green'],
    [7.6, 13.6, 0.9, 'blossom'],
    // North expanded promenade & entrance flanks
    [-19.5, 39.2, 1.18, 'blossom'],
    [-29.5, 39.5, 1.24, 'green'],
    [-12.2, 40.2, 1.08, 'gold'],
    [12.5, 40.0, 1.1, 'blossom'],
    [22.4, 39.4, 1.2, 'green'],
    [31.8, 39.0, 1.26, 'gold'],
    // West Wing perimeter framing Bohyeonsan Starlight Experience Zone
    [-17.5, 31.8, 1.15, 'green'],
    [-25.5, 33.4, 1.22, 'blossom'],
    [-33.6, 32.8, 1.25, 'green'],
    [-34.2, 23.5, 1.18, 'gold'],
    [-34.4, 10.6, 1.26, 'green'],
    [-25.8, 8.2, 1.18, 'green'],
    [-15.4, 8.2, 1.16, 'blossom'],
    // East Wing perimeter framing Yeongcheon Grape Pergola & Jeongja Pond
    [17.8, 32.6, 1.12, 'green'],
    [27.2, 33.8, 1.2, 'blossom'],
    [33.8, 31.4, 1.22, 'gold'],
    [34.2, 22.8, 1.18, 'green'],
    [34.2, 10.8, 1.25, 'blossom'],
    [24.2, 7.8, 1.14, 'green'],
    [15.4, 8.2, 1.18, 'gold'],
  ];

  const decTrunkGeo = track(new THREE.CylinderGeometry(0.14, 0.21, 2.3, 7));
  const decCrownGeo = track(new THREE.DodecahedronGeometry(1.1, 1));
  const treeTrunkInst = new THREE.InstancedMesh(decTrunkGeo, trunkMat, parkTreeConfigs.length);
  const treeCrownInst = new THREE.InstancedMesh(decCrownGeo, foliageInstMat, parkTreeConfigs.length * 3);

  const crownOffsets: Array<[number, number, number, number]> = [
    [0, 2.65, 0, 1.1],
    [-0.55, 2.3, 0.35, 0.8],
    [0.52, 2.35, -0.3, 0.82],
  ];

  let crownIdx = 0;
  parkTreeConfigs.forEach(([tx, tz, sc, tint], idx) => {
    dummy.position.set(tx, PARK_GROUND_Y + 1.15 * sc, tz);
    dummy.rotation.set(0, idx * 0.6, 0);
    dummy.scale.setScalar(sc);
    dummy.updateMatrix();
    treeTrunkInst.setMatrixAt(idx, dummy.matrix);

    crownOffsets.forEach(([cx, cy, cz, cs], cSub) => {
      dummy.position.set(tx + cx * sc, PARK_GROUND_Y + cy * sc, tz + cz * sc);
      dummy.rotation.set(0, idx * 1.1 + cSub, 0);
      dummy.scale.set(cs * 1.12 * sc, cs * 0.85 * sc, cs * 1.12 * sc);
      dummy.updateMatrix();
      treeCrownInst.setMatrixAt(crownIdx, dummy.matrix);

      if (tint === 'blossom') {
        tempColor.setHSL(0.95, 0.56, 0.74 + (cSub % 2) * 0.04); // Warm Yeongcheon cherry/peach blossom
      } else if (tint === 'gold') {
        tempColor.setHSL(0.11, 0.62, 0.52 + (cSub % 2) * 0.05); // Autumn golden maple/ginkgo
      } else {
        tempColor.setHSL(0.28 + (idx % 3) * 0.015, 0.38, 0.34 + (cSub % 2) * 0.04);
      }
      treeCrownInst.setColorAt(crownIdx, tempColor);
      crownIdx++;
    });
  });
  treeTrunkInst.instanceMatrix.needsUpdate = true;
  treeCrownInst.instanceMatrix.needsUpdate = true;
  if (treeCrownInst.instanceColor) treeCrownInst.instanceColor.needsUpdate = true;
  treeTrunkInst.castShadow = castShadowFlag;
  treeCrownInst.castShadow = castShadowFlag;
  treeCrownInst.receiveShadow = true;
  treeTrunkInst.computeBoundingSphere();
  treeCrownInst.computeBoundingSphere();
  root.add(treeTrunkInst, treeCrownInst);

  // Wildflower Clusters scattered around lawns & scenic gardens (1 InstancedMesh: 96 blooms!)
  const flowerGeo = track(new THREE.DodecahedronGeometry(0.16, 0));
  const flowerMat = track(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.78 }));
  const flowerCount = 96;
  const flowerInst = new THREE.InstancedMesh(flowerGeo, flowerMat, flowerCount);
  const flowerPalette = [0xf4a8c4, 0xffe078, 0xf2f0ff, 0xd8a8f7, 0xff9e7d];
  const flowerZones: Array<[number, number, number]> = [
    [-19.5, 29.0, 4.5],
    [-28.0, 29.5, 4.0],
    [19.5, 30.2, 4.5],
    [29.5, 29.5, 4.0],
    [-19.0, 10.5, 3.8],
    [19.0, 10.2, 3.8],
    [-5.8, 24.6, 2.2],
    [5.8, 13.4, 2.2],
  ];
  for (let i = 0; i < flowerCount; i++) {
    const z = flowerZones[i % flowerZones.length];
    const angle = i * 2.399;
    const rad = ((i * 0.618) % 1) * z[2];
    const fx = z[0] + Math.cos(angle) * rad;
    const fz = z[1] + Math.sin(angle) * rad;
    dummy.position.set(fx, PARK_GROUND_Y + 0.14, fz);
    dummy.rotation.set(0, angle, 0);
    dummy.scale.set(1.1, 0.75, 1.1);
    dummy.updateMatrix();
    flowerInst.setMatrixAt(i, dummy.matrix);
    tempColor.setHex(flowerPalette[i % flowerPalette.length]);
    flowerInst.setColorAt(i, tempColor);
  }
  flowerInst.instanceMatrix.needsUpdate = true;
  if (flowerInst.instanceColor) flowerInst.instanceColor.needsUpdate = true;
  flowerInst.computeBoundingSphere();
  root.add(flowerInst);

  // Granite Park Benches (10 benches via 2 InstancedMeshes!)
  const benchConfigs: Array<[number, number, number]> = [
    [-4.3, 21.8, Math.PI * 0.25],
    [4.3, 21.8, -Math.PI * 0.25],
    [-4.3, 16.2, -Math.PI * 0.25],
    [4.3, 16.2, Math.PI * 0.25],
    [-19.0, 26.5, 0.22],
    [19.0, 26.5, -0.22],
    [-19.0, 11.8, -0.25],
    [19.0, 11.8, 0.25],
    [-6.2, 39.2, 0],
    [6.2, 39.2, 0],
  ];
  const benchSeatInst = new THREE.InstancedMesh(track(new THREE.BoxGeometry(1.55, 0.1, 0.48)), lightGraniteMat, benchConfigs.length);
  const benchLegInst = new THREE.InstancedMesh(track(new THREE.BoxGeometry(0.18, 0.36, 0.42)), lightGraniteMat, benchConfigs.length * 2);
  benchConfigs.forEach(([bx, bz, ry], idx) => {
    dummy.position.set(bx, PARK_GROUND_Y + 0.41, bz);
    dummy.rotation.set(0, ry, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    benchSeatInst.setMatrixAt(idx, dummy.matrix);

    const cos = Math.cos(ry);
    const sin = Math.sin(ry);
    [-0.52, 0.52].forEach((lx, legSub) => {
      dummy.position.set(bx + lx * cos, PARK_GROUND_Y + 0.18, bz - lx * sin);
      dummy.rotation.set(0, ry, 0);
      dummy.updateMatrix();
      benchLegInst.setMatrixAt(idx * 2 + legSub, dummy.matrix);
    });
  });
  benchSeatInst.instanceMatrix.needsUpdate = true;
  benchLegInst.instanceMatrix.needsUpdate = true;
  benchSeatInst.castShadow = castShadowFlag;
  benchSeatInst.receiveShadow = true;
  benchSeatInst.computeBoundingSphere();
  benchLegInst.computeBoundingSphere();
  root.add(benchSeatInst, benchLegInst);

  // Stacked Stone Wish Cairns (돌탑, 6 cairns = 30 stones in 1 InstancedMesh!)
  const cairnRockGeo = track(new THREE.DodecahedronGeometry(0.28, 1));
  const parkCairns: Array<[number, number]> = [
    [-5.2, 24.4],
    [5.2, 24.4],
    [-5.2, 13.4],
    [5.2, 13.4],
    [-18.5, 11.2],
    [18.5, 11.2],
  ];
  const cairnInst = new THREE.InstancedMesh(cairnRockGeo, lightGraniteMat, parkCairns.length * 5);
  let cairnIdx = 0;
  parkCairns.forEach(([cx, cz], cIdx) => {
    let yOff = 0.08;
    for (let layer = 0; layer < 5; layer++) {
      const s = 1.0 - layer * 0.15;
      dummy.position.set(
        cx + Math.sin(layer + cIdx) * 0.02,
        PARK_GROUND_Y + yOff,
        cz + Math.cos(layer + cIdx) * 0.02,
      );
      dummy.rotation.set(0, layer * 0.7 + cIdx, 0);
      dummy.scale.set(s * 1.25, s * 0.48, s * 1.15);
      dummy.updateMatrix();
      cairnInst.setMatrixAt(cairnIdx++, dummy.matrix);
      yOff += 0.23 * s;
    }
  });
  cairnInst.instanceMatrix.needsUpdate = true;
  cairnInst.receiveShadow = true;
  cairnInst.computeBoundingSphere();
  root.add(cairnInst);

  // =========================================================================
  // 7. 12 CHINESE ZODIAC GRANITE STATUES (십이지신상)
  // =========================================================================
  const zodiacRig = buildZodiacStatuesGroup(
    lightGraniteMat,
    lightGraniteMat,
    contactShadowTex,
    anisotropy,
    castShadowFlag,
  );
  root.add(zodiacRig.group);

  // =========================================================================
  // 8. WEST WING: BOHYEONSAN STARLIGHT EXPERIENCE ZONE & EAST WING GARDEN
  // =========================================================================
  const starlightRig = buildStarlightZone(
    lightGraniteMat,
    darkGraniteMat,
    anisotropy,
    castShadowFlag,
  );
  root.add(starlightRig.group);

  const eastGardenRig = buildEastGarden(
    lightGraniteMat,
    darkGraniteMat,
    trunkMat,
    leafMatA,
    castShadowFlag,
  );
  root.add(eastGardenRig.group);

  // =========================================================================
  // 9. SOUTH HILLSIDE: DENSE PINE & BAMBOO GROVE + MT. GWANSAN/BOHYEONSAN PEAKS
  // =========================================================================
  const bambooCulmCoords: Array<[number, number, number]> = [];
  for (let i = 0; i < 84; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const bx = side * (6.2 + ((i * 1.85) % 28.5));
    const bz = -2.2 - ((i * 1.75) % 11.5);
    bambooCulmCoords.push([bx, bz, 0.85 + (i % 4) * 0.15]);
  }
  const bambooGeo = track(new THREE.CylinderGeometry(0.068, 0.088, 5.4, 6));
  const bambooInst = new THREE.InstancedMesh(bambooGeo, bambooMat, bambooCulmCoords.length);
  bambooCulmCoords.forEach(([bx, bz, sc], idx) => {
    dummy.position.set(bx, PARK_GROUND_Y + 2.7 * sc, bz);
    dummy.rotation.set(Math.sin(idx) * 0.05, idx * 0.5, Math.cos(idx) * 0.04);
    dummy.scale.set(1, sc, 1);
    dummy.updateMatrix();
    bambooInst.setMatrixAt(idx, dummy.matrix);
  });
  bambooInst.instanceMatrix.needsUpdate = true;
  bambooInst.computeBoundingSphere();
  root.add(bambooInst);

  const bambooLeafGeo = track(new THREE.DodecahedronGeometry(0.88, 0));
  const bambooLeafInst = new THREE.InstancedMesh(bambooLeafGeo, leafMatB, bambooCulmCoords.length * 2);
  bambooCulmCoords.forEach(([bx, bz, sc], idx) => {
    dummy.position.set(bx, PARK_GROUND_Y + 4.35 * sc, bz);
    dummy.rotation.set(0, idx * 0.8, 0);
    dummy.scale.set(1.25, 0.65, 1.25);
    dummy.updateMatrix();
    bambooLeafInst.setMatrixAt(idx * 2, dummy.matrix);

    dummy.position.set(bx + 0.15, PARK_GROUND_Y + 5.2 * sc, bz - 0.1);
    dummy.rotation.set(0, idx * 1.3, 0);
    dummy.scale.set(1.05, 0.6, 1.05);
    dummy.updateMatrix();
    bambooLeafInst.setMatrixAt(idx * 2 + 1, dummy.matrix);
  });
  bambooLeafInst.instanceMatrix.needsUpdate = true;
  bambooLeafInst.computeBoundingSphere();
  root.add(bambooLeafInst);

  // Korean red pines along the expanded south & side hillsides (2 InstancedMeshes!)
  const hillPineCoords: Array<[number, number, number, number]> = [
    [-11.5, 0.2, -5.8, 1.45],
    [11.8, 0.2, -5.6, 1.4],
    [-16.2, 0.5, -8.5, 1.6],
    [16.4, 0.45, -8.2, 1.55],
    [-24.5, 0.6, -7.8, 1.65],
    [24.8, 0.55, -7.5, 1.6],
    [-33.5, 0.5, -5.2, 1.55],
    [33.8, 0.5, -5.4, 1.5],
    [-7.5, 0.7, -9.8, 1.65],
    [7.8, 0.75, -10.2, 1.6],
    [0.2, 1.2, -12.5, 1.75],
    [-39.8, 0.4, 8.2, 1.45],
    [39.8, 0.4, 8.5, 1.45],
    [-40.5, 0.6, 22.0, 1.5],
    [40.5, 0.6, 22.0, 1.5],
    [-40.2, 0.5, 35.0, 1.45],
    [40.2, 0.5, 35.0, 1.45],
  ];
  const hillTrunkInst = new THREE.InstancedMesh(track(new THREE.CylinderGeometry(0.16, 0.23, 3.8, 7)), trunkMat, hillPineCoords.length);
  const hillCrownInst = new THREE.InstancedMesh(track(new THREE.DodecahedronGeometry(1.3, 1)), pineNeedleMat, hillPineCoords.length);
  hillPineCoords.forEach(([px, py, pz, sc], idx) => {
    dummy.position.set(px, py + 1.8 * sc, pz);
    dummy.rotation.set(0, idx * 0.5, Math.sin(idx) * 0.08);
    dummy.scale.setScalar(sc);
    dummy.updateMatrix();
    hillTrunkInst.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(px, py + 3.85 * sc, pz);
    dummy.rotation.set(0, idx * 0.7, 0);
    dummy.scale.set(1.35 * sc, 0.52 * sc, 1.3 * sc);
    dummy.updateMatrix();
    hillCrownInst.setMatrixAt(idx, dummy.matrix);
  });
  hillTrunkInst.instanceMatrix.needsUpdate = true;
  hillCrownInst.instanceMatrix.needsUpdate = true;
  hillTrunkInst.computeBoundingSphere();
  hillCrownInst.computeBoundingSphere();
  root.add(hillTrunkInst, hillCrownInst);

  // Distant Mt. Gwansan & Bohyeonsan mountain horizon ring (1 InstancedMesh!)
  const mountainMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x35423b,
      roughness: 0.96,
      metalness: 0.0,
    }),
  );
  const mountainCount = 18;
  const mountainInst = new THREE.InstancedMesh(track(new THREE.ConeGeometry(25, 19, 7)), mountainMat, mountainCount);
  for (let i = 0; i < mountainCount; i++) {
    const angle = (i / mountainCount) * Math.PI * 2;
    const dist = 78 + (i % 3) * 12;
    dummy.position.set(Math.cos(angle) * dist, 5.2 + (i % 2) * 3.2, 20 + Math.sin(angle) * dist);
    dummy.rotation.set(0, i * 0.5, 0);
    dummy.scale.set(1.35 + (i % 3) * 0.25, 0.95 + (i % 4) * 0.2, 1.18);
    dummy.updateMatrix();
    mountainInst.setMatrixAt(i, dummy.matrix);
  }
  mountainInst.instanceMatrix.needsUpdate = true;
  mountainInst.computeBoundingSphere();
  root.add(mountainInst);

  return {
    root,
    lampBulbMaterials: [sharedLampBulbMat, eastGardenRig.lanternGlowMaterial],
    plazaPointLight,
    zodiacRaycastMeshes: zodiacRig.raycastMeshes,
    starlightRig,
    dispose: () => {
      zodiacRig.dispose();
      starlightRig.dispose();
      eastGardenRig.dispose();
      disposables.forEach((d) => d.dispose());
    },
  };
}
