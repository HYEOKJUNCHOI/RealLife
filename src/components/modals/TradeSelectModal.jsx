// 거래 상대 선택 미니맵 — 모노폴리 보드판 결 (11×11 그리드, 가운데 비움)
// 흐름: 거래제의 → 이 모달 → 상대 부동산 클릭 → 락 → 다중 선택 → "거래창으로" → TradeModal
//
// 보드 좌표 매핑 (40칸):
//   - 4 코너: pos 0=GO(우하), 10=감옥(좌하), 20=주차장(좌상), 30=감옥행(우상)
//   - 하단 (좌→우): pos 10 → 9 → 8 → ... → 1 → 0
//   - 좌측 (하→상): pos 10 → 11 → ... → 19 → 20
//   - 상단 (좌→우): pos 20 → 21 → ... → 29 → 30
//   - 우측 (상→하): pos 30 → 31 → ... → 39 → 0
import { useState, useEffect, useMemo } from 'react';
import { useGameStore } from '@/stores/gameStore.js';
import { currentPrice } from '@/engine/inflation.js';
import { cn } from '@/lib/cn.js';
import ModalBase from './ModalBase.jsx';
import charactersData from '@/data/characters.json';

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
const CHAR_META = Object.fromEntries(charactersData.korea.map((c) => [c.id, c]));
const fmt = (n) => (n ?? 0).toLocaleString('ko-KR');

// 이름: 사용자가 셋업에서 입력한 값(p.name) 우선
const playerMeta = (state, playerId) => {
  const p = state?.players?.[playerId];
  const base = CHAR_META[p?.character] ?? { name: `${playerId + 1}P`, color: '#666' };
  return { ...base, name: (p?.name?.trim()) || base.name };
};

// (row, col) → 보드 pos (없으면 null = 가운데 빈 영역)
const cellToPos = (row, col) => {
  if (row === 0) return 20 + col;       // 상단: 20→30
  if (row === 10) return 10 - col;       // 하단: 10→0 (좌→우 = pos 감소)
  if (col === 0) return 20 - row;        // 좌측: 19→11
  if (col === 10) return 30 + row;       // 우측: 31→39
  return null;
};

// 코너/특수칸 라벨
const SPECIAL_LABEL = {
  go: '🏁 GO',
  jail: '🚓 감옥',
  free_parking: '🅿️ 주차장',
  go_to_jail: '🚔 감옥행',
  chance: '?',
  community_chest: '복지',
  tax: '💸 세금',
  railroad: '🚉',
  utility: '⚡',
};

