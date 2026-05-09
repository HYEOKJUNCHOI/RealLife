// 메인 헤더 — 큰 현금 + 글로벌 게임 상태(년차/인플레/이자율)
//   - 좌: ₩ 큰 현금 (현재 차례 플레이어)
//   - 우: 글로벌 정보 칩 (년차 / 인플레 / 이자율) + 셋업 ⚙
// 사회자 NPC 멘트는 CurrentPlayerStage 로 이동 (사용자 명시)
import { cn } from '@/lib/cn.js';
import AnimatedCash from '@/components/AnimatedCash.jsx';
const INFLATION_RATE = 4; // % per year (constant per spec)

export default function GameHeader({
  turnPlayer,
  turnIndex,
  turnMeta,
  year,
  loanRate, // 0.01~0.04
  onExit,
  compact = false,
}) {
  const cash = turnPlayer?.cash ?? 0;
  const loanPct = Math.round((loanRate ?? 0.02) * 100);

  return (
    <header
      className="grid items-stretch gap-2 rounded-md border-2 border-ink-line bg-parchment-50 px-2 py-1.5 shadow-deed-flat md:px-3 md:py-2"
      style={{ gridTemplateColumns: '1fr auto' }}
      data-component="GameHeader"
    >
      {/* === 중앙: 큰 현금 === */}
      <div className="relative flex items-center justify-center px-1">
        <div className="absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-ink-line to-transparent opacity-40" />
        <div className="absolute inset-x-2 bottom-0 h-px bg-gradient-to-r from-transparent via-ink-line to-transparent opacity-40" />
        <div className="flex flex-col items-center">
          <span className="font-display text-[9px] font-semibold uppercase tracking-[0.3em] text-ink/55">
            {turnIndex + 1}p · {turnMeta?.name ?? '-'} · 현금
          </span>
          <div className="flex items-baseline gap-1">
            <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#00a83b]/60 bg-white font-display text-[16px] font-extrabold leading-none text-[#00a83b] shadow-[inset_0_2px_0_rgba(255,255,255,0.9),0_0_8px_rgba(0,168,59,0.22)]">
              ₩
            </span>
            <AnimatedCash
              value={cash}
              className={cn(
                'font-display font-extrabold leading-none',
                compact ? 'text-[26px]' : 'text-[40px] md:text-[44px]',
              )}
            />
            <span className="font-display text-[12px] font-bold uppercase tracking-widest text-ink/55">
              만
            </span>
          </div>
        </div>
      </div>

      {/* === 우: 글로벌 정보 + 셋업 === */}
      <div className="flex items-center gap-1.5 md:gap-2">
        <GlobalChip label="년차" value={`${year ?? 1}`} unit="년" />
        <GlobalChip label="인플레" value={`+${INFLATION_RATE}`} unit="%" tone="green" />
        <GlobalChip label="대출 이자" value={`${loanPct}`} unit="%" tone="red" />

        <button
          type="button"
          onClick={onExit}
          aria-label="셋업으로"
          className="rounded-md border-2 border-ink-line bg-parchment-100 p-1.5 text-ink shadow-chip transition hover:bg-monopoly-gold/30 active:translate-y-px"
          title="셋업으로 돌아가기"
        >
          <span className="text-base leading-none">⚙</span>
        </button>
      </div>
    </header>
  );
}

function GlobalChip({ label, value, unit, tone = 'neutral' }) {
  const toneCls = {
    neutral: 'bg-parchment-100 text-ink',
    green: 'bg-emerald-100 text-emerald-900 border-emerald-700',
    red: 'bg-amber-100 text-monopoly-deep border-monopoly-deep',
  }[tone];
  return (
    <div
      className={cn(
        'hidden min-w-[60px] flex-col items-center rounded-sm border-2 border-ink-line px-2 py-1 shadow-chip md:flex',
        toneCls,
      )}
    >
      <span className="font-display text-[7.5px] font-semibold uppercase tracking-[0.18em] opacity-65">
        {label}
      </span>
      <span className="font-display text-[16px] font-extrabold leading-none tabular-nums">
        {value}
        <span className="ml-0.5 text-[9px] font-semibold opacity-65">{unit}</span>
      </span>
    </div>
  );
}
