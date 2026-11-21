import { useEffect, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { JoystickInputState } from '../components/ParkOverlay';
import {
  computeAiFallbackVisitors,
  type PlayerEmoteKind,
  type PlayerEmotePayload,
  type PlayerMovePayload,
  type PlayerPresenceState,
} from '../multiplayer/realtimeSync';
import {
  createInitialJumpState,
  getGroundElevationAt,
  stepJumpPhysics,
  type JumpPhysicsState,
} from '../park/jumpPhysics';
import { buildMascotMesh, type MascotRig } from '../park/mascotBuilder';
import { createMascotOverheadRig, type MascotOverheadRig } from '../park/nameplateSprite';
import { buildParkScene } from '../park/parkBuilder';
import {
  PARK_GROUND_Y,
  PLAYER_SPAWN_POS,
  PLAYER_SPAWN_YAW,
  SHRINE_EXIT_POS,
  clampParkDestination,
  dampAngle,
  isExteriorParkGroundPoint,
  isNearShrineEntrance,
  resolveParkCollision,
  type MascotId,
  type ViewMode,
} from '../park/parkLayout';
import { STARLIGHT_WARP_POS, isNearStarlightTelescope } from '../park/starlightData';
import { ZODIAC_STATUES, findNearestZodiac, type ZodiacStatueInfo } from '../park/zodiacData';
import {
  stepStoneLiftPhysics,
  type LiftPhysicsState,
  type RitualOutcome,
  type RitualStep,
  type SavedWishTag,
  type TimeOfDay,
} from '../ritual/ritualLogic';
import { createContactShadowTexture } from './proceduralTextures';
import { buildShrineScene, type ShrineSceneRig } from './shrineBuilder';

export interface SanctuaryCanvasProps {
  viewMode: ViewMode;
  activeCharacter: MascotId;
  timeOfDay: TimeOfDay;
  ritualStep: RitualStep;
  bowSequenceId: number;
  wishEmberSequenceId: number;
  externalPullActive: boolean;
  resolvedOutcome: RitualOutcome | null;
  pendingOutcomeDecision: RitualOutcome;
  savedWishTags: SavedWishTag[];
  latestHungTag: SavedWishTag | null;
  localNickname: string;
  localEmoteSignal: { id: number; emote: PlayerEmoteKind } | null;
  remotePlayers: PlayerPresenceState[];
  isMultiplayerActive: boolean;
  remoteMoveQueueRef: MutableRefObject<PlayerMovePayload[]>;
  remoteEmoteQueueRef: MutableRefObject<PlayerEmotePayload[]>;
  joystickInputRef: MutableRefObject<JoystickInputState>;
  pendingExitDestinationRef: MutableRefObject<{ x: number; z: number } | null>;
  wakeLoopSignal: number;
  jumpSignal: number;
  warpStarlightSignal: number;
  meteorShowerSignal: number;
  onBowBeat: (bowIndex: number) => void;
  onBowingComplete: () => void;
  onStoneLiftStart: (isHeavyResonance: boolean) => void;
  onStoneSettledStep2: (holdDuration: number) => void;
  onSecondLiftResolved: (outcome: RitualOutcome, holdDuration: number) => void;
  onStoneHoverChange: (hovered: boolean) => void;
  onPullStateChange: (pulling: boolean) => void;
  onNearShrineChange: (near: boolean) => void;
  onNearStarlightChange: (near: boolean) => void;
  onOpenStarlight: () => void;
  onNearestZodiacChange: (statue: ZodiacStatueInfo | null) => void;
  onSelectZodiac: (statue: ZodiacStatueInfo) => void;
  onRequestEnterShrine: () => void;
  onRequestExitShrine: (walkTo?: { x: number; z: number }) => void;
  onParkFootstep: () => void;
  onJumpSound: () => void;
  onLandSound: () => void;
  onLocalMoveSample: (x: number, z: number, rotationY: number, isMoving: boolean, y: number) => void;
}

interface LightingPreset {
  skyColor: THREE.Color;
  fogColor: THREE.Color;
  shrineFogDensity: number;
  parkFogDensity: number;
  sunColor: THREE.Color;
  sunIntensity: number;
  sunPos: THREE.Vector3;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiIntensity: number;
  lanternGlow: number;
  lanternPointIntensity: number;
  lampBulbGlow: number;
  plazaLightIntensity: number;
  wispOpacity: number;
  exposure: number;
  envIntensity: number;
}

const PRESETS: Record<TimeOfDay, LightingPreset> = {
  dawn: {
    skyColor: new THREE.Color(0x9fb2bf),
    fogColor: new THREE.Color(0xb2c2cc),
    shrineFogDensity: 0.03,
    parkFogDensity: 0.015,
    sunColor: new THREE.Color(0xffdfba),
    sunIntensity: 1.5,
    sunPos: new THREE.Vector3(14, 14, 18),
    hemiSky: new THREE.Color(0xc2d6e4),
    hemiGround: new THREE.Color(0x474f40),
    hemiIntensity: 0.88,
    lanternGlow: 0.3,
    lanternPointIntensity: 0.28,
    lampBulbGlow: 0.25,
    plazaLightIntensity: 0.15,
    wispOpacity: 0.34,
    exposure: 1.05,
    envIntensity: 0.72,
  },
  sunset: {
    skyColor: new THREE.Color(0xb87b56),
    fogColor: new THREE.Color(0xc8895f),
    shrineFogDensity: 0.022,
    parkFogDensity: 0.01,
    sunColor: new THREE.Color(0xffb25c),
    sunIntensity: 2.2,
    sunPos: new THREE.Vector3(-14, 10, 18),
    hemiSky: new THREE.Color(0x8893b8),
    hemiGround: new THREE.Color(0x453528),
    hemiIntensity: 0.74,
    lanternGlow: 0.78,
    lanternPointIntensity: 0.75,
    lampBulbGlow: 0.9,
    plazaLightIntensity: 0.55,
    wispOpacity: 0.54,
    exposure: 1.1,
    envIntensity: 0.58,
  },
  night: {
    skyColor: new THREE.Color(0x0b1222),
    fogColor: new THREE.Color(0x0d1528),
    shrineFogDensity: 0.028,
    parkFogDensity: 0.014,
    sunColor: new THREE.Color(0x7c9ed4),
    sunIntensity: 0.45,
    sunPos: new THREE.Vector3(10, 18, 22),
    hemiSky: new THREE.Color(0x253960),
    hemiGround: new THREE.Color(0x10141c),
    hemiIntensity: 0.42,
    lanternGlow: 1.9,
    lanternPointIntensity: 2.25,
    lampBulbGlow: 2.1,
    plazaLightIntensity: 1.25,
    wispOpacity: 0.82,
    exposure: 1.16,
    envIntensity: 0.16,
  },
};

// Module-level scratch vectors & ground plane to avoid GC inside animation loop
const _pointerNdc = new THREE.Vector2();
const _targetCamOffset = new THREE.Vector3();
const _desiredCamPos = new THREE.Vector3();
const _desiredLookAt = new THREE.Vector3();
const _shrineCamPos = new THREE.Vector3(0.22, 2.28, 6.2);
const _shrineLookAt = new THREE.Vector3(0, 1.32, 0);
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -PARK_GROUND_Y);
const _groundHit = new THREE.Vector3();

