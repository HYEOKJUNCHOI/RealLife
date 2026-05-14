// 세금 — 사치세 / 소득세 / 종부세 / 생활비
// 사치세 + 소득세는 주차장(휴게소 로또)에 누적

import {
  LUXURY_TAX_AMOUNTS,
  INCOME_TAX_RATE,
  PROPERTY_TAX_TIERS,
  LIVING_COST_TIERS,
  round10,
} from './constants.js';
import { currentPrice } from './inflation.js';
import { isProperty } from './board.js';

// 총 자산 (현금 + 부동산 시세 합)
export const computeNetWorth = (state, playerId) => {
  let total = state.players[playerId].cash;
  for (const pos in state.tileState) {
    const ts = state.tileState[pos];
    if (ts.owner === playerId && isProperty(state.board.tiles[pos])) {
      total += currentPrice(state, +pos);
      // 빌라/아파트 가치도 포함 (건설가 합)
      const tile = state.board.tiles[pos];
      const stage = ts.stage ?? 0;
      if (stage >= 1 && stage <= 3) total += tile.houseCost * stage;
      if (stage === 5) total += tile.houseCost * 5;
    }
  }
  // 신용대출/고리대금/대출 차감 (부채는 음수)
  total -= state.players[playerId].creditDebt ?? 0;
  total -= state.players[playerId].loansharkDebt ?? 0;
  return total;
};

// 자산 단계 (생활비/종부세 공통)
const tierIndex = (worth, tiers) => {
  for (let i = 0; i < tiers.length; i++) {
    if (worth <= tiers[i].threshold) return i;
  }
  return tiers.length - 1;
};

// 생활비 (매 자기 턴) — 자산 누진
export const chargeLivingCost = (state, playerId) => {
  const worth = computeNetWorth(state, playerId);
  const tier = LIVING_COST_TIERS[tierIndex(worth, LIVING_COST_TIERS)];
  state.players[playerId].cash -= tier.cost;
  return tier.cost;
};

// 종부세 (1년 결산) — 누진
export const chargePropertyTax = (state, playerId) => {
  const worth = computeNetWorth(state, playerId);
  const tier = PROPERTY_TAX_TIERS[tierIndex(worth, PROPERTY_TAX_TIERS)];
  const tax = round10(worth * tier.rate);
  state.players[playerId].cash -= tax;
  return tax;
};

// 사치세 도착 → 주차장 누적
export const handleLuxuryTax = (state, playerId, rng) => {
  const amount = rng.pick(LUXURY_TAX_AMOUNTS);
  state.players[playerId].cash -= amount;
  state.parkingPot += amount;
  return amount;
};

// 소득세 도착 → 주차장 누적
// 보드 칸에 amount가 있으면 고정 금액을 우선 사용한다.
export const handleIncomeTax = (state, playerId, fixedAmount = null) => {
  const worth = computeNetWorth(state, playerId);
  const tax = fixedAmount != null && Number.isFinite(Number(fixedAmount)) ? Number(fixedAmount) : round10(worth * INCOME_TAX_RATE);
  state.players[playerId].cash -= tax;
  state.parkingPot += tax;
  return tax;
};

// 주차장 (휴게소 로또) 잭팟 수령
export const collectParkingPot = (state, playerId) => {
  const pot = state.parkingPot;
  state.players[playerId].cash += pot;
  state.parkingPot = 0;
  return pot;
};
