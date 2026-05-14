// 통행료 / 도착 처리
//
// 빌라 1채: 월세 강제 (RENT_RATIO[1] = 20%)
// 빌라 2~3채: 월세(시세 × 40/60%) OR 임대(고정 100/120만) 중 보유자 선택
// 아파트: 시세 × 100% (큰 한 방, 강제)

import { rentFromStage, currentPrice, incrementPremium } from './inflation.js';
import { isProperty } from './board.js';
import { round10 } from './constants.js';

// 빌라 임대 모드 고정가 (빌라 2/3채)
const VILLA_LEASE_FIXED = { 2: 100, 3: 120 };

// 보유자 선택: 통행료 모드 ('monthly' = 월세, 'lease' = 임대)
// 단순화 시뮬: 더 큰 금액 선택
export const chooseRentMode = (state, pos) => {
  const ts = state.tileState[pos];
  const stage = ts.stage ?? 0;
  if (stage <= 1) return 'monthly';
  if (stage === 5) return 'monthly'; // 아파트 강제
  const monthly = rentFromStage(state, pos);
  const lease = VILLA_LEASE_FIXED[stage] ?? 0;
  return lease > monthly ? 'lease' : 'monthly';
};

// 도착 시 지불할 통행료 계산 (실제 차감 X — pure)
export const computeRent = (state, visitorId, pos) => {
  const tile = state.board.tiles[pos];
  if (!isProperty(tile)) return 0;
  const ts = state.tileState[pos];
  if (!ts || ts.owner == null) return 0; // 미보유 = 0
  if (ts.owner === visitorId) return 0; // 자기 부동산
  if (ts.mortgaged) return 0; // 대출 중 = 임대료 X
  const stage = ts.stage ?? 0;
  if (stage >= 2 && stage <= 3) {
    const mode = chooseRentMode(state, pos);
    if (mode === 'lease') return VILLA_LEASE_FIXED[stage];
  }
  return rentFromStage(state, pos);
};

// 통행료 지불 (잔액 부족 시 그대로 cash 음수 — 회생 단계는 호출자가 처리)
export const payRent = (state, visitorId, pos) => {
  const rent = computeRent(state, visitorId, pos);
  if (rent <= 0) return 0;
  const ts = state.tileState[pos];
  state.players[visitorId].cash -= rent;
  state.players[ts.owner].cash += rent;
  return rent;
};

// 부동산 도착 처리: 프리미엄 +1, 통행료 처리, 미보유 시 매입 옵션 반환
export const handlePropertyArrival = (state, visitorId, pos) => {
  incrementPremium(state, pos);
  const ts = state.tileState[pos];
  if (!ts || ts.owner == null) {
    return {
      type: 'unowned',
      buyPrice: state.board.tiles[pos]?.basePrice ?? currentPrice(state, pos),
      pos,
    };
  }
  if (ts.owner === visitorId) {
    return { type: 'own', pos };
  }
  if (ts.mortgaged) {
    return { type: 'mortgaged', pos };
  }
  const rent = payRent(state, visitorId, pos);
  return { type: 'rent', pos, rent, ownerId: ts.owner };
};
