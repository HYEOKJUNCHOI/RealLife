import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../gameState.js';
import { createRng } from '../rng.js';
import { validateTrade, executeTrade } from '../trade.js';

test('거래 검증: 잔액/소유 확인', () => {
  const rng = createRng(1);
  const state = createGameState({ numPlayers: 4, options: { predistribute: false }, rng });
  state.tileState[1] = { owner: 0, stage: 0, premium: 0 };
  state.tileState[3] = { owner: 1, stage: 0, premium: 0 };
  const offer = {
    from: 0,
    to: 1,
    give: { cash: 100, props: [1] },
    take: { cash: 50, props: [3] },
  };
  assert.equal(validateTrade(state, offer).ok, true);

  const bad = { ...offer, give: { ...offer.give, cash: 99999 } };
  assert.equal(validateTrade(state, bad).ok, false);
});

test('거래 실행: 부동산 + 현금 교환', () => {
  const rng = createRng(1);
  const state = createGameState({ numPlayers: 4, options: { predistribute: false }, rng });
  state.tileState[1] = { owner: 0, stage: 0, premium: 5 };
  state.tileState[3] = { owner: 1, stage: 0, premium: 0 };
  const before0 = state.players[0].cash;
  const before1 = state.players[1].cash;
  executeTrade(state, {
    from: 0,
    to: 1,
    give: { cash: 100, props: [1] },
    take: { cash: 50, props: [3] },
  });
  assert.equal(state.tileState[1].owner, 1);
  assert.equal(state.tileState[3].owner, 0);
  assert.equal(state.tileState[1].premium, 5); // 프리미엄 카운터 그대로
  assert.equal(state.players[0].cash, before0 - 100 + 50);
  assert.equal(state.players[1].cash, before1 + 100 - 50);
});
