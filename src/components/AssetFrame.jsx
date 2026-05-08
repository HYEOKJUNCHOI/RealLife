// 액자 컴포넌트 — 모든 일러스트 자리는 이걸로 통일
// slot id 만 박으면 자동으로 default 경로 → 사용자 오버라이드 → fallback 순으로 렌더
//
// 사용 예:
//   <AssetFrame slot="character.yangban" className="w-32" />
//   <AssetFrame slot="card.event.war" className="w-40" framed />

import { useState, useEffect } from 'react';
import { cn } from '@/lib/cn.js';
import { useAssetStore } from '@/stores/assetStore.js';
import { SLOT_MAP } from '@/lib/assetSlots.js';

// framed: false | 'classic' | 'gold' | 'wood'
//   - 두꺼운 테두리 + 흰 매트지 + 안쪽 그림자(가장자리 거친 픽셀 가림)
const FRAME_PRESETS = {
  classic: {
    outer: 'border-[5px] border-monopoly-red bg-white p-1.5 shadow-lg',
    inner: 'shadow-[inset_0_0_10px_2px_rgba(0,0,0,0.18)]',
  },
  gold: {
    outer:
      'border-[5px] border-[#C9A24B] bg-[#FFF8E7] p-1.5 shadow-lg ring-1 ring-[#8C6B1F]/40',
    inner: 'shadow-[inset_0_0_10px_2px_rgba(80,60,20,0.22)]',
  },
  wood: {
    outer: 'border-[6px] border-[#6B4226] bg-[#F5E6CC] p-1.5 shadow-lg',
    inner: 'shadow-[inset_0_0_10px_2px_rgba(40,20,10,0.25)]',
  },
};

export default function AssetFrame({
  slot,
  className,
  fallback: fallbackProp,
  framed = false, // false | true(=classic) | 'classic' | 'gold' | 'wood'
  rounded = 'rounded-xl',
  alt,
  // 투명 모드 — 액자/배경/비율 강제 X. 일러스트만 자연 비율로 표시 (캐릭터 마스코트용)
  // object-contain 사용 → 클리핑 0
  transparent = false,
  fit = 'cover', // 'cover' | 'contain'
}) {
  const meta = SLOT_MAP[slot];
  const override = useAssetStore((s) => s.overrides[slot]);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setErrored(false);
  }, [override, slot]);

  if (!meta) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-red-100 text-xs text-red-700',
          rounded,
          className,
        )}
      >
        ❌ {slot}
      </div>
    );
  }

  const src = override || meta.defaultPath;
  const fallback = fallbackProp ?? meta.fallback ?? '🖼';

  // framed 정규화
  const preset =
    framed === true ? FRAME_PRESETS.classic : framed ? FRAME_PRESETS[framed] : null;

  // === 투명 모드 — 일러스트만 자연 비율, 액자/배경/비율 강제 X ===
  if (transparent) {
    if (!src || errored) {
      return (
        <div
          className={cn(
            'flex items-center justify-center text-5xl',
            className,
          )}
          aria-label={meta.label}
        >
          <span>{fallback}</span>
        </div>
      );
    }
    return (
      <img
        src={src}
        alt={alt ?? meta.label}
        className={cn('block h-auto w-full select-none object-contain', className)}
        onError={() => setErrored(true)}
        draggable={false}
      />
    );
  }

  // === fallback (이미지 없거나 에러) ===
  if (!src || errored) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-black/5 text-3xl',
          meta.ratio,
          rounded,
          preset?.outer,
          className,
        )}
        aria-label={meta.label}
      >
        <span>{fallback}</span>
      </div>
    );
  }

  // === 액자 X — 그냥 이미지 (fit 옵션 가능) ===
  if (!preset) {
    return (
      <div className={cn(meta.ratio, rounded, 'overflow-hidden', className)}>
        <img
          src={src}
          alt={alt ?? meta.label}
          className={cn(
            'h-full w-full',
            fit === 'contain' ? 'object-contain' : 'object-cover',
          )}
          onError={() => setErrored(true)}
          draggable={false}
        />
      </div>
    );
  }

  // === 액자 ON — 두꺼운 테두리 + 매트지 + 안쪽 그림자 ===
  return (
    <div className={cn(meta.ratio, rounded, preset.outer, className)}>
      <div className={cn('relative h-full w-full overflow-hidden rounded-sm')}>
        <img
          src={src}
          alt={alt ?? meta.label}
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
          draggable={false}
        />
        {/* 안쪽 그림자 — 가장자리 거친 픽셀/배경 잔재 가림 */}
        <div
          className={cn('pointer-events-none absolute inset-0', preset.inner)}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
