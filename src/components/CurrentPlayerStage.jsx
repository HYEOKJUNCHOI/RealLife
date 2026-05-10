// 중앙 스테이지 — 현재 차례 플레이어
//
// 레이아웃:
//   상단: 플레이어 + 잔고 + 주요 상태 칩
//   본문: 보유 부동산 카드 4x2
//   우측: 사회자 멘트와 진행자 일러스트

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import AssetFrame from '@/components/AssetFrame.jsx';
import PropertyDeedMini from '@/components/PropertyDeedMini.jsx';
import AnimatedCash from '@/components/AnimatedCash.jsx';
import CashDeltaFloat from '@/components/CashDeltaFloat.jsx';
import CardArtwork from '@/components/CardArtwork.jsx';
import { useGameStore } from '@/stores/gameStore.js';
import charactersData from '@/data/characters.json';
import koreaBoard from '@/boards/korea.json';
import { CREDIT_INTEREST_PER_TURN, GAME_DURATION_MIN, JAIL_TURNS, LOANSHARK_INTEREST_PER_TURN, STATION_RATE_BY_YEAR, UTILITY_DOUBLE_BONUS, UTILITY_RATE_BY_YEAR } from '@/engine/constants.js';
import { quickWorth } from '@/engine/gameState.js';
import { calculateMortgageInterest } from '@/engine/loan.js';
import { apartmentPassiveIncome, countApartments } from '@/engine/rules.js';
import { cn } from '@/lib/cn.js';
import { getCharacterImg } from '@/lib/assets.js';

