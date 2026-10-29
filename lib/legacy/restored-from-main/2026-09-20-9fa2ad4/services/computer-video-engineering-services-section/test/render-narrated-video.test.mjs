import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createProvenance, createRenderPlan, renderNarratedVideo, validateNarratedVideoInput } from '../src/index.mjs';

const input = {
  title: 'A stable title',
  body: 'A stable body.',
  channelPresentation: { backgroundColor: '0x202020', foregroundColor: '&H00FFFFFF', fontSize: 44, height: 720, width: 1280 }
};

const segmentedInput = {
  title: 'A segmented title',
  segments: [
    { heading: 'First heading', lines: ['First supporting line one.', 'First supporting line two.'], narration: 'First segment narration.' },
    { heading: 'Second heading', lines: ['Second supporting line.'], narration: 'Second segment narration.' }
  ],
  channelPresentation: { backgroundColor: '0x202020', foregroundColor: '&H00FFFFFF', fontSize: 44, height: 720, width: 1280 }
};

function executeProcess({ program, args }) {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, { shell: false });
    let stdout = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.once('error', reject);
    child.once('close', (code) => resolve({ code, stdout }));
  });
}

async function checkFfmpegAvailable(context) {
  try {
    const available = await executeProcess({ program: 'ffmpeg', args: ['-version'] });
    if (available.code !== 0) {
      context.skip('ffmpeg is not usable');
      return false;
    }
    return true;
  } catch {
    context.skip('ffmpeg is unavailable');
    return false;
  }
}

test('validates only presentation input and rejects channel authority', () => {
  assert.equal(validateNarratedVideoInput(input).title, input.title);
  assert.throws(() => validateNarratedVideoInput({ ...input, channelId: 'not-allowed' }), /unsupported input field/);
  assert.throws(() => validateNarratedVideoInput({ ...input, channelPresentation: { ...input.channelPresentation, oauthToken: 'not-allowed' } }), /unsupported channelPresentation field/);
});

test('render plans and provenance have stable canonical bytes', () => {
  const first = createRenderPlan(input);
  const second = createRenderPlan({ channelPresentation: { width: 1280, height: 720, fontSize: 44, foregroundColor: '&H00FFFFFF', backgroundColor: '0x202020' }, body: 'A stable body.', title: 'A stable title' });
  assert.equal(first.planBytes, second.planBytes);
  assert.equal(first.planDigest, second.planDigest);
  assert.equal(createProvenance(first).provenanceBytes, createProvenance(second).provenanceBytes);
});

test('renderer writes only declared job files and executes injected commands', async () => {
  const workDirectory = await mkdtemp(path.join(os.tmpdir(), 'offline-video-renderer-'));
  const calls = [];
  const result = await renderNarratedVideo({
    input,
    workDirectory,
    execute: async (command) => {
      calls.push(command);
      if (command.args.at(-1).endsWith('.mp4')) await writeFile(command.args.at(-1), 'not-an-mp4-but-a-test-artifact');
      return { code: 0 };
    }
  });
  assert.equal(calls.length, 2);
  assert.equal(result.artifactPath, path.join(workDirectory, 'narrated-video.mp4'));
  assert.match(result.artifactDigest, /^[a-f0-9]{64}$/);
  assert.equal(result.provenance.deterministicScope, 'plan-and-provenance-only');
  for (const command of calls) assert.ok(command.args.some((arg) => arg.includes(workDirectory)));
});

test('a failing executor result with stderr yields a message and datum containing that stderr', async () => {
  const workDirectory = await mkdtemp(path.join(os.tmpdir(), 'offline-video-renderer-refusal-'));
  await assert.rejects(
    renderNarratedVideo({
      input,
      workDirectory,
      execute: async () => ({ code: 1, stdout: '', stderr: 'ffmpeg: Unknown encoder \'libx264-bogus\'' })
    }),
    (error) => {
      assert.match(error.message, /ffmpeg failed with code 1/);
      assert.match(error.message, /Unknown encoder 'libx264-bogus'/);
      assert.deepEqual(error.datum.program, 'ffmpeg');
      assert.equal(error.datum.code, 1);
      assert.match(error.datum.stderrTail, /Unknown encoder 'libx264-bogus'/);
      return true;
    }
  );
});

