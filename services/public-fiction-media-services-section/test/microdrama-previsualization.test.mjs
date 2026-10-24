import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {
 planProceduralPreview,sceneSvg,renderProceduralPreview,
} from '../apps/previsualize-microdrama.mjs';

const sourceUrl=new URL('./fixtures/services/public-paracosm-media-services-section/services/unassigned-floor-paracosm-services-section/content/production/episode-001.json',import.meta.url);
const sourceBytes=readFileSync(sourceUrl);
const source=JSON.parse(sourceBytes);
const sha=x=>createHash('sha256').update(x).digest('hex');

test('source-owned preview planning conserves 48s timing, cast and source revision',()=>{
 const plan=planProceduralPreview(source);
 assert.equal(plan.type,'MicrodramaProceduralPreviewPlan');
 assert.equal(plan.status,'DEVELOPMENT_ONLY_NOT_APPROVED');
 assert.equal(plan.totalSeconds,48);
 assert.equal(plan.width,360);
 assert.equal(plan.height,640);
 assert.equal(plan.shots.length,8);
 assert.equal(plan.shots.reduce((n,shot)=>n+shot.previewFrames,0),864);
 assert.equal(plan.shots[0].id,'corridor-sweep');
 assert.equal(plan.shots.at(-1).id,'other-latch');
 assert.match(plan.limitations,/no synthetic speech/i);
 const svg=sceneSvg(plan.shots[0],0,plan.shots.length,plan.sourceWork);
 assert.ok(svg.includes('UNASSIGNED FLOOR'));
 assert.ok(svg.includes('corridor-sweep'.replaceAll('-',' ').toUpperCase()));
 assert.ok(svg.includes('latch')===false,'creative glyph should not be character prose');
 assert.ok(svg.startsWith('<svg'));
});

test('unknown new fictional character and new dramatic beat are staged deterministically, without a new hand-authored cast registry',()=>{
 const alt=structuredClone(source);
 alt.episode.shots=alt.episode.shots.slice(0,1);
 alt.episode.shots[0].beatId='bond-reversal';
 alt.episode.shots[0].characterIds=['glint'];
 alt.episode.shots[0].dialogue[0].speakerId='glint';
 const a=planProceduralPreview(alt,{scene:'corridor-sweep',width:180,fps:10});
 const svgA=sceneSvg(a.shots[0],0,1,a.sourceWork);
 const svgB=sceneSvg(a.shots[0],0,1,a.sourceWork);
 assert.equal(svgA,svgB);
 assert.match(svgA,/bond-reversal/i);
 assert.match(svgA,/hsl\(/);
});

test('development-only preview refuses unsafe geometry, missing speaker and lost timing',()=>{
 assert.throws(()=>planProceduralPreview(source,{width:281}),/multiple of 18/);
 assert.throws(()=>planProceduralPreview(source,{scene:'never-written'}),/unknown selected scene/);
 const wrong=structuredClone(source);
 wrong.episode.shots[0].dialogue[0].speakerId='unseen';
 assert.throws(()=>planProceduralPreview(wrong),/missing from staged cast/);
 const timing=structuredClone(source);
 timing.episode.shots[0].frames=181;
 assert.throws(()=>planProceduralPreview(timing,{fps:10}),/without drift/);
});

test('a real MP4 audition clip is built twice identically, retaining original captions and source identity',()=>{
 const root=mkdtempSync(join(tmpdir(),'microdrama-previsualization-'));
 try{
  const build=out=>renderProceduralPreview(source,{
   outDir:join(root,out),sourceBytes,width:180,fps:10,scene:'else-answers'
  });
  const first=build('first');
  const second=build('second');
  assert.equal(first.kind,'MicrodramaProceduralPreview');
  assert.equal(first.state,'DEVELOPMENT_ONLY_NOT_APPROVED');
  assert.equal(first.seconds,6);
  assert.equal(first.frames,60);
  assert.equal(first.sourceSha256,sha(sourceBytes));
  assert.match(first.toolchain.ffmpeg,/^ffmpeg version /);
  assert.match(first.toolchain.node,/^v[0-9]+/);
  assert.match(first.toolchain.rendererSha256,/^[a-f0-9]{64}$/);
  assert.equal(first.toolchain.font.family,'DejaVu Sans');
  assert.match(first.toolchain.reproducibilityPolicy,/cpuflags=0/);
  assert.match(first.toolchain.reproducibilityPolicy,/asm=0/);
  assert.equal(first.previewSha256,second.previewSha256);
  assert.equal(sha(readFileSync(join(root,'first','preview.mp4'))),first.previewSha256);
  assert.ok(existsSync(join(root,'first','contact-sheet.png')));
  assert.ok(existsSync(join(root,'first','scene-01.png')));
  const captions=readFileSync(join(root,'first','captions.srt'),'utf8');
  assert.match(captions,/ELSE: I'm still composing my answer/);
  assert.match(captions,/00:00:00,500 --> 00:00:05,167/);
  const streams=JSON.parse(execFileSync('ffprobe',[
   '-v','error','-show_entries','format=duration:stream=codec_type,width,height,r_frame_rate','-of','json',
   join(root,'first','preview.mp4')
  ],{encoding:'utf8'}));
  assert.ok(Math.abs(Number(streams.format.duration)-6)<.1);
  assert.ok(streams.streams.some(x=>x.codec_type==='audio'));
  assert.ok(streams.streams.some(x=>x.codec_type==='video'&&x.width===180&&x.height===320));
  assert.throws(()=>build('first'),/refusing to overwrite/);
 } finally {rmSync(root,{recursive:true,force:true})}
});
