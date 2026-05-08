// 모달 베이스 — 정통 모노폴리 deed card 결
// - 양피지 표면 + 두꺼운 검정 윤곽 + 살짝 들린 그림자
// - 카드가 보드 위로 "툭" 떨어지는 deed-drop 애니메이션
// - 가로 스크롤바 떠있는 문제 방지 (no-scrollbar)
import { cn } from '@/lib/cn.js';

export default function ModalBase({
  open,
  onClose,
  children,
  className,
  style,
  hideClose = false,
  size = 'md', // 'sm' | 'md' | 'lg'
}) {
  if (!open) return null;

  const widthCls = {
    sm: 'w-[min(92vw,360px)]',
    md: 'w-[min(92vw,440px)]',
    lg: 'w-[min(94vw,560px)]',
  }[size];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 backdrop-blur-[3px] p-3"
      onClick={onClose}
    >
      <div
        className={cn(
          'deed-surface relative max-h-[88vh] overflow-y-auto overflow-x-hidden no-scrollbar',
          'animate-[deed-drop_0.42s_cubic-bezier(0.2,0.9,0.3,1.2)_forwards]',
          widthCls,
          className,
        )}
        style={style}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
        {!hideClose && onClose && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className={cn(
              // 모달 내부 최상단. 바깥으로 빼면 부모 overflow 에 잘리므로 안쪽에 고정.
              'absolute right-2 top-2 z-[10000] grid h-9 w-9 place-items-center rounded-full',
              'border-2 border-ink-line bg-ink text-lg font-extrabold leading-none text-white',
              'shadow-[0_2px_0_0_#0F0C0A,0_0_0_3px_rgba(255,255,255,0.25),0_6px_12px_rgba(0,0,0,0.5)]',
              'transition-colors hover:bg-monopoly-red',
            )}
            aria-label="닫기"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
