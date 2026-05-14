import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn.js';

const fmt = (n) => Math.round(n ?? 0).toLocaleString('ko-KR');
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

export default function AnimatedCash({ value = 0, className, duration = 900, settleDelay = 180, neutralClassName = 'text-ink', rollingEffect = true }) {
  const latestValueRef = useRef(value ?? 0);
  const committedValueRef = useRef(value ?? 0);
  const settleTimerRef = useRef(null);
  const rafRef = useRef(null);
  const toneTimerRef = useRef(null);
  const [displayValue, setDisplayValue] = useState(value ?? 0);
  const [tone, setTone] = useState('neutral');
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    latestValueRef.current = value ?? 0;
    window.clearTimeout(settleTimerRef.current);

    settleTimerRef.current = window.setTimeout(() => {
      const from = committedValueRef.current;
      const to = latestValueRef.current;
      const delta = to - from;

      window.cancelAnimationFrame(rafRef.current);
      window.clearTimeout(toneTimerRef.current);

      if (delta === 0) {
        committedValueRef.current = to;
        setDisplayValue(to);
        setTone('neutral');
        setRolling(false);
        return;
      }

      const nextTone = delta > 0 ? 'up' : 'down';
      setTone(nextTone);
      setRolling(true);

      const startedAt = performance.now();
      const tick = (now) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = easeOutCubic(progress);
        setDisplayValue(Math.round(from + delta * eased));

        if (progress < 1) {
          rafRef.current = window.requestAnimationFrame(tick);
        } else {
          committedValueRef.current = to;
          setDisplayValue(to);
          setRolling(false);
          toneTimerRef.current = window.setTimeout(() => setTone('neutral'), 520);
        }
      };

      rafRef.current = window.requestAnimationFrame(tick);
    }, settleDelay);

    return () => {
      window.clearTimeout(settleTimerRef.current);
      window.cancelAnimationFrame(rafRef.current);
      window.clearTimeout(toneTimerRef.current);
    };
  }, [value, duration, settleDelay]);

  const style =
    tone === 'up'
      ? { color: '#059669', textShadow: '0 0 9px rgba(16,185,129,0.52)' }
      : tone === 'down'
        ? { color: '#dc2626', textShadow: '0 0 9px rgba(220,38,38,0.48)' }
        : undefined;

  return (
    <span
      className={cn(
        'inline-block tabular-nums transition-colors duration-150',
        rollingEffect && rolling && 'cash-roll-active',
        tone === 'neutral' && neutralClassName,
        className,
      )}
      style={style}
    >
      {fmt(displayValue)}
    </span>
  );
}
