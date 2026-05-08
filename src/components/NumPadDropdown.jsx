// 숫자 패드 드롭다운 — 입력 필드 바로 아래에 자연스럽게 펼쳐짐
// 모달이 아니라 anchor 아래로 absolute 위치 + slide-down 애니메이션
//
// 사용처:
//   <div className="relative">
//     <button>2,500</button>
//     <NumPadDropdown open value onChange onClose />
//   </div>
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/cn.js';

export default function NumPadDropdown({
  open,
  onClose,
  onConfirm,
  initialValue = 0,
  unit = '',
  maxLength = 7,
  align = 'right', // 'left' | 'right' — 트리거 기준
}) {
  const [buf, setBuf] = useState(String(initialValue));
  const [touched, setTouched] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (open) {
      setBuf(String(initialValue ?? 0));
      setTouched(false);
    }
  }, [open, initialValue]);

  // 외부 클릭 → 닫기 (확정)
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        const v = parseInt(buf, 10) || 0;
        onConfirm?.(v);
        onClose?.();
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, buf, onConfirm, onClose]);

  // 키보드 입력
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
    onClose?.();
  };

  const display = (parseInt(buf, 10) || 0).toLocaleString('ko-KR');

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 360, damping: 28 }}
          className={cn(
            // top-full: 트리거 바로 아래 / w-64: 256px (좁은 폭에 맞춤) / right-0: 우측 정렬
            'absolute top-full z-50 mt-2 w-64 rounded-2xl border-2 border-black bg-[#1a1a1d] shadow-[0_20px_40px_-8px_rgba(0,0,0,0.85),0_0_40px_4px_rgba(211,47,47,0.18)]',
            align === 'right' ? 'right-0' : 'left-0',
          )}
          // 트리거 input 의 클릭 이벤트가 외부 클릭으로 잡히지 않게
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* 작은 화살표 (트리거 위쪽 가리킴) */}
          <div
            className={cn(
              'absolute -top-1.5 h-3 w-3 rotate-45 border-l-2 border-t-2 border-black bg-[#1a1a1d]',
              align === 'right' ? 'right-4' : 'left-4',
            )}
            aria-hidden="true"
          />

          {/* 헤더 — 좌:디스플레이 / 우:X 닫기 */}
          <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
            <div
              className="font-display font-extrabold leading-none text-white tabular-nums"
              style={{ fontSize: '32px', letterSpacing: '-0.02em' }}
            >
              {display}
              {unit && (
                <span className="ml-1 text-[15px] font-bold text-white/55">
                  {unit}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[14px] font-bold text-white/70 transition hover:bg-white/20 hover:text-white active:translate-y-[1px]"
            >
              ✕
            </button>
          </div>

          {/* 키패드 4×4 */}
          <div className="grid grid-cols-4 gap-1.5 px-2 pb-2">
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
      )}
    </AnimatePresence>
  );
}

function Key({ children, onClick, variant = 'default', className }) {
  const cls = {
    default: 'bg-[#33333a] text-white hover:bg-[#43434a] active:bg-[#22222a]',
    ghost: 'bg-[#2a2a30] text-white/85 hover:bg-[#3a3a40] active:bg-[#1f1f24]',
    amber: 'bg-[#a06a25] text-white hover:bg-[#b87a2c] active:bg-[#7a521b]',
    red: 'bg-monopoly-red text-white hover:bg-monopoly-deep active:bg-monopoly-deep',
  }[variant];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-11 items-center justify-center rounded-xl font-display text-[18px] font-bold tabular-nums transition shadow-[0_2px_0_0_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.08)] active:translate-y-[1px] active:shadow-[0_1px_0_0_rgba(0,0,0,0.5)]',
        cls,
        className,
      )}
    >
      {children}
    </button>
  );
}
