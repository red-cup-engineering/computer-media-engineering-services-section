import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {developmentEpisodeFromScreenplay} from '../apps/derive-development-screenplay.mjs';
import {planProceduralPreview,sceneSvg,renderProceduralPreview} from '../apps/previsualize-microdrama.mjs';
import {sceneSvgAbyssal,sceneSvgAbyssalActorLayer,sceneSvgAbyssalAnimated} from '../src/abyssal-stage.mjs';
import {composeSourceScore,scoreMidi,scoreWav} from '../src/kinetic-score.mjs';

const manuscript=new URL('./fixtures/services/public-paracosm-media-services-section/services/unassigned-floor-paracosm-services-section/content/development/solos/i-woke-up-as-three-shrimp-episode-zero.md',import.meta.url);

test('one source-owned screenplay compiles into a genuinely new 96-second shared-561-world table read',async()=>{
 const text=await readFile(manuscript,'utf8');
 assert.match(text,/same paracosm|shared-world television paracosm/u);
 assert.match(text,/glass-sponge temples/u);
 assert.match(text,/NOT canon/u);
 const src=developmentEpisodeFromScreenplay(text,{originRef:'source-owned:three-shrimp-screenplay'});
 assert.equal(src.developmentState,'unapproved-text-audition');
 assert.equal(src.episode.shots.length,8);
 assert.equal(src.episode.shots.reduce((sum,s)=>sum+s.frames,0),2880);
 assert.deepEqual(src.episode.shots.map(s=>s.frames),Array(8).fill(360));
 assert.deepEqual(src.episode.shots[0].characterIds,['rill','kip']);
 assert.ok(src.episode.shots[7].characterIds.includes('fourth-rill'));
 const plan=planProceduralPreview(src,{width:360,fps:18,style:'abyssal-glass'});
 assert.equal(plan.totalSeconds,96);
 assert.equal(plan.visualStyle,'abyssal-glass');
 assert.equal(plan.shots.length,8);
 assert.equal(plan.status,'DEVELOPMENT_ONLY_NOT_APPROVED');
 assert.match(plan.limitations,/no synthetic speech/u);
 assert.throws(()=>planProceduralPreview(src,{style:'glowing-fish'}),/unsupported visual style/);
 const normal=planProceduralPreview(src);
 assert.equal(normal.visualStyle,'abstract','existing previews remain unchanged by default');
});

test('each major stage image follows a real authored action instead of repeating one aquatic template',async()=>{
 const src=developmentEpisodeFromScreenplay(await readFile(manuscript,'utf8'));
 const scenes=src.episode.shots.map((shot,i)=>sceneSvgAbyssal(shot,i,8,src.source.id));
 assert.match(scenes[1],/ABYSSAL \/ CURRENT/u);
 assert.match(scenes[2],/MIAOTANG \/ MEMBRANE/u);
 assert.match(scenes[3],/GLASS-SPONGE \/ MEMORY/u);
 assert.match(scenes[4],/FOAM \/ CONTRADICTION/u);
 assert.match(scenes[6],/ONE BORROWED CURRENT/u);
 assert.match(scenes[7],/JIANGHU \/ WATER GATE/u);
 for(let i=1;i<scenes.length;i++)assert.notEqual(scenes[i-1],scenes[i]);
 assert.match(scenes[0],/translate\(370 465\)/u,'Kip is staged as an independently legible amphipod body');
 assert.match(scenes[2],/stroke="#b3fff6"/u,'the authored membrane appears in the corresponding scene');
 assert.match(scenes[4],/opacity="\.27"/u,'contradictory witness silhouettes appear only in their scene');
});
test('abyssal staging is deterministic, source-derived, and visually different from abstract rehearsal',async()=>{
 const src=developmentEpisodeFromScreenplay(await readFile(manuscript,'utf8'));
 const shot=src.episode.shots[0];
 const first=sceneSvgAbyssal(shot,0,8,src.source.id);
 const again=sceneSvgAbyssal({...shot},0,8,src.source.id);
 assert.equal(first,again,'repeat same material yields the same pixels source');
 assert.match(first,/561 \/ ABYSSAL CURRENT/u);
 assert.match(first,/I WOKE UP AS THREE SHRIMP/u);
 assert.match(first,/UNAPPROVED \/ SHARED 561 PARACOSM \/ PREVIS/u);
 assert.match(first,/ellipse cx="32" cy="-34"/u,'shrimp has recognizable face');
 assert.match(first,/SEA \/ SEDIMENT/u,'staging reads the authored scene rather than inventing a random hall');
 assert.notEqual(first,sceneSvg(shot,0,8,src.source.id));
 assert.doesNotMatch(first,/I remember being the door/u,'no unearned plot spoilers hidden in stage image');
 const last=sceneSvgAbyssal(src.episode.shots[7],7,8,src.source.id);
 assert.match(last,/THE ONE LEFT BEHIND/u);
 assert.match(last,/JIANGHU \/ WATER GATE/u,'final location comes from the actual screenplay');
 assert.notEqual(first,last);
});

