import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../gameState.js';
import { createRng } from '../rng.js';
import { drawChanceCard } from '../cards.js';
import { onTurnStart } from '../rules.js';

test('찬스 군 입대: 입대 지원금 지급 + 3턴 휴식', () => {
  const rng = createRng(1);
  rng.next = () => 0.99;
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

test('찬스 레어 인생체인지: 10% 구간에서 선택 권한이 생성된다', () => {
  const rng = createRng(1);
  rng.next = () => 0.05;
  const state = createGameState({ numPlayers: 2, options: { predistribute: false }, rng });

  const log = drawChanceCard(state, 0, rng);

  assert.equal(log.cardId, 'life_change');
  assert.equal(state.pendingLifeChange.playerId, 0);
  assert.equal(log.choiceRequired, true);
});

test('찬스 방어카드: 15% 구간에서 보유 수량이 증가한다', () => {
  const rng = createRng(1);
  rng.next = () => 0.20;
  const state = createGameState({ numPlayers: 2, options: { predistribute: false }, rng });

  const log = drawChanceCard(state, 0, rng);

  assert.equal(log.cardId, 'defense_card');
  assert.equal(state.players[0].defenseCards, 1);
});

test('찬스 패시브: 활성화 후 다음 턴 시작 월급 보너스가 발동한다', () => {
  const rng = createRng(1);
  rng.next = () => 0.99;
  rng.pick = (items) => items.find((item) => item.id === 'job_change');
  const state = createGameState({ numPlayers: 2, options: { predistribute: false }, rng });

  const log = drawChanceCard(state, 0, rng);
  const turnStartLog = [];
  onTurnStart(state, 0, turnStartLog);

  assert.equal(log.cardId, 'job_change');
  assert.equal(state.players[0].salaryBonus, 50);
  assert.deepEqual(state.players[0].activatedPassives, [3]);
  assert.ok(turnStartLog.some((event) => event.kind === 'salary_bonus' && event.amt === 50));
});
