import { useCallback, useEffect, useRef, useState } from 'react';
import { SanctuaryAudio } from './audio/sanctuaryAudio';
import { HistoryModal } from './components/HistoryModal';
import { RitualCard } from './components/RitualCard';
import { TopBarHUD } from './components/TopBarHUD';
import {
  WISH_STORAGE_KEY,
  createWishTagEntry,
  driftVisitorCount,
  parseSavedWishTags,
  resolveSecondLiftOutcome,
  type RitualOutcome,
  type RitualStep,
  type SavedWishTag,
  type TimeOfDay,
} from './ritual/ritualLogic';
import { SanctuaryCanvas } from './scene/SanctuaryCanvas';

export default function App() {
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('sunset');
  const [ritualStep, setRitualStep] = useState<RitualStep>(1);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [visitorCount, setVisitorCount] = useState(11);
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

  // Expose state attributes on <body> for non-intrusive verification
  useEffect(() => {
    document.body.dataset.ritualStep = String(ritualStep);
    document.body.dataset.timeOfDay = timeOfDay;
    document.body.dataset.outcome = resolvedOutcome ?? 'pending';
  }, [ritualStep, timeOfDay, resolvedOutcome]);

  // Quietly fluctuate visitor count
  useEffect(() => {
    const id = window.setInterval(() => {
      setVisitorCount((prev) => driftVisitorCount(prev));
    }, 14000);
    return () => window.clearInterval(id);
  }, []);

  const handleToggleAudio = useCallback(() => {
    setAudioEnabled((prev) => {
      const next = !prev;
      audioRef.current?.setEnabled(next);
      return next;
    });
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

    // Pre-roll Step 4 outcome using accumulated patience (65% base -> up to 85%)
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
      identityInput,
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
  }, [hasHungWishTag, identityInput, wishInput, resolvedOutcome]);

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
        timeOfDay={timeOfDay}
        ritualStep={ritualStep}
        bowSequenceId={bowSequenceId}
        wishEmberSequenceId={wishEmberSequenceId}
        externalPullActive={externalPullActive}
        resolvedOutcome={resolvedOutcome}
        pendingOutcomeDecision={pendingOutcomeDecision}
        savedWishTags={savedWishTags}
        latestHungTag={latestHungTag}
        onBowBeat={handleBowBeat}
        onBowingComplete={handleBowingComplete}
        onStoneLiftStart={handleStoneLiftStart}
        onStoneSettledStep2={handleStoneSettledStep2}
        onSecondLiftResolved={handleSecondLiftResolved}
        onStoneHoverChange={setIsStoneHovered}
        onPullStateChange={setIsPullingStone}
      />

      <TopBarHUD
        timeOfDay={timeOfDay}
        onChangeTimeOfDay={setTimeOfDay}
        audioEnabled={audioEnabled}
        onToggleAudio={handleToggleAudio}
        onOpenHistory={() => setHistoryOpen(true)}
        visitorCount={visitorCount}
        savedWishCount={savedWishTags.length}
      />

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
      />

      <HistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </main>
  );
}
