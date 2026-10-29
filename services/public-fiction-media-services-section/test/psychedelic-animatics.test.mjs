import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';

import {developmentEpisodeFromScreenplay} from '../apps/derive-development-screenplay.mjs';
import {renderProceduralPreview,planProceduralPreview} from '../apps/previsualize-microdrama.mjs';
import {sceneSvgAbyssal,sceneSvgAbyssalAnimated,sceneSvgAbyssalOpticalLayer} from '../src/abyssal-stage.mjs';
import {psychedelicSignature,opticalElements,psychedelicSvgLayer} from '../src/psychedelic-optics.mjs';
import {composeSourceScore,scoreMidi,scoreWav} from '../src/kinetic-score.mjs';

const manuscript=new URL('./fixtures/services/public-paracosm-media-services-section/services/unassigned-floor-paracosm-services-section/content/development/solos/i-woke-up-as-three-shrimp-episode-zero.md',import.meta.url);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const source=()=>developmentEpisodeFromScreenplay(readFileSync(manuscript,'utf8'));

test('mathematical optical signature is source-bounded, shared, and independent of mutable execution state',()=>{
 const a=source().episode.shots[0],sig=psychedelicSignature(a);
 const again=psychedelicSignature(structuredClone(a));
 assert.deepEqual(sig,again);
 assert.equal(sig.version,1);
 assert.equal(sig.kind,'SourceOptophoneticSignature');
 assert.ok(sig.intensity>=.44&&sig.intensity<=.84);
 assert.ok(sig.slowPeriodsSeconds.every(s=>s>=11),'animations do not depend on flashing');
 assert.ok(sig.frequencies.every(n=>[5,7,11,13,17,19].includes(n)));
 assert.notEqual(sig.frequencies[0],sig.frequencies[1],'source-selected prime harmonics must be coprime');
 assert.notDeepEqual(sig,psychedelicSignature({...a,id:'another-shot'}));
 assert.notDeepEqual(sig,psychedelicSignature({...a,beatId:'contradiction'}));
 assert.match(sig.sourceDigest,/^sha256:[a-f0-9]{64}$/u);
 assert.notDeepEqual(sig,psychedelicSignature({...a,action:a.action+' [different expressive material]'}));
 assert.equal(psychedelicSignature({...a,action:'The incompatible witnesses contradict each other.'}).mode,'contradiction');
 assert.notDeepEqual(sig,psychedelicSignature({...a,dialogue:a.dialogue.map((d,i)=>i?d:{...d,text:d.text+' changed'})}));
 assert.throws(()=>psychedelicSignature({...a,id:'<script>'}),/source slug/);
 assert.throws(()=>psychedelicSignature({...a,dialogue:new Array(200).fill({})}),/source dialogue/);
 assert.equal(sig.shotId,a.id);
});

