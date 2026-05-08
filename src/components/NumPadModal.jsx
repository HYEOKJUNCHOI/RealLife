// 숫자 패드 모달 — 아이폰 계산기 결
// - 큰 디스플레이 + 4×4 그리드 (7 8 9 ⌫ / 4 5 6 C / 1 2 3 0 / 00 ✓)
// - 검정 배경 + 둥근 회색 버튼 + 빨강 강조 (확인)
// - 입력 즉시 reflect, 확인 누르면 onConfirm + 닫힘

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/cn.js';

export default function NumPadModal({
  open,
  onClose,
  onConfirm,
  initialValue = 0,
  label = '값 입력',
  unit = '',
  maxLength = 7,
}) {
  const [buf, setBuf] = useState(String(initialValue));
  const [touched, setTouched] = useState(false);

  // open 될 때 초기값 다시 세팅
  useEffect(() => {
    if (open) {
      setBuf(String(initialValue ?? 0));
      setTouched(false);
    }
  }, [open, initialValue]);

  // ESC = 취소, Enter = 확인
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      else if (e.key === 'Enter') confirm();
      else if (e.key === 'Backspace') backspace();
      else if (/^\d$/.test(e.key)) press(e.key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, buf]);

  const press = (digit) => {
    setTouched(true);
    setBuf((prev) => {
      const next = prev === '0' || !touched ? String(digit) : prev + String(digit);
      return next.slice(0, maxLength);
    });
  };
  const pressDouble = () => {
    if (!touched) {
      setTouched(true);
      setBuf('0');
      return;
    }
    setBuf((prev) => (prev + '00').slice(0, maxLength));
  };
  const backspace = () => {
    setTouched(true);
    setBuf((prev) => (prev.length <= 1 ? '0' : prev.slice(0, -1)));
  };
  const clear = () => {
    setTouched(true);
    setBuf('0');
  };
  const confirm = () => {
    const v = parseInt(buf, 10) || 0;
    onConfirm?.(v);
  };

  if (!open) return null;

  const display = (parseInt(buf, 10) || 0).toLocaleString('ko-KR');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, y: 12, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          className="w-[min(94vw,360px)] overflow-hidden rounded-3xl border-2 border-black bg-[#1a1a1d] shadow-[0_30px_60px_-10px_rgba(0,0,0,0.85),0_0_60px_8px_rgba(211,47,47,0.18)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between border-b border-white/8 px-4 py-2">
            <span className="font-display text-[10px] font-bold uppercase tracking-[0.25em] text-white/55">
              {label}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white/85 hover:bg-white/20"
              aria-label="닫기"
            >
              ✕
            </button>
          </div>

          {/* 디스플레이 */}
          <div className="px-5 pt-5 pb-3 text-right">
            <div className="font-display text-[11px] font-semibold uppercase tracking-widest text-white/40">
              현재 값
            </div>
            <div
              className="font-display font-extrabold leading-none text-white tabular-nums"
              style={{ fontSize: '54px', letterSpacing: '-0.02em' }}
            >
              {display}
              {unit && (
                <span className="ml-1 text-[20px] font-bold text-white/55">
                  {unit}
                </span>
              )}
            </div>
          </div>

          {/* 키패드 4×4 */}
          <div className="grid grid-cols-4 gap-2 px-3 pb-3">
            <Key onClick={() => press('7')}>7</Key>
            <Key onClick={() => press('8')}>8</Key>
            <Key onClick={() => press('9')}>9</Key>
            <Key onClick={backspace} variant="amber">⌫</Key>

            <Key onClick={() => press('4')}>4</Key>
            <Key onClick={() => press('5')}>5</Key>
            <Key onClick={() => press('6')}>6</Key>
            <Key onClick={clear} variant="amber">C</Key>

            <Key onClick={() => press('1')}>1</Key>
            <Key onClick={() => press('2')}>2</Key>
            <Key onClick={() => press('3')}>3</Key>
            <Key onClick={pressDouble} variant="ghost">00</Key>

            <Key onClick={() => press('0')} className="col-span-2">0</Key>
            <Key onClick={confirm} variant="red" className="col-span-2">
              확인
            </Key>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Key({ children, onClick, variant = 'default', className }) {
  const cls = {
    default:
      'bg-[#33333a] text-white hover:bg-[#43434a] active:bg-[#22222a]',
    ghost:
      'bg-[#2a2a30] text-white/85 hover:bg-[#3a3a40] active:bg-[#1f1f24]',
    amber:
      'bg-[#a06a25] text-white hover:bg-[#b87a2c] active:bg-[#7a521b]',
    red:
      'bg-monopoly-red text-white hover:bg-monopoly-deep active:bg-monopoly-deep',
  }[variant];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-14 items-center justify-center rounded-2xl font-display text-[22px] font-bold tabular-nums transition shadow-[0_3px_0_0_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.08)] active:translate-y-[2px] active:shadow-[0_1px_0_0_rgba(0,0,0,0.5)]',
        cls,
        className,
      )}
    >
      {children}
    </button>
  );
}
