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
import LoanModal from '@/components/modals/LoanModal.jsx';
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
const PLAYER_SIGNATURE_COLORS = ['#DC2626', '#2563EB', '#F97316', '#16A34A'];
const PROPERTY_COLOR_HEX = {
  brown: '#955436',
  lightblue: '#AAE0FA',
  pink: '#D93A96',
  orange: '#F7941D',
  red: '#ED1B24',
  yellow: '#FEF200',
  green: '#1FB25A',
  darkblue: '#0072BB',
};
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
  yangban: 'center 24%',
  general: '36% 23%',
  magistrate: 'center 22%',
  farmer: 'center 23%',
  chunDooHwan: 'center 18%',
  genghisKhan: 'center 20%',
  steveJobs: 'center calc(18% + 12px)',
  billGates: 'center calc(18% + 12px)',
  donaldTrump: 'center calc(18% + 7px)',
  leeJaeMyung: 'center 18%',
  wakizakaYasuharu: 'center 20%',
  toyotomiHideyoshi: 'center 20%',
  elonMusk: 'center calc(18% + 12px)',
  choiHyeokjun: 'center calc(24% + 20px)',
  haruna: 'center calc(24% + 25px)',
  choiDasol: 'center calc(24% + 15px)',
  choiDabin: 'center 48%',
  takedaShingen: 'center 18%',
  liuBei: 'center 18%',
  guanYu: 'center 18%',
  zhangFei: 'center 18%',
  caoCao: 'center 18%',
  luBu: 'calc(50% - 10px) 18%',
  dongZhuo: 'center 18%',
  luffy: 'center 18%',
  zoro: 'center 18%',
  shanks: 'center 18%',
  sanji: 'center 18%',
};
const AVATAR_SIZE = {
  yangban: '220%',
  general: '205%',
  magistrate: '220%',
  farmer: '220%',
  chunDooHwan: '220%',
  genghisKhan: '220%',
  steveJobs: '255%',
  billGates: '255%',
  donaldTrump: '255%',
  leeJaeMyung: '245%',
  wakizakaYasuharu: '245%',
  toyotomiHideyoshi: '245%',
  elonMusk: '255%',
  choiHyeokjun: '255%',
  haruna: '390%',
  choiDasol: '255%',
  choiDabin: '259%',
  takedaShingen: '255%',
  liuBei: '255%',
  guanYu: '255%',
  zhangFei: '255%',
  caoCao: '255%',
  luBu: '255%',
  dongZhuo: '255%',
  luffy: '255%',
  zoro: '255%',
  shanks: '255%',
  sanji: '255%',
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
  return out.sort((a, b) => {
    const ta = state.board.tiles[a];
    const tb = state.board.tiles[b];
    if ((ta?.color ?? '') !== (tb?.color ?? '')) return String(ta?.color ?? '').localeCompare(String(tb?.color ?? ''));
    return a - b;
  });
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
  onPendingPurchaseContract,
  onLoanSigned,
  diceMode = 'keypad',
  onDiceModeChange,
  onAppDiceRoll,
  lastDiceRoll,
  compact = false,
  hideSkipOverlay = false,
  bgmEnabled = false,
  onToggleBgm,
  onStationResign,
  hideDicePanel = false,
  statusActions = null,
}) {
  if (!player) return null;
  const baseMeta = CHAR_META[player.character] ?? { name: player.character, color: '#666', slot: null };
  // 셋업에서 입력한 이름을 우선 표시한다.
  const meta = {
    ...baseMeta,
    color: PLAYER_SIGNATURE_COLORS[index] ?? baseMeta.color,
    name: displayPlayerName(player, baseMeta.name),
  };
  const characterImg = getCharacterImg(player.character);
  const owned = getOwnedPositions(state, index);
  const totalWorth = quickWorth(state, index);
  const livingCost = getLivingCost(totalWorth);
  const settlementContent = turnBriefing ?? {
    title: '이번 턴 정산',
    rows: [],
    total: 0,
    balance: player.cash ?? 0,
  };
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
  const modalLoan = useGameStore((s) => s.modal.loan);
  const closeLoanModal = useGameStore((s) => s.closeLoanModal);
  const saveGame = useGameStore((s) => s.save);
  const restartSameGame = useGameStore((s) => s.restartSameGame);

  const handleQuitGame = () => {
    saveGame?.();
    setSettingsOpen(false);
    setTimeout(() => onExit?.(), 650);
  };

  const handleRestartGame = () => {
    setSettingsOpen(false);
    setTimeout(() => {
      restartSameGame?.();
    }, 650);
  };
  const settingsButtonBaseClass = 'w-full rounded-md border-2 border-ink-line px-3 py-2 font-board text-base shadow-[0_8px_18px_-16px_rgba(36,57,74,0.68)] transition active:translate-y-1 active:shadow-none';
  const settingsPlainButtonClass = cn(settingsButtonBaseClass, 'bg-white text-ink');

  // 쉬는 턴 상태
  const currentTile = state.board?.tiles?.[player.position];
  const currentTileState = state.tileState?.[player.position];
  const pendingOwner = pendingPurchase?.pos != null ? state.tileState?.[pendingPurchase.pos]?.owner : null;
  const hasPendingPurchasePreview = pendingPurchase?.visitorId === index && pendingOwner == null;
  const pendingPreviewSlot = hasPendingPurchasePreview && owned.length < OWNED_SLOTS ? owned.length : -1;

  const isSkipping = !!player.inJail || (player.skipTurns ?? 0) > 0;
  const jailTurnsRemaining = Math.max(0, JAIL_TURNS - (player.jailTurns ?? 0));
  const skipReason = player.inJail
    ? { icon: '/icons/police-car.svg', emoji: '\uD83D\uDE93', label: '\uAC10\uC625', turns: jailTurnsRemaining, tone: 'red' }
    : (player.skipTurns ?? 0) > 0
      ? { emoji: '🪖', label: '군복무', turns: player.skipTurns ?? 0, tone: 'military', message: '군입대 중!' }
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
              : skipReason.tone === 'military'
                ? 'bg-[linear-gradient(135deg,#2f3a20_0%,#6b7d38_58%,#d7c46a_100%)] text-white'
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
          {skipReason.tone === 'military' && (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-[3px] border-white bg-monopoly-red font-display text-[24px] font-black text-white shadow-[0_3px_0_#0F0C0A]">
              !
            </span>
          )}
          <span className="font-display text-[22px] font-extrabold uppercase tracking-[0.12em]">
            {skipReason.label}
          </span>
          <span className="rounded-sm border-[3px] border-ink-line bg-parchment-50 px-3 py-1.5 font-display text-[18px] font-extrabold tabular-nums text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
            {skipReason.turns}턴 남음
          </span>
          <span className="font-display text-[15px] font-extrabold uppercase tracking-[0.16em] opacity-95">
            {skipReason.message ?? '쉬는 중'}
          </span>
        </div>
      </div>,
      document.body
    )}

    <section
      className="relative grid flex-1 min-h-0 grid-cols-[1fr_248px] overflow-visible"
      style={{
        '--active-player-color': meta.color,
      }}
      data-component="CurrentPlayerStage"
    >

      {settingsOpen && (
        <div className="absolute right-3 top-14 z-[96] w-[190px] rounded-md border-2 border-ink-line bg-parchment-50 p-2 shadow-[0_4px_0_#0F0C0A,0_18px_34px_-18px_rgba(0,0,0,0.75)]">
          <div className="mb-2 border-b border-white/45 pb-1 font-display text-[10px] font-extrabold uppercase tracking-[0.22em] text-ink/55">
            게임 설정
          </div>
          <button
            type="button"
            onClick={handleQuitGame}
            className={cn('mb-2', settingsButtonBaseClass, 'bg-[#df2f35] text-white')}
          >
            게임 그만두기
          </button>
          <button
            type="button"
            onClick={handleRestartGame}
            className={cn('mb-2', settingsButtonBaseClass, 'bg-emerald-500 text-white')}
          >
            게임 다시하기
          </button>
          <button
            type="button"
            onClick={onToggleBgm}
            className="flex w-full items-center justify-between rounded-md border-2 border-ink-line bg-white px-3 py-2 font-board text-base text-ink shadow-[0_8px_18px_-16px_rgba(36,57,74,0.68)] transition active:translate-y-1 active:shadow-none"
            aria-pressed={bgmEnabled}
          >
            <span>BGM</span>
            <span
              className={cn(
                'relative h-6 w-12 rounded-full border-2 border-ink-line transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]',
                bgmEnabled ? 'bg-emerald-400' : 'bg-slate-200',
              )}
            >
              <span
                className={cn(
                  'absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-ink-line bg-white shadow-[0_2px_0_rgba(15,12,10,0.45)] transition-transform',
                  bgmEnabled ? 'translate-x-[23px]' : 'translate-x-[3px]',
                )}
              />
            </span>
          </button>
        </div>
      )}

      {/* 좌측: 플레이어 정보와 보유 부동산 */}
      <div className={cn('flex min-w-0 flex-col', (player.skipTurns ?? 0) > 0 && 'grayscale')}>

      {/* 상단 상태 영역 */}
      <div
        className="relative mx-2.5 mt-1.5 grid h-[100px] grid-cols-[74px_1fr] gap-2 overflow-visible rounded-xl border border-white/70 bg-white/82 px-2 py-1 pr-[116px]"
        style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.9), 0 0 0 2px ${meta.color}9a, 0 0 10px ${meta.color}8a, 0 0 24px ${meta.color}72, 0 10px 22px -18px rgba(36,57,74,0.7)` }}
      >
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
              className="h-[62px] w-[62px] rounded-full border-2 bg-white/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_10px_22px_-16px_rgba(0,0,0,0.85),0_0_0_3px_rgba(255,255,255,0.22)]"
              style={{
                backgroundImage: 'url(' + characterImg + ')',
                backgroundSize: AVATAR_SIZE[player.character] ?? '155%',
                backgroundPosition: AVATAR_POSITION[player.character] ?? 'center 22%',
                backgroundRepeat: 'no-repeat',
                backgroundColor: meta.color + '22',
                borderColor: '#FFD54F',
                filter: isCashBankrupt ? 'grayscale(1) brightness(0.72)' : undefined,
              }}
              aria-label={meta.name}
            />
          ) : (
            <div className={cn('grid h-[68px] w-[68px] place-items-center rounded-full border-2 border-white/70 bg-white/45 text-4xl shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_10px_22px_-16px_rgba(0,0,0,0.85)]', isCashBankrupt && 'grayscale brightness-75')}>
              {meta.emoji ?? '🎭'}
            </div>
          )}
          {(player.defenseCards ?? 0) > 0 && (
            <div
              className="absolute -bottom-2 left-1/2 z-20 grid h-7 min-w-7 -translate-x-1/2 place-items-center rounded-b-[12px] rounded-t-[8px] border-2 border-ink-line bg-[linear-gradient(180deg,#e8fff6_0%,#38b46f_100%)] px-1 font-display text-[11px] font-black leading-none text-white shadow-[0_2px_0_#0F0C0A,0_7px_12px_-10px_rgba(0,0,0,0.8)]"
              title={`방어 카드 ${player.defenseCards}장`}
            >
              🛡{player.defenseCards > 1 ? player.defenseCards : ''}
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
                compact ? 'text-[18px]' : 'text-[22px]',
                Array.from(meta.name ?? '').length === 3 && 'tracking-[0.28em]',
                Array.from(meta.name ?? '').length > 3 && Array.from(meta.name ?? '').length <= 6 && 'tracking-normal',
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
              />
            </div>

          <div className="col-span-2 -mt-1 flex min-w-0 items-center gap-1.5 overflow-visible">
            <FinanceChip totalWorth={totalWorth} cash={player.cash ?? 0} debt={totalDebt} onLoanClick={() => openLoanModal?.(index)} />
            <HeaderChip icon={'\uD83D\uDED2'} label={'\uC0DD\uD65C'} value={'-' + livingCost} unit={'\uB9CC'} tone="red" size="normal" />
            <HeaderChip icon={'\uD83C\uDFE6'} label={'\uC774\uC790'} value={'-' + fmt(loanInterest)} unit={'\uB9CC'} tone="red" size="normal" />
            {aptIncome > 0 && <RentIncomeChip value={aptIncome} />}
            {stationTiles.length > 0 && <IncomeBadge icon="🚉" label="역장 적립" value={stationRate * stationTiles.length} sub={`${stationTiles.length}역 · 누적 ${fmt(stationFund)}만`} onClick={onStationResign} />}
            {institutionIncome > 0 && <IncomeBadge icon="⚡" label="기관 월급" value={institutionIncome} sub={`${institutionTiles.length}곳 보유`} />}
          </div>
        </div>

      </div>
      {/* 보유 부동산 */}
      <div className="relative mx-2.5 mb-[6px] mt-[14px] flex flex-1 min-h-0 flex-col overflow-visible rounded-xl border border-slate-300/68 bg-white/74 px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_0_0_1px_rgba(100,116,139,0.30),0_0_18px_rgba(71,85,105,0.18)]">
        <div className="mb-[5px] flex items-center justify-between">
          <span className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-ink">{'\uBCF4\uC720 \uBD80\uB3D9\uC0B0'}
            <span className="ml-1.5 font-semibold text-ink/40 tabular-nums">
              {owned.length}{owned.length > OWNED_SLOTS ? `/${owned.length}` : ` / ${OWNED_SLOTS}`}
            </span>
          </span>

        </div>

        {/* 보유 부동산 캡슐 안에서 8개 섹션을 먼저 나누고, 각 섹션 안에 카드만 다시 그린다. */}
        <div className={cn('grid flex-1 min-h-0 grid-cols-4 grid-rows-2 gap-x-1.5 gap-y-2 pb-1 pt-0.5', player.inJail && 'grayscale saturate-0 brightness-[0.72]')}>
          {Array.from({ length: OWNED_SLOTS }).map((_, idx) => {
            const pos = owned[idx];
            const isPending = idx === pendingPreviewSlot;
            const sectionClassName = "relative min-h-0 overflow-visible rounded-lg border border-slate-300/42 bg-white/10 p-[2px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.30),0_0_10px_rgba(100,116,139,0.10)]";
            return (
              <div key={pos ?? `empty-${idx}`} data-deed-slot={idx} data-deed-pos={pos ?? undefined} className={sectionClassName}>
                {pos == null ? (
                  <div className="h-full w-full overflow-visible">
                    <EmptyDeed previewPos={isPending ? pendingPurchase.pos : null} state={state} onClick={isPending ? () => onPendingPurchaseContract?.(pendingPurchase) : undefined} />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => openModal(pos, index)}
                    className="relative block h-full min-h-0 w-full overflow-visible rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/70"
                  >
                    <span className="deed-slot-placeholder pointer-events-none absolute inset-0 opacity-0">
                      <EmptyDeed />
                    </span>
                    <span
                      key={`${pos}-${state._lastDeedAdded?.nonce ?? 'base'}`}
                      className={cn(
                        'deed-slot-card relative block h-full w-full',
                        state._lastDeedAdded?.playerId === index && state._lastDeedAdded?.pos === pos && 'deed-slot-card-insert',
                      )}
                    >
                      <PropertyDeedMini pos={pos} />
                    </span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {player.inJail && <JailDeedSlotOverlay turns={jailTurnsRemaining} />}

        {modalLoan?.playerId === index && (
          <div
            className="absolute inset-1 z-[60] rounded-xl bg-ink/35 p-1.5 backdrop-blur-[2px]"
            onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); }}
            onClick={(event) => { event.preventDefault(); event.stopPropagation(); closeLoanModal?.(); }}
          >
            <div className="h-full" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
              <LoanModal open inline onClose={closeLoanModal} playerId={modalLoan.playerId} onLoanSigned={onLoanSigned} />
            </div>
          </div>
        )}

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
        className="flex min-h-0 flex-col px-2.5 pb-[6px] pt-1"
        style={{
          background: 'linear-gradient(90deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.08) 100%)',
        }}
      >
        <div className="relative flex flex-1 min-h-0 flex-col overflow-visible rounded-2xl border border-slate-300/68 bg-white/72 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_0_0_1px_rgba(100,116,139,0.30),0_0_18px_rgba(71,85,105,0.18)]">
          <div className="w-full shrink-0 rounded-xl border border-white/70 bg-white/82 px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_0_0_1px_rgba(148,163,184,0.30),0_0_18px_rgba(100,116,139,0.28),0_10px_22px_-18px_rgba(36,57,74,0.7)]">
            <div className="flex items-center justify-between gap-2">
              <div
                className={cn(
                  'flex h-[32px] flex-1 items-center justify-center gap-1.5 rounded-md border border-white/70 px-2 font-display text-[15px] font-extrabold tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_0_0_1px_rgba(148,163,184,0.22),0_0_12px_rgba(100,116,139,0.20),0_8px_18px_-16px_rgba(36,57,74,0.65)]',
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
                className="relative z-[95] grid h-[32px] w-10 shrink-0 place-items-center rounded-lg border border-white/70 bg-white/86 font-display text-[17px] font-extrabold text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_0_0_1px_rgba(148,163,184,0.22),0_0_12px_rgba(100,116,139,0.20),0_8px_18px_-16px_rgba(36,57,74,0.65)] transition active:translate-y-1 active:shadow-none"
                aria-label="게임 설정"
              >
                ⚙
              </button>
            </div>
          </div>

          <div className="mt-2 w-full shrink-0 rounded-2xl border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.34),rgba(255,255,255,0.16),rgba(148,163,184,0.10))] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_0_0_1px_rgba(148,163,184,0.28),0_0_18px_rgba(100,116,139,0.24),0_10px_24px_-20px_rgba(36,57,74,0.7)] backdrop-blur-[10px]">
            <button
              type="button"
              onClick={onOpenBoard}
              disabled={!onOpenBoard}
              className="flex h-[38px] w-full items-center justify-center gap-2 rounded-xl border border-white/75 bg-[linear-gradient(135deg,rgba(255,255,255,0.72),rgba(241,245,249,0.52),rgba(255,255,255,0.24))] px-3 font-board text-[18px] leading-none text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.86),0_0_0_1px_rgba(148,163,184,0.22),0_0_12px_rgba(100,116,139,0.18),0_10px_22px_-18px_rgba(36,57,74,0.72)] backdrop-blur-[8px] transition active:translate-y-1 active:shadow-none disabled:opacity-45"
            >
              <span>🗺️</span>
              <span>보드판</span>
            </button>
          </div>

          <div className="mt-2 flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[20px] border border-white/72 bg-white/38 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_0_0_1px_rgba(148,163,184,0.22),0_16px_30px_-24px_rgba(36,57,74,0.76)]" style={{ borderColor: `${meta.color}44`, background: `linear-gradient(180deg, rgba(255,255,255,0.42) 0%, ${meta.color}10 100%)` }}>
            <SettlementBubble
              key={`${state.round ?? 0}-${state.turnIndex ?? index}-${index}`}
              content={settlementContent}
              color={meta.color}
              playerName={name}
            />

            {hideDicePanel ? (
              <div className="real-dice-panel mt-2 mb-0 translate-y-0 w-full shrink-0 rounded-xl border border-slate-300/80 bg-white/74 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_0_0_2px_rgba(148,163,184,0.38),0_0_22px_rgba(100,116,139,0.34),0_14px_28px_-22px_rgba(36,57,74,0.72)]">
                {statusActions}
              </div>
            ) : (
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
            )}
          </div>
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
      className="relative grid h-[61px] w-[61px] place-items-center overflow-visible rounded-[16px]"
      animate={rolling ? { scale: [1, 1.035, 1.01], y: [0, -1, 0] } : { scale: [1.03, 1] }}
      transition={rolling ? { duration: 0.18, ease: 'linear' } : { duration: 0.22, ease: 'easeOut' }}
    >
      {ready ? (
        <div className="relative h-full w-full drop-shadow-[0_5px_0_rgba(15,12,10,0.78)]" aria-label="ready dice">
          <svg viewBox="0 0 100 100" className="h-full w-full select-none opacity-95" aria-hidden="true">
            <defs>
              <linearGradient id="readyDiceBody" x1="14" y1="8" x2="88" y2="92" gradientUnits="userSpaceOnUse">
                <stop stopColor="#ffffff" />
                <stop offset="0.46" stopColor="#fffdf4" />
                <stop offset="1" stopColor="#e7ddc2" />
              </linearGradient>
            </defs>
            <rect x="7" y="6" width="86" height="86" rx="18" fill="url(#readyDiceBody)" stroke="#120d09" strokeWidth="4" />
            <path d="M16 17 C32 8 67 8 84 17" fill="none" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" opacity="0.72" />
            <path d="M84 20 C91 40 88 70 76 84" fill="none" stroke="#6b5b3b" strokeWidth="5" strokeLinecap="round" opacity="0.12" />
          </svg>
          <span className="absolute inset-0 grid place-items-center select-none font-display text-[30px] font-black leading-none text-ink drop-shadow-[0_2px_0_rgba(255,255,255,0.72)]">?</span>
        </div>
      ) : (
        <img
          key={safeValue}
          src={`/ui/dice-face-${safeValue}.svg`}
          alt={`${safeValue}`}
          draggable={false}
          className="h-full w-full select-none object-contain drop-shadow-[0_5px_0_rgba(15,12,10,0.78)]"
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
  const showCardResult = result?.kind === 'card';
  const isJail = result?.kind === 'jail' || result?.kind === 'jail_sent';
  const showNumberPad = !showCardResult && !isJail;

  if (showCardResult) return null;

  return (
    <div className="real-dice-panel mt-2 mb-0 translate-y-0 w-full shrink-0 rounded-xl border border-slate-300/80 bg-white/74 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_0_0_2px_rgba(148,163,184,0.38),0_0_22px_rgba(100,116,139,0.34),0_14px_28px_-22px_rgba(36,57,74,0.72)]" style={{ '--player-color': color }}>
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
      ) : showNumberPad ? (
        <>
          <div className="relative mb-1.5 grid grid-cols-2 rounded-full border border-white/70 bg-white/54 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_0_0_1px_rgba(148,163,184,0.18),0_0_10px_rgba(100,116,139,0.14)] backdrop-blur-[8px]">
            <div
              className="absolute bottom-1 top-1 rounded-full border bg-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_0_10px_rgba(100,116,139,0.16),0_8px_16px_-14px_rgba(36,57,74,0.7)]"
              style={{ left: diceMode === 'keypad' ? 4 : '50%', right: diceMode === 'keypad' ? '50%' : 4, borderColor: diceMode === 'keypad' ? 'rgba(220,38,38,0.46)' : 'rgba(37,99,235,0.46)', boxShadow: diceMode === 'keypad' ? 'inset 0 1px 0 rgba(255,255,255,0.82), 0 0 0 1px rgba(220,38,38,0.18), 0 0 10px rgba(220,38,38,0.16), 0 8px 16px -14px rgba(220,38,38,0.72)' : 'inset 0 1px 0 rgba(255,255,255,0.82), 0 0 0 1px rgba(37,99,235,0.18), 0 0 10px rgba(37,99,235,0.16), 0 8px 16px -14px rgba(37,99,235,0.72)' }}
              aria-hidden="true"
            />
            <button type="button" onClick={() => onDiceModeChange?.('keypad')} className={cn('relative z-[1] h-9 rounded-full font-board text-[13px] font-extrabold leading-none transition whitespace-nowrap', diceMode === 'keypad' ? 'text-[#15324a]' : 'text-ink/58')}>직접 입력</button>
            <button type="button" onClick={() => onDiceModeChange?.('app')} className={cn('relative z-[1] h-9 rounded-full font-board text-[13px] font-extrabold leading-none transition whitespace-nowrap', diceMode === 'app' ? 'text-[#15324a]' : 'text-ink/58')}>주사위</button>
          </div>
          {diceMode === 'app' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 rounded-xl border border-white/70 bg-white/82 px-2 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_0_0_1px_rgba(148,163,184,0.18),0_0_10px_rgba(100,116,139,0.14)] [perspective:760px]">
                <span className="translate-x-[5px]"><DiceFace value={lastDiceRoll?.d1 ?? 1} rolling={lastDiceRoll?.rolling} ready={!lastDiceRoll} /></span>
                <span className="font-display text-[22px] font-black leading-none text-ink">➕</span>
                <span className="-translate-x-[5px]"><DiceFace value={lastDiceRoll?.d2 ?? 1} rolling={lastDiceRoll?.rolling} ready={!lastDiceRoll} /></span>
              </div>
              <button
                type="button"
                disabled={disabled || diceLocked}
                onClick={onAppDiceRoll}
                className="h-14 w-full rounded-xl border border-white/80 px-2 font-board text-[20px] font-extrabold leading-none text-[#15324a] shadow-[0_12px_24px_-18px_rgba(36,57,74,0.78)] transition active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap"
                style={{ background: `linear-gradient(180deg, rgba(255,255,255,0.96) 0%, ${color}55 100%)`, borderColor: `${color}88` }}
              >
                주사위 굴리기
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-white/70 bg-white/82 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_0_0_1px_rgba(148,163,184,0.18),0_0_10px_rgba(100,116,139,0.14)]">
                {nums.map((num) => (
                  <button
                    key={num}
                    type="button"
                    disabled={disabled || diceLocked}
                    onClick={() => onDiceRoll?.(num)}
                    className="h-[46px] rounded-xl border border-white/80 font-display text-[19px] font-extrabold leading-none text-[#15324a] shadow-[0_0_0_1px_rgba(148,163,184,0.16),0_0_8px_rgba(100,116,139,0.12),0_10px_22px_-18px_rgba(36,57,74,0.72)] transition active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-45"
                    style={{ background: `linear-gradient(180deg, rgba(255,255,255,0.98) 0%, ${color}18 100%)`, borderColor: `${color}44` }}
                  >
                    {num}
                  </button>
                ))}
              </div>
              {diceLocked && onUnlockDice && (
                <button
                  type="button"
                  onClick={onUnlockDice}
                  className="mt-1.5 h-9 w-full rounded-md border-2 border-ink-line bg-[linear-gradient(180deg,#ffffff_0%,#dff4ff_50%,#6fb3ff_100%)] font-board text-[14px] font-extrabold text-[#15324a] whitespace-nowrap shadow-[0_8px_18px_-16px_rgba(36,57,74,0.68)] active:translate-y-1 active:shadow-none"
                >
                  다시 입력
                </button>
              )}
            </>
          )}
        </>
      ) : null}
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
      <div className="flex w-full flex-1 flex-col items-center justify-center gap-2 rounded-[22px] border border-white/72 bg-white/78 p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.86),0_14px_28px_-22px_rgba(36,57,74,0.72)]">
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
      className="absolute left-1/2 top-[-82px] z-20 w-[220px] -translate-x-1/2 rounded-[20px] border border-white/75 bg-white/88 px-3 py-2 font-board text-[15px] font-extrabold leading-snug text-[#182a35] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_14px_28px_-22px_rgba(36,57,74,0.78)]"
      style={{ wordBreak: 'keep-all', overflowWrap: 'normal' }}
    >
      {content}
      <span className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b border-r border-white/75 bg-white/72" />
    </div>
  );
}

function SettlementBalanceCounter({ value = 0 }) {
  return <AnimatedCash value={value} duration={850} settleDelay={0} rollingEffect={false} />;
}

function SettlementBubble({ content, color = '#6fb3ff', playerName = 'PLAYER' }) {
  if (!content) return null;
  const rows = content.rows ?? [];
  const total = content.balance ?? content.total ?? 0;
  const balanceFrom = content.balance != null ? content.balance - (content.total ?? 0) : total;
  const totalSteps = rows.length + (content.event ? 1 : 0);
  const contentKey = `${content.title ?? ''}|${content.event ?? ''}|${balanceFrom}|${total}|${rows.map((row) => `${row.label}:${row.amount}`).join(';')}`;
  const [visibleSteps, setVisibleSteps] = useState(0);

  useEffect(() => {
    setVisibleSteps(0);
    const timers = Array.from({ length: totalSteps }, (_, index) => (
      window.setTimeout(() => setVisibleSteps(index + 1), 130 + index * 190)
    ));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [totalSteps, contentKey]);

  const visibleRows = rows.slice(0, Math.min(visibleSteps, rows.length));
  const balanceTarget = rows.length > 0
    ? balanceFrom + visibleRows.reduce((sum, row) => sum + row.amount, 0)
    : total;
  const showEvent = content.event && visibleSteps > rows.length;

  return (
    <div className="relative z-10 min-h-0 w-full flex-1 overflow-y-auto rounded-[16px] border border-white/72 bg-white/78 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.86),0_14px_28px_-22px_rgba(36,57,74,0.72)] no-scrollbar" style={{ borderColor: `${color}55`, background: `linear-gradient(180deg, rgba(255,255,255,0.82) 0%, ${color}18 100%)` }}>
      <div className="mb-2 flex flex-col items-center justify-center gap-1.5 border-b border-white/55 pb-2 text-center">
        <span className="font-display text-[8px] font-black uppercase tracking-[0.2em]" style={{ color }}>{playerName}</span>
        <span
          className="inline-flex max-w-full items-center justify-center rounded-full border px-4 py-1.5 text-center font-board text-[15px] font-extrabold leading-none text-[#182a35] shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_3px_10px_-8px_rgba(15,23,42,0.75)]"
          style={{ borderColor: `${color}66`, background: `linear-gradient(180deg, rgba(255,255,255,0.92) 0%, ${color}24 100%)`, wordBreak: 'keep-all', overflowWrap: 'normal' }}
        >
          {content.title ?? '이번 턴 정산'}
        </span>
      </div>
      <div className="space-y-1 font-board text-[14px] leading-none">
        {rows.length > 0 ? visibleRows.map((row, idx) => (
          <motion.div
            key={`${row.label}-${idx}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-white/45 bg-white/42 px-2 py-1.5"
          >
            <div className="truncate text-ink/78">{row.label}</div>
            <div className={cn('mt-0.5 pl-3 text-right tabular-nums', row.amount >= 0 ? 'text-emerald-700' : 'text-monopoly-deep')}>
              {row.amount >= 0 ? '+' : '-'}{fmt(Math.abs(row.amount))}만원
            </div>
          </motion.div>
        )) : (
          <div className="min-h-[42px]" aria-hidden="true" />
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
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-2 font-board text-[17px] leading-none">
          <span>⤷ 잔고</span>
          <span className={cn('tabular-nums', balanceTarget < 0 ? 'text-monopoly-deep' : balanceTarget > 0 ? 'text-emerald-700' : 'text-[#182a35]')}>
            <SettlementBalanceCounter value={balanceTarget} />만원
          </span>
        </motion.div>
      </div>
    </div>
  );
}

