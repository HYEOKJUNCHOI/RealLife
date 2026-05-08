// 거래 모달 — N:N 패키지 + 카운터 오퍼 1회
// 좌측 (내가 줄 것) + 우측 (받을 것)
// 시세만 표시 (균형 계산 X — 가족 직접 판단)
import { useState, useEffect } from 'react';
import { useGameStore } from '@/stores/gameStore.js';
import { currentPrice } from '@/engine/inflation.js';
import { cn } from '@/lib/cn.js';
import ModalBase from './ModalBase.jsx';
import charactersData from '@/data/characters.json';

const CHAR_META = Object.fromEntries(charactersData.korea.map((c) => [c.id, c]));
// 이름: 사용자가 셋업에서 입력한 값(p.name) 우선
const playerMeta = (state, playerId) => {
  const p = state?.players?.[playerId];
  const base = CHAR_META[p?.character] ?? { name: `${playerId + 1}P`, color: '#666' };
  return { ...base, name: (p?.name?.trim()) || base.name };
};

const COLOR_BG = {
  brown: 'bg-prop-brown',
  lightblue: 'bg-prop-lightblue',
  pink: 'bg-prop-pink',
  orange: 'bg-prop-orange',
  red: 'bg-prop-red',
  yellow: 'bg-prop-yellow',
  green: 'bg-prop-green',
  darkblue: 'bg-prop-darkblue',
};

function PropertyChip({ pos, state, selected, onToggle }) {
  const tile = state.board.tiles[pos];
  const price = currentPrice(state, pos);
  return (
    <button
      type="button"
      onClick={() => onToggle?.(pos)}
      className={cn(
        'flex flex-col items-start text-left px-2 py-1.5 rounded border-2 transition-all',
        COLOR_BG[tile.color] || 'bg-gray-200',
        selected ? 'border-matrix-green ring-2 ring-matrix-green/50' : 'border-transparent opacity-60',
      )}
    >
      <span className="text-xs font-bold text-white drop-shadow">{tile.names.ko}</span>
      <span className="text-[10px] font-mono text-white/90">{price}만</span>
    </button>
  );
}

