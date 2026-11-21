import { useState } from 'react';
import { Moon, Sparkles, Star, Telescope, X } from 'lucide-react';
import { BOHYEONSAN_CONSTELLATIONS } from '../park/starlightData';
import type { TimeOfDay } from '../ritual/ritualLogic';

export interface StarlightModalProps {
  open: boolean;
  timeOfDay: TimeOfDay;
  onClose: () => void;
  onTriggerMeteorShower: () => void;
  onSwitchToNight: () => void;
}

export function StarlightModal({
  open,
  timeOfDay,
  onClose,
  onTriggerMeteorShower,
  onSwitchToNight,
}: StarlightModalProps) {
  const [index, setIndex] = useState(0);
  const [wishSentNotice, setWishSentNotice] = useState(false);

  if (!open) return null;

  const constellation = BOHYEONSAN_CONSTELLATIONS[index % BOHYEONSAN_CONSTELLATIONS.length];

  const handleNextConstellation = () => {
    setIndex((prev) => (prev + 1) % BOHYEONSAN_CONSTELLATIONS.length);
  };

  const handleMeteorWish = () => {
    onTriggerMeteorShower();
    setWishSentNotice(true);
    window.setTimeout(() => {
      setWishSentNotice(false);
    }, 3200);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="starlight-modal-title"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/72 p-4"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-indigo-300/20 bg-slate-950/95 p-5 text-slate-100 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-300/25 bg-indigo-950/90 text-amber-300"
            >
              <Telescope className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="starlight-modal-title"
                className="font-serif-kr text-lg font-semibold text-amber-100"
              >
                보현산 별빛체험존 · 천체 관측
              </h2>
              <p className="mt-0.5 text-xs text-indigo-200/75">
                별의 도시 영천 · 해발 1,124m 보현산의 별자리 이야기
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="별빛 관측 창 닫기"
            className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl border border-white/15 text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-amber-300"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Interactive SVG Constellation Sky Map */}
        <div className="mt-4 overflow-hidden rounded-xl border border-indigo-300/20 bg-[#070d1e] p-3">
          <div className="flex items-center justify-between text-[11px] text-indigo-200/80">
            <span className="font-medium text-amber-200">{constellation.koreanName}</span>
            <span>{constellation.season}</span>
          </div>
          <svg
            viewBox="0 0 100 92"
            role="img"
            aria-label={`${constellation.koreanName} 별자리 도감`}
            className="mt-1.5 h-36 w-full"
          >
            <defs>
              <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fff7d1" stopOpacity="1" />
                <stop offset="55%" stopColor="#ffd87a" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#ffd87a" stopOpacity="0" />
              </radialGradient>
            </defs>
            {/* Subtle background dust stars */}
            {[
              [8, 12],
              [22, 74],
              [38, 16],
              [64, 14],
              [88, 22],
              [91, 68],
              [12, 82],
              [72, 85],
              [44, 78],
            ].map(([bx, by], i) => (
              <circle
                key={i}
                cx={bx}
                cy={by}
                r={0.85}
                fill="#c7dcff"
                opacity={0.45 + (i % 3) * 0.16}
              />
            ))}
            {/* Constellation connecting lines */}
            {constellation.edges.map(([a, b], i) => {
              const pa = constellation.points[a];
              const pb = constellation.points[b];
              return (
                <line
                  key={i}
                  x1={pa[0]}
                  y1={pa[1]}
                  x2={pb[0]}
                  y2={pb[1]}
                  stroke="#92b9ff"
                  strokeWidth="0.95"
                  strokeDasharray="2.2 1.6"
                  strokeOpacity="0.72"
                />
              );
            })}
            {/* Primary constellation stars */}
            {constellation.points.map(([sx, sy], i) => (
              <g key={i}>
                <circle cx={sx} cy={sy} r={4.6} fill="url(#starGlow)" />
                <circle cx={sx} cy={sy} r={1.8} fill="#fff9e2" />
              </g>
            ))}
          </svg>
          <div className="mt-1 flex items-center justify-between text-[11px] text-indigo-200/75">
            <span>{constellation.englishName}</span>
            <span className="text-amber-200/90">{constellation.starsLabel}</span>
          </div>
        </div>

        {/* Constellation Story & Blessing */}
        <div className="mt-3.5 space-y-2 rounded-xl border border-white/10 bg-slate-900/90 p-3.5">
          <p className="text-xs leading-relaxed text-slate-200">{constellation.description}</p>
          <p className="flex items-start gap-1.5 font-serif-kr text-xs leading-relaxed text-amber-200">
            <Star className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{constellation.blessing}</span>
          </p>
        </div>

        {wishSentNotice && (
          <p
            role="status"
            className="mt-3 rounded-lg border border-amber-300/35 bg-amber-300/15 px-3 py-2 text-center text-xs font-medium text-amber-200"
          >
            보현산 밤하늘 위로 별똥별 유성우가 흐르고 있습니다!
          </p>
        )}

        {/* Action Controls */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-testid="next-constellation-btn"
              onClick={handleNextConstellation}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 text-xs font-medium text-white transition-colors hover:bg-white/15 whitespace-nowrap"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-200" aria-hidden="true" />
              <span>다른 별자리</span>
            </button>

            {timeOfDay !== 'night' && (
              <button
                type="button"
                data-testid="starlight-night-btn"
                onClick={onSwitchToNight}
                className="flex h-9 items-center gap-1.5 rounded-xl border border-indigo-300/30 bg-indigo-950/90 px-3 text-xs font-medium text-indigo-100 transition-colors hover:bg-indigo-900 whitespace-nowrap"
              >
                <Moon className="h-3.5 w-3.5 text-amber-200" aria-hidden="true" />
                <span>밤하늘로 감상</span>
              </button>
            )}
          </div>

          <button
            type="button"
            data-testid="meteor-wish-btn"
            onClick={handleMeteorWish}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-amber-300 px-3.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-200 whitespace-nowrap"
          >
            <Star className="h-3.5 w-3.5 fill-slate-950" aria-hidden="true" />
            <span>별똥별 소원 빌기</span>
          </button>
        </div>
      </div>
    </div>
  );
}