const CHAR_META = Object.fromEntries(charactersData.korea.map((c) => [c.id, c]));
const displayPlayerName = (player, fallback) => {
  const name = player?.name?.trim();
  return name && name !== player?.character ? name : fallback;
};
const PROP_TILES = koreaBoard.tiles.filter((t) => t.type === 'property');
const fmt = (n) => (n ?? 0).toLocaleString('ko-KR');
const fmtClock = (minutes) => {
  const totalSeconds = Math.max(0, Math.round((minutes ?? 0) * 60));
  const mm = Math.floor(totalSeconds / 60);
  const ss = String(totalSeconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
};

// 패시브 3종 (cards.js id 1/3/4)
const PASSIVE_SLOTS = [
  { id: 1, name: '\uACB0\uD63C', emoji: '\u{1F48D}', delta: 30 },
  { id: 3, name: '\uC774\uC9C1', emoji: '\u{1F4BC}', delta: 50 },
  { id: 4, name: '\uCC3D\uC5C5', emoji: '\u{1F680}', delta: 50 },
];

const OWNED_SLOTS = 8;
const BASE_SALARY = 200; // GO 통과 기본 월급
const INFLATION_RATE = 4; // % per year (constant per spec)

const TOY_BUTTON_SHADOW = [
  'inset 0 3px 3px rgba(255,255,255,0.78)',
  'inset 0 -4px 5px rgba(0,0,0,0.12)',
  'inset 0 0 0 1px rgba(255,255,255,0.38)',
  '0 3px 0 #0F0C0A',
  '0 7px 10px -7px rgba(0,0,0,0.58)',
].join(', ');

const BUTTON_TONES = {
  paper: { border: '#17120c', color: '#17120c', bg: 'linear-gradient(180deg, #ffffff 0%, #fff8e8 48%, #e5dac5 100%)' },
  gold: { border: '#5d4214', color: '#2b1c08', bg: 'linear-gradient(180deg, #fff6c7 0%, #f2c967 52%, #be8a2e 100%)' },
  amber: { border: '#b3462f', color: '#8b231c', bg: 'linear-gradient(180deg, #fff8e8 0%, #ffd39d 52%, #e58a42 100%)' },
  green: { border: '#087458', color: '#064b3b', bg: 'linear-gradient(180deg, #f0fff6 0%, #9de8c8 52%, #44b990 100%)' },
  red: { border: '#a82424', color: '#8d1d1d', bg: 'linear-gradient(180deg, #fff7ef 0%, #ffc7b0 52%, #e86b54 100%)' },
  blue: { border: '#1d5e9f', color: '#123f6f', bg: 'linear-gradient(180deg, #f2fbff 0%, #b9e6ff 52%, #63afe8 100%)' },
};

const AVATAR_POSITION = {
  yangban: 'center 30%',
  general: '36% 29%',
  magistrate: 'center 26%',
  farmer: 'center 26%',
  chunDooHwan: 'center 18%',
  genghisKhan: 'center 24%',
  steveJobs: 'center 24%',
  billGates: 'center 24%',
  donaldTrump: 'center 22%',
  leeJaeMyung: 'center 22%',
  wakizakaYasuharu: 'center 24%',
  toyotomiHideyoshi: 'center 24%',
};
const AVATAR_SIZE = {
  general: '135%',
  chunDooHwan: '145%',
  genghisKhan: '142%',
  steveJobs: '138%',
  billGates: '138%',
  donaldTrump: '138%',
  leeJaeMyung: '138%',
  wakizakaYasuharu: '140%',
  toyotomiHideyoshi: '140%',
};

const HOST_VARIANTS = ['a', 'b', 'c', 'd'];
const getRandomHostVariant = () => HOST_VARIANTS[Math.floor(Math.random() * HOST_VARIANTS.length)];
// 생활비 단계
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

// salaryBonus 기반으로 활성화된 패시브를 계산한다.
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
  turnBriefing,
  activeEvent,
  onCloseEvent,
  year,
  loanRate,
  onExit,
  onStep,
  onDiceRoll,
  diceLocked,
  onUnlockDice,
  turnResult,
  onOpenResultCard,
  onOpenLoan,
  onOpenBoard,
  pendingPurchase,
  diceMode = 'keypad',
  onDiceModeChange,
  onAppDiceRoll,
  lastDiceRoll,
  onShowNoticeLog,
  hasNoticeLog = false,
  compact = false,
  hideSkipOverlay = false,
  bgmEnabled = false,
  onToggleBgm,
}) {
  if (!player) return null;
  const baseMeta = CHAR_META[player.character] ?? { name: player.character, color: '#666', slot: null };
  // 셋업에서 입력한 이름을 우선 표시한다.
  const meta = {
    ...baseMeta,
    name: displayPlayerName(player, baseMeta.name),
  };
  const characterImg = getCharacterImg(player.character);
  const owned = getOwnedPositions(state, index);
  const totalWorth = quickWorth(state, index);
  const livingCost = getLivingCost(totalWorth);
  const activePassives = getActivePassives(player);
  const totalSalary = BASE_SALARY + (player.salaryBonus ?? 0);
  const aptCount = countApartments(state, index);
  const aptIncome = apartmentPassiveIncome(state, index);
  const stationTiles = (state.board?.tiles ?? []).filter((tile) => tile.type === 'railroad' && tile.subType === 'station' && state.tileState?.[tile.pos]?.owner === index);
  const stationRate = STATION_RATE_BY_YEAR[Math.min(state.year ?? 0, STATION_RATE_BY_YEAR.length - 1)] ?? 0;
  const stationFund = stationTiles.reduce((sum, tile) => sum + (state.tileState?.[tile.pos]?.fund ?? 0), 0);
  const institutionTiles = (state.board?.tiles ?? []).filter((tile) => tile.type === 'utility' && state.tileState?.[tile.pos]?.owner === index);
  const institutionIncome = institutionTiles.reduce((sum, tile) => {
    const ts = state.tileState?.[tile.pos] ?? {};
    const yearsHeld = (state.year ?? 0) - (ts.appointedYear ?? state.year ?? 0);
    const yIdx = Math.min(Math.max(0, yearsHeld), UTILITY_RATE_BY_YEAR.length - 1);
    const base = UTILITY_RATE_BY_YEAR[yIdx] ?? 0;
    return sum + base * (institutionTiles.length === 2 ? UTILITY_DOUBLE_BONUS : 1);
  }, 0);
  const gameTotalMinutes = state.options?.totalGameMinutes ?? GAME_DURATION_MIN;
  const gameRemainingMin = Math.max(0, gameTotalMinutes - (state.elapsedMin ?? 0));
  const isTimerUrgent = gameRemainingMin <= 5 || state.deathmatch;
  const isCashBankrupt = (player.cash ?? 0) <= 0;
  const mortgageDebt = Object.values(state.tileState ?? {}).reduce((sum, ts) => {
    if (ts?.owner !== index || !ts?.mortgaged) return sum;
    return sum + (ts.mortgageAmount ?? 0);
  }, 0);
  const totalDebt = mortgageDebt + (player.creditDebt ?? 0) + (player.loansharkDebt ?? 0);
  const mortgageInterest = calculateMortgageInterest(state, index);
  const creditInterest = (player.creditDebt ?? 0) > 0 ? CREDIT_INTEREST_PER_TURN : 0;
  const loansharkInterest = (player.loansharkDebt ?? 0) > 0 ? LOANSHARK_INTEREST_PER_TURN : 0;
  const loanInterest = mortgageInterest + creditInterest + loansharkInterest;

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hostVariant, setHostVariant] = useState(() => getRandomHostVariant());
  useEffect(() => {
    setHostVariant(getRandomHostVariant());
  }, [index]);

  const openModal = useGameStore((s) => s.openPropertyModal);
  const openLoanModal = useGameStore((s) => s.openLoanModal);
  const saveGame = useGameStore((s) => s.save);
  const restartSameGame = useGameStore((s) => s.restartSameGame);
  const addToast = useGameStore((s) => s.addToast);

  const handleQuitGame = () => {
    saveGame?.();
    addToast?.({ message: '게임을 저장하고 나갑니다.', tone: 'success' });
    setSettingsOpen(false);
    setTimeout(() => onExit?.(), 650);
  };

  const handleRestartGame = () => {
    addToast?.({ message: '같은 멤버로 새 판을 시작합니다.', tone: 'warn' });
    setSettingsOpen(false);
    setTimeout(() => {
      restartSameGame?.();
    }, 650);
  };

  // 쉬는 턴 상태
  const currentTile = state.board?.tiles?.[player.position];
  const currentTileState = state.tileState?.[player.position];
  const pendingOwner = pendingPurchase?.pos != null ? state.tileState?.[pendingPurchase.pos]?.owner : null;
  const hasPendingPurchasePreview = pendingPurchase?.visitorId === index && pendingOwner == null;
  const pendingPreviewSlot = -1;

  const isSkipping = !!player.inJail || (player.skipTurns ?? 0) > 0;
  const jailTurnsRemaining = Math.max(0, JAIL_TURNS - (player.jailTurns ?? 0));
  const skipReason = player.inJail
    ? { icon: '/icons/police-car.svg', emoji: '\uD83D\uDE93', label: '\uAC10\uC625', turns: jailTurnsRemaining, tone: 'red' }
    : (player.skipTurns ?? 0) > 0
      ? { emoji: '\uD83D\uDCA4', label: '\uD734\uC2DD', turns: player.skipTurns ?? 0, tone: 'amber' }
      : null;

  return (
    <>
    {skipReason && !hideSkipOverlay && createPortal(
      <div className="pointer-events-none fixed inset-0 z-[190] flex items-center justify-center">
        <div
          className={cn(
            'flex items-center gap-3 rounded-md border-[4px] border-ink-line px-5 py-3 shadow-[0_5px_0_0_#0F0C0A,0_18px_34px_-16px_rgba(0,0,0,0.72)]',
            skipReason.tone === 'red'
              ? 'bg-monopoly-red text-white'
              : 'bg-monopoly-gold text-ink',
          )}
        >
          {skipReason.icon ? (
            <img
              src={skipReason.icon}
              alt=""
              className="h-12 w-16 shrink-0 object-contain drop-shadow-[0_3px_0_rgba(15,12,10,0.32)]"
              draggable={false}
            />
          ) : (
            <span className="text-[24px] leading-none">{skipReason.emoji}</span>
          )}
          <span className="font-display text-[22px] font-extrabold uppercase tracking-[0.12em]">
            {skipReason.label}
          </span>
          <span className="rounded-sm border-[3px] border-ink-line bg-parchment-50 px-3 py-1.5 font-display text-[18px] font-extrabold tabular-nums text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
            {skipReason.turns}턴 남음
          </span>
          <span className="font-display text-[15px] font-extrabold uppercase tracking-[0.16em] opacity-95">
            쉬는 중
          </span>
        </div>
      </div>,
      document.body
    )}

    <section
      className={cn(
        'relative grid flex-1 min-h-0 grid-cols-[1fr_248px] overflow-hidden rounded-2xl border border-white/65 bg-white/38 backdrop-blur-[18px]',
      )}
      style={{
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.86), 0 18px 42px -30px rgba(36,57,74,0.58)`,
        '--active-player-color': meta.color,
      }}
      data-component="CurrentPlayerStage"
    >
      <div className="active-player-glow-layer pointer-events-none absolute inset-0 z-[75] rounded-lg" aria-hidden="true" />
      {settingsOpen && (
        <div className="absolute right-3 top-14 z-40 w-[190px] rounded-md border-2 border-ink-line bg-parchment-50 p-2 shadow-[0_4px_0_#0F0C0A,0_18px_34px_-18px_rgba(0,0,0,0.75)]">
          <div className="mb-2 border-b border-white/45 pb-1 font-display text-[10px] font-extrabold uppercase tracking-[0.22em] text-ink/55">
            게임 설정
          </div>
          <button
            type="button"
            onClick={handleQuitGame}
            className="mb-2 w-full rounded-md border border-white/70 bg-white/66 px-3 py-2 font-board text-base text-ink shadow-[0_8px_18px_-16px_rgba(36,57,74,0.7)] transition active:translate-y-1 active:shadow-none"
          >
            게임 그만두기
          </button>
          <button
            type="button"
            onClick={handleRestartGame}
            className="mb-2 w-full rounded-md border border-white/70 bg-[#fff0ed]/78 px-3 py-2 font-board text-base text-[#7a332d] shadow-[0_8px_18px_-16px_rgba(122,51,45,0.55)] transition active:translate-y-1 active:shadow-none"
          >
            게임 다시하기
          </button>
          <button
            type="button"
            onClick={onToggleBgm}
            className={cn('w-full rounded-md border-2 border-ink-line px-3 py-2 font-board text-base shadow-[0_8px_18px_-16px_rgba(36,57,74,0.68)] transition active:translate-y-1 active:shadow-none', bgmEnabled ? 'bg-monopoly-gold text-ink' : 'bg-white text-ink')}
          >
            BGM {bgmEnabled ? '끄기' : '켜기'}
          </button>
        </div>
      )}

      {/* 좌측: 플레이어 정보와 보유 부동산 */}
      <div className={cn('flex min-w-0 flex-col', isSkipping && 'grayscale')}>

      {/* 상단 상태 영역 */}
      <div className="relative grid h-[112px] grid-cols-[74px_1fr] gap-2 overflow-visible border-b border-white/45 bg-white/30 backdrop-blur-[14px] px-2.5 py-1.5 pr-[116px]">
        {/* 플레이어 아바타 */}
        <motion.div
          key={player.character + index}
          initial={{ scale: 0.92, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="shrink-0 self-center justify-self-center"
        >
          <div className="relative">
            {isCashBankrupt && (
              <div className="absolute -right-5 -top-3 z-10 -rotate-6 rounded-sm border-2 border-ink-line bg-monopoly-red px-2 py-0.5 font-display text-[11px] font-extrabold tracking-[0.12em] text-white shadow-[0_8px_18px_-16px_rgba(36,57,74,0.68)]">
                파산
              </div>
            )}
          {characterImg ? (
            <div
              className="h-[62px] w-[62px] rounded-full border-2 border-white/70 bg-white/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_10px_22px_-16px_rgba(0,0,0,0.85),0_0_0_3px_rgba(255,255,255,0.22)]"
              style={{
                backgroundImage: 'url(' + characterImg + ')',
                backgroundSize: AVATAR_SIZE[player.character] ?? '155%',
                backgroundPosition: AVATAR_POSITION[player.character] ?? 'center 22%',
                backgroundRepeat: 'no-repeat',
                backgroundColor: meta.color + '22',
                filter: isCashBankrupt ? 'grayscale(1) brightness(0.72)' : undefined,
              }}
              aria-label={meta.name}
            />
          ) : (
            <div className={cn('grid h-[68px] w-[68px] place-items-center rounded-full border-2 border-white/70 bg-white/45 text-4xl shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_10px_22px_-16px_rgba(0,0,0,0.85)]', isCashBankrupt && 'grayscale brightness-75')}>
              {meta.emoji ?? '🎭'}
            </div>
          )}
          </div>
        </motion.div>

        <div className="grid min-w-0 grid-cols-[auto_1fr] gap-x-1.5 gap-y-2 self-center">
          <div className="relative flex min-w-0 items-center gap-1.5 overflow-visible">
            <CashDeltaFloat value={player.cash ?? 0} className="left-[118px] top-[31px]" />
            <span
              className="inline-flex h-[29px] shrink-0 items-center rounded-lg border border-white/55 px-2 font-display text-[12px] font-extrabold uppercase tracking-[0.12em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_8px_16px_-13px_rgba(0,0,0,0.8)]"
              style={{ background: `linear-gradient(180deg, ${meta.color}ee 0%, ${meta.color}ba 100%)` }}
            >
              {index + 1}P
            </span>
            <h2
              data-current-player-deal-target
              className={cn(
                'shrink-0 w-[5.6em] truncate font-board font-extrabold leading-none text-ink',
                compact ? 'text-[19px]' : 'text-[24px]',
                Array.from(meta.name ?? '').length === 3 && 'tracking-[0.28em]',
              )}
              style={{ wordBreak: 'keep-all' }}
            >
              {meta.name}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
              <HeaderChip icon={'\uD83D\uDCC5'} value={`${year ?? 0}\uB144`} tone="paper" size="mini" />
              <HeaderChip icon={'\uD83D\uDCC8'} label={'\uBB3C\uAC00'} value={'+' + INFLATION_RATE} unit="%" tone="blue" size="mini" />
              <HeaderChip
                icon={'\uD83C\uDFE6'}
                label={'\uAE08\uB9AC'}
                value={Math.round((loanRate ?? 0.02) * 100)}
                unit="%"
                tone="red"
                size="mini"
              />
              <StatusBoard
                activePassives={activePassives}
                player={player}
                forceAllPassives
              />
            </div>

          <div className="col-span-2 flex min-w-0 items-center gap-1.5 overflow-visible">
            <FinanceChip totalWorth={totalWorth} cash={player.cash ?? 0} debt={totalDebt} onLoanClick={() => openLoanModal?.(index)} />
            <HeaderChip icon={'\uD83D\uDED2'} label={'\uC0DD\uD65C'} value={'-' + livingCost} unit={'\uB9CC'} tone="red" size="normal" />
            <HeaderChip icon={'\uD83C\uDFE6'} label={'\uC774\uC790'} value={'-' + fmt(loanInterest)} unit={'\uB9CC'} tone="red" size="normal" />
            <RentIncomeChip value={aptIncome || 80} />
            <IncomeBadge icon="🚉" label="역장 적립" value={stationRate * Math.max(stationTiles.length, 4)} sub={`${Math.max(stationTiles.length, 4)}역 · 누적 ${fmt(stationFund || 400)}만`} />
            <IncomeBadge icon="⚡" label="기관 월급" value={institutionIncome || 20} sub={`${Math.max(institutionTiles.length, 2)}곳 보유`} />
          </div>
        </div>

      </div>
      {/* 보유 부동산 */}
      <div className="flex flex-1 min-h-0 flex-col px-3 pb-2 pt-3 pl-3 md:px-3 md:pb-2 md:pt-3">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-ink">{'\uBCF4\uC720 \uBD80\uB3D9\uC0B0'}
            <span className="ml-1.5 font-semibold text-ink/40 tabular-nums">
              {owned.length}{owned.length > OWNED_SLOTS ? `/${owned.length}` : ` / ${OWNED_SLOTS}`}
            </span>
          </span>
          <button
            type="button"
            onClick={onShowNoticeLog}
            disabled={!hasNoticeLog}
            className="rounded-lg border border-white/70 bg-white/54 px-2.5 py-1 font-board text-sm leading-none text-ink shadow-[0_8px_18px_-16px_rgba(36,57,74,0.65)] backdrop-blur-[12px] transition active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-45"
          >
            알림보기
          </button>
        </div>

        {/* 권리증 mini 4x2 */}
        <div className="grid flex-1 min-h-[120px] grid-cols-4 grid-rows-2 gap-2 pt-0.5">
          {Array.from({ length: OWNED_SLOTS }).map((_, idx) => {
            const pos = owned[idx];
            if (pos == null) return <EmptyDeed key={`empty-${idx}`} previewPos={idx === pendingPreviewSlot ? pendingPurchase.pos : null} state={state} onClick={idx === pendingPreviewSlot ? () => openModal(pendingPurchase.pos, index) : undefined} />;
            return (
              <button
                key={pos}
                type="button"
                data-deed-slot={idx}
                data-deed-pos={pos}
                onClick={() => openModal(pos, index)}
                className="relative block h-full min-h-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-monopoly-red"
              >
                <span className="deed-slot-placeholder absolute inset-0" aria-hidden="true">
                  <EmptyDeed />
                </span>
                <span
                  key={`${pos}-${state._lastDeedAdded?.nonce ?? 'base'}`}
                  className={cn(
                    'deed-slot-card relative z-[1] block h-full w-full',
                    state._lastDeedAdded?.playerId === index && state._lastDeedAdded?.pos === pos && 'deed-slot-card-insert',
                  )}
                >
                  <PropertyDeedMini pos={pos} />
                </span>
              </button>
            );
          })}
        </div>

        {owned.length > OWNED_SLOTS && (
          <div className="mt-1 text-right font-display text-[9px] font-semibold uppercase tracking-wider text-ink/50">
            +{owned.length - OWNED_SLOTS} {'\uCD94\uAC00 \uBCF4\uC720'}
          </div>
        )}
      </div>
      </div>

      {/* ?곗륫 移쇰읆: ?대쾲 ??釉뚮━??+ ?ы쉶??*/}

      {/* 우측: 사회자 브리핑 */}
      <aside
        className="flex min-h-0 flex-col p-2.5"
        style={{
          background: 'linear-gradient(90deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.08) 100%)',
        }}
      >
        <div className="relative flex flex-1 min-h-0 flex-col overflow-hidden rounded-2xl border border-white/62 bg-white/34 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_16px_32px_-28px_rgba(36,57,74,0.72)] backdrop-blur-[18px]">
          <div className="w-full shrink-0 rounded-xl border border-white/70 bg-white/50 px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_22px_-18px_rgba(36,57,74,0.7)] backdrop-blur-[14px]">
            <div className="flex items-center justify-between gap-2">
              <div
                className={cn(
                  'flex h-[32px] flex-1 items-center justify-center gap-1.5 rounded-md border border-white/70 px-2 font-display text-[15px] font-extrabold tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_8px_18px_-16px_rgba(36,57,74,0.65)]',
                  isTimerUrgent ? 'bg-monopoly-red text-white' : 'bg-white/88 text-ink',
                )}
                aria-label="남은 게임 시간"
                title={`남은 게임 시간 ${fmtClock(gameRemainingMin)}`}
              >
                <span className="text-[15px] leading-none">⏱</span>
                <span>{fmtClock(gameRemainingMin)}</span>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen((open) => !open)}
                className="grid h-[32px] w-10 shrink-0 place-items-center rounded-lg border border-white/70 bg-white/66 font-display text-[17px] font-extrabold text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_8px_18px_-16px_rgba(36,57,74,0.65)] backdrop-blur-[12px] transition active:translate-y-1 active:shadow-none"
                aria-label="게임 설정"
              >
                ⚙
              </button>
            </div>
          </div>

          <div className="mt-2 w-full shrink-0 rounded-2xl border border-white/70 bg-white/42 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_10px_24px_-20px_rgba(36,57,74,0.7)] backdrop-blur-[14px]">
            <button
              type="button"
              onClick={onOpenBoard}
              disabled={!onOpenBoard}
              className="flex h-[38px] w-full items-center justify-center gap-2 rounded-xl border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(224,244,255,0.72)_100%)] px-3 font-board text-[18px] leading-none text-ink shadow-[0_10px_22px_-18px_rgba(36,57,74,0.72)] backdrop-blur-[12px] transition active:translate-y-1 active:shadow-none disabled:opacity-45"
            >
              <span>🗺️</span>
              <span>보드판</span>
            </button>
          </div>

          <SettlementBubble content={turnBriefing} color={meta.color} playerName={meta.name} />

          <RealDiceTurnPanel
            color={meta.color}
            result={turnResult}
            onDiceRoll={onDiceRoll}
            diceMode={diceMode}
            onDiceModeChange={onDiceModeChange}
            onAppDiceRoll={onAppDiceRoll}
            lastDiceRoll={lastDiceRoll}
            diceLocked={diceLocked}
            onUnlockDice={onUnlockDice}
            onOpenResultCard={onOpenResultCard}
            disabled={hideSkipOverlay}
          />
        </div>
      </aside>
    </section>
    </>
  );
}

const EVENT_SLOT_IMAGES = {
  war: '/cards/event/war.png',
  multihouse: '/cards/event/regulation.png',
  fire: '/cards/event/fire.png',
  bubble: '/cards/event/bubble.png',
  redev: '/cards/event/redevelopment.png',
  gtx: '/cards/event/gtx.png',
  lottery_estate: '/cards/event/subscription.png',
};

function DiceFace({ value = 1, rolling = false, ready = false }) {
  const safeValue = Math.max(1, Math.min(6, value));
  return (
    <motion.div
      className="relative grid h-[78px] w-[78px] place-items-center overflow-visible rounded-[20px]"
      animate={rolling ? { scale: [1, 1.035, 1.01], y: [0, -1, 0] } : { scale: [1.03, 1] }}
      transition={rolling ? { duration: 0.18, ease: 'linear' } : { duration: 0.22, ease: 'easeOut' }}
    >
      {ready ? (
        <span className="select-none text-[58px] leading-none drop-shadow-[0_7px_0_rgba(15,12,10,0.72)]" aria-label="ready dice">🎲</span>
      ) : (
        <img
          key={safeValue}
          src={`/ui/dice-face-${safeValue}.svg`}
          alt={`${safeValue}`}
          draggable={false}
          className="h-full w-full select-none object-contain drop-shadow-[0_8px_0_#0F0C0A]"
        />
      )}
    </motion.div>
  );
}

function RealDiceTurnPanel({ color = '#6fb3ff', result, onDiceRoll, diceMode = 'keypad', onDiceModeChange, onAppDiceRoll, lastDiceRoll, diceLocked, onUnlockDice, onOpenResultCard, disabled }) {
  const nums = Array.from({ length: 12 }, (_, i) => i + 1);
  const resultTitle = result?.title ?? '주사위';
  const resultText = result?.text ?? '굴릴 준비 완료';
  const resultIcon = result?.icon ?? '🎲';
  const isAction = result?.kind === 'buy' || result?.kind === 'card' || result?.kind === 'rent';
  const showCardResult = result?.kind === 'card';
  const isRent = result?.kind === 'rent';
  const isJail = result?.kind === 'jail';
  const showNumberPad = !showCardResult && !isJail;
  const [cardFlipped, setCardFlipped] = useState(false);

  useEffect(() => {
    setCardFlipped(false);
  }, [result?.kind, result?.cardKind, result?.cardId, result?.eventId, result?.text]);

  return (
    <div className="real-dice-panel mt-auto w-full shrink-0 rounded-b-2xl border-t border-white/56 bg-white/34 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-[14px]" style={{ '--player-color': color }}>
      {isJail ? (
        <div className="overflow-hidden rounded-xl border-2 border-ink-line bg-[linear-gradient(135deg,#f1f5f9_0%,#dbeafe_48%,#93c5fd_100%)] p-2 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.76),0_3px_0_#0F0C0A]">
          <div className="rounded-lg border-2 border-ink-line bg-white/88 px-3 py-2 text-center shadow-[0_2px_0_rgba(15,12,10,0.55)]">
            <div className="font-display text-[9px] font-black uppercase tracking-[0.22em] text-blue-800/68">jail break</div>
            <div className="mt-1 font-board text-[20px] leading-none text-ink">{resultTitle}</div>
            {result?.sum != null ? (
              <motion.div
                className="mx-auto mt-2 inline-flex items-center gap-2 rounded-xl border-2 border-ink-line bg-[#fffaf0] px-4 py-2 shadow-[0_10px_22px_-18px_rgba(36,57,74,0.72)]"
                animate={{ scale: result?.released ? [1, 1.08, 1] : [1, 1.03, 1] }}
                transition={{ duration: 0.55, repeat: result?.released ? 2 : 1 }}
              >
                <span className="font-display text-[24px] font-black tabular-nums">{result.d1}</span>
                <span className="text-[16px]">+</span>
                <span className="font-display text-[24px] font-black tabular-nums">{result.d2}</span>
                <span className="text-[16px]">=</span>
                <span className="font-display text-[30px] font-black tabular-nums text-blue-800">{result.sum}</span>
              </motion.div>
            ) : (
              <div className="mx-auto mt-2 rounded-xl border-2 border-ink-line bg-[#fffaf0] px-4 py-2 font-board text-[24px] shadow-[0_10px_22px_-18px_rgba(36,57,74,0.72)]">보석금</div>
            )}
            <div className={cn('mt-2 rounded-lg border-2 px-2 py-1.5 font-board text-[14px] leading-snug', result?.released ? 'border-emerald-800 bg-emerald-50 text-emerald-900' : 'border-red-800 bg-red-50 text-red-900')}>
              {resultText}
            </div>
          </div>
          {diceLocked && onUnlockDice && (
            <button
              type="button"
              onClick={onUnlockDice}
              className="mt-2 h-9 w-full rounded-md border-2 border-ink-line bg-[linear-gradient(180deg,#ffffff_0%,#dff4ff_50%,#6fb3ff_100%)] font-board text-[14px] font-extrabold text-[#15324a] whitespace-nowrap shadow-[0_8px_18px_-16px_rgba(36,57,74,0.68)] active:translate-y-1 active:shadow-none"
            >
              다시 입력
            </button>
          )}
        </div>
      ) : isRent ? (
        <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/50 p-2.5 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.84),0_12px_24px_-20px_rgba(36,57,74,0.72)] backdrop-blur-[14px]">
          <div className="rounded-xl border border-white/75 bg-white/72 px-3 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <div className="font-display text-[9px] font-black uppercase tracking-[0.22em] text-red-700/62">정산 안내</div>
            <div className="mt-1 font-board text-[20px] font-extrabold leading-tight text-ink" style={{ wordBreak: 'keep-all', overflowWrap: 'normal' }}>
              {result?.ownerName ?? '소유자'}님의 {result?.tileName ?? resultTitle}
            </div>
            <div className="mt-2 inline-flex items-center justify-center rounded-full border border-red-200 bg-red-50 px-4 py-1.5 font-board text-[20px] font-extrabold text-red-700 shadow-[0_8px_16px_-14px_rgba(220,38,38,0.72)]">
              -{fmt(result?.amount)}만 지출
            </div>

          </div>
          {diceLocked && onUnlockDice && (
            <button
              type="button"
              onClick={onUnlockDice}
              className="mt-2 h-9 w-full rounded-md border border-white/75 bg-white/72 font-board text-[14px] font-extrabold text-[#15324a] whitespace-nowrap shadow-[0_8px_18px_-16px_rgba(36,57,74,0.68)] active:translate-y-1 active:shadow-none"
            >
              다시 입력
            </button>
          )}
        </div>
      ) : showNumberPad ? (
        <div className="rounded-2xl border border-white/70 bg-white/44 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_10px_24px_-20px_rgba(36,57,74,0.72)] backdrop-blur-[14px]">
          <div className="mb-1.5 grid grid-cols-2 gap-1.5 rounded-xl border border-white/70 bg-white/44 p-1 backdrop-blur-[12px] shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
            <button type="button" onClick={() => onDiceModeChange?.('keypad')} className={cn('h-9 rounded-lg border border-white/70 font-board text-[13px] font-extrabold leading-none shadow-[0_8px_16px_-14px_rgba(36,57,74,0.7)] whitespace-nowrap', diceMode === 'keypad' ? 'bg-white/90 text-[#15324a]' : 'bg-white/36 text-ink/58')} style={diceMode === 'keypad' ? { borderColor: `${color}88`, boxShadow: `0 0 0 1px ${color}33 inset, 0 8px 16px -14px ${color}` } : undefined}>직접 입력</button>
            <button type="button" onClick={() => onDiceModeChange?.('app')} className={cn('h-9 rounded-lg border border-white/70 font-board text-[13px] font-extrabold leading-none shadow-[0_8px_16px_-14px_rgba(36,57,74,0.7)] whitespace-nowrap', diceMode === 'app' ? 'bg-white/90 text-[#15324a]' : 'bg-white/36 text-ink/58')} style={diceMode === 'app' ? { borderColor: `${color}88`, boxShadow: `0 0 0 1px ${color}33 inset, 0 8px 16px -14px ${color}` } : undefined}>주사위</button>
          </div>
          {diceMode === 'app' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-3 rounded-xl border border-white/70 bg-white/42 px-2 py-3 backdrop-blur-[12px] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] [perspective:760px]">
                <DiceFace value={lastDiceRoll?.d1 ?? 1} rolling={lastDiceRoll?.rolling} ready={!lastDiceRoll} />
                <span className="font-display text-[24px] font-black text-ink">+</span>
                <DiceFace value={lastDiceRoll?.d2 ?? 1} rolling={lastDiceRoll?.rolling} ready={!lastDiceRoll} />
              </div>
              <button
                type="button"
                disabled={disabled || diceLocked}
                onClick={onAppDiceRoll}
                className="h-14 w-full rounded-xl border border-white/80 px-2 font-board text-[20px] font-extrabold leading-none text-[#15324a] shadow-[0_12px_24px_-18px_rgba(36,57,74,0.78)] transition active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap"
                style={{ background: `linear-gradient(180deg, rgba(255,255,255,0.98) 0%, ${color}26 100%)`, borderColor: `${color}66` }}
              >
                주사위 굴리기
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-white/70 bg-white/42 p-2 backdrop-blur-[12px] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
              {nums.map((num) => (
                <button
                  key={num}
                  type="button"
                  disabled={disabled || diceLocked}
                  onClick={() => onDiceRoll?.(num)}
                  className="h-[46px] rounded-xl border border-white/80 font-display text-[19px] font-extrabold leading-none text-[#15324a] shadow-[0_10px_22px_-18px_rgba(36,57,74,0.72)] transition active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-45"
                  style={{ background: `linear-gradient(180deg, rgba(255,255,255,0.98) 0%, ${color}18 100%)`, borderColor: `${color}44` }}
                >
                  {num}
                </button>
              ))}
            </div>
          )}
          {diceLocked && onUnlockDice && (
            <button
              type="button"
              onClick={onUnlockDice}
              className="mt-1.5 h-9 w-full rounded-md border-2 border-ink-line bg-[linear-gradient(180deg,#ffffff_0%,#dff4ff_50%,#6fb3ff_100%)] font-board text-[14px] font-extrabold text-[#15324a] whitespace-nowrap shadow-[0_8px_18px_-16px_rgba(36,57,74,0.68)] active:translate-y-1 active:shadow-none"
            >
              다시 입력
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/70 bg-white/44 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_10px_24px_-20px_rgba(36,57,74,0.72)] backdrop-blur-[14px]">
          <button
            type="button"
            onClick={() => setCardFlipped(true)}
            className="block w-full [perspective:900px]"
            title={cardFlipped ? resultTitle : '카드 뒤집기'}
          >
            <motion.div
              initial={{ opacity: 0, y: 8, rotate: -1.5 }}
              animate={{
                opacity: 1,
                y: 0,
                rotate: cardFlipped ? 0 : [-1.5, 1.5, -1, 1, -1.5],
                rotateY: cardFlipped ? 180 : 0,
              }}
              transition={{
                opacity: { duration: 0.18 },
                y: { type: 'spring', stiffness: 250, damping: 22 },
                rotateY: { type: 'spring', stiffness: 230, damping: 24 },
                rotate: cardFlipped ? { duration: 0.18 } : { duration: 0.72, repeat: Infinity, repeatDelay: 0.85 },
              }}
              className="relative h-[218px] rounded-lg [transform-style:preserve-3d]"
            >
              <div className="absolute inset-0 grid place-items-center overflow-hidden rounded-lg border-2 border-ink-line bg-[linear-gradient(135deg,#20324d_0%,#51244b_54%,#d6a94b_100%)] text-white shadow-[0_10px_22px_-18px_rgba(36,57,74,0.72)] [backface-visibility:hidden]">
                <div className="grid h-[132px] w-[100px] place-items-center rounded-xl border-2 border-white/45 bg-white/12 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.24)]">
                  <div>
                    <div className="text-[42px] leading-none">🎴</div>
                    <div className="mt-2 font-board text-[22px] leading-none">카드<br />뒤집기</div>
                    <div className="mt-2 font-display text-[8px] font-black uppercase tracking-[0.18em] text-white/62">tap to reveal</div>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 overflow-hidden rounded-lg border-2 border-ink-line bg-[#fffaf0] text-ink shadow-[0_10px_22px_-18px_rgba(36,57,74,0.72)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
                {result?.cardKind ? (
                  <CardArtwork type={result.cardKind} id={String(result.cardId ?? result.eventId ?? '')} className="absolute inset-0 h-full w-full rounded-none" framed={false} />
                ) : (
                  <div className="absolute inset-0 grid place-items-center bg-[#fffaf0] text-[64px]">{resultIcon}</div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,rgba(15,12,10,0)_0%,rgba(15,12,10,0.78)_30%,rgba(15,12,10,0.92)_100%)] px-3 pb-3 pt-10 text-white">
                  <div className="font-display text-[9px] font-black uppercase tracking-[0.22em] text-white/66">{result?.cardKind ?? 'card'}</div>
                  <div className="mt-0.5 font-board text-[22px] leading-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.7)]">{result?.cardName ?? resultTitle}</div>
                  <div className="mt-1.5 line-clamp-2 font-board text-[13px] leading-snug text-white/88">{result?.revealText ?? '카드 확인 후 정산을 공개합니다.'}</div>
                </div>
              </div>
            </motion.div>
          </button>
          <button
            type="button"
            onClick={() => onOpenResultCard?.(result)}
            disabled={!cardFlipped}
            className="mt-1.5 h-10 w-full rounded-md border-2 border-ink-line bg-[linear-gradient(180deg,#ffffff_0%,#ffe8a8_55%,#f1b84d_100%)] font-board text-[16px] text-ink shadow-[0_8px_18px_-16px_rgba(36,57,74,0.68)] active:translate-y-1 active:shadow-none disabled:opacity-45 disabled:grayscale"
          >
            {cardFlipped ? '카드 확인 · 정산 공개' : '먼저 카드를 뒤집어주세요'}
          </button>
          {diceLocked && onUnlockDice && (
            <button
              type="button"
              onClick={onUnlockDice}
              className="mt-1.5 h-9 w-full rounded-md border-2 border-ink-line bg-[linear-gradient(180deg,#ffffff_0%,#dff4ff_50%,#6fb3ff_100%)] font-board text-[14px] font-extrabold text-[#15324a] whitespace-nowrap shadow-[0_8px_18px_-16px_rgba(36,57,74,0.68)] active:translate-y-1 active:shadow-none"
            >
              다시 입력
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function DiceControl({ onStep, disabled }) {
  return (
    <div className="w-full rounded-xl border-2 border-ink-line bg-[#fffaf0] p-2 shadow-[0_10px_22px_-18px_rgba(36,57,74,0.72)]">
      <div className="grid gap-2">
        <button
          type="button"
          onClick={onStep}
          disabled={disabled}
          className="flex h-[50px] w-full items-center justify-center gap-2 rounded-xl border-2 border-ink-line bg-[linear-gradient(180deg,#ffffff_0%,#ffe8a8_50%,#f1b84d_100%)] px-3 font-board text-[21px] leading-none text-ink shadow-[inset_0_2px_0_rgba(255,255,255,0.85),0_3px_0_#0F0C0A] transition active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-55"
        >
          <span className="text-[25px] leading-none">🎲</span>
          <span>주사위 굴리기</span>
        </button>
        <button
          type="button"
          onClick={onStep}
          disabled={disabled}
          className="flex h-[46px] w-full items-center justify-center gap-2 rounded-xl border-2 border-ink-line bg-[linear-gradient(180deg,#ff7474_0%,#e12d39_58%,#9f1725_100%)] px-3 font-board text-[21px] leading-none text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.35),0_3px_0_#0F0C0A] transition active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-55"
        >
          <span className="font-display text-[24px] leading-none">↻</span>
          <span>턴종료</span>
        </button>
      </div>
    </div>
  );
}

function EventCardSlot({ event, hostLine, onClose }) {
  const src = event ? EVENT_SLOT_IMAGES[event.eventId] : null;
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    setFlipped(false);
  }, [event?.eventId, event]);

  const handleClick = () => {
    if (!event) return;
    if (!flipped) {
      setFlipped(true);
      return;
    }
    onClose?.();
  };

  if (!event) {
    return (
      <div className="flex w-full flex-1 flex-col items-center justify-center gap-2 rounded-[22px] border border-white/72 bg-white/44 p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.86),0_14px_28px_-22px_rgba(36,57,74,0.72)] backdrop-blur-[14px]">
        <div className="grid h-[112px] w-[82px] place-items-center rounded-2xl border border-white/70 bg-[linear-gradient(135deg,#dff4ff_0%,#f7fbff_48%,#e8def8_100%)] text-3xl text-[#334155] shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_10px_22px_-18px_rgba(36,57,74,0.62)]">🎴</div>
        <div className="font-display text-[8px] font-bold uppercase tracking-[0.16em] text-ink/38">card slot</div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="relative grid h-[174px] w-[130px] shrink-0 place-items-center rounded-xl border-2 border-ink-line bg-transparent p-0 shadow-[0_10px_22px_-18px_rgba(36,57,74,0.72)] [perspective:900px]"
      title={flipped ? '카드 닫기' : '카드 뒤집기'}
    >
      <motion.div
        className="relative h-full w-full rounded-[10px] [transform-style:preserve-3d]"
        animate={{ rotateY: flipped ? 180 : 0, x: flipped ? 0 : [0, -1.5, 1.5, -1, 1, 0] }}
        transition={{ rotateY: { type: 'spring', stiffness: 230, damping: 24 }, x: { duration: 0.52, repeat: flipped ? 0 : Infinity, repeatDelay: 1.2 } }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-[10px] border-2 border-ink-line bg-[linear-gradient(135deg,#20324d_0%,#51244b_54%,#d6a94b_100%)] p-2 text-center text-white [backface-visibility:hidden]">
          <div className="grid h-16 w-12 place-items-center rounded-lg border-2 border-white/45 bg-white/12 text-2xl">🎴</div>
          <div className="font-board text-lg leading-none">뒤집기</div>
          <div className="font-display text-[8px] font-bold uppercase tracking-[0.16em] text-white/62">tap to reveal</div>
        </div>
        <div className="absolute inset-0 overflow-hidden rounded-[10px] border-2 border-ink-line bg-[#fffaf0] [backface-visibility:hidden] [transform:rotateY(180deg)]">
          {src ? (
            <img src={src} alt="카드" className="h-full w-full object-cover" draggable={false} />
          ) : (
            <div className="grid h-full w-full place-items-center bg-[#fffaf0] font-board text-lg text-ink/45">카드</div>
          )}
        </div>
      </motion.div>
    </button>
  );
}
function HostSpeechBubble({ content }) {
  if (!content) return null;
  return (
    <div
      className="absolute left-1/2 top-[-82px] z-20 w-[220px] -translate-x-1/2 rounded-[20px] border border-white/75 bg-white/72 px-3 py-2 font-board text-[15px] font-extrabold leading-snug text-[#182a35] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_14px_28px_-22px_rgba(36,57,74,0.78)] backdrop-blur-[14px]"
      style={{ wordBreak: 'keep-all', overflowWrap: 'normal' }}
    >
      {content}
      <span className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b border-r border-white/75 bg-white/72" />
    </div>
  );
}

function SettlementBubble({ content, color = '#6fb3ff', playerName = 'PLAYER' }) {
  if (!content) return null;
  const rows = content.rows ?? [];
  const total = content.total ?? 0;
  const totalSteps = rows.length + (content.event ? 1 : 0) + 1;
  const contentKey = `${content.title ?? ''}|${content.event ?? ''}|${total}|${rows.map((row) => `${row.label}:${row.amount}`).join(';')}`;
  const [visibleSteps, setVisibleSteps] = useState(0);

  useEffect(() => {
    setVisibleSteps(0);
    const timers = Array.from({ length: totalSteps }, (_, index) => (
      window.setTimeout(() => setVisibleSteps(index + 1), 130 + index * 190)
    ));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [totalSteps, contentKey]);

  const showEvent = content.event && visibleSteps > rows.length;
  const showTotal = visibleSteps >= totalSteps;

  return (
    <div className="relative z-10 mt-2 max-h-[28vh] w-full overflow-y-auto rounded-[18px] border border-white/72 bg-white/58 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.86),0_14px_28px_-22px_rgba(36,57,74,0.72)] backdrop-blur-[14px] no-scrollbar" style={{ borderColor: `${color}55`, background: `linear-gradient(180deg, rgba(255,255,255,0.66) 0%, ${color}14 100%)` }}>
      <div className="mb-1.5 flex items-center justify-between border-b border-white/55 pb-1.5">
        <span className="font-display text-[8px] font-black uppercase tracking-[0.2em]" style={{ color }}>{playerName}</span>
        <span className="font-board text-[15px] font-extrabold leading-none text-[#182a35]" style={{ wordBreak: 'keep-all', overflowWrap: 'normal' }}>{content.title ?? '이번 턴 정산'}</span>
      </div>
      <div className="space-y-1 font-board text-[14px] leading-none">
        {rows.length > 0 ? rows.slice(0, visibleSteps).map((row, idx) => (
          <motion.div
            key={`${row.label}-${idx}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between gap-2"
          >
            <span className="truncate text-ink/78">{row.label}</span>
            <span className={cn('tabular-nums', row.amount >= 0 ? 'text-emerald-700' : 'text-monopoly-deep')}>
              {row.amount >= 0 ? '+' : '-'}{fmt(Math.abs(row.amount))}만
            </span>
          </motion.div>
        )) : (
          <div className="text-center text-ink/58">이번 턴 현금 변동 없음</div>
        )}
        {visibleSteps < rows.length && <span className="inline-block h-3 w-1.5 animate-pulse bg-ink/70 align-middle" />}
      </div>
      {showEvent && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 rounded-lg border border-monopoly-deep/35 bg-red-50 px-2 py-1 font-board text-[13px] leading-none text-monopoly-deep"
        >
          🎴 {content.event}
        </motion.div>
      )}
      <div className="mt-2 border-t-2 border-dashed border-ink-line/28 pt-1.5">
        {showTotal ? (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between font-board text-[17px] leading-none">
            <span>최종</span>
            <span className={cn('tabular-nums', total >= 0 ? 'text-emerald-700' : 'text-monopoly-deep')}>
              {total >= 0 ? '+' : '-'}{fmt(Math.abs(total))}만
            </span>
          </motion.div>
        ) : (
          <div className="h-[17px] font-board text-[17px] leading-none text-ink/45">정산 중<span className="animate-pulse">...</span></div>
        )}
      </div>
    </div>
  );
}

