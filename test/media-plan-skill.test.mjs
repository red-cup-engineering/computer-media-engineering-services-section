import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mediaPlanFromNarrativeEpisode } from '../src/media-plan-migrate.mjs';

const script = (name) => new URL(`../lib/agency/skills/compile-a-media-plan/scripts/${name}`, import.meta.url).pathname;
const episode = JSON.parse(readFileSync(new URL('./fixtures/unassigned-floor-episode-001.json', import.meta.url), 'utf8'));
const run = (name, args) => spawnSync(process.execPath, [script(name), ...args], { encoding: 'utf8' });

test('skill script: plan in, protocol files out, receipt verifies; a refusal writes only the refusals file', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'media-plan-skill-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const planFile = join(dir, 'plan.json');
  writeFileSync(planFile, JSON.stringify(mediaPlanFromNarrativeEpisode(episode, { consumer: 'unassigned-floor-serial' })));
  const ok = run('compile-media-plan.mjs', [planFile, '--out', join(dir, 'ok')]);
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(JSON.parse(ok.stdout).flowOrders, 8);
  const verified = run('verify-compile-receipt.mjs', [join(dir, 'ok/media-plan.admitted.json'), join(dir, 'ok/media-plan.compile-receipt.json')]);
  assert.equal(verified.status, 0, verified.stderr);
  // A tampered receipt is caught.
  const receipt = JSON.parse(readFileSync(join(dir, 'ok/media-plan.compile-receipt.json'), 'utf8'));
  receipt.outputs.flow.orders[0].prompt = 'tampered';
  writeFileSync(join(dir, 'tampered.json'), JSON.stringify(receipt));
  assert.equal(run('verify-compile-receipt.mjs', [join(dir, 'ok/media-plan.admitted.json'), join(dir, 'tampered.json')]).status, 2, 'carried outputs no longer match the address the receipt names');
  receipt.outputId = 'ni:///sha-256;' + 'A'.repeat(43);
  writeFileSync(join(dir, 'tampered.json'), JSON.stringify(receipt));
  assert.equal(run('verify-compile-receipt.mjs', [join(dir, 'ok/media-plan.admitted.json'), join(dir, 'tampered.json')]).status, 2);
  // Refusal.
  const bad = mediaPlanFromNarrativeEpisode(episode, { consumer: 'unassigned-floor-serial' });
  bad.scenes[0].shots[0].dialogue[0].speakerId = 'unseen';
  writeFileSync(join(dir, 'bad.json'), JSON.stringify(bad));
  const refused = run('compile-media-plan.mjs', [join(dir, 'bad.json'), '--out', join(dir, 'bad-out')]);
  assert.equal(refused.status, 2);
  assert.ok(existsSync(join(dir, 'bad-out/media-plan.refusals.json')));
  assert.ok(!existsSync(join(dir, 'bad-out/media-plan.compile-receipt.json')));
  assert.equal(run('compile-media-plan.mjs', []).status, 1);
});