test('a failing executor result with a stderr tail longer than 4000 characters is capped in the message and datum', async () => {
  const workDirectory = await mkdtemp(path.join(os.tmpdir(), 'offline-video-renderer-refusal-long-'));
  const longStderr = `${'x'.repeat(5000)}tail-marker`;
  await assert.rejects(
    renderNarratedVideo({ input, workDirectory, execute: async () => ({ code: 1, stdout: '', stderr: longStderr }) }),
    (error) => {
      assert.ok(error.datum.stderrTail.length <= 4000);
      assert.match(error.datum.stderrTail, /tail-marker$/);
      assert.match(error.message, /tail-marker/);
      return true;
    }
  );
});

test('a passing executor result carrying stdout/stderr is unchanged: no throw, artifact still produced', async () => {
  const workDirectory = await mkdtemp(path.join(os.tmpdir(), 'offline-video-renderer-passing-'));
  const result = await renderNarratedVideo({
    input,
    workDirectory,
    execute: async (command) => {
      if (command.args.at(-1).endsWith('.mp4')) await writeFile(command.args.at(-1), 'not-an-mp4-but-a-test-artifact');
      return { code: 0, stdout: '', stderr: 'a benign warning that must not be treated as a refusal' };
    }
  });
  assert.match(result.artifactDigest, /^[a-f0-9]{64}$/);
});

test('ffmpeg produces a nonzero MP4 in the explicit job directory', async (context) => {
  if (!(await checkFfmpegAvailable(context))) return;
  const workDirectory = await mkdtemp(path.join(os.tmpdir(), 'offline-video-renderer-smoke-'));
  const result = await renderNarratedVideo({ input, workDirectory, execute: executeProcess });
  assert.equal(path.dirname(result.artifactPath), workDirectory);
  assert.ok((await stat(result.artifactPath)).size > 0);
  const probe = await executeProcess({ program: 'ffprobe', args: ['-v', 'error', '-show_entries', 'format=format_name', '-of', 'default=nw=1', result.artifactPath] });
  assert.equal(probe.code, 0);
});

test('validates segmented input and rejects malformed segments', () => {
  assert.equal(validateNarratedVideoInput(segmentedInput).segments.length, 2);
  assert.throws(() => validateNarratedVideoInput({ ...input, segments: segmentedInput.segments }), /exactly one of body or segments/);
  assert.throws(() => validateNarratedVideoInput({ title: 'x', channelPresentation: input.channelPresentation }), /exactly one of body or segments/);
  assert.throws(() => validateNarratedVideoInput({ ...segmentedInput, segments: [] }), /segments must be a non-empty array/);
  assert.throws(() => validateNarratedVideoInput({ ...segmentedInput, segments: [{ heading: 'h', lines: [] }] }), /segments\[0\]\.narration/);
  assert.throws(() => validateNarratedVideoInput({ ...segmentedInput, narrationAudio: ['/tmp/only-one.wav'] }), /narrationAudio must be an array of length 2/);
  const withProvidedAudio = validateNarratedVideoInput({ ...segmentedInput, narrationAudio: ['/tmp/segment-0.wav', null] });
  assert.deepEqual(withProvidedAudio.narrationAudio, ['/tmp/segment-0.wav', null]);
});

test('segmented render plans and provenance have stable canonical bytes and cover every segment', () => {
  const first = createRenderPlan(segmentedInput);
  const second = createRenderPlan({
    channelPresentation: { width: 1280, height: 720, fontSize: 44, foregroundColor: '&H00FFFFFF', backgroundColor: '0x202020' },
    title: 'A segmented title',
    segments: [
      { narration: 'First segment narration.', heading: 'First heading', lines: ['First supporting line one.', 'First supporting line two.'] },
      { lines: ['Second supporting line.'], heading: 'Second heading', narration: 'Second segment narration.' }
    ]
  });
  assert.equal(first.planBytes, second.planBytes);
  assert.equal(first.planDigest, second.planDigest);
  assert.equal(createProvenance(first).provenanceBytes, createProvenance(second).provenanceBytes);
  assert.notEqual(first.planDigest, createRenderPlan(input).planDigest);
  assert.equal(first.files.segments.length, 2);
  // digest sensitivity: changing one segment's narration must change the plan digest
  const changed = createRenderPlan({ ...segmentedInput, segments: [segmentedInput.segments[0], { ...segmentedInput.segments[1], narration: 'Different narration.' }] });
  assert.notEqual(first.planDigest, changed.planDigest);
});

