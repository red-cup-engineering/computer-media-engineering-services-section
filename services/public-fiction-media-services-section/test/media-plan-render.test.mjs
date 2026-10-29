import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {mediaPlanFromNarrativeEpisode} from '../../../src/media-plan-migrate.mjs';
import {compileMediaPlan} from '../../../src/media-plan-compile.mjs';
import {composeShotSvg,planProceduralPreview} from '../apps/previsualize-microdrama.mjs';
import {renderMediaPlan} from '../apps/render-media-plan.mjs';

const episode=JSON.parse(readFileSync(new URL('./fixtures/services/public-paracosm-media-services-section/services/unassigned-floor-paracosm-services-section/content/production/episode-001.json',import.meta.url),'utf8'));
const sha=x=>createHash('sha256').update(x).digest('hex');
const haveFfmpeg=!spawnSync('ffmpeg',['-version']).error&&!spawnSync('ffprobe',['-version']).error;
const OVERLAY='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 960"><rect x="30" y="140" width="480" height="60" fill="#f0adff"/><text x="50" y="180" font-family="DejaVu Sans" font-size="28" fill="#06121d">SSP5-8.5 is conditional</text></svg>';
// Two real shots of the real episode, plus a deterministic overlay and an end card with the paper link.
const smallPlan=(overlay)=>{
 const plan=mediaPlanFromNarrativeEpisode(episode,{consumer:'unassigned-floor-serial',title:'The Second Exit',
  links:[{rel:'paper',doi:'10.5555/unassigned-floor.test'}],endCard:{seconds:1},
  render:{width:180,outputFps:10,targets:['deterministic']},publication:{requirePaperLink:true}});
 plan.scenes=plan.scenes.slice(0,1);
 plan.scenes[0].shots=plan.scenes[0].shots.slice(0,2);
 if(overlay)plan.scenes[0].shots[0].visual={mode:'deterministic',assets:[{id:'scenario-label',role:'overlay',svg:OVERLAY}]};
 return plan;
};

test('the procedural renderer accepts a compiled media plan source and still refuses anything else',()=>{
 const job=compileMediaPlan(smallPlan(false)).receipt.outputs.deterministic;
 assert.equal(planProceduralPreview(job.input,{width:180,fps:10}).type,'MicrodramaProceduralPreviewPlan');
 const forged=structuredClone(job.input);forged.source.sourceRevision='main';
 assert.throws(()=>planProceduralPreview(forged),/previewable/);
});

test('frame assets replace the scene art and overlays are drawn over it, as embedded self-contained images',()=>{
 const base='<svg xmlns="http://www.w3.org/2000/svg" width="540" height="960" viewBox="0 0 540 960"><rect width="540" height="960"/></svg>';
 assert.equal(composeShotSvg(base,[]),base);
 const withOverlay=composeShotSvg(base,[{role:'overlay',svg:OVERLAY}]);
 assert.ok(withOverlay.startsWith('<svg')&&withOverlay.endsWith('</svg>')&&withOverlay.includes('data:image/svg+xml;base64,'));
 assert.ok(withOverlay.includes('<rect width="540" height="960"/>'));
 const framed=composeShotSvg(base,[{role:'frame',svg:OVERLAY}]);
 assert.ok(!framed.includes('<rect width="540" height="960"/>'));
});

test('the same plan renders to the same frames, geometry, duration and captions the compile receipt promised',t=>{
 assert.ok(haveFfmpeg,'required renderer qualification needs ffmpeg/ffprobe');
 const dir=mkdtempSync(join(tmpdir(),'media-plan-render-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const plain=renderMediaPlan(smallPlan(false),{outDir:join(dir,'plain')});
 assert.equal(plain.ok,true,JSON.stringify(plain.refusals));
 assert.deepEqual(plain.receipt.checks.map(c=>c.ok),plain.receipt.checks.map(()=>true));
 // 2 shots x 6s + 1s end card = 13s at 10fps
 assert.equal(plain.receipt.video.frames,130);
 assert.equal(plain.receipt.video.width,180);assert.equal(plain.receipt.video.height,320);
 const srt=readFileSync(join(dir,'plain','captions.srt'),'utf8');
 assert.ok(srt.includes('LATCH: They\'ve scheduled the room for forgetting.'));
 assert.ok(existsSync(join(dir,'plain','scene-03.png')),'the end card is a rendered scene');
 const receipt=JSON.parse(readFileSync(join(dir,'plain','render-receipt.json'),'utf8'));
 assert.equal(receipt.planId,plain.receipt.planId);
 assert.equal(receipt.previewSha256,sha(readFileSync(join(dir,'plain','preview.mp4'))));
 // The SVG overlay slot changes the rendered pixels and is recorded in the manifest.
 const overlaid=renderMediaPlan(smallPlan(true),{outDir:join(dir,'overlay')});
 assert.equal(overlaid.ok,true,JSON.stringify(overlaid.refusals));
 assert.notEqual(sha(readFileSync(join(dir,'plain','scene-01.png'))),sha(readFileSync(join(dir,'overlay','scene-01.png'))));
 const manifest=JSON.parse(readFileSync(join(dir,'overlay','preview-manifest.json'),'utf8'));
 assert.equal(manifest.mediaPlan.planId,overlaid.receipt.planId);
 assert.ok(manifest.shotAssets.some(a=>a.assetId==='scenario-label'&&a.role==='overlay'));
 // Existing output is never overwritten.
 assert.throws(()=>renderMediaPlan(smallPlan(false),{outDir:join(dir,'plain')}),/refusing to overwrite/);
});

test('refusals from the plan contract stop the render before anything is written',()=>{
 const dir=mkdtempSync(join(tmpdir(),'media-plan-render-'));
 try{
  const bad=smallPlan(false);bad.scenes[0].shots[0].dialogue[0].speakerId='unseen';
  const out=renderMediaPlan(bad,{outDir:join(dir,'x')});
  assert.equal(out.ok,false);assert.equal(out.refusals[0].code,'SPEAKER_NOT_IN_CAST');
  assert.equal(existsSync(join(dir,'x')),false);
  const none=smallPlan(false);none.audio={music:{profile:'none'}};
  assert.equal(renderMediaPlan(none,{outDir:join(dir,'y')}).refusals[0].code,'RENDERER_UNSUPPORTED');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