test('separate shrimp sprites are derived from existing cast and cannot create extra fictional actors',async()=>{
 const src=developmentEpisodeFromScreenplay(await readFile(manuscript,'utf8'));
 const shot=src.episode.shots[0];
 const full=sceneSvgAbyssal(shot,0,8,src.source.id);
 const background=sceneSvgAbyssal(shot,0,8,src.source.id,{hideActors:true});
 const rill=sceneSvgAbyssalActorLayer(shot,'rill'),kip=sceneSvgAbyssalActorLayer(shot,'kip');
 assert.match(full,/translate\(173 465\)/u);
 assert.doesNotMatch(background,/translate\(173 465\)|translate\(370 465\)/u);
 assert.match(background,/561 \/ ABYSSAL CURRENT/u);
 assert.match(rill,/translate\(173 465\)/u);
 assert.match(kip,/translate\(370 465\)/u);
 assert.doesNotMatch(rill,/561 \/ ABYSSAL CURRENT/u);
 assert.doesNotMatch(kip,/translate\(173 465\)/u);
 assert.notEqual(rill,kip);
 assert.equal(sceneSvgAbyssalActorLayer(shot,'rill'),rill);
 assert.throws(()=>sceneSvgAbyssalActorLayer(shot,'not-in-cast'),/source-observed staged character/u);
});