// =====================================================
// 상태 보드
// =====================================================
function StatusBoard({ activePassives, player, forceAllPassives = false }) {
  return (
    <div className="flex min-w-0 items-center gap-1 overflow-visible">
      <span className="inline-flex h-[32px] shrink-0 items-center rounded-[9px] border-2 border-emerald-700 bg-emerald-50/80 px-1.5 font-display text-[9px] font-bold leading-none text-emerald-950 shadow-[inset_0_2px_0_rgba(255,255,255,0.62),0_2px_0_#0F0C0A]">
        <span className="mr-1 whitespace-nowrap text-[8px] font-extrabold text-emerald-950/70">패시브</span>
        {PASSIVE_SLOTS.map((p, i) => (
          <PassiveChip key={p.id} passive={p} active={forceAllPassives || activePassives.has(p.id)} compact separated={i > 0} />
        ))}
      </span>
      {player.creditDebt > 0 && <MiniBadge text={'\uC2E0\uC6A9 -10'} tone="amber" />}
      <StatusBadges player={player} />
    </div>
  );
}

function FinanceChip({ totalWorth, cash, debt = 0, onLoanClick }) {
  return (
    <span
      className="inline-flex h-[34px] min-w-[316px] shrink-0 items-center justify-center gap-1.5 rounded-[9px] border-2 border-[#8c5b15] bg-[linear-gradient(180deg,#fff8dc_0%,#ffd875_48%,#db9b24_100%)] px-2 font-display text-[11px] font-bold leading-none text-[#4d330c]"
      style={{ boxShadow: TOY_BUTTON_SHADOW }}
    >
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-ink-line/35 bg-white/75 text-[12px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),inset_0_-1px_2px_rgba(0,0,0,0.12)]" aria-hidden="true">
        ₩
      </span>
      <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
        <span className="opacity-75">총자산</span>
        <span className="text-[14px] font-extrabold tabular-nums">{fmt(totalWorth)}<small className="ml-px text-[7px] opacity-70">만</small></span>
      </span>
      <span className="h-4 w-px bg-[#8c5b15]/35" aria-hidden="true" />
      <span className="inline-flex items-baseline gap-1 whitespace-nowrap text-[#075d2b]">
        <span className="opacity-75">예금</span>
        <AnimatedCash value={cash} className="font-display text-[14px] font-extrabold leading-none" />
        <small className="ml-[-2px] text-[7px] opacity-70">만</small>
      </span>
      <span className="h-4 w-px bg-[#8c5b15]/35" aria-hidden="true" />
      <button
        type="button"
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.stopPropagation();
          onLoanClick?.();
        }}
        className="relative z-50 inline-flex cursor-pointer items-baseline gap-1 whitespace-nowrap rounded-md border border-[#8d1d1d]/25 bg-white/18 px-1.5 py-1 text-[#8d1d1d] transition hover:bg-white/45 hover:brightness-110 active:translate-y-0.5"
        title="대출 상담소 열기"
      >
        <span className="opacity-75">대출금</span>
        <span className="text-[14px] font-extrabold tabular-nums">{fmt(debt)}<small className="ml-px text-[7px] opacity-70">만</small></span>
      </button>
    </span>
  );
}

