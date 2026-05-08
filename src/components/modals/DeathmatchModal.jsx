// 데스매치 시작 알림 — 30분 경과 시 1회만
import { useGameStore } from '@/stores/gameStore.js';
import ModalBase from './ModalBase.jsx';

export default function DeathmatchModal({ open, onClose }) {
  const handleConfirm = useGameStore((s) => s.confirmDeathmatch);

  return (
    <ModalBase open={open} onClose={onClose} hideClose>
      <div className="px-5 py-6 rounded-t-2xl bg-gradient-to-b from-red-900 to-red-700 text-white text-center">
        <div className="text-3xl">⚠️</div>
        <div className="text-2xl font-bold mt-2 tracking-wider">데스매치 시작!</div>
        <div className="text-xs opacity-80 mt-1">DEATHMATCH MODE</div>
      </div>

      <div className="p-5 space-y-3 text-center">
        <div className="text-sm text-gray-700 leading-relaxed">
          마지막 30분, <strong className="text-monopoly-red">매 라운드</strong> 사회 이벤트가 발동됩니다.
        </div>
        <div className="text-xs text-gray-500">
          전쟁 / 재개발 / 거품 붕괴 / GTX / 화재 / 다주택자 규제 / 청약 추첨
        </div>
        <div className="text-xs bg-yellow-50 border border-yellow-200 rounded p-2 text-yellow-800">
          🔥 방심은 금물 — 운빨로 강자도 약자도 뒤집힐 수 있습니다
        </div>

        <button
          type="button"
          onClick={() => {
            handleConfirm?.();
            onClose?.();
          }}
          className="w-full py-2 rounded bg-monopoly-red text-white font-bold hover:bg-red-700 mt-4"
        >
          시작
        </button>
      </div>
    </ModalBase>
  );
}