function JailDeedSlotOverlay({ turns = 0 }) {
  return (
    <div className="pointer-events-none absolute inset-x-2 bottom-2 top-[34px] z-30 overflow-hidden rounded-lg border-2 border-slate-950/38 bg-slate-950/16 shadow-[inset_0_0_28px_rgba(15,23,42,0.34),0_0_22px_rgba(15,23,42,0.20)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,0.18),transparent_46%)]" />
      <motion.img
        src="/effects/jail-bars-overlay.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-[-8%] h-[116%] w-[116%] object-cover opacity-[0.76] mix-blend-multiply drop-shadow-[0_4px_10px_rgba(15,23,42,0.38)]"
        initial={{ opacity: 0, scale: 1.04, y: -8 }}
        animate={{ opacity: 0.76, scale: 1, y: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-xl border-2 border-slate-950/80 bg-white/50 px-4 py-2 text-slate-950 shadow-[0_4px_0_rgba(15,23,42,0.48),0_0_18px_rgba(255,255,255,0.22)] backdrop-blur-[1px]"
        initial={{ opacity: 0, scale: 0.92, rotate: -2 }}
        animate={{ opacity: 0.72, scale: 1, rotate: [-1, 1, 0] }}
        transition={{ duration: 0.5 }}
      >
        <div className="rounded-md border-2 border-slate-950 bg-slate-900 px-3 py-0.5 font-display text-[15px] font-black uppercase tracking-[0.18em] text-white shadow-[0_2px_0_rgba(15,23,42,0.7)]">
          JAIL
        </div>
        <div className="mt-1 font-board text-[13px] font-black text-slate-900/78">감옥 수감 중</div>
        {turns > 0 && <div className="mt-0.5 font-display text-[10px] font-black text-slate-900/56">남은 {turns}턴</div>}
      </motion.div>
      <div className="absolute inset-x-0 bottom-0 h-10 bg-[linear-gradient(180deg,transparent,rgba(15,23,42,0.28))]" />
    </div>
  );
}

// =====================================================
// 상태 보드
// =====================================================
function StatusBoard({ activePassives, player }) {
  return (
    <div className="flex min-w-0 items-center gap-1 overflow-visible">
      <span className="inline-flex h-[32px] shrink-0 items-center rounded-[9px] border-2 border-emerald-700 bg-emerald-50/80 px-1.5 font-display text-[9px] font-bold leading-none text-emerald-950 shadow-[inset_0_2px_0_rgba(255,255,255,0.62),0_2px_0_#0F0C0A]">
        <span className="mr-1 whitespace-nowrap text-[8px] font-extrabold text-emerald-950/70">패시브</span>
        {PASSIVE_SLOTS.map((p, i) => (
          <PassiveChip key={p.id} passive={p} active={activePassives.has(p.id)} compact separated={i > 0} />
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
      className="grid h-[34px] min-w-[316px] shrink-0 grid-cols-3 items-stretch overflow-hidden rounded-[9px] border-2 border-[#8c5b15] bg-[linear-gradient(180deg,#fff8dc_0%,#ffd875_48%,#db9b24_100%)] px-1.5 py-1 font-display text-[#4d330c]"
      style={{ boxShadow: TOY_BUTTON_SHADOW }}
    >
      <span className="flex min-w-0 items-center justify-center gap-1 border-r border-[#8c5b15]/35 pr-1.5 leading-none">
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-ink-line/35 bg-white/75 text-[12px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),inset_0_-1px_2px_rgba(0,0,0,0.12)]" aria-hidden="true">₩</span>
        <span className="flex min-w-0 items-baseline gap-1 whitespace-nowrap">
          <span className="text-[10px] font-bold opacity-75">총자산</span>
          <span className="text-[14px] font-extrabold tabular-nums">{fmt(totalWorth)}<small className="ml-px text-[7px] opacity-70">만</small></span>
        </span>
      </span>
      <span className="flex min-w-0 items-center justify-center gap-1 border-r border-[#8c5b15]/35 px-1.5 leading-none text-[#075d2b]">
        <span className="whitespace-nowrap text-[12px] font-extrabold opacity-80">내 예금액</span>
        <AnimatedCash value={cash} className="font-display text-[17px] font-extrabold leading-none" />
        <small className="ml-[-2px] text-[8px] font-bold opacity-75">만</small>
      </span>
      <button
        type="button"
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.stopPropagation();
          onLoanClick?.();
        }}
        className="relative z-50 flex min-w-0 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-md bg-white/14 px-1.5 text-[#8d1d1d] transition hover:bg-white/45 hover:brightness-110 active:translate-y-0.5"
        title="대출 상담소 열기"
      >
        <span className="font-board text-[14px] font-black leading-none">대출하기</span>
        {debt > 0 && <span className="rounded-full bg-[#8d1d1d]/10 px-1.5 font-display text-[10px] font-extrabold tabular-nums">{fmt(debt)}만</span>}
      </button>
    </span>
  );
}

function RentIncomeChip({ value }) {
  return <IncomeBadge icon="🏢" label="아파트 월세" value={value} />;
}


function IncomeBadge({ icon, label, value, sub, onClick }) {
  const className = "inline-flex h-[34px] shrink-0 items-center justify-center gap-1 rounded-[9px] border-2 border-emerald-700 bg-emerald-100 px-2 font-display text-[9px] font-bold leading-none text-emerald-900 shadow-[inset_0_2px_0_rgba(255,255,255,0.62),0_2px_0_#0F0C0A]";
  const content = (
    <>
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-ink-line/35 bg-white/75 text-[11px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),inset_0_-1px_2px_rgba(0,0,0,0.12)]" aria-hidden="true">
        {icon}
      </span>
      <span className="inline-flex flex-col gap-0.5 whitespace-nowrap">
        <span className="opacity-80">{label} <b className="tabular-nums">+{fmt(value)}만</b></span>
        {sub && <span className="text-[7px] leading-none text-emerald-900/58">{sub}</span>}
      </span>
    </>
  );
  if (onClick) {
    return <button type="button" onClick={onClick} className={cn(className, 'active:translate-y-0.5 active:shadow-none')} title={`${sub ?? `${label} +${fmt(value)}만`} · 퇴직신청`}>{content}</button>;
  }
  return <span className={className} title={sub ?? `${label} +${fmt(value)}만`}>{content}</span>;
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
        active ? 'w-[76px] border-ink-line text-ink' : 'w-[64px] border-ink/18 bg-transparent text-ink/48',
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
  // 감옥/휴식 턴 수 뱃지는 메인 쉬는 중 오버레이와 중복되어 숨긴다.

  if (player.pendingLifeChange) items.push({ tone: 'amber', text: '체인지' });
  if (player.creditDebt > 0) items.push({ tone: 'amber', text: `신용 ${fmt(player.creditDebt)}만` });
  if (player.loansharkDebt > 0) items.push({ tone: 'red', text: `고리 ${fmt(player.loansharkDebt)}만` });
  if (player.bankrupt) items.push({ tone: 'black', text: '파산' });
  if (items.length === 0) return null;

  const toneCls = {
    amber: 'border-monopoly-gold bg-amber-100 text-amber-900',
    red: 'border-monopoly-deep bg-red-100 text-monopoly-deep',
    black: 'border-ink-line bg-ink text-white',
    green: 'border-emerald-700 bg-emerald-100 text-emerald-900',
  };

  return (
    <>
      {items.map((it, i) => (
        <span
          key={i}
          className={cn(
            'inline-flex rounded-sm border px-1 py-0.5 font-display text-[8px] font-bold uppercase tracking-wider',
            toneCls[it.tone],
          )}
        >
          {it.text}
        </span>
      ))}
    </>
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
  const signatureColor = tile ? (PROPERTY_COLOR_HEX[tile.color] ?? '#C9A24B') : '#94A3B8';
  const body = tile ? (
    <div
      className="relative h-full w-full overflow-hidden rounded-md"
      style={{ boxShadow: `0 0 0 2px ${signatureColor}cc, 0 0 18px ${signatureColor}8a, 0 0 34px ${signatureColor}55` }}
    >
      <div className="h-full w-full opacity-72">
        <PropertyDeedMini pos={previewPos} mutedPreview purchasePreview />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-[12%] z-10 flex -translate-y-1/2 items-center justify-center">
        <div className="rotate-[-7deg] border-[2px] border-[#111] bg-[#f2f2f2] px-2.5 py-0.5 font-display text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#111] shadow-[0_2px_0_#0F0C0A,0_0_12px_rgba(0,0,0,0.28)]">
          이번 턴 구매가능
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 rounded-md border-2 border-red-950 bg-monopoly-red px-2 py-1 text-center font-board text-[14px] font-black text-white shadow-[0_2px_0_#7f1d1d,0_0_14px_rgba(220,38,38,0.42)]">
        계약하기
      </div>
    </div>
  ) : (
    <div
      className="relative h-full w-full overflow-hidden rounded-md border-2 border-white/28 bg-[linear-gradient(135deg,rgba(255,255,255,0.24)_0%,rgba(148,163,184,0.24)_46%,rgba(51,65,85,0.22)_100%)] text-ink/48 shadow-[inset_0_1px_0_rgba(255,255,255,0.42),inset_0_-18px_34px_rgba(15,23,42,0.10),0_0_0_1px_rgba(148,163,184,0.28),0_0_20px_rgba(100,116,139,0.24)] backdrop-blur-[10px]"
      aria-hidden="true"
    >
      <div className="absolute inset-1 rounded-[5px] border border-white/28 bg-[linear-gradient(180deg,rgba(255,255,255,0.20)_0%,rgba(255,255,255,0.06)_100%)]" />
      <div className="absolute -left-8 top-4 h-12 w-24 -rotate-[24deg] bg-[linear-gradient(90deg,transparent_0%,rgba(238,253,255,0.42)_48%,transparent_78%)] blur-[4px]" />
      <div className="absolute inset-x-2 top-2 h-[24%] rounded-sm border border-white/22 bg-white/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.36)]" />
      <div className="absolute inset-x-2 top-[38%] space-y-1">
        <div className="mx-auto h-1.5 w-10 rounded-full bg-white/30" />
        <div className="mx-auto h-1.5 w-8 rounded-full bg-white/22" />
      </div>
      <div className="absolute inset-x-0 bottom-2 text-center font-display text-[8px] font-black uppercase tracking-[0.18em] text-ink/24">TITLE DEED</div>
    </div>
  );
  if (!onClick) return body;
  return <button type="button" onClick={onClick} className="h-full w-full text-left">{body}</button>;
}





