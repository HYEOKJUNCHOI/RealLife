// 도심 배경 — 밤도시 일러스트 + 차선 도로 + 픽셀 차들 (원근감 3 lane)
// fixed/absolute로 깔리고, 게임 UI는 그 위에 떠 있음.
//
// 구성:
//   1. 밤도시 일러스트 (스카이라인 + 강 + 다리)
//   2. 도로 (회색 + 노란 점선 차선)
//   3. 차 3 lane — 가까울수록 크고 빠름 (원근감)
//
// 성능: CSS keyframe만 사용 (JS animation X), <img> 자연 PNG.

import { useMemo } from 'react';
import { cn } from '@/lib/cn.js';

// 차 이미지 풀 — public/cars/*.png
const CAR_IMAGES = [
  { src: '/cars/truck-orange.png', label: '트럭' },
  { src: '/cars/firetruck.png', label: '소방차' },
  { src: '/cars/excavator.png', label: '굴삭기' },
  { src: '/cars/sedan-orange.png', label: '승용차', sizeBoost: 0.78 }, // 픽셀이 작게 나오므로 좀 더 줄임
  { src: '/cars/concrete-mixer.png', label: '믹서차' },
  { src: '/cars/garbage-truck.png', label: '쓰레기차' },
  { src: '/cars/camper.png', label: '캠핑카' },
  { src: '/cars/schoolbus.png', label: '스쿨버스' },
  { src: '/cars/van-purple.png', label: '미니밴' },
  { src: '/cars/van-teal.png', label: '미니밴' },
  { src: '/cars/citybus.png', label: '시내버스' },
];

// 차선 정의 — 가까운 lane(앞)일수록 크고 빠름 (원근감)
//   y: 화면 전체 기준 bottom % (도로 영역 0~40% 안에서 배치)
//   dir: 1=오른쪽, -1=왼쪽
//   baseSpeed: 무한 슬라이드 한 바퀴(초). 작을수록 빠름
//   scale: lane 기본 크기 (앞=1, 뒤=작음)
//   height: 차 높이 (px) — perspective
// 차선 영역 좁은 띠 (화면 하단 ~22%) — 위쪽 두 lane 제거하고 가까운 2개만 양방향
const LANES = [
  { y: 6, dir: 1, baseSpeed: 12, scale: 1.0, height: 28 }, // 가까운 →
  { y: 11, dir: -1, baseSpeed: 16, scale: 0.85, height: 22 }, // 가까운-중 ←
];

// 캐릭터 4인 (한국판) — 포탈로 넘어온 과거 인물들 실루엣
const CHARACTER_IDS = ['yangban', 'general', 'magistrate', 'farmer'];

const seedRandom = (seed) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

