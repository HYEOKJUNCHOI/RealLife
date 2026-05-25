import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const requiredCharacters = [
  {
    id: 'ahnJungGeun',
    name: '안중근',
    slot: 'character.ahnJungGeun',
    imagePath: '/characters/ahn-jung-geun.png',
  },
  {
    id: 'zhugeLiang',
    name: '제갈공명',
    slot: 'character.zhugeLiang',
    imagePath: '/characters/zhuge-liang.png',
  },
];

test('requested historical characters are registered in data, assets, and asset slots', () => {
  const characters = JSON.parse(readFileSync(join(root, 'src/data/characters.json'), 'utf8')).korea;
  const assetsSource = readFileSync(join(root, 'src/lib/assets.js'), 'utf8');
  const slotsSource = readFileSync(join(root, 'src/lib/assetSlots.js'), 'utf8');

  for (const expected of requiredCharacters) {
    const character = characters.find((item) => item.id === expected.id);
    assert.ok(character, `${expected.id} missing from characters.json`);
    assert.equal(character.name, expected.name);
    assert.equal(character.slot, expected.slot);

    assert.ok(assetsSource.includes(`${expected.id}: '${expected.imagePath}'`), `${expected.id} missing from CHARACTER_IMG`);
    assert.ok(assetsSource.includes(`${expected.id}: { name: '${expected.name}'`), `${expected.id} missing from CHARACTER_META`);
    assert.ok(slotsSource.includes(`id: '${expected.slot}'`), `${expected.id} missing from ASSET_SLOTS`);
    assert.ok(slotsSource.includes(`defaultPath: '${expected.imagePath}'`), `${expected.id} slot image path missing`);
    assert.ok(existsSync(join(root, 'public', expected.imagePath)), `${expected.imagePath} image file missing`);
  }
});
