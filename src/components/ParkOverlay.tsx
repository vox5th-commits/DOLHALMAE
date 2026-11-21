import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { ArrowUp, DoorOpen, Sparkles, Telescope } from 'lucide-react';
import type { PlayerEmoteKind } from '../multiplayer/realtimeSync';
import type { MascotId } from '../park/parkLayout';
import type { ZodiacStatueInfo } from '../park/zodiacData';

export interface JoystickInputState {
  x: number;
  y: number;
  sprint: boolean;
}

export interface ParkOverlayProps {
  activeCharacter: MascotId;
  nearShrine: boolean;
  nearStarlight: boolean;
  nearestZodiac: ZodiacStatueInfo | null;
  joystickInputRef: MutableRefObject<JoystickInputState>;
  onWakeLoop: () => void;
  onEnterShrine: () => void;
  onOpenStarlight: () => void;
  onOpenZodiac: (statue: ZodiacStatueInfo) => void;
  onJump: () => void;
  onSendEmote: (emote: PlayerEmoteKind) => void;
}

export function ParkOverlay({
  activeCharacter,
  nearShrine,
  nearStarlight,
  nearestZodiac,
  joystickInputRef,
  onWakeLoop,
  onEnterShrine,
  onOpenStarlight,
  onOpenZodiac,
  onJump,
  onSendEmote,
}: ParkOverlayProps) {
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const padRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);

  useEffect(() => {
    const checkTouch = () => {
      const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
      const small = window.innerWidth < 768;
      setIsTouchDevice(coarse || small);
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  const updateStickFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const pad = padRef.current;
      if (!pad) return;
      const rect = pad.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const maxR = rect.width * 0.36;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      const clamped = Math.min(dist, maxR);
      const nx = dist > 0.001 ? (dx / dist) * (clamped / maxR) : 0;
      const ny = dist > 0.001 ? (dy / dist) * (clamped / maxR) : 0;

      joystickInputRef.current.x = nx;
      joystickInputRef.current.y = -ny;
      joystickInputRef.current.sprint = dist > maxR * 0.88;
      setKnobOffset({ x: nx * maxR, y: ny * maxR });
      onWakeLoop();
    },
    [joystickInputRef, onWakeLoop],
  );

  const resetStick = useCallback(() => {
    activePointerIdRef.current = null;
    joystickInputRef.current.x = 0;
    joystickInputRef.current.y = 0;
    joystickInputRef.current.sprint = false;
    setKnobOffset({ x: 0, y: 0 });
    onWakeLoop();
  }, [joystickInputRef, onWakeLoop]);

  const charLabel = activeCharacter === 'byeori' ? '별이' : '빛이';

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-end p-3 sm:p-5">
      <div className="flex items-end justify-between gap-3">
        {/* Bottom-Left: Semi-Transparent Mobile Virtual Joystick (or slim Desktop hint) */}
        <div className="flex items-end">
          <div className={isTouchDevice ? 'pointer-events-auto' : 'hidden'}>
            <div
              ref={padRef}
              aria-label={`${charLabel} 이동 조이스틱`}
              onPointerDown={(e) => {
                activePointerIdRef.current = e.pointerId;
                e.currentTarget.setPointerCapture(e.pointerId);
                updateStickFromPointer(e.clientX, e.clientY);
              }}
              onPointerMove={(e) => {
                if (activePointerIdRef.current === e.pointerId) {
                  updateStickFromPointer(e.clientX, e.clientY);
                }
              }}
              onPointerUp={(e) => {
                if (activePointerIdRef.current === e.pointerId) {
                  resetStick();
                }
              }}
              onPointerCancel={resetStick}
              className="relative flex h-24 w-24 touch-none items-center justify-center rounded-full border border-white/15 bg-slate-900/65 opacity-65 shadow-lg"
            >
              <div
                style={{
                  transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
                }}
                className="h-9 w-9 rounded-full border border-amber-200/70 bg-amber-300/90 shadow"
              />
            </div>
          </div>

          <div className="hidden rounded-full border border-white/15 bg-slate-900/74 px-2.5 py-1 text-[11px] text-white/90 md:block">
            <span>WASD·클릭 이동</span>
            <span className="mx-1.5 text-white/35" aria-hidden="true">
              ·
            </span>
            <span>Space 점프</span>
            <span className="mx-1.5 text-white/35" aria-hidden="true">
              ·
            </span>
            <span>드래그 회전</span>
            <span className="mx-1.5 text-white/35" aria-hidden="true">
              ·
            </span>
            <span>F 상호작용</span>
          </div>
        </div>

        {/* Bottom-Right: Contextual Shrine/Starlight/Zodiac Button + Jump + Non-Verbal Emotes */}
        <div className="pointer-events-auto flex flex-col items-end gap-1.5">
          {nearShrine ? (
            <button
              type="button"
              data-testid="enter-shrine-prompt"
              onClick={onEnterShrine}
              className="flex min-h-[36px] items-center gap-1.5 rounded-full border border-amber-200/60 bg-amber-300 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-lg transition-colors hover:bg-amber-200 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-amber-200"
            >
              <DoorOpen className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>돌할매 전각 들어가기</span>
            </button>
          ) : nearStarlight ? (
            <button
              type="button"
              data-testid="starlight-prompt-btn"
              onClick={onOpenStarlight}
              className="flex min-h-[36px] items-center gap-1.5 rounded-full border border-amber-200/60 bg-amber-300 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-lg transition-colors hover:bg-amber-200 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-amber-200"
            >
              <Telescope className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>보현산 별빛 관측</span>
            </button>
          ) : nearestZodiac ? (
            <button
              type="button"
              data-testid="zodiac-prompt-btn"
              onClick={() => onOpenZodiac(nearestZodiac)}
              className="flex min-h-[36px] items-center gap-1.5 rounded-full border border-amber-200/60 bg-amber-300 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-lg transition-colors hover:bg-amber-200 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-amber-200"
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{nearestZodiac.title} 덕담</span>
            </button>
          ) : null}

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-testid="jump-btn"
              onClick={onJump}
              aria-label="점프하기"
              className="flex min-h-[36px] items-center gap-1 rounded-full border border-amber-200/45 bg-amber-300/92 px-3 py-1 text-[11px] font-semibold text-slate-950 shadow-md transition-colors hover:bg-amber-200 active:scale-95 whitespace-nowrap"
            >
              <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>점프</span>
            </button>
            <button
              type="button"
              data-testid="emote-pray-btn"
              onClick={() => onSendEmote('pray')}
              className="flex min-h-[34px] items-center gap-1 rounded-full border border-white/15 bg-slate-900/74 px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-slate-900/92 whitespace-nowrap"
            >
              <span>🙏</span>
              <span>합장</span>
            </button>
            <button
              type="button"
              data-testid="emote-wave-btn"
              onClick={() => onSendEmote('wave')}
              className="flex min-h-[34px] items-center gap-1 rounded-full border border-white/15 bg-slate-900/74 px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-slate-900/92 whitespace-nowrap"
            >
              <span>👋</span>
              <span>인사</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
