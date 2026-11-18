import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildShrineScene, type ShrineSceneRig } from './shrineBuilder';
import {
  stepStoneLiftPhysics,
  type LiftPhysicsState,
  type RitualOutcome,
  type RitualStep,
  type SavedWishTag,
  type TimeOfDay,
} from '../ritual/ritualLogic';

export interface SanctuaryCanvasProps {
  timeOfDay: TimeOfDay;
  ritualStep: RitualStep;
  bowSequenceId: number;
  wishEmberSequenceId: number;
  externalPullActive: boolean;
  resolvedOutcome: RitualOutcome | null;
  pendingOutcomeDecision: RitualOutcome;
  savedWishTags: SavedWishTag[];
  latestHungTag: SavedWishTag | null;
  onBowBeat: (bowIndex: number) => void;
  onBowingComplete: () => void;
  onStoneLiftStart: (isHeavyResonance: boolean) => void;
  onStoneSettledStep2: (holdDuration: number) => void;
  onSecondLiftResolved: (outcome: RitualOutcome, holdDuration: number) => void;
  onStoneHoverChange: (hovered: boolean) => void;
  onPullStateChange: (pulling: boolean) => void;
}

interface LightingPreset {
  skyColor: THREE.Color;
  fogColor: THREE.Color;
  fogDensity: number;
  sunColor: THREE.Color;
  sunIntensity: number;
  sunPos: THREE.Vector3;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiIntensity: number;
  lanternGlow: number;
  lanternPointIntensity: number;
  wispOpacity: number;
  exposure: number;
  envIntensity: number;
}

const PRESETS: Record<TimeOfDay, LightingPreset> = {
  dawn: {
    skyColor: new THREE.Color(0x9fb2bf),
    fogColor: new THREE.Color(0xb2c2cc),
    fogDensity: 0.034,
    sunColor: new THREE.Color(0xffdfba),
    sunIntensity: 1.45,
    sunPos: new THREE.Vector3(9, 7.5, 5),
    hemiSky: new THREE.Color(0xc2d6e4),
    hemiGround: new THREE.Color(0x474f40),
    hemiIntensity: 0.85,
    lanternGlow: 0.25,
    lanternPointIntensity: 0.25,
    wispOpacity: 0.34,
    exposure: 1.04,
    envIntensity: 0.7,
  },
  sunset: {
    skyColor: new THREE.Color(0xb87b56),
    fogColor: new THREE.Color(0xc8895f),
    fogDensity: 0.025,
    sunColor: new THREE.Color(0xffb25c),
    sunIntensity: 2.15,
    sunPos: new THREE.Vector3(-8.5, 5.2, 7.5),
    hemiSky: new THREE.Color(0x8893b8),
    hemiGround: new THREE.Color(0x453528),
    hemiIntensity: 0.72,
    lanternGlow: 0.72,
    lanternPointIntensity: 0.72,
    wispOpacity: 0.54,
    exposure: 1.1,
    envIntensity: 0.58,
  },
  night: {
    skyColor: new THREE.Color(0x0b1222),
    fogColor: new THREE.Color(0x0d1528),
    fogDensity: 0.03,
    sunColor: new THREE.Color(0x7c9ed4),
    sunIntensity: 0.42,
    sunPos: new THREE.Vector3(6, 11, 8),
    hemiSky: new THREE.Color(0x223358),
    hemiGround: new THREE.Color(0x10141c),
    hemiIntensity: 0.36,
    lanternGlow: 1.85,
    lanternPointIntensity: 2.25,
    wispOpacity: 0.82,
    exposure: 1.16,
    envIntensity: 0.14,
  },
};

