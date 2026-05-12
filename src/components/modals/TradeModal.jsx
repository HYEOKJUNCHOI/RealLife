// 거래 모달 — N:N 패키지
// 좌측 (내가 줄 것) + 우측 (받을 것)
// 시세만 표시 (균형 계산 X — 가족 직접 판단)
import { useState, useEffect } from 'react';
import { useGameStore } from '@/stores/gameStore.js';
import { currentPrice, rentFromStage } from '@/engine/inflation.js';
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

function propertyStageLabel(stage = 0) {
  if (stage === 5) return '🏢 아파트';
  if (stage > 0) return `🏠 빌라 ${stage}채`;
  return '빈 땅';
}

function TradeInfoGroup({ title, tone = 'green', positions = [], cash = 0, state }) {
  return (
    <div className="rounded-lg border border-ink-line/20 bg-white/85 p-2">
      <div className={cn('mb-1 font-board text-[16px] font-extrabold', tone === 'red' ? 'text-red-700' : 'text-emerald-700')}>{title}</div>
      <div className="grid gap-1">
        {positions.slice(0, 3).map((pos) => {
          const tile = state.board.tiles[pos];
          const ts = state.tileState[pos] ?? {};
          const price = currentPrice(state, pos);
          const rent = rentFromStage(state, pos);
          return (
            <div key={pos} className="overflow-hidden rounded-md border-2 border-ink-line bg-parchment-50 shadow-[0_2px_0_#0F0C0A]">
              <div className={cn('h-2', COLOR_BG[tile.color] || 'bg-gray-300')} />
              <div className="px-2 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-board text-[15px] font-extrabold text-ink">{tile.names.ko}</span>
                  <span className="rounded-full bg-white px-1.5 py-0.5 font-display text-[9px] font-bold text-ink/70">{propertyStageLabel(ts.stage)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between font-display text-[10px] font-bold text-ink/60">
                  <span>거래가 {price.toLocaleString('ko-KR')}만</span>
                  <span>월세 {rent.toLocaleString('ko-KR')}만</span>
                </div>
              </div>
            </div>
          );
        })}
        {positions.length > 3 && <div className="font-board text-[12px] text-ink/55">+{positions.length - 3}개 더</div>}
        {positions.length === 0 && <div className="rounded-md bg-gray-50 px-2 py-2 font-board text-[13px] text-ink/40">권리증 없음</div>}
      </div>
      <div className="mt-2 rounded-md border border-ink-line/25 bg-white px-2 py-1 font-board text-[14px] text-ink">현금 {Number(cash || 0).toLocaleString('ko-KR')}만</div>
    </div>
  );
}

function propertySort(state, positions) {
  return [...positions].sort((a, b) => {
    const ta = state.board.tiles[a];
    const tb = state.board.tiles[b];
    if ((ta?.color ?? '') !== (tb?.color ?? '')) return String(ta?.color ?? '').localeCompare(String(tb?.color ?? ''));
    return a - b;
  });
}

function PropertyChip({ pos, state, selected, onToggle }) {
  const tile = state.board.tiles[pos];
  const price = currentPrice(state, pos);
  const rent = rentFromStage(state, pos);
  const stage = state.tileState[pos]?.stage ?? 0;
  return (
    <button
      type="button"
      onClick={() => onToggle?.(pos)}
      className={cn(
        'flex flex-col items-start text-left px-2 py-1 rounded-lg border-2 transition-all shadow-[0_2px_0_#0F0C0A]',
        COLOR_BG[tile.color] || 'bg-gray-200',
        selected ? 'border-matrix-green ring-2 ring-matrix-green/50' : 'border-transparent opacity-60',
      )}
    >
      <span className="text-[12px] font-bold leading-none text-white drop-shadow">{tile.names.ko}</span>
      <span className="mt-0.5 text-[9px] font-mono leading-none text-white/90">시세 {price}만 · 월세 {rent}만</span>
      <span className="mt-0.5 text-[9px] font-board leading-none text-white/90">{propertyStageLabel(stage)}</span>
    </button>
  );
}

const cleanMoney = (value, max = 999999) => {
  const numeric = String(value ?? '').replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  const amount = Math.min(Number.parseInt(numeric || '0', 10) || 0, Math.max(0, max ?? 0));
  return String(amount);
};

function MoneyKeypad({ value, max = 0, marketAmount = 0, onChange, disabled = false }) {
  const current = Number.parseInt(value || '0', 10) || 0;
  const setAmount = (next) => onChange?.(cleanMoney(next, max));
  const append = (digit) => {
    if (disabled) return;
    setAmount(`${current}${digit}`);
  };
  const quickAdd = (amount) => {
    if (disabled) return;
    setAmount(current + amount);
  };
  const quickSub = (amount) => {
    if (disabled) return;
    setAmount(Math.max(0, current - amount));
  };

  return (
    <div className={cn('mt-1 grid gap-1.5', disabled && 'pointer-events-none opacity-45')}>
      <div className="grid grid-cols-5 gap-1.5">
        {[10, 50, 100, 500].map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => quickAdd(amount)}
            className="h-8 rounded-lg border-2 border-ink-line bg-[linear-gradient(180deg,#ffffff_0%,#ffe8a8_56%,#e9bd56_100%)] font-board text-[13px] text-ink shadow-[0_2px_0_#0F0C0A] active:translate-y-0.5 active:shadow-none"
          >
            +{amount}
          </button>
        ))}
        <button type="button" onClick={() => setAmount(max)} className="h-8 rounded-lg border-2 border-ink-line bg-[linear-gradient(180deg,#f0fff6_0%,#9de8c8_58%,#44b990_100%)] font-board text-[13px] text-emerald-950 shadow-[0_2px_0_#0F0C0A] active:translate-y-0.5 active:shadow-none">최대</button>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {[10, 50, 100].map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => quickSub(amount)}
            className="h-8 rounded-lg border-2 border-ink-line bg-white font-board text-[13px] text-ink/70 shadow-[0_2px_0_#0F0C0A] active:translate-y-0.5 active:shadow-none"
          >
            -{amount}
          </button>
        ))}
        <button type="button" onClick={() => setAmount(marketAmount || 0)} className="h-8 rounded-lg border-2 border-ink-line bg-red-50 font-board text-[13px] text-red-700 shadow-[0_2px_0_#0F0C0A] active:translate-y-0.5 active:shadow-none">시세</button>
        <button type="button" onClick={() => setAmount(String(value ?? '0').slice(0, -1) || '0')} className="h-8 rounded-lg border-2 border-ink-line bg-slate-50 font-board text-[13px] text-ink shadow-[0_2px_0_#0F0C0A] active:translate-y-0.5 active:shadow-none">⌫</button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => append(num)}
            className="h-7 rounded-lg border border-ink-line/35 bg-white font-display text-[13px] font-bold text-ink shadow-[0_1px_0_#0F0C0A] active:translate-y-0.5 active:shadow-none"
          >
            {num}
          </button>
        ))}
        <button type="button" onClick={() => append(0)} className="col-span-3 h-7 rounded-lg border border-ink-line/35 bg-white font-display text-[13px] font-bold text-ink shadow-[0_1px_0_#0F0C0A] active:translate-y-0.5 active:shadow-none">0</button>
      </div>
    </div>
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
  const [confirming, setConfirming] = useState(false);

  // 모달 열릴 때 초기화 (미니맵에서 미리 선택된 부동산 있으면 반영)
  useEffect(() => {
    if (open) {
      setToId(initialToId ?? null);
      setGivePos([]);
      setGetPos(initialGetPos ?? []);
      setGiveCash(0);
      setGetCash(0);
      setConfirming(false);
    }
  }, [open, initialToId, initialGetPos]);

  if (!state || fromId == null) return null;

  const fromPlayer = state.players[fromId];
  const toPlayer = toId != null ? state.players[toId] : null;
  const otherPlayers = state.players.filter((p, i) => i !== fromId && !p.bankrupt);

  const myProperties = propertySort(state, (fromPlayer.properties ?? []).filter((pos) => state.tileState[pos]));

  const theirProperties = toPlayer
    ? propertySort(state, (toPlayer.properties ?? []).filter((pos) => state.tileState[pos]))
    : [];

  const toggleGive = (pos) =>
    setGivePos((prev) => (prev.includes(pos) ? prev.filter((p) => p !== pos) : [...prev, pos]));
  const toggleGet = (pos) =>
    setGetPos((prev) => (prev.includes(pos) ? prev.filter((p) => p !== pos) : [...prev, pos]));

  const tradeEmpty = givePos.length === 0 && getPos.length === 0 && +giveCash === 0 && +getCash === 0;
  const describeList = (positions) => positions.map((pos) => state.board.tiles[pos]?.names?.ko ?? pos).join(', ') || '없음';

  const onSubmit = () => {
    if (toId == null || tradeEmpty) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
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
    <ModalBase open={open} onClose={onClose} className="w-[min(98vw,720px)] max-h-[92vh] overflow-hidden">
      <div className="px-5 py-3 rounded-t-2xl bg-monopoly-red text-white shadow-[inset_0_-3px_0_rgba(15,12,10,0.32)]">
        <div className="text-center">
          <div className="text-xs opacity-80 tracking-widest">— TRADE —</div>
          <div className="text-lg font-bold">거래 제안</div>
        </div>
      </div>

      <div className="space-y-3 p-3">
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
        <div className="grid grid-cols-2 gap-2">
          {/* 좌측 — 내가 줄 것 */}
          <div className="space-y-2 rounded-xl border-2 border-ink-line bg-white/80 p-2">
            <div className="font-board text-[15px] font-extrabold text-gray-700">📤 내가 줄 것</div>
            <div className="grid grid-cols-2 gap-1.5">
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
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                min="0"
                max={fromPlayer.cash}
                value={giveCash}
                onChange={(e) => setGiveCash(cleanMoney(e.target.value, fromPlayer.cash))}
                className="w-full px-2 py-1 border rounded text-sm font-mono"
              />
              <MoneyKeypad value={giveCash} max={fromPlayer.cash} marketAmount={getPos.reduce((sum, pos) => sum + currentPrice(state, pos), 0)} onChange={setGiveCash} />
              <div className="text-[10px] text-gray-400">잔액 {fromPlayer.cash}만</div>
            </div>
          </div>

          {/* 우측 — 받을 것 */}
          <div className="space-y-2 rounded-xl border-2 border-ink-line bg-white/80 p-2">
            <div className="font-board text-[15px] font-extrabold text-gray-700">📥 받을 것</div>
            <div className="grid grid-cols-2 gap-1.5">
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
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                min="0"
                max={toPlayer?.cash ?? 0}
                value={getCash}
                onChange={(e) => setGetCash(cleanMoney(e.target.value, toPlayer?.cash ?? 0))}
                className="w-full px-2 py-1 border rounded text-sm font-mono"
                disabled={!toPlayer}
              />
              <MoneyKeypad value={getCash} max={toPlayer?.cash ?? 0} marketAmount={givePos.reduce((sum, pos) => sum + currentPrice(state, pos), 0)} onChange={setGetCash} disabled={!toPlayer} />
              <div className="text-[10px] text-gray-400">상대 잔액 {toPlayer?.cash ?? '-'}만</div>
            </div>
          </div>
        </div>

        {/* 거래 정보카드 */}
        <div className={cn('rounded-xl border-2 p-3 text-sm shadow-[0_2px_0_#0F0C0A]', confirming ? 'border-emerald-700 bg-emerald-50 text-emerald-950' : 'border-ink-line bg-white text-gray-700')}>
          <div className="mb-2 font-board text-lg text-ink">{confirming ? '거래 승인 요청' : '거래 정보카드'}</div>
          <div className="grid grid-cols-2 gap-2">
            <TradeInfoGroup title="내가 주는 것" tone="red" positions={givePos} cash={giveCash} state={state} />
            <TradeInfoGroup title="내가 받는 것" tone="green" positions={getPos} cash={getCash} state={state} />
          </div>
        </div>

        {/* 액션 */}
        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 py-2 rounded bg-matrix-green text-black font-bold hover:bg-green-400 text-sm"
            onClick={onSubmit}
            disabled={toId == null || tradeEmpty}
          >
            {confirming ? '✅ 확정해서 보내기' : '👀 요약 확인'}
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
