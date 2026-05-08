// 콜라주 sprite sheet에서 한 칸 잘라 표시 + 액자틀로 가리기
// 자르기 작업 없이 콜라주 통째로 저장하면 자동 적용

import { cn } from '@/lib/cn.js';

// Sprite sheet 매핑
// public/cards/_sheet/{type}.png 에 콜라주 저장
const SHEET_INFO = {
  event: {
    src: '/cards/_sheet/event.png',
    rows: 2,
    cols: 4,
    // id → [row, col] (0-indexed)
    map: {
      war: [0, 0],
      regulation: [0, 1],
      fire: [0, 2],
      bubble: [0, 3],
      redevelopment: [1, 0],
      gtx: [1, 1],
      subscription: [1, 2],
    },
  },
  chance: {
    src: '/cards/_sheet/chance.png',
    rows: 3,
    cols: 4,
    map: {
      marriage: [0, 0],
      job_change: [0, 1],
      promotion: [0, 2],
      startup: [0, 3],
      childbirth: [1, 0],
      // 변형 자녀출생 [1, 1] 스킵
      honor_retire: [1, 2],
      military: [1, 3],
      // [2, 0] 빈
      holiday_bonus: [1, 4], // ※ cols 설정 따라 조정
      accident: [2, 0],
      lotto: [2, 1],
      subscription_win: [2, 2],
      teleport: [2, 3],
    },
  },
  welfare: {
    src: '/cards/_sheet/welfare.png',
    rows: 3,
    cols: 4,
    map: {
      // 콜라주 받으면 위치 매핑
      covid: [0, 0],
      work_incentive: [0, 1],
      basic_pension: [0, 2],
      health_check: [0, 3],
      national_pension: [1, 0],
      community_fee: [1, 1],
      relative_wedding: [1, 2],
      housing_subscription: [1, 3],
      childbirth_grant: [2, 0],
      fraud_caught: [2, 1],
    },
  },
  character: {
    src: '/characters/_sheet.png',
    rows: 1,
    cols: 4,
    map: {
      general: [0, 0],
      magistrate: [0, 1],
      yangban: [0, 2],
      farmer: [0, 3],
    },
  },
  npc: {
    src: '/npc/_sheet.png',
    rows: 1,
    cols: 2,
    map: {
      realtor: [0, 0],
      loan_shark: [0, 1],
    },
  },
  skyline: {
    src: '/skyline/_sheet.png',
    rows: 3,
    cols: 4,
    map: {
      brown: [0, 0],
      lightblue: [0, 1],
      pink: [0, 2],
      orange: [1, 0],
      red: [1, 3],
      yellow: [2, 0],
      green: [2, 1],
      darkblue: [2, 2],
    },
  },
};

/**
 * 카드 일러스트 (콜라주 sprite + 액자틀)
 * @param {'event'|'chance'|'welfare'|'character'|'npc'|'skyline'} type
 * @param {string} id - 카드 ID (war, marriage, yangban 등)
 * @param {string} className - Tailwind 클래스
 * @param {boolean} framed - 액자틀 여부 (true 시 흰 배경 가림)
 */
export default function CardArtwork({ type, id, className, framed = true }) {
  const sheet = SHEET_INFO[type];
  if (!sheet) return null;

  const pos = sheet.map[id];
  if (!pos) {
    // 매핑 없으면 fallback (이모지 또는 단색)
    return (
      <div className={cn('w-full h-full bg-gray-100 flex items-center justify-center', className)}>
        <span className="text-3xl">🎴</span>
      </div>
    );
  }

  const [row, col] = pos;
  const { rows, cols, src } = sheet;

  // CSS background-position: 각 셀이 몇 % 위치인지 계산
  // background-size: 100*cols% × 100*rows% 로 sheet 전체를 cols×rows 배수로 키움
  // background-position: -col*100% (왼쪽으로 이동), -row*100% (위로 이동)
  const bgX = cols === 1 ? 0 : (col / (cols - 1)) * 100;
  const bgY = rows === 1 ? 0 : (row / (rows - 1)) * 100;

  return (
    <div
      className={cn(
        'relative w-full h-full overflow-hidden',
        framed && 'rounded-lg ring-2 ring-monopoly-red/30 bg-white shadow-inner',
        className,
      )}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${src})`,
          backgroundSize: `${cols * 100}% ${rows * 100}%`,
          backgroundPosition: `${bgX}% ${bgY}%`,
          backgroundRepeat: 'no-repeat',
        }}
      />
      {/* 액자틀 inner shadow (흰 가장자리 가리기) */}
      {framed && (
        <div className="absolute inset-0 rounded-lg shadow-[inset_0_0_8px_rgba(0,0,0,0.15)] pointer-events-none" />
      )}
    </div>
  );
}
