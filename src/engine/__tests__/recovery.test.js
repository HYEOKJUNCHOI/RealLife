import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../gameState.js';
import { createRng } from '../rng.js';
import { tryRecover, sellPropertyToBank, sellOneHouse } from '../recovery.js';

test('회생 1단계: 부동산 대출로 cash 회복', () => {
  const rng = createRng(1);
  const state = createGameState({ numPlayers: 4, options: { predistributeCount: 0 }, rng });
  state.tileState[1] = { owner: 0, stage: 0, premium: 0 };
  state.tileState[3] = { owner: 0, stage: 0, premium: 0 };
  state.tileState[6] = { owner: 0, stage: 0, premium: 0 };
  state.players[0].cash = -50;
  const r = tryRecover(state, 0);
  assert.equal(r.recovered, true);
  assert.ok(r.log.some((l) => l.step === 'mortgage'));
  assert.ok(state.players[0].cash >= 0);
});

test('회생 5단계: 모든 수단 실패 시 파산', () => {
  const rng = createRng(1);
  const state = createGameState({ numPlayers: 4, options: { predistribute: false }, rng });
  state.players[0].cash = -10000; // 회수 불가
  const r = tryRecover(state, 0, false); // 고리대금 X
  assert.equal(r.bankrupt, true);
  assert.equal(state.players[0].bankrupt, true);
});

test('NPC 부동산 매도: 시세 50%', () => {
  const rng = createRng(1);
  const state = createGameState({ numPlayers: 4, options: { predistribute: false }, rng });
  state.tileState[1] = { owner: 0, stage: 0, premium: 0 };
  state.players[0].cash = 0;
  const net = sellPropertyToBank(state, 0, 1);
  assert.ok(net > 0);
  assert.equal(state.tileState[1].owner, null);
});

test('빌라 매각: 건설가 50%', () => {
  const rng = createRng(1);
  const state = createGameState({ numPlayers: 4, options: { predistribute: false }, rng });
  state.tileState[1] = { owner: 0, stage: 3, premium: 0 };
  const tile = state.board.tiles[1];
  // houseCost = 50 × 0.5 = 25
  const refund = sellOneHouse(state, 0, 1);
  assert.ok(refund > 0);
  assert.equal(state.tileState[1].stage, 2);
});

test('회생: 신용대출 자격 활성화 (cash ≤ 300만)', () => {
  const rng = createRng(1);
  const state = createGameState({ numPlayers: 4, options: { predistributeCount: 0 }, rng });
  // 부동산 없음 → 1/3단계 스킵 → 4단계 신용대출
  state.players[0].cash = -100;
  const r = tryRecover(state, 0, false);
  assert.equal(r.recovered, true);
  assert.ok(r.log.some((l) => l.step === 'credit'));
});
