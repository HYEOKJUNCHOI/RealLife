import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../gameState.js';
import { createRng } from '../rng.js';
import {
  accrueStationFunds,
  handleStationArrival,
  payInstitutionSalary,
  handleInstitutionArrival,
  handleHubArrival,
  stationResign,
} from '../station.js';
import { stationPositions, institutionPositions, hubPositions } from '../board.js';
import { STATION_CAP, HUB_PRICE } from '../constants.js';

test('역장 적립: 1년차 +10/턴', () => {
  const rng = createRng(1);
  const state = createGameState({ numPlayers: 4, options: { predistribute: false }, rng });
  accrueStationFunds(state);
  for (const pos of stationPositions(state.board.tiles)) {
    assert.equal(state.tileState[pos].fund, 10);
  }
});

test('역장 적립 캡: 1,000만', () => {
  const rng = createRng(1);
  const state = createGameState({ numPlayers: 4, options: { predistribute: false }, rng });
  for (let i = 0; i < 200; i++) accrueStationFunds(state);
  for (const pos of stationPositions(state.board.tiles)) {
    assert.equal(state.tileState[pos].fund, STATION_CAP);
  }
});

test('역장 도착: 적립금 자동 수령 + 부임', () => {
  const rng = createRng(1);
  const state = createGameState({ numPlayers: 4, options: { predistribute: false }, rng });
  const stations = stationPositions(state.board.tiles);
  state.tileState[stations[0]] = { fund: 500 };
  const before = state.players[0].cash;
  const r = handleStationArrival(state, 0, stations[0]);
  assert.equal(r.collected, 500);
  assert.equal(state.players[0].cash, before + 500);
  assert.equal(state.tileState[stations[0]].owner, 0);
  assert.equal(state.tileState[stations[0]].fund, 0);
});

test('역장 명예퇴직: 적립금 수령 + 자리 빔', () => {
  const rng = createRng(1);
  const state = createGameState({ numPlayers: 4, options: { predistribute: false }, rng });
  const pos = stationPositions(state.board.tiles)[0];
  state.tileState[pos] = { owner: 0, fund: 300 };
  const before = state.players[0].cash;
  const r = stationResign(state, 0);
  assert.equal(r.collected, 300);
  assert.equal(state.players[0].cash, before + 300);
  assert.equal(state.tileState[pos].owner, null);
});

test('한전·수자원 부임: 자기 턴 입금 (1년차 +10)', () => {
  const rng = createRng(1);
  const state = createGameState({ numPlayers: 4, options: { predistribute: false }, rng });
  const pos = institutionPositions(state.board.tiles)[0];
  // 도착 → 부임
  handleInstitutionArrival(state, 0, pos);
  const before = state.players[0].cash;
  const paid = payInstitutionSalary(state, 0);
  assert.equal(paid, 10); // 1년차
  assert.equal(state.players[0].cash, before + 10);
});

test('한전·수자원 2개 모음 = 단가 ×2', () => {
  const rng = createRng(1);
  const state = createGameState({ numPlayers: 4, options: { predistribute: false }, rng });
  const insts = institutionPositions(state.board.tiles);
  for (const pos of insts) handleInstitutionArrival(state, 0, pos);
  const paid = payInstitutionSalary(state, 0);
  // 1년차 10 × 2(double) × 2개 = 40
  assert.equal(paid, 40);
});

test('환승 허브 매입: 정가 400만 차감', () => {
  const rng = createRng(1);
  const state = createGameState({ numPlayers: 4, options: { predistribute: false }, rng });
  const pos = hubPositions(state.board.tiles)[0];
  const before = state.players[0].cash;
  const r = handleHubArrival(state, 0, pos, rng);
  assert.equal(r.type, 'buy');
  assert.equal(state.players[0].cash, before - HUB_PRICE);
  assert.equal(state.tileState[pos].owner, 0);
});

test('한전·수자원 강탈 시 연차 리셋', () => {
  const rng = createRng(1);
  const state = createGameState({ numPlayers: 4, options: { predistribute: false }, rng });
  const pos = institutionPositions(state.board.tiles)[0];
  handleInstitutionArrival(state, 0, pos);
  state.year = 5;
  // 다른 플레이어 도착
  handleInstitutionArrival(state, 1, pos);
  assert.equal(state.tileState[pos].owner, 1);
  assert.equal(state.tileState[pos].appointedYear, 5);
});
