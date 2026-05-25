import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const root = process.cwd();
const expected = {
  size: [400, 600],
  bbox: [82, 90, 317, 600],
};

test('Lu Bu character asset matches the Sejong token bbox standard', () => {
  const script = `
from pathlib import Path
from PIL import Image
import json
root = Path(${JSON.stringify(root)})
result = {}
for name in ['magistrate.png', 'lu-bu.png']:
    im = Image.open(root / 'public' / 'characters' / name).convert('RGBA')
    result[name] = {'size': list(im.size), 'bbox': list(im.getchannel('A').getbbox())}
print(json.dumps(result))
`;
  const run = spawnSync('python', ['-c', script], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const result = JSON.parse(run.stdout);

  assert.deepEqual(result['magistrate.png'], expected);
  assert.deepEqual(result['lu-bu.png'], expected);
});