test('segmented renderer executes flite synthesis only for segments without provided narrationAudio, probes duration, and concatenates', async () => {
  const workDirectory = await mkdtemp(path.join(os.tmpdir(), 'offline-video-renderer-segmented-'));
  const providedAudioPath = path.join(workDirectory, 'external-segment-0.wav');
  await writeFile(providedAudioPath, 'not-a-real-wav-but-a-test-fixture');
  const calls = [];
  const result = await renderNarratedVideo({
    input: { ...segmentedInput, narrationAudio: [providedAudioPath, null] },
    workDirectory,
    execute: async (command) => {
      calls.push(command);
      if (command.program === 'ffprobe') return { code: 0, stdout: '3.500000\n' };
      const output = command.args.at(-1);
      if (output.endsWith('.mp4')) await writeFile(output, 'not-an-mp4-but-a-test-artifact');
      return { code: 0 };
    }
  });

  const synthesizeCalls = calls.filter((call) => call.program === 'ffmpeg' && call.args.some((arg) => arg.includes('flite=')));
  assert.equal(synthesizeCalls.length, 1, 'flite synthesis runs only for the segment without a provided narrationAudio');
  assert.ok(!synthesizeCalls[0].args.some((arg) => arg.includes('segment-000')), 'segment 0 (provided audio) is not synthesized');

  const probeCalls = calls.filter((call) => call.program === 'ffprobe');
  assert.equal(probeCalls.length, 2);
  assert.ok(probeCalls[0].args.at(-1) === providedAudioPath, 'segment 0 is probed at the caller-supplied path');

  const slideCalls = calls.filter((call) => call.program === 'ffmpeg' && call.args.some((arg) => arg.includes('drawtext')));
  assert.equal(slideCalls.length, 2);
  assert.ok(slideCalls[0].args.some((arg) => arg.includes('First heading')));
  assert.ok(slideCalls[0].args.some((arg) => arg.includes('First supporting line one.')));

  const concatCalls = calls.filter((call) => call.args.includes('concat'));
  assert.equal(concatCalls.length, 1);

  const subtitles = await readFile(path.join(workDirectory, 'subtitles.ass'), 'utf8');
  assert.match(subtitles, /First heading/);
  assert.match(subtitles, /Second heading/);
  assert.match(subtitles, /0:00:03\.50/, 'second cue starts after the probed 3.5s duration of segment 0');

  assert.equal(result.artifactPath, path.join(workDirectory, 'narrated-video.mp4'));
  assert.match(result.artifactDigest, /^[a-f0-9]{64}$/);
});

test('segmented ffmpeg smoke: a 2-segment video renders and its duration covers the sum of segment audio', async (context) => {
  if (!(await checkFfmpegAvailable(context))) return;
  const workDirectory = await mkdtemp(path.join(os.tmpdir(), 'offline-video-renderer-segmented-smoke-'));
  const result = await renderNarratedVideo({ input: segmentedInput, workDirectory, execute: executeProcess });
  assert.equal(path.dirname(result.artifactPath), workDirectory);
  assert.ok((await stat(result.artifactPath)).size > 0);

  const durationProbe = async (filePath) => {
    const probe = await executeProcess({ program: 'ffprobe', args: ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', filePath] });
    assert.equal(probe.code, 0);
    return Number.parseFloat(probe.stdout);
  };

  const artifactDuration = await durationProbe(result.artifactPath);
  const segmentAudioDurations = await Promise.all([
    durationProbe(path.join(workDirectory, 'segment-000-narration.wav')),
    durationProbe(path.join(workDirectory, 'segment-001-narration.wav'))
  ]);
  const sumSegmentDurations = segmentAudioDurations.reduce((total, duration) => total + duration, 0);
  assert.ok(artifactDuration >= sumSegmentDurations - 0.5, `artifact duration ${artifactDuration} should cover the sum of segment audio durations ${sumSegmentDurations}`);
});
