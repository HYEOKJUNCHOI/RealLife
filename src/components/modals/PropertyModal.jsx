// 부동산 도착 모달 — 정통 모노폴리 권리증 결 + 참고 이미지 화려함 결합
// 리디자인: 진한 단색 헤더 + PREMIUM 별 + 다크 캡슐 가격 + 이모티콘 임대료 표 + 단계 progress
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore.js';
import { currentPrice, rentFromStage, hasColorMonopoly } from '@/engine/inflation.js';
import { computeRent } from '@/engine/rent.js';
import { LTV_RATIO, round10 } from '@/engine/constants.js';
import { cn } from '@/lib/cn.js';
import ModalBase from './ModalBase.jsx';
import AssetFrame from '@/components/AssetFrame.jsx';
import AnimatedCash from '@/components/AnimatedCash.jsx';
import charactersData from '@/data/characters.json';

const COLOR_HEADER_BG = {
  brown:     'bg-prop-brown',
  lightblue: 'bg-prop-lightblue',
  pink:      'bg-prop-pink',
  orange:    'bg-prop-orange',
  red:       'bg-prop-red',
  yellow:    'bg-prop-yellow',
  green:     'bg-prop-green',
  darkblue:  'bg-prop-darkblue',
};
const COLOR_HEADER_TEXT = {
  brown:     'text-white',
  lightblue: 'text-ink',
  pink:      'text-white',
  orange:    'text-ink',
  red:       'text-white',
  yellow:    'text-ink',
  green:     'text-white',
  darkblue:  'text-white',
};
const COLOR_TO_SKYLINE = {
  brown:     'skyline.brown',
  lightblue: 'skyline.lightblue',
  pink:      'skyline.pink',
  orange:    'skyline.orange',
  red:       'skyline.red',
  yellow:    'skyline.yellow',
  green:     'skyline.green',
  darkblue:  'skyline.darkblue',
};
const COLOR_STAGE_FILL = {
  brown:     'bg-prop-brown',
  lightblue: 'bg-prop-lightblue',
  pink:      'bg-prop-pink',
  orange:    'bg-prop-orange',
  red:       'bg-prop-red',
  yellow:    'bg-prop-yellow',
  green:     'bg-prop-green',
  darkblue:  'bg-prop-darkblue',
};
// 컬러셋 hex (모달 외곽 글로우 띠용)
const COLOR_HEX = {
  brown:     '#955436',
  lightblue: '#AAE0FA',
  pink:      '#D93A96',
  orange:    '#F7941D',
  red:       '#ED1B24',
  yellow:    '#FEF200',
  green:     '#1FB25A',
  darkblue:  '#0072BB',
};

const fmt = (n) => (n ?? 0).toLocaleString('ko-KR');

const nextBuildStage = (stage, delta) => {
  const cur = Number(stage) || 0;
  if (delta > 0 && cur === 3) return 5;
  if (delta < 0 && cur === 5) return 3;
  return Math.max(0, Math.min(5, cur + delta));
};

const developmentCashDelta = ({ fromStage, toStage, initialStage, houseCost }) => {
  const cost = Number(houseCost) || 0;
  if (fromStage === toStage || cost <= 0) return 0;
  if (toStage > fromStage) {
    const isRestore = initialStage != null && toStage <= initialStage;
    return -round10(cost * (isRestore ? 0.5 : 1));
  }
  const isSelling = initialStage != null && toStage < initialStage;
  return round10(cost * (isSelling ? 0.5 : 1));
};

const simulateDevelopmentCashDelta = ({ fromStage, toStage, initialStage, houseCost }) => {
  let stage = fromStage;
  let total = 0;
  const guard = 8;
  for (let i = 0; i < guard && stage !== toStage; i += 1) {
    const delta = toStage > stage ? +1 : -1;
    const next = nextBuildStage(stage, delta);
    total += developmentCashDelta({ fromStage: stage, toStage: next, initialStage, houseCost });
    stage = next;
  }
  return total;
};

// 캐릭터 id → 메타 (state.players[i].character 로 조회)
const CHAR_META = Object.fromEntries(charactersData.korea.map((c) => [c.id, c]));

// playerId(state.players 의 인덱스) → 그 플레이어의 캐릭터 메타
// ⚠️ characters.json 의 인덱스 ≠ state.players 의 인덱스
// 이름은 사용자가 셋업에서 입력한 값(p.name) 우선, 없으면 캐릭터 기본 이름
const playerMeta = (state, playerId) => {
  const p = state?.players?.[playerId];
  const base = CHAR_META[p?.character] ?? { name: `${playerId + 1}P`, color: '#666' };
  return { ...base, name: (p?.name?.trim()) || base.name };
};

// 이모티콘으로 단계 표현 — 텍스트 라벨 대체
const STAGE_EMOJI  = ['□', '🏠', '🏠🏠', '🏠🏠🏠', '', '🏢'];
const STAGE_LABEL  = ['빈 땅', '빌라×1', '빌라×2', '빌라×3', '', '아파트'];