export default function TradeSelectModal({ open, onClose, fromId }) {
  const state = useGameStore((s) => s.state);
  const proceed = useGameStore((s) => s.openTradeFromSelect);

  const [lockedOwner, setLockedOwner] = useState(null);
  const [selectedPos, setSelectedPos] = useState([]);

  useEffect(() => {
    if (open) {
      setLockedOwner(null);
      setSelectedPos([]);
    }
  }, [open]);

  const tilesByPos = useMemo(() => {
    if (!state) return {};
    return Object.fromEntries(state.board.tiles.map((t) => [t.pos, t]));
  }, [state]);

  if (!state || fromId == null) return null;

  const lockedMeta = lockedOwner != null ? playerMeta(state, lockedOwner) : null;

  const handleClick = (pos) => {
    const tile = tilesByPos[pos];
    if (!tile || tile.type !== 'property') return;
    const ts = state.tileState[pos];
    if (!ts || ts.owner == null) return;
    if (ts.owner === fromId) return;

    if (lockedOwner == null) {
      setLockedOwner(ts.owner);
      setSelectedPos([pos]);
      return;
    }
    if (ts.owner !== lockedOwner) return;

    setSelectedPos((prev) => {
      if (prev.includes(pos)) {
        const next = prev.filter((p) => p !== pos);
        if (next.length === 0) setLockedOwner(null);
        return next;
      }
      return [...prev, pos];
    });
  };

  const onProceed = () => {
    if (lockedOwner == null) return;
    proceed?.({ fromId, toId: lockedOwner, getPos: selectedPos });
  };

  return (
    <>
    {/* ══ 좌측 플레이어 프로필 패널 — Portal (모달 overflow 우회) ══ */}
    <ModalBase open={open} onClose={onClose} className="w-[min(95vw,720px)]">
      {/* 헤더 */}
      <div className="rounded-t-2xl bg-monopoly-red px-5 py-3 text-center text-white">
        <div className="font-display text-[10px] uppercase tracking-[0.3em] opacity-80">
          — Trade Select —
        </div>
        <div className="font-board text-[20px] font-bold leading-tight">
          거래 상대 부동산 선택
        </div>
        <div className="mt-0.5 font-display text-[10px] uppercase tracking-wider text-white/85">
          {lockedMeta
            ? `${lockedMeta.name} 의 부동산만 선택 가능 · ${selectedPos.length}개 선택`
            : '먼저 거래할 사람의 부동산 1개를 클릭하세요'}
        </div>
      </div>

      {/* 미니 보드판 11×11 */}

      <div className="border-b-2 border-ink-line bg-parchment-50 px-3 py-2">
        <div className="grid grid-cols-4 gap-1.5">
          {state.players.map((p, i) => {
            const m = playerMeta(state, i);
            const isSelf = i === fromId;
            const isLocked = lockedOwner === i;
            const isBankrupt = p.bankrupt;
            return (
              <div
                key={i}
                className={cn(
                  'flex min-w-0 items-center gap-1.5 rounded-sm border-2 px-2 py-1.5',
                  isLocked
                    ? 'border-monopoly-red bg-monopoly-red/15 shadow-[0_2px_0_0_#0F0C0A]'
                    : isSelf
                      ? 'border-emerald-700 bg-emerald-50'
                      : 'border-ink-line/40 bg-white',
                  isBankrupt && 'opacity-40 saturate-50',
                )}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full border border-white/80 shadow-sm"
                  style={{ backgroundColor: m.color }}
                  aria-hidden="true"
                />
                <span className="shrink-0 font-display text-[8px] font-extrabold uppercase tracking-[0.16em]" style={{ color: m.color }}>
                  {i + 1}P
                </span>
                <span className="min-w-0 truncate font-board text-[11px] font-extrabold leading-none text-ink">
                  {m.name}
                </span>
                {isSelf && (
                  <span className="ml-auto rounded-sm border border-emerald-700 bg-emerald-100 px-1 font-display text-[7px] font-bold uppercase tracking-wider text-emerald-900">
                    {'\uB098'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="bg-parchment-100 p-3">
        <div className="mx-auto aspect-square w-full max-w-[640px]">
          <div className="grid h-full w-full grid-cols-[repeat(11,1fr)] grid-rows-[repeat(11,1fr)] gap-[2px] rounded-md border-2 border-ink-line bg-ink-line/20 p-[2px]">
            {Array.from({ length: 11 * 11 }).map((_, idx) => {
              const row = Math.floor(idx / 11);
              const col = idx % 11;
              const pos = cellToPos(row, col);

              // 가운데 빈 영역 (1×1 셀들 합쳐서 큰 빈 영역으로 채움)
              if (pos == null) {
                // 가운데 영역 첫 셀에서만 큰 라벨 렌더, 나머지는 비움
                if (row === 1 && col === 1) {
                  return (
                    <div
                      key={idx}
                      className="flex flex-col items-center justify-center rounded-sm bg-parchment-50 text-center"
                      style={{ gridColumn: '2 / 11', gridRow: '2 / 11' }}
                    >
                      <span className="font-display text-[11px] font-bold uppercase tracking-[0.3em] text-ink/40">
                        REAL LIFE
                      </span>
                      <span className="mt-1 font-board text-[28px] text-ink/60">
                        🏙️
                      </span>
                      {lockedMeta && (
                        <div className="mt-3 rounded-md border-2 border-ink-line bg-white px-3 py-1.5 shadow-[0_2px_0_0_#0F0C0A]">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="h-3 w-3 rounded-full border border-white/80 shadow-sm"
                              style={{ backgroundColor: lockedMeta.color }}
                              aria-hidden="true"
                            />
                            <span className="font-display text-[12px] font-bold uppercase tracking-wider text-ink">
                              {lockedMeta.name}
                            </span>
                          </div>
                          <div className="mt-0.5 font-display text-[10px] font-semibold uppercase tracking-widest text-ink/60">
                            {selectedPos.length} 개 선택됨
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
                // 가운데 영역의 다른 셀들은 grid 영역에 흡수되도록 안 그림
                if (row >= 1 && row <= 9 && col >= 1 && col <= 9) return null;
                return <div key={idx} />;
              }

              const tile = tilesByPos[pos];
              if (!tile) return <div key={idx} className="bg-parchment-50" />;

              // 비-property 타일 렌더 (코너/이벤트/세금 등)
              if (tile.type !== 'property') {
                let label = '';
                if (tile.type === 'go') label = SPECIAL_LABEL.go;
                else if (tile.type === 'jail') label = SPECIAL_LABEL.jail;
                else if (tile.type === 'free_parking') label = SPECIAL_LABEL.free_parking;
                else if (tile.type === 'go_to_jail') label = SPECIAL_LABEL.go_to_jail;
                else if (tile.type === 'chance') label = SPECIAL_LABEL.chance;
                else if (tile.type === 'community_chest') label = SPECIAL_LABEL.community_chest;
                else if (tile.type === 'tax') label = SPECIAL_LABEL.tax;
                else if (tile.type === 'railroad') label = `🚉 ${tile.names?.ko ?? ''}`;
                else if (tile.type === 'utility') label = `⚡ ${tile.displayName ?? tile.names?.ko ?? ''}`;

                const isCorner = pos === 0 || pos === 10 || pos === 20 || pos === 30;
                return (
                  <div
                    key={idx}
                    className={cn(
                      'flex flex-col items-center justify-center overflow-hidden rounded-sm bg-parchment-50 px-0.5 text-center',
                      isCorner && 'bg-parchment-200',
                    )}
                  >
                    <span className="font-display text-[8px] font-semibold leading-tight text-ink/75">
                      {label}
                    </span>
                  </div>
                );
              }

              // property 타일
              const ts = state.tileState[pos] ?? {};
              const isMine = ts.owner === fromId;
              const isUnowned = ts.owner == null;
              const isOtherOwner = !isMine && !isUnowned;
              const isSelected = selectedPos.includes(pos);
              const isLockMatch = lockedOwner != null && ts.owner === lockedOwner;
              const isClickable = isOtherOwner && (lockedOwner == null || isLockMatch);
              const ownerColor =
                ts.owner != null ? playerMeta(state, ts.owner).color : null;

              // 컬러 띠 = 보드 바깥쪽 (책갈피 결) — 모노폴리 결
              // 상단 row=0 → 위쪽 / 하단 row=10 → 아래쪽 / 좌측 col=0 → 왼쪽 / 우측 col=10 → 오른쪽
              const bandSide =
                row === 0 ? 'top'
                : row === 10 ? 'bottom'
                : col === 0 ? 'left'
                : col === 10 ? 'right'
                : 'top';

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!isClickable}
                  onClick={() => handleClick(pos)}
                  title={`${tile.names?.ko ?? ''}${isMine ? ' (내 소유)' : isUnowned ? ' (빈 땅 · 거래 불가)' : ` (${playerMeta(state, ts.owner).name} 소유)`} · ${fmt(currentPrice(state, pos))}만`}
                  className={cn(
                    'group relative flex flex-col items-center justify-center overflow-hidden rounded-sm border-[1.5px] bg-white transition',
                    isSelected
                      ? 'border-monopoly-red ring-2 ring-monopoly-red/60 z-10'
                      : isClickable
                        ? 'border-ink-line/60 hover:border-ink-line hover:scale-[1.05] hover:z-10'
                        : isMine
                          ? 'border-emerald-700/60 bg-emerald-50 cursor-not-allowed'
                          : isUnowned
                            ? 'border-neutral-300 bg-neutral-100 cursor-not-allowed opacity-50 grayscale'
                            : 'border-ink-line/30 bg-neutral-200 cursor-not-allowed opacity-60',
                  )}
                >
                  {/* 컬러 띠 — 모노폴리 결, 두껍게 (35%), 외곽 방향 */}
                  <div
                    className={cn(
                      'absolute border-ink-line',
                      COLOR_BG[tile.color] || 'bg-neutral-400',
                      bandSide === 'top' && 'left-0 right-0 top-0 h-[35%] border-b-2',
                      bandSide === 'bottom' && 'left-0 right-0 bottom-0 h-[35%] border-t-2',
                      bandSide === 'left' && 'top-0 bottom-0 left-0 w-[35%] border-r-2',
                      bandSide === 'right' && 'top-0 bottom-0 right-0 w-[35%] border-l-2',
                    )}
                    aria-hidden="true"
                  >
                    {/* 소유자 컬러 점 — 띠 위 가운데 (큼직, 잘 보이게) */}
                    {ownerColor && (
                      <span
                        className={cn(
                          'absolute h-3 w-3 rounded-full border-[1.5px] border-white shadow-[0_1px_2px_rgba(0,0,0,0.5)]',
                          bandSide === 'top' && 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
                          bandSide === 'bottom' && 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
                          bandSide === 'left' && 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
                          bandSide === 'right' && 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
                        )}
                        style={{ backgroundColor: ownerColor }}
                      />
                    )}
                  </div>

                  {/* 도시명 */}
                  <span
                    className={cn(
                      'relative z-[1] font-board font-extrabold text-[10px] leading-none text-ink',
                      bandSide === 'top' && 'mt-[35%]',
                      bandSide === 'bottom' && 'mb-[35%]',
                      bandSide === 'left' && 'ml-[35%]',
                      bandSide === 'right' && 'mr-[35%]',
                    )}
                  >
                    {tile.names?.ko}
                  </span>

                  {/* 시세 */}
                  <span
                    className={cn(
                      'relative z-[1] mt-0.5 font-display text-[8px] font-bold tabular-nums leading-none text-ink/75',
                      bandSide === 'left' && 'ml-[35%]',
                      bandSide === 'right' && 'mr-[35%]',
                    )}
                  >
                    {fmt(currentPrice(state, pos))}
                  </span>

                  {/* 내 소유 배지 — 좌하단 */}
                  {isMine && (
                    <span className="absolute bottom-0.5 left-0.5 z-[2] rounded-sm border border-emerald-700 bg-emerald-100 px-0.5 font-display text-[6px] font-bold uppercase tracking-wider leading-none text-emerald-900">
                      나
                    </span>
                  )}

                  {/* 선택 체크 — 우하단 (띠 안 가리게) */}
                  {isSelected && (
                    <span className="absolute bottom-0.5 right-0.5 z-[2] flex h-3.5 w-3.5 items-center justify-center rounded-full bg-monopoly-red font-display text-[9px] font-bold text-white shadow-[0_1px_0_0_#0F0C0A]">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 액션 — 진행 / 취소 */}
      <div className="flex items-stretch gap-2 border-t-2 border-ink-line bg-parchment-100 px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border-2 border-ink-line bg-neutral-200 px-4 py-2 font-display text-[11px] font-bold uppercase tracking-widest text-ink shadow-[0_2px_0_0_#0F0C0A] hover:bg-neutral-100 active:translate-y-px"
        >
          취소
        </button>
        <button
          type="button"
          onClick={onProceed}
          disabled={lockedOwner == null || selectedPos.length === 0}
          className={cn(
            'flex-1 rounded-md border-2 px-4 py-2 font-display text-[11px] font-extrabold uppercase tracking-widest shadow-[0_2px_0_0_#0F0C0A] active:translate-y-px',
            lockedOwner != null && selectedPos.length > 0
              ? 'border-ink-line bg-monopoly-red text-white hover:bg-monopoly-deep'
              : 'cursor-not-allowed border-ink-line/30 bg-neutral-200 text-ink/40',
          )}
        >
          {lockedMeta
            ? `${lockedMeta.name} 와 거래창 열기 (${selectedPos.length}개)`
            : '먼저 부동산을 선택하세요'}
        </button>
      </div>
    </ModalBase>
    </>
  );
}
