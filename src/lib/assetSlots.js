// 자산 슬롯 정의 — "액자" 시스템의 마스터 레지스트리
// 모든 일러스트는 이 슬롯 기준으로 표시되고, 관리자 페이지에서 갈아끼움.
// id 컨벤션: {category}.{key}

export const ASSET_SLOTS = [
  // ===== 캐릭터 4종 (조선시대) =====
  { id: 'character.yangban', label: '양반', category: 'character', defaultPath: '/characters/yangban.png', ratio: 'aspect-square', fallback: '🎓' },
  { id: 'character.farmer', label: '농부', category: 'character', defaultPath: '/characters/farmer.png', ratio: 'aspect-square', fallback: '🌾' },
  { id: 'character.magistrate', label: '임금', category: 'character', defaultPath: '/characters/magistrate.png', ratio: 'aspect-square', fallback: '👑' },
  { id: 'character.general', label: '장군', category: 'character', defaultPath: '/characters/general.png', ratio: 'aspect-square', fallback: '⚔️' },

  // ===== NPC 2종 =====
  { id: 'npc.realtor', label: '중계인 (객주)', category: 'npc', defaultPath: '/npc/realtor.png', ratio: 'aspect-square', fallback: '👨‍💼' },
  { id: 'npc.loanShark', label: '사채업자', category: 'npc', defaultPath: '/npc/loan_shark.png', ratio: 'aspect-square', fallback: '🕴️' },

  // ===== 컬러셋 스카이라인 8종 =====
  { id: 'skyline.brown', label: '갈색 (저가)', category: 'skyline', defaultPath: '/skyline/brown.png', ratio: 'aspect-[4/3]', fallback: '🏘' },
  { id: 'skyline.lightblue', label: '하늘색', category: 'skyline', defaultPath: '/skyline/lightblue.png', ratio: 'aspect-[4/3]', fallback: '🏘' },
  { id: 'skyline.pink', label: '분홍', category: 'skyline', defaultPath: '/skyline/pink.png', ratio: 'aspect-[4/3]', fallback: '🏘' },
  { id: 'skyline.orange', label: '주황', category: 'skyline', defaultPath: '/skyline/orange.png', ratio: 'aspect-[4/3]', fallback: '🏘' },
  { id: 'skyline.red', label: '빨강', category: 'skyline', defaultPath: '/skyline/red.png', ratio: 'aspect-[4/3]', fallback: '🏘' },
  { id: 'skyline.yellow', label: '노랑', category: 'skyline', defaultPath: '/skyline/yellow.png', ratio: 'aspect-[4/3]', fallback: '🏘' },
  { id: 'skyline.green', label: '초록', category: 'skyline', defaultPath: '/skyline/green.png', ratio: 'aspect-[4/3]', fallback: '🏙' },
  { id: 'skyline.darkblue', label: '남색 (고가)', category: 'skyline', defaultPath: '/skyline/darkblue.png', ratio: 'aspect-[4/3]', fallback: '🏙' },

  // ===== 이벤트 카드 7장 =====
  { id: 'card.event.war', label: '전쟁', category: 'card.event', defaultPath: '/cards/event/war.png', ratio: 'aspect-[3/4]', fallback: '⚔️' },
  { id: 'card.event.regulation', label: '다주택 규제', category: 'card.event', defaultPath: '/cards/event/regulation.png', ratio: 'aspect-[3/4]', fallback: '📜' },
  { id: 'card.event.fire', label: '화재', category: 'card.event', defaultPath: '/cards/event/fire.png', ratio: 'aspect-[3/4]', fallback: '🔥' },
  { id: 'card.event.bubble', label: '거품 붕괴', category: 'card.event', defaultPath: '/cards/event/bubble.png', ratio: 'aspect-[3/4]', fallback: '💥' },
  { id: 'card.event.redevelopment', label: '재개발', category: 'card.event', defaultPath: '/cards/event/redevelopment.png', ratio: 'aspect-[3/4]', fallback: '🏗' },
  { id: 'card.event.gtx', label: 'GTX', category: 'card.event', defaultPath: '/cards/event/gtx.png', ratio: 'aspect-[3/4]', fallback: '🚄' },
  { id: 'card.event.subscription', label: '청약 광풍', category: 'card.event', defaultPath: '/cards/event/subscription.png', ratio: 'aspect-[3/4]', fallback: '🎟' },

  // ===== 찬스 카드 12장 =====
  { id: 'card.chance.marriage', label: '결혼', category: 'card.chance', defaultPath: '/cards/chance/marriage.png', ratio: 'aspect-[3/4]', fallback: '💍' },
  { id: 'card.chance.job_change', label: '이직', category: 'card.chance', defaultPath: '/cards/chance/job_change.png', ratio: 'aspect-[3/4]', fallback: '💼' },
  { id: 'card.chance.promotion', label: '승진', category: 'card.chance', defaultPath: '/cards/chance/promotion.png', ratio: 'aspect-[3/4]', fallback: '📈' },
  { id: 'card.chance.startup', label: '창업', category: 'card.chance', defaultPath: '/cards/chance/startup.png', ratio: 'aspect-[3/4]', fallback: '🚀' },
  { id: 'card.chance.childbirth', label: '출산', category: 'card.chance', defaultPath: '/cards/chance/childbirth.png', ratio: 'aspect-[3/4]', fallback: '👶' },
  { id: 'card.chance.honor_retire', label: '명예퇴직', category: 'card.chance', defaultPath: '/cards/chance/honor_retire.png', ratio: 'aspect-[3/4]', fallback: '🎖' },
  { id: 'card.chance.military', label: '군 입대', category: 'card.chance', defaultPath: '/cards/chance/military.png', ratio: 'aspect-[3/4]', fallback: '🪖' },
  { id: 'card.chance.holiday_bonus', label: '명절 보너스', category: 'card.chance', defaultPath: '/cards/chance/holiday_bonus.png', ratio: 'aspect-[3/4]', fallback: '🎁' },
  { id: 'card.chance.accident', label: '사고', category: 'card.chance', defaultPath: '/cards/chance/accident.png', ratio: 'aspect-[3/4]', fallback: '🚑' },
  { id: 'card.chance.lotto', label: '로또', category: 'card.chance', defaultPath: '/cards/chance/lotto.png', ratio: 'aspect-[3/4]', fallback: '🍀' },
  { id: 'card.chance.subscription_win', label: '청약 당첨', category: 'card.chance', defaultPath: '/cards/chance/subscription_win.png', ratio: 'aspect-[3/4]', fallback: '🏆' },
  { id: 'card.chance.teleport', label: '순간이동', category: 'card.chance', defaultPath: '/cards/chance/teleport.png', ratio: 'aspect-[3/4]', fallback: '✨' },

  // ===== 복지 카드 10장 =====
  { id: 'card.welfare.covid', label: '코로나 지원금', category: 'card.welfare', defaultPath: '/cards/welfare/covid.png', ratio: 'aspect-[3/4]', fallback: '😷' },
  { id: 'card.welfare.work_incentive', label: '근로장려금', category: 'card.welfare', defaultPath: '/cards/welfare/work_incentive.png', ratio: 'aspect-[3/4]', fallback: '💪' },
  { id: 'card.welfare.basic_pension', label: '기초연금', category: 'card.welfare', defaultPath: '/cards/welfare/basic_pension.png', ratio: 'aspect-[3/4]', fallback: '👴' },
  { id: 'card.welfare.health_check', label: '건강검진', category: 'card.welfare', defaultPath: '/cards/welfare/health_check.png', ratio: 'aspect-[3/4]', fallback: '🩺' },
  { id: 'card.welfare.national_pension', label: '국민연금', category: 'card.welfare', defaultPath: '/cards/welfare/national_pension.png', ratio: 'aspect-[3/4]', fallback: '🏦' },
  { id: 'card.welfare.community_fee', label: '관리비', category: 'card.welfare', defaultPath: '/cards/welfare/community_fee.png', ratio: 'aspect-[3/4]', fallback: '🏢' },
  { id: 'card.welfare.relative_wedding', label: '친척 결혼', category: 'card.welfare', defaultPath: '/cards/welfare/relative_wedding.png', ratio: 'aspect-[3/4]', fallback: '💌' },
  { id: 'card.welfare.housing_subscription', label: '주택청약', category: 'card.welfare', defaultPath: '/cards/welfare/housing_subscription.png', ratio: 'aspect-[3/4]', fallback: '🏠' },
  { id: 'card.welfare.childbirth_grant', label: '출산장려금', category: 'card.welfare', defaultPath: '/cards/welfare/childbirth_grant.png', ratio: 'aspect-[3/4]', fallback: '🍼' },
  { id: 'card.welfare.fraud_caught', label: '사기 적발', category: 'card.welfare', defaultPath: '/cards/welfare/fraud_caught.png', ratio: 'aspect-[3/4]', fallback: '🚨' },

  // ===== UI 아이콘 =====
  { id: 'icon.premium_star', label: 'PREMIUM 별', category: 'icon', defaultPath: '/icons/premium_star.png', ratio: 'aspect-square', fallback: '⭐' },
  { id: 'icon.empty_land', label: '빈 땅 (판매중)', category: 'icon', defaultPath: '/icons/empty_land.png', ratio: 'aspect-square', fallback: '🪧' },
  { id: 'icon.parking_jackpot', label: '휴게소 잭팟', category: 'icon', defaultPath: '/icons/parking_jackpot.png', ratio: 'aspect-square', fallback: '🎰' },
  { id: 'icon.monopoly_lock', label: '독점 마크', category: 'icon', defaultPath: '/icons/monopoly_lock.png', ratio: 'aspect-square', fallback: '🔒' },

  // ===== 브랜딩 =====
  { id: 'brand.logo', label: '로고 (가로형)', category: 'brand', defaultPath: '/logo.png', ratio: 'aspect-[2/1]', fallback: '🏠 THE REALLIFE' },
  { id: 'brand.app_icon', label: '앱 아이콘', category: 'brand', defaultPath: '/app-icon.png', ratio: 'aspect-square', fallback: '📱' },
];

// 빠른 lookup
export const SLOT_MAP = Object.fromEntries(ASSET_SLOTS.map((s) => [s.id, s]));

// 카테고리 라벨 (관리자 페이지 탭용)
export const CATEGORY_LABEL = {
  character: '캐릭터',
  npc: 'NPC',
  skyline: '컬러셋 스카이라인',
  'card.event': '이벤트 카드',
  'card.chance': '찬스 카드',
  'card.welfare': '복지 카드',
  icon: 'UI 아이콘',
  brand: '브랜딩',
};

export const CATEGORY_ORDER = [
  'character',
  'npc',
  'skyline',
  'card.event',
  'card.chance',
  'card.welfare',
  'icon',
  'brand',
];

// 카테고리별 슬롯 그룹
export const slotsByCategory = (category) => ASSET_SLOTS.filter((s) => s.category === category);
