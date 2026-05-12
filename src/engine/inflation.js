// 인플레이션 / 시세 계산 / 컬러 독점 보너스 / 프리미엄 카운터
//
// "현시세" 계산 공식:
//   현시세 = round10( basePrice
//                   × (1 + INFLATION_PER_YEAR) ** year
//                   × (1 + COLOR_MONOPOLY_BONUS if 컬러독점 else 1)
//                   × (1 + premiumCount * 0.01)
//                   × eventModifier (이벤트 카드 누적 배율) )
//
// year 은 "1년 결산"이 발화될 때마다 +1 (모두 GO 1바퀴).

import {
  INFLATION_PER_YEAR,
  COLOR_MONOPOLY_BONUS,
  RENT_RATIO,
  round10,
} from './constants.js';
import { isProperty, groupByColor } from './board.js';

// 인플레 배율
export const inflationMultiplier = (year) => Math.pow(1 + INFLATION_PER_YEAR, year);

// 컬러 독점 여부
export const hasColorMonopoly = (state, ownerId, color) => {
  const positions = groupByColor(state.board.tiles)[color] ?? [];
  return positions.length > 0 && positions.every((pos) => state.tileState[pos]?.owner === ownerId);
};

// 프리미엄 배율
export const premiumMultiplier = (premium) => 1 + premium * 0.01;

// 건물 가치 — 룰 §9: 빌라 N동 = N × houseCost, 아파트 = 5 × houseCost
export const buildingValue = (tile, stage) => {
  const hc = tile?.houseCost ?? 0;
  if (!stage || stage <= 0) return 0;
  if (stage === 5) return hc * 5; // 아파트
  return hc * stage; // 빌라 1~4동
};

// 부동산 현시세 — 룰 §9: (매입가 + 건물가치) × 1.04^년수
// 색깔 독점/프리미엄/이벤트 모디파이어는 룰 외 확장 (인플레와 함께 곱셈)
export const currentPrice = (state, pos) => {
  const tile = state.board.tiles[pos];
  if (!isProperty(tile)) return 0;
  const ts = state.tileState[pos] ?? {};
  const ownerId = ts.owner;
  const monopoly = ownerId != null && hasColorMonopoly(state, ownerId, tile.color);
  const eventMod = ts.priceModifier ?? 1;
  const baseValue = (tile.basePrice ?? 0) + buildingValue(tile, ts.stage ?? 0);
  const raw =
    baseValue *
    inflationMultiplier(state.year) *
    (monopoly ? 1 + COLOR_MONOPOLY_BONUS : 1) *
    premiumMultiplier(ts.premium ?? 0) *
    eventMod;
  return round10(raw);
};

// 월세 — 시세 비율 (표준 모노폴리 rent 배열 폐기)
// 빈=20% / 빌라1=20% / 빌라2=40% / 빌라3=60% / 빌라4=80% / 아파트=100%
// 색깔독점 보너스는 currentPrice 단계에서 +20% 곱해지므로 자동 반영됨
// 대출 상태(저당)면 월세 0
export const rentFromStage = (state, pos) => {
  const ts = state.tileState[pos] ?? {};
  const stage = ts.stage ?? 0;
  if (ts.mortgaged) return 0;
  if (ts.owner == null) return 0;
  return round10(currentPrice(state, pos) * RENT_RATIO[stage]);
};

// 1년 결산 — year++ 트리거 (모두 GO 1바퀴 완료 시 호출)
export const advanceYear = (state) => {
  state.year += 1;
  return state.year;
};

// 프리미엄 +1 (도착 시)
export const incrementPremium = (state, pos) => {
  state.tileState[pos] ??= {};
  state.tileState[pos].premium = (state.tileState[pos].premium ?? 0) + 1;
};
