import { X } from 'lucide-react';

export interface HistoryModalProps {
  open: boolean;
  onClose: () => void;
}

export function HistoryModal({ open, onClose }: HistoryModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-modal-title"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-[#f2e8d5]/15 bg-[#1b1814] p-6 text-[#f2ece1] shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="history-modal-title"
              className="font-serif-kr text-xl font-semibold text-[#f6ebd4]"
            >
              영천 북안면 돌할매의 450년 이야기
            </h2>
            <p className="mt-1 text-xs text-[#b8aa93]">
              경상북도 영천시 북안면 관리 · 관산 자락
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="안내 창 닫기"
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-[#f2e8d5]/15 text-[#cfc3ae] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-amber-300"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 space-y-3.5 text-sm leading-relaxed text-[#ded4c3]">
          <p>
            경북 영천시 북안면 관리의 관산 자락 숲속에는 약 450여 년 전부터
            마을 사람들의 애환과 소망을 품어온 신비로운 화강암 원석,{' '}
            <strong className="font-semibold text-[#f3cb83]">돌할매</strong>가 모셔져 있습니다.
          </p>
          <p>
            무게 약 10kg 남짓한 둥근 달걀 모양의 돌할매는 자연 암반 앞 사각형 화강암
            좌대의 둥근 홈 안에 자리하고 있으며, 오랜 세월 소원을 비는 참배객들의
            따뜻한 손길이 닿아 매끄러운 윤기를 띠고 있습니다.
          </p>
          <p>
            예로부터 먼저 아무 생각 없이 돌할매를 들어 본래의 무게를 느껴본 뒤,
            자신의 주소·성명·나이와 간절한 소원 한 가지를 정성껏 고하고 다시 들어
            보았을 때 돌이 마치 자석에 붙은 듯 꿈쩍도 하지 않으면 그 소원이 반드시
            이루어진다고 전해집니다.
          </p>
          <p className="text-xs text-[#afa28c]">
            이 공간은 서두름 없이 마음을 가다듬고, 바람과 소나무 소리 속에서 조용히
            자신의 바람을 마주할 수 있도록 꾸며진 고요한 산골 기도처입니다.
          </p>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] rounded-xl bg-[#e6ba73] px-5 py-2 text-sm font-semibold text-[#18140f] transition-colors hover:bg-[#f0ca8a] focus-visible:outline-2 focus-visible:outline-amber-200"
          >
            전각으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
