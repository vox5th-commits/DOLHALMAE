import { useState, type FormEvent } from 'react';
import { ChevronDown, ChevronUp, Flame, Footprints, Hand, RotateCcw, Sparkles } from 'lucide-react';
import {
  validateWishInput,
  type RitualOutcome,
  type RitualStep,
} from '../ritual/ritualLogic';

export interface RitualCardProps {
  ritualStep: RitualStep;
  isBowing: boolean;
  bowCount: number;
  isStoneHovered: boolean;
  isPullingStone: boolean;
  isSendingEmbers: boolean;
  resolvedOutcome: RitualOutcome | null;
  identityInput: string;
  wishInput: string;
  hasHungWishTag: boolean;
  onChangeIdentity: (val: string) => void;
  onChangeWish: (val: string) => void;
  onStartBow: () => void;
  onHoldPullStart: () => void;
  onHoldPullEnd: () => void;
  onSubmitWish: () => void;
  onHangWishTag: () => void;
  onRestartRitual: () => void;
  onExitShrine: () => void;
}

const STEP_LABELS: Array<{ step: RitualStep; label: string }> = [
  { step: 1, label: '1.삼배' },
  { step: 2, label: '2.첫들기' },
  { step: 3, label: '3.소원' },
  { step: 4, label: '4.둘째들기' },
];

