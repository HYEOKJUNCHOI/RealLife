import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../rng.js';
import { rollTurnDice } from '../dice.js';

test('주사위: 합 2~12', () => {
  const rng = createRng(1);
  for (let i = 0; i < 100; i++) {
    const d = rollTurnDice(rng);
    assert.ok(d.sum >= 2 && d.sum <= 12);
  }
});

test('더블 시 extraTurn=true', () => {
  // 시드를 돌려가며 더블 케이스 찾기
  for (let s = 1; s < 200; s++) {
    const rng = createRng(s);
    const d = rollTurnDice(rng, 0);
    if (d.isDouble) {
      assert.equal(d.extraTurn, true);
      assert.equal(d.doublesCount, 1);
      return;
    }
  }
  assert.fail('더블 케이스 못 찾음');
});

test('3연속 더블 = 감옥', () => {
  // 강제 3 doubles 케이스 모킹
  const rng = { rollDice: () => ({ d1: 3, d2: 3, sum: 6, isDouble: true }) };
  const r1 = rollTurnDice(rng, 0);
  assert.equal(r1.doublesCount, 1);
  const r2 = rollTurnDice(rng, r1.doublesCount);
  assert.equal(r2.doublesCount, 2);
  const r3 = rollTurnDice(rng, r2.doublesCount);
  assert.equal(r3.doublesCount, 3);
  assert.equal(r3.goToJail, true);
  assert.equal(r3.extraTurn, false);
});
