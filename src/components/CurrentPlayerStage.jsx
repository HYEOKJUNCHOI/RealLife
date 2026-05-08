// 중앙 스테이지 — 현재 차례 플레이어
//
// 레이아웃:
//   ┌────────┬─────────────────────────┐
//   │ 투명   │ 이름 + STATUS BOARD      │
//   │ 캐릭터 │  - 패시브 (왜 월급 올랐나)│
//   │        │  - 매턴 +/- 흐름         │
//   │        │  - 글로벌 상태           │
//   ├────────┴─────────────────────────┤
//   │ 보유 부동산 5×2 (이름 뱃지+시세)   │
//   └──────────────────────────────────┘
//
// 핵심: 보유 부동산이 화면의 절반 이상. 권리증 진짜 5×2로 채움 (h-full).
// 캐릭터: 액자 X, 투명 일러스트 (object-contain, 클리핑 0).

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AssetFrame from '@/components/AssetFrame.jsx';
import PropertyDeedMini from '@/components/PropertyDeedMini.jsx';
import { useGameStore } from '@/stores/gameStore.js';
import charactersData from '@/data/characters.json';
import koreaBoard from '@/boards/korea.json';
import { quickWorth } from '@/engine/gameState.js';
import { apartmentPassiveIncome, countApartments } from '@/engine/rules.js';
import { CREDIT_INTEREST_PER_TURN } from '@/engine/constants.js';
import { cn } from '@/lib/cn.js';

const CHAR_META = Object.fromEntries(charactersData.korea.map((c) => [c.id, c]));
const displayPlayerName = (player, fallback) => {
  const name = player?.name?.trim();
  return name && name !== player?.character ? name : fallback;
};
const PROP_TILES = koreaBoard.tiles.filter((t) => t.type === 'property');
const fmt = (n) => (n ?? 0).toLocaleString('ko-KR');

// 패시브 3종 (cards.js 동기 — id 1/3/4)
const PASSIVE_SLOTS = [
  { id: 1, name: '결혼', emoji: '💍', delta: 50 },
  { id: 3, name: '승진', emoji: '📈', delta: 30 },
  { id: 4, name: '창업', emoji: '🚀', delta: 70 },
];

const OWNED_SLOTS = 10;
const BASE_SALARY = 200; // GO 통과 기본 월급
const INFLATION_RATE = 4; // % per year (constant per spec)

// 생활비 단계 (BRAINSTORM_LOG.md § 6-0)
function getLivingCost(totalWorth) {
  if (totalWorth >= 5000) return 30;
  if (totalWorth >= 2000) return 20;
  return 10;
}

function getOwnedPositions(state, playerId) {
  const out = [];
  for (const tile of PROP_TILES) {
    if (state.tileState[tile.pos]?.owner === playerId) out.push(tile.pos);
  }
  return out;
}

// salaryBonus 합으로 활성 패시브 추정
function getActivePassives(player) {
  if (Array.isArray(player.activatedPassives)) {
    return new Set(player.activatedPassives);
  }
  let remain = player.salaryBonus ?? 0;
  if (remain <= 0) return new Set();
  const ordered = [...PASSIVE_SLOTS].sort((a, b) => b.delta - a.delta);
  const active = new Set();
  for (const p of ordered) {
    if (remain >= p.delta) {
      active.add(p.id);
      remain -= p.delta;
    }
  }
  return active;
}

