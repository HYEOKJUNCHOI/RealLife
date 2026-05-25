import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

test('manual board number pads do not expose 11 or 12 move buttons', () => {
  const sources = [
    readFileSync(join(root, 'src/components/CurrentPlayerStage.jsx'), 'utf8'),
    readFileSync(join(root, 'src/screens/GameMain.jsx'), 'utf8'),
  ];

  for (const source of sources) {
    assert.equal(source.includes('Array.from({ length: 12 }'), false);
    assert.match(source, /Array\.from\(\{ length: 10 \}/);
  }
});

test('AI direct board move randomizer follows the visible 1 to 10 board pad range', () => {
  const source = readFileSync(join(root, 'src/screens/GameMain.jsx'), 'utf8');

  assert.equal(source.includes('Math.random() * 12'), false);
  assert.match(source, /Math\.floor\(Math\.random\(\) \* 10\) \+ 1/);
});
