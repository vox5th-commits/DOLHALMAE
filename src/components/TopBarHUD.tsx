import { useEffect, useState, type FormEvent } from 'react';
import {
  Compass,
  Dices,
  Footprints,
  HelpCircle,
  Menu,
  Moon,
  Pencil,
  Sparkles,
  Sunrise,
  Sunset,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { MascotId, ViewMode } from '../park/parkLayout';
import type { TimeOfDay } from '../ritual/ritualLogic';

export interface TopBarHUDProps {
  viewMode: ViewMode;
  activeCharacter: MascotId;
  timeOfDay: TimeOfDay;
  audioEnabled: boolean;
  nickname: string;
  isMultiplayerConnected: boolean;
  onlineCount: number;
  onChangeNickname: (nextNickname: string) => void;
  onRerollNickname: () => string;
  onSelectCharacter: (next: MascotId) => void;
  onToggleViewMode: () => void;
  onWarpStarlight: () => void;
  onChangeTimeOfDay: (next: TimeOfDay) => void;
  onToggleAudio: () => void;
  onOpenHistory: () => void;
}

const TIME_OPTIONS: Array<{ id: TimeOfDay; shortLabel: string; Icon: typeof Sunrise }> = [
  { id: 'dawn', shortLabel: '아침', Icon: Sunrise },
  { id: 'sunset', shortLabel: '노을', Icon: Sunset },
  { id: 'night', shortLabel: '밤', Icon: Moon },
];

export function TopBarHUD({
  viewMode,
  activeCharacter,
  timeOfDay,
  audioEnabled,
  nickname,
  isMultiplayerConnected,
  onlineCount,
  onChangeNickname,
  onRerollNickname,
  onSelectCharacter,
  onToggleViewMode,
  onWarpStarlight,
  onChangeTimeOfDay,
  onToggleAudio,
  onOpenHistory,
}: TopBarHUDProps) {
  const [nicknameOpen, setNicknameOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [draftNickname, setDraftNickname] = useState(nickname);
  const [nicknameError, setNicknameError] = useState<string | null>(null);

  useEffect(() => {
    setDraftNickname(nickname);
  }, [nickname]);

  const handleSubmitNickname = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = draftNickname.replace(/\s+/g, ' ').trim();
    if (!cleaned) {
      setNicknameError('닉네임을 입력해 주세요.');
      return;
    }
    setNicknameError(null);
    onChangeNickname(cleaned);
    setNicknameOpen(false);
  };

  const handleReroll = () => {
    const rolled = onRerollNickname();
    setDraftNickname(rolled);
    setNicknameError(null);
  };

  return (
    <header className="pointer-events-none fixed top-0 left-0 right-0 z-20 px-2.5 pt-2 sm:px-4 sm:pt-2.5">
      {/* Strictly Single-Row Slim Translucent Top Bar (<= 44px height, no backdrop-blur over WebGL) */}
      <div className="flex h-10 max-h-[44px] flex-nowrap items-center justify-between gap-2">
        {/* Top-Left: Live Presence / Single Mode + Clickable Nickname Pill */}
        <div className="pointer-events-auto flex min-w-0 items-center">
          <button
            type="button"
            data-testid="nickname-pill-btn"
            onClick={() => {
              setMobileMenuOpen(false);
              setNicknameOpen((prev) => !prev);
            }}
            aria-expanded={nicknameOpen}
            aria-label={`닉네임 변경 (${nickname})`}
            className="flex min-h-[34px] max-w-[58vw] items-center gap-1.5 rounded-full border border-white/15 bg-slate-900/78 px-2.5 py-1 text-[11px] text-white shadow-lg transition-colors hover:bg-slate-900/90 sm:max-w-none sm:text-xs whitespace-nowrap focus-visible:outline-2 focus-visible:outline-amber-300"
          >
            {isMultiplayerConnected ? (
              <span className="shrink-0 font-medium text-emerald-300 tabular-nums">
                🟢 {onlineCount}명<span className="hidden sm:inline"> 함께 산책 중</span>
              </span>
            ) : (
              <span className="shrink-0 text-white/85">싱글 모드</span>
            )}
            <span className="text-white/35 shrink-0" aria-hidden="true">
              ·
            </span>
            <span className="truncate max-w-[92px] sm:max-w-[140px] font-medium text-white">
              {nickname}
            </span>
            <Pencil className="h-3 w-3 shrink-0 text-amber-200/90" aria-hidden="true" />
          </button>
        </div>

        {/* Top-Right Desktop Micro-Pills (>= 768px) */}
        <div className="pointer-events-auto hidden md:flex shrink-0 items-center gap-1.5">
          {/* Mascot Switcher */}
          <div
            role="group"
            aria-label="캐릭터 선택"
            className="flex items-center gap-0.5 rounded-full border border-white/15 bg-slate-900/78 p-0.5"
          >
            <button
              type="button"
              data-testid="select-char-byeori"
              onClick={() => onSelectCharacter('byeori')}
              aria-pressed={activeCharacter === 'byeori'}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
                activeCharacter === 'byeori'
                  ? 'bg-sky-500 text-white'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              별이
            </button>
            <button
              type="button"
              data-testid="select-char-bichi"
              onClick={() => onSelectCharacter('bichi')}
              aria-pressed={activeCharacter === 'bichi'}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
                activeCharacter === 'bichi'
                  ? 'bg-rose-500 text-white'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              빛이
            </button>
          </div>

          {/* Time-of-Day Micro-Pills */}
          <div
            role="group"
            aria-label="시간대 조명 선택"
            className="flex items-center gap-0.5 rounded-full border border-white/15 bg-slate-900/78 p-0.5"
          >
            {TIME_OPTIONS.map(({ id, shortLabel, Icon }) => {
              const active = timeOfDay === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onChangeTimeOfDay(id)}
                  aria-pressed={active}
                  className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
                    active ? 'bg-amber-300 text-slate-950' : 'text-white/80 hover:text-white'
                  }`}
                >
                  <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span>{shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Warp: Bohyeonsan Starlight Experience Zone */}
          <button
            type="button"
            data-testid="warp-starlight-btn"
            onClick={onWarpStarlight}
            className="flex items-center gap-1 rounded-full border border-indigo-300/40 bg-slate-900/80 px-2.5 py-1 text-[11px] font-medium text-indigo-200 transition-colors hover:bg-indigo-950/90 hover:text-white whitespace-nowrap"
          >
            <Sparkles className="h-3 w-3 shrink-0 text-amber-200" aria-hidden="true" />
            <span>별빛존</span>
          </button>

          {/* Quick View Mode Warp */}
          <button
            type="button"
            data-testid="toggle-view-mode"
            onClick={onToggleViewMode}
            className="flex items-center gap-1 rounded-full border border-amber-200/40 bg-slate-900/80 px-2.5 py-1 text-[11px] font-medium text-amber-200 transition-colors hover:bg-slate-900/95 whitespace-nowrap"
          >
            {viewMode === 'park' ? (
              <>
                <Compass className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span>전각 바로가기</span>
              </>
            ) : (
              <>
                <Footprints className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span>공원 산책</span>
              </>
            )}
          </button>

          {/* Audio Toggle */}
          <button
            type="button"
            onClick={onToggleAudio}
            aria-pressed={audioEnabled}
            aria-label={audioEnabled ? '소리 끄기' : '소리 켜기'}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-slate-900/78 text-white transition-colors hover:bg-slate-900/95"
          >
            {audioEnabled ? (
              <Volume2 className="h-3.5 w-3.5 text-amber-200" aria-hidden="true" />
            ) : (
              <VolumeX className="h-3.5 w-3.5 text-white/75" aria-hidden="true" />
            )}
          </button>

          {/* Info Modal Trigger */}
          <button
            type="button"
            onClick={onOpenHistory}
            aria-label="돌할매 유래 및 안내 보기"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-slate-900/78 text-white transition-colors hover:bg-slate-900/95"
          >
            <HelpCircle className="h-3.5 w-3.5 text-amber-200" aria-hidden="true" />
          </button>
        </div>

        {/* Top-Right Mobile Compact Controls (< 768px) */}
        <div className="pointer-events-auto flex md:hidden shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onSelectCharacter(activeCharacter === 'byeori' ? 'bichi' : 'byeori')}
            aria-label={`캐릭터 전환 (현재 ${activeCharacter === 'byeori' ? '별이' : '빛이'})`}
            className={`rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-medium text-white whitespace-nowrap ${
              activeCharacter === 'byeori' ? 'bg-sky-500/90' : 'bg-rose-500/90'
            }`}
          >
            {activeCharacter === 'byeori' ? '별이' : '빛이'}
          </button>

          <button
            type="button"
            onClick={onToggleAudio}
            aria-pressed={audioEnabled}
            aria-label={audioEnabled ? '소리 끄기' : '소리 켜기'}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-slate-900/78 text-white"
          >
            {audioEnabled ? (
              <Volume2 className="h-3.5 w-3.5 text-amber-200" aria-hidden="true" />
            ) : (
              <VolumeX className="h-3.5 w-3.5 text-white/75" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            data-testid="mobile-menu-btn"
            onClick={() => {
              setNicknameOpen(false);
              setMobileMenuOpen((prev) => !prev);
            }}
            aria-expanded={mobileMenuOpen}
            aria-label="메뉴 열기"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-slate-900/78 text-white"
          >
            {mobileMenuOpen ? (
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Menu className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Instant Nickname Editor Popover */}
      {nicknameOpen && (
        <div
          role="dialog"
          aria-label="영천 닉네임 변경"
          className="pointer-events-auto mt-2 w-[min(284px,92vw)] rounded-2xl border border-white/15 bg-slate-900/94 p-3 text-white shadow-2xl"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-200">영천 닉네임 변경</span>
            <button
              type="button"
              onClick={() => setNicknameOpen(false)}
              aria-label="닉네임 창 닫기"
              className="flex h-6 w-6 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
          <form onSubmit={handleSubmitNickname} className="mt-2 space-y-2">
            <label htmlFor="nickname-editor-input" className="sr-only">
              닉네임 입력 (최대 12자)
            </label>
            <input
              id="nickname-editor-input"
              data-testid="nickname-input"
              type="text"
              maxLength={12}
              value={draftNickname}
              onChange={(e) => {
                setDraftNickname(e.target.value);
                if (nicknameError) setNicknameError(null);
              }}
              placeholder="최대 12자 입력"
              className="h-9 w-full rounded-xl border border-white/15 bg-slate-950/85 px-3 text-xs text-white placeholder:text-white/40 focus:border-amber-300 focus:outline-none"
            />
            {nicknameError && (
              <p className="text-[11px] text-amber-300" role="alert">
                {nicknameError}
              </p>
            )}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                data-testid="random-nickname-btn"
                onClick={handleReroll}
                className="flex h-8 flex-1 items-center justify-center gap-1 rounded-xl border border-white/15 bg-white/10 px-2.5 text-[11px] font-medium text-white transition-colors hover:bg-white/15 whitespace-nowrap"
              >
                <Dices className="h-3.5 w-3.5 text-amber-200" aria-hidden="true" />
                <span>🎲 랜덤 조합</span>
              </button>
              <button
                type="submit"
                data-testid="save-nickname-btn"
                className="h-8 rounded-xl bg-amber-300 px-3.5 text-[11px] font-semibold text-slate-950 transition-colors hover:bg-amber-200 whitespace-nowrap"
              >
                저장
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mobile Collapsible Overflow Menu */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-label="환경 및 이동 메뉴"
          className="pointer-events-auto ml-auto mt-2 w-56 space-y-2.5 rounded-2xl border border-white/15 bg-slate-900/94 p-3 text-white shadow-2xl md:hidden"
        >
          <div>
            <p className="mb-1.5 text-[11px] text-white/60">시간대 조명</p>
            <div className="grid grid-cols-3 gap-1">
              {TIME_OPTIONS.map(({ id, shortLabel, Icon }) => {
                const active = timeOfDay === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onChangeTimeOfDay(id)}
                    aria-pressed={active}
                    className={`flex h-8 items-center justify-center gap-1 rounded-lg text-[11px] font-medium ${
                      active ? 'bg-amber-300 text-slate-950' : 'bg-white/10 text-white/80'
                    }`}
                  >
                    <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span>{shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onWarpStarlight();
            }}
            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-indigo-300/35 bg-indigo-950/80 px-3 text-xs font-medium text-indigo-100"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-200" aria-hidden="true" />
            <span>🔭 보현산 별빛체험존</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onToggleViewMode();
            }}
            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-amber-200/35 bg-white/10 px-3 text-xs font-medium text-amber-200"
          >
            {viewMode === 'park' ? (
              <>
                <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                <span>돌할매 앞으로 바로가기</span>
              </>
            ) : (
              <>
                <Footprints className="h-3.5 w-3.5" aria-hidden="true" />
                <span>공원으로 나가기</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenHistory();
            }}
            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 text-xs text-white/90"
          >
            <HelpCircle className="h-3.5 w-3.5 text-amber-200" aria-hidden="true" />
            <span>돌할매 유래 안내</span>
          </button>
        </div>
      )}
    </header>
  );
}
