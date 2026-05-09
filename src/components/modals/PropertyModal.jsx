// 부동산 도착 모달 — 정통 모노폴리 권리증 결 + 참고 이미지 화려함 결합
// 리디자인: 진한 단색 헤더 + PREMIUM 별 + 다크 캡슐 가격 + 이모티콘 임대료 표 + 단계 progress
import { useState, useEffect } from 'react';
import { useGameStore } from '@/stores/gameStore.js';
import { currentPrice, rentFromStage, hasColorMonopoly } from '@/engine/inflation.js';
import { computeRent } from '@/engine/rent.js';
import { cn } from '@/lib/cn.js';
import ModalBase from './ModalBase.jsx';
import AssetFrame from '@/components/AssetFrame.jsx';
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
const STAGE_EMOJI  = ['□', '🏠', '🏠🏠', '🏠🏠🏠', '🏢', '🏢'];
const STAGE_LABEL  = ['빈 땅', '빌라×1', '빌라×2', '빌라×3', '아파트', '아파트'];

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
  const PROGRESS_STAGES = [1, 2, 3]; // 빌라 단계
  if (currentStage === 5) {
    const glow = COLOR_HEX[color] ?? '#C9A24B';
    return (
      <div
        className="relative h-3 overflow-hidden rounded-full border border-ink-line/60"
        style={{
          background: `linear-gradient(90deg, ${glow} 0%, #FFD54F 52%, ${glow} 100%)`,
          boxShadow: `0 0 0 1px ${glow}55, 0 0 14px ${glow}cc, 0 0 30px ${glow}88`,
        }}
      >
        <div
          className="absolute inset-y-0 left-0 w-1/3 opacity-40"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.9) 50%, transparent 100%)',
          }}
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {PROGRESS_STAGES.map((stageKey) => (
        <div
          key={stageKey}
          className={cn(
            'flex-1 h-2 rounded-[3px] border border-ink-line/50 transition-all',
            currentStage >= stageKey && currentStage < 5
              ? COLOR_STAGE_FILL[color] || 'bg-prop-brown'
              : 'bg-parchment-200',
          )}
        />
      ))}
      {/* 아파트 도장 — 살짝 넓고 골드 */}
      <div
        className={cn(
          'h-2 w-4 shrink-0 rounded-[3px] border border-ink-line/50',
          currentStage === 5 ? 'bg-monopoly-gold' : 'bg-parchment-200',
        )}
      />
    </div>
  );
}

