// 이벤트 / 찬스 / 복지 카드 인게임 모달
// - 세로형 카드 비율 (3:5 결) + 상단 색띠 + 중앙 일러스트 + 하단 본문
// - 클릭 즉시 닫힘 (확인 버튼 / 배경 / X 버튼 모두)
// - 자동 닫힘 없음
// - Props 시그니처 유지: { open, onClose, eventId, description, affected }

import { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from '@/stores/gameStore.js';
import ModalBase from './ModalBase.jsx';
import { cn } from '@/lib/cn.js';

// ===== 카테고리별 색띠 팔레트 =====
const CATEGORY_STYLE = {
  event: {
    // 어두운 빨강/검정 톤
    bandBg: 'linear-gradient(160deg, #3D0A0A 0%, #1A0606 60%, #0D0303 100%)',
    bandAccent: '#5C0F0F',
    labelColor: '#C14040',
    glowColor: '#8B0000',
    chipBg: '#2A0505',
    chipBorder: '#5C0F0F',
    chipText: '#FF6B6B',
    illoBg: 'linear-gradient(180deg, #1A0606 0%, #0D0303 100%)',
    progressColor: '#C14040',
  },
  chance: {
    // 핫 핑크
    bandBg: 'linear-gradient(160deg, #8C0F46 0%, #B8195C 50%, #9C1550 100%)',
    bandAccent: '#D93A96',
    labelColor: '#F78AC0',
    glowColor: '#B8195C',
    chipBg: '#3D0620',
    chipBorder: '#8C0F46',
    chipText: '#F78AC0',
    illoBg: 'linear-gradient(180deg, #3D0620 0%, #1E0310 100%)',
    progressColor: '#D93A96',
  },
  welfare: {
    // 진한 그린
    bandBg: 'linear-gradient(160deg, #1A3D28 0%, #2D5F3F 50%, #1E4A30 100%)',
    bandAccent: '#4A8B5C',
    labelColor: '#7EC897',
    glowColor: '#2D5F3F',
    chipBg: '#0D2018',
    chipBorder: '#2D5F3F',
    chipText: '#7EC897',
    illoBg: 'linear-gradient(180deg, #1A3D28 0%, #0D2018 100%)',
    progressColor: '#4A8B5C',
  },
};

// ===== 이벤트 카드 메타데이터 =====
const EVENT_META = {
  // === EVENT (이벤트 카드 7장) ===
  war: {
    category: 'event',
    cardLabel: 'WAR',
    ko: '전쟁',
    icon: '💣',
    imageSrc: '/cards/event/war.png',
    headline: '랜덤 부동산 1개 국유화',
    subtext: '빌라/아파트가 있다면 1~2채 랜덤 파괴',
    chip: { icon: '⚠️', text: '전쟁이 발발했습니다' },
  },
  multi_property_regulation: {
    category: 'event',
    cardLabel: 'REGULATION',
    ko: '다주택자 규제',
    icon: '🏛',
    imageSrc: '/cards/event/regulation.png',
    headline: '5채 이상 보유자 강제 매각',
    subtext: '보유 부동산 중 1개를 시세 70%에 은행 반환',
    chip: { icon: '🔴', text: '다주택자 규제 발동' },
  },
  fire: {
    category: 'event',
    cardLabel: 'FIRE',
    ko: '화재',
    icon: '🔥',
    imageSrc: '/cards/event/fire.png',
    headline: '부동산 가치 -30%',
    subtext: '화재로 빌라 1채가 파괴되고 시세가 하락합니다',
    chip: { icon: '🔥', text: '화재 발생!' },
  },
  bubble_burst: {
    category: 'event',
    cardLabel: 'BUBBLE BURST',
    ko: '거품 붕괴',
    icon: '🏚',
    imageSrc: '/cards/event/bubble.png',
    headline: '고가 부동산 시세 -25%',
    subtext: '초록·남색 컬러 그룹 폭락 / 갈색·하늘색 +5% 반사',
    chip: { icon: '📉', text: '거품 붕괴 경보' },
  },
  redevelopment: {
    category: 'event',
    cardLabel: 'REDEVELOPMENT',
    ko: '재개발',
    icon: '🏗',
    imageSrc: '/cards/event/redevelopment.png',
    headline: '전체 부동산 시세 +10%',
    subtext: '대규모 재개발 발표 — 총 인플레 +14%',
    chip: { icon: '📈', text: '부동산 가치 폭등!' },
  },
  gtx: {
    category: 'event',
    cardLabel: 'GTX',
    ko: 'GTX 개통',
    icon: '🚄',
    imageSrc: '/cards/event/gtx.png',
    headline: '수도권 남색 부동산 +30%',
    subtext: 'GTX 노선 수도권 연결 — 인근 시세 급등',
    chip: { icon: '🚄', text: '교통 혁명 시작' },
  },
  subscription: {
    category: 'event',
    cardLabel: 'SUBSCRIPTION',
    ko: '부동산 청약',
    icon: '🎁',
    imageSrc: '/cards/event/subscription.png',
    headline: '랜덤 미보유 부동산 1개 무상 증정',
    subtext: '행운의 청약 당첨자에게 부동산이 주어집니다',
    chip: { icon: '🎊', text: '청약 당첨!' },
  },

  // === CHANCE (찬스 카드) ===
  chance_marriage: {
    category: 'chance',
    cardLabel: 'WEDDING',
    ko: '결혼',
    icon: '💍',
    imageSrc: '/cards/chance/marriage.png',
    headline: '결혼식 비용 지불',
    subtext: '월급 영구 +50만 / 결혼식 비용 -150만 선지급',
    chip: { icon: '💍', text: '-150만원 / 월급 +50만' },
  },
  chance_promotion: {
    category: 'chance',
    cardLabel: 'PROMOTION',
    ko: '승진',
    icon: '📈',
    imageSrc: '/cards/chance/promotion.png',
    headline: '직장 내 승진',
    subtext: '월급 영구 +30만 (비용 없음)',
    chip: { icon: '📈', text: '월급 +30만 (영구)' },
  },
  chance_startup: {
    category: 'chance',
    cardLabel: 'STARTUP',
    ko: '창업',
    icon: '🚀',
    imageSrc: '/cards/chance/startup.png',
    headline: '사업 창업 투자',
    subtext: '초기 비용 -300만 / 월급 영구 +70만',
    chip: { icon: '🚀', text: '-300만 / 월급 +70만' },
  },
  chance_military: {
    category: 'chance',
    cardLabel: 'MILITARY',
    ko: '군복무',
    icon: '🪖',
    imageSrc: '/cards/chance/military.png',
    headline: '군 복무 소집',
    subtext: '2턴 동안 이동 불가 (대기)',
    chip: { icon: '🪖', text: '2턴 대기' },
  },
  chance_holiday_bonus: {
    category: 'chance',
    cardLabel: 'BONUS',
    ko: '명절보너스',
    icon: '🎁',
    imageSrc: '/cards/chance/holiday_bonus.png',
    headline: '명절 상여금 수령',
    subtext: '+200만원 즉시 지급',
    chip: { icon: '💚', text: '+200만원 수령' },
  },
  chance_lotto: {
    category: 'chance',
    cardLabel: 'LOTTO',
    ko: '로또도박',
    icon: '🍀',
    imageSrc: '/cards/chance/lotto.png',
    headline: '로또 참가',
    subtext: '-100만 참가비 / 당첨 시 +500만',
    chip: { icon: '🍀', text: '-100만 / 당첨 +500만' },
  },
  chance_life_change: {
    category: 'chance',
    cardLabel: 'LIFE CHANGE',
    ko: '인생체인지',
    icon: '🔄',
    imageSrc: '/cards/chance/life_change.png',
    headline: '다른 사람과 인생을 바꿀 기회',
    subtext: '체인지/스킵 선택 후 상대 스테이터스에서 체인지합니다',
    chip: { icon: '🔄', text: '10% 레어' },
  },
  chance_defense_card: {
    category: 'chance',
    cardLabel: 'DEFENSE',
    ko: '방어카드',
    icon: '🛡️',
    imageSrc: '/cards/chance/defense_card.png',
    headline: '인생체인지 방어권 획득',
    subtext: '누군가 인생체인지를 걸면 1회 막을 수 있습니다',
    chip: { icon: '🛡️', text: '15% 획득' },
  },

  // === WELFARE (복지 카드) ===
  welfare_covid: {
    category: 'welfare',
    cardLabel: 'COVID',
    ko: '재난지원금',
    icon: '💊',
    imageSrc: '/cards/welfare/covid.png',
    headline: '정부 재난지원금 수령',
    subtext: '코로나19 특별 재난 지원금 +200만',
    chip: { icon: '💚', text: '+200만원 수령' },
  },
  welfare_work: {
    category: 'welfare',
    cardLabel: 'WORK INCENTIVE',
    ko: '근로장려금',
    icon: '₩',
    imageSrc: '/cards/welfare/work_incentive.png',
    headline: '근로장려금 지급',
    subtext: '저소득 근로자 정부 지원 +100만',
    chip: { icon: '₩', text: '+100만원 수령' },
  },
  welfare_pension: {
    category: 'welfare',
    cardLabel: 'PENSION',
    ko: '기초연금',
    icon: '👴',
    imageSrc: '/cards/welfare/basic_pension.png',
    headline: '기초연금 수령',
    subtext: '매달 기초연금 +50만 지급',
    chip: { icon: '💚', text: '+50만원 수령' },
  },
  welfare_wedding: {
    category: 'welfare',
    cardLabel: 'WEDDING GIFT',
    ko: '친척결혼식',
    icon: '💐',
    imageSrc: '/cards/welfare/relative_wedding.png',
    headline: '친척 결혼식 축의금 수령',
    subtext: '모든 플레이어가 나에게 +50만 지급',
    chip: { icon: '💐', text: '모두에게 +50만 수령' },
  },
  welfare_childbirth: {
    category: 'welfare',
    cardLabel: 'CHILDBIRTH',
    ko: '출산장려금',
    icon: '👶',
    imageSrc: '/cards/welfare/childbirth_grant.png',
    headline: '출산장려금 수령',
    subtext: '정부 출산 장려금 +200만',
    chip: { icon: '💚', text: '+200만원 수령' },
  },
};

// 이벤트 카드는 유저가 클릭해야 닫힌다.

// ===== 카테고리 라벨 =====
const CATEGORY_LABEL = {
  event: '— EVENT —',
  chance: '— CHANCE —',
  welfare: '— WELFARE —',
};

// ===== fallback — eventId 를 메타 키로 맵핑 =====
function resolveEventId(eventId) {
  // 직접 매핑이 있으면 우선
  if (EVENT_META[eventId]) return eventId;

  // cards.js EVENT_CARDS kind 값 → 메타 키 매핑
  const kindMap = {
    war: 'war',
    multihouse: 'multi_property_regulation',
    fire: 'fire',
    bubble: 'bubble_burst',
    redev: 'redevelopment',
    gtx: 'gtx',
    lottery_estate: 'subscription',
  };
  if (kindMap[eventId]) return kindMap[eventId];

  // 접두 매핑 (chance_, welfare_)
  if (eventId?.startsWith('chance_') || eventId?.startsWith('welfare_')) return eventId;

  return null;
}

// ===== 카드 일러스트 영역 =====
function CardIllustration({ imageSrc, icon, illoBg, category }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className="relative flex items-center justify-center overflow-hidden"
      style={{
        background: illoBg,
        aspectRatio: '3 / 2',
      }}
    >
      {/* 배경 패턴 오버레이 */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.12 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
        aria-hidden="true"
      />

      {/* 실제 이미지 또는 이모지 fallback */}
      {!imgError && imageSrc ? (
        <img
          src={imageSrc}
          alt=""
          onError={() => setImgError(true)}
          className="relative z-10 h-full w-full object-cover"
          style={{ padding: 0 }}
          draggable={false}
        />
      ) : (
        <span
          className="relative z-10 select-none"
          style={{ fontSize: '64px', lineHeight: 1, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}
        >
          {icon}
        </span>
      )}

      {/* 하단 페이드 — 본문 영역으로 자연스럽게 연결 */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.5) 100%)',
        }}
        aria-hidden="true"
      />
    </div>
  );
}

