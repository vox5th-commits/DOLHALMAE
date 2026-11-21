import { useCallback, useEffect, useRef, useState } from 'react';
import { SanctuaryAudio } from './audio/sanctuaryAudio';
import { HistoryModal } from './components/HistoryModal';
import { ParkOverlay, type JoystickInputState } from './components/ParkOverlay';
import { RitualCard } from './components/RitualCard';
import { StarlightModal } from './components/StarlightModal';
import { TopBarHUD } from './components/TopBarHUD';
import { ZodiacModal } from './components/ZodiacModal';
import {
  generateRandomNickname,
  getOrCreateVisitorId,
  loadOrCreateNickname,
  saveNickname,
} from './multiplayer/nickname';
import {
  ParkRealtimeClient,
  type PlayerEmoteKind,
  type PlayerEmotePayload,
  type PlayerMovePayload,
  type PlayerPresenceState,
} from './multiplayer/realtimeSync';
import type { MascotId, ViewMode } from './park/parkLayout';
import type { ZodiacStatueInfo } from './park/zodiacData';
import {
  WISH_STORAGE_KEY,
  createWishTagEntry,
  parseSavedWishTags,
  resolveSecondLiftOutcome,
  type RitualOutcome,
  type RitualStep,
  type SavedWishTag,
  type TimeOfDay,
} from './ritual/ritualLogic';
import { SanctuaryCanvas } from './scene/SanctuaryCanvas';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('park');
  const [activeCharacter, setActiveCharacter] = useState<MascotId>('byeori');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('sunset');
  const [ritualStep, setRitualStep] = useState<RitualStep>(1);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Nickname & Multiplayer identity state
  const [visitorId] = useState<string>(() => getOrCreateVisitorId());
  const [nickname, setNickname] = useState<string>(() => loadOrCreateNickname());
  const [isMultiplayerConnected, setIsMultiplayerConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const [remotePlayers, setRemotePlayers] = useState<PlayerPresenceState[]>([]);
  const [localEmoteSignal, setLocalEmoteSignal] = useState<{
    id: number;
    emote: PlayerEmoteKind;
  } | null>(null);

  // Park exploration states
  const [nearShrine, setNearShrine] = useState(false);
  const [nearStarlight, setNearStarlight] = useState(false);
  const [starlightOpen, setStarlightOpen] = useState(false);
  const [nearestZodiac, setNearestZodiac] = useState<ZodiacStatueInfo | null>(null);
  const [selectedZodiac, setSelectedZodiac] = useState<ZodiacStatueInfo | null>(null);
  const [wakeLoopSignal, setWakeLoopSignal] = useState(0);
  const [jumpSignal, setJumpSignal] = useState(0);
  const [warpStarlightSignal, setWarpStarlightSignal] = useState(0);
  const [meteorShowerSignal, setMeteorShowerSignal] = useState(0);
  const joystickInputRef = useRef<JoystickInputState>({ x: 0, y: 0, sprint: false });
  const pendingExitDestinationRef = useRef<{ x: number; z: number } | null>(null);
  const remoteMoveQueueRef = useRef<PlayerMovePayload[]>([]);
  const remoteEmoteQueueRef = useRef<PlayerEmotePayload[]>([]);
  const realtimeClientRef = useRef<ParkRealtimeClient | null>(null);
  const lastLocalPoseRef = useRef<{
    x: number;
    z: number;
    rotationY: number;
    isMoving: boolean;
    y: number;
  }>({ x: 0, z: 27.6, rotationY: Math.PI, isMoving: false, y: 0 });
  const prevRemoteCountRef = useRef(0);

  const [savedWishTags, setSavedWishTags] = useState<SavedWishTag[]>(() => {
    if (typeof window === 'undefined') return parseSavedWishTags(null);
    return parseSavedWishTags(window.localStorage.getItem(WISH_STORAGE_KEY));
  });
  const [latestHungTag, setLatestHungTag] = useState<SavedWishTag | null>(null);

  // Ritual step transient states
  const [isBowing, setIsBowing] = useState(false);
  const [bowCount, setBowCount] = useState(0);
  const [bowSequenceId, setBowSequenceId] = useState(0);

  const [isStoneHovered, setIsStoneHovered] = useState(false);
  const [isPullingStone, setIsPullingStone] = useState(false);
  const [externalPullActive, setExternalPullActive] = useState(false);

  const [identityInput, setIdentityInput] = useState('');
  const [wishInput, setWishInput] = useState('');
  const [isSendingEmbers, setIsSendingEmbers] = useState(false);
  const [wishEmberSequenceId, setWishEmberSequenceId] = useState(0);

  const [pendingOutcomeDecision, setPendingOutcomeDecision] = useState<RitualOutcome>('granted');
  const [resolvedOutcome, setResolvedOutcome] = useState<RitualOutcome | null>(null);
  const [hasHungWishTag, setHasHungWishTag] = useState(false);

  const audioRef = useRef<SanctuaryAudio | null>(null);
  const patienceSecondsRef = useRef(0);
  const wishStepEnteredAtRef = useRef<number>(Date.now());
  const emberTimeoutRef = useRef<number | null>(null);

  if (!audioRef.current) {
    audioRef.current = new SanctuaryAudio();
  }

  useEffect(() => {
    return () => {
      if (emberTimeoutRef.current !== null) {
        window.clearTimeout(emberTimeoutRef.current);
      }
      audioRef.current?.dispose();
    };
  }, []);

  // Connect to Supabase Realtime when VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY are configured
  useEffect(() => {
    const client = new ParkRealtimeClient(
      {
        userId: visitorId,
        nickname,
        character: activeCharacter,
        state: viewMode === 'shrine' ? 'praying' : 'walking',
      },
      {
        onConnectionChange: (connected, totalCount) => {
          setIsMultiplayerConnected(connected);
          setOnlineCount(totalCount);
        },
        onRemotePlayersChange: (players) => {
          if (players.length > prevRemoteCountRef.current) {
            const p = lastLocalPoseRef.current;
            client.sendMove(p.x, p.z, p.rotationY, p.isMoving, true, p.y);
          }
          prevRemoteCountRef.current = players.length;
          setRemotePlayers(players);
          setOnlineCount(players.length + 1);
          setIsMultiplayerConnected(true);
        },
        onRemoteMove: (payload) => {
          remoteMoveQueueRef.current.push(payload);
        },
        onRemoteEmote: (payload) => {
          remoteEmoteQueueRef.current.push(payload);
          setWakeLoopSignal((n) => n + 1);
        },
      },
    );
    realtimeClientRef.current = client;
    if (client.isMultiplayerConfigured) {
      client.connect();
    }
    return () => {
      client.disconnect();
      if (realtimeClientRef.current === client) {
        realtimeClientRef.current = null;
      }
    };
    // Run once on mount using visitorId; state changes push via updatePresence below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitorId]);

  // Sync local nickname, mascot choice, and praying/walking state to Supabase Presence
  useEffect(() => {
    realtimeClientRef.current?.updatePresence({
      nickname,
      character: activeCharacter,
      state: viewMode === 'shrine' ? 'praying' : 'walking',
    });
  }, [nickname, activeCharacter, viewMode]);

  // Expose state attributes on <body> for non-intrusive verification
  useEffect(() => {
    document.body.dataset.viewMode = viewMode;
    document.body.dataset.character = activeCharacter;
    document.body.dataset.ritualStep = String(ritualStep);
    document.body.dataset.timeOfDay = timeOfDay;
    document.body.dataset.outcome = resolvedOutcome ?? 'pending';
    document.body.dataset.nickname = nickname;
    document.body.dataset.multiplayer = isMultiplayerConnected ? 'online' : 'single';
  }, [
    viewMode,
    activeCharacter,
    ritualStep,
    timeOfDay,
    resolvedOutcome,
    nickname,
    isMultiplayerConnected,
  ]);

  const handleChangeNickname = useCallback((rawNickname: string) => {
    const saved = saveNickname(rawNickname);
    if (saved) {
      setNickname(saved);
    }
  }, []);

  const handleRerollNickname = useCallback(() => {
    const rolled = generateRandomNickname();
    const saved = saveNickname(rolled) ?? rolled;
    setNickname(saved);
    return saved;
  }, []);

  const handleSendEmote = useCallback((emote: PlayerEmoteKind) => {
    setLocalEmoteSignal((prev) => ({ id: (prev?.id ?? 0) + 1, emote }));
    realtimeClientRef.current?.sendEmote(emote);
    setWakeLoopSignal((n) => n + 1);
  }, []);

  const handleLocalMoveSample = useCallback(
    (x: number, z: number, rotationY: number, isMoving: boolean, y: number) => {
      lastLocalPoseRef.current = { x, z, rotationY, isMoving, y };
      realtimeClientRef.current?.sendMove(x, z, rotationY, isMoving, false, y);
    },
    [],
  );

  const handleToggleAudio = useCallback(() => {
    setAudioEnabled((prev) => {
      const next = !prev;
      audioRef.current?.setEnabled(next);
      return next;
    });
  }, []);

  const handleEnterShrine = useCallback(() => {
    setSelectedZodiac(null);
    setStarlightOpen(false);
    setViewMode('shrine');
    audioRef.current?.playGentleWindChime();
  }, []);

  const handleExitShrine = useCallback((walkTo?: { x: number; z: number }) => {
    setIsPullingStone(false);
    setExternalPullActive(false);
    pendingExitDestinationRef.current = walkTo ?? null;
    setViewMode('park');
  }, []);

  const handleToggleViewMode = useCallback(() => {
    if (viewMode === 'park') {
      handleEnterShrine();
    } else {
      handleExitShrine();
    }
  }, [viewMode, handleEnterShrine, handleExitShrine]);

  const handleJump = useCallback(() => {
    setJumpSignal((n) => n + 1);
  }, []);

  const handleWarpStarlight = useCallback(() => {
    setSelectedZodiac(null);
    setStarlightOpen(false);
    if (viewMode !== 'park') {
      setIsPullingStone(false);
      setExternalPullActive(false);
      pendingExitDestinationRef.current = null;
      setViewMode('park');
    }
    setWarpStarlightSignal((n) => n + 1);
    audioRef.current?.playStarlightChime();
  }, [viewMode]);

  const handleOpenStarlight = useCallback(() => {
    setSelectedZodiac(null);
    setStarlightOpen(true);
    audioRef.current?.playStarlightChime();
  }, []);

  const handleTriggerMeteorShower = useCallback(() => {
    setMeteorShowerSignal((n) => n + 1);
    audioRef.current?.playStarlightChime();
  }, []);

  const handleSelectZodiac = useCallback((statue: ZodiacStatueInfo) => {
    setSelectedZodiac(statue);
    audioRef.current?.playZodiacChime();
  }, []);

  const handleWakeLoop = useCallback(() => {
    setWakeLoopSignal((n) => n + 1);
  }, []);

  const handleParkFootstep = useCallback(() => {
    audioRef.current?.playParkFootstep();
  }, []);

  const handleJumpSound = useCallback(() => {
    audioRef.current?.playJumpSound();
  }, []);

  const handleLandSound = useCallback(() => {
    audioRef.current?.playLandSound();
  }, []);

  const handleStartBow = useCallback(() => {
    if (isBowing) return;
    setIsBowing(true);
    setBowCount(0);
    setBowSequenceId((n) => n + 1);
  }, [isBowing]);

  const handleBowBeat = useCallback((idx: number) => {
    setBowCount(idx);
    audioRef.current?.playBowChime(idx);
  }, []);

  const handleBowingComplete = useCallback(() => {
    setIsBowing(false);
    setBowCount(3);
    patienceSecondsRef.current += 2.0;
    setRitualStep(2);
  }, []);

  const handleStoneLiftStart = useCallback((isHeavyResonance: boolean) => {
    if (isHeavyResonance) {
      audioRef.current?.playHeavyMagneticResonance();
    } else {
      audioRef.current?.playStoneLiftFriction();
    }
  }, []);

  const handleStoneSettledStep2 = useCallback((holdDuration: number) => {
    audioRef.current?.playStoneSettleThud();
    patienceSecondsRef.current += holdDuration;
    setIsPullingStone(false);
    setExternalPullActive(false);
    wishStepEnteredAtRef.current = Date.now();
    setRitualStep(3);
  }, []);

  const handleSubmitWish = useCallback(() => {
    if (isSendingEmbers) return;
    const dwellSec = Math.min(8, (Date.now() - wishStepEnteredAtRef.current) / 1000);
    patienceSecondsRef.current += dwellSec;

    const outcome = resolveSecondLiftOutcome(patienceSecondsRef.current);
    setPendingOutcomeDecision(outcome);
    setResolvedOutcome(null);

    setIsSendingEmbers(true);
    setWishEmberSequenceId((n) => n + 1);
    audioRef.current?.playWishEmberChime();

    emberTimeoutRef.current = window.setTimeout(() => {
      setIsSendingEmbers(false);
      setRitualStep(4);
    }, 2400);
  }, [isSendingEmbers]);

  const handleSecondLiftResolved = useCallback((outcome: RitualOutcome, holdDuration: number) => {
    patienceSecondsRef.current += holdDuration;
    if (outcome === 'retry') {
      audioRef.current?.playStoneSettleThud();
    } else {
      audioRef.current?.playWishEmberChime();
    }
    setIsPullingStone(false);
    setExternalPullActive(false);
    setResolvedOutcome(outcome);
    setRitualStep('result');
  }, []);

  const handleHangWishTag = useCallback(() => {
    if (hasHungWishTag) return;
    const entry = createWishTagEntry(
      identityInput || nickname,
      wishInput || '마음속 간절한 소원',
      resolvedOutcome ?? 'granted',
    );
    setSavedWishTags((prev) => {
      const next = [entry, ...prev].slice(0, 24);
      try {
        window.localStorage.setItem(WISH_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage quota errors
      }
      return next;
    });
    setLatestHungTag(entry);
    setHasHungWishTag(true);
    audioRef.current?.playGentleWindChime();
  }, [hasHungWishTag, identityInput, nickname, wishInput, resolvedOutcome]);

  const handleRestartRitual = useCallback(() => {
    patienceSecondsRef.current = 0;
    setIsBowing(false);
    setBowCount(0);
    setIsPullingStone(false);
    setExternalPullActive(false);
    setIsSendingEmbers(false);
    setResolvedOutcome(null);
    setHasHungWishTag(false);
    setWishInput('');
    setRitualStep(1);
  }, []);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#181614]">
      <SanctuaryCanvas
        viewMode={viewMode}
        activeCharacter={activeCharacter}
        timeOfDay={timeOfDay}
        ritualStep={ritualStep}
        bowSequenceId={bowSequenceId}
        wishEmberSequenceId={wishEmberSequenceId}
        externalPullActive={externalPullActive}
        resolvedOutcome={resolvedOutcome}
        pendingOutcomeDecision={pendingOutcomeDecision}
        savedWishTags={savedWishTags}
        latestHungTag={latestHungTag}
        localNickname={nickname}
        localEmoteSignal={localEmoteSignal}
        remotePlayers={remotePlayers}
        isMultiplayerActive={isMultiplayerConnected}
        remoteMoveQueueRef={remoteMoveQueueRef}
        remoteEmoteQueueRef={remoteEmoteQueueRef}
        joystickInputRef={joystickInputRef}
        pendingExitDestinationRef={pendingExitDestinationRef}
        wakeLoopSignal={wakeLoopSignal}
        jumpSignal={jumpSignal}
        warpStarlightSignal={warpStarlightSignal}
        meteorShowerSignal={meteorShowerSignal}
        onBowBeat={handleBowBeat}
        onBowingComplete={handleBowingComplete}
        onStoneLiftStart={handleStoneLiftStart}
        onStoneSettledStep2={handleStoneSettledStep2}
        onSecondLiftResolved={handleSecondLiftResolved}
        onStoneHoverChange={setIsStoneHovered}
        onPullStateChange={setIsPullingStone}
        onNearShrineChange={setNearShrine}
        onNearStarlightChange={setNearStarlight}
        onOpenStarlight={handleOpenStarlight}
        onNearestZodiacChange={setNearestZodiac}
        onSelectZodiac={handleSelectZodiac}
        onRequestEnterShrine={handleEnterShrine}
        onRequestExitShrine={handleExitShrine}
        onParkFootstep={handleParkFootstep}
        onJumpSound={handleJumpSound}
        onLandSound={handleLandSound}
        onLocalMoveSample={handleLocalMoveSample}
      />

      <TopBarHUD
        viewMode={viewMode}
        activeCharacter={activeCharacter}
        timeOfDay={timeOfDay}
        audioEnabled={audioEnabled}
        nickname={nickname}
        isMultiplayerConnected={isMultiplayerConnected}
        onlineCount={onlineCount}
        onChangeNickname={handleChangeNickname}
        onRerollNickname={handleRerollNickname}
        onSelectCharacter={setActiveCharacter}
        onToggleViewMode={handleToggleViewMode}
        onWarpStarlight={handleWarpStarlight}
        onChangeTimeOfDay={setTimeOfDay}
        onToggleAudio={handleToggleAudio}
        onOpenHistory={() => setHistoryOpen(true)}
      />

      {viewMode === 'park' && (
        <ParkOverlay
          activeCharacter={activeCharacter}
          nearShrine={nearShrine}
          nearStarlight={nearStarlight}
          nearestZodiac={nearestZodiac}
          joystickInputRef={joystickInputRef}
          onWakeLoop={handleWakeLoop}
          onEnterShrine={handleEnterShrine}
          onOpenStarlight={handleOpenStarlight}
          onOpenZodiac={handleSelectZodiac}
          onJump={handleJump}
          onSendEmote={handleSendEmote}
        />
      )}

      {viewMode === 'shrine' && (
        <RitualCard
          ritualStep={ritualStep}
          isBowing={isBowing}
          bowCount={bowCount}
          isStoneHovered={isStoneHovered}
          isPullingStone={isPullingStone || externalPullActive}
          isSendingEmbers={isSendingEmbers}
          resolvedOutcome={resolvedOutcome}
          identityInput={identityInput}
          wishInput={wishInput}
          hasHungWishTag={hasHungWishTag}
          onChangeIdentity={setIdentityInput}
          onChangeWish={setWishInput}
          onStartBow={handleStartBow}
          onHoldPullStart={() => {
            setExternalPullActive(true);
            setIsPullingStone(true);
          }}
          onHoldPullEnd={() => {
            setExternalPullActive(false);
            setIsPullingStone(false);
          }}
          onSubmitWish={handleSubmitWish}
          onHangWishTag={handleHangWishTag}
          onRestartRitual={handleRestartRitual}
          onExitShrine={() => handleExitShrine()}
        />
      )}

      <StarlightModal
        open={starlightOpen}
        timeOfDay={timeOfDay}
        onClose={() => setStarlightOpen(false)}
        onTriggerMeteorShower={handleTriggerMeteorShower}
        onSwitchToNight={() => setTimeOfDay('night')}
      />

      <ZodiacModal statue={selectedZodiac} onClose={() => setSelectedZodiac(null)} />

      <HistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </main>
  );
}
