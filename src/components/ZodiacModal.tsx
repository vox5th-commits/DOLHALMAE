import { Sparkles, X } from 'lucide-react';
import type { ZodiacStatueInfo } from '../park/zodiacData';

export interface ZodiacModalProps {
  statue: ZodiacStatueInfo | null;
  onClose: () => void;
}

export function ZodiacModal({ statue, onClose }: ZodiacModalProps) {
  if (!statue) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="zodiac-modal-title"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/68 p-4"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-[#f2e8d5]/16 bg-[#1a1713] p-6 text-[#f4efe6] shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#f2e8d5]/20 bg-[#2a251f] font-serif-kr text-2xl font-bold text-[#f3cb83]"
            >
              {statue.hanja}
            </div>
            <div>
              <h2
                id="zodiac-modal-title"
                className="font-serif-kr text-lg font-semibold text-[#f7ebd2]"
              >
                {statue.title}
              </h2>
              <p className="mt-0.5 text-xs text-[#bfa98a]">
                영천 북안면 돌할매공원 십이지신 수호상
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="복덕 안내 닫기"
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-[#f2e8d5]/15 text-[#cfc3ae] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-amber-300"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-[#f2e8d5]/10 bg-[#231f1a] p-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[#e6ba73]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>오늘의 수호 덕담</span>
          </div>
          <p className="font-serif-kr text-sm leading-relaxed text-[#ece3d3]">
            {statue.blessing}
          </p>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] rounded-xl bg-[#e6ba73] px-5 py-2 text-sm font-semibold text-[#18140f] transition-colors hover:bg-[#f0ca8a] focus-visible:outline-2 focus-visible:outline-amber-200"
          >
            공원으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
