import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { compileMediaPlan } from '@red-cup-engineering/computer-media-engineering-services-section/plan/compile';
import { composeSourceScore, scoreWav } from '../src/kinetic-score.mjs';
import { sceneSvgAbyssalAnimated } from '../src/abyssal-stage.mjs';
import { planRehearsalDialogue, synthesizeRehearsalDialogue, decodeMonoPcm16 } from '../src/rehearsal-dialogue.mjs';
import { preflightProceduralPreview } from '../apps/previsualize-microdrama.mjs';
import { renderMediaPlan } from '../apps/render-media-plan.mjs';

// Independently derived consumer regressions. Native rendering is required, never skipped.
// Inputs are synthetic engineering fixtures, not authored productions or rights grants.
const sha = value => createHash('sha256').update(value).digest('hex');
function shot(id = 'shot') {
  return { id, frames: 30, characterIds: ['actor'], action: 'The actor waits.',
    dialogue: [{ speakerId: 'actor', startFrame: 0, endFrame: 30, text: 'Exact original audit line.' }],
    visual: { mode: 'deterministic', assets: [] } };
}
function plan() {
  return { kind: 'MediaPlan', version: 1, id: 'independent-renderer-audit', title: 'Renderer audit',
    consumer: 'renderer-independent-assay', fps: 30,
    source: { sourceRevision: `sha256:${'a'.repeat(64)}`, documents: [{ id: 'fixture', role: 'script', url: 'https://example.invalid/renderer-audit-fixture' }] },
    characters: [{ id: 'actor' }], scenes: [{ id: 'scene', shots: [shot()] }],
    render: { width: 180, outputFps: 10, targets: ['deterministic'], style: 'abstract', motion: 'still' },
    audio: { music: { profile: 'harmonic' }, dialogue: { voice: 'none' } },
    captions: { burnedIn: false } };
}
function compile(input) {
  const value = compileMediaPlan(input, { targets: ['deterministic'] });
  assert.equal(value.ok, true, JSON.stringify(value.refusals));
  return value.receipt.outputs.deterministic;
}
const boundaries = [
  { name: 'score-over-300-seconds', mutate: p => { p.scenes[0].shots[0].frames = 9030; },
    refuse: j => composeSourceScore(j.input.episode.shots, 30), expected: /score cannot exceed 300 seconds/ },
  { name: 'abyssal-shot-over-120-seconds', mutate: p => { p.render.style = 'abyssal-glass'; p.scenes[0].shots[0].frames = 3630; },
    refuse: j => sceneSvgAbyssalAnimated(j.input.episode.shots[0], 0, 1, 'audit', { sourceFps: 30 }), expected: /at most 120 seconds/ },
  { name: 'rehearsal-text-over-300-characters', mutate: p => { p.audio.dialogue.voice = 'rehearsal'; p.scenes[0].shots[0].dialogue[0].text = 'x'.repeat(301); },
    refuse: j => planRehearsalDialogue(j.input.episode.shots, 30, j.totalSeconds), expected: /bounded printable text/ },
  { name: 'rehearsal-cue-under-180ms', mutate: p => { p.audio.dialogue.voice = 'rehearsal'; p.scenes[0].shots[0].dialogue[0].endFrame = 5; },
    refuse: j => planRehearsalDialogue(j.input.episode.shots, 30, j.totalSeconds), expected: /window too short/ },
  { name: 'rehearsal-over-120-total-cues', mutate: p => {
      p.audio.dialogue.voice = 'rehearsal';
      p.scenes[0].shots = Array.from({ length: 11 }, (_, i) => ({ ...shot(`shot-${i}`), frames: 120,
        dialogue: Array.from({ length: 11 }, (_, k) => ({ speakerId: 'actor', startFrame: k * 10, endFrame: k * 10 + 10, text: 'Hi' })) })); },
    refuse: j => planRehearsalDialogue(j.input.episode.shots, 30, j.totalSeconds), expected: /too many rehearsal lines/ },
  { name: 'psychedelic-score-over-event-budget', mutate: p => {
      p.audio.music.profile = 'psychedelic';
      p.scenes[0].shots = Array.from({ length: 20 }, (_, i) => ({ ...shot(`shot-${i}`),
        dialogue: Array.from({ length: 12 }, () => ({ speakerId: 'actor', startFrame: 0, endFrame: 30, text: Array(64).fill('word').join(' ') })) })); },
    refuse: j => composeSourceScore(j.input.episode.shots, 30, { profile: 'psychedelic' }), expected: /score event budget exceeded/ },
];

