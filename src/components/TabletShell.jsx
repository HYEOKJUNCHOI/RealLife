import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/cn.js';

const STAGE_WIDTH = 1080;
const STAGE_HEIGHT = 810;
const BEZEL = 16;
const OUTER_WIDTH = STAGE_WIDTH + BEZEL * 2;
const OUTER_HEIGHT = STAGE_HEIGHT + BEZEL * 2;
const MIN_TABLET_WIDTH = 900;
const MIN_TABLET_HEIGHT = 650;

function getViewport() {
  if (typeof window === 'undefined') {
    return { width: STAGE_WIDTH, height: STAGE_HEIGHT };
  }
  return { width: window.innerWidth, height: window.innerHeight };
}

function isLikelyRealTablet() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(pointer: coarse)').matches && window.matchMedia?.('(hover: none)').matches;
}

function shouldUseTabletFrame({ width, height }) {
  return !isLikelyRealTablet() && width >= MIN_TABLET_WIDTH && height >= MIN_TABLET_HEIGHT && width > height;
}

export default function TabletShell({ children, mode = 'setup' }) {
  const [viewport, setViewport] = useState(getViewport);

  useEffect(() => {
    const check = () => setViewport(getViewport());
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  const coarseLandscape = isLikelyRealTablet() && viewport.width > viewport.height;
  const realPhoneLandscape = coarseLandscape && viewport.height < 520;
  const realTablet = coarseLandscape && !realPhoneLandscape;
  const useTabletFrame = shouldUseTabletFrame(viewport);

  const scale = useMemo(() => {
    const pad = 48;
    const availableWidth = Math.max(1, viewport.width - pad);
    const availableHeight = Math.max(1, viewport.height - pad);
    return Math.min(1, availableWidth / OUTER_WIDTH, availableHeight / OUTER_HEIGHT);
  }, [viewport.height, viewport.width]);

  const realTabletScale = useMemo(() => {
    const safeHorizontal = 12;
    const safeVertical = 10;
    const availableWidth = Math.max(1, viewport.width - safeHorizontal);
    const availableHeight = Math.max(1, viewport.height - safeVertical);
    return Math.min(1, availableWidth / STAGE_WIDTH, availableHeight / STAGE_HEIGHT);
  }, [viewport.height, viewport.width]);

  if (realPhoneLandscape) {
    return (
      <div className="phone-landscape fixed inset-0 overflow-hidden bg-[#050505]">
        {children}
      </div>
    );
  }

  if (realTablet) {
    return (
      <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-[#050505]">
        <div
          className="relative shrink-0 overflow-hidden rounded-[18px] bg-parchment-50"
          style={{
            width: STAGE_WIDTH,
            height: STAGE_HEIGHT,
            transform: `scale(${realTabletScale})`,
            transformOrigin: 'center center',
          }}
        >
          <div className={cn('tablet-active-glow', mode === 'game' && 'is-game')} aria-hidden="true" />
          {children}
        </div>
      </div>
    );
  }

  if (!useTabletFrame) {
    return <div className="relative h-dvh overflow-hidden">{children}</div>;
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center overflow-hidden bg-[#050505]"
      style={{ background: '#050505' }}
    >
      <div
        className="relative shrink-0"
        style={{
          width: OUTER_WIDTH,
          height: OUTER_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        <div
          className="absolute inset-0 isolate overflow-hidden rounded-[38px] bg-[#050608] p-[16px]"
          style={{
            background:
              'linear-gradient(135deg, #24262b 0%, #0b0c10 46%, #020305 100%)',
            boxShadow: [
              'inset 0 3px 0 rgba(255,255,255,0.12)',
              'inset 0 -5px 0 rgba(0,0,0,0.78)',
              'inset 0 0 0 2px rgba(255,255,255,0.08)',
              '0 0 0 2px rgba(0,0,0,0.82)',
              '0 30px 58px rgba(0,0,0,0.58)',
              '0 10px 24px rgba(0,0,0,0.44)',
            ].join(', '),
          }}
        >
          <div
            className={cn(
              'relative overflow-hidden rounded-[18px] bg-parchment-50',
              'shadow-[inset_0_0_0_2px_rgba(0,0,0,0.95),inset_0_0_0_7px_rgba(20,24,31,0.96),inset_0_0_22px_rgba(0,0,0,0.68)]',
            )}
            style={{
              width: STAGE_WIDTH,
              height: STAGE_HEIGHT,
            }}
          >
            <div className={cn('tablet-active-glow', mode === 'game' && 'is-game')} aria-hidden="true" />
            {children}
          </div>
        </div>

        <div
          className="pointer-events-none absolute left-1/2 top-[7px] h-2 w-2 -translate-x-1/2 rounded-full"
          style={{
            background: 'radial-gradient(circle at 35% 30%, #35353a, #050506)',
            boxShadow:
              'inset 0 0 2px rgba(255,255,255,0.25), 0 0 0 1px rgba(0,0,0,0.35)',
          }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
