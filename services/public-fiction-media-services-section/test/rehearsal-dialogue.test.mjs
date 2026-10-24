import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {planRehearsalDialogue,decodeMonoPcm16,encodeMonoPcm16,synthesizeRehearsalDialogue} from '../src/rehearsal-dialogue.mjs';
import {developmentEpisodeFromScreenplay} from '../apps/derive-development-screenplay.mjs';
import {renderProceduralPreview} from '../apps/previsualize-microdrama.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const shots=[{frames:120,dialogue:[
 {speakerId:'rill',text:'Who gave me three left claws?',startFrame:5,endFrame:53},
 {speakerId:'kip',text:'Someone who loves the number three.',startFrame:64,endFrame:115}
]}];
const fixture=new URL('./fixtures/services/public-paracosm-media-services-section/services/unassigned-floor-paracosm-services-section/content/development/solos/i-woke-up-as-three-shrimp-episode-zero.md',import.meta.url);

test('rehearsal events come from actual source slots and per-character identity',()=>{
 const cues=planRehearsalDialogue(shots,30,4);
 assert.equal(cues.length,2);
 assert.equal(cues[0].startMs,500/3);
 assert.equal(cues[0].text,shots[0].dialogue[0].text);
 assert.notEqual(cues[0].espeakPitch,cues[1].espeakPitch);
 assert.throws(()=>planRehearsalDialogue(shots,30,5),/timeline duration mismatch/);
 assert.throws(()=>planRehearsalDialogue([{frames:120,dialogue:[{...shots[0].dialogue[0],speakerId:'rill;rm -rf /'}]}],30,4),/speaker must be a slug/);
});

test('rehearsal WAV codec validates actual PCM format and truncation',()=>{
 assert.throws(()=>decodeMonoPcm16(Buffer.from('not-a-wav')),/WAV/);
 const own=encodeMonoPcm16(new Float64Array([0,1200,-1200,0]));
 assert.equal(decodeMonoPcm16(own).rate,24000);
 assert.equal(decodeMonoPcm16(own).samples.length,8);
 assert.throws(()=>decodeMonoPcm16(own.subarray(0,own.length-2)),/truncated/);
});

test('installed eSpeak has source-bound stable non-silent 24kHz rehearsal output',()=>{
 const a=synthesizeRehearsalDialogue(shots,30,4),b=synthesizeRehearsalDialogue(shots,30,4);
 assert.equal(a.sha256,b.sha256);
 assert.equal(a.cues.length,2);
 assert.equal(a.wav.length,44+4*24000*2);
 assert.equal(sha(a.wav),a.sha256);
 assert.ok(a.wav.subarray(44).some(byte=>byte!==0));
 assert.ok(a.cues.every(c=>c.tempoMultiplier>=1&&c.tempoMultiplier<=2.8));
 assert.equal(a.cues[1].speakerId,'kip');
 assert.throws(()=>synthesizeRehearsalDialogue(shots,30,4,{espeak:'bash'}),/system eSpeak/);
});

test('overpacked lines fail closed rather than silently clipping dialogue',()=>{
 const crammed=[{frames:120,dialogue:[{
  speakerId:'rill',text:'A confusing sequence of almost impossible multisyllabic mathematical ceremonial words that cannot be read this quickly',
  startFrame:2,endFrame:16
 }]}];
 assert.throws(()=>synthesizeRehearsalDialogue(crammed,30,4),/needs .* playback/);
});

test('real 9:16 one-scene MP4, voice WAV, captions and manifest share original manuscript timing',()=>{
 const script=readFileSync(fixture,'utf8');
 const input=developmentEpisodeFromScreenplay(script,{originRef:'source-manuscript'});
 const tmp=mkdtempSync(join(tmpdir(),'test-voiced-previs-'));
 try{
  const output=join(tmp,'out');
  const result=renderProceduralPreview(input,{outDir:output,width:180,fps:18,
   scene:'01-three-left-claws',style:'abyssal-glass',voice:'rehearsal',sourceBytes:Buffer.from(script)});
  assert.equal(result.state,'DEVELOPMENT_ONLY_NOT_APPROVED');
  assert.equal(result.seconds,12);
  assert.equal(result.performance.profile,'LOCAL_ESPEAK_UNAPPROVED_REHEARSAL');
  assert.equal(result.performance.eventCount,2);
  assert.equal(result.performance.dialogueSha256,sha(readFileSync(join(output,'dialogue-rehearsal.wav'))));
  assert.equal(result.previewSha256,sha(readFileSync(join(output,'preview.mp4'))));
  assert.match(result.limitations,/TEMPORARY performance sketches/);
  const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_type,width,height',
    '-of','json',join(output,'preview.mp4')],{encoding:'utf8'});
  assert.equal(probe.status,0,probe.stderr);
  const media=JSON.parse(probe.stdout);
  assert.ok(Math.abs(Number(media.format.duration)-12)<.1);
  assert.ok(media.streams.some(v=>v.codec_type==='audio'));
  assert.ok(media.streams.some(v=>v.codec_type==='video'&&v.width===180&&v.height===320));
  assert.throws(()=>renderProceduralPreview(input,{outDir:join(tmp,'invalid'),voice:'sing-as-another-agent'}),/voice profile/);
 }finally{rmSync(tmp,{recursive:true,force:true});}
});