export default function TradeModal({ open, onClose, fromId, toId: initialToId, initialGetPos }) {
  const state = useGameStore((s) => s.state);
  const handleSubmit = useGameStore((s) => s.submitTrade);

  const [toId, setToId] = useState(initialToId ?? null);
  const [givePos, setGivePos] = useState([]);
  const [getPos, setGetPos] = useState(initialGetPos ?? []);
  const [giveCash, setGiveCash] = useState(0);
  const [getCash, setGetCash] = useState(0);
  const [retryUsed, setRetryUsed] = useState(false);

  // 모달 열릴 때 초기화 (미니맵에서 미리 선택된 부동산 있으면 반영)
  useEffect(() => {
    if (open) {
      setToId(initialToId ?? null);
      setGivePos([]);
      setGetPos(initialGetPos ?? []);
      setGiveCash(0);
      setGetCash(0);
      setRetryUsed(false);
    }
  }, [open, initialToId, initialGetPos]);

  if (!state || fromId == null) return null;

  const fromPlayer = state.players[fromId];
  const toPlayer = toId != null ? state.players[toId] : null;
  const otherPlayers = state.players.filter((p, i) => i !== fromId && !p.bankrupt);

  const myProperties = (fromPlayer.properties ?? []).filter((pos) => {
    const ts = state.tileState[pos];
    return ts && ts.stage === 0; // 빌라 없는 부동산만 거래 가능 (단순화)
  });

  const theirProperties = toPlayer
    ? (toPlayer.properties ?? []).filter((pos) => {
        const ts = state.tileState[pos];
        return ts && ts.stage === 0;
      })
    : [];

  const toggleGive = (pos) =>
    setGivePos((prev) => (prev.includes(pos) ? prev.filter((p) => p !== pos) : [...prev, pos]));
  const toggleGet = (pos) =>
    setGetPos((prev) => (prev.includes(pos) ? prev.filter((p) => p !== pos) : [...prev, pos]));

  const onSubmit = () => {
    if (toId == null) return;
    handleSubmit?.({
      fromId,
      toId,
      givePos,
      getPos,
      giveCash: Math.max(0, parseInt(giveCash, 10) || 0),
      getCash: Math.max(0, parseInt(getCash, 10) || 0),
    });
    onClose?.();
  };

  return (
    <ModalBase open={open} onClose={onClose} className="w-[min(95vw,560px)]">
      <div className="px-5 py-3 rounded-t-2xl bg-monopoly-red text-white">
        <div className="text-center">
          <div className="text-xs opacity-80 tracking-widest">— TRADE —</div>
          <div className="text-lg font-bold">거래 제안</div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* 거래 상대 선택 */}
        <div>
          <div className="text-xs text-gray-500 mb-1">거래 상대</div>
          <div className="flex gap-2 flex-wrap">
            {otherPlayers.map((p) => {
              const pid = state.players.indexOf(p);
              const meta = playerMeta(state, pid);
              return (
                <button
                  key={pid}
                  type="button"
                  onClick={() => setToId(pid)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1 rounded text-sm border-2',
                    toId === pid
                      ? 'border-matrix-green bg-green-50 text-black font-bold'
                      : 'border-gray-300 bg-white text-gray-600',
                  )}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full border border-ink-line/40"
                    style={{ backgroundColor: meta.color }}
                    aria-hidden="true"
                  />
                  {meta.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* 좌우 분할 */}
        <div className="grid grid-cols-2 gap-3">
          {/* 좌측 — 내가 줄 것 */}
          <div className="border rounded p-2 space-y-2">
            <div className="text-xs font-bold text-gray-700">📤 내가 줄 것</div>
            <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto">
              {myProperties.map((pos) => (
                <PropertyChip
                  key={pos}
                  pos={pos}
                  state={state}
                  selected={givePos.includes(pos)}
                  onToggle={toggleGive}
                />
              ))}
              {myProperties.length === 0 && <div className="text-xs text-gray-400">거래 가능 부동산 없음</div>}
            </div>
            <div>
              <label className="text-xs text-gray-500">현금 (만원)</label>
              <input
                type="number"
                min="0"
                max={fromPlayer.cash}
                value={giveCash}
                onChange={(e) => setGiveCash(e.target.value)}
                className="w-full px-2 py-1 border rounded text-sm font-mono"
              />
              <div className="text-[10px] text-gray-400">잔액 {fromPlayer.cash}만</div>
            </div>
          </div>

          {/* 우측 — 받을 것 */}
          <div className="border rounded p-2 space-y-2">
            <div className="text-xs font-bold text-gray-700">📥 받을 것</div>
            <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto">
              {theirProperties.map((pos) => (
                <PropertyChip
                  key={pos}
                  pos={pos}
                  state={state}
                  selected={getPos.includes(pos)}
                  onToggle={toggleGet}
                />
              ))}
              {!toPlayer && <div className="text-xs text-gray-400">상대 선택 필요</div>}
              {toPlayer && theirProperties.length === 0 && (
                <div className="text-xs text-gray-400">상대 부동산 없음</div>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-500">현금 (만원)</label>
              <input
                type="number"
                min="0"
                max={toPlayer?.cash ?? 0}
                value={getCash}
                onChange={(e) => setGetCash(e.target.value)}
                className="w-full px-2 py-1 border rounded text-sm font-mono"
                disabled={!toPlayer}
              />
              <div className="text-[10px] text-gray-400">상대 잔액 {toPlayer?.cash ?? '-'}만</div>
            </div>
          </div>
        </div>

        {/* NPC 정보 (시세만) */}
        <div className="bg-gray-50 rounded p-2 text-xs text-gray-600">
          💬 NPC: 시세 정보 (균형 판단은 직접) —{' '}
          {givePos.map((p) => `${state.board.tiles[p].names.ko} ${currentPrice(state, p)}만`).join(' / ') || '내가 줄 부동산 없음'}
          {' ↔ '}
          {getPos.map((p) => `${state.board.tiles[p].names.ko} ${currentPrice(state, p)}만`).join(' / ') || '받을 부동산 없음'}
        </div>

        {/* 액션 */}
        <div className="flex gap-2">
          {!retryUsed && (
            <button
              type="button"
              className="flex-1 py-2 rounded bg-yellow-100 text-yellow-800 hover:bg-yellow-200 text-sm"
              onClick={() => setRetryUsed(true)}
              disabled
              title="카운터 오퍼는 상대가 거절 후에만 가능"
            >
              💬 카운터 오퍼 (1회)
            </button>
          )}
          <button
            type="button"
            className="flex-1 py-2 rounded bg-matrix-green text-black font-bold hover:bg-green-400 text-sm"
            onClick={onSubmit}
            disabled={toId == null || (givePos.length === 0 && getPos.length === 0 && +giveCash === 0 && +getCash === 0)}
          >
            ✅ 거래 보내기
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
      </div>
    </ModalBase>
  );
}
