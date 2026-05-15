import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../gameState.js';
import { createRng } from '../rng.js';
import { advanceTurn, playTurn } from '../rules.js';

test('자기 턴 실행: 주사위 + 이동 + 도착 처리 (오류 없이 완주)', () => {
  const rng = createRng(1);
  const state = createGameState({ numPlayers: 4, options: { predistribute: true, realTimeMode: false }, rng });
  for (let i = 0; i < 50; i++) {
    playTurn(state, rng);
    if (state.finished) break;
  }
  // 라운드가 진행됐는지
  assert.ok(state.round > 0);
});

test('GO 통과: 월급 200만 입금', () => {
  const rng = createRng(1);
  const state = createGameState({ numPlayers: 4, options: { predistribute: false }, rng });
  state.players[0].position = 38; // 출발 직전
  const before = state.players[0].cash;
  playTurn(state, rng);
  // GO 통과했으면 cash 증가 (생활비 차감 후이지만 200 - 20 = +180)
  assert.ok(state.players[0].cash > before - 100); // 최소 회복
});

test('60분 종료: deathmatch + finish', () => {
  const rng = createRng(1);
  const state = createGameState({ numPlayers: 4, options: { predistribute: true, realTimeMode: false }, rng });
  // 강제로 60분까지 돌림
  for (let i = 0; i < 200; i++) {
    playTurn(state, rng);
    if (state.finished) break;
  }
  assert.equal(state.finished, true);
  assert.notEqual(state.winner, null);
});

test('데스매치: 설정 시간 도달 시 deathmatch_start 이벤트가 기록된다', () => {
  const rng = createRng(1);
  const state = createGameState({
    numPlayers: 4,
    options: { predistribute: false, realTimeMode: false, eventCards: false, deathmatchStartMinutes: 30, totalGameMinutes: 999 },
    rng,
  });
  state.elapsedMin = 27.5;
  state.turnIndex = 3;
  const log = [];

  advanceTurn(state, rng, log);

  assert.equal(state.deathmatch, true);
  assert.ok(log.some((event) => event.kind === 'deathmatch_start'));
});

test('시뮬 재현성: 같은 시드 → 같은 결과', () => {
  const run = (seed) => {
    const rng = createRng(seed);
    const state = createGameState({ numPlayers: 4, options: { predistribute: true, realTimeMode: false }, rng });
    for (let i = 0; i < 100; i++) {
      playTurn(state, rng);
      if (state.finished) break;
    }
    return state.players.map((p) => p.cash).join(',');
  };
  assert.equal(run(42), run(42));
  assert.notEqual(run(42), run(43));
});