// BRAINSTORM 7-2: 시세 × RENT_RATIO[stage] 비율 통행료
// 정보성 표라 owner 없어도 projection 보이게 가짜 owner=0 주입 (실제 게임 로직엔 영향 X)
const stageRents = (state, pos) => {
  const ts = state.tileState[pos] ?? {};
  return [0, 1, 2, 3, 5].map((key) => {
    const fakeState = {
      ...state,
      tileState: {
        ...state.tileState,
        [pos]: { ...ts, stage: key, owner: ts.owner ?? 0, mortgaged: false },
      },
    };
    return { key, rent: rentFromStage(fakeState, pos) };
  });
};

function VillaMarks({ count = 0, active = false }) {
  return (
    <span className="inline-flex items-center justify-center gap-0.5">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={cn(
            'inline-block text-[13px] leading-none drop-shadow-[0_1px_0_rgba(15,12,10,0.45)]',
            active && n <= count ? 'opacity-100' : 'opacity-20 grayscale',
          )}
        >
          🏠
        </span>
      ))}
    </span>
  );
}
// PREMIUM 골드별 컴포넌트
function PremiumBadge({ premium }) {
  if (!premium || premium <= 0) return null;
  const starCount = Math.min(Math.ceil(premium / 25), 3);
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-monopoly-gold/60 bg-black/30 px-2.5 py-1 backdrop-blur-sm">
      <div className="flex gap-0.5">
        {Array.from({ length: starCount }).map((_, i) => (
          <span
            key={i}
            className="text-[11px] drop-shadow-[0_0_4px_rgba(255,215,0,0.9)]"
            style={{ color: '#FFD700' }}
          >
            ★
          </span>
        ))}
      </div>
      <span
        className="font-display text-[9px] font-bold uppercase tracking-[0.2em]"
        style={{ color: '#FFD700' }}
      >
        Premium +{premium}%
      </span>
    </div>
  );
}

// 단계 progress 도장 (빌라 3 + 아파트)
function StageProgress({ currentStage, color }) {
  const PROGRESS_STAGES = [1, 2, 3, 5];
  const fill = COLOR_STAGE_FILL[color] || 'bg-prop-brown';
  return (
    <div className="grid grid-cols-4 gap-1">
      {PROGRESS_STAGES.map((stageKey) => {
        const active = stageKey === 5 ? currentStage === 5 : currentStage >= stageKey && currentStage < 5;
        return (
          <div
            key={stageKey}
            className={cn(
              'h-2 rounded-[3px] border border-ink-line/40 transition-all',
              active ? fill : 'bg-white/28',
            )}
          />
        );
      })}
    </div>
  );
}

