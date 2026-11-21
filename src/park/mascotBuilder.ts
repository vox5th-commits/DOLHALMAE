import * as THREE from 'three';
import type { MascotId } from './parkLayout';

export interface MascotRig {
  id: MascotId;
  root: THREE.Group;
  bodyPivot: THREE.Group;
  headGroup: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  animate: (
    speedRatio: number,
    walkPhase: number,
    idleTime: number,
    jumpHeightAboveGround?: number,
    verticalVelocity?: number,
    squashY?: number,
    squashXZ?: number,
  ) => void;
  dispose: () => void;
}

interface SharedMascotAssets {
  legGeo: THREE.CapsuleGeometry;
  footGeo: THREE.SphereGeometry;
  torsoGeo: THREE.SphereGeometry;
  btnGeo: THREE.SphereGeometry;
  collarGeo: THREE.TorusGeometry;
  bowKnotGeo: THREE.SphereGeometry;
  bowWingGeo: THREE.ConeGeometry;
  armGeo: THREE.CapsuleGeometry;
  handGeo: THREE.SphereGeometry;
  starGeo: THREE.ExtrudeGeometry;
  backHoodGeo: THREE.SphereGeometry;
  faceGeo: THREE.SphereGeometry;
  cheekGeo: THREE.SphereGeometry;
  eyeGeo: THREE.SphereGeometry;
  glintGeo: THREE.SphereGeometry;
  smileGeo: THREE.TubeGeometry;
  byeoriCurlGeo: THREE.TubeGeometry;
  byeoriCurlTipGeo: THREE.SphereGeometry;
  bichiBangGeo: THREE.CapsuleGeometry;
  shadowGeo: THREE.PlaneGeometry;
  skinMat: THREE.MeshStandardMaterial;
  cheekMat: THREE.MeshStandardMaterial;
  hairMat: THREE.MeshStandardMaterial;
  bowMat: THREE.MeshStandardMaterial;
  eyeMat: THREE.MeshStandardMaterial;
  whiteGlintMat: THREE.MeshBasicMaterial;
  buttonMat: THREE.MeshStandardMaterial;
  byeoriHoodMat: THREE.MeshStandardMaterial;
  byeoriSuitMat: THREE.MeshStandardMaterial;
  byeoriShoeMat: THREE.MeshStandardMaterial;
  bichiHoodMat: THREE.MeshStandardMaterial;
  bichiSuitMat: THREE.MeshStandardMaterial;
  bichiShoeMat: THREE.MeshStandardMaterial;
}

let cachedAssets: SharedMascotAssets | null = null;

