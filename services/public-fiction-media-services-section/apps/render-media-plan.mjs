#!/usr/bin/env node
/**
 * Public Fiction: the deterministic consumer of the shared media plan.
 *
 *   plan --(computer-media compileMediaPlan, target deterministic: precondition + receipt)--> render job
 *        --(previsualize-microdrama renderProceduralPreview: the procedural renderer)--> preview.mp4 ...
 *        --(this module: ffprobe postconditions)--> render-receipt.json
 *
 * Hoare contract `render-media-plan/1`
 *   requires  the plan compiles for the deterministic target (else coded refusals, nothing is written);
 *             the output directory holds no preview; the renderer can honour the job
 *             (ffmpeg with libx264/librsvg/libass present; no music:none, no voice:rehearsal without espeak).
 *   ensures   preview.mp4, captions.srt, scene PNG/SVG masters, preview-manifest.json and a
 *             render-receipt.json naming the plan by content address, the compile receipt's
 *             output address and the preview's SHA-256; the video has exactly the job's frame
 *             count, geometry and duration; every compiled caption cue is in captions.srt.
 *   effects   writes only inside outDir; no network, no provider, no publication.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { compileMediaPlan } from '@red-cup-engineering/computer-media-engineering-services-section/plan/compile';
import { preflightProceduralPreview, renderProceduralPreview } from './previsualize-microdrama.mjs';

export const RENDER_CONTRACT_ID = 'render-media-plan/1';
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const refusal = (code, path, message) => Object.freeze({ code, path, message });

function probe(file) {
  const p = spawnSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,nb_read_frames,duration', '-of', 'json', file], { encoding: 'utf8', timeout: 60000 });
  if (p.error || p.status !== 0) throw new Error(`ffprobe failed: ${p.stderr || p.error}`);
  const s = JSON.parse(p.stdout).streams[0];
  const a = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=codec_name', '-of', 'json', file], { encoding: 'utf8', timeout: 60000 });
  return { width: s.width, height: s.height, frames: Number(s.nb_read_frames), seconds: Number(s.duration), audio: JSON.parse(a.stdout || '{"streams":[]}').streams.length > 0 };
}

/** Render one media plan deterministically into outDir. Answers {ok:true, receipt} or {ok:false, refusals}. */
export function renderMediaPlan(planInput, { outDir } = {}) {
  const compiled = compileMediaPlan(planInput, { targets: ['deterministic'] });
  if (!compiled.ok) return Object.freeze({ ok: false, refusals: compiled.refusals });
  const { receipt: compileReceipt } = compiled;
  const job = compileReceipt.outputs.deterministic;
  const unsupported = [];
  try { preflightProceduralPreview(job.input, job.options); }
  catch (error) { unsupported.push(refusal('RENDERER_UNSUPPORTED', 'deterministic', error.message)); }
  if (job.options.music === 'none') unsupported.unshift(refusal('RENDERER_UNSUPPORTED', 'audio.music.profile', 'the procedural renderer always lays a score; music none is not yet honoured'));
  if (job.options.voice === 'rehearsal' && spawnSync('espeak', ['--version']).error) unsupported.push(refusal('RENDERER_UNSUPPORTED', 'audio.dialogue.voice', 'rehearsal voice needs espeak on PATH'));
  for (const tool of ['ffmpeg', 'ffprobe']) if (spawnSync(tool, ['-version']).error) unsupported.push(refusal('RENDERER_UNSUPPORTED', tool, `${tool} is not on PATH`));
  if (unsupported.length) return Object.freeze({ ok: false, refusals: Object.freeze(unsupported) });
  const destination = resolve(outDir ?? '');
  if (!outDir) return Object.freeze({ ok: false, refusals: Object.freeze([refusal('OUTDIR_REQUIRED', 'outDir', 'an output directory is required')]) });

  const summary = renderProceduralPreview(job.input, {
    outDir: destination, width: job.options.width, fps: job.options.fps, style: job.options.style, motion: job.options.motion, voice: job.options.voice, music: job.options.music,
    sourceBytes: Buffer.from(JSON.stringify(job.input)),
    captions: { srt: job.captions.srt, burnedIn: job.captions.burnedIn },
    assets: job.assets,
    provenance: { planId: compileReceipt.planId, compileOutputId: compileReceipt.outputId, contract: RENDER_CONTRACT_ID },
  });

  const measured = probe(join(destination, 'preview.mp4'));
  const frames = Math.round((job.totalFrames * job.options.fps) / job.input.episode.fps);
  const srt = readFileSync(join(destination, 'captions.srt'), 'utf8');
  const checks = [
    { name: 'frame-count-equals-job', ok: measured.frames === frames },
    { name: 'geometry-equals-job', ok: measured.width === job.options.width && measured.height === (job.options.width * 16) / 9 },
    { name: 'duration-equals-job', ok: Math.abs(measured.seconds - job.totalSeconds) < 0.25 },
    { name: 'has-audio-track', ok: measured.audio },
    { name: 'every-caption-cue-written', ok: srt === job.captions.srt },
    { name: 'music-profile-equals-job', ok: summary.editableAssets.soundtrack.profile === job.options.music },
    { name: 'preview-hash-in-manifest', ok: summary.previewSha256 === sha(readFileSync(join(destination, 'preview.mp4'))) },
  ];
  const receipt = Object.freeze({
    type: 'MediaPlanRenderReceipt', version: 1, contract: RENDER_CONTRACT_ID, effects: 'writes-only-inside-outDir',
    planId: compileReceipt.planId, compileOutputId: compileReceipt.outputId,
    previewSha256: summary.previewSha256, captionsSha256: sha(srt),
    video: Object.freeze({ ...measured, expectedFrames: frames }),
    toolchain: summary.toolchain, checks: Object.freeze(checks),
  });
  mkdirSync(destination, { recursive: true });
  writeFileSync(join(destination, 'render-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);
  if (checks.some((c) => !c.ok)) return Object.freeze({ ok: false, refusals: Object.freeze([refusal('POSTCONDITION_FAILED', outDir, `render postconditions failed: ${checks.filter((c) => !c.ok).map((c) => c.name).join(', ')}`)]), receipt });
  return Object.freeze({ ok: true, receipt, summary });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [planFile, outDir, ...rest] = process.argv.slice(2);
    if (!planFile || !outDir || rest.length) throw new TypeError('usage: render-media-plan.mjs PLAN.json OUT-DIR');
    const out = renderMediaPlan(JSON.parse(readFileSync(resolve(planFile), 'utf8')), { outDir });
    process.stdout.write(`${JSON.stringify(out.ok ? out.receipt : out, null, 2)}\n`);
    process.exitCode = out.ok ? 0 : 2;
  } catch (error) {
    process.stderr.write(`${error?.stack ?? error}\n`);
    process.exitCode = 1;
  }
}
