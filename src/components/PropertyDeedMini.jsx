// 보유 부동산 mini 권리증 — 5장 한 줄 컴팩트. 클릭 시 PropertyModal 열림.
// 리디자인: 진한 단색 헤더 + 이모티콘 임대료 표 + 단계 progress 도장
import { useGameStore } from '@/stores/gameStore.js';
import { currentPrice, rentFromStage } from '@/engine/inflation.js';
import { cn } from '@/lib/cn.js';
import AssetFrame from '@/components/AssetFrame.jsx';
import charactersData from '@/data/characters.json';

// 헤더용 진한 단색 (참고 이미지: 보라/네이비 톤 아닌, 컬러셋 본색 진하게)
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
// 컬러셋 hex (글로우용 — tailwind config 와 동기)
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
// 컬러셋 한글 이름 (시세 자리에 그룹 표시)
const COLOR_NAME_KO = {
  brown:     '갈색',
  lightblue: '하늘',
  pink:      '분홍',
  orange:    '주황',
  red:       '빨강',
  yellow:    '노랑',
  green:     '초록',
  darkblue:  '남색',
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
// 단계 도장 색 (현재 단계까지 채움)
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

// 캐릭터 id → 메타 (state.players[i].character 로 조회)
const CHAR_META = Object.fromEntries(charactersData.korea.map((c) => [c.id, c]));

// playerId → 그 플레이어의 캐릭터 컬러
// ⚠️ characters.json 의 인덱스 ≠ state.players 의 인덱스 (캐릭터 선택 순서 따라 다름)
const playerColor = (state, playerId) => {
  const p = state?.players?.[playerId];
  return CHAR_META[p?.character]?.color ?? '#666';
};

// 이모티콘으로 단계 표현
const STAGE_EMOJI = ['🌱', '🏠', '🏠🏠', '🏠🏠🏠', '🏠🏠🏠🏠', '🏢'];
// stage 0~4 = progress 도장 5개 (0=빈, 1~4=빌라, 아파트는 별개)
const PROGRESS_STAGES = [0, 1, 2, 3, 4]; // 빌라 단계만 도장

// BRAINSTORM 7-2: 시세 × RENT_RATIO[stage] 비율 통행료
// 정보성 표 — owner 없어도 projection 보이게 가짜 owner 주입
function stageRents(state, pos) {
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
}

// premium 개수만큼 골드별 (최대 3개)
function PremiumStars({ premium, textClass }) {
  if (!premium || premium <= 0) return null;
  const count = Math.min(Math.ceil(premium / 25), 3); // 25% 단위로 별 1개
  return (
    <div className="flex items-center justify-center gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="text-[8px] drop-shadow-[0_0_3px_rgba(201,162,75,0.9)]"
          style={{ color: '#FFD700' }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export default function PropertyDeedMini({ pos, className }) {
  const state = useGameStore((s) => s.state);
  if (!state || pos == null) return null;

  const tile = state.board.tiles[pos];
  if (!tile || tile.type !== 'property') return null;

  const ts = state.tileState[pos] ?? {};
  const price = currentPrice(state, pos);
  const currentStage = ts.stage ?? 0;
  const ownerColor = ts.owner != null ? playerColor(state, ts.owner) : null;
  const skylineSlot = COLOR_TO_SKYLINE[tile.color];
  const rents = stageRents(state, pos);

  const glow = COLOR_HEX[tile.color] ?? '#955436';

  return (
    <div
      className={cn(
        'group relative flex h-full w-full flex-col overflow-hidden',
        'border-2 border-ink-line rounded-md',
        'bg-parchment-50',
        'transition-transform duration-150 hover:-translate-y-0.5',
        ts.mortgaged && 'opacity-60 saturate-50',
        className,
      )}
      style={{
        // 컬러셋 시그니처 글로우 띠 — 외곽 안쪽 outline + outset blur
        boxShadow: `0 0 0 2px ${glow}cc, 0 0 0 5px ${glow}55, 0 0 14px 2px ${glow}80, 0 3px 0 0 #0F0C0A`,
      }}
      data-component="PropertyDeedMini"
    >
      {/* ── 1. 헤더: 진한 단색 컬러띠 + 스카이라인 tint + TITLE DEED + 별 ── */}
      <div
        className={cn(
          'relative shrink-0 overflow-hidden border-b-2 border-ink-line',
          COLOR_HEADER_BG[tile.color] || 'bg-neutral-600',
        )}
        style={{ aspectRatio: '5 / 2.2' }}
      >
        {/* 스카이라인 오버레이 (투명도 낮게 — 헤더 색 살림) */}
        {skylineSlot && (
          <AssetFrame
            slot={skylineSlot}
            rounded="rounded-none"
            className="absolute inset-0 !aspect-auto h-full w-full scale-110 origin-center"
            style={{ opacity: 0.18, mixBlendMode: 'luminosity' }}
          />
        )}
        {/* 하단 그라데이션 — 본문과 부드러운 전환 */}
        <div
          className="absolute inset-x-0 bottom-0 h-3 bg-gradient-to-t from-black/30 to-transparent"
          aria-hidden="true"
        />
        {/* TITLE DEED 라벨 */}
        <div className="absolute inset-x-0 top-0 px-1 pt-[3px] text-center">
          <div
            className={cn(
              'font-display text-[6px] font-bold uppercase leading-none',
              'tracking-[0.18em]',
              COLOR_HEADER_TEXT[tile.color] || 'text-white',
              'drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]',
            )}
          >
            Title Deed
          </div>
        </div>
        {/* 프리미엄 별 — 헤더 중앙 하단 */}
        {ts.premium > 0 && (
          <div className="absolute inset-x-0 bottom-[3px] flex justify-center">
            <PremiumStars premium={ts.premium} />
          </div>
        )}
      </div>

      {/* ── 2. 도시명 ── */}
      <div className="shrink-0 border-b-2 border-ink-line bg-parchment-50 px-1 py-[3px] text-center">
        <h3 className="font-board font-extrabold text-[13px] leading-none text-ink tracking-tight">
          {tile.names.ko}
        </h3>
        {tile.names.region && (
          <div className="mt-0.5 font-display text-[5.5px] font-semibold uppercase tracking-[0.14em] text-ink/55">
            {tile.names.region}
          </div>
        )}
      </div>

      {/* ── 3a. 매입가 | 현재가 다크 캡슐 ── */}
      <div className="shrink-0 border-b border-ink-line bg-parchment-100 px-1 pt-1">
        <div
          className="flex items-center justify-between rounded-[3px] px-1.5 py-[2px]"
          style={{ backgroundColor: '#1A1612' }}
        >
          <div className="flex items-baseline gap-0.5">
            <span className="font-display text-[5.5px] font-semibold uppercase tracking-wide text-white/55">
              매입
            </span>
            <span className="font-display text-[10px] font-bold leading-none tabular-nums text-white">
              {tile.basePrice ?? '-'}
            </span>
            <span className="font-display text-[5.5px] font-semibold text-white/50">만</span>
          </div>
          <span className="font-display text-[8px] font-semibold text-white/30">|</span>
          <div className="flex items-baseline gap-0.5">
            <span className="font-display text-[5.5px] font-semibold uppercase tracking-wide text-white/55">
              현재
            </span>
            <span
              className={cn(
                'font-display text-[10px] font-bold leading-none tabular-nums',
                price < (tile.basePrice ?? 0)
                  ? 'text-monopoly-red'
                  : 'text-emerald-400',
              )}
            >
              {price}
            </span>
            <span className="font-display text-[5.5px] font-semibold text-white/50">만</span>
          </div>
        </div>
      </div>

      {/* ── 3b. 컬러셋 뱃지들 — 같은 그룹 부동산 모두 표시
              자기 보유 = 컬러셋 켜짐 / 다른 사람 보유 = 꺼짐 + 그 사람 색 ring / 빈땅 = 꺼짐 ── */}
      <div className="shrink-0 border-b-2 border-ink-line bg-parchment-100 px-1 py-1">
        <div className="flex flex-wrap items-center justify-center gap-[2px]">
          {state.board.tiles
            .filter((t) => t.type === 'property' && t.color === tile.color)
            .map((t) => {
              const tts = state.tileState[t.pos] ?? {};
              const isMine = tts.owner != null && tts.owner === ts.owner;
              const otherOwner =
                tts.owner != null && !isMine ? tts.owner : null;
              const otherColor =
                otherOwner != null ? playerColor(state, otherOwner) : null;
              const isUnowned = tts.owner == null;
              return (
                <span
                  key={t.pos}
                  title={t.names.ko + (otherOwner != null ? ` · ${otherOwner + 1}p 보유` : isUnowned ? ' · 빈 땅' : '')}
                  className={cn(
                    'relative rounded-sm border px-1 py-[1px] font-display text-[7.5px] font-bold leading-none tracking-wide',
                    isMine
                      ? cn(
                          COLOR_HEADER_BG[tile.color] || 'bg-neutral-500',
                          COLOR_HEADER_TEXT[tile.color] || 'text-white',
                          'border-ink-line shadow-[0_1px_0_0_#0F0C0A]',
                        )
                      : isUnowned
                        ? 'border-neutral-300 bg-neutral-100 text-neutral-400'
                        : 'border-ink-line/40 bg-neutral-300 text-ink',
                  )}
                >
                  {/* 다른 사람 보유 표시 점 — 중앙 위 (넘패드 8 위치) */}
                  {otherColor && (
                    <span
                      className="absolute left-1/2 -top-[5px] h-[9px] w-[9px] -translate-x-1/2 rounded-full border-[1.5px] border-white shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
                      style={{ backgroundColor: otherColor }}
                      aria-hidden="true"
                    />
                  )}
                  {t.names.ko}
                </span>
              );
            })}
        </div>
      </div>

      {/* ── 4. 임대료 표 — 이모티콘 라벨 ── */}
      <div className="flex-1 min-h-0 bg-parchment-50 px-[3px] py-[3px]">
        <div className="h-full overflow-hidden rounded-[3px] border border-ink-line">
          {rents.map((r, i) => {
            const isApt = r.key === 5;
            const isCurrent = r.key === currentStage;
            return (
              <div
                key={r.key}
                className={cn(
                  'flex items-center justify-between border-b border-ink/20 px-1 last:border-b-0',
                  // 아파트 행: 골드 배경 강조
                  isApt && !isCurrent && 'bg-monopoly-gold/20',
                  // 현재 단계: 빨강 강조
                  isCurrent && 'bg-monopoly-red text-white',
                  // 짝수/홀수 줄무늬
                  !isCurrent && !isApt && (i % 2 === 0 ? 'bg-parchment-50' : 'bg-parchment-100'),
                )}
                style={{ height: 'calc(100% / 6)' }}
              >
                {/* 이모티콘 */}
                <span
                  className="leading-none"
                  style={{ fontSize: isApt ? '9px' : '7px' }}
                >
                  {STAGE_EMOJI[r.key]}
                </span>
                {/* 임대료 */}
                <span
                  className={cn(
                    'font-display font-bold tabular-nums leading-none',
                    isApt ? 'text-[9px]' : 'text-[8px]',
                    isCurrent ? 'text-white' : isApt ? 'text-ink' : 'text-ink/80',
                  )}
                >
                  {r.rent}
                  <span className={cn('ml-px text-[5px] opacity-70', isCurrent && 'opacity-90')}>
                    만
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 5. 단계 progress 도장 5개 (빌라 4단계 + 아파트) ── */}
      <div className="shrink-0 border-t-2 border-ink-line bg-parchment-100 px-1 py-[3px]">
        {currentStage === 5 ? (
          <div
            className="h-[6px] rounded-full border border-ink-line/60"
            style={{
              background: `linear-gradient(90deg, ${glow} 0%, #FFD54F 52%, ${glow} 100%)`,
              boxShadow: `0 0 0 1px ${glow}55, 0 0 10px ${glow}cc, 0 0 22px ${glow}88`,
            }}
            title="아파트 완공"
          />
        ) : (
          <div className="flex items-center justify-between gap-[2px]">
            {/* 빌라 4단계 도장 */}
            {PROGRESS_STAGES.map((stageKey) => (
                <div
                  key={stageKey}
                  className={cn(
                    'flex-1 h-[5px] rounded-[2px] border border-ink-line/60',
                    currentStage >= stageKey && currentStage < 5
                      ? COLOR_STAGE_FILL[tile.color] || 'bg-prop-brown'
                      : 'bg-parchment-200',
                  )}
                />
              ))}
            {/* 아파트 특별 도장 */}
            <div className="h-[5px] w-[8px] shrink-0 rounded-[2px] border border-ink-line/60 bg-parchment-200" />
          </div>
        )}
      </div>

      {/* 컬러셋 시그니처 점 우상단 — 그룹 색깔 표식 */}
      {ts.owner != null && (
        <div
          className="absolute right-1 top-1 h-2 w-2 rounded-full border border-white/80 shadow-sm"
          style={{ backgroundColor: glow }}
          title={`${COLOR_NAME_KO[tile.color] ?? tile.color} 그룹`}
        />
      )}

      {/* 저당 도장 — 크고 또렷한 적색 stamp 결 */}
      {ts.mortgaged && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div
            className="rotate-[-14deg] border-[4px] border-monopoly-deep bg-monopoly-red/25 px-4 py-2 font-display text-[28px] font-extrabold uppercase tracking-[0.2em] text-monopoly-deep shadow-[0_3px_0_0_#9F1F1F,0_0_18px_rgba(159,31,31,0.55)]"
            style={{ textShadow: '0 1px 0 rgba(255,255,255,0.45)' }}
          >
            저당
          </div>
        </div>
      )}
    </div>
  );
}
