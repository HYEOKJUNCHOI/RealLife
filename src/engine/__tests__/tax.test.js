import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../gameState.js';
import { createRng } from '../rng.js';
import {
  computeNetWorth,
  chargeLivingCost,
  chargePropertyTax,
  handleLuxuryTax,
  handleIncomeTax,
  collectParkingPot,
} from '../tax.js';
import { LIVING_COST_TIERS } from '../constants.js';

test('생활비 누진: 자산 단계별 차감', () => {
  const state = createGameState({ numPlayers: 4 });
  const p = state.players[0];
  // 시작 cash 2500 → 단계 2 (>2000, ≤5000) → 20만
  const cost = chargeLivingCost(state, 0);
  assert.equal(cost, 20);
});

test('종부세 누진: 자산 단계별 세율', () => {
  const state = createGameState({ numPlayers: 4 });
  const p = state.players[0];
  p.cash = 1500; // 1단계 1%
  let tax = chargePropertyTax(state, 0);
  assert.ok(tax >= 10 && tax <= 20); // 1500 × 0.01 = 15 → 20
  p.cash = 3000;
  tax = chargePropertyTax(state, 0);
  // 3000 × 0.02 = 60
  assert.equal(tax, 60);
});

test('사치세: 50~300만 랜덤, 주차장 누적', () => {
  const rng = createRng(1);
  const state = createGameState({ numPlayers: 4 });
  const before = state.players[0].cash;
  const amt = handleLuxuryTax(state, 0, rng);
  assert.ok([50, 100, 150, 200, 250, 300].includes(amt));
  assert.equal(state.players[0].cash, before - amt);
  assert.equal(state.parkingPot, amt);
});

test('소득세: 재산 × 10%, 주차장 누적', () => {
  const state = createGameState({ numPlayers: 4 });
  const before = state.players[0].cash;
  const tax = handleIncomeTax(state, 0);
  // 시작 자산 ≈ 2500만 + 부동산 ~800만 = ~3300만. tax ~330
  assert.ok(tax > 0);
  assert.equal(state.parkingPot, tax);
});

test('주차장 잭팟 수령', () => {
  const state = createGameState({ numPlayers: 4 });
  state.parkingPot = 500;
  const before = state.players[0].cash;
  const pot = collectParkingPot(state, 0);
  assert.equal(pot, 500);
  assert.equal(state.players[0].cash, before + 500);
  assert.equal(state.parkingPot, 0);
});

test('netWorth: 부채 차감', () => {
  const state = createGameState({ numPlayers: 4 });
  const p = state.players[0];
  p.cash = 1000;
  p.creditDebt = 300;
  p.loansharkDebt = 500;
  const w = computeNetWorth(state, 0);
  // cash 1000 + 부동산 시세 합 - 300 - 500
  assert.ok(w >= 200); // 부동산 자산 있을 것
});
