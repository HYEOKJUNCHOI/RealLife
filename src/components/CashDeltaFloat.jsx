import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn.js';

const normalize = (n) => {
  const value = Number(n);
  return Number.isFinite(value) ? value : 0;
};
const fmt = (n) => Math.round(normalize(n)).toLocaleString('ko-KR');

export default function CashDeltaFloat({ value = 0, className }) {
  const safeInitialValue = normalize(value);
  const latestValueRef = useRef(safeInitialValue);
  const committedValueRef = useRef(safeInitialValue);
  const settleTimerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const [delta, setDelta] = useState(null);

  useEffect(() => {
    latestValueRef.current = normalize(value);
    window.clearTimeout(settleTimerRef.current);

    settleTimerRef.current = window.setTimeout(() => {
      const from = committedValueRef.current;
      const to = latestValueRef.current;
      const diff = normalize(to - from);
      committedValueRef.current = to;

      window.clearTimeout(hideTimerRef.current);
      if (diff === 0) {
        setDelta(null);
        return;
      }

      setDelta({ value: diff, id: Date.now() });
      hideTimerRef.current = window.setTimeout(() => setDelta(null), 1100);
    }, 180);

    return () => {
      window.clearTimeout(settleTimerRef.current);
      window.clearTimeout(hideTimerRef.current);
    };
  }, [value]);

  if (!delta) return null;

  return (
    <span
      key={delta.id}
      className={cn(
        'cash-delta-float pointer-events-none absolute z-[9999] whitespace-nowrap font-display text-[13px] font-extrabold leading-none',
        delta.value > 0 ? 'text-emerald-500' : 'text-red-500',
        className,
      )}
      style={{
        textShadow:
          delta.value > 0
            ? '0 0 8px rgba(16,185,129,0.9), 0 1px 0 rgba(255,255,255,0.8), 0 2px 0 rgba(15,12,10,0.38)'
            : '0 0 8px rgba(239,68,68,0.86), 0 1px 0 rgba(255,255,255,0.75), 0 2px 0 rgba(15,12,10,0.38)',
      }}
    >
      {delta.value > 0 ? '+' : ''}{fmt(delta.value)}만
    </span>
  );
}
