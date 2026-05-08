// 1년 결산 모달 — 모든 플레이어 GO 1바퀴
// 인플레/종부세/생활비/대출이자율/역장 단가
import { useGameStore } from '@/stores/gameStore.js';
import ModalBase from './ModalBase.jsx';

export default function YearEndModal({ open, onClose, year, summary }) {
  const handleConfirm = useGameStore((s) => s.confirmYearEnd);

  return (
    <ModalBase open={open} onClose={onClose} hideClose>
      <div className="px-5 py-4 rounded-t-2xl bg-monopoly-red text-white text-center">
        <div className="text-xs opacity-80 tracking-widest">— YEAR END —</div>
        <div className="text-2xl font-bold mt-1">{year}년차 결산</div>
      </div>

      <div className="p-5 space-y-3">
        <div className="text-sm text-gray-700 text-center">한 해가 흘렀습니다.</div>

        {/* 결산 항목 */}
        <div className="bg-gray-50 rounded p-3 space-y-2 text-sm">
          {summary?.inflationRate != null && (
            <div className="flex justify-between">
              <span className="text-gray-600">📈 인플레이션</span>
              <span className="font-mono">+{summary.inflationRate}%</span>
            </div>
          )}
          {summary?.loanRate != null && (
            <div className="flex justify-between">
              <span className="text-gray-600">💳 대출 이자율</span>
              <span className="font-mono">{summary.loanRate}%</span>
            </div>
          )}
          {summary?.stationStage && (
            <div className="flex justify-between">
              <span className="text-gray-600">🚉 역장 단가</span>
              <span className="font-mono">{summary.stationStage}</span>
            </div>
          )}
        </div>

        {/* 플레이어별 변동 */}
        {summary?.playerChanges && (
          <div className="border rounded">
            <div className="bg-gray-100 px-3 py-1 text-xs font-bold">플레이어별 변동</div>
            <div className="divide-y">
              {summary.playerChanges.map((p, i) => (
                <div key={i} className="flex justify-between px-3 py-2 text-xs">
                  <span>{p.name}</span>
                  <span className="space-x-2">
                    {p.tax != null && <span className="text-matrix-red">종부세 -{p.tax}만</span>}
                    {p.living != null && <span className="text-matrix-red">생활비 -{p.living}만</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            handleConfirm?.();
            onClose?.();
          }}
          className="w-full py-2 rounded bg-monopoly-red text-white font-bold hover:bg-red-700"
        >
          확인
        </button>
      </div>
    </ModalBase>
  );
}