function temp(t) {
  const root = mkdtempSync(join(tmpdir(), 'media-plan-receiving-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}
function receive(p, outDir) {
  const j = compile(p);
  const r = renderMediaPlan(p, { outDir });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.ok(r.receipt.checks.every(x => x.ok));
  assert.equal(r.receipt.video.frames, 10);
  assert.equal(r.receipt.video.width, 180); assert.equal(r.receipt.video.height, 320);
  assert.equal(readFileSync(join(outDir, 'captions.srt'), 'utf8'), j.captions.srt);
  return { j, outDir, r, manifest: JSON.parse(readFileSync(join(outDir, 'preview-manifest.json'), 'utf8')) };
}
function rgbFrame(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], { timeout: 30000, maxBuffer: 1024 * 1024 });
  assert.equal(r.status, 0, String(r.stderr)); assert.equal(r.stdout.length, 180 * 320 * 3);
  return r.stdout;
}
const fillSvg = color => `<svg xmlns="http://www.w3.org/2000/svg" width="540" height="960" viewBox="0 0 540 960"><rect width="540" height="960" fill="${color}"/></svg>`;
for (const item of boundaries) test(`preflight refuses ${item.name} before output`, t => {
  const p = plan(); item.mutate(p); const j = compile(p);
  // Prove this case reaches its causal supplier; missing eSpeak must not mask it.
  assert.throws(() => item.refuse(j), item.expected);
  assert.throws(() => preflightProceduralPreview(j.input, j.options), item.expected);
  const outDir = join(temp(t), 'refused');
  const r = renderMediaPlan(p, { outDir });
  assert.equal(r.ok, false);
  assert.ok(r.refusals.some(x => x.code === 'RENDERER_UNSUPPORTED' && x.path === 'deterministic' && item.expected.test(x.message)), JSON.stringify(r));
  assert.equal(existsSync(outDir), false);
});

test('an empty caption track renders with default burned-in setting', t => {
  const p = plan(); p.captions = {}; p.scenes[0].shots[0].dialogue = [];
  const { outDir } = receive(p, join(temp(t), 'empty-captions'));
  assert.equal(readFileSync(join(outDir, 'captions.srt'), 'utf8'), '');
});

for (const [style, music] of [['abstract', 'harmonic'], ['abstract', 'psychedelic'], ['abyssal-psychedelic', 'harmonic']]) {
  test(`the ${music} soundtrack is independent of ${style} visuals`, t => {
    const p = plan(); p.render.style = style; p.audio.music.profile = music;
    const { j, outDir, manifest } = receive(p, join(temp(t), 'music'));
    const expected = scoreWav(composeSourceScore(j.input.episode.shots, 30, { profile: music }));
    assert.equal(sha(readFileSync(join(outDir, 'score.wav'))), sha(expected));
    assert.equal(manifest.editableAssets.soundtrack.profile, music);
  });
}

for (const motion of ['character-bob', 'kinetic-rig']) for (const role of ['frame', 'overlay']) {
  test(`the ${role} asset dominates all ${motion} procedural layers in decoded video`, t => {
    const p = plan(); p.render.style = 'abyssal-psychedelic'; p.render.motion = motion;
    const assets = role === 'overlay' ? [{ id: 'first-overlay', role, svg: fillSvg('#ff0000') }] : [];
    assets.push({ id: 'final-cover', role, svg: fillSvg('#00ff00') });
    p.scenes[0].shots[0].visual.assets = assets;
    const { outDir } = receive(p, join(temp(t), 'layers'));
    const animated = readFileSync(join(outDir, 'animated-scene-01.svg'), 'utf8');
    for (const asset of assets) assert.ok(animated.includes(Buffer.from(asset.svg).toString('base64')), 'animated master must carry exact plan asset bytes');
    if (role === 'frame') assert.ok(!animated.includes('data-character='), 'a replacement frame cannot retain procedural actor layers');
    else assert.ok(animated.includes('<animateTransform'), 'overlay preserves the underlying animated master');
    const rgb = rgbFrame(join(outDir, 'preview.mp4'));
    let bad = 0;
    for (let i = 0; i < rgb.length; i += 3) if (rgb[i] > 15 || rgb[i + 1] < 240 || rgb[i + 2] > 15) bad++;
    assert.equal(bad, 0, `${bad} decoded pixels differ from the opaque final green asset`);
  });
}

test('a caller output path containing spaces and an apostrophe is supported', t => {
  const outDir = join(temp(t), "owner's preview");
  receive(plan(), outDir);
  assert.ok(existsSync(join(outDir, 'preview.mp4')));
});


test('zero-cue rehearsal uses the supplied private scratch root and cleans it', t => {
  const tempRoot = temp(t);
  const result = synthesizeRehearsalDialogue([{ id: 'silent-shot', frames: 30, dialogue: [] }], 30, 1, { tempRoot });
  assert.deepEqual(result.cues, []);
  assert.equal(result.sha256, sha(result.wav));
  const pcm = decodeMonoPcm16(result.wav);
  assert.equal(pcm.rate, 24000);
  assert.equal(pcm.samples.length, 48000);
  assert.ok(pcm.samples.every(byte => byte === 0));
  assert.deepEqual(readdirSync(tempRoot), [], 'private scratch must be removed after completion');
});

test('invalid rehearsal scratch root refuses instead of falling back outside it', t => {
  const tempRoot = join(temp(t), 'missing-parent');
  assert.throws(() => synthesizeRehearsalDialogue([{ id: 'silent-shot', frames: 30, dialogue: [] }], 30, 1, { tempRoot }), { code: 'ENOENT' });
  assert.equal(existsSync(tempRoot), false);
});


test('an actually unavailable FFmpeg retains ENOENT evidence and removes private scratch', t => {
  const root = temp(t), outDir = join(root, 'unavailable-renderer');
  const moduleUrl = new URL('../apps/previsualize-microdrama.mjs', import.meta.url);
  const input = compile(plan()).input;
  const script = `
    import { readFileSync, readdirSync } from 'node:fs';
    const { renderProceduralPreview } = await import(process.argv[1]);
    try {
      renderProceduralPreview(JSON.parse(readFileSync(0, 'utf8')), { outDir: process.argv[2], width: 180, fps: 10 });
      process.stdout.write(JSON.stringify({ unexpectedSuccess: true }));
      process.exitCode = 1;
    } catch (error) {
      process.stdout.write(JSON.stringify({ message: error.message, cause: error.cause, remainingOutput: readdirSync(process.argv[2]) }));
    }
  `;
  const child = spawnSync(process.execPath, ['--input-type=module', '--eval', script, moduleUrl.href, outDir], {
    input: JSON.stringify(input), encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024,
    env: { ...process.env, PATH: join(root, 'no-installed-tools') },
  });
  assert.equal(child.status, 0, String(child.stderr || child.error));
  const failure = JSON.parse(child.stdout);
  assert.deepEqual(failure.cause, {
    type: 'MediaRendererProcessFailure', tool: 'ffmpeg', exitStatus: null, signal: null, spawnCode: 'ENOENT',
  });
  assert.match(failure.message, /ffmpeg/);
  assert.match(failure.message, /ENOENT/);
  assert.deepEqual(failure.remainingOutput, [], 'failed native launch leaves no private scratch');
});