export function RitualCard({
  ritualStep,
  isBowing,
  bowCount,
  isStoneHovered,
  isPullingStone,
  isSendingEmbers,
  resolvedOutcome,
  identityInput,
  wishInput,
  hasHungWishTag,
  onChangeIdentity,
  onChangeWish,
  onStartBow,
  onHoldPullStart,
  onHoldPullEnd,
  onSubmitWish,
  onHangWishTag,
  onRestartRitual,
  onExitShrine,
}: RitualCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [wishError, setWishError] = useState<string | null>(null);

  const handleWishFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    const validation = validateWishInput(wishInput);
    if (!validation.valid) {
      setWishError(validation.error ?? '소원을 적어주세요.');
      return;
    }
    setWishError(null);
    onSubmitWish();
  };

  return (
    <section
      aria-label="돌할매 기도 의식 안내"
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-20 flex flex-col items-center sm:bottom-3 sm:left-1/2 sm:right-auto sm:w-[min(520px,94vw)] sm:-translate-x-1/2"
    >
      {collapsed ? (
        <div className="pointer-events-auto mb-2.5 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="flex h-8 items-center gap-1 rounded-full border border-white/15 bg-slate-900/82 px-3 text-[11px] text-white"
          >
            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            <span>기도 안내 열기</span>
          </button>
          <button
            type="button"
            onClick={onExitShrine}
            className="flex h-8 items-center gap-1 rounded-full border border-white/15 bg-slate-900/82 px-3 text-[11px] text-amber-200"
          >
            <Footprints className="h-3 w-3" aria-hidden="true" />
            <span>공원으로</span>
          </button>
        </div>
      ) : (
        <div className="pointer-events-auto w-full max-h-[32vh] overflow-y-auto rounded-t-2xl border-t border-white/15 bg-slate-900/82 p-3 text-white shadow-2xl sm:rounded-2xl sm:border">
          {/* Ultra-Compact Header Row: Step Progress + Quick Exit + Collapse */}
          <div className="flex items-center justify-between gap-2 text-[11px] text-white/60">
            <div className="flex items-center gap-1.5 truncate">
              {STEP_LABELS.map((item, idx) => {
                const isActive =
                  ritualStep === item.step || (ritualStep === 'result' && item.step === 4);
                return (
                  <span key={String(item.step)} className="flex items-center gap-1.5">
                    {idx > 0 && <span aria-hidden="true">·</span>}
                    <span className={isActive ? 'font-semibold text-amber-300' : 'text-white/55'}>
                      {item.label}
                    </span>
                  </span>
                );
              })}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={onExitShrine}
                className="flex h-6 items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2 text-[11px] text-amber-200 hover:bg-white/15"
              >
                <Footprints className="h-3 w-3" aria-hidden="true" />
                <span>공원으로</span>
              </button>
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                aria-label="기도 안내 접기"
                className="flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/80 hover:bg-white/15"
              >
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Step 1: 합장 삼배 */}
          {ritualStep === 1 && (
            <div className="mt-2 flex items-center justify-between gap-2 sm:flex-col sm:text-center">
              <p className="truncate font-serif-kr text-xs text-white/95 sm:text-sm">
                돌할매 앞에 합장하여 삼배를 올립니다.
              </p>
              <button
                type="button"
                onClick={onStartBow}
                disabled={isBowing}
                className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-amber-300 px-4 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-200 disabled:opacity-80 whitespace-nowrap"
              >
                <Hand className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {isBowing ? `삼배 중 (${Math.min(3, bowCount + 1)}/3)` : '합장 삼배 올리기'}
                </span>
              </button>
            </div>
          )}

          {/* Step 2: 첫 번째 들기 */}
          {ritualStep === 2 && (
            <div className="mt-2 flex items-center justify-between gap-2 sm:flex-col sm:text-center">
              <p className="truncate font-serif-kr text-xs text-white/95 sm:text-sm">
                {isPullingStone
                  ? '돌할매를 들어 무게를 느낀 뒤 놓아주세요.'
                  : isStoneHovered
                    ? '돌할매를 길게 눌러 올려보세요.'
                    : '돌할매를 길게 눌러 원래 무게를 느껴보세요.'}
              </p>
              <button
                type="button"
                onPointerDown={onHoldPullStart}
                onPointerUp={onHoldPullEnd}
                onPointerLeave={onHoldPullEnd}
                onPointerCancel={onHoldPullEnd}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    onHoldPullStart();
                  }
                }}
                onKeyUp={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    onHoldPullEnd();
                  }
                }}
                className="flex h-9 shrink-0 items-center justify-center rounded-full bg-amber-300 px-4 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-200 whitespace-nowrap select-none"
              >
                {isPullingStone ? '드는 중…' : '돌 들어보기'}
              </button>
            </div>
          )}

          {/* Step 3: 소원 빌기 */}
          {ritualStep === 3 && (
            <form onSubmit={handleWishFormSubmit} className="mt-2 space-y-1.5">
              <p className="truncate text-center font-serif-kr text-xs text-white/95">
                마음을 담아 간절한 한 가지 소원을 빌어보세요.
              </p>
              <div className="flex flex-col gap-1.5 sm:flex-row">
                <input
                  id="ritual-identity"
                  type="text"
                  maxLength={24}
                  value={identityInput}
                  onChange={(e) => onChangeIdentity(e.target.value)}
                  disabled={isSendingEmbers}
                  aria-label="지역 또는 이름 (선택)"
                  placeholder="지역/이름 (선택)"
                  className="h-9 w-full rounded-xl border border-white/15 bg-slate-950/60 px-2.5 text-xs text-white placeholder:text-white/45 focus:border-amber-300 focus:outline-none sm:w-32"
                />
                <div className="flex flex-1 gap-1.5">
                  <input
                    id="ritual-wish"
                    type="text"
                    maxLength={60}
                    value={wishInput}
                    onChange={(e) => {
                      onChangeWish(e.target.value);
                      if (wishError) setWishError(null);
                    }}
                    disabled={isSendingEmbers}
                    aria-label="간절한 한 가지 소원"
                    placeholder="간절한 한 가지 소원..."
                    className="h-9 min-w-0 flex-1 rounded-xl border border-white/15 bg-slate-950/60 px-2.5 text-xs text-white placeholder:text-white/45 focus:border-amber-300 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSendingEmbers}
                    className="flex h-9 shrink-0 items-center justify-center gap-1 rounded-xl bg-amber-300 px-3 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-200 disabled:opacity-75 whitespace-nowrap"
                  >
                    <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{isSendingEmbers ? '전하는 중' : '소원 빌기'}</span>
                  </button>
                </div>
              </div>
              {wishError && (
                <p role="alert" className="text-center text-[11px] text-amber-300">
                  {wishError}
                </p>
              )}
            </form>
          )}

          {/* Step 4: 두 번째 들기 */}
          {ritualStep === 4 && (
            <div className="mt-2 flex items-center justify-between gap-2 sm:flex-col sm:text-center">
              <p className="truncate font-serif-kr text-xs text-white/95 sm:text-sm">
                {isPullingStone
                  ? '정성을 모아 돌할매를 들어보고 있습니다…'
                  : '다시 들어보세요. 꿈쩍하지 않으면 소원이 이루어집니다.'}
              </p>
              <button
                type="button"
                onPointerDown={onHoldPullStart}
                onPointerUp={onHoldPullEnd}
                onPointerLeave={onHoldPullEnd}
                onPointerCancel={onHoldPullEnd}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    onHoldPullStart();
                  }
                }}
                onKeyUp={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    onHoldPullEnd();
                  }
                }}
                className="flex h-9 shrink-0 items-center justify-center rounded-full bg-amber-300 px-4 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-200 whitespace-nowrap select-none"
              >
                {isPullingStone ? '정성 모으는 중…' : '두 번째 들기'}
              </button>
            </div>
          )}

          {/* Result */}
          {ritualStep === 'result' && (
            <div className="mt-2 space-y-2 text-center">
              <p className="font-serif-kr text-xs leading-snug text-amber-100 sm:text-sm">
                {resolvedOutcome === 'granted'
                  ? '돌할매가 묵직하게 꿈쩍하지 않으셨습니다. 소원이 이루어질 징조입니다.'
                  : '돌할매가 가볍게 들렸습니다. 맑은 정성으로 다시 빌어보세요.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={onHangWishTag}
                  disabled={hasHungWishTag}
                  className="flex h-8 items-center gap-1 rounded-full bg-amber-300 px-3 text-[11px] font-semibold text-slate-950 hover:bg-amber-200 disabled:bg-white/15 disabled:text-white/70 whitespace-nowrap"
                >
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  <span>{hasHungWishTag ? '소원지 부착 완료' : '소원지 매달기'}</span>
                </button>
                <button
                  type="button"
                  onClick={onRestartRitual}
                  className="flex h-8 items-center gap-1 rounded-full border border-white/15 bg-white/10 px-3 text-[11px] font-medium text-white hover:bg-white/15 whitespace-nowrap"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  <span>다시 기원</span>
                </button>
              </div>
              <p className="text-[11px] text-white/60">
                주변 땅 클릭 · 방향키(WASD)로 공원 산책
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
