// 매트릭스 초록/빨강 페이드아웃 — 인컴/지출 시각 트리거
// 인컴 = #00FF41 (매트릭스 초록), 지출 = #FF0040 (빨강)
// 1.5초 떠올랐다 사라짐
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore.js';

export default function MatrixToast() {
  const toasts = useGameStore((s) => s.toasts ?? []);
  const removeToast = useGameStore((s) => s.removeToast);

  return (
    <div className="pointer-events-none fixed inset-0 z-[100]">
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDone={() => removeToast?.(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onDone }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 마운트 직후 페이드 인
    const t1 = setTimeout(() => setVisible(true), 10);
    // 1.5초 후 페이드 아웃 + 제거
    const t2 = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 400);
    }, 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  if (toast.message) {
    const tone = {
      success: {
        icon: '✓',
        border: '#1FB25A',
        glow: 'rgba(31,178,90,0.38)',
      },
      warn: {
        icon: '!',
        border: '#D32F2F',
        glow: 'rgba(211,47,47,0.34)',
      },
      info: {
        icon: '⚙',
        border: '#0072BB',
        glow: 'rgba(0,114,187,0.34)',
      },
    }[toast.tone ?? 'info'];

    return (
      <motion.div
        initial={{ y: -18, opacity: 0, scale: 0.94 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -10, opacity: 0, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 420, damping: 30 }}
        className="absolute left-1/2 top-5 flex min-w-[280px] -translate-x-1/2 items-center gap-3 rounded-md border-2 bg-parchment-50 px-4 py-3 font-display shadow-[0_4px_0_0_#0F0C0A,0_10px_24px_-8px_rgba(0,0,0,0.55)]"
        style={{
          borderColor: tone.border,
          boxShadow: `0 4px 0 0 #0F0C0A, 0 0 0 3px ${tone.glow}, 0 12px 26px -10px rgba(0,0,0,0.65)`,
        }}
      >
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-[14px] font-extrabold"
          style={{ borderColor: tone.border, color: tone.border }}
        >
          {tone.icon}
        </span>
        <span className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-ink">
          {toast.message}
        </span>
      </motion.div>
    );
  }

  const isIncome = toast.type === 'income';
  const color = isIncome ? '#00FF41' : '#FF0040';
  const sign = isIncome ? '+' : '-';
  const value = Math.abs(toast.amount);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{
        opacity: visible ? 1 : 0,
        scale: visible ? 1 : 0.5,
      }}
      exit={{ opacity: 0, scale: 0.5 }}
      className="absolute font-mono font-bold transition-all duration-500 ease-out"
      style={{
        left: toast.x ?? '50%',
        top: toast.y ?? '50%',
        transform: visible
          ? 'translate(-50%, -100%) scale(1)'
          : 'translate(-50%, -50%) scale(0.5)',
        opacity: visible ? 1 : 0,
        color,
        textShadow: `0 0 8px ${color}`,
        fontSize: toast.size ?? '1.5rem',
      }}
    >
      {sign}{value}만
    </motion.div>
  );
}