// Module-level scratch vectors to avoid GC inside animation loop
const _pointerNdc = new THREE.Vector2();
const _targetCamOffset = new THREE.Vector3();

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

  const rigRef = useRef<ShrineSceneRig | null>(null);
  const wakeSoftwareLoopRef = useRef<(() => void) | null>(null);
  const bowTriggerRef = useRef({ lastId: 0, active: false, elapsed: 0, lastBeat: -1 });
  const emberTriggerRef = useRef({ lastId: 0, active: false, elapsed: 0 });
  const lastHungTagIdRef = useRef<string | null>(null);

  useEffect(() => {
    wakeSoftwareLoopRef.current?.();
  }, [
    props.timeOfDay,
    props.ritualStep,
    props.externalPullActive,
    props.resolvedOutcome,
    props.bowSequenceId,
    props.wishEmberSequenceId,
    props.latestHungTag,
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
      const rig = rigRef.current;
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
    if (props.latestHungTag && props.latestHungTag.id !== lastHungTagIdRef.current && rigRef.current) {
      lastHungTagIdRef.current = props.latestHungTag.id;
      rigRef.current.addUserWishTag(props.latestHungTag);
    }
  }, [props.latestHungTag]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = PRESETS[propsRef.current.timeOfDay].exposure;
    renderer.setPixelRatio(isSoftwareGl ? 0.5 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);

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
    scene.background = initialPreset.skyColor.clone();
    scene.fog = new THREE.FogExp2(initialPreset.fogColor.getHex(), initialPreset.fogDensity);

    let envTex: THREE.Texture | null = null;
    if (!isSoftwareGl) {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTex;
      scene.environmentIntensity = initialPreset.envIntensity;
      pmremGenerator.dispose();
    }

    const aspect = (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight);
    const camera = new THREE.PerspectiveCamera(46, aspect, 0.1, 140);
    camera.position.set(0.22, 2.28, 6.2);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.32, 0.0);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.055;
    controls.enablePan = false;
    controls.minDistance = 1.45;
    controls.maxDistance = 10.0;
    controls.minPolarAngle = Math.PI * 0.18;
    controls.maxPolarAngle = Math.PI * 0.51;
    controls.minAzimuthAngle = -Math.PI * 0.44;
    controls.maxAzimuthAngle = Math.PI * 0.44;
    controls.update();

    // Warm / Cool Lighting Rig (1 shadow-casting directional key + Hemisphere fill)
    const hemiLight = new THREE.HemisphereLight(
      initialPreset.hemiSky.getHex(),
      initialPreset.hemiGround.getHex(),
      initialPreset.hemiIntensity + (isSoftwareGl ? 0.16 : 0),
    );
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(initialPreset.sunColor.getHex(), initialPreset.sunIntensity);
    keyLight.position.copy(initialPreset.sunPos);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 28;
    const d = 6.5;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    // Subtle rim light separating dark Dolhalmae & mossy rock
    const rimLight = new THREE.DirectionalLight(0xd9c2a3, 0.42);
    rimLight.position.set(3.5, 4.0, -5.0);
    scene.add(rimLight);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const rig = buildShrineScene(maxAniso, propsRef.current.savedWishTags, isSoftwareGl);
    rigRef.current = rig;
    scene.add(rig.root);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Raycasting for direct click-and-hold / drag-upward on Dolhalmae stone
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);

    let pointerPullActive = false;
    let pointerDownY = 0;
    let stoneHovered = false;
    let lastHoverCheck = 0;

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
      const step = propsRef.current.ritualStep;
      return step === 2 || step === 4;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!isStoneInteractable()) return;
      updatePointerNdc(e.clientX, e.clientY);
      raycaster.setFromCamera(_pointerNdc, camera);
      const hits = raycaster.intersectObject(rig.dolhalmaeRaycastMesh, false);
      if (hits.length > 0) {
        pointerPullActive = true;
        pointerDownY = e.clientY;
        controls.enabled = false;
        renderer.domElement.style.cursor = 'grabbing';
        propsRef.current.onPullStateChange(true);
        wakeSoftwareLoop();
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (pointerPullActive) {
        // Dragging upward subtly reinforces lift feel
        const dy = pointerDownY - e.clientY;
        if (dy < -90) {
          // User dragged downward explicitly -> release
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
      raycaster.setFromCamera(_pointerNdc, camera);
      const hits = raycaster.intersectObject(rig.dolhalmaeRaycastMesh, false);
      const nextHovered = hits.length > 0;
      if (nextHovered !== stoneHovered) {
        stoneHovered = nextHovered;
        renderer.domElement.style.cursor = nextHovered ? 'grab' : 'default';
        propsRef.current.onStoneHoverChange(nextHovered);
      }
    };

    const releasePointerPull = () => {
      if (pointerPullActive) {
        pointerPullActive = false;
        controls.enabled = true;
        renderer.domElement.style.cursor = stoneHovered ? 'grab' : 'default';
        propsRef.current.onPullStateChange(false);
        wakeSoftwareLoop();
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', releasePointerPull);
    window.addEventListener('pointercancel', releasePointerPull);
    window.addEventListener('blur', releasePointerPull);

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

    // Track step resets cleanly
    let prevStep: RitualStep = propsRef.current.ritualStep;

    let frameId = 0;
    let disposed = false;
    let prevTime = performance.now();
    let elapsed = 0;
    let softwareLoopPending = false;

    const scheduleSoftwareTick = (delayMs: number) => {
      if (!isSoftwareGl || disposed || softwareLoopPending) return;
      softwareLoopPending = true;
      frameId = window.setTimeout(tick, delayMs);
    };

    const wakeSoftwareLoop = () => {
      if (!isSoftwareGl || disposed || softwareLoopPending) return;
      prevTime = performance.now();
      scheduleSoftwareTick(24);
    };
    wakeSoftwareLoopRef.current = wakeSoftwareLoop;
    controls.addEventListener('change', wakeSoftwareLoop);

    function tick() {
      if (disposed) return;
      softwareLoopPending = false;
      const now = performance.now();
      const wallDt = Math.min(Math.max((now - prevTime) / 1000, 0.001), isSoftwareGl ? 1.5 : 0.25);
      prevTime = now;
      elapsed += wallDt;

      const curProps = propsRef.current;

      // Reset local lift markers on step transitions
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

      // 1. Smooth Time-of-Day lighting & sky interpolation (wallDt so transitions finish in ~1s on any GPU)
      const targetPreset = PRESETS[curProps.timeOfDay];
      const dampAlpha = 1 - Math.exp(-4.8 * wallDt);

      (scene.background as THREE.Color).lerp(targetPreset.skyColor, dampAlpha);
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.lerp(targetPreset.fogColor, dampAlpha);
        scene.fog.density = THREE.MathUtils.lerp(scene.fog.density, targetPreset.fogDensity, dampAlpha);
      }
      keyLight.color.lerp(targetPreset.sunColor, dampAlpha);
      keyLight.intensity = THREE.MathUtils.lerp(keyLight.intensity, targetPreset.sunIntensity, dampAlpha);
      keyLight.position.lerp(targetPreset.sunPos, dampAlpha);

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

      // 2. Swaying Lotus Lanterns & White Paper Wish Tags
      for (let i = 0; i < rig.lanterns.length; i++) {
        const l = rig.lanterns[i];
        const wind = Math.sin(elapsed * 1.15 + l.phase) * 0.045 + Math.sin(elapsed * 2.3 + l.phase * 1.7) * 0.015;
        l.pivot.rotation.z = wind;
        l.pivot.rotation.x = Math.cos(elapsed * 0.9 + l.phase) * 0.025;
        l.tagPivot.rotation.z = wind * 1.45 + Math.sin(elapsed * 2.8 + l.phase) * 0.04;
        l.bodyMaterial.emissiveIntensity = THREE.MathUtils.lerp(
          l.bodyMaterial.emissiveIntensity,
          targetPreset.lanternGlow,
          dampAlpha,
        );
      }
      for (let i = 0; i < rig.lanternLights.length; i++) {
        rig.lanternLights[i].intensity = THREE.MathUtils.lerp(
          rig.lanternLights[i].intensity,
          targetPreset.lanternPointIntensity,
          dampAlpha,
        );
      }

      // 3. Spirit Wisps & Drifting Mountain Motes
      for (let i = 0; i < rig.spiritWisps.length; i++) {
        const w = rig.spiritWisps[i];
        w.sprite.position.x = w.basePos.x + Math.sin(elapsed * 0.55 + w.phase) * 0.14;
        w.sprite.position.y = w.basePos.y + Math.sin(elapsed * 0.9 + w.phase) * 0.11;
        w.sprite.position.z = w.basePos.z + Math.cos(elapsed * 0.5 + w.phase) * 0.1;
        const mat = w.sprite.material as THREE.SpriteMaterial;
        mat.opacity =
          targetPreset.wispOpacity * (0.75 + 0.25 * Math.sin(elapsed * 1.4 + w.phase));
      }

      const mPos = rig.motePoints.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < mPos.count; i++) {
        const bx = rig.moteBasePositions[i * 3];
        const by = rig.moteBasePositions[i * 3 + 1];
        const bz = rig.moteBasePositions[i * 3 + 2];
        const driftY = ((by + elapsed * 0.12) % 3.8) + 0.15;
        mPos.setXYZ(
          i,
          bx + Math.sin(elapsed * 0.45 + i) * 0.35,
          driftY,
          bz + Math.cos(elapsed * 0.35 + i * 0.7) * 0.3,
        );
      }
      mPos.needsUpdate = true;

      // 4. Step 1 Camera Bowing Choreography (3 serene bows over ~6.6s real time)
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
          const localPhase = (t % bowPeriod) / bowPeriod; // 0..1
          const bowCurve = Math.sin(localPhase * Math.PI); // smooth dip and rise
          _targetCamOffset.set(0.22 * (1 - bowCurve * 0.6), 2.28 - bowCurve * 0.58, 6.2 - bowCurve * 1.45);
          camera.position.lerp(_targetCamOffset, 1 - Math.exp(-6 * wallDt));
          controls.target.set(0, 1.32 - bowCurve * 0.24, 0.0);
          camera.lookAt(controls.target);
        } else {
          bowTriggerRef.current.active = false;
          _targetCamOffset.set(0.22, 2.28, 6.2);
          camera.position.copy(_targetCamOffset);
          controls.target.set(0, 1.32, 0.0);
          camera.lookAt(controls.target);
          curProps.onBowingComplete();
        }
      }

      // 5. Step 3 Golden Wish Embers dissolving into stone & rising to lanterns
      if (emberTriggerRef.current.active) {
        emberTriggerRef.current.elapsed += wallDt;
        const t = emberTriggerRef.current.elapsed;
        const ePos = rig.emberPoints.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < ePos.count; i++) {
          let ex = ePos.getX(i);
          let ey = ePos.getY(i);
          let ez = ePos.getZ(i);
          if (t < 1.1) {
            ex += (0 - ex) * wallDt * 1.6 + rig.emberVelocities[i * 3] * wallDt * 0.5;
            ey += (0.92 - ey) * wallDt * 1.3 + 0.18 * wallDt;
            ez += (0 - ez) * wallDt * 1.6;
          } else {
            ex += Math.sin(t * 2.5 + i) * 0.35 * wallDt + rig.emberVelocities[i * 3] * wallDt;
            ey += rig.emberVelocities[i * 3 + 1] * wallDt * 1.4;
            ez += rig.emberVelocities[i * 3 + 2] * wallDt * 0.4;
          }
          ePos.setXYZ(i, ex, ey, ez);
        }
        ePos.needsUpdate = true;
        const fade = t < 0.4 ? t / 0.4 : Math.max(0, 1 - (t - 0.4) / 2.0);
        rig.emberMaterial.opacity = fade * 0.95;
        auraGlowIntensity = Math.max(auraGlowIntensity, fade * 0.55);

        if (t >= 2.4) {
          emberTriggerRef.current.active = false;
          rig.emberMaterial.opacity = 0;
        }
      }

      // 6. Step 2 & Step 4 Stone Lift Physics (sub-stepped for 1:1 speed even on SwiftShader)
      const activePull =
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

      // Apply physical height (~16cm max lift) & subtle strain tremble
      const liftMeters = liftState.liftProgress * 0.165;
      const trembleX =
        liftState.trembleAmplitude > 0.01
          ? Math.sin(elapsed * 54) * 0.0045 * liftState.trembleAmplitude
          : 0;
      const trembleZ =
        liftState.trembleAmplitude > 0.01
          ? Math.cos(elapsed * 47) * 0.0035 * liftState.trembleAmplitude
          : 0;

      rig.dolhalmaeGroup.position.set(
        trembleX,
        rig.dolhalmaeRestY + liftMeters,
        trembleZ,
      );

      // Step 2 completion: lifted noticeably then settled back onto pedestal
      if (curProps.ritualStep === 2) {
        if (liftState.liftProgress >= 0.58) {
          step2ReachedPeak = true;
        }
        if (step2ReachedPeak && !activePull && liftState.liftProgress <= 0.04) {
          step2ReachedPeak = false;
          curProps.onStoneSettledStep2(liftState.holdSeconds);
        }
      }

      // Step 4 outcome resolution
      if (curProps.ritualStep === 4 && !step4DecisionTriggered) {
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

      // Golden aura & stone light feedback
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
      rig.dolhalmaeAuraMaterial.opacity = auraGlowIntensity * (0.85 + 0.15 * Math.sin(elapsed * 2.2));
      rig.dolhalmaePointLight.intensity =
        (curProps.timeOfDay === 'night' ? 0.65 : 0.3) + auraGlowIntensity * 1.4;

      if (!bowTriggerRef.current.active) {
        controls.update();
      }
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        const activeAnim =
          bowTriggerRef.current.active ||
          emberTriggerRef.current.active ||
          activePull ||
          liftState.liftProgress > 0.01 ||
          Math.abs(liftState.velocity) > 0.02 ||
          Math.abs(keyLight.intensity - targetPreset.sunIntensity) > 0.015 ||
          Math.abs(auraGlowIntensity - targetResultGlow) > 0.01;
        if (activeAnim) {
          scheduleSoftwareTick(520);
        }
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    if (isSoftwareGl) {
      renderer.render(scene, camera);
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
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', releasePointerPull);
      window.removeEventListener('pointercancel', releasePointerPull);
      window.removeEventListener('blur', releasePointerPull);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      rig.dispose();
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
      aria-label="영천 북안면 돌할매 3D 전각 풍경"
      className="absolute inset-0 w-full h-full select-none"
    />
  );
}
