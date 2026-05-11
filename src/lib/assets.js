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
  leeJaeMyung: '/characters/lee-jae-myung.png',
  wakizakaYasuharu: '/characters/wakizaka-yasuharu.png',
  toyotomiHideyoshi: '/characters/toyotomi-hideyoshi.png',
  elonMusk: '/characters/elon-musk.png',
  takedaShingen: '/characters/takeda-shingen.png',
  liuBei: '/characters/liu-bei.png',
  guanYu: '/characters/guan-yu.png',
  zhangFei: '/characters/zhang-fei.png',
  caoCao: '/characters/cao-cao.png',
  luBu: '/characters/lu-bu.png',
  luffy: '/characters/luffy.png',
  zoro: '/characters/zoro.png',
  shanks: '/characters/shanks.png',
  sanji: '/characters/sanji.png',
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
  leeJaeMyung: { name: '이재명', emoji: '🗳️', desc: '정치인' },
  wakizakaYasuharu: { name: '와키자카', emoji: '🗡️', desc: '일본 장수' },
  toyotomiHideyoshi: { name: '도요토미', emoji: '🏯', desc: '일본 장수' },
  elonMusk: { name: '일론 머스크', emoji: '🚀', desc: '기술 사업가' },
  takedaShingen: { name: '다케다 신겐', emoji: '🪭', desc: '전국시대 군략가' },
  liuBei: { name: '유비', emoji: '👑', desc: '삼국지 군주' },
  guanYu: { name: '관우', emoji: '🐉', desc: '삼국지 장수' },
  zhangFei: { name: '장비', emoji: '🛡️', desc: '삼국지 맹장' },
  caoCao: { name: '조조', emoji: '♟️', desc: '삼국지 책략가' },
  luBu: { name: '여포', emoji: '⚔️', desc: '삼국지 맹장' },
  luffy: { name: '루피', emoji: '🏴‍☠️', desc: '해적 선장' },
  zoro: { name: '조로', emoji: '🗡️', desc: '검사' },
  shanks: { name: '샹크스', emoji: '🍷', desc: '해적 선장' },
  sanji: { name: '상디', emoji: '🍳', desc: '요리사' },
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
  move_forward_3: '/cards/chance/teleport.png',
  move_forward_2: '/cards/chance/teleport.png',
  move_back_3: '/cards/chance/teleport.png',
  move_back_2: '/cards/chance/teleport.png',
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

const unique = (items) => [...new Set(items.filter(Boolean))];

export const ESSENTIAL_GAME_ASSETS = unique([
  ...Object.values(CHARACTER_IMG),
  NPC_IMG.realtor,
  ICON_IMG.villa,
  ICON_IMG.apartment,
]);

export const BACKGROUND_GAME_ASSETS = unique([
  ...Object.values(EVENT_CARD_IMG),
  ...Object.values(CHANCE_CARD_IMG),
  ...Object.values(WELFARE_CARD_IMG),
  ...Object.values(NPC_IMG),
  ...Object.values(ICON_IMG),
]);

export const preloadImages = (urls = [], { timeoutMs = 3500 } = {}) => {
  if (typeof Image === 'undefined') return Promise.resolve();
  const loadOne = (url) => new Promise((resolve) => {
    const img = new Image();
    const done = () => resolve(url);
    const timer = window.setTimeout(done, timeoutMs);
    img.onload = () => { window.clearTimeout(timer); done(); };
    img.onerror = () => { window.clearTimeout(timer); done(); };
    img.decoding = 'async';
    img.src = url;
  });
  return Promise.all(urls.map(loadOne));
};

export const preloadGameAssets = async () => {
  await preloadImages(ESSENTIAL_GAME_ASSETS, { timeoutMs: 2600 });
  window.setTimeout(() => {
    preloadImages(BACKGROUND_GAME_ASSETS, { timeoutMs: 5000 });
  }, 80);
};