function createStarShape(outerR: number, innerR: number): THREE.Shape {
  const shape = new THREE.Shape();
  const points = 5;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = Math.PI / 2 + (i * Math.PI) / points;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function getSharedMascotAssets(): SharedMascotAssets {
  if (cachedAssets) return cachedAssets;

  const starShape = createStarShape(0.47, 0.28);
  const starGeo = new THREE.ExtrudeGeometry(starShape, {
    depth: 0.22,
    bevelEnabled: true,
    bevelThickness: 0.07,
    bevelSize: 0.055,
    bevelSegments: 3,
    curveSegments: 6,
  });
  starGeo.center();

  const smileCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.042, -0.045, 0.278),
    new THREE.Vector3(0, -0.065, 0.284),
    new THREE.Vector3(0.042, -0.045, 0.278),
  ]);

  const curlCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.04, 0.155, 0.235),
    new THREE.Vector3(0.02, 0.195, 0.255),
    new THREE.Vector3(0.065, 0.145, 0.245),
    new THREE.Vector3(0.015, 0.115, 0.255),
  ]);

  cachedAssets = {
    legGeo: new THREE.CapsuleGeometry(0.085, 0.14, 5, 10),
    footGeo: new THREE.SphereGeometry(0.095, 10, 8),
    torsoGeo: new THREE.SphereGeometry(0.245, 18, 14),
    btnGeo: new THREE.SphereGeometry(0.022, 8, 6),
    collarGeo: new THREE.TorusGeometry(0.14, 0.025, 8, 16),
    bowKnotGeo: new THREE.SphereGeometry(0.032, 8, 6),
    bowWingGeo: new THREE.ConeGeometry(0.055, 0.095, 8),
    armGeo: new THREE.CapsuleGeometry(0.068, 0.13, 5, 8),
    handGeo: new THREE.SphereGeometry(0.066, 8, 6),
    starGeo,
    backHoodGeo: new THREE.SphereGeometry(0.24, 14, 12),
    faceGeo: new THREE.SphereGeometry(0.235, 18, 14),
    cheekGeo: new THREE.SphereGeometry(0.036, 8, 6),
    eyeGeo: new THREE.SphereGeometry(0.025, 8, 6),
    glintGeo: new THREE.SphereGeometry(0.008, 6, 6),
    smileGeo: new THREE.TubeGeometry(smileCurve, 8, 0.007, 6, false),
    byeoriCurlGeo: new THREE.TubeGeometry(curlCurve, 12, 0.024, 8, false),
    byeoriCurlTipGeo: new THREE.SphereGeometry(0.022, 8, 6),
    bichiBangGeo: new THREE.CapsuleGeometry(0.022, 0.055, 4, 6),
    shadowGeo: new THREE.PlaneGeometry(0.95, 0.95),
    skinMat: new THREE.MeshStandardMaterial({
      color: 0xffdec9,
      roughness: 0.68,
      metalness: 0.01,
    }),
    cheekMat: new THREE.MeshStandardMaterial({
      color: 0xf48da3,
      roughness: 0.72,
      metalness: 0.0,
    }),
    hairMat: new THREE.MeshStandardMaterial({
      color: 0xf7ca44,
      roughness: 0.48,
      metalness: 0.08,
    }),
    bowMat: new THREE.MeshStandardMaterial({
      color: 0xf8d238,
      roughness: 0.48,
      metalness: 0.05,
    }),
    eyeMat: new THREE.MeshStandardMaterial({
      color: 0x1b1a1e,
      roughness: 0.35,
      metalness: 0.05,
    }),
    whiteGlintMat: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    buttonMat: new THREE.MeshStandardMaterial({
      color: 0xfcf9f2,
      roughness: 0.4,
      metalness: 0.05,
    }),
    byeoriHoodMat: new THREE.MeshStandardMaterial({
      color: 0x2d7ef4,
      roughness: 0.62,
      metalness: 0.04,
    }),
    byeoriSuitMat: new THREE.MeshStandardMaterial({
      color: 0x8cc6ff,
      roughness: 0.65,
      metalness: 0.03,
    }),
    byeoriShoeMat: new THREE.MeshStandardMaterial({
      color: 0x2262c7,
      roughness: 0.58,
      metalness: 0.04,
    }),
    bichiHoodMat: new THREE.MeshStandardMaterial({
      color: 0xef6b94,
      roughness: 0.62,
      metalness: 0.04,
    }),
    bichiSuitMat: new THREE.MeshStandardMaterial({
      color: 0xfbc4d6,
      roughness: 0.65,
      metalness: 0.03,
    }),
    bichiShoeMat: new THREE.MeshStandardMaterial({
      color: 0xd9517b,
      roughness: 0.58,
      metalness: 0.04,
    }),
  };

  return cachedAssets;
}