function RentIncomeChip({ value }) {
  return <IncomeBadge icon="🏢" label="아파트 월세" value={value} />;
}

function IncomeBadge({ icon, label, value, sub }) {
  return (
    <span className="inline-flex h-[34px] shrink-0 items-center justify-center gap-1 rounded-[9px] border-2 border-emerald-700 bg-emerald-100 px-2 font-display text-[9px] font-bold leading-none text-emerald-900 shadow-[inset_0_2px_0_rgba(255,255,255,0.62),0_2px_0_#0F0C0A]" title={sub ?? `${label} +${fmt(value)}만`}>
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-ink-line/35 bg-white/75 text-[11px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),inset_0_-1px_2px_rgba(0,0,0,0.12)]" aria-hidden="true">
        {icon}
      </span>
      <span className="inline-flex flex-col gap-0.5 whitespace-nowrap">
        <span className="opacity-80">{label} <b className="tabular-nums">+{fmt(value)}만</b></span>
        {sub && <span className="text-[7px] leading-none text-emerald-900/58">{sub}</span>}
      </span>
    </span>
  );
}

function HeaderChip({ label, value, unit, tone = 'paper', icon, size = 'normal', subValue = null }) {
  const toneStyle = BUTTON_TONES[tone] ?? BUTTON_TONES.paper;
  const isMajor = size === 'major';
  const isMini = size === 'mini';
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-[9px] border-2 font-display font-bold leading-none',
        isMajor ? 'h-[34px] min-w-[116px] gap-1.5 px-2 text-[10px]' : isMini ? 'h-[30px] min-w-[54px] gap-0.5 px-1 text-[8px]' : 'h-[28px] min-w-[62px] gap-1 px-1.5 text-[9px]',
      )}
      style={{ borderColor: toneStyle.border, color: toneStyle.color, background: toneStyle.bg, boxShadow: TOY_BUTTON_SHADOW }}
    >
      {icon && (
        <span
          className={cn(
            'grid shrink-0 place-items-center rounded-full border border-ink-line/35 bg-white/75 shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),inset_0_-1px_2px_rgba(0,0,0,0.12)]',
            isMajor ? 'h-5 w-5 text-[12px]' : 'h-4 w-4 text-[10px]',
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <span className="inline-flex min-w-0 flex-col items-start gap-0.5 whitespace-nowrap">
        <span className={cn('inline-flex items-baseline gap-0.5', isMajor ? 'text-[10px]' : 'text-[8px]')}>
          {label && <span className="opacity-72">{label}</span>}
          <span className={cn('font-extrabold tabular-nums', isMajor ? 'text-[13px]' : 'text-[9px]')}>
            {value}<small className="ml-px text-[7px] opacity-75">{unit}</small>
          </span>
        </span>
        {subValue && (
          <span className="pl-[1px] text-[8px] font-extrabold leading-none text-red-800/85 tabular-nums">
            ㄴ{subValue}
          </span>
        )}
      </span>
    </span>
  );
}
function PassiveChip({ passive, active, compact = false, separated = false }) {
  if (compact) {
    return (
      <span
        className={cn(
          'inline-flex h-6 shrink-0 items-center gap-0.5 px-1 text-[8px] font-extrabold leading-none tabular-nums',
          separated && 'border-l border-emerald-800/25 pl-1.5',
          active ? 'text-emerald-950' : 'text-ink/40',
        )}
        title={`${passive.name} 발동 시 월급 +${passive.delta}만`}
      >
        <span className="text-[10px] leading-none">{passive.emoji}</span>
        <span>{passive.name}</span>
        <span className={active ? 'text-emerald-700' : 'text-ink/35'}>+{passive.delta}만</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex h-[32px] shrink-0 items-center justify-center gap-1 overflow-hidden rounded-[9px] border-2 px-1 font-display leading-none',
        active ? 'w-[76px] border-ink-line text-ink' : 'w-[64px] border-dashed border-ink/25 bg-transparent text-ink/48',
      )}
      style={{
        background: active ? BUTTON_TONES.gold.bg : 'transparent',
        boxShadow: active ? TOY_BUTTON_SHADOW : 'none',
      }}
      title={`${passive.name} 발동 시 월급 +${passive.delta}만`}
    >
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-ink-line/35 bg-white/80 text-[11px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),inset_0_-1px_2px_rgba(0,0,0,0.12)]" aria-hidden="true">
        {passive.emoji}
      </span>
      <span className="inline-flex min-w-0 items-center gap-0.5 whitespace-nowrap">
        <span className={cn('font-extrabold text-[10px]', active ? 'text-ink' : 'text-ink/50')}>{passive.name}</span>
        <span className={cn('font-extrabold text-[10px] tabular-nums', active ? 'text-monopoly-deep' : 'text-ink/40')}>+{passive.delta}만</span>
      </span>
    </span>
  );
}
function MiniStat({ label, value, unit, tone, icon }) {
  const toneStyle = BUTTON_TONES[tone] ?? BUTTON_TONES.paper;
  return (
    <span
      className="inline-flex h-[32px] w-[92px] shrink-0 items-center justify-center gap-1 rounded-[9px] border-2 px-1.5 font-display text-[9px] font-bold leading-none"
      style={{ borderColor: toneStyle.border, color: toneStyle.color, background: toneStyle.bg, boxShadow: TOY_BUTTON_SHADOW }}
    >
      {icon && (
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-ink-line/35 bg-white/75 text-[12px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),inset_0_-1px_2px_rgba(0,0,0,0.12)]" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="inline-flex min-w-0 items-center gap-0.5 whitespace-nowrap">
        <span className="opacity-75">{label}</span>
        <span className="font-extrabold tabular-nums">{value}<small className="ml-px text-[7px] opacity-75">{unit}</small></span>
      </span>
    </span>
  );
}
function MiniBadge({ text, tone = 'amber' }) {
  const toneCls = {
    amber: 'border-monopoly-gold bg-amber-100 text-amber-900',
    green: 'border-emerald-700 bg-emerald-100 text-emerald-900',
  }[tone];
  return (
    <span className={cn('inline-flex h-[32px] shrink-0 items-center rounded-md border px-1 font-display text-[9px] font-bold leading-none shadow-[inset_0_2px_0_rgba(255,255,255,0.45),0_2px_0_0_#0F0C0A]', toneCls)}>
      {text}
    </span>
  );
}
function Group({ label, children }) {
  return (
    <div className="inline-flex min-w-0 items-center gap-1 overflow-hidden">
      <span className="shrink-0 font-display text-[7px] font-bold uppercase tracking-[0.14em] text-ink/55">
        {label}
      </span>
      {children}
    </div>
  );
}

function StatusBadges({ player }) {
  const items = [];
  if ((player.defenseCards ?? 0) > 0) items.push({ tone: 'blue', text: `방어 ${player.defenseCards}장` });
  if (player.lifeChangeReady || player.pendingLifeChange) items.push({ tone: 'violet', text: '체인지 가능' });
  if (player.creditDebt > 0) items.push({ tone: 'amber', text: `신용 ${fmt(player.creditDebt)}만` });
  if (player.loansharkDebt > 0) items.push({ tone: 'red', text: `고리 ${fmt(player.loanshDebt ?? player.loansharkDebt)}만` });
  if (player.inJail) items.push({ tone: 'black', text: `감옥 ${player.jailTurns ?? 0}` });
  if ((player.skipTurns ?? 0) > 0) items.push({ tone: 'black', text: `휴식 ${player.skipTurns}` });
  if (player.bankrupt) items.push({ tone: 'black', text: '파산' });
  if (items.length === 0) return null;

  const toneCls = {
    amber: 'border-monopoly-gold bg-amber-100 text-amber-900',
    red: 'border-monopoly-deep bg-red-100 text-monopoly-deep',
    black: 'border-ink-line bg-ink text-white',
    blue: 'border-blue-700 bg-blue-100 text-blue-900',
    violet: 'border-violet-700 bg-violet-100 text-violet-900',
  };

  return (
    <div className="flex max-w-[220px] flex-wrap items-center gap-0.5 overflow-visible">
      {items.map((it, i) => (
        <span
          key={i}
          className={cn(
            'inline-flex shrink-0 rounded-sm border px-1 py-0.5 font-display text-[8px] font-bold uppercase tracking-wider leading-none',
            toneCls[it.tone],
          )}
        >
          {it.text}
        </span>
      ))}
    </div>
  );
}

// === 빈 부동산 슬롯 ===
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

function EmptyDeed({ previewPos = null, state = null, onClick } = {}) {
  const tile = previewPos != null ? state?.board?.tiles?.[previewPos] : null;
  const body = tile ? (
    <div className="relative h-full w-full overflow-hidden rounded-md">
      <div className="h-full w-full grayscale opacity-72 saturate-0">
        <PropertyDeedMini pos={previewPos} />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-[28%] z-10 flex -translate-y-1/2 items-center justify-center">
        <div className="rotate-[-10deg] border-[3px] border-monopoly-deep bg-monopoly-red px-3 py-1 font-display text-[15px] font-extrabold uppercase tracking-[0.18em] text-white shadow-[0_2px_0_0_#9F1F1F,0_0_14px_rgba(159,31,31,0.48)]">
          구매
        </div>
      </div>
    </div>
  ) : (
    <div
      className="relative h-full w-full overflow-hidden rounded-md border-2 border-dashed border-ink/18 bg-parchment-100/35 text-ink/18 grayscale saturate-0"
      aria-hidden="true"
    >
      <div className="absolute inset-1 rounded-[5px] border border-ink/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.45)_0%,rgba(218,210,194,0.42)_100%)]" />
      <div className="absolute inset-x-2 top-2 h-[24%] rounded-sm bg-ink/14" />
      <div className="absolute inset-x-2 top-[38%] space-y-1">
        <div className="mx-auto h-1.5 w-10 rounded-full bg-ink/18" />
        <div className="mx-auto h-1.5 w-8 rounded-full bg-ink/14" />
      </div>
      <div className="absolute inset-x-0 bottom-2 text-center font-display text-[8px] font-black uppercase tracking-[0.18em] text-ink/20">TITLE DEED</div>
    </div>
  );
  if (!onClick) return body;
  return <button type="button" onClick={onClick} className="h-full w-full text-left">{body}</button>;
}





