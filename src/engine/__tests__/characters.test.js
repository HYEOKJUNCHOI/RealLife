import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const removedCharacterTerms = ['이재명', '전두환', 'leeJaeMyung', 'chunDooHwan', 'lee-jae-myung', 'chun-doo-hwan'];

test('removed public-figure characters are not present in character data or code references', () => {
  const filesToCheck = [
    'src/data/characters.json',
    'src/lib/assets.js',
    'src/lib/assetSlots.js',
    'src/screens/GameMain.jsx',
    'src/components/CurrentPlayerStage.jsx',
    'src/components/OtherPlayersStrip.jsx',
  ];

  const violations = [];

  for (const relativePath of filesToCheck) {
    const content = readFileSync(join(root, relativePath), 'utf8');
    for (const term of removedCharacterTerms) {
      if (content.includes(term)) {
        violations.push(`${relativePath}: ${term}`);
      }
    }
  }

  assert.deepEqual(violations, []);
});
