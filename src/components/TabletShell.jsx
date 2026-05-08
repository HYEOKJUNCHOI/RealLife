// TabletShell — PC/와이드 화면일 때 태블릿 mockup 안에 게임을 렌더
// 모바일/태블릿 실기기에선 풀스크린 그대로.
//
// 컨셉: 우리 게임은 iPad 가로용. PC에서 보면 거대한 빈 공간 + 깨진 비율.
// 그래서 PC 사용자에겐 "데스크 위에 놓인 태블릿" 메타포로 감싸서
// 태블릿 안 = 실제 게임 화면. 태블릿 밖 = 어두운 데스크 (radial gradient).

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn.js';

// PC 판단 기준
const PC_MIN_WIDTH = 1280;
const PC_MIN_RATIO = 1.4; // 가로/세로

function isPCViewport() {
  if (typeof window === 'undefined') return false;
  const w = window.innerWidth;
  const h = window.innerHeight;
  return w >= PC_MIN_WIDTH && w / h >= PC_MIN_RATIO;
}

export default function TabletShell({ children }) {
  const [isPC, setIsPC] = useState(isPCViewport);

  useEffect(() => {
    const check = () => setIsPC(isPCViewport());
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // === 모바일/실태블릿 — 풀스크린 그대로 ===
  if (!isPC) {
    return (
      <div className="relative min-h-dvh overflow-hidden">{children}</div>
    );
  }

  // === PC — 태블릿 mockup 안에 게임 ===
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-6"
      style={{
        background:
          'radial-gradient(ellipse at center, #1a1a1f 0%, #08080c 80%, #000 100%)',
      }}
    >
      {/* 태블릿 본체 — 알루미늄 결 (iPad Space Gray) */}
      <div
        className="relative shrink-0"
        style={{
          width: 'min(96vw, 1500px)',
          aspectRatio: '1194 / 834', // iPad Pro 11" 정확한 비율
          maxHeight: '94vh',
        }}
      >
        {/* 베젤 — 알루미늄 그라디언트 + Netflix 그림자 */}
        <div
          className="absolute inset-0 rounded-[36px] p-[14px]"
          style={{
            background: [
              // 메인 알루미늄 결
              'linear-gradient(135deg, #4a4a52 0%, #2a2a30 50%, #18181d 100%)',
            ].join(', '),
            boxShadow: [
              // 베젤 입체감 — 위쪽 하이라이트
              'inset 0 2px 0 0 rgba(255,255,255,0.12)',
              'inset 0 -1px 0 0 rgba(0,0,0,0.6)',
              // 외곽 어두운 ring
              'inset 0 0 0 1px rgba(0,0,0,0.5)',
              // Netflix 결 깊은 그림자 + 빨강 글로우
              '0 0 0 1px rgba(255,255,255,0.04)',
              '0 40px 80px -10px rgba(0,0,0,0.95)',
              '0 18px 40px -6px rgba(0,0,0,0.7)',
              '0 0 120px 8px rgba(211,47,47,0.18)',
            ].join(', '),
          }}
        >
          {/* 화면 (실제 게임 영역) */}
          {/* background:#000 제거 — 도심 배경(CityBackground)이 그 자리 차지하므로 검정 베이스가 도심을 덮으면 안 됨 */}
          <div
            className={cn(
              'relative h-full w-full overflow-hidden rounded-[24px]',
              // 디스플레이 안쪽 살짝 어두운 ring + 미세 reflection
              'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),inset_0_0_24px_2px_rgba(0,0,0,0.4)]',
            )}
          >
            {children}

            {/* 화면 위 reflection (subtle 광택) */}
            <div
              className="pointer-events-none absolute inset-0 rounded-[24px]"
              style={{
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 30%, transparent 70%, rgba(255,255,255,0.02) 100%)',
              }}
              aria-hidden="true"
            />
          </div>
        </div>

        {/* 전면 카메라 (상단 중앙 살짝 들어간 점) */}
        <div
          className="pointer-events-none absolute left-1/2 top-[6px] h-1.5 w-1.5 -translate-x-1/2 rounded-full"
          style={{
            background: 'radial-gradient(circle at 30% 30%, #2a2a30, #000)',
            boxShadow:
              'inset 0 0 2px rgba(255,255,255,0.15), 0 0 0 1px rgba(255,255,255,0.06)',
          }}
          aria-hidden="true"
        />

        {/* 하단 라벨 */}
        <div
          className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 font-display text-[10px] font-semibold uppercase tracking-[0.4em] text-white/25"
          aria-hidden="true"
        >
          The Reallife · iPad Preview
        </div>
      </div>
    </div>
  );
}