// ===== 효과 칩 =====
function EffectChip({ icon, text, chipBg, chipBorder, chipText }) {
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold"
      style={{
        backgroundColor: chipBg,
        border: `1.5px solid ${chipBorder}`,
        color: chipText,
        boxShadow: `0 0 8px ${chipBorder}55`,
      }}
    >
      <span className="text-base leading-none">{icon}</span>
      <span className="font-display text-[11px] uppercase tracking-wide leading-none">{text}</span>
    </div>
  );
}

// ===== 카운트다운 Progress Bar =====
function CountdownBar({ secondsLeft, total = AUTO_DISMISS_SECONDS, progressColor }) {
  const pct = (secondsLeft / total) * 100;
  return (
    <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-none"
        style={{
          width: `${pct}%`,
          backgroundColor: progressColor,
          boxShadow: `0 0 6px ${progressColor}88`,
          transition: 'width 0.95s linear',
        }}
      />
    </div>
  );
}

// ===== 메인 이벤트 카드 모달 =====
export default function EventModal({ open, onClose, eventId, description, affected }) {
  const handleConfirm = useGameStore((s) => s.confirmEvent);

  // 닫힘 핸들러 — confirmEvent + onClose 순서 보존
  const handleClose = useCallback(() => {
    handleConfirm?.();
    onClose?.();
  }, [handleConfirm, onClose]);

  // 자동 닫힘 없음: 유저가 클릭해야 닫힌다.

  // 메타 해석
  const resolvedId = resolveEventId(eventId);
  const meta = resolvedId ? EVENT_META[resolvedId] : null;

  // meta 없으면 fallback
  const category = meta?.category ?? 'event';
  const style = CATEGORY_STYLE[category];
  const cardLabel = meta?.cardLabel ?? (eventId?.toUpperCase() ?? 'CARD');
  const ko = meta?.ko ?? eventId ?? '이벤트';
  const icon = meta?.icon ?? '🎴';
  const imageSrc = meta?.imageSrc ?? null;
  const headline = meta?.headline ?? description ?? '이벤트 발동';
  const subtext = meta?.subtext ?? '';
  const chip = meta?.chip ?? null;

  // 글로우 박스 섀도 (카테고리별)
  const glowShadow = `0 4px 0 0 #0F0C0A, 0 0 0 4px ${style.glowColor}cc, 0 0 0 9px ${style.glowColor}55, 0 0 28px 6px ${style.glowColor}99, 0 0 60px 14px ${style.glowColor}44, 0 14px 32px -4px rgba(0,0,0,0.6)`;

  return (
    <ModalBase
      open={open}
      onClose={handleClose}
      size="md"
      style={{ boxShadow: glowShadow }}
    >
      {/* ══ 상단 색띠 — 카테고리 라벨 + 카드 영문명 + 한글명 ══ */}
      <div
        className="relative overflow-hidden px-5 py-4 text-center border-b-2 border-ink-line"
        style={{ background: style.bandBg }}
      >
        {/* 미세 노이즈 오버레이 */}
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.25 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
          }}
          aria-hidden="true"
        />

        {/* 카테고리 라벨 — "— EVENT —" */}
        <div
          className="font-display text-[10px] font-bold uppercase tracking-[0.35em] leading-none opacity-80"
          style={{ color: style.labelColor }}
        >
          {CATEGORY_LABEL[category]}
        </div>

        {/* 카드 영문명 — WAR / WEDDING / COVID */}
        <div
          className="mt-1.5 font-display text-[28px] font-bold leading-none uppercase tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]"
          style={{ textShadow: `0 0 20px ${style.bandAccent}88` }}
        >
          {cardLabel}
        </div>

        {/* 카드 한글명 */}
        <div
          className="mt-0.5 font-sans text-[13px] font-semibold leading-none"
          style={{ color: style.labelColor }}
        >
          {ko}
        </div>
      </div>

      {/* ══ 중앙 일러스트 영역 ══ */}
      <CardIllustration
        imageSrc={imageSrc}
        icon={icon}
        illoBg={style.illoBg}
        category={category}
      />

      {/* ══ 하단 본문 ══ */}
      <div className="bg-parchment-50 px-5 py-4 space-y-3">
        {/* 헤드라인 */}
        <div className="text-center">
          <h2 className="font-board text-[20px] leading-snug text-ink">
            {headline}
          </h2>
          {subtext && (
            <p className="mt-1 font-sans text-[11px] text-ink/55 leading-relaxed">
              {subtext}
            </p>
          )}
        </div>

        {/* 동적 description (gameStore 에서 넘어온 값 우선) */}
        {description && description !== headline && (
          <p className="text-center font-sans text-[11px] text-ink/65 leading-relaxed border-t border-ink/10 pt-2">
            {description}
          </p>
        )}

        {/* 영향 받는 대상 (affected) */}
        {affected && affected.length > 0 && (
          <div
            className="rounded-lg border px-3 py-2 space-y-1"
            style={{
              backgroundColor: style.chipBg,
              borderColor: style.chipBorder,
            }}
          >
            <div
              className="font-display text-[9px] font-bold uppercase tracking-widest"
              style={{ color: style.labelColor }}
            >
              영향 받는 대상
            </div>
            {affected.map((a, i) => (
              <div
                key={i}
                className="font-sans text-[11px] leading-snug"
                style={{ color: style.chipText }}
              >
                • {a}
              </div>
            ))}
          </div>
        )}

        {/* 효과 칩 */}
        {chip && (
          <div className="flex justify-center">
            <EffectChip
              icon={chip.icon}
              text={chip.text}
              chipBg={style.chipBg}
              chipBorder={style.chipBorder}
              chipText={style.chipText}
            />
          </div>
        )}

        {/* 카운트다운 영역 */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            {/* 확인 버튼 */}
            <button
              type="button"
              onClick={handleClose}
              className={cn(
                'flex-1 rounded-lg border-2 border-ink-line py-2.5 font-display text-[13px] font-bold uppercase tracking-wider text-white',
                'transition-transform duration-100 ease-out',
                'hover:-translate-y-0.5 active:translate-y-0.5',
                'shadow-[0_3px_0_0_#0F0C0A] active:shadow-none',
              )}
              style={{
                background: style.bandBg,
              }}
            >
              확인
            </button>
            {/* 카운트다운 숫자 */}

          </div>
        </div>
      </div>
    </ModalBase>
  );
}
