// 캐릭터 아바타 컴포넌트 — 일러스트 있으면 이미지, 없으면 이모지
import { getCharacterImg, CHARACTER_META } from '@/lib/assets.js';
import { cn } from '@/lib/cn.js';

export default function CharacterAvatar({ id, size = 'md', showName = false, className }) {
  const img = getCharacterImg(id);
  const meta = CHARACTER_META[id] ?? { name: id, emoji: '🎭' };

  const sizeClasses = {
    xs: 'w-8 h-8 text-base',
    sm: 'w-12 h-12 text-xl',
    md: 'w-20 h-20 text-3xl',
    lg: 'w-32 h-32 text-5xl',
    xl: 'w-48 h-48 text-7xl',
  };

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div
        className={cn(
          'relative rounded-xl bg-card-default flex items-center justify-center overflow-hidden',
          'ring-1 ring-white/10',
          sizeClasses[size],
        )}
      >
        {img ? (
          <img
            src={img}
            alt={meta.name}
            className="w-full h-full object-cover object-top"
            // 이미지 로드 실패 시 이모지 fallback
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              if (e.currentTarget.nextSibling) {
                e.currentTarget.nextSibling.style.display = 'flex';
              }
            }}
          />
        ) : null}
        {/* fallback 이모지 (이미지 없거나 로드 실패) */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ display: img ? 'none' : 'flex' }}
        >
          {meta.emoji}
        </div>
      </div>
      {showName && (
        <div className="mt-1 text-xs font-bold text-center">{meta.name}</div>
      )}
    </div>
  );
}