export default function CurrentPlayerStage({
  player,
  index,
  state,
  hostLine,
  year,
  loanRate,
  onExit,
  compact = false,
}) {
  if (!player) return null;
  const baseMeta = CHAR_META[player.character] ?? { name: player.character, color: '#666', slot: null };
  // 사용자가 셋업에서 입력한 이름 우선 (없으면 캐릭터 기본 이름)
  const meta = {
    ...baseMeta,
    name: displayPlayerName(player, baseMeta.name),
  };
  const owned = getOwnedPositions(state, index);
  const totalWorth = quickWorth(state, index);
  const livingCost = getLivingCost(totalWorth);
  const activePassives = getActivePassives(player);
  const totalSalary = BASE_SALARY + (player.salaryBonus ?? 0);
  const aptCount = countApartments(state, index);
  const aptIncome = apartmentPassiveIncome(state, index);

  // 턴 변경 배너 — turnIndex 바뀌면 1.5s 동안 큰 팝업 표시
  const [turnAnnounce, setTurnAnnounce] = useState(false);
  const prevIndexRef = useRef(index);
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => {
    if (prevIndexRef.current !== index) {
      setTurnAnnounce(true);
      const t = setTimeout(() => setTurnAnnounce(false), 1500);
      prevIndexRef.current = index;
      return () => clearTimeout(t);
    }
  }, [index]);
  const openModal = useGameStore((s) => s.openPropertyModal);
  const saveGame = useGameStore((s) => s.save);
  const resetGame = useGameStore((s) => s.resetGame);
  const addToast = useGameStore((s) => s.addToast);

  const handleQuitGame = () => {
    saveGame?.();
    addToast?.({ message: '게임 저장 후 나갑니다', tone: 'success' });
    setSettingsOpen(false);
    setTimeout(() => onExit?.(), 650);
  };

  const handleRestartGame = () => {
    addToast?.({ message: '새 게임을 준비합니다', tone: 'warn' });
    setSettingsOpen(false);
    setTimeout(() => {
      resetGame?.();
      onExit?.();
    }, 650);
  };

  // 쉬는 턴 — 감옥 / 군복무(skipTurns) 시 전체 grayscale + 사유 배지
  const isSkipping = !!player.inJail || (player.skipTurns ?? 0) > 0;
  const skipReason = player.inJail
    ? { emoji: '🚓', label: '감옥', turns: player.jailTurns ?? 0, tone: 'red' }
    : (player.skipTurns ?? 0) > 0
      ? { emoji: '🪖', label: '군복무', turns: player.skipTurns ?? 0, tone: 'amber' }
      : null;

  return (
    <>
    {/* === 턴 변경 배너 (Portal, 1.5초 화면 가운데 팝) === */}
    {createPortal(
      <AnimatePresence>
        {turnAnnounce && (
          <motion.div
            key={`turn-${index}`}
            initial={{ opacity: 0, scale: 0.6, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.15, y: 30 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center"
          >
            <div
              className="flex items-center gap-4 rounded-2xl border-[5px] border-ink-line bg-parchment-50 px-10 py-5"
              style={{
                boxShadow: `0 8px 0 0 #0F0C0A, 0 0 0 6px ${meta.color}cc, 0 0 0 14px ${meta.color}55, 0 0 60px 12px ${meta.color}aa, 0 24px 50px -8px rgba(0,0,0,0.6)`,
              }}
            >
              {/* 캐릭터 미니 */}
              {meta.slot && (
                <AssetFrame
                  slot={meta.slot}
                  transparent
                  className="h-20 w-20 shrink-0 drop-shadow-[0_4px_0_rgba(15,12,10,0.3)]"
                />
              )}
              {/* P# 뱃지 + 이름 + 차례! — 한 줄 */}
              <span
                className="rounded-md border-2 border-ink-line px-2.5 py-1 font-display text-[18px] font-extrabold uppercase tracking-[0.2em] text-white shadow-[0_2px_0_0_#0F0C0A]"
                style={{ backgroundColor: meta.color }}
              >
                {index + 1}P
              </span>
              <h2 className="font-board font-extrabold text-[42px] leading-none text-ink whitespace-nowrap">
                {meta.name}
              </h2>
              <span className="font-board font-extrabold text-[32px] leading-none whitespace-nowrap" style={{ color: meta.color }}>
                차례!
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    )}

    <section
      className={cn(
        'relative grid flex-1 min-h-0 grid-cols-[1fr_300px] overflow-hidden rounded-md border-2 border-ink-line bg-parchment-50 md:grid-cols-[1fr_340px]',
        isSkipping && 'grayscale',
      )}
      style={{
        // 캐릭터 컬러 글로우 — 섹션 전체 테두리 감쌈 (좌측 |색띠 대체)
        boxShadow: `0 4px 0 0 #0F0C0A, 0 0 0 3px ${meta.color}cc, 0 0 0 7px ${meta.color}55, 0 0 28px 4px ${meta.color}88`,
      }}
      data-component="CurrentPlayerStage"
    >
      {/* 쉬는 턴 사유 배지 — 우상단 큼직 (grayscale 위에서도 컬러 유지하려 backdrop layer로) */}
      {skipReason && (
        <div className="pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2" style={{ filter: 'grayscale(0)' }}>
          <div
            className={cn(
              'flex items-center gap-2 rounded-md border-[3px] border-ink-line px-3 py-1.5 shadow-[0_3px_0_0_#0F0C0A,0_6px_14px_-2px_rgba(0,0,0,0.45)]',
              skipReason.tone === 'red'
                ? 'bg-monopoly-red text-white'
                : 'bg-monopoly-gold text-ink',
            )}
          >
            <span className="text-[18px] leading-none">{skipReason.emoji}</span>
            <span className="font-display text-[13px] font-extrabold uppercase tracking-[0.2em]">
              {skipReason.label}
            </span>
            <span className="rounded-sm border-2 border-ink-line bg-parchment-50 px-1.5 py-0.5 font-display text-[12px] font-extrabold tabular-nums text-ink">
              {skipReason.turns}턴
            </span>
            <span className="font-display text-[10px] font-bold uppercase tracking-widest opacity-90">
              · 쉬는 중
            </span>
          </div>
        </div>
      )}

      {/* 좌측 색띠 제거 — 섹션 boxShadow 글로우로 대체됨 */}

      {/* ╔═══════ 좌측 컬럼: 플레이어 정보 + 보유 부동산 ═══════╗ */}
      <div className="flex min-w-0 flex-col">

      {/* === TOP: 캐릭터 + 상태 보드 (2 컬럼) — 다이어트 적용 === */}
      <div className="relative grid grid-cols-[auto_1fr] gap-2.5 border-b-2 border-ink-line bg-parchment-100/40 pl-4 pr-16 py-1.5 md:gap-3 md:py-2">
        <div className="absolute right-3 top-3 z-[70]">
          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            className="inline-grid h-[42px] w-[42px] place-items-center rounded-md border-2 border-ink-line bg-parchment-100 font-display text-[18px] font-extrabold text-ink shadow-[0_3px_0_0_#0F0C0A] transition hover:bg-monopoly-gold/35 active:translate-y-px"
            title="게임 메뉴"
            aria-label="게임 메뉴"
          >
            ⚙
          </button>
          <AnimatePresence>
            {settingsOpen && (
              <motion.div
                initial={{ y: -6, opacity: 0, scale: 0.96 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -4, opacity: 0, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 430, damping: 30 }}
                className="absolute right-0 top-[calc(100%+8px)] z-[80] w-48 overflow-hidden rounded-md border-2 border-ink-line bg-parchment-50 shadow-[0_4px_0_0_#0F0C0A,0_12px_24px_-8px_rgba(0,0,0,0.6)]"
              >
                <div className="border-b-2 border-ink-line bg-parchment-100 px-3 py-2 font-display text-[9px] font-extrabold uppercase tracking-[0.2em] text-ink/60">
                  게임 메뉴
                </div>
                <button
                  type="button"
                  onClick={handleQuitGame}
                  className="block w-full border-b border-ink-line/20 px-3 py-2.5 text-left font-display text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink transition hover:bg-emerald-100"
                >
                  게임 그만하기
                </button>
                <button
                  type="button"
                  onClick={handleRestartGame}
                  className="block w-full px-3 py-2.5 text-left font-display text-[11px] font-extrabold uppercase tracking-[0.14em] text-monopoly-deep transition hover:bg-red-100"
                >
                  새로 시작하기
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* 투명 캐릭터 — 액자 X, 클리핑 0 */}
        <motion.div
          key={player.character + index}
          initial={{ scale: 0.92, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="shrink-0 self-end"
        >
          {meta.slot ? (
            <div
              className={cn(
                'rounded-full p-1 ring-2 ring-monopoly-gold/85 drop-shadow-[0_0_14px_rgba(255,193,7,0.42)]',
                'shadow-[0_0_0_3px_rgba(255,213,79,0.22)]',
              )}
            >
              <AssetFrame
                slot={meta.slot}
                transparent
                className={cn(
                  compact ? 'w-16' : 'w-20 md:w-24',
                  // 입상 그림자 — 사회자와 동일 결 (검정 미세 그림자 + 약한 발치 흐림)
                  'mx-auto -translate-y-1 scale-[0.92] drop-shadow-[0_4px_0_rgba(15,12,10,0.22)] drop-shadow-[0_8px_10px_rgba(0,0,0,0.25)]',
                )}
              />
            </div>
          ) : (
            <div
              className={cn(
                'flex items-center justify-center rounded-full ring-2 ring-monopoly-gold/85 drop-shadow-[0_0_14px_rgba(255,193,7,0.42)] text-5xl',
                compact ? 'h-16 w-16' : 'h-24 w-24',
              )}
            >
              {meta.emoji ?? '🎭'}
            </div>
          )}
        </motion.div>

        {/* 이름 + STATUS BOARD — 캐릭터 머리 선상으로 위쪽 정렬 */}
        <div className="min-w-0 flex flex-col gap-3 self-start">
          {/* 이름 헤더 — 이름 + 총자산 + 글로벌 칩(년차/인플레/대출) */}
          <div className="flex items-center gap-2">
            <span
              className="rounded-md border-2 border-ink-line px-2 py-1 font-display text-[14px] font-extrabold uppercase tracking-[0.16em] text-white shadow-[0_2px_0_0_#0F0C0A]"
              style={{ backgroundColor: meta.color }}
            >
              {index + 1}P
            </span>
            <h2
              className={cn(
                'font-board font-extrabold leading-none text-ink',
                compact ? 'text-[24px]' : 'text-[30px]',
              )}
            >
              {meta.name}
            </h2>
            {/* 총자산 명찰 — 인플레이션/대출이자 칩과 완전 동일 사이즈 */}
            <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-md border-2 border-ink-line bg-monopoly-gold/40 px-3 py-2 font-display font-bold tabular-nums text-ink shadow-[0_3px_0_0_#0F0C0A]">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">
                총자산
              </span>
              <span className="text-[12px] font-bold opacity-40">:</span>
              <span className="text-[15px] font-extrabold leading-none">
                {fmt(totalWorth)}
                <span className="ml-0.5 text-[10px] font-semibold opacity-70">만</span>
              </span>
            </span>

            {/* 글로벌 칩 — 총자산 우측 (1줄 가로, 같은 결) */}
            <div className="hidden items-stretch gap-1 md:flex">
              {/* 년차 — `0년차` 단순 결합 */}
              <span className="inline-flex items-center whitespace-nowrap rounded-md border-2 border-ink-line bg-parchment-100 px-3 py-2 font-display font-bold tabular-nums text-ink shadow-[0_3px_0_0_#0F0C0A]">
                <span className="text-[15px] font-extrabold leading-none">{year ?? 1}</span>
                <span className="ml-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">
                  년차
                </span>
              </span>
              {/* 대출이자 : 4% */}
              <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-md border-2 border-monopoly-deep bg-amber-100 px-3 py-2 font-display font-bold tabular-nums text-monopoly-deep shadow-[0_3px_0_0_#0F0C0A]">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">
                  대출이자
                </span>
                <span className="text-[12px] font-bold opacity-40">:</span>
                <span className="text-[15px] font-extrabold leading-none">
                  {Math.round((loanRate ?? 0.02) * 100)}
                  <span className="ml-0.5 text-[10px] font-semibold opacity-70">%</span>
                </span>
              </span>
              {/* 인플레이션 : 4% */}
              <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-md border-2 border-emerald-700 bg-emerald-100 px-3 py-2 font-display font-bold tabular-nums text-emerald-900 shadow-[0_3px_0_0_#0F0C0A]">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">
                  인플레이션
                </span>
                <span className="text-[12px] font-bold opacity-40">:</span>
                <span className="text-[15px] font-extrabold leading-none">
                  +{INFLATION_RATE}
                  <span className="ml-0.5 text-[10px] font-semibold opacity-70">%</span>
                </span>
              </span>
            </div>
          </div>

          {/* 신용대출 sub-row — 대출이자 칩 아래 들여쓰기 (creditDebt > 0 일 때만) */}
          {(player.creditDebt ?? 0) > 0 && (
            <div className="-mt-2 flex items-center justify-end gap-1 pr-12 font-display text-[10px] font-bold tabular-nums">
              <span className="text-ink/35">└</span>
              <span className="text-ink/65">신용대출 :</span>
              <span className="text-monopoly-deep">{fmt(player.creditDebt)}만원</span>
              <span className="text-ink/25">:</span>
              <span className="text-monopoly-deep">+{CREDIT_INTEREST_PER_TURN}만 이자/턴</span>
            </div>
          )}

          {/* === 잔고 + 패시브/매턴 — 한 줄에 가로 나열 === */}
          <div className="flex flex-wrap items-stretch gap-2 self-start">
            <AnimatePresence mode="popLayout">
                <motion.div
                  key={player.cash ?? 0}
                  initial={{ y: -4, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 4, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                  className="inline-flex items-baseline gap-1.5 rounded-md border-2 border-emerald-700 bg-emerald-100 px-3 py-1.5 shadow-[0_3px_0_0_#0F0C0A]"
                >
                  <span className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-900/75">
                    잔고
                  </span>
                  <span className="text-[18px] leading-none">💰</span>
                  <span
                    className={cn(
                      'font-display font-extrabold leading-none text-emerald-800 tabular-nums',
                      compact ? 'text-[22px]' : 'text-[26px] md:text-[30px]',
                    )}
                    style={{ letterSpacing: '-0.01em' }}
                  >
                    {fmt(player.cash ?? 0)}
                  </span>
                  <span className="font-display text-[11px] font-bold uppercase tracking-widest text-emerald-900/70">
                    만
                  </span>
                </motion.div>
              </AnimatePresence>

              {/* === STATUS BOARD — 잔고 옆에 가로 나열 === */}
              <StatusBoard
                activePassives={activePassives}
                totalSalary={totalSalary}
                livingCost={livingCost}
                player={player}
                aptCount={aptCount}
                aptIncome={aptIncome}
              />
            </div>
          </div>
        </div>

      {/* === BOTTOM: 보유 부동산 5×2 (10장) === */}
      <div className="flex flex-1 min-h-0 flex-col px-3 py-2.5 pl-4 md:px-4 md:py-3">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-ink">
            보유 부동산
            <span className="ml-1.5 font-semibold text-ink/40 tabular-nums">
              {owned.length}{owned.length > OWNED_SLOTS ? `/${owned.length}` : ` / ${OWNED_SLOTS}`}
            </span>
          </span>
          <span className="font-display text-[9px] font-semibold uppercase tracking-wider text-ink/40">
            카드 클릭 → 권리증 / 거래 / 건설
          </span>
        </div>

        {/* 권리증 mini 5×2 (10장) */}
        <div className="grid flex-1 min-h-[120px] grid-cols-5 grid-rows-2 gap-2 md:gap-2.5">
          {Array.from({ length: OWNED_SLOTS }).map((_, idx) => {
            const pos = owned[idx];
            if (pos == null) return <EmptyDeed key={`empty-${idx}`} />;
            return (
              <button
                key={pos}
                type="button"
                onClick={() => openModal(pos, index)}
                className="block h-full min-h-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-monopoly-red"
              >
                <PropertyDeedMini pos={pos} />
              </button>
            );
          })}
        </div>

        {owned.length > OWNED_SLOTS && (
          <div className="mt-1 text-right font-display text-[9px] font-semibold uppercase tracking-wider text-ink/50">
            +{owned.length - OWNED_SLOTS} 더 보유 (가로 스크롤 미구현)
          </div>
        )}
      </div>

      {/* ╚═══════ 좌측 컬럼 끝 ═══════╝ */}
      </div>

      {/* ╔═══════ 우측 컬럼: 사회자 영역 — 카드 한 장 크기 NPC + 가슴팍 사회자 뱃지 ═══════╗ */}
      {/* 좌측 ink-line 분할선 제거 — 부드러운 그라데이션 양피지로 자연스럽게 이어짐 */}
      <aside
        className="flex flex-col gap-2 p-3 md:gap-2.5 md:p-3.5"
        style={{
          background: 'linear-gradient(90deg, rgba(15,12,10,0.06) 0%, rgba(15,12,10,0.02) 8%, transparent 100%)',
        }}
      >
        <div className="relative flex flex-1 min-h-0 flex-col items-center gap-2 overflow-hidden rounded-md border-2 border-ink-line bg-parchment-50 p-3 shadow-deed-flat">
          {/* 멘트 — 상단 */}
          {hostLine && (
            <p
              className={cn(
                'shrink-0 text-center font-board leading-snug text-ink',
                compact ? 'text-[12px]' : 'text-[13px] md:text-[14px]',
              )}
            >
              {hostLine}
            </p>
          )}

          {/* 카드 한 장 크기 NPC + 가슴팍 사회자 뱃지 (국회의원 배지 결) */}
          <div className="relative my-auto w-full max-w-[180px]">
            <AssetFrame
              slot="npc.realtor"
              framed="classic"
              rounded="rounded-md"
              className="w-full"
            />
            {/* 사회자 뱃지 — 가슴팍 (이미지 중앙·세로 ~62%) 핀 박은 듯 */}
            <span
              className="pointer-events-none absolute left-1/2 top-[62%] -translate-x-1/2 -rotate-2 whitespace-nowrap rounded-sm border-2 border-ink-line bg-monopoly-red px-2 py-0.5 font-display text-[10px] font-extrabold uppercase tracking-[0.18em] text-white shadow-[0_2px_0_0_#0F0C0A,0_4px_8px_-2px_rgba(0,0,0,0.4)]"
              aria-hidden="true"
            >
              <span className="mr-1 text-[8px]">★</span>
              사회자
            </span>
          </div>
        </div>
      </aside>
    </section>
    </>
  );
}

// =====================================================
// STATUS BOARD — 패시브 + 매턴 +/- + 상태
// =====================================================
function StatusBoard({ activePassives, totalSalary, livingCost, player, aptCount = 0, aptIncome = 0 }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
      {/* 패시브 슬롯 + 총 월급 */}
      <Group label="패시브">
        {PASSIVE_SLOTS.map((p) => (
          <PassiveChip key={p.id} passive={p} active={activePassives.has(p.id)} />
        ))}
        {/* 화살표 — 패시브 → 월급 인과 표시 */}
        <span className="font-display text-[12px] font-bold leading-none text-ink/40">→</span>
        {/* 총 월급 — 단순 1칩 */}
        <span className="inline-flex items-baseline gap-1 rounded-sm border-2 border-emerald-700 bg-emerald-100 px-2 py-0.5 font-display text-[11px] font-bold tabular-nums shadow-[0_1.5px_0_0_#0F0C0A]">
          <span className="text-emerald-900/65">월급</span>
          <span className="font-extrabold text-emerald-900">+{totalSalary}만</span>
        </span>
      </Group>

      {/* 매턴 변동 */}
      <Group label="매턴">
        <span className="rounded-sm border-2 border-monopoly-deep bg-amber-100 px-1.5 py-0.5 font-display text-[10px] font-bold tabular-nums text-monopoly-deep">
          -{livingCost}만 생활비
        </span>
        {player.creditDebt > 0 && (
          <span className="rounded-sm border-2 border-monopoly-deep bg-amber-100 px-1.5 py-0.5 font-display text-[10px] font-bold tabular-nums text-monopoly-deep">
            -10만 신용이자
          </span>
        )}
        {/* 아파트 누진 인컴 — BRAINSTORM 7-2 */}
        {aptIncome > 0 && (
          <span
            className="inline-flex items-baseline gap-0.5 rounded-sm border-2 border-emerald-700 bg-emerald-100 px-1.5 py-0.5 font-display text-[10px] font-bold tabular-nums text-emerald-900 shadow-[0_1.5px_0_0_#0F0C0A]"
            title={`아파트 ${aptCount}채 누진 인컴`}
          >
            <span>+{aptIncome}만</span>
            <span className="text-[8.5px] opacity-70">🏢×{aptCount}</span>
          </span>
        )}
      </Group>

      {/* 상태 */}
      <StatusBadges player={player} />
    </div>
  );
}

function PassiveChip({ passive, active }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border-2 px-2.5 py-1',
        active
          ? 'border-ink-line text-ink shadow-[0_2px_0_0_#0F0C0A,0_0_12px_rgba(251,191,36,0.42)]'
          : 'border-dashed border-ink/25 text-ink/35 shadow-[inset_0_1px_3px_rgba(15,12,10,0.12)]',
      )}
      style={{
        background: active
          ? 'radial-gradient(circle at 35% 25%, rgba(255,255,255,0.72) 0%, rgba(251,191,36,0.86) 34%, rgba(181,116,28,0.9) 100%)'
          : 'radial-gradient(circle at 35% 25%, rgba(255,255,255,0.55) 0%, rgba(226,218,198,0.7) 42%, rgba(135,124,108,0.36) 100%)',
      }}
      title={`${passive.name} — 발동 시 월급 +${passive.delta}만 영구`}
    >
      <span
        className={cn(
          'grid h-6 w-6 place-items-center rounded-full border border-ink-line/40 text-[13px] leading-none',
          active ? 'bg-white/30' : 'bg-white/20 opacity-45 grayscale',
        )}
      >
        {active ? passive.emoji : '🔒'}
      </span>
      <span
        className={cn(
          'font-display text-[10px] font-bold uppercase tracking-wider leading-none',
          active ? 'text-ink' : 'text-ink/40',
        )}
      >
        {passive.name}
      </span>
      <span
        className={cn(
          'font-display text-[10px] font-extrabold tabular-nums leading-none',
          active ? 'text-monopoly-deep' : 'text-ink/35',
        )}
      >
        +{passive.delta}만
      </span>
    </span>
  );
}

function Group({ label, children }) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="font-display text-[8px] font-bold uppercase tracking-[0.22em] text-ink/55">
        {label}
      </span>
      {children}
    </div>
  );
}

function StatusBadges({ player }) {
  const items = [];
  if (player.inJail) items.push({ tone: 'red', text: `🚓 감옥 ${player.jailTurns ?? 0}턴` });
  if (player.skipTurns > 0) items.push({ tone: 'amber', text: `🪖 군복무 ${player.skipTurns}턴` });
  if (player.creditDebt > 0) items.push({ tone: 'amber', text: `💳 신용 ${fmt(player.creditDebt)}만` });
  if (player.loansharkDebt > 0) items.push({ tone: 'red', text: `🦈 사채 ${fmt(player.loansharkDebt)}만` });
  if (player.bankrupt) items.push({ tone: 'black', text: '파산' });
  if (items.length === 0) return null;

  const toneCls = {
    amber: 'border-monopoly-gold bg-amber-100 text-amber-900',
    red: 'border-monopoly-deep bg-red-100 text-monopoly-deep',
    black: 'border-ink-line bg-ink text-white',
  };

  return (
    <Group label="상태">
      {items.map((it, i) => (
        <span
          key={i}
          className={cn(
            'inline-flex rounded-sm border-2 px-1.5 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider',
            toneCls[it.tone],
          )}
        >
          {it.text}
        </span>
      ))}
    </Group>
  );
}

// === 빈 부동산 슬롯 — 점선만, ghost 아이콘 (텍스트 X) ===
function GlobalChip({ label, value, unit, tone = 'neutral' }) {
  const toneCls = {
    neutral: 'bg-parchment-100 text-ink',
    green: 'bg-emerald-100 text-emerald-900 border-emerald-700',
    red: 'bg-amber-100 text-monopoly-deep border-monopoly-deep',
  }[tone];
  return (
    <div
      className={cn(
        'flex min-w-[56px] flex-col items-center justify-center rounded-md border-2 border-ink-line px-2.5 py-1 shadow-[0_3px_0_0_#0F0C0A]',
        toneCls,
      )}
    >
      <span className="font-display text-[8px] font-semibold uppercase tracking-[0.2em] opacity-65">
        {label}
      </span>
      <span className="font-display text-[15px] font-extrabold leading-none tabular-nums">
        {value}
        <span className="ml-0.5 text-[9px] font-semibold opacity-65">{unit}</span>
      </span>
    </div>
  );
}

function EmptyDeed() {
  return (
    <div
      className="flex h-full w-full items-center justify-center rounded-md border-2 border-dashed border-ink/15 bg-parchment-100/30 text-ink/15"
      aria-hidden="true"
    >
      <span className="text-2xl opacity-50">🏠</span>
    </div>
  );
}
