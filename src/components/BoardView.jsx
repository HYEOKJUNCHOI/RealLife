// 보드 뷰 — 부동산 22칸을 컬러셋별 그룹으로 표시
// 각 그룹은 모노폴리 클래식 deed 결로 배치 (색띠 + 도시명)
// 클릭 → PropertyModal 오픈
import { useGameStore } from '@/stores/gameStore.js';
import PropertyCard from '@/components/PropertyCard.jsx';
import { cn } from '@/lib/cn.js';

// 모노폴리 보드 컬러셋 순서 (저가 → 고가)
const COLOR_ORDER = [
  'brown',
  'lightblue',
  'pink',
  'orange',
  'red',
  'yellow',
  'green',
  'darkblue',
];

const COLOR_LABEL = {
  brown: '갈색',
  lightblue: '하늘',
  pink: '분홍',
  orange: '주황',
  red: '빨강',
  yellow: '노랑',
  green: '초록',
  darkblue: '남색',
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

export default function BoardView() {
  const state = useGameStore((s) => s.state);
  const openPropertyModal = useGameStore((s) => s.openPropertyModal);

  if (!state) return null;
  const properties = state.board.tiles.filter((t) => t.type === 'property');
  const visitorId = state.turnIndex ?? 0;

  // 컬러셋별 그룹핑
  const grouped = COLOR_ORDER.map((color) => ({
    color,
    tiles: properties.filter((t) => t.color === color),
  })).filter((g) => g.tiles.length > 0);

  return (
    <div className="flex h-full flex-col" data-component="BoardView">
      {/* 헤더 */}
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h3 className="font-display text-xs font-bold uppercase tracking-[0.25em] text-ink">
          Board · 부동산 22칸
        </h3>
        <span className="font-display text-[10px] font-semibold uppercase tracking-wider text-ink/50">
          탭 → 권리증
        </span>
      </div>

      {/* 컬러셋 그룹 그리드 */}
      <div className="grid flex-1 min-h-0 grid-cols-2 gap-2 overflow-y-auto pr-0.5 md:grid-cols-3 lg:grid-cols-4 no-scrollbar">
        {grouped.map((g) => {
          // 그룹 독점 여부 체크
          const owners = g.tiles
            .map((t) => state.tileState[t.pos]?.owner)
            .filter((o) => o != null);
          const isMonopoly =
            owners.length === g.tiles.length &&
            owners.every((o) => o === owners[0]);

          return (
            <div
              key={g.color}
              className={cn(
                'flex flex-col overflow-hidden rounded-md border-2 border-ink-line bg-parchment-50 shadow-deed-flat',
              )}
            >
              {/* 그룹 색띠 */}
              <div
                className={cn(
                  'flex items-center justify-between border-b-2 border-ink-line px-2 py-1',
                  COLOR_BG[g.color],
                  BAND_TEXT[g.color],
                )}
              >
                <span className="font-display text-[10px] font-bold uppercase tracking-widest">
                  {COLOR_LABEL[g.color]}
                </span>
                {isMonopoly && (
                  <span className="rounded-sm border border-ink-line bg-white/90 px-1 py-0.5 font-display text-[8px] font-bold uppercase tracking-widest text-ink">
                    독점
                  </span>
                )}
              </div>

              {/* 그룹 내 카드 */}
              <div className="grid grid-cols-2 gap-1 p-1.5 lg:grid-cols-3">
                {g.tiles.map((t) => {
                  const ts = state.tileState[t.pos] ?? {};
                  const isMine = ts.owner === visitorId;
                  return (
                    <button
                      key={t.pos}
                      type="button"
                      onClick={() => openPropertyModal(t.pos, visitorId)}
                      className={cn(
                        'group rounded-md transition-transform duration-150',
                        'hover:scale-[1.04] focus:outline-none focus:ring-2 focus:ring-monopoly-red focus:ring-offset-1',
                        isMine && 'ring-2 ring-monopoly-red ring-offset-1 ring-offset-parchment-50',
                      )}
                      aria-label={`${t.names.ko} 권리증 보기`}
                    >
                      <PropertyCard pos={t.pos} compact />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
