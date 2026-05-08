// 부동산 도착 모달 — 정통 모노폴리 권리증 결 + 참고 이미지 화려함 결합
// 리디자인: 진한 단색 헤더 + PREMIUM 별 + 다크 캡슐 가격 + 이모티콘 임대료 표 + 단계 progress
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
const STAGE_EMOJI  = ['🌱', '🏠', '🏠🏠', '🏠🏠🏠', '🏠🏠🏠🏠', '🏢'];
const STAGE_LABEL  = ['빈 땅', '빌라 1', '빌라 2', '빌라 3', '빌라 4', '아파트'];

// BRAINSTORM 7-2: 시세 × RENT_RATIO[stage] 비율 통행료
// 정보성 표라 owner 없어도 projection 보이게 가짜 owner=0 주입 (실제 게임 로직엔 영향 X)
const stageRents = (state, pos) => {
  const ts = state.tileState[pos] ?? {};
  return [0, 1, 2, 3, 4, 5].map((key) => {
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

// 단계 progress 도장 (빌라 4 + 아파트)
function StageProgress({ currentStage, color }) {
  const PROGRESS_STAGES = [0, 1, 2, 3, 4]; // 빌라 단계
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
      ? '저당 상태에선 건설 불가'
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

  return (
    <>
    {/* ══ 좌측 액션 사이드 패널 — Portal 로 body 직접 렌더 (모달 overflow 우회) ══ */}
    {open && createPortal(
      <div
        className="pointer-events-none fixed top-1/2 z-[55] flex w-[200px] -translate-y-1/2 flex-col gap-2"
        style={{
          // 모달 max-w 480px → 모달 좌측 끝 = 50vw - 240px → 패널 우측 끝 = 그보다 60px 왼쪽
          right: 'calc(50vw + 300px)',
        }}
      >
        {/* 잔고 카드 — CurrentPlayerStage 의 잔고 카드와 동일한 결 (실시간 반영) */}
        <div className="pointer-events-auto inline-flex w-full items-baseline justify-center gap-1.5 rounded-md border-2 border-emerald-700 bg-emerald-100 px-3 py-1.5 shadow-[0_3px_0_0_#0F0C0A]">
          <span className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-900/75">
            잔고
          </span>
          <span className="text-[18px] leading-none">💰</span>
          <span
            className="font-display text-[24px] font-extrabold leading-none text-emerald-800 tabular-nums"
            style={{ letterSpacing: '-0.01em' }}
          >
            {fmt(visitor?.cash ?? 0)}
          </span>
          <span className="font-display text-[11px] font-bold uppercase tracking-widest text-emerald-900/70">
            만
          </span>
        </div>

        {/* 거래 제의 — 미니맵 모달 열기 (상대 부동산 선택 → TradeModal) */}
        <button
          type="button"
          onClick={() => handleTradeSelectOpen?.(visitorId)}
          className="pointer-events-auto inline-flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-md border-2 border-ink-line bg-neutral-300 px-3 py-2 font-display text-[12px] font-extrabold uppercase tracking-[0.18em] text-ink shadow-[0_3px_0_0_#0F0C0A,0_6px_12px_-2px_rgba(0,0,0,0.4)] transition hover:bg-neutral-200 active:translate-y-px active:shadow-[0_1px_0_0_#0F0C0A]"
          title="다른 플레이어와 부동산/현금 거래"
        >
          <span className="text-[16px] leading-none">🤝</span>
          거래 제의
        </button>

        {/* 집짓기 — 라벨(헤더) + (− 단계 +) + 비용/환급 미리보기 */}
        <div
          className={cn(
            'pointer-events-auto flex w-full flex-col items-stretch overflow-hidden rounded-md border-2 border-ink-line bg-neutral-300 shadow-[0_3px_0_0_#0F0C0A,0_6px_12px_-2px_rgba(0,0,0,0.4)]',
            !isOwn && 'opacity-50',
          )}
        >
          <span className="flex items-center justify-center gap-1 border-b-2 border-ink-line/60 bg-neutral-400/60 px-2 py-1 font-display text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink">
            <span className="text-[13px] leading-none">🏠</span>
            집짓기
          </span>
          <div className="flex items-stretch">
            <button
              type="button"
              aria-label="집 철거"
              disabled={!isOwn || currentStage <= 0}
              onClick={() => handleDevelop?.(visitorId, pos, -1, initialStage)}
              title="집 철거"
              className="inline-flex flex-1 flex-col items-center justify-center gap-0.5 border-r-2 border-ink-line/60 py-1.5 font-display text-ink transition hover:bg-neutral-200 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <span className="text-[18px] font-extrabold leading-none">−</span>
              <span className="text-[8px] font-extrabold leading-none tracking-[0.12em]">
                집 철거
              </span>
            </button>
            <span className="inline-flex min-w-[40px] items-center justify-center bg-parchment-50 px-1 py-2 font-display text-[18px] font-extrabold tabular-nums leading-none text-ink">
              {isOwn ? currentStage : '—'}
            </span>
            <button
              type="button"
              aria-label="집짓기"
              disabled={!canBuild || currentStage >= 5}
              onClick={() => handleDevelop?.(visitorId, pos, +1, initialStage)}
              title={buildBlockReason ?? (currentStage >= 5 ? '아파트까지 풀업' : '집짓기')}
              className="inline-flex flex-1 flex-col items-center justify-center gap-0.5 border-l-2 border-ink-line/60 py-1.5 font-display text-ink transition hover:bg-neutral-200 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <span className="text-[18px] font-extrabold leading-none">+</span>
              <span className="text-[8px] font-extrabold leading-none tracking-[0.12em]">
                집짓기
              </span>
            </button>
          </div>
          {/* 차단 사유 (+ disabled 일 때) */}
          {isOwn && !canBuild && (
            <div className="border-t-2 border-ink-line/60 bg-amber-50 px-2 py-1 text-center font-display text-[8.5px] font-bold uppercase tracking-wider text-monopoly-deep">
              {buildBlockReason}
            </div>
          )}
          {/* 비용/환급 미리보기 — 룰 §6: houseCost (그룹별 빌라값) */}
          {isOwn && (() => {
            const buildCost = tile.houseCost ?? 0;
            // 다음 − 클릭 시 next stage = currentStage - 1
            // currentStage > initialStage → 세션 내 빌드 취소 → 100% 환급
            // currentStage <= initialStage → 기존 빌딩 판매 → 50% 환급 (룰 §10)
            const isCancelMode = currentStage > initialStage;
            const refundAmount = isCancelMode ? buildCost : Math.round(buildCost * 0.5 / 10) * 10;
            return (
              <div className="flex items-center justify-between border-t-2 border-ink-line/60 bg-neutral-200 px-2 py-1 font-display text-[9px] font-bold uppercase tracking-wider text-ink/70">
                <span className="flex items-baseline gap-0.5">
                  <span className="opacity-60">−</span>
                  <span className="text-emerald-700 tabular-nums">{refundAmount}</span>
                  <span className="opacity-60">만 {isCancelMode ? '취소' : '판매'}</span>
                </span>
                <span className="flex items-baseline gap-0.5">
                  <span className="opacity-60">+</span>
                  <span className="text-monopoly-deep tabular-nums">{buildCost}</span>
                  <span className="opacity-60">만 비용</span>
                </span>
              </div>
            );
          })()}
          {/* 변경 완료 — 집짓기/철거 방향에 맞춰 세션 기준 단계를 확정 */}
          {isOwn && (() => {
            const stageDelta = currentStage - initialStage;
            const isBuild = stageDelta > 0;
            const isDemolish = stageDelta < 0;
            const changed = stageDelta !== 0;
            return (
              <>
              <button
                type="button"
                disabled={!changed}
                onClick={() => setInitialStage(currentStage)}
                title={
                  isBuild
                    ? '현재 단계로 건설 확정 (이후 − 는 판매 50% 환급)'
                    : isDemolish
                      ? '현재 단계로 철거 확정'
                      : '확정할 변경 없음'
                }
                className={cn(
                  'border-t-2 border-ink-line/60 px-2 py-1.5 font-display text-[10px] font-extrabold uppercase tracking-[0.18em] transition active:translate-y-px',
                  isBuild && 'bg-monopoly-red text-white hover:bg-monopoly-deep',
                  isDemolish && 'bg-ink text-white hover:bg-ink/85',
                  !changed && 'cursor-not-allowed bg-neutral-200/60 text-ink/30',
                )}
              >
                {isBuild
                  ? `✓ 건설 완료 (${stageDelta}단계 확정)`
                  : isDemolish
                    ? `✓ 철거 완료 (${Math.abs(stageDelta)}단계 확정)`
                    : '건설 완료'}
              </button>
              <button
                type="button"
                disabled={!changed}
                onClick={handleCancelDevelopment}
                className={cn(
                  'border-t-2 border-ink-line/60 px-2 py-1.5 font-display text-[10px] font-extrabold uppercase tracking-[0.18em] transition active:translate-y-px',
                  changed
                    ? 'bg-neutral-200 text-ink/75 hover:bg-neutral-300'
                    : 'cursor-not-allowed bg-neutral-200/45 text-ink/25',
                )}
                title={changed ? '이번 집짓기/철거 변경만 되돌리기' : '취소할 집짓기/철거 변경 없음'}
              >
                취소하기
              </button>
              </>
            );
          })()}
        </div>
      </div>,
      document.body
    )}

    <ModalBase
      open={open}
      onClose={handleModalClose}
      className="w-[min(92vw,480px)]"
      style={{
        // 컬러셋 시그니처 글로우 띠 — deed-surface 의 갈색 박스섀도를 override
        boxShadow: `0 4px 0 0 #0F0C0A, 0 0 0 4px ${(COLOR_HEX[tile.color] ?? '#955436')}cc, 0 0 0 9px ${(COLOR_HEX[tile.color] ?? '#955436')}55, 0 0 28px 6px ${(COLOR_HEX[tile.color] ?? '#955436')}99, 0 0 60px 14px ${(COLOR_HEX[tile.color] ?? '#955436')}55, 0 14px 32px -4px rgba(0,0,0,0.55)`,
      }}
    >

      {/* ══ 1. 헤더 — 진한 단색 + 스카이라인 + TITLE DEED + PREMIUM 별 ══ */}
      <div
        className={cn(
          'relative overflow-hidden border-b-2 border-ink-line',
          COLOR_HEADER_BG[tile.color] || 'bg-neutral-600',
        )}
        style={{ aspectRatio: '5 / 2' }}
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
        <div className="absolute inset-x-0 top-0 px-4 pt-2.5 text-center">
          <div
            className={cn(
              'font-display text-[11px] font-bold uppercase leading-none',
              'tracking-[0.28em]',
              COLOR_HEADER_TEXT[tile.color] || 'text-white',
              'drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]',
            )}
          >
            Title Deed · 권리증
          </div>
        </div>

        {/* PREMIUM 별 배지 — 헤더 하단 중앙 */}
        {ts.premium > 0 && (
          <div className="absolute inset-x-0 bottom-2 flex justify-center">
            <PremiumBadge premium={ts.premium} />
          </div>
        )}

        {/* 저당 표시 — 헤더 우상단 */}
        {ts.mortgaged && (
          <div className="absolute right-3 top-2 rotate-[8deg]">
            <div className="border-2 border-monopoly-deep bg-monopoly-red/30 px-2 py-0.5 font-display text-[10px] font-bold tracking-widest text-white backdrop-blur-sm">
              저당
            </div>
          </div>
        )}
      </div>

      {/* ══ 2. 도시명 헤드라인 ══ */}
      <div className="border-b-2 border-ink-line bg-parchment-50 px-5 py-3 text-center">
        <h2 className="font-board font-extrabold text-[30px] leading-none text-ink tracking-tight">
          {tile.names.ko}
        </h2>
        {tile.names.region && (
          <div className="mt-1 font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-ink/55">
            {tile.names.region}
            {tile.names.en && (
              <span className="ml-1 opacity-70">· {tile.names.en}</span>
            )}
          </div>
        )}
      </div>

      {/* ══ 3. 매입가 / 현시세 — 다크 캡슐 한 줄 ══ */}
      <div className="border-b-2 border-ink-line bg-parchment-100 px-4 py-2.5">
        <div
          className="flex items-center justify-around rounded-xl px-4 py-2.5"
          style={{ backgroundColor: '#1A1612' }}
        >
          {/* 매입가 — basePrice (정규화된 실제 매입 가격) */}
          <div className="text-center">
            <div className="font-display text-[10px] font-semibold uppercase tracking-widest text-white/55">
              매입가
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="font-display text-[30px] font-bold leading-none tabular-nums text-white">
                {tile.basePrice ?? '-'}
              </span>
              <span className="font-display text-[14px] font-semibold text-white/55">만</span>
            </div>
          </div>
          {/* 구분선 */}
          <div className="h-10 w-px bg-white/20" />
          {/* 현시세 */}
          <div className="text-center">
            <div className="font-display text-[10px] font-semibold uppercase tracking-widest text-white/55">
              현시세
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span
                className={cn(
                  'font-display text-[30px] font-bold leading-none tabular-nums',
                  price < (tile.basePrice ?? 0)
                    ? 'text-monopoly-red drop-shadow-[0_0_8px_rgba(211,47,47,0.5)]'
                    : 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]',
                )}
              >
                {price}
              </span>
              <span className="font-display text-[14px] font-semibold text-white/55">만</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══ 4. 단계별 임대료 표 — 이모티콘 + 가격 강조 ══ */}
      <div className="bg-parchment-50 px-4 py-3">
        {/* 섹션 라벨 */}
        <div className="mb-2 text-center font-display text-[9px] font-semibold uppercase tracking-[0.22em] text-ink/50">
          Rent · 단계별 통행료
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
                {/* 이모티콘 단계 표시 */}
                <div className="flex items-center gap-2">
                  <span className={cn('leading-none', isApt ? 'text-[16px]' : 'text-[13px]')}>
                    {STAGE_EMOJI[r.key]}
                  </span>
                  {/* 아파트만 라벨 유지, 나머지는 이모티콘이 충분 */}
                  {isApt && (
                    <span
                      className={cn(
                        'font-display text-[10px] font-bold uppercase tracking-wider',
                        isCurrent ? 'text-white' : 'text-ink/70',
                      )}
                    >
                      아파트
                    </span>
                  )}
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
            <span className="font-display text-[8px] text-ink/40">빌라 ×4</span>
            <span className="font-display text-[8px] text-monopoly-gold/70">🏢</span>
          </div>
        )}
      </div>

      {/* ══ 6. 액션 영역 ══ */}
      <div
        className={cn(
          'space-y-2 border-t-2 border-ink-line bg-parchment-100 px-4 py-3',
          isOwn && 'py-2',
        )}
      >
        {isEmpty && (
          <>
            <div className="text-center font-display text-[11px] font-semibold uppercase tracking-widest text-ink/65">
              매입하시겠습니까?
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-chip-red flex-1 py-2.5 text-sm"
                disabled={!canBuy}
                onClick={() => {
                  handleBuy?.(visitorId, pos);
                  onClose?.();
                }}
              >
                매입 · {price}만
              </button>
              <button
                type="button"
                className="btn-chip-ghost flex-1 py-2.5 text-sm"
                onClick={onClose}
              >
                패스
              </button>
            </div>
            {!canBuy && (
              <div className="text-center font-display text-[10px] font-semibold uppercase tracking-wider text-monopoly-deep">
                잔액 부족 · 보유 {visitor?.cash}만
              </div>
            )}
          </>
        )}

        {isOpponentOwned && (
          <>
            <div className="text-center font-display text-[12px] font-semibold text-ink">
              {playerMeta(state, owner).name}님 소유 ·{' '}
              <span className="font-bold text-monopoly-red">통행료 {rent}만</span>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="btn-chip-red py-2.5 text-sm"
                disabled={!canPay}
                onClick={() => {
                  handlePayRent?.(visitorId, pos);
                  onClose?.();
                }}
              >
                통행료 지불 · {rent}만
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="btn-chip-gold py-2 text-xs"
                  onClick={() => handleTradeOpen?.(visitorId, owner, pos)}
                >
                  거래 제안
                </button>
                <button
                  type="button"
                  className={cn(
                    'btn-chip py-2 text-xs',
                    !canPay && 'bg-monopoly-red text-white',
                  )}
                  onClick={() => handleRecoveryOpen?.(visitorId, rent)}
                >
                  {canPay ? '회생' : '회생 시도'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </ModalBase>
    </>
  );
}
