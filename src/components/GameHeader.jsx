// 메인 헤더 — 큰 현금 + 글로벌 게임 상태(년차/인플레/이자율)
//   - 좌: ₩ 큰 현금 (현재 차례 플레이어)
//   - 우: 글로벌 정보 칩 (년차 / 인플레 / 이자율) + 셋업 ⚙
// 사회자(객주 NPC) 멘트는 CurrentPlayerStage 로 이동 (사용자 명시)
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/cn.js';

const fmt = (n) => (n ?? 0).toLocaleString('ko-KR');
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
          <AnimatePresence mode="popLayout">
            <motion.div
              key={cash}
              initial={{ y: -6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 6, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className="flex items-baseline gap-1"
            >
              <span className="text-2xl leading-none drop-shadow-[0_0_10px_rgba(255,193,7,0.7)]">
                💰
              </span>
              <span
                className={cn(
                  'font-display font-extrabold leading-none text-monopoly-red tabular-nums',
                  compact ? 'text-[26px]' : 'text-[40px] md:text-[44px]',
                )}
                style={{
                  textShadow:
                    '0 0 14px rgba(255,193,7,0.45), 0 0 28px rgba(211,47,47,0.3), 0 2px 0 rgba(15,12,10,0.25)',
                  letterSpacing: '-0.02em',
                }}
              >
                {fmt(cash)}
              </span>
              <span className="font-display text-[12px] font-bold uppercase tracking-widest text-ink/55">
                만
              </span>
            </motion.div>
          </AnimatePresence>
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