function detectSoftwareGl(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export function SanctuaryCanvas(props: SanctuaryCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  const shrineRigRef = useRef<ShrineSceneRig | null>(null);
  const wakeSoftwareLoopRef = useRef<(() => void) | null>(null);
  const bowTriggerRef = useRef({ lastId: 0, active: false, elapsed: 0, lastBeat: -1 });
  const emberTriggerRef = useRef({ lastId: 0, active: false, elapsed: 0 });
  const jumpQueueRef = useRef(0);
  const lastJumpSignalRef = useRef(0);
  const lastHungTagIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (props.jumpSignal > lastJumpSignalRef.current) {
      lastJumpSignalRef.current = props.jumpSignal;
      jumpQueueRef.current += 1;
      wakeSoftwareLoopRef.current?.();
    }
  }, [props.jumpSignal]);

  useEffect(() => {
    wakeSoftwareLoopRef.current?.();
  }, [
    props.viewMode,
    props.activeCharacter,
    props.timeOfDay,
    props.ritualStep,
    props.externalPullActive,
    props.resolvedOutcome,
    props.bowSequenceId,
    props.wishEmberSequenceId,
    props.latestHungTag,
    props.localNickname,
    props.localEmoteSignal,
    props.remotePlayers,
    props.isMultiplayerActive,
    props.wakeLoopSignal,
    props.jumpSignal,
    props.warpStarlightSignal,
    props.meteorShowerSignal,
  ]);

  useEffect(() => {
    if (props.bowSequenceId > bowTriggerRef.current.lastId) {
      bowTriggerRef.current = {
        lastId: props.bowSequenceId,
        active: true,
        elapsed: 0,
        lastBeat: -1,
      };
    }
  }, [props.bowSequenceId]);

  useEffect(() => {
    if (props.wishEmberSequenceId > emberTriggerRef.current.lastId) {
      emberTriggerRef.current = {
        lastId: props.wishEmberSequenceId,
        active: true,
        elapsed: 0,
      };
      const rig = shrineRigRef.current;
      if (rig) {
        for (let i = 0; i < rig.emberPositions.length / 3; i++) {
          const angle = Math.random() * Math.PI * 2;
          const r = 0.25 + Math.random() * 0.65;
          rig.emberPositions[i * 3] = Math.cos(angle) * r;
          rig.emberPositions[i * 3 + 1] = 0.55 + Math.random() * 0.45;
          rig.emberPositions[i * 3 + 2] = 0.9 + Math.sin(angle) * r * 0.6;

          rig.emberVelocities[i * 3] = (Math.random() - 0.5) * 0.22;
          rig.emberVelocities[i * 3 + 1] = 0.35 + Math.random() * 0.55;
          rig.emberVelocities[i * 3 + 2] = -0.35 - Math.random() * 0.45;
        }
        rig.emberPoints.geometry.attributes.position.needsUpdate = true;
      }
    }
  }, [props.wishEmberSequenceId]);

  useEffect(() => {
    if (props.latestHungTag && props.latestHungTag.id !== lastHungTagIdRef.current && shrineRigRef.current) {
      lastHungTagIdRef.current = props.latestHungTag.id;
      shrineRigRef.current.addUserWishTag(props.latestHungTag);
    }
  }, [props.latestHungTag]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = PRESETS[propsRef.current.timeOfDay].exposure;
    renderer.setPixelRatio(isSoftwareGl ? 0.5 : Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight,
    );

    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    const handleContextLost = (e: Event) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    const scene = new THREE.Scene();
    const initialPreset = PRESETS[propsRef.current.timeOfDay];
    const initialMode = propsRef.current.viewMode;
    scene.background = initialPreset.skyColor.clone();
    scene.fog = new THREE.FogExp2(
      initialPreset.fogColor.getHex(),
      initialMode === 'park' ? initialPreset.parkFogDensity : initialPreset.shrineFogDensity,
    );

    let envTex: THREE.Texture | null = null;
    if (!isSoftwareGl) {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTex;
      scene.environmentIntensity = initialPreset.envIntensity;
      pmremGenerator.dispose();
    }

    const aspect =
      (container.clientWidth || window.innerWidth) /
      (container.clientHeight || window.innerHeight);
    const camera = new THREE.PerspectiveCamera(46, aspect, 0.1, 240);

    // 3rd-person orbit camera state (in 'park' mode)
    let camYaw = Math.PI * 0.94; // Slight angle behind player framing Central Plaza & Dolhalmae Shrine
    let camPitch = 0.28;
    let camDistance = 5.4;

    if (initialMode === 'park') {
      camera.position.set(
        PLAYER_SPAWN_POS[0] - Math.sin(camYaw) * Math.cos(camPitch) * camDistance,
        -0.45 + 0.95 + Math.sin(camPitch) * camDistance,
        PLAYER_SPAWN_POS[1] - Math.cos(camYaw) * Math.cos(camPitch) * camDistance,
      );
      camera.lookAt(PLAYER_SPAWN_POS[0], -0.45 + 0.92, PLAYER_SPAWN_POS[1]);
    } else {
      camera.position.copy(_shrineCamPos);
      camera.lookAt(_shrineLookAt);
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(_shrineLookAt);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.055;
    controls.enablePan = false;
    controls.minDistance = 1.45;
    controls.maxDistance = 10.0;
    controls.minPolarAngle = Math.PI * 0.18;
    controls.maxPolarAngle = Math.PI * 0.51;
    controls.minAzimuthAngle = -Math.PI * 0.44;
    controls.maxAzimuthAngle = Math.PI * 0.44;
    controls.enabled = initialMode === 'shrine';
    if (initialMode === 'shrine') {
      controls.update();
    }

    // Warm / Cool Lighting Rig
    const hemiLight = new THREE.HemisphereLight(
      initialPreset.hemiSky.getHex(),
      initialPreset.hemiGround.getHex(),
      initialPreset.hemiIntensity + (isSoftwareGl ? 0.16 : 0),
    );
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(
      initialPreset.sunColor.getHex(),
      initialPreset.sunIntensity,
    );
    keyLight.position.copy(initialPreset.sunPos);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 75;
    const d = 16;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);
    scene.add(keyLight.target);

    const rimLight = new THREE.DirectionalLight(0xd9c2a3, 0.36);
    rimLight.position.set(8.5, 6.0, -8.0);
    scene.add(rimLight);

    // Build Shrine Pavilion + Expanded Dolhalmae Park + Byeori & Bichi Mascots
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const shrineRig = buildShrineScene(
      maxAniso,
      propsRef.current.savedWishTags,
      isSoftwareGl,
      { omitExteriorTerrain: true },
    );
    shrineRigRef.current = shrineRig;
    scene.add(shrineRig.root);

    const parkRig = buildParkScene(maxAniso, isSoftwareGl);
    scene.add(parkRig.root);

    const mascotShadowTex = createContactShadowTexture();
    const byeoriRig: MascotRig = buildMascotMesh('byeori', mascotShadowTex, !isSoftwareGl);
    const bichiRig: MascotRig = buildMascotMesh('bichi', mascotShadowTex, !isSoftwareGl);
    const byeoriOverhead = createMascotOverheadRig(
      byeoriRig.root,
      propsRef.current.localNickname,
      maxAniso,
    );
    const bichiOverhead = createMascotOverheadRig(
      bichiRig.root,
      propsRef.current.localNickname,
      maxAniso,
    );
    scene.add(byeoriRig.root);
    scene.add(bichiRig.root);

    interface RemoteVisitorEntry {
      userId: string;
      character: MascotId;
      rig: MascotRig;
      overhead: MascotOverheadRig;
      x: number;
      z: number;
      y: number;
      yaw: number;
      targetX: number;
      targetZ: number;
      targetY: number;
      targetYaw: number;
      isMoving: boolean;
      walkPhase: number;
      lastMoveAtMs: number;
    }
    const remoteVisualsMap = new Map<string, RemoteVisitorEntry>();

    const spawnRemoteEntry = (
      userId: string,
      character: MascotId,
      nickname: string,
      praying: boolean,
      initX: number,
      initZ: number,
      initYaw: number,
    ): RemoteVisitorEntry => {
      const rig = buildMascotMesh(character, mascotShadowTex, !isSoftwareGl);
      const overhead = createMascotOverheadRig(rig.root, nickname, maxAniso);
      overhead.setIdentity(nickname, praying);
      rig.root.position.set(initX, PARK_GROUND_Y, initZ);
      rig.root.rotation.y = initYaw;
      scene.add(rig.root);
      return {
        userId,
        character,
        rig,
        overhead,
        x: initX,
        z: initZ,
        y: 0,
        yaw: initYaw,
        targetX: initX,
        targetZ: initZ,
        targetY: 0,
        targetYaw: initYaw,
        isMoving: false,
        walkPhase: Math.random() * Math.PI * 2,
        lastMoveAtMs: 0,
      };
    };

    const removeRemoteEntry = (entry: RemoteVisitorEntry) => {
      scene.remove(entry.rig.root);
      entry.overhead.dispose();
      entry.rig.dispose();
    };

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Ground click-to-move marker ring
    const targetRingGroup = new THREE.Group();
    const outerRingGeo = new THREE.RingGeometry(0.24, 0.34, 24);
    outerRingGeo.rotateX(-Math.PI / 2);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0xf4cf7c,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const outerRingMesh = new THREE.Mesh(outerRingGeo, outerRingMat);
    const innerDotGeo = new THREE.CircleGeometry(0.09, 16);
    innerDotGeo.rotateX(-Math.PI / 2);
    const innerDotMesh = new THREE.Mesh(innerDotGeo, outerRingMat);
    targetRingGroup.add(outerRingMesh);
    targetRingGroup.add(innerDotMesh);
    targetRingGroup.visible = false;
    scene.add(targetRingGroup);

    // Pooled 8-particle golden starlight landing dust puff (zero per-frame allocations)
    const dustGroup = new THREE.Group();
    const dustGeo = new THREE.SphereGeometry(0.07, 6, 5);
    const dustMat = new THREE.MeshBasicMaterial({
      color: 0xffe49c,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const dustParticles: Array<{
      mesh: THREE.Mesh;
      vx: number;
      vy: number;
      vz: number;
    }> = [];
    for (let i = 0; i < 8; i++) {
      const mesh = new THREE.Mesh(dustGeo, dustMat);
      mesh.visible = false;
      dustGroup.add(mesh);
      dustParticles.push({ mesh, vx: 0, vy: 0, vz: 0 });
    }
    scene.add(dustGroup);
    let dustTimer = 0;
    const DUST_DURATION = 0.42;

    const triggerLandingDust = (x: number, yWorld: number, z: number) => {
      dustTimer = DUST_DURATION;
      for (let i = 0; i < dustParticles.length; i++) {
        const ang = (i / dustParticles.length) * Math.PI * 2 + (i % 2) * 0.2;
        const speed = 1.15 + (i % 3) * 0.35;
        const p = dustParticles[i];
        p.mesh.position.set(x + Math.cos(ang) * 0.14, yWorld + 0.08, z + Math.sin(ang) * 0.14);
        p.mesh.scale.setScalar(1);
        p.mesh.visible = true;
        p.vx = Math.cos(ang) * speed;
        p.vy = 0.7 + (i % 2) * 0.35;
        p.vz = Math.sin(ang) * speed;
      }
      dustMat.opacity = 0.85;
    };

    // Player state (zero React state allocations in tick)
    const playerState = {
      x: PLAYER_SPAWN_POS[0],
      z: PLAYER_SPAWN_POS[1],
      yaw: PLAYER_SPAWN_YAW,
      speed: 0,
      walkPhase: 0,
      lastStepIndex: 0,
      moveTarget: null as { x: number; z: number } | null,
      stalledSeconds: 0,
    };
    let jumpState: JumpPhysicsState = createInitialJumpState();
    let prevJumpingAttr = 'false';
    document.body.dataset.jumping = 'false';

    let lastLocalNickname = propsRef.current.localNickname;
    let lastLocalEmoteId = propsRef.current.localEmoteSignal?.id ?? 0;
    let lastHandledWarpStarlight = propsRef.current.warpStarlightSignal;
    let lastHandledMeteorShower = propsRef.current.meteorShowerSignal;
    let meteorShowerActiveUntil = 0;

    let lastShadowX = Number.NaN;
    let lastShadowZ = Number.NaN;
    let lastShadowPreset: TimeOfDay | null = null;

    const keysDown = new Set<string>();
    let prevViewMode: ViewMode = initialMode;
    let cameraTransitionActive = false;
    let cameraTransitionElapsed = 0;

    let prevNearShrine = isNearShrineEntrance(playerState.x, playerState.z);
    let prevNearStarlight = isNearStarlightTelescope(playerState.x, playerState.z);
    let prevNearestZodiacId: string | null = null;
    let currentNearestZodiac: ZodiacStatueInfo | null = null;
    propsRef.current.onNearShrineChange(prevNearShrine);
    propsRef.current.onNearStarlightChange(prevNearStarlight);

    // Raycasting (Layer 1: Dolhalmae stone; Layer 2: Zodiac statues; Layer 3: Bohyeonsan Telescope)
    const raycaster = new THREE.Raycaster();
    let pointerPullActive = false;
    let pointerDownY = 0;
    let stoneHovered = false;
    let lastHoverCheck = 0;

    // 3rd-person & 1st-person pointer tracking (orbit drag vs clean click-to-move)
    let parkOrbitDragging = false;
    let parkDownButton = 0;
    let parkOrbitMovedDist = 0;
    let parkOrbitStartX = 0;
    let parkOrbitStartY = 0;
    let shrineClickTracking = false;
    let shrineClickMovedDist = 0;
    let shrineClickStartX = 0;
    let shrineClickStartY = 0;

    let liftState: LiftPhysicsState = {
      liftProgress: 0,
      velocity: 0,
      isPulling: false,
      holdSeconds: 0,
      trembleAmplitude: 0,
    };
    let step2ReachedPeak = false;
    let step4DecisionTriggered = false;
    let step4DecidedOutcome: RitualOutcome | null = null;
    let step4OutcomeLockTime = 0;
    let wasPullingPrev = false;
    let auraGlowIntensity = 0;

    const updatePointerNdc = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      _pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    const isStoneInteractable = () => {
      if (propsRef.current.viewMode !== 'shrine') return false;
      const step = propsRef.current.ritualStep;
      return step === 2 || step === 4;
    };

    const tryGroundRaycast = (clientX: number, clientY: number): { x: number; z: number } | null => {
      updatePointerNdc(clientX, clientY);
      raycaster.setFromCamera(_pointerNdc, camera);
      const hit = raycaster.ray.intersectPlane(_groundPlane, _groundHit);
      if (!hit || !Number.isFinite(hit.x) || !Number.isFinite(hit.z)) return null;
      return { x: hit.x, z: hit.z };
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      const code = e.code;
      const isMoveKey =
        code === 'KeyW' ||
        code === 'KeyA' ||
        code === 'KeyS' ||
        code === 'KeyD' ||
        code === 'ArrowUp' ||
        code === 'ArrowDown' ||
        code === 'ArrowLeft' ||
        code === 'ArrowRight';

      if (isMoveKey || code === 'ShiftLeft' || code === 'ShiftRight') {
        keysDown.add(code);
        if (isMoveKey) {
          playerState.moveTarget = null;
          // Pressing WASD/Arrow keys while in 1st-person shrine ritual naturally walks out to 3rd-person
          if (propsRef.current.viewMode === 'shrine' && !bowTriggerRef.current.active) {
            propsRef.current.onRequestExitShrine();
          }
        }
        wakeSoftwareLoop();
      }

      if (code === 'Space' && !e.repeat && propsRef.current.viewMode === 'park') {
        e.preventDefault();
        jumpQueueRef.current += 1;
        wakeSoftwareLoop();
      }

      if (code === 'KeyF' && !e.repeat && propsRef.current.viewMode === 'park') {
        if (isNearShrineEntrance(playerState.x, playerState.z)) {
          propsRef.current.onRequestEnterShrine();
        } else if (isNearStarlightTelescope(playerState.x, playerState.z)) {
          propsRef.current.onOpenStarlight();
        } else {
          const nearest = findNearestZodiac(playerState.x, playerState.z, 3.2);
          if (nearest) {
            propsRef.current.onSelectZodiac(nearest.statue);
          }
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysDown.delete(e.code);
    };

    const onWheel = (e: WheelEvent) => {
      if (propsRef.current.viewMode !== 'park') return;
      camDistance = THREE.MathUtils.clamp(camDistance + e.deltaY * 0.004, 3.5, 13.0);
      wakeSoftwareLoop();
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (propsRef.current.viewMode === 'park') {
        parkOrbitDragging = true;
        parkDownButton = e.button;
        parkOrbitMovedDist = 0;
        parkOrbitStartX = e.clientX;
        parkOrbitStartY = e.clientY;
        return;
      }

      shrineClickTracking = true;
      shrineClickMovedDist = 0;
      shrineClickStartX = e.clientX;
      shrineClickStartY = e.clientY;

      if (e.button === 0 && isStoneInteractable()) {
        updatePointerNdc(e.clientX, e.clientY);
        raycaster.layers.set(1);
        raycaster.setFromCamera(_pointerNdc, camera);
        const hits = raycaster.intersectObject(shrineRig.dolhalmaeRaycastMesh, false);
        if (hits.length > 0) {
          shrineClickTracking = false;
          pointerPullActive = true;
          pointerDownY = e.clientY;
          controls.enabled = false;
          renderer.domElement.style.cursor = 'grabbing';
          propsRef.current.onPullStateChange(true);
          wakeSoftwareLoop();
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (propsRef.current.viewMode === 'park') {
        if (parkOrbitDragging) {
          const dx = e.clientX - parkOrbitStartX;
          const dy = e.clientY - parkOrbitStartY;
          parkOrbitStartX = e.clientX;
          parkOrbitStartY = e.clientY;
          parkOrbitMovedDist += Math.hypot(dx, dy);
          // Left-drag orbits camera; right-drag doesn't whip camera before move click
          if (parkDownButton !== 2) {
            camYaw -= dx * 0.0065;
            camPitch = THREE.MathUtils.clamp(camPitch + dy * 0.0045, 0.16, 0.92);
            wakeSoftwareLoop();
          }
        }
        return;
      }

      if (shrineClickTracking) {
        shrineClickMovedDist += Math.hypot(
          e.clientX - shrineClickStartX,
          e.clientY - shrineClickStartY,
        );
        shrineClickStartX = e.clientX;
        shrineClickStartY = e.clientY;
      }

      if (pointerPullActive) {
        const dy = pointerDownY - e.clientY;
        if (dy < -90) {
          pointerPullActive = false;
          controls.enabled = true;
          propsRef.current.onPullStateChange(false);
        }
        return;
      }

      const now = performance.now();
      if (now - lastHoverCheck < 50) return;
      lastHoverCheck = now;

      if (!isStoneInteractable()) {
        if (stoneHovered) {
          stoneHovered = false;
          renderer.domElement.style.cursor = 'grab';
          propsRef.current.onStoneHoverChange(false);
        }
        return;
      }

      updatePointerNdc(e.clientX, e.clientY);
      raycaster.layers.set(1);
      raycaster.setFromCamera(_pointerNdc, camera);
      const hits = raycaster.intersectObject(shrineRig.dolhalmaeRaycastMesh, false);
      const nextHovered = hits.length > 0;
      if (nextHovered !== stoneHovered) {
        stoneHovered = nextHovered;
        renderer.domElement.style.cursor = nextHovered ? 'grab' : 'default';
        propsRef.current.onStoneHoverChange(nextHovered);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (propsRef.current.viewMode === 'park' && parkOrbitDragging) {
        const wasCleanClick = parkOrbitMovedDist < 7;
        const btn = parkDownButton;
        parkOrbitDragging = false;
        if (wasCleanClick) {
          updatePointerNdc(e.clientX, e.clientY);
          // Left-click checks Bohyeonsan Telescope (Layer 3) and Zodiac statues (Layer 2) first
          if (btn === 0) {
            raycaster.layers.set(3);
            raycaster.setFromCamera(_pointerNdc, camera);
            const starHits = raycaster.intersectObject(
              parkRig.starlightRig.telescopeRaycastMesh,
              false,
            );
            if (starHits.length > 0) {
              playerState.moveTarget = null;
              propsRef.current.onOpenStarlight();
              return;
            }

            raycaster.layers.set(2);
            raycaster.setFromCamera(_pointerNdc, camera);
            const hits = raycaster.intersectObjects(parkRig.zodiacRaycastMeshes, false);
            if (hits.length > 0) {
              const zId = hits[0].object.userData.zodiacId;
              const found = ZODIAC_STATUES.find((s) => s.id === zId);
              if (found) {
                playerState.moveTarget = null;
                propsRef.current.onSelectZodiac(found);
                return;
              }
            }
          }

          // Right-click OR Left-click on expanded park ground -> smooth walk to clicked point
          const groundPt = tryGroundRaycast(e.clientX, e.clientY);
          if (groundPt && Math.abs(groundPt.x) <= 44 && groundPt.z >= 1.5 && groundPt.z <= 48) {
            playerState.moveTarget = clampParkDestination(groundPt.x, groundPt.z, 0.48);
            playerState.stalledSeconds = 0;
            wakeSoftwareLoop();
          }
        }
      }

      if (propsRef.current.viewMode === 'shrine' && shrineClickTracking) {
        const wasCleanShrineClick = shrineClickMovedDist < 6;
        shrineClickTracking = false;
        if (wasCleanShrineClick && !pointerPullActive && !bowTriggerRef.current.active) {
          updatePointerNdc(e.clientX, e.clientY);
          raycaster.layers.set(1);
          raycaster.setFromCamera(_pointerNdc, camera);
          const stoneHits = raycaster.intersectObject(shrineRig.dolhalmaeRaycastMesh, false);
          if (stoneHits.length === 0) {
            const groundPt = tryGroundRaycast(e.clientX, e.clientY);
            if (groundPt && isExteriorParkGroundPoint(groundPt.x, groundPt.z)) {
              const dest = clampParkDestination(groundPt.x, groundPt.z, 0.48);
              propsRef.current.onRequestExitShrine(dest);
              wakeSoftwareLoop();
              return;
            }
          }
        }
      }

      if (pointerPullActive) {
        pointerPullActive = false;
        if (propsRef.current.viewMode === 'shrine') {
          controls.enabled = true;
        }
        renderer.domElement.style.cursor = stoneHovered ? 'grab' : 'default';
        propsRef.current.onPullStateChange(false);
        wakeSoftwareLoop();
      }
    };

    const clearInputs = () => {
      keysDown.clear();
      parkOrbitDragging = false;
      shrineClickTracking = false;
      onPointerUp(new PointerEvent('pointerup'));
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('contextmenu', onContextMenu);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', clearInputs);
    window.addEventListener('blur', clearInputs);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      wakeSoftwareLoopRef.current?.();
    };
    window.addEventListener('resize', onResize);

    let prevStep: RitualStep = propsRef.current.ritualStep;
    let frameId = 0;
    let disposed = false;
    let prevTime = performance.now();
    let elapsed = 0;
    let softwareLoopPending = false;
    let softwareTickIsSlow = false;

    const scheduleSoftwareTick = (delayMs: number) => {
      if (!isSoftwareGl || disposed || softwareLoopPending) return;
      softwareLoopPending = true;
      softwareTickIsSlow = delayMs > 120;
      frameId = window.setTimeout(tick, delayMs);
    };

    const wakeSoftwareLoop = () => {
      if (!isSoftwareGl || disposed) return;
      if (softwareLoopPending) {
        if (!softwareTickIsSlow) return;
        clearTimeout(frameId);
        softwareLoopPending = false;
      }
      prevTime = performance.now();
      scheduleSoftwareTick(24);
    };
    wakeSoftwareLoopRef.current = wakeSoftwareLoop;
    controls.addEventListener('change', wakeSoftwareLoop);

    function tick() {
      if (disposed) return;
      softwareLoopPending = false;
      const now = performance.now();
      const wallDt = Math.min(Math.max((now - prevTime) / 1000, 0.001), isSoftwareGl ? 0.5 : 0.1);
      prevTime = now;
      elapsed += wallDt;

      const curProps = propsRef.current;

      // Handle ViewMode transitions ('park' <-> 'shrine')
      if (curProps.viewMode !== prevViewMode) {
        prevViewMode = curProps.viewMode;
        cameraTransitionActive = true;
        cameraTransitionElapsed = 0;
        pointerPullActive = false;
        shrineClickTracking = false;

        if (curProps.viewMode === 'shrine') {
          playerState.moveTarget = null;
          targetRingGroup.visible = false;
          controls.enabled = false;
          renderer.domElement.style.cursor = 'default';
        } else {
          // Step player cleanly outside shrine front steps facing the Dolhalmae pavilion (or walk to clicked ground)
          playerState.x = SHRINE_EXIT_POS[0];
          playerState.z = SHRINE_EXIT_POS[1];
          const pendingDest = curProps.pendingExitDestinationRef.current;
          curProps.pendingExitDestinationRef.current = null;
          if (pendingDest) {
            playerState.moveTarget = pendingDest;
            playerState.stalledSeconds = 0;
            playerState.yaw = Math.atan2(pendingDest.x - playerState.x, pendingDest.z - playerState.z);
          } else {
            playerState.yaw = Math.PI;
          }
          camYaw = Math.PI * 0.94;
          camPitch = 0.28;
          camDistance = 5.6;
          controls.enabled = false;
          renderer.domElement.style.cursor = 'default';
        }
      }

      // Reset local stone lift markers on ritual step transitions
      if (curProps.ritualStep !== prevStep) {
        prevStep = curProps.ritualStep;
        step2ReachedPeak = false;
        step4DecisionTriggered = false;
        step4DecidedOutcome = null;
        step4OutcomeLockTime = 0;
        liftState = {
          liftProgress: 0,
          velocity: 0,
          isPulling: false,
          holdSeconds: 0,
          trembleAmplitude: 0,
        };
      }

      // 1. Time-of-Day Lighting, Fog, Streetlamps & Lanterns
      const targetPreset = PRESETS[curProps.timeOfDay];
      const dampAlpha = 1 - Math.exp(-4.8 * wallDt);

      (scene.background as THREE.Color).lerp(targetPreset.skyColor, dampAlpha);
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.lerp(targetPreset.fogColor, dampAlpha);
        const targetFog =
          curProps.viewMode === 'park'
            ? targetPreset.parkFogDensity
            : targetPreset.shrineFogDensity;
        scene.fog.density = THREE.MathUtils.lerp(scene.fog.density, targetFog, dampAlpha);
      }

      keyLight.color.lerp(targetPreset.sunColor, dampAlpha);
      keyLight.intensity = THREE.MathUtils.lerp(
        keyLight.intensity,
        targetPreset.sunIntensity,
        dampAlpha,
      );

      // Keep shadow frustum centered near active focal zone, throttled to >0.45m movement
      const focusX = curProps.viewMode === 'park' ? playerState.x * 0.72 : 0;
      const focusZ = curProps.viewMode === 'park' ? playerState.z : 0;
      if (
        lastShadowPreset !== curProps.timeOfDay ||
        !Number.isFinite(lastShadowX) ||
        Math.hypot(focusX - lastShadowX, focusZ - lastShadowZ) > 0.45
      ) {
        lastShadowX = focusX;
        lastShadowZ = focusZ;
        lastShadowPreset = curProps.timeOfDay;
        keyLight.target.position.set(focusX, 0, focusZ);
        keyLight.position.set(
          focusX + targetPreset.sunPos.x,
          targetPreset.sunPos.y,
          focusZ + targetPreset.sunPos.z,
        );
      }

      hemiLight.color.lerp(targetPreset.hemiSky, dampAlpha);
      hemiLight.groundColor.lerp(targetPreset.hemiGround, dampAlpha);
      const targetHemi = targetPreset.hemiIntensity + (isSoftwareGl ? 0.16 : 0);
      hemiLight.intensity = THREE.MathUtils.lerp(hemiLight.intensity, targetHemi, dampAlpha);

      if (!isSoftwareGl) {
        scene.environmentIntensity = THREE.MathUtils.lerp(
          scene.environmentIntensity,
          targetPreset.envIntensity,
          dampAlpha,
        );
      }

      renderer.toneMappingExposure = THREE.MathUtils.lerp(
        renderer.toneMappingExposure,
        targetPreset.exposure,
        dampAlpha,
      );

      for (let i = 0; i < parkRig.lampBulbMaterials.length; i++) {
        parkRig.lampBulbMaterials[i].emissiveIntensity = THREE.MathUtils.lerp(
          parkRig.lampBulbMaterials[i].emissiveIntensity,
          targetPreset.lampBulbGlow,
          dampAlpha,
        );
      }
      parkRig.plazaPointLight.intensity = THREE.MathUtils.lerp(
        parkRig.plazaPointLight.intensity,
        targetPreset.plazaLightIntensity,
        dampAlpha,
      );

      // Handle Bohyeonsan Starlight Zone warp & meteor shower triggers
      if (curProps.warpStarlightSignal > lastHandledWarpStarlight) {
        lastHandledWarpStarlight = curProps.warpStarlightSignal;
        playerState.x = STARLIGHT_WARP_POS[0];
        playerState.z = STARLIGHT_WARP_POS[1];
        playerState.yaw = -Math.PI * 0.72;
        playerState.moveTarget = null;
        jumpState = createInitialJumpState();
        camYaw = -Math.PI * 0.72;
        camPitch = 0.28;
        camDistance = 5.4;
        cameraTransitionActive = true;
        cameraTransitionElapsed = 0;
      }

      if (curProps.meteorShowerSignal > lastHandledMeteorShower) {
        lastHandledMeteorShower = curProps.meteorShowerSignal;
        parkRig.starlightRig.triggerMeteorShower();
        meteorShowerActiveUntil = elapsed + (isSoftwareGl ? 1.1 : 4.5);
      }

      const nightFactor =
        curProps.timeOfDay === 'night' ? 1.0 : curProps.timeOfDay === 'sunset' ? 0.48 : 0.06;
      parkRig.starlightRig.update(wallDt, elapsed, nightFactor);

      // 2. Local Player Mascot + Nameplate + Emote
      const activeRig = curProps.activeCharacter === 'byeori' ? byeoriRig : bichiRig;
      const inactiveRig = curProps.activeCharacter === 'byeori' ? bichiRig : byeoriRig;
      const activeOverhead =
        curProps.activeCharacter === 'byeori' ? byeoriOverhead : bichiOverhead;
      inactiveRig.root.visible = false;

      if (curProps.localNickname !== lastLocalNickname) {
        lastLocalNickname = curProps.localNickname;
        byeoriOverhead.setIdentity(curProps.localNickname, false);
        bichiOverhead.setIdentity(curProps.localNickname, false);
      }

      if (curProps.localEmoteSignal && curProps.localEmoteSignal.id > lastLocalEmoteId) {
        lastLocalEmoteId = curProps.localEmoteSignal.id;
        activeOverhead.triggerEmote(curProps.localEmoteSignal.emote);
      }

      let playerMoving = false;
      if (curProps.viewMode === 'park') {
        activeRig.root.visible = true;

        let inputX = curProps.joystickInputRef.current.x;
        let inputY = curProps.joystickInputRef.current.y;
        let sprint = curProps.joystickInputRef.current.sprint;

        if (keysDown.has('KeyA') || keysDown.has('ArrowLeft')) inputX -= 1;
        if (keysDown.has('KeyD') || keysDown.has('ArrowRight')) inputX += 1;
        if (keysDown.has('KeyW') || keysDown.has('ArrowUp')) inputY += 1;
        if (keysDown.has('KeyS') || keysDown.has('ArrowDown')) inputY -= 1;
        if (keysDown.has('ShiftLeft') || keysDown.has('ShiftRight')) sprint = true;

        const inputLen = Math.hypot(inputX, inputY);
        let moveDirX = 0;
        let moveDirZ = 0;

        if (inputLen > 0.05) {
          playerState.moveTarget = null;
          playerMoving = true;
          const normX = inputX / Math.max(1, inputLen);
          const normY = inputY / Math.max(1, inputLen);
          moveDirX = Math.sin(camYaw) * normY - Math.cos(camYaw) * normX;
          moveDirZ = Math.cos(camYaw) * normY + Math.sin(camYaw) * normX;
        } else if (playerState.moveTarget) {
          const dx = playerState.moveTarget.x - playerState.x;
          const dz = playerState.moveTarget.z - playerState.z;
          const dist = Math.hypot(dx, dz);
          if (dist < 0.25) {
            playerState.moveTarget = null;
          } else {
            playerMoving = true;
            moveDirX = dx / dist;
            moveDirZ = dz / dist;
          }
        }

        if (playerMoving) {
          const moveSpeed = sprint ? 6.2 : 4.1;
          playerState.speed = THREE.MathUtils.lerp(
            playerState.speed,
            moveSpeed,
            1 - Math.exp(-12 * wallDt),
          );

          const prevX = playerState.x;
          const prevZ = playerState.z;
          const rawX = prevX + moveDirX * playerState.speed * wallDt;
          const rawZ = prevZ + moveDirZ * playerState.speed * wallDt;
          const resolved = resolveParkCollision(rawX, rawZ, 0.48);
          playerState.x = resolved.x;
          playerState.z = resolved.z;

          if (playerState.moveTarget) {
            const movedDist = Math.hypot(resolved.x - prevX, resolved.z - prevZ);
            if (movedDist < 0.05 * wallDt) {
              playerState.stalledSeconds += wallDt;
              if (playerState.stalledSeconds > 0.35) {
                playerState.moveTarget = null;
              }
            } else {
              playerState.stalledSeconds = 0;
            }
          }

          const targetYaw = Math.atan2(moveDirX, moveDirZ);
          playerState.yaw = dampAngle(playerState.yaw, targetYaw, 12, wallDt);
          playerState.walkPhase += wallDt * (sprint ? 12.5 : 9.4);

          const stepIdx = Math.floor(playerState.walkPhase / Math.PI);
          if (stepIdx !== playerState.lastStepIndex && jumpState.isGrounded) {
            playerState.lastStepIndex = stepIdx;
            curProps.onParkFootstep();
          }
        } else {
          playerState.speed = THREE.MathUtils.lerp(
            playerState.speed,
            0,
            1 - Math.exp(-14 * wallDt),
          );
        }

        // Step vertical jump physics & elevated platform elevation
        const groundY = getGroundElevationAt(playerState.x, playerState.z);
        let jumpReq = jumpQueueRef.current > 0;
        if (jumpReq) {
          jumpQueueRef.current = 0;
        }
        let jumpRemDt = wallDt;
        let jumpSubsteps = 0;
        let visualScaleY = 1.0;
        let visualScaleXZ = 1.0;
        let didJump = false;
        let didLand = false;
        while (jumpRemDt > 0.0001 && jumpSubsteps < 12) {
          const stepDt = Math.min(jumpRemDt, 0.033);
          const res = stepJumpPhysics(jumpState, stepDt, groundY, jumpReq);
          jumpState = res.state;
          visualScaleY = res.visualScaleY;
          visualScaleXZ = res.visualScaleXZ;
          if (res.justJumped) didJump = true;
          if (res.justLanded) didLand = true;
          jumpReq = false;
          jumpRemDt -= stepDt;
          jumpSubsteps++;
        }

        if (didJump) {
          curProps.onJumpSound();
        }
        if (didLand) {
          curProps.onLandSound();
          triggerLandingDust(playerState.x, PARK_GROUND_Y + jumpState.y, playerState.z);
        }

        const nextJumpingAttr = jumpState.isGrounded ? 'false' : 'true';
        if (nextJumpingAttr !== prevJumpingAttr) {
          prevJumpingAttr = nextJumpingAttr;
          document.body.dataset.jumping = nextJumpingAttr;
        }

        // Update 3D ground click target indicator ring
        if (playerState.moveTarget) {
          targetRingGroup.visible = true;
          const targetGroundY = getGroundElevationAt(
            playerState.moveTarget.x,
            playerState.moveTarget.z,
          );
          targetRingGroup.position.set(
            playerState.moveTarget.x,
            PARK_GROUND_Y + targetGroundY + 0.045,
            playerState.moveTarget.z,
          );
          const pulse = 1 + 0.14 * Math.sin(elapsed * 6.5);
          outerRingMesh.scale.setScalar(pulse);
        } else {
          targetRingGroup.visible = false;
        }

        activeRig.root.position.set(playerState.x, PARK_GROUND_Y + jumpState.y, playerState.z);
        activeRig.root.rotation.y = playerState.yaw;
        activeRig.animate(
          Math.min(1, playerState.speed / 3.9),
          playerState.walkPhase,
          elapsed,
          Math.max(0, jumpState.y - groundY),
          jumpState.vy,
          visualScaleY,
          visualScaleXZ,
        );
        activeOverhead.setIdentity(curProps.localNickname, false);

        curProps.onLocalMoveSample(
          playerState.x,
          playerState.z,
          playerState.yaw,
          playerMoving || playerState.speed > 0.25,
          jumpState.y,
        );

        // Proximity detection (throttled callbacks only on change)
        const nearShrineNow = isNearShrineEntrance(playerState.x, playerState.z);
        if (nearShrineNow !== prevNearShrine) {
          prevNearShrine = nearShrineNow;
          curProps.onNearShrineChange(nearShrineNow);
        }

        const nearStarlightNow = isNearStarlightTelescope(playerState.x, playerState.z);
        if (nearStarlightNow !== prevNearStarlight) {
          prevNearStarlight = nearStarlightNow;
          curProps.onNearStarlightChange(nearStarlightNow);
        }

        const nearZodiac = findNearestZodiac(playerState.x, playerState.z, 3.2);
        currentNearestZodiac = nearZodiac ? nearZodiac.statue : null;
        const nearZodiacId = currentNearestZodiac ? currentNearestZodiac.id : null;
        if (nearZodiacId !== prevNearestZodiacId) {
          prevNearestZodiacId = nearZodiacId;
          curProps.onNearestZodiacChange(currentNearestZodiac);
        }
      } else {
        targetRingGroup.visible = false;
        activeRig.root.visible = false;
      }

      // Animate pooled landing starlight dust puff
      if (dustTimer > 0) {
        dustTimer = Math.max(0, dustTimer - wallDt);
        const progress = 1 - dustTimer / DUST_DURATION;
        dustMat.opacity = (1 - progress) * 0.85;
        for (let i = 0; i < dustParticles.length; i++) {
          const p = dustParticles[i];
          p.mesh.position.x += p.vx * wallDt;
          p.mesh.position.y += p.vy * wallDt;
          p.mesh.position.z += p.vz * wallDt;
          p.vy -= 2.4 * wallDt;
          p.mesh.scale.setScalar(Math.max(0.1, 1 - progress * 0.7));
          if (dustTimer <= 0) {
            p.mesh.visible = false;
          }
        }
      }

      const localEmoteAnimating = activeOverhead.update(now, elapsed);

      // 2b. Remote Online Players (or 2 Gentle AI Fallback Visitors when Supabase is unset)
      let remoteAnimating = false;
      const desiredRemoteList = curProps.isMultiplayerActive
        ? curProps.remotePlayers.map((p, idx) => ({
            userId: p.userId,
            nickname: p.nickname,
            character: p.character,
            state: p.state,
            fallbackX: ((idx % 5) - 2) * 1.4,
            fallbackZ: p.state === 'praying' ? 5.2 : 25.4 + Math.floor(idx / 5) * 1.2,
            fallbackYaw: Math.PI,
            hasDirectPose: false,
            directX: 0,
            directZ: 0,
            directYaw: Math.PI,
            directMoving: false,
          }))
        : computeAiFallbackVisitors(elapsed).map((v) => ({
            userId: v.userId,
            nickname: v.nickname,
            character: v.character,
            state: v.state,
            fallbackX: v.x,
            fallbackZ: v.z,
            fallbackYaw: v.rotationY,
            hasDirectPose: true,
            directX: v.x,
            directZ: v.z,
            directYaw: v.rotationY,
            directMoving: v.isMoving,
          }));

      const activeRemoteIds = new Set(desiredRemoteList.map((d) => d.userId));
      for (const [id, entry] of remoteVisualsMap.entries()) {
        if (!activeRemoteIds.has(id)) {
          removeRemoteEntry(entry);
          remoteVisualsMap.delete(id);
        }
      }

      for (const desired of desiredRemoteList) {
        let entry = remoteVisualsMap.get(desired.userId);
        if (!entry) {
          entry = spawnRemoteEntry(
            desired.userId,
            desired.character,
            desired.nickname,
            desired.state === 'praying',
            desired.hasDirectPose ? desired.directX : desired.fallbackX,
            desired.hasDirectPose ? desired.directZ : desired.fallbackZ,
            desired.hasDirectPose ? desired.directYaw : desired.fallbackYaw,
          );
          remoteVisualsMap.set(desired.userId, entry);
        } else if (entry.character !== desired.character) {
          const { x, z, yaw, targetX, targetZ, targetYaw, isMoving, walkPhase, lastMoveAtMs } = entry;
          removeRemoteEntry(entry);
          entry = spawnRemoteEntry(
            desired.userId,
            desired.character,
            desired.nickname,
            desired.state === 'praying',
            x,
            z,
            yaw,
          );
          entry.targetX = targetX;
          entry.targetZ = targetZ;
          entry.targetYaw = targetYaw;
          entry.isMoving = isMoving;
          entry.walkPhase = walkPhase;
          entry.lastMoveAtMs = lastMoveAtMs;
          remoteVisualsMap.set(desired.userId, entry);
        }

        entry.overhead.setIdentity(desired.nickname, desired.state === 'praying');
        if (desired.hasDirectPose) {
          entry.targetX = desired.directX;
          entry.targetZ = desired.directZ;
          entry.targetYaw = desired.directYaw;
          entry.isMoving = desired.directMoving;
          entry.lastMoveAtMs = now;
        }
      }

      // Drain queued Supabase Broadcast move & emote payloads
      if (curProps.remoteMoveQueueRef.current.length > 0) {
        const moveQueue = curProps.remoteMoveQueueRef.current;
        for (let i = 0; i < moveQueue.length; i++) {
          const m = moveQueue[i];
          const entry = remoteVisualsMap.get(m.userId);
          if (entry) {
            entry.targetX = m.x;
            entry.targetZ = m.z;
            entry.targetY = m.y ?? 0;
            entry.targetYaw = m.rotationY;
            entry.isMoving = m.isMoving;
            entry.lastMoveAtMs = now;
          }
        }
        moveQueue.length = 0;
      }

      if (curProps.remoteEmoteQueueRef.current.length > 0) {
        const emoteQueue = curProps.remoteEmoteQueueRef.current;
        for (let i = 0; i < emoteQueue.length; i++) {
          const em = emoteQueue[i];
          const entry = remoteVisualsMap.get(em.userId);
          if (entry) {
            entry.overhead.triggerEmote(em.emote);
          }
        }
        emoteQueue.length = 0;
      }

      const remoteLerp = 1 - Math.exp(-10 * wallDt);
      for (const entry of remoteVisualsMap.values()) {
        entry.x = THREE.MathUtils.lerp(entry.x, entry.targetX, remoteLerp);
        entry.z = THREE.MathUtils.lerp(entry.z, entry.targetZ, remoteLerp);
        entry.y = THREE.MathUtils.lerp(entry.y, entry.targetY, remoteLerp);
        entry.yaw = dampAngle(entry.yaw, entry.targetYaw, 10, wallDt);

        const distRemaining = Math.hypot(entry.targetX - entry.x, entry.targetZ - entry.z);
        const movingNow = entry.isMoving || distRemaining > 0.04;
        if (movingNow) {
          entry.walkPhase += wallDt * 8.4;
          remoteAnimating = true;
        }
        const remoteGroundY = getGroundElevationAt(entry.x, entry.z);
        const remoteWorldY = PARK_GROUND_Y + Math.max(remoteGroundY, entry.y);
        entry.rig.root.position.set(entry.x, remoteWorldY, entry.z);
        entry.rig.root.rotation.y = entry.yaw;
        entry.rig.animate(
          movingNow ? 0.78 : 0,
          entry.walkPhase,
          elapsed,
          Math.max(0, entry.y - remoteGroundY),
          0,
        );
        if (entry.overhead.update(now, elapsed)) {
          remoteAnimating = true;
        }
      }

      // 3. Camera Controller (3rd-Person Follow vs. 1st-Person Shrine Ritual)
      if (curProps.viewMode === 'park') {
        const camJumpFollow = jumpState.y * 0.35;
        _desiredLookAt.set(playerState.x, PARK_GROUND_Y + 0.92 + camJumpFollow, playerState.z);
        _desiredCamPos.set(
          playerState.x - Math.sin(camYaw) * Math.cos(camPitch) * camDistance,
          PARK_GROUND_Y + 0.95 + camJumpFollow + Math.sin(camPitch) * camDistance,
          playerState.z - Math.cos(camYaw) * Math.cos(camPitch) * camDistance,
        );

        const camLerp = cameraTransitionActive
          ? 1 - Math.exp(-6.5 * wallDt)
          : 1 - Math.exp(-11 * wallDt);
        camera.position.lerp(_desiredCamPos, camLerp);
        controls.target.lerp(_desiredLookAt, camLerp);
        camera.lookAt(controls.target);

        if (cameraTransitionActive) {
          cameraTransitionElapsed += wallDt;
          if (
            camera.position.distanceTo(_desiredCamPos) < 0.08 ||
            cameraTransitionElapsed > 1.2
          ) {
            cameraTransitionActive = false;
          }
        }
      } else if (cameraTransitionActive) {
        cameraTransitionElapsed += wallDt;
        const camLerp = 1 - Math.exp(-6.8 * wallDt);
        camera.position.lerp(_shrineCamPos, camLerp);
        controls.target.lerp(_shrineLookAt, camLerp);
        camera.lookAt(controls.target);
        if (camera.position.distanceTo(_shrineCamPos) < 0.05 || cameraTransitionElapsed > 1.1) {
          camera.position.copy(_shrineCamPos);
          controls.target.copy(_shrineLookAt);
          camera.lookAt(controls.target);
          cameraTransitionActive = false;
          controls.enabled = true;
          controls.update();
        }
      }

      // 4. Swaying Lotus Lanterns & White Paper Wish Tags
      for (let i = 0; i < shrineRig.lanterns.length; i++) {
        const l = shrineRig.lanterns[i];
        const wind =
          Math.sin(elapsed * 1.15 + l.phase) * 0.045 +
          Math.sin(elapsed * 2.3 + l.phase * 1.7) * 0.015;
        l.pivot.rotation.z = wind;
        l.pivot.rotation.x = Math.cos(elapsed * 0.9 + l.phase) * 0.025;
        l.tagPivot.rotation.z = wind * 1.45 + Math.sin(elapsed * 2.8 + l.phase) * 0.04;
        l.bodyMaterial.emissiveIntensity = THREE.MathUtils.lerp(
          l.bodyMaterial.emissiveIntensity,
          targetPreset.lanternGlow,
          dampAlpha,
        );
      }
      for (let i = 0; i < shrineRig.lanternLights.length; i++) {
        shrineRig.lanternLights[i].intensity = THREE.MathUtils.lerp(
          shrineRig.lanternLights[i].intensity,
          targetPreset.lanternPointIntensity,
          dampAlpha,
        );
      }

      // 5. Spirit Wisps & Drifting Mountain Motes
      for (let i = 0; i < shrineRig.spiritWisps.length; i++) {
        const w = shrineRig.spiritWisps[i];
        w.sprite.position.x = w.basePos.x + Math.sin(elapsed * 0.55 + w.phase) * 0.14;
        w.sprite.position.y = w.basePos.y + Math.sin(elapsed * 0.9 + w.phase) * 0.11;
        w.sprite.position.z = w.basePos.z + Math.cos(elapsed * 0.5 + w.phase) * 0.1;
        const mat = w.sprite.material as THREE.SpriteMaterial;
        mat.opacity =
          targetPreset.wispOpacity * (0.75 + 0.25 * Math.sin(elapsed * 1.4 + w.phase));
      }

      // Lightweight transform drift for mountain motes (zero per-frame GPU vertex buffer upload)
      shrineRig.motePoints.position.set(
        Math.sin(elapsed * 0.35) * 0.25,
        Math.sin(elapsed * 0.52) * 0.14,
        Math.cos(elapsed * 0.31) * 0.2,
      );

      // 6. Step 1 Camera Bowing Choreography (only in 'shrine' mode)
      if (bowTriggerRef.current.active) {
        bowTriggerRef.current.elapsed += wallDt;
        const bowPeriod = 2.2;
        const totalBowTime = bowPeriod * 3;
        const t = bowTriggerRef.current.elapsed;
        const beatIndex = Math.min(2, Math.floor(t / bowPeriod));

        if (beatIndex > bowTriggerRef.current.lastBeat && t < totalBowTime) {
          bowTriggerRef.current.lastBeat = beatIndex;
          curProps.onBowBeat(beatIndex);
        }

        if (t < totalBowTime) {
          const localPhase = (t % bowPeriod) / bowPeriod;
          const bowCurve = Math.sin(localPhase * Math.PI);
          _targetCamOffset.set(
            0.22 * (1 - bowCurve * 0.6),
            2.28 - bowCurve * 0.58,
            6.2 - bowCurve * 1.45,
          );
          camera.position.lerp(_targetCamOffset, 1 - Math.exp(-6 * wallDt));
          controls.target.set(0, 1.32 - bowCurve * 0.24, 0.0);
          camera.lookAt(controls.target);
        } else {
          bowTriggerRef.current.active = false;
          camera.position.copy(_shrineCamPos);
          controls.target.copy(_shrineLookAt);
          camera.lookAt(controls.target);
          curProps.onBowingComplete();
        }
      }

      // 7. Step 3 Golden Wish Embers
      if (emberTriggerRef.current.active) {
        emberTriggerRef.current.elapsed += wallDt;
        const t = emberTriggerRef.current.elapsed;
        const ePos = shrineRig.emberPoints.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < ePos.count; i++) {
          let ex = ePos.getX(i);
          let ey = ePos.getY(i);
          let ez = ePos.getZ(i);
          if (t < 1.1) {
            ex += (0 - ex) * wallDt * 1.6 + shrineRig.emberVelocities[i * 3] * wallDt * 0.5;
            ey += (0.92 - ey) * wallDt * 1.3 + 0.18 * wallDt;
            ez += (0 - ez) * wallDt * 1.6;
          } else {
            ex += Math.sin(t * 2.5 + i) * 0.35 * wallDt + shrineRig.emberVelocities[i * 3] * wallDt;
            ey += shrineRig.emberVelocities[i * 3 + 1] * wallDt * 1.4;
            ez += shrineRig.emberVelocities[i * 3 + 2] * wallDt * 0.4;
          }
          ePos.setXYZ(i, ex, ey, ez);
        }
        ePos.needsUpdate = true;
        const fade = t < 0.4 ? t / 0.4 : Math.max(0, 1 - (t - 0.4) / 2.0);
        shrineRig.emberMaterial.opacity = fade * 0.95;
        auraGlowIntensity = Math.max(auraGlowIntensity, fade * 0.55);

        if (t >= 2.4) {
          emberTriggerRef.current.active = false;
          shrineRig.emberMaterial.opacity = 0;
        }
      }

      // 8. Step 2 & Step 4 Stone Lift Physics
      const activePull =
        curProps.viewMode === 'shrine' &&
        (curProps.ritualStep === 2 || curProps.ritualStep === 4) &&
        (pointerPullActive || curProps.externalPullActive);

      const isStep4 = curProps.ritualStep === 4;
      const mode =
        isStep4 &&
        (curProps.resolvedOutcome === 'granted' ||
          step4DecidedOutcome === 'granted' ||
          (!step4DecisionTriggered && curProps.pendingOutcomeDecision === 'granted'))
          ? 'heavy_immovable'
          : 'normal_lift';

      if (activePull && !wasPullingPrev) {
        curProps.onStoneLiftStart(mode === 'heavy_immovable');
      }
      wasPullingPrev = activePull;

      liftState.isPulling = activePull;
      let remainingDt = wallDt;
      let substeps = 0;
      while (remainingDt > 0.0001 && substeps < 16) {
        const stepDt = Math.min(remainingDt, 0.03);
        liftState = stepStoneLiftPhysics(liftState, stepDt, mode);
        remainingDt -= stepDt;
        substeps++;
      }

      const liftMeters = liftState.liftProgress * 0.165;
      const trembleX =
        liftState.trembleAmplitude > 0.01
          ? Math.sin(elapsed * 54) * 0.0045 * liftState.trembleAmplitude
          : 0;
      const trembleZ =
        liftState.trembleAmplitude > 0.01
          ? Math.cos(elapsed * 47) * 0.0035 * liftState.trembleAmplitude
          : 0;

      shrineRig.dolhalmaeGroup.position.set(
        trembleX,
        shrineRig.dolhalmaeRestY + liftMeters,
        trembleZ,
      );

      if (curProps.viewMode === 'shrine' && curProps.ritualStep === 2) {
        if (liftState.liftProgress >= 0.58) {
          step2ReachedPeak = true;
        }
        if (step2ReachedPeak && !activePull && liftState.liftProgress <= 0.04) {
          step2ReachedPeak = false;
          curProps.onStoneSettledStep2(liftState.holdSeconds);
        }
      }

      if (curProps.viewMode === 'shrine' && curProps.ritualStep === 4 && !step4DecisionTriggered) {
        if (mode === 'heavy_immovable') {
          if (activePull) {
            step4OutcomeLockTime += wallDt;
            auraGlowIntensity = Math.min(0.65, step4OutcomeLockTime * 0.55);
            if (step4OutcomeLockTime >= 1.1) {
              step4DecisionTriggered = true;
              step4DecidedOutcome = 'granted';
              curProps.onSecondLiftResolved('granted', liftState.holdSeconds);
            }
          }
        } else {
          if (liftState.liftProgress >= 0.58) {
            step4DecidedOutcome = 'retry';
          }
          if (step4DecidedOutcome === 'retry' && !activePull && liftState.liftProgress <= 0.04) {
            step4DecisionTriggered = true;
            curProps.onSecondLiftResolved('retry', liftState.holdSeconds);
          }
        }
      }

      // Snap near-converged values so SwiftShader software loop can cleanly go idle
      const targetResultGlow =
        curProps.ritualStep === 'result' && curProps.resolvedOutcome === 'granted' ? 0.55 : 0;
      auraGlowIntensity = THREE.MathUtils.lerp(
        auraGlowIntensity,
        targetResultGlow,
        1 - Math.exp(-4.8 * wallDt),
      );
      if (Math.abs(auraGlowIntensity - targetResultGlow) <= 0.01) {
        auraGlowIntensity = targetResultGlow;
      }
      if (Math.abs(keyLight.intensity - targetPreset.sunIntensity) <= 0.015) {
        keyLight.intensity = targetPreset.sunIntensity;
      }
      if (Math.abs(scene.environmentIntensity - targetPreset.envIntensity) <= 0.01) {
        scene.environmentIntensity = targetPreset.envIntensity;
      }

      shrineRig.dolhalmaeAuraMaterial.opacity =
        auraGlowIntensity * (0.85 + 0.15 * Math.sin(elapsed * 2.2));
      shrineRig.dolhalmaePointLight.intensity =
        (curProps.timeOfDay === 'night' ? 0.65 : 0.3) + auraGlowIntensity * 1.4;

      if (curProps.viewMode === 'shrine' && !bowTriggerRef.current.active && !cameraTransitionActive) {
        controls.update();
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        const jumpAnimating =
          !jumpState.isGrounded ||
          jumpState.landSquashTimer > 0 ||
          jumpState.takeoffTimer > 0 ||
          dustTimer > 0;
        const meteorAnimating = elapsed < meteorShowerActiveUntil;
        const activeAnim =
          playerMoving ||
          jumpAnimating ||
          meteorAnimating ||
          parkOrbitDragging ||
          cameraTransitionActive ||
          bowTriggerRef.current.active ||
          emberTriggerRef.current.active ||
          localEmoteAnimating ||
          remoteAnimating ||
          activePull ||
          liftState.liftProgress > 0.01 ||
          Math.abs(liftState.velocity) > 0.02 ||
          Math.abs(keyLight.intensity - targetPreset.sunIntensity) > 0.015 ||
          Math.abs(auraGlowIntensity - targetResultGlow) > 0.01;
        if (activeAnim) {
          const fastAnim =
            playerMoving ||
            jumpAnimating ||
            cameraTransitionActive ||
            localEmoteAnimating ||
            bowTriggerRef.current.active ||
            emberTriggerRef.current.active;
          scheduleSoftwareTick(fastAnim ? 90 : meteorAnimating ? 180 : 480);
        }
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    if (isSoftwareGl) {
      // Position local mascot & initial 2 AI fallback visitors before first frame
      const activeRig = propsRef.current.activeCharacter === 'byeori' ? byeoriRig : bichiRig;
      const inactiveRig = propsRef.current.activeCharacter === 'byeori' ? bichiRig : byeoriRig;
      activeRig.root.visible = initialMode === 'park';
      inactiveRig.root.visible = false;
      activeRig.root.position.set(playerState.x, PARK_GROUND_Y, playerState.z);
      activeRig.root.rotation.y = playerState.yaw;

      if (!propsRef.current.isMultiplayerActive) {
        const aiList = computeAiFallbackVisitors(0);
        for (const v of aiList) {
          const entry = spawnRemoteEntry(
            v.userId,
            v.character,
            v.nickname,
            v.state === 'praying',
            v.x,
            v.z,
            v.rotationY,
          );
          remoteVisualsMap.set(v.userId, entry);
        }
      }
      renderer.render(scene, camera);
      scheduleSoftwareTick(480);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      controls.removeEventListener('change', wakeSoftwareLoop);
      wakeSoftwareLoopRef.current = null;
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('contextmenu', onContextMenu);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', clearInputs);
      window.removeEventListener('blur', clearInputs);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      outerRingGeo.dispose();
      innerDotGeo.dispose();
      outerRingMat.dispose();
      dustGeo.dispose();
      dustMat.dispose();
      shrineRig.dispose();
      parkRig.dispose();
      byeoriOverhead.dispose();
      bichiOverhead.dispose();
      byeoriRig.dispose();
      bichiRig.dispose();
      for (const entry of remoteVisualsMap.values()) {
        removeRemoteEntry(entry);
      }
      remoteVisualsMap.clear();
      mascotShadowTex.dispose();
      envTex?.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      data-testid="sanctuary-canvas-mount"
      aria-label="영천 북안면 돌할매공원 3D 전경"
      className="absolute inset-0 w-full h-full select-none"
    />
  );
}
