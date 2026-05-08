// 회생 5단계 모달
// 잔액 부족 시 사용자가 회생 단계 자유 선택
// 1. 부동산 대출 (시세 ×70%)
// 2. 거래 제의 (다른 플레이어와)
// 3. NPC 매도 (시세 50%)
// 4. 신용대출 (1,000만 / 잔액 300 이하 자격)
// 5. 파산
import { useGameStore } from '@/stores/gameStore.js';
import { currentPrice } from '@/engine/inflation.js';
import { cn } from '@/lib/cn.js';
import ModalBase from './ModalBase.jsx';

export default function RecoveryModal({ open, onClose, playerId, needAmount }) {
  const state = useGameStore((s) => s.state);
  const handleLoan = useGameStore((s) => s.takePropertyLoan);
  const handleSellNPC = useGameStore((s) => s.sellPropertyToNPC);
  const handleCreditLoan = useGameStore((s) => s.takeCreditLoan);
  const handleBankrupt = useGameStore((s) => s.declareBankruptcy);
  const handleTradeOpen = useGameStore((s) => s.openTradeModal);

  if (!state || playerId == null) return null;
  const player = state.players[playerId];
  if (!player) return null;

  // 보유 부동산 (대출 안 된 것만)
  const myProperties = (player.properties ?? []).filter((pos) => {
    const ts = state.tileState[pos];
    return ts && !ts.mortgaged;
  });

  const canCreditLoan = player.cash <= 300 && !player.creditLoan?.active;

  return (
    <ModalBase open={open} onClose={onClose}>
      <div className="px-5 py-4 rounded-t-2xl bg-gradient-to-b from-yellow-700 to-orange-700 text-white text-center">
        <div className="text-xs opacity-80 tracking-widest">— RECOVERY —</div>
        <div className="text-2xl mt-1">⚠️</div>
        <div className="text-lg font-bold mt-1">회생 단계</div>
      </div>

      <div className="p-5 space-y-3">
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-600">현재 잔액</span>
            <span className="font-mono">{player.cash}만</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">필요 금액</span>
            <span className="font-mono text-matrix-red">-{needAmount}만</span>
          </div>
          <div className="flex justify-between font-bold border-t pt-1">
            <span>부족</span>
            <span className="text-matrix-red">{Math.max(0, needAmount - player.cash)}만</span>
          </div>
        </div>

        <div className="text-xs text-gray-600 text-center">자유롭게 단계를 선택하세요</div>

        {/* 단계 1: 부동산 대출 */}
        <div className="border rounded p-3 space-y-1">
          <div className="text-sm font-bold">① 부동산 대출 (시세 ×70%)</div>
          <div className="text-xs text-gray-500">자기 턴 이자 1~4% 변동</div>
          {myProperties.length > 0 ? (
            <div className="grid grid-cols-2 gap-1 mt-1">
              {myProperties.slice(0, 6).map((pos) => {
                const tile = state.board.tiles[pos];
                const price = currentPrice(state, pos);
                const loanAmt = Math.floor(price * 0.7 / 10) * 10;
                return (
                  <button
                    key={pos}
                    type="button"
                    className="text-xs py-1 px-2 bg-blue-100 hover:bg-blue-200 rounded"
                    onClick={() => {
                      handleLoan?.(playerId, pos);
                    }}
                  >
                    {tile.names.ko} (+{loanAmt}만)
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-gray-400">대출 가능 부동산 없음</div>
          )}
        </div>

        {/* 단계 2: 거래 제의 */}
        <div className="border rounded p-3 space-y-1">
          <div className="text-sm font-bold">② 거래 제의 (다른 플레이어)</div>
          <button
            type="button"
            className="w-full text-xs py-1 px-2 bg-yellow-100 hover:bg-yellow-200 rounded"
            onClick={() => {
              handleTradeOpen?.(playerId);
            }}
          >
            🤝 거래 제안하기
          </button>
        </div>

        {/* 단계 3: NPC 매도 */}
        <div className="border rounded p-3 space-y-1">
          <div className="text-sm font-bold">③ NPC 매도 (시세 50%)</div>
          {myProperties.length > 0 ? (
            <div className="grid grid-cols-2 gap-1 mt-1">
              {myProperties.slice(0, 6).map((pos) => {
                const tile = state.board.tiles[pos];
                const price = currentPrice(state, pos);
                const sellAmt = Math.floor(price * 0.5 / 10) * 10;
                return (
                  <button
                    key={pos}
                    type="button"
                    className="text-xs py-1 px-2 bg-orange-100 hover:bg-orange-200 rounded"
                    onClick={() => {
                      handleSellNPC?.(playerId, pos);
                    }}
                  >
                    {tile.names.ko} (+{sellAmt}만)
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-gray-400">매도 가능 부동산 없음</div>
          )}
        </div>

        {/* 단계 4: 신용대출 */}
        <div className={cn('border rounded p-3 space-y-1', !canCreditLoan && 'opacity-50')}>
          <div className="text-sm font-bold">④ 신용대출 (1,000만, 1회 한정)</div>
          <div className="text-xs text-gray-500">자격: 잔액 300만 이하 / 매 자기 턴 -10만 이자</div>
          <button
            type="button"
            disabled={!canCreditLoan}
            className={cn(
              'w-full text-xs py-1 px-2 rounded',
              canCreditLoan ? 'bg-green-100 hover:bg-green-200' : 'bg-gray-100 text-gray-400',
            )}
            onClick={() => {
              handleCreditLoan?.(playerId);
            }}
          >
            💸 신용대출 신청
          </button>
        </div>

        {/* 단계 5: 파산 */}
        <div className="border-2 border-red-300 rounded p-3 space-y-1 bg-red-50">
          <div className="text-sm font-bold text-monopoly-red">⑤ 파산 선언</div>
          <div className="text-xs text-gray-600">자산 NPC 회수 + 회색 구경 모드</div>
          <button
            type="button"
            className="w-full text-xs py-1 px-2 bg-red-200 hover:bg-red-300 rounded text-red-900"
            onClick={() => {
              if (confirm('정말 파산하시겠습니까? 게임에서 빠지게 됩니다.')) {
                handleBankrupt?.(playerId);
                onClose?.();
              }
            }}
          >
            ⚰️ 파산 선언
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 text-sm text-gray-600 hover:text-gray-900"
        >
          닫기 (해결 후 다시 열기)
        </button>
      </div>
    </ModalBase>
  );
}
