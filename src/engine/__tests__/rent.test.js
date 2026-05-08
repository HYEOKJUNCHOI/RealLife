import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../gameState.js';
import { createRng } from '../rng.js';
import { computeRent, payRent, handlePropertyArrival } from '../rent.js';
import { rentFromStage, currentPrice } from '../inflation.js';
import { round10, RENT_RATIO } from '../constants.js';

test('통행료: 빈 부동산 (보유 X) = 0', () => {
  const rng = createRng(1);
  const state = createGameState({ numPlayers: 4, options: { predistribute: false }, rng });
  assert.equal(computeRent(state, 0, 1), 0);
});

test('통행료: 자기 부동산 = 0', () => {
  const rng = createRng(1);
  const state = createGameState({ numPlayers: 4, options: { predistribute: false }, rng });
  state.tileState[1] = { owner: 0, stage: 1, premium: 0 };
  assert.equal(computeRent(state, 0, 1), 0);
});

test('통행료: 빌라 1채 = 시세 30%', () => {
  const rng = createRng(1);
  const state = createGameState({ numPlayers: 4, options: { predistribute: false }, rng });
  state.tileState[1] = { owner: 1, stage: 1, premium: 0 };
  const expected = round10(currentPrice(state, 1) * RENT_RATIO[1]);
  assert.equal(computeRent(state, 0, 1), expected);
});

test('통행료: 아파트 = 시세 80%', () => {
  const rng = createRng(1);
  const state = createGameState({ numPlayers: 4, options: { predistribute: false }, rng });
  state.tileState[1] = { owner: 1, stage: 5, premium: 0 };
  const expected = round10(currentPrice(state, 1) * RENT_RATIO[5]);
  assert.equal(computeRent(state, 0, 1), expected);
});

test('통행료: 대출 중 부동산 = 0', () => {
  const rng = createRng(1);
  const state = createGameState({ numPlayers: 4, options: { predistribute: false }, rng });
  state.tileState[1] = { owner: 1, stage: 0, premium: 0, mortgaged: true };
  assert.equal(computeRent(state, 0, 1), 0);
});

test('payRent: 방문자 -, 보유자 +', () => {
  const rng = createRng(1);
  const state = createGameState({ numPlayers: 4, options: { predistribute: false }, rng });
  state.tileState[1] = { owner: 1, stage: 1, premium: 0 };
  const beforeV = state.players[0].cash;
  const beforeO = state.players[1].cash;
  const rent = payRent(state, 0, 1);
  assert.ok(rent > 0);
  assert.equal(state.players[0].cash, beforeV - rent);
  assert.equal(state.players[1].cash, beforeO + rent);
});

test('도착 처리: 미보유 부동산은 매입 가능 옵션 반환', () => {
  const rng = createRng(1);
  const state = createGameState({ numPlayers: 4, options: { predistribute: false }, rng });
  const r = handlePropertyArrival(state, 0, 1);
  assert.equal(r.type, 'unowned');
  assert.ok(r.buyPrice > 0);
});
