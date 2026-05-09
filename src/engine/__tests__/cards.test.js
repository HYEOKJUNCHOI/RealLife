import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../gameState.js';
import { createRng } from '../rng.js';
import { drawChanceCard } from '../cards.js';

test('찬스 군 입대: 입대 지원금 지급 + 3턴 휴식', () => {
  const rng = createRng(1);
  rng.pick = (items) => items.find((item) => item.id === 'military');
  const state = createGameState({ numPlayers: 4, options: { predistribute: false }, rng });
  const before = state.players[0].cash;

  const log = drawChanceCard(state, 0, rng);

  assert.equal(log.cardId, 'military');
  assert.equal(log.delta, 200);
  assert.equal(log.skipTurns, 3);
  assert.equal(state.players[0].cash, before + 200);
  assert.equal(state.players[0].skipTurns, 3);
});
