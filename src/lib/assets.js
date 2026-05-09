// 일러스트 자산 통합 import — public/ 폴더 기반
// 사용자가 일러스트 받으면 한 곳에서 갈아끼우기

// 캐릭터 4종 (조선시대)
// public/characters/{id}.png 에 저장하면 자동 적용
export const CHARACTER_IMG = {
  yangban: '/characters/yangban.png',
  farmer: '/characters/farmer.png',
  magistrate: '/characters/magistrate.png',
  general: '/characters/general.png',
  chunDooHwan: '/characters/chun-doo-hwan.png',
  genghisKhan: '/characters/genghis-khan.png',
  steveJobs: '/characters/steve-jobs.png',
  billGates: '/characters/bill-gates.png',
  donaldTrump: '/characters/donald-trump.png',
};

// NPC 2종
// public/npc/{id}.png
export const NPC_IMG = {
  realtor: '/npc/realtor.png', // 사회자 (메인 진행자)
  loanShark: '/npc/loan_shark.png', // 조선 사채업자
};

const CUSTOM_CHARACTER_STORAGE_KEY = 'reallife.custom-characters.v1';

const getCustomCharacterImg = (id) => {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CUSTOM_CHARACTER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const list = parsed?.state?.characters;
    if (!Array.isArray(list)) return null;
    return list.find((c) => c.id === id && c.active !== false)?.imageDataUrl ?? null;
  } catch {
    return null;
  }
};

// 캐릭터 ID로 일러스트 경로 가져오기 (없으면 null → 이모지 fallback)
export const getCharacterImg = (id) => CHARACTER_IMG[id] ?? getCustomCharacterImg(id);
export const getNPCImg = (id) => NPC_IMG[id] ?? null;

// 캐릭터 메타 (이모지 fallback용)
export const CHARACTER_META = {
  general: { name: '이순신', emoji: '⚔️', desc: '장군·무관' },
  magistrate: { name: '세종대왕', emoji: '👑', desc: '임금·통치' },
  yangban: { name: '정약용', emoji: '🎓', desc: '양반·학자' },
  farmer: { name: '녹두장군', emoji: '🌾', desc: '농부·서민' },
  chunDooHwan: { name: '전두환', emoji: '🪖', desc: '군복·현대사' },
  genghisKhan: { name: '징기스칸', emoji: '🐎', desc: '초원·정복자' },
  steveJobs: { name: '스티브 잡스', emoji: '📱', desc: '혁신가·기술' },
  billGates: { name: '빌 게이츠', emoji: '💻', desc: '소프트웨어·사업가' },
  donaldTrump: { name: '트럼프', emoji: '🏢', desc: '사업가·정치인' },
};

// ===== 이벤트 카드 7장 =====
// public/cards/event/{id}.png
export const EVENT_CARD_IMG = {
  war: '/cards/event/war.png',
  multi_property_regulation: '/cards/event/regulation.png',
  fire: '/cards/event/fire.png',
  bubble_burst: '/cards/event/bubble.png',
  redevelopment: '/cards/event/redevelopment.png',
  gtx: '/cards/event/gtx.png',
  subscription: '/cards/event/subscription.png',
};

// ===== 찬스 카드 12장 (인생 이벤트) =====
// public/cards/chance/{id}.png
export const CHANCE_CARD_IMG = {
  marriage: '/cards/chance/marriage.png',
  job_change: '/cards/chance/job_change.png',
  promotion: '/cards/chance/promotion.png',
  startup: '/cards/chance/startup.png',
  childbirth: '/cards/chance/childbirth.png',
  honor_retire: '/cards/chance/honor_retire.png',
  military: '/cards/chance/military.png',
  holiday_bonus: '/cards/chance/holiday_bonus.png',
  accident: '/cards/chance/accident.png',
  lotto: '/cards/chance/lotto.png',
  subscription_win: '/cards/chance/subscription_win.png',
  teleport: '/cards/chance/teleport.png',
};

// ===== 복지 카드 10장 (한국 복지 정책) =====
// public/cards/welfare/{id}.png
export const WELFARE_CARD_IMG = {
  covid: '/cards/welfare/covid.png',
  work_incentive: '/cards/welfare/work_incentive.png',
  basic_pension: '/cards/welfare/basic_pension.png',
  health_check: '/cards/welfare/health_check.png',
  national_pension: '/cards/welfare/national_pension.png',
  community_fee: '/cards/welfare/community_fee.png',
  relative_wedding: '/cards/welfare/relative_wedding.png',
  housing_subscription: '/cards/welfare/housing_subscription.png',
  childbirth_grant: '/cards/welfare/childbirth_grant.png',
  fraud_caught: '/cards/welfare/fraud_caught.png',
};

// ===== UI 아이콘 (빌라/아파트/깃발 등) =====
export const ICON_IMG = {
  villa: '/icons/villa.png',
  apartment: '/icons/apartment.png',
  move_one: '/icons/move_one.png',
};

export const getEventCardImg = (id) => EVENT_CARD_IMG[id] ?? null;
export const getChanceCardImg = (id) => CHANCE_CARD_IMG[id] ?? null;
export const getWelfareCardImg = (id) => WELFARE_CARD_IMG[id] ?? null;
export const getIconImg = (id) => ICON_IMG[id] ?? null;
