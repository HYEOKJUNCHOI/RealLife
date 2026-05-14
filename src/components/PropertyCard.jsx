// 부동산 권리증 카드 — 정통 모노폴리 deed card 결
// 상단: 컬러셋 색띠 (TITLE DEED 라벨)
// 본문: 양피지 — 도시명(굵은 검정) + 시세 + 소유자 점 + 단계 아이콘
import { useGameStore } from '@/stores/gameStore.js';
import { currentPrice } from '@/engine/inflation.js';
import { cn } from '@/lib/cn.js';


// 컬러셋 → 배경 클래스 (모노폴리 클래식 색)
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

// 색띠 위 글자색 (밝은 색은 검정, 어두운 색은 흰색)
const BAND_TEXT = {
  brown: 'text-white',
  lightblue: 'text-ink',
  pink: 'text-white',
  orange: 'text-ink',
  red: 'text-white',
  yellow: 'text-ink',
  green: 'text-white',
  darkblue: 'text-white',
};

const COLOR_HEX = {
  brown: '#955436',
  lightblue: '#AAE0FA',
  pink: '#D93A96',
  orange: '#F7941D',
  red: '#ED1B24',
  yellow: '#FEF200',
  green: '#1FB25A',
  darkblue: '#0072BB',
};

// 플레이어 번호 고정 시그니처색: 1P 빨강 / 2P 파랑 / 3P 노랑 / 4P 초록
const PLAYER_COLOR = ['#DC2626', '#2563EB', '#F97316', '#16A34A'];

export default function PropertyCard({ pos, compact = false, className }) {
  const state = useGameStore((s) => s.state);
  const tile = state.board.tiles[pos];
  const ts = state.tileState[pos] ?? {};
  const price = currentPrice(state, pos);
  const stage = ts.stage ?? 0;
  const ownerColor = ts.owner != null ? PLAYER_COLOR[ts.owner] : null;

  return (
    <div
      className={cn(
        'group relative flex h-full w-full flex-col overflow-hidden border-2 border-ink-line bg-parchment-50',
        'rounded-md shadow-deed-flat transition-transform duration-150',
        'hover:-translate-y-0.5 hover:shadow-deed-sm',
        ts.mortgaged && 'opacity-70 saturate-50',
        className,
      )}
      data-component="PropertyCard"
    >
      {/* 컬러띠 — Glossy 광택 (위쪽 미세 그라데이션) */}
      <div
        className={cn(
          'relative flex shrink-0 items-center justify-center border-b-2 border-ink-line overflow-hidden',
          COLOR_BG[tile.color] || 'bg-neutral-400',
          BAND_TEXT[tile.color] || 'text-white',
          compact ? 'px-1 py-1.5' : 'px-2 py-2',
        )}
      >
        {/* 위쪽 빛 반사 — opacity 18%, 위에서 아래로 흐리게 */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2"
          style={{
            background:
              'linear-gradient(to bottom, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.05) 100%)',
          }}
          aria-hidden="true"
        />
        <div
          className={cn(
            'relative font-board text-center leading-none',
            compact ? 'text-[14px]' : 'text-[16px]',
          )}
        >
          {tile.names.ko}
        </div>
      </div>

      {/* 본문 — 시세 (큰 숫자) + 단계 dot */}
      <div className="flex flex-1 flex-col items-center justify-center gap-1 px-1 py-1">
        <div
          className={cn(
            'font-display font-extrabold leading-none text-ink tabular-nums',
            compact ? 'text-[16px]' : 'text-[20px]',
          )}
        >
          {price.toLocaleString('ko-KR')}
          <span
            className={cn(
              'ml-0.5 font-semibold text-ink/55',
              compact ? 'text-[10px]' : 'text-[11px]',
            )}
          >
            만
          </span>
        </div>

        {/* 단계 — 빌라 dot / 아파트 완공 한 줄 글로우 */}
        {stage > 0 && (
          <div className="w-[78%]">
            {stage <= 3 && (
              <div className="flex items-center justify-center gap-0.5">
                {Array.from({ length: stage }).map((_, i) => (
                  <div
                    key={i}
                    className="h-1.5 w-1.5 rounded-sm border border-ink-line bg-monopoly-red"
                    aria-label="빌라"
                  />
                ))}
              </div>
            )}
            {stage === 5 && (
              <div
                className="h-2 rounded-full border border-ink-line/50"
                style={{
                  background: `linear-gradient(90deg, ${COLOR_HEX[tile.color] ?? '#C9A24B'} 0%, #FFD54F 52%, ${COLOR_HEX[tile.color] ?? '#C9A24B'} 100%)`,
                  boxShadow: `0 0 8px ${(COLOR_HEX[tile.color] ?? '#C9A24B')}cc`,
                }}
                title="아파트 완공"
              />
            )}
          </div>
        )}
      </div>

      {/* 소유자 점 — 우상단 (자기 거면 본인 색이라 큰 의미 없지만 시각적 표시) */}
      {ts.owner != null && ownerColor && (
        <div
          className="absolute right-1 top-1 h-2 w-2 rounded-full border border-ink-line"
          style={{ backgroundColor: ownerColor }}
          title={`${ts.owner + 1}p 소유`}
        />
      )}

      {/* 저당 도장 */}
      {ts.mortgaged && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 rotate-[-12deg] text-center">
          <div className="inline-block border-2 border-monopoly-deep bg-monopoly-red/20 px-1.5 py-0.5 font-display text-[9px] font-bold tracking-widest text-monopoly-deep">
            저당
          </div>
        </div>
      )}
    </div>
  );
}