function RailButton({ children, tone = 'paper', className, ...props }) {
  const toneClass = {
    paper: 'bg-white text-ink hover:bg-parchment-50',
    red: 'bg-monopoly-red text-white hover:bg-monopoly-deep',
    gold: 'bg-monopoly-gold text-ink hover:bg-[#ffe38a]',
    green: 'bg-white text-[#008f32] hover:bg-[#f4fff6]',
    ghost: 'bg-neutral-200 text-ink hover:bg-neutral-100',
  }[tone] ?? 'bg-white text-ink hover:bg-parchment-50';

  return (
    <button
      type="button"
      className={cn(
        'rail-button min-h-[42px] rounded-md border-2 border-ink-line px-2 py-2 font-display text-[10px] font-extrabold uppercase leading-tight tracking-[0.08em]',
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

function PropertyActionRail({
  isEmpty,
  isOpponentOwned,
  isOwn,
  canBuy,
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
  onClose,
  onBuy,
  onPayRent,
  onTradeOpen,
  onTradeSelectOpen,
  onRecoveryOpen,
  onDevelop,
  onConfirmStage,
  onCancelStage,
}) {
  return (
    <aside className="property-action-rail order-2 flex w-[min(92vw,336px)] shrink-0 flex-wrap gap-2 rounded-lg border-2 border-ink-line bg-parchment-50 p-2 shadow-[0_3px_0_0_#0F0C0A,0_12px_22px_-14px_rgba(0,0,0,0.75)] sm:order-1 sm:w-[112px] sm:flex-col sm:self-start">
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
              onBuy?.(visitorId, pos);
              onClose?.();
            }}
          >
            매입<br />{fmt(price)}만
          </RailButton>
          <RailButton tone="ghost" className="flex-1 sm:flex-none" onClick={onClose}>
            패스
          </RailButton>
          {!canBuy && (
            <div className="basis-full rounded-md border border-monopoly-deep/40 bg-white px-2 py-1.5 text-center font-display text-[9px] font-bold uppercase leading-tight text-monopoly-deep sm:basis-auto">
              잔액 {fmt(visitor?.cash)}만
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
            tone="gold"
            className="flex-1 sm:flex-none"
            onClick={() => onTradeSelectOpen?.(visitorId)}
          >
            거래<br />제의
          </RailButton>
          <RailButton
            tone="red"
            className="flex-1 sm:flex-none"
            disabled={!canBuild || currentStage >= 5}
            title={buildBlockReason ?? '집짓기'}
            onClick={() => onDevelop?.(visitorId, pos, +1, initialStage)}
          >
            집짓기<br />+
          </RailButton>
          <div className="grid flex-1 grid-cols-[32px_1fr_32px] overflow-hidden rounded-md border-2 border-ink-line bg-neutral-200 shadow-[0_3px_0_0_#0F0C0A] sm:flex-none sm:grid-cols-1">
            <button
              type="button"
              disabled={currentStage <= 0}
              onClick={() => onDevelop?.(visitorId, pos, -1, initialStage)}
              className="font-display text-[12px] font-extrabold text-ink transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:text-ink/25 sm:py-1"
              aria-label="철거"
            >
              -
            </button>
            <span className="grid min-h-[30px] place-items-center border-x-2 border-ink-line bg-white font-display text-[15px] font-extrabold tabular-nums text-ink sm:border-x-0 sm:border-y-2">
              {currentStage}
            </span>
            <button
              type="button"
              disabled={!canBuild || currentStage >= 5}
              onClick={() => onDevelop?.(visitorId, pos, +1, initialStage)}
              className="font-display text-[12px] font-extrabold text-ink transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:text-ink/25 sm:py-1"
              aria-label="건설"
            >
              +
            </button>
          </div>
          <RailButton
            tone="green"
            className="flex-1 sm:flex-none"
            disabled={!hasStageChange}
            onClick={onConfirmStage}
          >
            변경<br />확정
          </RailButton>
          <RailButton
            tone="ghost"
            className="flex-1 sm:flex-none"
            disabled={!hasStageChange}
            onClick={onCancelStage}
          >
            취소
          </RailButton>
        </>
      )}
    </aside>
  );
}

export default function PropertyModal({ open, onClose, pos, visitorId }) {
  const state       = useGameStore((s) => s.state);
  const handleBuy   = useGameStore((s) => s.buyProperty);
  const handlePayRent  = useGameStore((s) => s.payRent);
  const handleTradeOpen    = useGameStore((s) => s.openTradeModal);
  const handleTradeSelectOpen = useGameStore((s) => s.openTradeSelect);
  const handleRecoveryOpen = useGameStore((s) => s.openRecoveryModal);
  const handleDevelop  = useGameStore((s) => s.developProperty);

  // 모달 열렸을 때의 단계 — 세션 내 빌드 취소 vs 기존 판매 판별 기준
  // ⚠️ deps 에 state 넣으면 매 변경마다 리셋되니까 open/pos 만으로 lock
  const [initialStage, setInitialStage] = useState(0);
  useEffect(() => {
    if (open && pos != null) {
      const s = useGameStore.getState().state;
      setInitialStage(s?.tileState?.[pos]?.stage ?? 0);
    }
  }, [open, pos]);

  if (!state || pos == null) return null;

  const tile = state.board.tiles[pos];
  if (!tile || tile.type !== 'property') return null;

  const ts              = state.tileState[pos] ?? {};
  const price           = currentPrice(state, pos);
  const owner           = ts.owner;
  const visitor         = state.players[visitorId];
  const isOwn           = owner === visitorId;
  const isEmpty         = owner == null;
  const isOpponentOwned = !isEmpty && !isOwn;
  const rent            = isOpponentOwned ? computeRent(state, visitorId, pos) : 0;
  const canPay          = visitor && visitor.cash >= rent;
  const canBuy          = visitor && visitor.cash >= price;
  const currentStage    = ts.stage ?? 0;
  const skylineSlot     = COLOR_TO_SKYLINE[tile.color];
  const rents           = stageRents(state, pos);
  // 집짓기 가능 여부 (룰 §6): 색깔 독점 OR freeBuild 옵션 + 저당 X
  const monopoly        = isOwn && hasColorMonopoly(state, visitorId, tile.color);
  const freeBuild       = state.options?.freeBuild ?? true; // gameState 디폴트와 일치
  const canBuild        = isOwn && !ts.mortgaged && (monopoly || freeBuild);
  const buildBlockReason = !isOwn
    ? '본인 부동산만 건설 가능'
    : ts.mortgaged
      ? '담보대출 상태에선 건설 불가'
      : !canBuild
        ? `${tile.color} 그룹 독점 시 건설 가능`
        : null;
  const stageDelta = currentStage - initialStage;
  const hasStageChange = isOwn && stageDelta !== 0;

  const revertDevelopmentChange = () => {
    const latestState = useGameStore.getState().state;
    const latestStage = latestState?.tileState?.[pos]?.stage ?? 0;
    const diff = latestStage - initialStage;
    if (diff === 0) return;

    const direction = diff > 0 ? -1 : +1;
    for (let i = 0; i < Math.abs(diff); i += 1) {
      useGameStore.getState().developProperty(visitorId, pos, direction, initialStage);
    }
  };

  const handleCancelDevelopment = () => {
    revertDevelopmentChange();
  };

  const handleModalClose = () => {
    if (hasStageChange) revertDevelopmentChange();
    onClose?.();
  };

  const cardShadow = `0 4px 0 0 #0F0C0A, 0 0 0 4px ${(COLOR_HEX[tile.color] ?? '#955436')}cc, 0 0 0 9px ${(COLOR_HEX[tile.color] ?? '#955436')}55, 0 0 28px 6px ${(COLOR_HEX[tile.color] ?? '#955436')}99, 0 0 60px 14px ${(COLOR_HEX[tile.color] ?? '#955436')}55, 0 14px 32px -4px rgba(0,0,0,0.55)`;

  return (
    <ModalBase
      open={open}
      onClose={handleModalClose}
      hideClose
      surface={false}
      className="w-auto max-w-[calc(100vw-24px)]"
    >
      <div className="property-modal-shell flex max-h-[88vh] flex-col items-center gap-3 overflow-y-auto overflow-x-hidden p-1 no-scrollbar sm:flex-row sm:items-start">
        <PropertyActionRail
          isEmpty={isEmpty}
          isOpponentOwned={isOpponentOwned}
          isOwn={isOwn}
          canBuy={canBuy}
          canPay={canPay}
          canBuild={canBuild}
          currentStage={currentStage}
          hasStageChange={hasStageChange}
          price={price}
          rent={rent}
          visitor={visitor}
          visitorId={visitorId}
          owner={owner}
          pos={pos}
          initialStage={initialStage}
          buildBlockReason={buildBlockReason}
          onClose={onClose}
          onBuy={handleBuy}
          onPayRent={handlePayRent}
          onTradeOpen={handleTradeOpen}
          onTradeSelectOpen={handleTradeSelectOpen}
          onRecoveryOpen={handleRecoveryOpen}
          onDevelop={handleDevelop}
          onConfirmStage={() => setInitialStage(currentStage)}
          onCancelStage={handleCancelDevelopment}
        />
        <div
          className="property-deed-card deed-surface relative order-1 w-[min(92vw,336px)] shrink-0 overflow-hidden sm:order-2"
          style={{ boxShadow: cardShadow }}
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
        style={{ aspectRatio: '5 / 1.65' }}
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
          <div className="absolute right-3 top-2 rotate-[8deg]">
            <div className="border-2 border-monopoly-deep bg-monopoly-red/30 px-2 py-0.5 font-display text-[10px] font-bold tracking-widest text-white backdrop-blur-sm">
              담보대출
            </div>
          </div>
        )}
      </div>

      {/* ══ 2. 도시명 헤드라인 ══ */}
      <div className="border-b-2 border-ink-line bg-parchment-50 px-3 py-2 text-center">
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
      <div className="border-b-2 border-ink-line bg-parchment-100 px-3 py-2">
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
      <div className="bg-parchment-50 px-4 py-3">
        {/* 섹션 라벨 */}
        <div className="mb-2 text-center font-display text-[9px] font-semibold uppercase tracking-[0.22em] text-ink/50">
          Rent - {'\uB2E8\uACC4\uBCC4 \uD1B5\uD589\uB8CC'}
        </div>
        <div className="overflow-hidden rounded-md border-2 border-ink-line">
          {rents.map((r, i) => {
            const isApt     = r.key === 5;
            const isCurrent = r.key === currentStage;
            return (
              <div
                key={r.key}
                className={cn(
                  'flex items-center justify-between border-b border-ink/20 px-3 py-2 last:border-b-0',
                  isCurrent && 'bg-monopoly-red text-white',
                  !isCurrent && isApt && 'bg-monopoly-gold/15',
                  !isCurrent && !isApt && (i % 2 === 0 ? 'bg-parchment-50' : 'bg-parchment-100'),
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
      <div className="border-t-2 border-ink-line bg-parchment-100 px-4 py-2.5">
        {/* 소유자 정보 */}
        {owner != null && (() => {
          const ownerMeta = playerMeta(state, owner);
          return (
          <div className="mb-2 flex items-center justify-center gap-2">
            <span
              className="h-3 w-3 rounded-full border border-ink-line shadow-sm"
              style={{ backgroundColor: ownerMeta.color }}
            />
            <span className="font-display text-[11px] font-bold uppercase tracking-wider text-ink">
              {ownerMeta.name} 소유
            </span>
            <span className="font-display text-[11px] text-ink/40">·</span>
            <span className="font-display text-[11px] font-bold uppercase tracking-wider text-ink/70">
              {STAGE_LABEL[currentStage]}
            </span>
          </div>
          );
        })()}
        {/* 단계 progress 도장 */}
        <StageProgress currentStage={currentStage} color={tile.color} />
        {currentStage === 5 ? (
          <div
            className="mt-1 text-center font-display text-[9px] font-extrabold uppercase tracking-[0.2em]"
            style={{
              color: COLOR_HEX[tile.color] ?? '#C9A24B',
              textShadow: `0 0 10px ${(COLOR_HEX[tile.color] ?? '#C9A24B')}aa`,
            }}
          >
            🏢 아파트 완공
          </div>
        ) : (
          <div className="mt-1 flex justify-between px-0.5">
            <span className="font-display text-[8px] text-ink/40">빈 땅</span>
            <span className="font-display text-[8px] text-ink/40">빌라 ×3</span>
            <span className="font-display text-[8px] text-monopoly-gold/70">아파트</span>
          </div>
        )}
      </div>

        </div>
      </div>
    </ModalBase>
  );
}