test('real source-timed kinetic animation renders an independently moving, still-unapproved actor performance',async()=>{
 const raw=await readFile(manuscript,'utf8');
 const src=developmentEpisodeFromScreenplay(raw);
 const dir=mkdtempSync(join(tmpdir(),'test-shrimp-motion-'));
 try{
  const output=join(dir,'film');
  const movie=renderProceduralPreview(src,{outDir:output,scene:'01-three-left-claws',width:180,fps:18,style:'abyssal-glass',motion:'character-bob',sourceBytes:Buffer.from(raw)});
  assert.equal(movie.status,undefined);
  assert.equal(movie.state,'DEVELOPMENT_ONLY_NOT_APPROVED');
  assert.equal(movie.motionProfile,'character-bob');
  assert.equal(movie.seconds,12);
  assert.equal(movie.performance.profile,'NONVERBAL_TONE_ONLY');
  assert.equal(createHash('sha256').update(readFileSync(join(output,'preview.mp4'))).digest('hex'),movie.previewSha256);
  const a=join(dir,'a.png'),b=join(dir,'b.png');
  for(const [at,dest] of [[1,a],[3,b]]){
   const p=spawnSync('ffmpeg',['-v','error','-y','-ss',String(at),'-i',join(output,'preview.mp4'),'-frames:v','1',dest],{encoding:'utf8',timeout:30000});
   assert.equal(p.status,0,p.stderr);
  }
  assert.notEqual(createHash('sha256').update(readFileSync(a)).digest('hex'),createHash('sha256').update(readFileSync(b)).digest('hex'));
  assert.throws(()=>renderProceduralPreview(src,{outDir:join(dir,'wrong'),motion:'character-bob',style:'abstract'}),/requires abyssal-glass/u);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('source-owned editable SVG animation and three-voice Standard MIDI share one shot clock',async()=>{
 const src=developmentEpisodeFromScreenplay(await readFile(manuscript,'utf8'));
 const shot=src.episode.shots[0];
 const svg=sceneSvgAbyssalAnimated(shot,0,8,src.source.id,{sourceFps:30});
 assert.equal(svg,sceneSvgAbyssalAnimated(shot,0,8,src.source.id,{sourceFps:30}));
 assert.match(svg,/data-format="561-source-timed-smil"/u);
 assert.match(svg,/data-shot-duration-seconds="12"/u);
 assert.match(svg,/id="fictive-actor-rill"/u);
 assert.match(svg,/id="fictive-actor-kip"/u);
 assert.match(svg,/data-layer="independent-sediment"/u);
 assert.match(svg,/<animateTransform /u);
 assert.match(svg,/data-performance="source-timed-speech"/u);
 assert.match(svg,/<set attributeName="opacity" /u);
 assert.doesNotMatch(svg,/<script|xlink:href=/u,'animated master carries no active script or network asset');
 assert.notEqual(sceneSvgAbyssalActorLayer(shot,'rill',{pose:'speaking'}),sceneSvgAbyssalActorLayer(shot,'rill'));
 const score=composeSourceScore(src.episode.shots,30);
 assert.equal(score.frameCount,2880);
 assert.equal(score.markers.length,8);
 assert.ok(score.notes.length>160);
 assert.ok(score.notes.some(n=>n.track===2),'dialogue must cause exact-source chimes');
 const midi=scoreMidi(score),wav=scoreWav(score);
 assert.equal(midi.toString('ascii',0,4),'MThd');
 assert.equal(midi.readUInt16BE(8),1,'editable type 1 MIDI');
 assert.equal(midi.readUInt16BE(10),4,'conductor and three instruments');
 assert.equal(midi.readUInt16BE(12),480);
 assert.equal(wav.toString('ascii',0,4),'RIFF');
 assert.equal(wav.readUInt32LE(24),24000);
 assert.equal(wav.length,44+96*24000*2);
 assert.deepEqual(midi,scoreMidi(composeSourceScore(src.episode.shots,30)));
 assert.deepEqual(wav,scoreWav(composeSourceScore(src.episode.shots,30)));
});

test('the kinetic-rig produces an actual film plus durable native-vector and editable score masters',async()=>{
 const raw=await readFile(manuscript,'utf8'),src=developmentEpisodeFromScreenplay(raw);
 const dir=mkdtempSync(join(tmpdir(),'kinetic-rig-'));
 try{
  const out=join(dir,'out');
  const film=renderProceduralPreview(src,{outDir:out,scene:'01-three-left-claws',
   width:180,fps:18,style:'abyssal-glass',motion:'kinetic-rig',sourceBytes:Buffer.from(raw)});
  assert.equal(film.motionProfile,'kinetic-rig');
  assert.equal(film.seconds,12);
  assert.equal(film.editableAssets.vectorMasters.length,4);
  for(const asset of film.editableAssets.vectorMasters){
   const bytes=readFileSync(join(out,asset.file));
   assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);
  }
  assert.match(readFileSync(join(out,'animated-scene-01.svg'),'utf8'),/animateTransform/u);
  assert.equal(readFileSync(join(out,'score.mid')).toString('ascii',0,4),'MThd');
  assert.equal(readFileSync(join(out,'score.wav')).toString('ascii',0,4),'RIFF');
  assert.equal(film.editableAssets.soundtrack.shotMotifs.length,1);
  assert.equal(film.editableAssets.soundtrack.midiSha256,
   createHash('sha256').update(readFileSync(join(out,'score.mid'))).digest('hex'));
  const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_type','-of','json',join(out,'preview.mp4')],{encoding:'utf8',timeout:30000});
  assert.equal(probe.status,0,probe.stderr);
  const streams=JSON.parse(probe.stdout);
  assert.ok(streams.streams.some(v=>v.codec_type==='video'));
  assert.ok(streams.streams.some(v=>v.codec_type==='audio'));
 }finally{rmSync(dir,{recursive:true,force:true})}
});
