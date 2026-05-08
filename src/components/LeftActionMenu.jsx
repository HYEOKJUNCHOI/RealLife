// 좌측 액션 메뉴 — 모노폴리 칩 결 버튼 5개
// 거래 / 대출 / 카드 / 건설 / 매각
import { useGameStore } from '@/stores/gameStore.js';
import { cn } from '@/lib/cn.js';

const items = [
  { id: 'trade', label: '거래', icon: '🤝', action: 'openTrade' },
  { id: 'loan', label: '대출', icon: '💳', action: 'openRecovery' },
  { id: 'cards', label: '카드', icon: '🎴', action: 'showCards' },
  { id: 'build', label: '건설', icon: '🏗', action: 'showBuild' },
  { id: 'sell', label: '매각', icon: '💸', action: 'openRecovery' },
];

export default function LeftActionMenu({ compact = false }) {
  const state = useGameStore((s) => s.state);
  const openTradeModal = useGameStore((s) => s.openTradeModal);
  const openRecoveryModal = useGameStore((s) => s.openRecoveryModal);
  const turnIndex = state?.turnIndex ?? 0;

  const handle = (action) => {
    switch (action) {
      case 'openTrade':
        openTradeModal(turnIndex);
        break;
      case 'openRecovery':
        openRecoveryModal(turnIndex, 0);
        break;
      default:
        break;
    }
  };

  return (
    <div
      className={cn(
        'flex',
        compact ? 'flex-row gap-1.5' : 'flex-col gap-2',
      )}
      data-component="LeftActionMenu"
    >
      {!compact && (
        <h3 className="px-1 pb-1 font-display text-xs font-bold uppercase tracking-[0.25em] text-ink">
          Actions
        </h3>
      )}
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          onClick={() => handle(it.action)}
          className={cn(
            // 모노폴리 칩 결 — 두꺼운 검정 윤곽 + 눌리는 그림자
            'group inline-flex items-center justify-center gap-1.5 rounded-md border-2 border-ink-line bg-parchment-50',
            'font-display font-bold uppercase tracking-wider text-ink',
            'shadow-chip transition-transform duration-100 ease-out',
            'hover:-translate-y-0.5 hover:bg-monopoly-red hover:text-white',
            'active:translate-y-[3px] active:shadow-chip-pressed',
            compact
              ? 'shrink-0 px-2.5 py-1.5 text-[11px]'
              : 'w-full px-3 py-2.5 text-[13px]',
          )}
          aria-label={it.label}
        >
          <span className={cn('text-base leading-none', compact && 'text-sm')}>
            {it.icon}
          </span>
          <span>{it.label}</span>
        </button>
      ))}
    </div>
  );
}