export function buildMascotMesh(
  id: MascotId,
  contactShadowTex: THREE.Texture,
  castShadowFlag: boolean,
): MascotRig {
  const assets = getSharedMascotAssets();
  const root = new THREE.Group();

  const isByeori = id === 'byeori';
  const hoodMat = isByeori ? assets.byeoriHoodMat : assets.bichiHoodMat;
  const suitMat = isByeori ? assets.byeoriSuitMat : assets.bichiSuitMat;
  const shoeMat = isByeori ? assets.byeoriShoeMat : assets.bichiShoeMat;

  // Per-instance contact shadow material so jump height fades each mascot's shadow independently
  const shadowMat = new THREE.MeshBasicMaterial({
    map: contactShadowTex,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const shadowDisc = new THREE.Mesh(assets.shadowGeo, shadowMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.015;
  root.add(shadowDisc);

  // Main articulated body pivot (2-head-tall chibi proportions, total height ~1.28m)
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  // 1. STUBBY LEGS & ROUNDED SHOES
  const createLeg = (xOffset: number) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(xOffset, 0.28, 0);

    const leg = new THREE.Mesh(assets.legGeo, suitMat);
    leg.position.y = -0.11;
    leg.castShadow = castShadowFlag;
    legPivot.add(leg);

    const foot = new THREE.Mesh(assets.footGeo, shoeMat);
    foot.scale.set(0.95, 0.72, 1.28);
    foot.position.set(0, -0.21, 0.03);
    foot.castShadow = castShadowFlag;
    legPivot.add(foot);

    bodyPivot.add(legPivot);
    return legPivot;
  };

  const leftLegPivot = createLeg(-0.125);
  const rightLegPivot = createLeg(0.125);

  // 2. CHUBBY PASTEL ONE-PIECE JUMPSUIT TORSO + 3 TINY BUTTONS + YELLOW BOW TIE
  const torso = new THREE.Mesh(assets.torsoGeo, suitMat);
  torso.scale.set(1.0, 1.15, 0.9);
  torso.position.y = 0.48;
  torso.castShadow = castShadowFlag;
  torso.receiveShadow = true;
  bodyPivot.add(torso);

  [0.54, 0.46, 0.38].forEach((by) => {
    const btn = new THREE.Mesh(assets.btnGeo, assets.buttonMat);
    btn.scale.set(1, 1, 0.55);
    btn.position.set(0, by, 0.218);
    bodyPivot.add(btn);
  });

  const collar = new THREE.Mesh(assets.collarGeo, hoodMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 0.69, 0.01);
  bodyPivot.add(collar);

  const bowGroup = new THREE.Group();
  bowGroup.position.set(0, 0.67, 0.19);
  bodyPivot.add(bowGroup);

  const bowKnot = new THREE.Mesh(assets.bowKnotGeo, assets.bowMat);
  bowGroup.add(bowKnot);

  const leftWing = new THREE.Mesh(assets.bowWingGeo, assets.bowMat);
  leftWing.rotation.z = -Math.PI / 2;
  leftWing.scale.set(0.85, 1, 0.55);
  leftWing.position.x = -0.052;
  bowGroup.add(leftWing);

  const rightWing = new THREE.Mesh(assets.bowWingGeo, assets.bowMat);
  rightWing.rotation.z = Math.PI / 2;
  rightWing.scale.set(0.85, 1, 0.55);
  rightWing.position.x = 0.052;
  bowGroup.add(rightWing);

  // 3. STUBBY ARMS & PEACH HANDS
  const createArm = (side: -1 | 1) => {
    const armPivot = new THREE.Group();
    armPivot.position.set(side * 0.24, 0.62, 0.01);

    const arm = new THREE.Mesh(assets.armGeo, suitMat);
    arm.position.set(side * 0.05, -0.08, 0);
    arm.rotation.z = side * 0.42;
    arm.castShadow = castShadowFlag;
    armPivot.add(arm);

    const hand = new THREE.Mesh(assets.handGeo, assets.skinMat);
    hand.position.set(side * 0.11, -0.18, 0.01);
    armPivot.add(hand);

    bodyPivot.add(armPivot);
    return armPivot;
  };

  const leftArmPivot = createArm(-1);
  const rightArmPivot = createArm(1);

  // 4. HEAD, 5-POINTED STAR PLUSH HOOD, FACE & GOLDEN HAIR FEATURE
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.94, 0.01);
  bodyPivot.add(headGroup);

  const starHood = new THREE.Mesh(assets.starGeo, hoodMat);
  starHood.position.set(0, 0.04, -0.05);
  starHood.castShadow = castShadowFlag;
  starHood.receiveShadow = true;
  headGroup.add(starHood);

  const backHoodDome = new THREE.Mesh(assets.backHoodGeo, hoodMat);
  backHoodDome.scale.set(0.95, 0.95, 0.45);
  backHoodDome.position.set(0, 0.02, -0.1);
  headGroup.add(backHoodDome);

  const faceMesh = new THREE.Mesh(assets.faceGeo, assets.skinMat);
  faceMesh.scale.set(1.04, 0.96, 0.88);
  faceMesh.position.set(0, 0.0, 0.075);
  faceMesh.castShadow = castShadowFlag;
  faceMesh.receiveShadow = true;
  headGroup.add(faceMesh);

  [-0.125, 0.125].forEach((cx) => {
    const cheek = new THREE.Mesh(assets.cheekGeo, assets.cheekMat);
    cheek.scale.set(1.25, 0.78, 0.45);
    cheek.position.set(cx, -0.035, 0.258);
    headGroup.add(cheek);
  });

  [-0.082, 0.082].forEach((ex) => {
    const eye = new THREE.Mesh(assets.eyeGeo, assets.eyeMat);
    eye.scale.set(0.95, 1.15, 0.6);
    eye.position.set(ex, 0.02, 0.275);
    headGroup.add(eye);

    const glint = new THREE.Mesh(assets.glintGeo, assets.whiteGlintMat);
    glint.position.set(ex + 0.008, 0.03, 0.289);
    headGroup.add(glint);
  });

  const smileMesh = new THREE.Mesh(assets.smileGeo, assets.eyeMat);
  headGroup.add(smileMesh);

  if (isByeori) {
    const curlMesh = new THREE.Mesh(assets.byeoriCurlGeo, assets.hairMat);
    headGroup.add(curlMesh);

    const curlTip = new THREE.Mesh(assets.byeoriCurlTipGeo, assets.hairMat);
    curlTip.position.set(0.015, 0.115, 0.255);
    headGroup.add(curlTip);
  } else {
    [-0.085, -0.042, 0, 0.042, 0.085].forEach((bx, idx) => {
      const bang = new THREE.Mesh(assets.bichiBangGeo, assets.hairMat);
      const curveZ = 0.242 - Math.abs(bx) * 0.24;
      const curveY = 0.155 - Math.abs(idx - 2) * 0.008;
      bang.position.set(bx, curveY, curveZ);
      bang.rotation.x = 0.28;
      bang.rotation.z = -bx * 0.85;
      headGroup.add(bang);
    });
  }

  // Smooth bouncy walking, idle breathing & joyful chibi jump pose updater
  const animate = (
    speedRatio: number,
    walkPhase: number,
    idleTime: number,
    jumpHeightAboveGround = 0,
    verticalVelocity = 0,
    squashY = 1,
    squashXZ = 1,
  ) => {
    const airborne = jumpHeightAboveGround > 0.03;
    const moveBlend = airborne ? 0 : Math.min(1, Math.max(0, speedRatio));
    const idleBlend = airborne ? 0 : 1 - moveBlend;

    // Keep contact shadow anchored on the ground directly beneath the mascot while jumping
    shadowDisc.position.y = 0.015 - Math.max(0, jumpHeightAboveGround);
    const shadowScale = 1 / (1 + Math.max(0, jumpHeightAboveGround) * 0.45);
    shadowDisc.scale.setScalar(shadowScale);
    shadowMat.opacity = 0.45 * shadowScale;

    // Squash & stretch on takeoff / landing
    bodyPivot.scale.set(squashXZ, squashY, squashXZ);

    if (airborne) {
      bodyPivot.position.y = 0;
      const rising = verticalVelocity >= 0;
      // Happy star-hop airborne pose: arms raised joyfully, stubby legs tucked
      leftLegPivot.rotation.x = rising ? -0.45 : 0.35;
      rightLegPivot.rotation.x = rising ? 0.32 : -0.25;
      leftArmPivot.rotation.x = -0.25;
      rightArmPivot.rotation.x = -0.25;
      leftArmPivot.rotation.z = -0.82;
      rightArmPivot.rotation.z = 0.82;
      headGroup.rotation.z = Math.sin(idleTime * 6) * 0.03;
      headGroup.rotation.x = rising ? -0.1 : 0.08;
      return;
    }

    const idleBob = Math.sin(idleTime * 2.4) * 0.015 * idleBlend;
    const walkBob = Math.abs(Math.sin(walkPhase)) * 0.055 * moveBlend;
    bodyPivot.position.y = idleBob + walkBob;

    const stride = Math.sin(walkPhase) * 0.65 * moveBlend;
    leftLegPivot.rotation.x = stride;
    rightLegPivot.rotation.x = -stride;

    leftArmPivot.rotation.x = -stride * 0.85;
    rightArmPivot.rotation.x = stride * 0.85;
    leftArmPivot.rotation.z = Math.sin(idleTime * 1.9) * 0.04 * idleBlend;
    rightArmPivot.rotation.z = -Math.sin(idleTime * 1.9) * 0.04 * idleBlend;

    headGroup.rotation.z =
      Math.cos(walkPhase) * 0.045 * moveBlend + Math.sin(idleTime * 1.3) * 0.03 * idleBlend;
    headGroup.rotation.x = 0.04 * moveBlend + Math.sin(idleTime * 2.1) * 0.02 * idleBlend;
  };

  return {
    id,
    root,
    bodyPivot,
    headGroup,
    leftArmPivot,
    rightArmPivot,
    leftLegPivot,
    rightLegPivot,
    animate,
    dispose: () => {
      // Only dispose per-instance material; shared geometries/materials stay cached
      shadowMat.dispose();
    },
  };
}
