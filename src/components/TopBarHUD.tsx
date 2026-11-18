import { HelpCircle, Moon, Sunrise, Sunset, Volume2, VolumeX } from 'lucide-react';
import type { TimeOfDay } from '../ritual/ritualLogic';

export interface TopBarHUDProps {
  timeOfDay: TimeOfDay;
  onChangeTimeOfDay: (next: TimeOfDay) => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  onOpenHistory: () => void;
  visitorCount: number;
  savedWishCount: number;
}

const TIME_OPTIONS: Array<{ id: TimeOfDay; label: string; Icon: typeof Sunrise }> = [
  { id: 'dawn', label: '산골 아침 안개', Icon: Sunrise },
  { id: 'sunset', label: '해질녘 노을', Icon: Sunset },
  { id: 'night', label: '고요한 밤 기도', Icon: Moon },
];

export function TopBarHUD({
  timeOfDay,
  onChangeTimeOfDay,
  audioEnabled,
  onToggleAudio,
  onOpenHistory,
  visitorCount,
  savedWishCount,
}: TopBarHUDProps) {
  return (
    <header className="pointer-events-none fixed top-0 left-0 right-0 z-20 flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6">
      {/* Top-Left: Quiet Sanctuary Title & Loose Connection Presence */}
      <div className="pointer-events-auto max-w-md rounded-xl border border-[#f2e8d5]/12 bg-[#161412]/82 px-4 py-3 text-[#f4efe6] shadow-lg">
        <div className="flex items-baseline gap-2.5">
          <h1 className="font-serif-kr text-base font-semibold tracking-tight text-[#f7eedc] sm:text-lg whitespace-nowrap">
            영천 북안면 돌할매
          </h1>
          <span className="text-xs text-[#cbbba2] whitespace-nowrap">관산 자락 기도처</span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-[#d7cbb8]">
          현재 <span className="tabular-nums font-semibold text-[#f3cb83]">{visitorCount}</span>명이
          북안면 돌할매 전각에서 조용히 소원을 빌고 있습니다
          <span aria-hidden="true"> · </span>
          소원지 <span className="tabular-nums">{savedWishCount}</span>장
        </p>
      </div>

      {/* Top-Right: Time-of-Day Lighting Toggle, Sound Toggle, and History (?) */}
      <div className="pointer-events-auto flex flex-wrap items-center gap-2">
        <div
          role="group"
          aria-label="시간대 조명 선택"
          className="flex items-center gap-1 rounded-xl border border-[#f2e8d5]/12 bg-[#161412]/82 p-1 shadow-lg"
        >
          {TIME_OPTIONS.map(({ id, label, Icon }) => {
            const active = timeOfDay === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChangeTimeOfDay(id)}
                aria-pressed={active}
                className={`flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${
                  active
                    ? 'bg-[#e6ba73] text-[#1a1612]'
                    : 'text-[#ddd2c0] hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onToggleAudio}
          aria-pressed={audioEnabled}
          className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#f2e8d5]/12 bg-[#161412]/82 px-3 py-2 text-xs font-medium text-[#ede3d2] shadow-lg transition-colors hover:bg-[#25211c] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
        >
          {audioEnabled ? (
            <>
              <Volume2 className="h-4 w-4 text-[#f3cb83]" aria-hidden="true" />
              <span>소리 끄기</span>
            </>
          ) : (
            <>
              <VolumeX className="h-4 w-4 text-[#b4a792]" aria-hidden="true" />
              <span>소리 켜기</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenHistory}
          aria-label="돌할매 유래 및 안내 보기"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#f2e8d5]/12 bg-[#161412]/82 px-3 py-2 text-sm font-serif-kr font-semibold text-[#ede3d2] shadow-lg transition-colors hover:bg-[#25211c] shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
        >
          <HelpCircle className="h-4 w-4 text-[#f3cb83]" aria-hidden="true" />
          <span className="sr-only">돌할매 유래 안내</span>
        </button>
      </div>
    </header>
  );
}
