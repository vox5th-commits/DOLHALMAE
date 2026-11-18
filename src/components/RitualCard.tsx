import { useState, type FormEvent } from 'react';
import { ChevronDown, ChevronUp, Flame, Hand, RotateCcw, Sparkles } from 'lucide-react';
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
}

const STEP_LABELS: Array<{ step: RitualStep; label: string }> = [
  { step: 1, label: '1. 합장 삼배' },
  { step: 2, label: '2. 첫 번째 들기' },
  { step: 3, label: '3. 소원 빌기' },
  { step: 4, label: '4. 두 번째 들기' },
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
      className="pointer-events-none fixed bottom-4 left-1/2 z-20 flex w-[min(600px,94vw)] -translate-x-1/2 flex-col items-center sm:bottom-6"
    >
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        className="pointer-events-auto mb-2 flex items-center gap-1.5 rounded-t-lg border border-b-0 border-[#f2e8d5]/12 bg-[#161412]/84 px-3 py-1 text-xs text-[#cfc3ae] transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-amber-300"
      >
        {collapsed ? (
          <>
            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            <span>기도 안내 열기</span>
          </>
        ) : (
          <>
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            <span>전각 넓게 보기</span>
          </>
        )}
      </button>

      {!collapsed && (
        <div className="pointer-events-auto w-full rounded-2xl border border-[#f2e8d5]/15 bg-[#161412]/88 px-5 py-4 text-[#f4efe6] shadow-2xl sm:px-6 sm:py-5">
          {/* Clean Unboxed Step Metadata */}
          <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-xs text-[#9e9381]">
            {STEP_LABELS.map((item, idx) => {
              const isActive =
                ritualStep === item.step || (ritualStep === 'result' && item.step === 4);
              return (
                <span key={String(item.step)} className="flex items-center gap-2.5">
                  {idx > 0 && <span aria-hidden="true">·</span>}
                  <span
                    className={
                      isActive ? 'font-semibold text-[#f3cb83]' : 'text-[#9e9381]'
                    }
                  >
                    {item.label}
                  </span>
                </span>
              );
            })}
          </div>

          {/* Step 1: 합장 삼배 */}
          {ritualStep === 1 && (
            <div className="mt-3 text-center">
              <p className="font-serif-kr text-sm leading-relaxed text-[#f4efe6] sm:text-base">
                돌할매 앞에 마음을 가라앉히고 합장하여 삼배를 올립니다.
              </p>
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={onStartBow}
                  disabled={isBowing}
                  className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#e6ba73] px-6 py-2.5 text-sm font-semibold text-[#18140f] transition-colors hover:bg-[#f0ca8a] disabled:cursor-wait disabled:opacity-80 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
                >
                  <Hand className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {isBowing
                      ? `경건히 삼배 올리는 중 (${Math.min(3, bowCount + 1)}/3배)`
                      : '합장하고 삼배 올리기'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: 첫 번째 들기 */}
          {ritualStep === 2 && (
            <div className="mt-3 text-center">
              <p className="font-serif-kr text-sm leading-relaxed text-[#f4efe6] sm:text-base">
                아무 생각 없이 두 손으로 돌할매를 들어 원래 무게(약 10kg)를 느껴보세요.
              </p>
              <p className="mt-1.5 text-xs text-[#c7bba6]">
                {isPullingStone
                  ? '돌할매를 들어 올리고 있습니다. 무게를 느낀 뒤 놓아주세요.'
                  : isStoneHovered
                    ? '돌할매를 길게 누르거나 위로 끌어올려 보세요.'
                    : '화면 속 돌할매를 클릭해 길게 누르거나 아래 버튼을 누르고 계세요.'}
              </p>
              <div className="mt-4 flex justify-center">
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
                  className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 ${
                    isPullingStone
                      ? 'bg-[#f3cb83] text-[#18140f]'
                      : 'bg-[#e6ba73] text-[#18140f] hover:bg-[#f0ca8a]'
                  }`}
                >
                  <span>{isPullingStone ? '들어 올리는 중… (놓으면 내려놓습니다)' : '돌 들어보기'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 3: 신분 밝히기와 소원 빌기 */}
          {ritualStep === 3 && (
            <form onSubmit={handleWishFormSubmit} className="mt-3 space-y-3">
              <p className="text-center font-serif-kr text-sm leading-relaxed text-[#f4efe6] sm:text-base">
                주소·성명·나이를 마음속으로 밝히고, 간절한 한 가지 소원을 빌어보세요.
              </p>
              <div className="grid gap-2.5 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <label htmlFor="ritual-identity" className="sr-only">
                    지역 또는 이름 (선택)
                  </label>
                  <input
                    id="ritual-identity"
                    type="text"
                    maxLength={24}
                    value={identityInput}
                    onChange={(e) => onChangeIdentity(e.target.value)}
                    disabled={isSendingEmbers}
                    placeholder="지역/이름 (예: 영천시 홍길동)"
                    className="min-h-[42px] w-full rounded-xl border border-[#f2e8d5]/15 bg-[#221e1a] px-3 py-2 text-xs text-[#f4efe6] placeholder:text-[#8f8473] focus:border-[#e6ba73] focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="ritual-wish" className="sr-only">
                    간절한 한 가지 소원
                  </label>
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
                    placeholder="간절한 한 가지 소원..."
                    className="min-h-[42px] w-full rounded-xl border border-[#f2e8d5]/15 bg-[#221e1a] px-3 py-2 text-sm text-[#f4efe6] placeholder:text-[#8f8473] focus:border-[#e6ba73] focus:outline-none"
                  />
                </div>
              </div>
              {wishError && (
                <p role="alert" className="text-center text-xs text-amber-300">
                  {wishError}
                </p>
              )}
              <div className="flex justify-center pt-0.5">
                <button
                  type="submit"
                  disabled={isSendingEmbers}
                  className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#e6ba73] px-6 py-2.5 text-sm font-semibold text-[#18140f] transition-colors hover:bg-[#f0ca8a] disabled:opacity-75 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
                >
                  <Flame className="h-4 w-4" aria-hidden="true" />
                  <span>{isSendingEmbers ? '소원이 돌할매께 전해지는 중…' : '정성껏 소원 빌기'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Step 4: 두 번째 들기 */}
          {ritualStep === 4 && (
            <div className="mt-3 text-center">
              <p className="font-serif-kr text-sm leading-relaxed text-[#f4efe6] sm:text-base">
                이제 다시 돌할매를 들어보세요. 자석이 당기듯 묵직하게 들리지 않으면 소원이 이루어집니다.
              </p>
              <p className="mt-1.5 text-xs text-[#c7bba6]">
                {isPullingStone
                  ? '두 손의 정성을 모아 돌할매를 들어 보고 있습니다…'
                  : '화면 속 돌할매를 길게 누르거나 아래 버튼을 누르고 계세요.'}
              </p>
              <div className="mt-4 flex justify-center">
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
                  className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#e6ba73] px-6 py-2.5 text-sm font-semibold text-[#18140f] transition-colors hover:bg-[#f0ca8a] whitespace-nowrap select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
                >
                  <span>
                    {isPullingStone ? '정성을 모으는 중…' : '두 번째로 돌 들어보기'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Step 4 Result: 소원 성취 / 정성 더하기 */}
          {ritualStep === 'result' && (
            <div className="mt-3 text-center">
              <p className="font-serif-kr text-sm leading-relaxed text-[#f7ebd2] sm:text-base">
                {resolvedOutcome === 'granted'
                  ? '돌할매가 묵직하게 꿈쩍하지 않으셨습니다. 간절한 소원이 이루어질 징조입니다.'
                  : '돌할매가 가볍게 들렸습니다. 마음을 비우고 맑은 정성으로 다시 한 번 빌어보세요.'}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={onHangWishTag}
                  disabled={hasHungWishTag}
                  className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl bg-[#e6ba73] px-4 py-2 text-xs font-semibold text-[#18140f] transition-colors hover:bg-[#f0ca8a] disabled:cursor-default disabled:bg-[#4b4337] disabled:text-[#d9cbb3] whitespace-nowrap focus-visible:outline-2 focus-visible:outline-amber-200"
                >
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{hasHungWishTag ? '연등에 소원지를 매달았습니다' : '소원지 매달기'}</span>
                </button>
                <button
                  type="button"
                  onClick={onRestartRitual}
                  className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-[#f2e8d5]/20 bg-[#24201b] px-4 py-2 text-xs font-medium text-[#ede3d2] transition-colors hover:bg-[#312b24] whitespace-nowrap focus-visible:outline-2 focus-visible:outline-amber-200"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>처음부터 다시 기원하기</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
