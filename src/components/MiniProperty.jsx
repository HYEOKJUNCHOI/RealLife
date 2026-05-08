// 미니 부동산 칩 — 색띠 + 도시명 + 단계 dot
// 보유 부동산 5×2 그리드용으로 PlayerPanel에서 분리
import { useGameStore } from '@/stores/gameStore.js';
import { cn } from '@/lib/cn.js';
import koreaBoard from '@/boards/korea.json';

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

const PROP_TILES = koreaBoard.tiles.filter((t) => t.type === 'property');
const PROP_BY_POS = Object.fromEntries(PROP_TILES.map((t) => [t.pos, t]));

export default function MiniProperty({ pos, state, visitorId, size = 'md' }) {
  const tile = PROP_BY_POS[pos];
  const openModal = useGameStore((s) => s.openPropertyModal);
  if (!tile) return <EmptySlot size={size} />;

  const ts = state.tileState[pos] ?? {};
  const stage = ts.stage ?? 0;
  const mortgaged = ts.mortgaged;
  const color = COLOR_HEX[tile.color] ?? '#999';
  const name = tile.names?.ko ?? `${pos}`;

  const sizing =
    size === 'sm'
      ? { band: 'h-1.5', pad: 'px-1 py-0.5', text: 'text-[9px]', dot: 'h-1 w-1', stageH: 'h-2.5' }
      : { band: 'h-2', pad: 'px-1 py-0.5', text: 'text-[10px]', dot: 'h-1.5 w-1.5', stageH: 'h-3' };

  return (
    <button
      type="button"
      onClick={() => openModal(pos, visitorId ?? state.turnIndex)}
      className={cn(
        'relative flex flex-col overflow-hidden rounded-sm border border-ink-line bg-white text-ink shadow-[0_1px_0_0_#0F0C0A] transition hover:scale-[1.06] active:translate-y-px',
        mortgaged && 'opacity-50',
      )}
      title={`${name}${mortgaged ? ' (저당)' : ''} · 단계 ${stage}`}
    >
      <div
        className={cn('w-full border-b border-ink-line', sizing.band)}
        style={{ backgroundColor: color }}
      />
      <div
        className={cn('font-board leading-tight truncate text-center', sizing.pad, sizing.text)}
      >
        {name}
      </div>
      <div className={cn('flex items-center justify-center gap-0.5 pb-0.5', sizing.stageH)}>
        {stage === 5 ? (
          <span
            className="block h-1.5 w-[76%] rounded-full border border-ink-line/40"
            style={{
              background: `linear-gradient(90deg, ${color} 0%, #FFD54F 52%, ${color} 100%)`,
              boxShadow: `0 0 8px ${color}cc`,
            }}
            title="아파트 완공"
          />
        ) : stage > 0 ? (
          Array.from({ length: stage }).map((_, idx) => (
            <span
              key={idx}
              className={cn(
                'block rounded-sm border border-ink-line bg-monopoly-red',
                sizing.dot,
              )}
            />
          ))
        ) : null}
      </div>
      {mortgaged && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="rotate-[-12deg] rounded-sm border border-ink-line bg-white/85 px-1 font-display text-[8px] font-bold uppercase text-ink">
            저당
          </span>
        </div>
      )}
    </button>
  );
}

export function EmptySlot({ size = 'md' }) {
  const h = size === 'sm' ? 'h-9' : 'h-12';
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-sm border border-dashed border-ink/20 bg-parchment-100/40 font-display text-[10px] font-semibold uppercase tracking-wider text-ink/20',
        h,
      )}
    >
      —
    </div>
  );
}
