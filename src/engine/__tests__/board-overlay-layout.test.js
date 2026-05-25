import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const gameMainSource = () => readFileSync(join(root, 'src/screens/GameMain.jsx'), 'utf8');
const cssSource = () => readFileSync(join(root, 'src/styles/index.css'), 'utf8');

test('board overlay does not render the center keypad in ready or inspect states', () => {
  const source = gameMainSource();
  assert.equal(source.includes('replay.phase === \'ready\' ? (\n                  <div className="board-turn-number-pad">'), false);
  assert.equal(source.includes('replay.phase === \'inspect\' ? (\n                  <div className="board-turn-number-pad">'), false);
  assert.match(source, /const centerBoardContent =/);
});

test('board overlay renders ownership rails outside the green board', () => {
  const source = gameMainSource();
  const styles = cssSource();

  assert.match(source, /boardOwnerRails/);
  assert.match(source, /board-turn-owner-rail-/);
  assert.match(styles, /\.board-turn-owner-rail/);
  assert.match(styles, /--owner-rail-gap:\s*3px/);
});
