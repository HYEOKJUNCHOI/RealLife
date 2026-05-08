import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../gameState.js';
import { createRng } from '../rng.js';
import {
  mortgage,
  canMortgage,
  repayMortgage,
  chargeMortgageInterest,
  rollNewLoanRate,
  takeCredit,
  canTakeCredit,
  chargeCreditInterest,
  tryAutoRepayCredit,
  takeLoanshark,
  chargeLoansharkInterest,
  repayLoanshark,
} from '../loan.js';
import { LOAN_RATES, CREDIT_LIMIT, LOANSHARK_LIMIT } from '../constants.js';

test('부동산 대출: 시세 70% 만큼 cash 입금, mortgaged true', () => {
  const rng = createRng(1);
  const state = createGameState({ numPlayers: 4, options: { predistribute: false }, rng });
  state.tileState[1] = { owner: 0, stage: 0, premium: 0 };
  const initialCash = state.players[0].cash;
  assert.equal(canMortgage(state, 1), true);
  const amt = mortgage(state, 1);
  assert.ok(amt > 0);
  assert.equal(state.tileState[1].mortgaged, true);
  assert.equal(state.players[0].cash, initialCash + amt);
});

test('대출 불가: 건설된 부동산', () => {
  const rng = createRng(1);
  const state = createGameState({ numPlayers: 4, options: { predistribute: false }, rng });
  state.tileState[1] = { owner: 0, stage: 1, premium: 0 };
  assert.equal(canMortgage(state, 1), false);
});

test('대출 상환: 빌린 금액 그대로', () => {
  const rng = createRng(1);
  const state = createGameState({ numPlayers: 4, options: { predistribute: false }, rng });
  state.tileState[1] = { owner: 0, stage: 0, premium: 0 };
  const amt = mortgage(state, 1);
  const cashAfter = state.players[0].cash;
  repayMortgage(state, 1);
  assert.equal(state.players[0].cash, cashAfter - amt);
  assert.equal(state.tileState[1].mortgaged, false);
});

test('대출 이자율: LOAN_RATES 중 하나', () => {
  const rng = createRng(1);
  for (let i = 0; i < 50; i++) {
    const rate = rollNewLoanRate(rng);
    assert.ok(LOAN_RATES.includes(rate));
  }
});

test('자기 턴 부동산 대출 이자 차감', () => {
  const rng = createRng(1);
  const state = createGameState({ numPlayers: 4, options: { predistribute: false }, rng });
  state.tileState[1] = { owner: 0, stage: 0, premium: 0 };
  state.loanRate = 0.03;
  const amt = mortgage(state, 1);
  const before = state.players[0].cash;
  const interest = chargeMortgageInterest(state, 0);
  // round10(amt × 0.03)
  assert.equal(state.players[0].cash, before - interest);
});

test('신용대출 자격: 잔액 ≤ 300만 + 미사용', () => {
  const state = createGameState({ numPlayers: 4 });
  const p = state.players[0];
  p.cash = 500;
  assert.equal(canTakeCredit(p), false);
  p.cash = 200;
  assert.equal(canTakeCredit(p), true);
  takeCredit(p);
  assert.equal(p.creditDebt, CREDIT_LIMIT);
  assert.equal(canTakeCredit(p), false); // 1회 한정
});

test('신용대출 이자: 미납 누적', () => {
  const state = createGameState({ numPlayers: 4 });
  const p = state.players[0];
  p.cash = 200;
  takeCredit(p);
  // 1,200만 cash. 이자 10만 가능.
  let r = chargeCreditInterest(p);
  assert.equal(r.paid, 10);
  // cash 부족 시뮬: cash 0
  p.cash = 0;
  r = chargeCreditInterest(p);
  assert.equal(r.missed, true);
  assert.equal(p.creditMisses, 1);
  r = chargeCreditInterest(p);
  assert.equal(p.creditMisses, 2);
  r = chargeCreditInterest(p);
  assert.equal(p.creditMisses, 3);
  r = chargeCreditInterest(p);
  // 4회째 — defaulted
  assert.equal(r.defaulted, true);
});

test('신용대출 자동 상환: cash ≥ 1,000만 시 300만 상환', () => {
  const state = createGameState({ numPlayers: 4 });
  const p = state.players[0];
  p.cash = 200;
  takeCredit(p);
  p.cash = 1500; // 직접 셋
  const repaid = tryAutoRepayCredit(p);
  assert.equal(repaid, 300);
  assert.equal(p.creditDebt, 700);
  assert.equal(p.cash, 1200);
});

test('고리대금 한도/이자/상환', () => {
  const state = createGameState({ numPlayers: 4 });
  const p = state.players[0];
  takeLoanshark(p);
  assert.equal(p.loansharkDebt, LOANSHARK_LIMIT);
  // 이자 30만
  const before = p.cash;
  chargeLoansharkInterest(p);
  assert.equal(p.cash, before - 30);
  // 중도상환 — 수수료 10%: 2000 × 1.1 = 2200
  p.cash = 3000;
  const total = repayLoanshark(p);
  assert.equal(total, 2200);
  assert.equal(p.loansharkDebt, 0);
});

test('고리대금 1회 미납 = 즉시 청산', () => {
  const state = createGameState({ numPlayers: 4 });
  const p = state.players[0];
  takeLoanshark(p);
  p.cash = 0;
  const r = chargeLoansharkInterest(p);
  assert.equal(r.defaulted, true);
});
