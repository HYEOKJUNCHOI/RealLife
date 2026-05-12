// 게임 전역 상수 — BRAINSTORM_LOG.md 기준
// 모든 금액은 "만원" 단위. 즉 800 = 800만원.

export const STARTING_CASH = 2500; // 디폴트 시작자금 (2,500만)
export const PRICE_SCALE = 2; // 부동산 매입가 ×2
export const HOUSE_COST_SCALE = 1; // 빌라/아파트 건설비 원가 적용

// 통행료 = 시세 × 비율 (표준 모노폴리 rent 표 폐기)
// 빈 / 빌라1 / 빌라2 / 빌라3 / 빌라4 / 아파트
// 빌라 월세 체감: 2 / 4 / 6 / 8 / 10 비율
export const RENT_RATIO = [0.2, 0.2, 0.4, 0.6, 0.8, 1.0];

// 컬러셋 독점 보너스
export const COLOR_MONOPOLY_BONUS = 0.2; // 시세 +20%

// 인플레이션
export const INFLATION_PER_YEAR = 0.04; // 4% 복리

// 부동산 대출
export const LTV_RATIO = 0.7; // 시세 ×70%
export const LOAN_RATES = [0.01, 0.02, 0.03, 0.04]; // 1~4% 균등 추첨
export const MORTGAGE_INTEREST_BY_COLOR = {
  brown: 5,
  lightblue: 7,
  pink: 10,
  orange: 12,
  red: 14,
  yellow: 16,
  green: 18,
  darkblue: 20,
}; // 룰북: 색깔 그룹별 매턴 고정 이자

// 신용대출
export const CREDIT_LIMIT = 1000; // 1,000만
export const CREDIT_INTEREST_PER_TURN = 10; // 자기 턴마다 10만
export const CREDIT_ELIGIBILITY_CASH = 300; // 잔액 ≤ 300만
export const CREDIT_MISS_LIMIT = 3; // 3회 미납 OK
export const CREDIT_AUTO_REPAY = 300; // 잔액 1,000만 도달 시 자동 300만 상환

// 고리대금
export const LOANSHARK_LIMIT = 2000;
export const LOANSHARK_INTEREST_PER_TURN = 30;
export const LOANSHARK_PREPAY_FEE = 0.1; // 중도상환 수수료 10%

// 감옥
export const JAIL_TURNS = 2;
export const JAIL_BAIL = 200;

// GO
export const GO_SALARY = 200; // 월급 (통과)
export const GO_BONUS = 200; // 성과급 (정확 도착 시 추가)

// 환승 허브 (서울역·부산역)
export const HUB_PRICE = 400; // 입찰 정가 (200 × 2)
export const HUB_TELEPORT_FEE = 50; // 50만 텔레포트
export const HUB_TWO_TELEPORT_FEE = 150; // 2개 모음 시 텔레포트 옵션
export const HUB_OWNER_REPAIR = 50; // 본인 소유 홀수 주사위 수리비

// 역장 자리 (춘천·광주)
export const STATION_RATE_BY_YEAR = [10, 20, 30]; // 1년차/2년차/3년차+
export const STATION_CAP = 1000; // 적립금 캡 1,000만

// 한전·수자원
export const UTILITY_RATE_BY_YEAR = [10, 15, 20]; // 부임 1/2/3년차+
export const UTILITY_DOUBLE_BONUS = 2; // 2개 모음 ×2

// 생활비 (자산 누진)
export const LIVING_COST_TIERS = [
  { threshold: 2000, cost: 10 },
  { threshold: 5000, cost: 20 },
  { threshold: Infinity, cost: 30 },
];

// 종부세 (1년 결산, 누진)
export const PROPERTY_TAX_TIERS = [
  { threshold: 2000, rate: 0.01 },
  { threshold: 5000, rate: 0.02 },
  { threshold: Infinity, rate: 0.03 },
];

// 사치세 (랜덤 6단계)
export const LUXURY_TAX_AMOUNTS = [50, 100, 150, 200, 250, 300];

// 소득세
export const INCOME_TAX_RATE = 0.1;

// 매각/회생
export const NPC_SELL_RATIO = 0.5; // 시세 50%
export const HOUSE_SELL_RATIO = 0.5; // 건설가 50%
export const AUCTION_PRICE_RATIO = 1.2; // 파산 경매 시세 ×120%

// 아파트 매 자기 턴 인컴 = 각 아파트의 houseCost × 비율 (비용 비례)
// 평균 houseCost ~62 만 × 0.5 = ~31 만 (싸면 적게, 비싸면 많이)
// 빌라값 ×5 (= 아파트 풀 빌드 비용) 회수 기간: 1/0.5 ÷ 단계 = 약 10턴
export const APARTMENT_INCOME_RATIO = 0.5;

// 빌라/아파트 한정
export const HOUSE_LIMIT = 32;
export const APT_LIMIT = 12;

// 데스매치
export const DEATHMATCH_TRIGGER_MIN = 30; // 30분 경과
export const GAME_DURATION_MIN = 60; // 60분 종료

// 이벤트 카드 발동 주기 (연 단위)
// 1년 결산마다 이벤트 카드 발동
export const EVENT_TRIGGER_YEARS = 1;

// 카드 풀 사이즈
export const CHANCE_CARD_COUNT = 12;
export const WELFARE_CARD_COUNT = 10;
export const EVENT_CARD_COUNT = 7;

// 부동산 사전 분배
export const PREDISTRIBUTE_PER_PLAYER = 4;

// 보드 사이즈
export const BOARD_SIZE = 40;

// 이동 제한 — 텔레포트/이동 효과로 도달 불가한 칸 type
export const TELEPORT_BLOCKED_TYPES = new Set([
  'utility', // 한전·수자원
  'go_to_jail',
  'jail',
]);
// railroad 중 환승 허브(서울·부산)는 본인 소유 시만 도달 가능. 역장 자리(춘천·광주)는 불가.

// 반올림 헬퍼: 10만 단위 반올림
export const round10 = (v) => Math.round(v / 10) * 10;