export default function CityBackground({ className }) {
  const cars = useMemo(() => {
    const rand = seedRandom(42);
    const list = [];
    LANES.forEach((lane, laneIdx) => {
      const carCount = 4 + laneIdx; // 먼 lane 일수록 더 많이 (4·5·6·7)
      for (let i = 0; i < carCount; i++) {
        const carImg = CAR_IMAGES[Math.floor(rand() * CAR_IMAGES.length)];
        list.push({
          id: `${laneIdx}-${i}`,
          lane: laneIdx,
          img: carImg,
          delay: -(lane.baseSpeed * (i / carCount + rand() * 0.15)),
          duration: lane.baseSpeed * (0.85 + rand() * 0.3),
          yOffset: (rand() - 0.5) * 0.8,
        });
      }
    });
    return list;
  }, []);

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        className,
      )}
      aria-hidden="true"
    >
      {/* 1. 밤도시 일러스트 — 화면 전체에 깔고 PNG 안에 그려진 강/도로 그대로 활용 */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src="/cityscape/night-city.png"
          alt=""
          className="h-full w-full object-cover"
          style={{
            objectPosition: 'right top',
            transform: 'scale(1.4)',
            transformOrigin: 'top right', // 우상단 기준 확대 → 건물이 화면 더 큰 비중 차지
            filter: 'saturate(1.45) brightness(1.18) contrast(1.12)', // 명도·채도·대비 올려 톤을 진하게
          }}
        />

        {/* [A] 전체 색조 통일 레이어 — PNG 노을 베이지를 도시 밤하늘 보라-어둠으로 물들임
            multiply 블렌드 + 화면 전체 커버 → 노을/도로 경계 가로줄 사라짐 */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(18,10,38,0.45) 0%, rgba(36,28,64,0.35) 30%, rgba(54,55,76,0.55) 60%, rgba(42,40,68,0.72) 100%)',
            mixBlendMode: 'multiply',
          }}
        />

        {/* [B] 위쪽 밤하늘 강화 — 상단 20% 깊게 어두워지며 별빛/하늘 색조 고정 */}
        <div
          className="absolute inset-x-0 top-0 h-[22%]"
          style={{
            background:
              'linear-gradient(to bottom, rgba(8,4,24,0.82) 0%, rgba(13,10,31,0.6) 50%, transparent 100%)',
          }}
        />

        {/* [C] 하단 도로 심화 어둠 — 강/도로 구간을 한 덩어리 짙은 어둠으로 묶음 */}
        <div
          className="absolute inset-x-0 bottom-0 h-[30%]"
          style={{
            background:
              'linear-gradient(to top, rgba(20,18,42,0.88) 0%, rgba(36,34,60,0.65) 45%, transparent 100%)',
          }}
        />

        {/* [D] 화면 전체 vignette — 4면 모서리에서 안쪽으로 어두워짐 → 일러스트 액자 결 */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 90% 80% at 60% 45%, transparent 35%, rgba(10,6,28,0.55) 75%, rgba(8,4,22,0.82) 100%)',
          }}
        />

        {/* 노을 반짝이 — 위쪽 하늘 영역에 주황·빨강·앰버 톤 별빛 깜빡 */}
        <div
          className="absolute inset-x-0 top-0 h-[40%]"
          style={{
            background:
              'radial-gradient(circle at 12% 22%, rgba(255,140,66,1) 0 2.4px, transparent 3.4px),' +
              'radial-gradient(circle at 28% 12%, rgba(255,90,55,1) 0 2px, transparent 3px),' +
              'radial-gradient(circle at 42% 28%, rgba(255,180,80,1) 0 2.6px, transparent 3.6px),' +
              'radial-gradient(circle at 58% 16%, rgba(255,90,55,1) 0 2.2px, transparent 3.2px),' +
              'radial-gradient(circle at 75% 30%, rgba(255,140,66,1) 0 2.4px, transparent 3.4px),' +
              'radial-gradient(circle at 88% 18%, rgba(255,200,90,1) 0 2px, transparent 3px)',
            animation: 'sunset-twinkle-a 1.6s ease-in-out infinite',
            filter:
              'drop-shadow(0 0 8px rgba(255,140,66,0.95)) drop-shadow(0 0 16px rgba(255,90,55,0.6))',
            mixBlendMode: 'screen',
          }}
        />
        <div
          className="absolute inset-x-0 top-0 h-[40%]"
          style={{
            background:
              'radial-gradient(circle at 20% 38%, rgba(255,210,120,1) 0 2px, transparent 3px),' +
              'radial-gradient(circle at 36% 8%, rgba(220,60,40,1) 0 2.4px, transparent 3.4px),' +
              'radial-gradient(circle at 52% 35%, rgba(255,160,70,1) 0 2.2px, transparent 3.2px),' +
              'radial-gradient(circle at 68% 6%, rgba(255,100,55,1) 0 2px, transparent 3px),' +
              'radial-gradient(circle at 82% 36%, rgba(255,180,80,1) 0 2.6px, transparent 3.6px),' +
              'radial-gradient(circle at 95% 24%, rgba(220,60,40,1) 0 2.2px, transparent 3.2px)',
            animation: 'sunset-twinkle-b 2.1s ease-in-out infinite',
            filter:
              'drop-shadow(0 0 10px rgba(255,180,80,0.95)) drop-shadow(0 0 18px rgba(220,60,40,0.55))',
            mixBlendMode: 'screen',
          }}
        />
      </div>

      {/* 차선 — 두 lane 사이 양방향 구분 점선 (노란색) */}
      <div
        className="absolute inset-x-0 h-[2px]"
        style={{
          bottom: 'calc(7% - 1px)',
          backgroundImage:
            'repeating-linear-gradient(to right, rgba(255,209,102,0.7) 0 22px, transparent 22px 50px)',
          opacity: 0.75,
        }}
      />

      {/* 3. 차들 */}
      {cars.map((car) => {
        const lane = LANES[car.lane];
        return (
          <Car
            key={car.id}
            img={car.img}
            bottom={`${lane.y + car.yOffset}%`}
            direction={lane.dir}
            duration={car.duration}
            delay={car.delay}
            height={lane.height * (car.img.sizeBoost ?? 1)}
            laneScale={lane.scale}
          />
        );
      })}

      {/* 4. 전체 어둠 오버레이 — 게임 UI 가독성 보강 */}
      <div className="absolute inset-0 bg-black/15" />

      {/* 4b. 포탈 차폐 마스크 — 좌하단 corner radial 페이드 (사각 라인 X, 자연스러움) */}
      <div
        className="absolute"
        style={{
          left: 0,
          bottom: 0,
          width: 'clamp(180px, 22vw, 300px)', // radial 페이드 위해 살짝 넉넉
          height: '24%',
          background:
            'radial-gradient(ellipse 100% 130% at 0% 100%, #14122a 28%, rgba(20,18,42,0.78) 55%, rgba(22,20,44,0.35) 78%, transparent 96%)',
          zIndex: 25,
        }}
      />

      {/* 5. 시간 포탈 — 왼쪽 구석, 70%만 보이게 (30% 잘림) + 더 아래로 끌어내림 */}
      <div
        className="absolute"
        style={{
          left: 0,
          bottom: '-4%', // 화면 하단보다 살짝 더 내려감 — 포탈 밑단이 도로 아래로 잠긴 결
          width: 'clamp(230px, 30vw, 400px)', // 더 키움
          aspectRatio: '1 / 1',
          transform: 'translateX(-30%)', // 가로의 30% 가 화면 밖 → 70% 만 보임
          zIndex: 30, // 차들 위로 → 차들이 포탈을 가리거나 지나치지 못함
        }}
      >
        {/* 글로우 halo — 영역 좁히고 alpha 줄여서 빛 차분하게 */}
        <div
          className="absolute inset-0 -m-[35%]"
          style={{
            background:
              'radial-gradient(circle, rgba(125,211,252,0.42) 0%, rgba(96,165,250,0.28) 24%, rgba(99,102,241,0.16) 50%, rgba(168,85,247,0.08) 70%, transparent 85%)',
            animation: 'portal-halo 2.4s ease-in-out infinite',
            mixBlendMode: 'screen',
          }}
        />
        {/* 포탈 PNG — 천천히 회전 + 깜빡깜빡 글로우 */}
        <img
          src="/cityscape/portal.png"
          alt=""
          className="absolute inset-0 h-full w-full object-contain"
          style={{
            animation:
              'portal-spin 18s linear infinite, portal-flicker 1.6s ease-in-out infinite',
          }}
        />
        {/* sparkle 점 — 가장자리 미세 깜빡 (화려함 보강) */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 22% 32%, rgba(255,255,255,0.9) 0 2px, transparent 3px), radial-gradient(circle at 78% 28%, rgba(186,230,253,0.95) 0 1.5px, transparent 2.5px), radial-gradient(circle at 68% 76%, rgba(255,255,255,0.85) 0 2px, transparent 3px)',
            animation: 'portal-sparkle 1.8s ease-in-out infinite',
          }}
        />
      </div>

      {/* 5b. 포탈 연기·네온 — 캐릭터(z-index 31) 위로 띄워서 가려지지 않게 (z-index 32) */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: 0,
          bottom: '-4%',
          width: 'clamp(230px, 30vw, 400px)',
          aspectRatio: '1 / 1',
          transform: 'translateX(-30%)',
          zIndex: 32,
        }}
      >
        {/* 아래편 신비 연기 — 두 겹 wisp 다른 속도로 떠오름 (alpha·blur 키움) */}
        <div
          className="absolute inset-x-0 -bottom-[18%] h-[60%]"
          style={{
            background:
              'radial-gradient(ellipse 80% 70% at 45% 100%, rgba(125,211,252,0.85) 0%, rgba(99,102,241,0.45) 35%, transparent 75%)',
            filter: 'blur(8px)',
            animation: 'portal-smoke 3.4s ease-in-out infinite',
            mixBlendMode: 'screen',
          }}
        />
        <div
          className="absolute inset-x-0 -bottom-[12%] h-[50%]"
          style={{
            background:
              'radial-gradient(ellipse 65% 55% at 60% 95%, rgba(167,139,250,0.7) 0%, rgba(125,211,252,0.4) 40%, transparent 80%)',
            filter: 'blur(12px)',
            animation: 'portal-smoke-slow 5.2s ease-in-out infinite',
            mixBlendMode: 'screen',
          }}
        />

        {/* 윗편 네온 반짝이 — 점 크기·glow 키워서 또렷하게 */}
        <div
          className="absolute -top-[15%] inset-x-0 h-[60%]"
          style={{
            background:
              'radial-gradient(circle at 28% 35%, rgba(255,182,255,1) 0 2.6px, transparent 3.6px),' +
              'radial-gradient(circle at 62% 22%, rgba(125,211,252,1) 0 2.2px, transparent 3.2px),' +
              'radial-gradient(circle at 82% 48%, rgba(186,230,253,1) 0 2.6px, transparent 3.6px),' +
              'radial-gradient(circle at 18% 65%, rgba(167,139,250,1) 0 2.4px, transparent 3.4px)',
            animation: 'neon-twinkle-a 1.2s ease-in-out infinite',
            filter:
              'drop-shadow(0 0 6px rgba(186,230,253,1)) drop-shadow(0 0 12px rgba(125,211,252,0.7))',
          }}
        />
        <div
          className="absolute -top-[6%] inset-x-0 h-[60%]"
          style={{
            background:
              'radial-gradient(circle at 45% 18%, rgba(56,189,248,1) 0 2px, transparent 3px),' +
              'radial-gradient(circle at 72% 60%, rgba(255,255,255,1) 0 2.2px, transparent 3.2px),' +
              'radial-gradient(circle at 38% 55%, rgba(255,182,255,1) 0 2px, transparent 3px),' +
              'radial-gradient(circle at 90% 30%, rgba(125,211,252,1) 0 2.4px, transparent 3.4px)',
            animation: 'neon-twinkle-b 1.7s ease-in-out infinite',
            filter:
              'drop-shadow(0 0 8px rgba(167,139,250,0.95)) drop-shadow(0 0 14px rgba(125,211,252,0.6))',
          }}
        />
      </div>

      {/* 6. 캐릭터 4인 실루엣 — 포탈에서 막 나온 일행 (이순신 크기로 통일, 어깨 동무) */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: '-12px', // 첫 캐릭터가 포탈 안쪽으로 살짝 묻혀서 "막 발 떼는 중" 결
          bottom: '0', // 도로 맨 아래(인도) 라인에 발 정렬 — 차선 영역과 분리
          height: 'clamp(85px, 12vw, 160px)',
          display: 'flex',
          alignItems: 'flex-end',
          gap: 0, // marginLeft 음수로 어깨 닿을락말락
          zIndex: 31, // 포탈(30) 위
        }}
      >
        {CHARACTER_IDS.map((id, i) => {
          // 4명 모두 이순신(general) 크기 70% 로 통일
          const isPortalEdge = i === 0; // 첫 사람만 포탈 빛에 더 묻힘 + 발 살짝 듦
          return (
            <img
              key={id}
              src={`/characters/${id}.png`}
              alt=""
              className="w-auto"
              style={{
                height: '80%', // 살짝 키움
                opacity: isPortalEdge ? 0.88 : 0.96,
                marginLeft: i > 0 ? '-40px' : 0, // 깊이 겹쳐서 일행 한 덩어리
                transform: `translateY(${isPortalEdge ? -3 : 0}px)`,
                filter:
                  `brightness(0) saturate(0)` +
                  ` drop-shadow(0 0 ${isPortalEdge ? 12 : 8}px rgba(125,211,252,${isPortalEdge ? 1 : 0.55}))` +
                  ` drop-shadow(0 0 ${isPortalEdge ? 24 : 16}px rgba(99,102,241,${isPortalEdge ? 0.7 : 0.4}))`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ===== 차 (CSS keyframe 무한 슬라이드, PNG 일러스트) =====
function Car({ img, bottom, direction, duration, delay, height }) {
  const animationName = direction === 1 ? 'car-slide-right' : 'car-slide-left';

  return (
    <div
      className="absolute"
      style={{
        bottom,
        left: 0,
        width: '100%',
        height: 0, // 자식이 absolute로 위로 솟음
        animation: `${animationName} ${duration}s linear infinite`,
        animationDelay: `${delay}s`,
      }}
    >
      <img
        src={img.src}
        alt=""
        style={{
          height: `${height}px`,
          width: 'auto',
          // 왼쪽으로 가는 차는 좌우 반전
          transform: direction === -1 ? 'scaleX(-1)' : undefined,
          transformOrigin: 'left center',
          imageRendering: 'pixelated', // 8비트 결 유지
          filter: 'drop-shadow(0 2px 0 rgba(0,0,0,0.5))',
          display: 'block',
        }}
      />
    </div>
  );
}
