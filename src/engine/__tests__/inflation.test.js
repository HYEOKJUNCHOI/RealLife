import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../gameState.js';
import { createRng } from '../rng.js';
import {
  inflationMultiplier,
  premiumMultiplier,
  hasColorMonopoly,
  currentPrice,
  advanceYear,
  incrementPremium,
} from '../inflation.js';
import { round10 } from '../constants.js';
import { propertyPositions, groupByColor } from '../board.js';

test('인플레 배율: 0년차 = 1, 1년차 = 1.04, 5년차 ≈ 1.2167', () => {
  assert.equal(inflationMultiplier(0), 1);
  assert.ok(Math.abs(inflationMultiplier(1) - 1.04) < 1e-9);
  assert.ok(Math.abs(inflationMultiplier(5) - Math.pow(1.04, 5)) < 1e-9);
});

test('프리미엄 배율: 5회 누적 = +5%', () => {
  assert.equal(premiumMultiplier(0), 1);
  assert.equal(premiumMultiplier(5), 1.05);
});

test('현시세: 인플레 + 컬러 독점 + 프리미엄 모두 누적', () => {
  const rng = createRng(42);
  const state = createGameState({ numPlayers: 4, options: { predistribute: false }, rng });
  // 수원(pos 1) basePrice = 60×2 = 120
  const pos = 1;
  state.tileState[pos] = { owner: 0, stage: 0, premium: 0 };
  assert.equal(currentPrice(state, pos), round10(120));

  state.year = 1;
  // 인플레 4% → 124.8 → round10 → 120
  assert.equal(currentPrice(state, pos), round10(120 * 1.04));

  // 같은 컬러 그룹 모두 owner 0 → 컬러 독점
  state.tileState[3] = { owner: 0, stage: 0, premium: 0 };
  state.year = 0;
  // 120 × 1.2 = 144 → round10 → 140
  assert.equal(currentPrice(state, pos), round10(120 * 1.2));

  // 프리미엄 +5
  state.tileState[pos].premium = 5;
  // 120 × 1.2 × 1.05 = 151.2 → round10 → 150
  assert.equal(currentPrice(state, pos), round10(120 * 1.2 * 1.05));
});

test('1년 결산 advanceYear 증가', () => {
  const state = createGameState({ numPlayers: 4 });
  assert.equal(state.year, 0);
  advanceYear(state);
  assert.equal(state.year, 1);
});

test('프리미엄 +1 누적', () => {
  const state = createGameState({ numPlayers: 4 });
  incrementPremium(state, 1);
  incrementPremium(state, 1);
  assert.equal(state.tileState[1].premium, 2);
});

test('컬러 독점 판정 — 한 색 다 가졌을 때만 true', () => {
  const rng = createRng(1);
  const state = createGameState({ numPlayers: 4, options: { predistribute: false }, rng });
  const colors = groupByColor(state.board.tiles);
  // brown: 1, 3 두 칸
  state.tileState[1] = { owner: 0, stage: 0, premium: 0 };
  assert.equal(hasColorMonopoly(state, 0, 'brown'), false);
  state.tileState[3] = { owner: 0, stage: 0, premium: 0 };
  assert.equal(hasColorMonopoly(state, 0, 'brown'), true);
});