test('the novel source-owned visual system exports explicit interferences, slow SMIL, and editor-safe closed SVG',()=>{
 const src=source(),shot=src.episode.shots[0];
 const still=sceneSvgAbyssal(shot,0,src.episode.shots.length,src.source.id,{psychedelic:true});
 const animated=sceneSvgAbyssalAnimated(shot,0,src.episode.shots.length,src.source.id,{psychedelic:true,sourceFps:30});
 const optical=sceneSvgAbyssalOpticalLayer(shot,{animated:true});
 assert.match(still,/data-layer="optophonetic-fold"/u);
 assert.match(still,/data-interference="coprime-rosette"/u);
 assert.match(still,/data-interference="lissajous-fold"/u);
 assert.match(still,/data-optical-grammar="polyrhythmic-prism"/u);
 assert.match(still,/data-pulse-division="[57]"/u);
 assert.match(still,/data-source-digest="sha256:[a-f0-9]{64}"/u);
 assert.match(still,/data-frequencies="[0-9]+,[0-9]+"/u);
 assert.match(animated,/data-optophonetic-version="1"/u);
 assert.match(animated,/data-layer="independent-sediment"/u);
 assert.match(animated,/<animateTransform /u);
 assert.match(optical,/id="optic-halo-standalone"/u);
 assert.match(optical,/animateTransform/u);
 assert.doesNotMatch(optical,/<script|xlink:href=|<foreignObject/u,'fully original vector with no executable payload');
 assert.notEqual(still,sceneSvgAbyssal(shot,0,src.episode.shots.length,src.source.id));
 assert.equal(optical,psychedelicSvgLayer(shot,{animated:true}));
 assert.deepEqual([...animated.matchAll(/id="optic-halo-([^"]+)"/gu)].map(x=>x[1]).sort(),['base','motion']);
 assert.match(still,/translate\(173 465\)/u,'original character stage identity retained');
 assert.throws(()=>sceneSvgAbyssal(shot,0,8,src.source.id,{psychedelic:'true'}),/boolean/);
 assert.equal(opticalElements(shot),opticalElements(shot),'same input, same geometry');
});

test('psychedelic audio has mathematically paired optophonetic markers, polymetric note subdivisions and editable MIDI automation',()=>{
 const shots=source().episode.shots.slice(0,2);
 const psycho=composeSourceScore(shots,30,{profile:'psychedelic'});
 const ordinary=composeSourceScore(shots,30);
 assert.equal(psycho.profile,'psychedelic');
 assert.equal(psycho.optophoneticVersion,1);
 assert.equal(psycho.frameCount,ordinary.frameCount);
 assert.equal(psycho.markers.length,shots.length);
 assert.deepEqual(psycho.markers[0].optophonetic,psychedelicSignature(shots[0]));
 assert.ok(psycho.notes.length>ordinary.notes.length,'optophonetic articulations increase temporal complexity');
 assert.ok(psycho.notes.every(n=>n.frame>=0&&n.frame+n.duration<=psycho.frameCount));
 assert.ok(psycho.notes.some(n=>n.source.includes(':word-')),'wave articulation traces actual screenplay words');
 assert.notDeepEqual(psycho,ordinary);
 const midi=scoreMidi(psycho),wav=scoreWav(psycho);
 assert.equal(midi.toString('ascii',0,4),'MThd');
 assert.equal(midi.readUInt16BE(8),1);
 assert.equal(midi.readUInt16BE(10),4);
 assert.ok(midi.includes(Buffer.from([0xb0,74])),'standard controller 74 exports timbral source control');
 assert.ok(midi.includes(Buffer.from([0xe0])),'MIDI bend source control');
 assert.equal(wav.toString('ascii',0,4),'RIFF');
 assert.equal(wav.readUInt32LE(24),24000);
 assert.equal(wav.length,44+24*24000*2);
 assert.ok(wav.subarray(44).some(v=>v!==0));
 assert.notEqual(sha(wav),sha(scoreWav(ordinary)));
 assert.equal(sha(wav),sha(scoreWav(composeSourceScore(shots,30,{profile:'psychedelic'}))));
 assert.equal(sha(midi),sha(scoreMidi(composeSourceScore(shots,30,{profile:'psychedelic'}))));
 assert.throws(()=>composeSourceScore(shots,30,{profile:'surrealism'}),/unknown sound design/);
});

test('12-second optophonetic-film audition retains exact-source SVG masters, audible score and moving video',()=>{
 const src=source(),dir=mkdtempSync(join(tmpdir(),'optophonetic-video-'));
 try{
  const out=join(dir,'film');
  assert.equal(planProceduralPreview(src,{style:'abyssal-psychedelic'}).visualStyle,'abyssal-psychedelic');
  const film=renderProceduralPreview(src,{outDir:out,scene:'01-three-left-claws',
   style:'abyssal-psychedelic',motion:'kinetic-rig',width:180,fps:18});
  assert.equal(film.state,'DEVELOPMENT_ONLY_NOT_APPROVED');
  assert.equal(film.seconds,12);
  assert.equal(film.frames,216);
  assert.equal(film.visualStyle,'abyssal-psychedelic');
  assert.equal(film.motionProfile,'kinetic-rig');
  assert.equal(film.editableAssets.vectorMasters.length,5);
  assert.equal(film.editableAssets.soundtrack.profile,'psychedelic');
  assert.equal(film.editableAssets.soundtrack.optophoneticVersion,1);
  assert.deepEqual(film.editableAssets.soundtrack.shotMotifs[0].optophonetic,
   psychedelicSignature(src.episode.shots[0]));
  for(const asset of film.editableAssets.vectorMasters)
   assert.equal(sha(readFileSync(join(out,asset.file))),asset.sha256);
  const optical=readFileSync(join(out,'optophonetic-01.svg'),'utf8');
  assert.match(optical,/animateTransform/u);
  assert.match(readFileSync(join(out,'animated-scene-01.svg'),'utf8'),/optophonetic-fold/u);
  assert.equal(readFileSync(join(out,'score.mid')).toString('ascii',0,4),'MThd');
  assert.equal(readFileSync(join(out,'score.wav')).toString('ascii',0,4),'RIFF');
  const movie=join(out,'preview.mp4');
  assert.equal(sha(readFileSync(movie)),film.previewSha256);
  const p=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_type,width,height','-of','json',movie],{encoding:'utf8',timeout:30000});
  assert.equal(p.status,0,p.stderr);
  const streams=JSON.parse(p.stdout);
  assert.ok(streams.streams.some(x=>x.codec_type==='audio'));
  assert.ok(streams.streams.some(x=>x.codec_type==='video'&&x.width===180&&x.height===320));
  assert.ok(Math.abs(Number(streams.format.duration)-12)<.1);
  // The actual encoded frames must differ, not merely the SVG source strings.
  const sample=[];
  for(const [n,second] of [1,4].entries()){
   const file=join(dir,'actual-frame-'+n+'.png');
   const grab=spawnSync('ffmpeg',['-nostdin','-y','-v','error','-ss',String(second),'-i',movie,'-frames:v','1',file],
    {encoding:'utf8',timeout:30000});
   assert.equal(grab.status,0,grab.stderr);
   sample.push(sha(readFileSync(file)));
  }
  assert.notEqual(sample[0],sample[1],'source-derived optical video must truly move');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