function RailButton({ children, tone = 'paper', className, ...props }) {
  const toneClass = {
    paper: 'bg-white text-ink hover:bg-parchment-50',
    red: 'bg-monopoly-red text-white hover:bg-monopoly-red',
    gold: 'bg-monopoly-gold text-ink hover:bg-monopoly-gold',
    green: 'bg-parchment-100 text-ink hover:bg-parchment-100',
    blue: 'bg-[#1769d8] text-white hover:bg-[#1769d8]',
    black: 'bg-[#111827] text-white hover:bg-[#111827]',
    ghost: 'bg-parchment-100 text-ink hover:bg-parchment-100',
  }[tone] ?? 'bg-white text-ink hover:bg-parchment-50';

  return (
    <button
      type="button"
      className={cn(
        'rail-button min-h-[48px] rounded-md border-2 border-ink-line px-2 py-2 font-display text-[10px] font-extrabold uppercase leading-tight tracking-[0.08em]',
        'shadow-[0_3px_0_0_#0F0C0A,0_8px_12px_-10px_rgba(0,0,0,0.7)] transition',
        'active:translate-y-px active:shadow-[0_2px_0_0_#0F0C0A]',
        'disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-ink/30 disabled:shadow-[0_2px_0_0_#0F0C0A]',
        toneClass,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function SignatureContract({ open, title, message, signerName = 'Player', tone = 'blue', onConfirm, onCancel }) {
  const [signed, setSigned] = useState(false);
  if (!open) return null;
  const isDanger = tone === 'red';
  return (
    <div className="absolute inset-2 z-[40] grid place-items-center rounded-lg border border-white/35 bg-slate-950/78 p-3 text-center text-white shadow-[0_0_26px_rgba(15,23,42,0.55)] backdrop-blur-[10px]">
      <div className={cn('rounded-full border px-3 py-1 font-display text-[9px] font-black uppercase tracking-[0.18em]', isDanger ? 'border-red-200/70 bg-red-500/28 text-red-100' : 'border-blue-200/70 bg-blue-500/28 text-blue-100')}>
        {title}
      </div>
      <div className="mt-2 font-board text-[17px] leading-tight">{message}</div>
      <div className="relative mt-3 h-[78px] w-full overflow-hidden rounded-lg border-2 border-white/45 bg-[#fffaf0] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
        <div className="absolute inset-x-4 bottom-5 h-px bg-ink/25" />
        {signed && (
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 260 78" aria-hidden="true">
            <motion.path d="M30 48 C72 22, 84 66, 118 42 S174 24, 226 46" fill="none" stroke={isDanger ? '#991B1B' : '#1D4ED8'} strokeWidth="3.6" strokeLinecap="round" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 0.85, ease: 'easeInOut' }} />
          </svg>
        )}
        <motion.div className="absolute bottom-4 left-9 right-9 text-center text-[28px] font-black italic leading-none text-ink/86" style={{ fontFamily: 'Brush Script MT, Segoe Script, cursive' }} initial={false} animate={signed ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}>
          {signerName}
        </motion.div>
      </div>
      <div className="mt-3 grid w-full grid-cols-2 gap-2">
        <button type="button" className={cn('min-h-[34px] rounded-md border px-2 font-board text-[14px] text-white shadow-[0_2px_0_rgba(15,23,42,0.9)] active:translate-y-px active:shadow-none', isDanger ? 'border-red-200/70 bg-red-600' : 'border-blue-200/70 bg-blue-500', signed && 'animate-pulse')} onClick={() => { if (!signed) { setSigned(true); return; } onConfirm?.(); }}>
          {signed ? '확인' : '사인하기'}
        </button>
        <button type="button" className="min-h-[34px] rounded-md border border-white/50 bg-white/18 px-2 font-board text-[14px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.32)] active:translate-y-px" onClick={onCancel}>
          취소
        </button>
      </div>
    </div>
  );
}

function PropertyActionRail({
  isEmpty,
  isOpponentOwned,
  isOwn,
  canBuy,
  hasPropertySlot = true,
  canPay,
  canBuild,
  currentStage,
  hasStageChange,
  price,
  rent,
  visitor,
  visitorId,
  owner,
  pos,
  initialStage,
  buildBlockReason,
  cashDelta = 0,
  mortgaged = false,
  mortgageAmount = 0,
  mortgageEstimate = 0,
  propertyColor = '#1769d8',
  canMortgage = false,
  mortgageDisabledReason = '',
  onClose,
  onBuy,
  onPayRent,
  onTradeOpen,
  onTradeSelectOpen,
  onRecoveryOpen,
  onDevelop,
  onMortgage,
  onRepayMortgage,
  onOpenLoan,
  onSell,
  stageConfirmed = false,
  onConfirmStage,
  onCancelStage,
  signerName,
}) {
  const [pendingMortgageSign, setPendingMortgageSign] = useState(false);

  return (
    <aside className={cn('property-action-rail relative order-2 flex shrink-0 flex-wrap gap-2 rounded-lg border-2 border-ink-line bg-parchment-50 p-2 shadow-[0_3px_0_0_#0F0C0A,0_12px_22px_-14px_rgba(0,0,0,0.75)]', isEmpty ? 'w-[min(80vw,420px)] justify-center' : isOwn ? 'w-[min(92vw,336px)] sm:order-1 sm:w-[220px] sm:self-start' : 'w-[min(92vw,336px)] sm:order-1 sm:w-[124px] sm:flex-col sm:self-start')}>
      <div className="hidden rounded-md border-2 border-ink-line bg-ink px-2 py-1 text-center font-display text-[9px] font-extrabold uppercase tracking-[0.14em] text-white sm:block">
        메뉴
      </div>

      {isEmpty && (
        <>
          <RailButton
            tone="red"
            className="flex-1 sm:flex-none"
            disabled={!canBuy}
            onClick={() => {
              const ok = onBuy?.(visitorId, pos);
              if (ok !== false) onClose?.();
            }}
          >
            매입<br />{fmt(price)}만
          </RailButton>
          <RailButton tone="ghost" className="flex-1 sm:flex-none" onClick={onClose}>
            패스
          </RailButton>
          {!canBuy && (
            <div className="basis-full rounded-md border border-monopoly-deep/40 bg-white px-2 py-1.5 text-center font-display text-[9px] font-bold uppercase leading-tight text-monopoly-deep sm:basis-auto">
              {!hasPropertySlot ? '보유 8개 초과 불가 · 하나 정리 후 매입' : `잔액 ${fmt(visitor?.cash)}만`}
            </div>
          )}
        </>
      )}

      {isOpponentOwned && (
        <>
          <RailButton
            tone="red"
            className="flex-1 sm:flex-none"
            disabled={!canPay}
            onClick={() => {
              onPayRent?.(visitorId, pos);
              onClose?.();
            }}
          >
            통행료<br />{fmt(rent)}만
          </RailButton>
          <RailButton
            tone="gold"
            className="flex-1 sm:flex-none"
            onClick={() => onTradeOpen?.(visitorId, owner, pos)}
          >
            거래<br />제안
          </RailButton>
          <RailButton
            tone={canPay ? 'paper' : 'red'}
            className="flex-1 sm:flex-none"
            onClick={() => onRecoveryOpen?.(visitorId, rent)}
          >
            {canPay ? '회생' : '회생 시도'}
          </RailButton>
        </>
      )}

      {isOwn && (
        <>
          <RailButton
            tone={mortgaged ? 'gold' : 'blue'}
            className="basis-full min-h-[44px]"
            style={mortgaged ? undefined : { backgroundColor: propertyColor, borderColor: '#0F0C0A', color: ['#AAE0FA', '#FEF200'].includes(propertyColor) ? '#17120c' : '#fff' }}
            disabled={mortgaged ? (visitor?.cash ?? 0) < mortgageAmount : !canMortgage}
            title={mortgaged ? `상환금 ${fmt(mortgageAmount)}만` : mortgageDisabledReason || `대출금 ${fmt(mortgageEstimate)}만`}
            onClick={() => {
              if (mortgaged) onRepayMortgage?.(visitorId, pos);
              else setPendingMortgageSign(true);
            }}
          >
            {mortgaged ? `상환하기 ${fmt(mortgageAmount)}만` : <>담보대출<br />{fmt(mortgageEstimate)}만</>}
          </RailButton>

          <div className="grid basis-full grid-cols-2 gap-2">
            <RailButton
              tone="red"
              className="min-h-[58px] border-red-950 bg-monopoly-red text-[14px] text-white hover:bg-monopoly-red"
              disabled={!canBuild || currentStage >= 5}
              title={buildBlockReason ?? '집짓기'}
              onClick={() => onDevelop?.(visitorId, pos, +1, initialStage)}
            >
              + 집짓기
            </RailButton>
            <RailButton
              tone="ghost"
              className={cn('min-h-[58px] border-[#7c6746] !bg-slate-200 text-[14px] hover:!bg-slate-200', currentStage <= 0 ? '!text-ink/35' : '!text-ink')}
              disabled={currentStage <= 0}
              onClick={() => onDevelop?.(visitorId, pos, -1, initialStage)}
            >
              - 집철거
            </RailButton>
          </div>

          <div className="flex basis-full flex-col items-center justify-start gap-2 rounded-lg border-2 border-ink-line bg-[linear-gradient(135deg,#111827_0%,#020617_100%)] bg-[length:100%_100%] px-2 pb-1.5 pt-5 text-center text-white shadow-[0_3px_0_#0F0C0A,0_0_16px_rgba(15,23,42,0.46)]">
            <div className="mx-auto inline-flex rounded-full border border-white/28 bg-emerald-500/90 px-2.5 py-0.5 font-display text-[8px] font-black uppercase tracking-[0.18em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_0_10px_rgba(16,185,129,0.42)]">내 예금액</div>
            <div className="font-display text-[22px] font-black leading-none tabular-nums text-white drop-shadow-[0_1px_0_rgba(0,0,0,0.8)]">
              <AnimatedCash value={visitor?.cash ?? 0} neutralClassName="text-white" rollingEffect={false} />만
            </div>
            <div className="flex min-h-[34px] w-full items-center justify-center">
              {cashDelta !== 0 ? (
                <div className={cn('rounded-md border px-2 py-1 font-display text-[15px] font-black leading-none tabular-nums', cashDelta < 0 ? 'border-red-700 bg-red-50 text-red-700 animate-pulse' : 'border-emerald-700 bg-emerald-50 text-emerald-700')}>
                  {cashDelta > 0 ? '+' : ''}{fmt(cashDelta)}만
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenLoan?.(visitorId)}
                  className="mx-auto block min-h-[28px] w-[78%] rounded-md border-2 border-ink-line bg-monopoly-gold px-1.5 py-1 font-display text-[10px] font-black leading-tight text-ink shadow-[0_2px_0_#0F0C0A] transition hover:bg-[#ffe38a] active:translate-y-px active:shadow-[0_1px_0_#0F0C0A]"
                >
                  대출하기
                </button>
              )}
            </div>
            <div className="mt-0 min-h-[8px] text-[10px] font-bold text-white/82">
              {hasStageChange ? <span className="animate-pulse">{stageConfirmed ? '확정됨 · X 닫으면 반영' : '미리보기 · 아직 미반영'}</span> : mortgaged ? '대출 중 · 월세 0' : ''}
            </div>
          </div>

          <div className="grid basis-full grid-cols-2 gap-2">
            <RailButton
              tone="green"
              className="min-h-[48px] border-emerald-700 bg-[linear-gradient(135deg,rgba(236,253,245,0.95)_0%,rgba(209,250,229,0.92)_50%,rgba(167,243,208,0.88)_100%)] text-[15px] text-ink shadow-[0_3px_0_#065f46,0_0_0_2px_rgba(16,185,129,0.28),0_0_18px_rgba(16,185,129,0.52)]"
              disabled={!hasStageChange || stageConfirmed}
              onClick={onConfirmStage}
            >
              {stageConfirmed ? '확정됨' : '확정'}
            </RailButton>
            <RailButton
              tone="ghost"
              className={cn('min-h-[48px] !bg-slate-200 text-[15px] hover:!bg-slate-200', !hasStageChange ? '!text-ink/35' : '!text-ink')}
              disabled={!hasStageChange}
              onClick={onCancelStage}
            >
              취소
            </RailButton>
          </div>

        </>
      )}

      <SignatureContract
        open={pendingMortgageSign}
        title="담보대출 계약"
        message={`대출금 ${fmt(mortgageEstimate)}만`}
        signerName={signerName}
        tone="blue"
        onConfirm={() => {
          onMortgage?.(visitorId, pos);
          setPendingMortgageSign(false);
        }}
        onCancel={() => setPendingMortgageSign(false)}
      />
    </aside>
  );
}

export default function PropertyModal({ open, onClose, pos, visitorId, onBuy }) {
  const state       = useGameStore((s) => s.state);
  const storeBuy    = useGameStore((s) => s.buyProperty);
  const handleBuy   = onBuy ?? storeBuy;
  const handlePayRent  = useGameStore((s) => s.payRent);
  const handleTradeOpen    = useGameStore((s) => s.openTradeModal);
  const handleTradeSelectOpen = useGameStore((s) => s.openTradeSelect);
  const handleRecoveryOpen = useGameStore((s) => s.openRecoveryModal);
  const applyDevelop  = useGameStore((s) => s.developProperty);
  const handleMortgage = useGameStore((s) => s.takePropertyLoan);
  const handleRepayMortgage = useGameStore((s) => s.repayPropertyLoan);
  const handleOpenLoan = useGameStore((s) => s.openLoanModal);
  const handleSellMarket = useGameStore((s) => s.sellPropertyMarket);

  // 모달 열렸을 때의 단계 — 세션 내 빌드 취소 vs 기존 판매 판별 기준
  // ⚠️ deps 에 state 넣으면 매 변경마다 리셋되니까 open/pos 만으로 lock
  const [initialStage, setInitialStage] = useState(0);
  const [initialCash, setInitialCash] = useState(0);
  const [draftStage, setDraftStage] = useState(0);
  const [stageConfirmed, setStageConfirmed] = useState(false);
  const [pendingSellSign, setPendingSellSign] = useState(false);
  useEffect(() => {
    if (open && pos != null) {
      const s = useGameStore.getState().state;
      const lockedStage = s?.tileState?.[pos]?.stage ?? 0;
      setInitialStage(lockedStage);
      setDraftStage(lockedStage);
      setInitialCash(s?.players?.[visitorId]?.cash ?? 0);
      setStageConfirmed(false);
    }
  }, [open, pos, visitorId]);

  if (!state || pos == null) return null;

  const tile = state.board.tiles[pos];
  if (!tile || tile.type !== 'property') return null;

  const ts              = state.tileState[pos] ?? {};
  const price           = currentPrice(state, pos);
  const mortgageEstimate = round10(price * LTV_RATIO);
  const owner           = ts.owner;
  const visitor         = state.players[visitorId];
  const isOwn           = owner === visitorId;
  const isEmpty         = owner == null;
  const isOpponentOwned = !isEmpty && !isOwn;
  const rent            = isOpponentOwned ? computeRent(state, visitorId, pos) : 0;
  const canPay          = visitor && visitor.cash >= rent;
  const ownedPropertyCount = Object.entries(state.tileState ?? {}).filter(([ownedPos, tileState]) => {
    const ownedTile = state.board?.tiles?.[Number(ownedPos)];
    return ownedTile?.type === 'property' && tileState?.owner === visitorId;
  }).length;
  const hasPropertySlot = ownedPropertyCount < 8;
  const canBuy          = visitor && visitor.cash >= price && hasPropertySlot;
  const storeStage      = ts.stage ?? 0;
  const currentStage    = isOwn ? draftStage : storeStage;
  const skylineSlot     = COLOR_TO_SKYLINE[tile.color];
  const rents           = stageRents(state, pos);
  // 집짓기 가능 여부 (룰 §6): 색깔 독점 OR freeBuild 옵션 + 저당 X
  const monopoly        = isOwn && hasColorMonopoly(state, visitorId, tile.color);
  const freeBuild       = state.options?.freeBuild ?? true; // gameState 디폴트와 일치
  const previewCashDelta = isOwn ? simulateDevelopmentCashDelta({ fromStage: initialStage, toStage: draftStage, initialStage, houseCost: tile.houseCost ?? 0 }) : 0;
  const previewCash     = (visitor?.cash ?? 0) + previewCashDelta;
  const canBuild        = isOwn && !ts.mortgaged && (monopoly || freeBuild);
  const hasStageChange = isOwn && draftStage !== initialStage;
  const cashDelta = previewCash - initialCash;
  const visitorPreview = isOwn && visitor ? { ...visitor, cash: previewCash } : visitor;
  const canMortgage     = isOwn && !hasStageChange && !ts.mortgaged;
  const mortgageDisabledReason = hasStageChange
    ? '건설 변경 확정/취소 후 대출 가능'
    : ts.mortgaged
      ? '이미 담보대출 중'
      : '';
  const signerName = (visitor?.name || CHAR_META[visitor?.character]?.name || `P${visitorId + 1}`).replace(/[^A-Za-z0-9가-힣 ]/g, '');
  const sellAmount = round10(price * 0.7);
  const buildBlockReason = !isOwn
    ? '본인 부동산만 건설 가능'
    : ts.mortgaged
      ? '담보대출 상태에선 건설 불가'
      : !canBuild
        ? `${tile.color} 그룹 독점 시 건설 가능`
        : null;

  const handleDraftDevelop = (playerId, propertyPos, delta) => {
    if (playerId !== visitorId || propertyPos !== pos || !canBuild) return;
    setDraftStage((prev) => {
      const next = nextBuildStage(prev, delta);
      if (next === prev) return prev;
      if (delta > 0) {
        const stepCost = -developmentCashDelta({ fromStage: prev, toStage: next, initialStage, houseCost: tile.houseCost ?? 0 });
        const latestPreviewCash = (visitor?.cash ?? 0) + simulateDevelopmentCashDelta({ fromStage: initialStage, toStage: prev, initialStage, houseCost: tile.houseCost ?? 0 });
        if (latestPreviewCash < stepCost) return prev;
      }
      setStageConfirmed(false);
      return next;
    });
  };

  const handleCancelDevelopment = () => {
    setDraftStage(initialStage);
    setStageConfirmed(false);
  };

  const applyConfirmedDevelopment = () => {
    if (!stageConfirmed || draftStage === initialStage) return;
    let stage = initialStage;
    for (let guard = 0; guard < 8 && stage !== draftStage; guard += 1) {
      const direction = draftStage > stage ? +1 : -1;
      const next = nextBuildStage(stage, direction);
      applyDevelop?.(visitorId, pos, direction, initialStage);
      stage = next;
    }
  };

  const handleModalClose = () => {
    applyConfirmedDevelopment();
    onClose?.();
  };

  const cardShadow = `0 4px 0 0 #0F0C0A, 0 0 0 4px ${(COLOR_HEX[tile.color] ?? '#955436')}cc, 0 0 0 9px ${(COLOR_HEX[tile.color] ?? '#955436')}55, 0 0 28px 6px ${(COLOR_HEX[tile.color] ?? '#955436')}99, 0 0 60px 14px ${(COLOR_HEX[tile.color] ?? '#955436')}55, 0 14px 32px -4px rgba(0,0,0,0.55)`;

  return (
    <ModalBase
      open={open}
      onClose={handleModalClose}
      hideClose
      surface={false}
      className="w-auto max-w-[calc(100vw-24px)] !overflow-visible scale-[0.94] sm:scale-[0.9]"
    >
      <div className={cn('property-modal-shell flex max-h-[88vh] flex-col items-center gap-3 overflow-visible p-8 no-scrollbar', isEmpty ? 'sm:flex-col' : 'sm:flex-row sm:items-start sm:gap-4', isOwn && 'sm:items-center')}> 
        <PropertyActionRail
          isEmpty={isEmpty}
          isOpponentOwned={isOpponentOwned}
          isOwn={isOwn}
          canBuy={canBuy}
          hasPropertySlot={hasPropertySlot}
          canPay={canPay}
          canBuild={canBuild}
          currentStage={currentStage}
          hasStageChange={hasStageChange}
          price={price}
          rent={rent}
          visitor={visitorPreview}
          visitorId={visitorId}
          owner={owner}
          pos={pos}
          initialStage={initialStage}
          buildBlockReason={buildBlockReason}
          cashDelta={cashDelta}
          mortgaged={!!ts.mortgaged}
          mortgageAmount={ts.mortgageAmount ?? 0}
          mortgageEstimate={mortgageEstimate}
          propertyColor={COLOR_HEX[tile.color] ?? '#1769d8'}
          canMortgage={canMortgage}
          mortgageDisabledReason={mortgageDisabledReason}
          onClose={onClose}
          onBuy={handleBuy}
          onPayRent={handlePayRent}
          onTradeOpen={handleTradeOpen}
          onTradeSelectOpen={handleTradeSelectOpen}
          onRecoveryOpen={handleRecoveryOpen}
          onDevelop={handleDraftDevelop}
          onMortgage={handleMortgage}
          onRepayMortgage={handleRepayMortgage}
          onOpenLoan={handleOpenLoan}
          onSell={handleSellMarket}
          stageConfirmed={stageConfirmed}
          onConfirmStage={() => setStageConfirmed(hasStageChange)}
          onCancelStage={handleCancelDevelopment}
          signerName={signerName}
        />
        <div
          className={cn('property-deed-card deed-surface relative order-1 shrink-0 overflow-hidden rounded-[10px] border-2 text-ink ring-1 ring-inset ring-white/40 backdrop-blur-[10px]', ts.mortgaged ? 'border-ink-line' : 'border-white/72', isEmpty ? 'w-[min(80vw,420px)]' : isOwn ? 'w-[min(88vw,286px)] sm:order-2' : 'w-[min(92vw,312px)] sm:order-2')}
          style={{ boxShadow: `${cardShadow}, inset 0 1px 0 rgba(255,255,255,0.86)` }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleModalClose();
            }}
            className="absolute right-2 top-2 z-[10000] grid h-9 w-9 place-items-center rounded-full border-2 border-ink-line bg-ink text-lg font-extrabold leading-none text-white shadow-[0_2px_0_0_#0F0C0A,0_0_0_3px_rgba(255,255,255,0.25),0_6px_12px_rgba(0,0,0,0.5)] transition-colors hover:bg-monopoly-red"
            aria-label="닫기"
          >
            ✕
          </button>

      {/* ══ 1. 헤더 — 진한 단색 + 스카이라인 + TITLE DEED + PREMIUM 별 ══ */}
      <div
        className={cn(
          'relative overflow-hidden border-b-2 border-ink-line',
          COLOR_HEADER_BG[tile.color] || 'bg-neutral-600',
        )}
        style={{ aspectRatio: '5 / 1.35' }}
      >
        {/* 스카이라인 — 투명도 낮게 겹쳐서 헤더 색감 살림 */}
        {skylineSlot && (
          <AssetFrame
            slot={skylineSlot}
            rounded="rounded-none"
            className="absolute inset-0 !aspect-auto h-full w-full scale-110 origin-center"
            style={{ opacity: 0.2, mixBlendMode: 'luminosity' }}
          />
        )}
        {/* 상단 그라데이션 — 라벨 가독성 */}
        <div
          className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/40 to-transparent"
          aria-hidden="true"
        />
        {/* 하단 그라데이션 */}
        <div
          className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/30 to-transparent"
          aria-hidden="true"
        />

        {/* TITLE DEED · 권리증 라벨 */}
        <div className="absolute inset-x-0 top-0 px-3 pt-2 text-center">
          <div
            className={cn(
              'font-display text-[8px] font-bold uppercase leading-none',
              'tracking-[0.28em]',
              COLOR_HEADER_TEXT[tile.color] || 'text-white',
              'drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]',
            )}
          >
            Title Deed - {'\uAD8C\uB9AC\uC99D'}
          </div>
        </div>

        {/* PREMIUM 별 배지 — 헤더 하단 중앙 */}
        {ts.premium > 0 && (
          <div className="absolute inset-x-0 bottom-2 flex justify-center">
            <PremiumBadge premium={ts.premium} />
          </div>
        )}

        {/* 담보대출 표시 — 헤더 우상단 */}
        {ts.mortgaged && (
          <div className="absolute right-3 top-2 z-[20] rotate-[8deg]">
            <div className="border-2 border-red-950 bg-monopoly-red px-2.5 py-1 font-display text-[11px] font-black tracking-widest text-white shadow-[0_2px_0_#7f1d1d,0_0_14px_rgba(220,38,38,0.72)]">
              담보
            </div>
          </div>
        )}
      </div>

      {/* ══ 2. 도시명 헤드라인 ══ */}
      <div className="border-b-2 border-ink-line bg-parchment-50/92 px-3 py-2 text-center backdrop-blur-[6px]">
        <h2 className="font-board font-extrabold text-[23px] leading-none text-ink tracking-tight">
          {tile.names.ko}
        </h2>
        {tile.names.region && (
          <div className="mt-1 font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-ink/55">
            {tile.names.region}
            {tile.names.en && (
              <span className="ml-1 opacity-70">- {tile.names.en}</span>
            )}
          </div>
        )}
      </div>

      {/* ══ 3. 매입가 / 현시세 — 다크 캡슐 한 줄 ══ */}
      <div className="border-b-2 border-ink-line bg-parchment-100/90 px-3 py-2 backdrop-blur-[6px]">
        <div
          className="flex items-center justify-around rounded-lg px-3 py-2"
          style={{ backgroundColor: '#1A1612' }}
        >
          {/* 매입가 — basePrice (정규화된 실제 매입 가격) */}
          <div className="text-center">
            <div className="font-display text-[8.5px] font-bold uppercase tracking-widest text-white">{'\uB9E4\uC785\uAC00'}
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="font-display text-[22px] font-bold leading-none tabular-nums text-white">
                {tile.basePrice ?? '-'}
              </span>
              <span className="font-display text-[10px] font-semibold text-white/55">{'\uB9CC'}</span>
            </div>
          </div>
          {/* 구분선 */}
          <div className="h-8 w-px bg-white/20" />
          {/* 현시세 */}
          <div className="text-center">
            <div className="font-display text-[8.5px] font-bold uppercase tracking-widest text-[#FFD700]">{'\uD604\uC2DC\uC138'}
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span
                className={cn(
                  'font-display text-[22px] font-bold leading-none tabular-nums',
                  price < (tile.basePrice ?? 0)
                    ? 'text-monopoly-red drop-shadow-[0_0_8px_rgba(211,47,47,0.5)]'
                    : 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]',
                )}
              >
                {price}
              </span>
              <span className="font-display text-[10px] font-semibold text-white/55">{'\uB9CC'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══ 4. 단계별 임대료 표 — 이모티콘 + 가격 강조 ══ */}
      <div className="bg-parchment-50/88 px-4 py-2 backdrop-blur-[6px]">
        <div className="overflow-hidden rounded-md border-2 border-ink-line/70 bg-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
          {rents.map((r, i) => {
            const isApt     = r.key === 5;
            const isCurrent = r.key === currentStage;
            return (
              <div
                key={r.key}
                className={cn(
                  'flex items-center justify-between border-b border-ink/20 px-3 py-2 last:border-b-0',
                  isCurrent && 'bg-monopoly-red text-white',
                  !isCurrent && isApt && 'bg-monopoly-gold/12',
                  !isCurrent && !isApt && (i % 2 === 0 ? 'bg-parchment-50/90' : 'bg-parchment-100/90'),
                )}
              >
                {/* 단계 표시 */}
                <div className="flex items-center gap-3">
                  {isApt ? (
                    <span className="text-[18px] leading-none">🏢</span>
                  ) : r.key === 0 ? (
                    <span className="font-board text-[12px] leading-none text-inherit/70">빈 땅</span>
                  ) : (
                    <VillaMarks count={r.key} active />
                  )}
                  <span
                    className={cn(
                      'font-board text-[13px] leading-none',
                      isCurrent ? 'text-white' : 'text-ink/70',
                    )}
                  >
                    {STAGE_LABEL[r.key]}
                  </span>
                </div>
                {/* 임대료 */}
                <div className="flex items-baseline gap-0.5">
                  <span
                    className={cn(
                      'font-display font-bold tabular-nums leading-none',
                      isApt ? 'text-[16px]' : 'text-[14px]',
                      isCurrent
                        ? 'text-white'
                        : isApt
                          ? 'text-ink'
                          : 'text-ink/85',
                    )}
                  >
                    {r.rent}
                  </span>
                  <span
                    className={cn(
                      'font-display text-[10px] font-semibold',
                      isCurrent ? 'text-white/70' : 'text-ink/50',
                    )}
                  >
                    만
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══ 5. 소유 현황 + 단계 progress ══ */}
      <div className="border-t-2 border-ink-line bg-parchment-100/90 px-4 py-2 backdrop-blur-[6px]">
        <StageProgress currentStage={currentStage} color={tile.color} />
      </div>

        </div>
        {isOwn && (
          <aside className="relative order-3 flex w-[min(92vw,156px)] shrink-0 flex-col justify-end self-stretch rounded-lg border-2 border-ink-line bg-parchment-50 p-2 shadow-[0_3px_0_0_#0F0C0A,0_12px_22px_-14px_rgba(0,0,0,0.75)] sm:self-start">
            <div className="mb-2 rounded-md border-2 border-ink-line bg-ink px-2 py-1 text-center font-display text-[9px] font-extrabold uppercase tracking-[0.14em] text-white">
              매도하기
            </div>
            <button
              type="button"
              disabled={hasStageChange || !!ts.mortgaged}
              title={ts.mortgaged ? '담보대출 상환 후 매도 가능' : hasStageChange ? '건설 변경 확정/취소 후 매도 가능' : `현재 시세 70% · ${fmt(sellAmount)}만`}
              onClick={() => setPendingSellSign(true)}
              className="mt-auto min-h-[76px] rounded-lg border-2 border-orange-950 bg-[linear-gradient(180deg,#fff7ed_0%,#fb923c_100%)] px-2 py-3 font-board text-[17px] font-black leading-tight text-ink shadow-[0_3px_0_#7c2d12] transition active:translate-y-px active:shadow-[0_2px_0_#7c2d12] disabled:cursor-not-allowed disabled:opacity-45"
            >
              매도하기<br />{fmt(sellAmount)}만
            </button>
            <SignatureContract
              open={pendingSellSign}
              title="매도 계약"
              message={`${tile.names?.ko ?? tile.name} · 매도금 ${fmt(sellAmount)}만`}
              signerName={signerName}
              tone="red"
              onConfirm={() => {
                const ok = handleSellMarket?.(visitorId, pos);
                setPendingSellSign(false);
                if (ok !== false) onClose?.();
              }}
              onCancel={() => setPendingSellSign(false)}
            />
          </aside>
        )}
      </div>
    </ModalBase>
  );
}




