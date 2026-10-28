import assert from 'node:assert/strict';
import test from 'node:test';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { encodeWebRasterVariants } from '../src/web-raster-variants.mjs';

const run = promisify(execFile);
const rights = { id: 'local:test-chart', license: 'Fixture: test author', derivativesAuthorized: true };
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), '561-media-fixture-'));
  try {
    const ppm = Buffer.alloc(128 * 96 * 3 + 15);
    const header = Buffer.from('P6\n128 96\n255\n');
    header.copy(ppm);
    // Six source-controlled categories; monochrome preview is not proven readable.
    for (let y = 0; y < 96; y++) for (let x = 0; x < 128; x++) {
      const at = header.length + (y * 128 + x) * 3;
      const patch = Math.floor(x / 22) % 6;
      const colors = [[0,80,140],[240,50,0],[5,160,45],[150,0,170],[238,180,0],[20,20,20]];
      ppm.set(colors[patch], at);
    }
    const input = join(dir, 'fixture.ppm'), png = join(dir, 'fixture.png');
    await writeFile(input, ppm.subarray(0, header.length + 128*96*3));
    await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-frames:v', '1', png]);
    return await readFile(png);
  } finally { await rm(dir, { recursive: true, force: true }); }
}

test('encodes real candidate formats but never claims a green winner', async () => {
  const source = await fixture();
  const result = await encodeWebRasterVariants(source, {
    source: rights, width: 128, height: 96,
    formats: ['webp', 'avif', 'dithered-png'], allowLossyPreview: true,
  });
  assert.equal(result.candidates.length, 3);
  assert.deepEqual(result.candidates.map(v => v.mime), ['image/webp', 'image/avif', 'image/png']);
  for (const candidate of result.candidates) {
    assert.equal(candidate.data.length, candidate.bytes);
    assert.match(candidate.sha256, /^[a-f0-9]{64}$/);
    assert.ok(candidate.bytes > 20);
    assert.equal(candidate.taskFidelity, 'unassessed');
    assert.equal(candidate.electricity, null);
    assert.equal(candidate.greenhouseGases, null);
    assert.ok(candidate.encodeElapsedMs > 0);
  }
  assert.match(result.claims, /no task fidelity/);
});

test('rejects missing rights, unsupported source formats and unapproved dithering', async () => {
  const bytes = await fixture();
  await assert.rejects(encodeWebRasterVariants(bytes, { source: { id:'x',license:'test' }, width:128,height:96 }), /authorization/);
  await assert.rejects(encodeWebRasterVariants(bytes, { source:rights, width:128,height:96,formats:['dithered-png'] }), /information-loss/);
  await assert.rejects(encodeWebRasterVariants(Buffer.from('not an image'), { source:rights, width:128,height:96 }), /PNG\/JPEG/);
});

test('rejects source byte budgets, pixel bombs and duplicate variants', async () => {
  const bytes = await fixture();
  await assert.rejects(encodeWebRasterVariants(bytes, { source:rights, width:128,height:96,maxSourceBytes: 1 }), /Source bytes exceed/);
  await assert.rejects(encodeWebRasterVariants(bytes, { source:rights, width:4096,height:4096 }), /pixel budget/);
  await assert.rejects(encodeWebRasterVariants(bytes, { source:rights, width:128,height:96,formats:['webp','webp'] }), /unique/);
});
