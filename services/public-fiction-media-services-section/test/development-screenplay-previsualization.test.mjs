import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,mkdtempSync,rmSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {developmentEpisodeFromScreenplay} from '../apps/derive-development-screenplay.mjs';
import {planProceduralPreview} from '../apps/previsualize-microdrama.mjs';

const sourceUrl=new URL('./fixtures/services/public-paracosm-media-services-section/services/unassigned-floor-paracosm-services-section/content/development/solos/the-wrong-answer-club-episode-001.md',import.meta.url);
const text=readFileSync(sourceUrl,'utf8');
const digest='sha256:'+createHash('sha256').update(text).digest('hex');

test('existing 120s AI social-comedy manuscript compiles without a second story bible',()=>{
 const document=developmentEpisodeFromScreenplay(text,{originRef:'causeway-fiction/development/solos/the-wrong-answer-club-episode-001.md'});
 assert.equal(document.source.type,'DevelopmentScreenplay');
 assert.equal(document.source.sourceRevision,digest);
 assert.equal(document.source.paracosm,undefined);
 assert.equal(document.developmentState,'unapproved-text-audition');
 assert.equal(document.episode.shots.length,10);
 assert.equal(document.episode.shots.reduce((n,shot)=>n+shot.frames,0),3600);
 assert.equal(document.episode.shots.flatMap(shot=>shot.dialogue).length,30);
 assert.deepEqual(document.episode.shots[0].characterIds,['chorus','pica','riff']);
 assert.ok(document.episode.shots[3].characterIds.includes('morrow'));
 assert.equal(planProceduralPreview(document,{fps:10,width:180}).totalSeconds,120);
 assert.equal(document.episode.shots.at(-1).id,'10-a-name-you-cannot-answer');
});

test('screenplay parsing rejects changed chronology or abandoned provenance',()=>{
 const broken=text.replace('00:22–00:34','00:24–00:34');
 assert.throws(()=>developmentEpisodeFromScreenplay(broken),/noncontiguous/);
 assert.throws(()=>developmentEpisodeFromScreenplay(text.replace('NOT canonical','fictional').replace('NOT a room','not a room')),/only explicitly noncanonical/);
 const missingTitle=text.replace('# The Wrong Answer Club','# ');
 assert.throws(()=>developmentEpisodeFromScreenplay(missingTitle),/titled property/);
});

test('script-to-visual compiler produces a real preview clip and measured metadata from prose only',()=>{
 const work=mkdtempSync(join(tmpdir(),'screenplay-audition-'));
 try{
  const bin=fileURLToPath(new URL('../apps/derive-development-screenplay.mjs',import.meta.url));
  const source=fileURLToPath(sourceUrl),out=join(work,'preview');
  const run=execFileSync(process.execPath,[bin,source,out,'--width','180','--fps','10','--scene','01-everybody-is-wrong'],{encoding:'utf8',timeout:90000});
  const info=JSON.parse(run);
  assert.equal(info.seconds,10);
  assert.equal(info.frames,100);
  assert.equal(info.state,'DEVELOPMENT_ONLY_NOT_APPROVED');
  assert.equal(info.sourceRevision,digest);
  assert.equal(info.sourceSha256,digest.slice('sha256:'.length));
  assert.ok(existsSync(join(out,'preview.mp4')));
  assert.ok(existsSync(join(out,'contact-sheet.png')));
  assert.match(readFileSync(join(out,'captions.srt'),'utf8'),/PICA: That is my worst answer/);
  const observed=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_type,width,height','-of','json',join(out,'preview.mp4')],{encoding:'utf8'}));
  assert.ok(Math.abs(Number(observed.format.duration)-10)<.1);
  assert.ok(observed.streams.some(x=>x.codec_type==='video'&&x.width===180&&x.height===320));
  assert.ok(observed.streams.some(x=>x.codec_type==='audio'));
 }finally{rmSync(work,{recursive:true,force:true})}
});


test('independent rival courier script derives exactly 120s including a silent scene without another shot JSON file',()=>{
 const url=new URL('./fixtures/services/public-paracosm-media-services-section/services/unassigned-floor-paracosm-services-section/content/development/solos/null-ferry-return-address.md',import.meta.url);
 const raw=readFileSync(url,'utf8');
 const story=developmentEpisodeFromScreenplay(raw,{originRef:'causeway-fiction/development/solos/null-ferry-return-address.md'});
 assert.equal(story.source.type,'DevelopmentScreenplay');
 assert.equal(story.episode.shots.length,10);
 assert.equal(story.episode.shots.reduce((n,shot)=>n+shot.frames,0),3600);
 assert.equal(planProceduralPreview(story,{width:180,fps:10}).totalSeconds,120);
 assert.equal(story.source.sourceRevision,'sha256:'+createHash('sha256').update(raw).digest('hex'));
 assert.notEqual(story.source.sourceRevision,digest);
 assert.ok(story.episode.shots.flatMap(x=>x.dialogue).length>=17);
 assert.ok(story.episode.shots.some(x=>x.dialogue.length===0),'intentional silence is preserved');
});


test('a single dramatic scene can contain three intentional camera framings in a 30-second Short',()=>{
 const manuscript=[
  '# Camera choices are not scene count',
  'NOT canon — isolated production contract fixture.',
  '**00:00–00:30 — A conversation**',
  '**SHOT 00:00–00:09 — Establishing wide**',
  'ALPHA: “I know the plan.”',
  '**SHOT 00:09–00:21 — Reaction closeup**',
  'BETA: “You never told me.”',
  '**SHOT 00:21–00:30 — Return wide**',
  'ALPHA: “That was the plan.”',
 ].join('\n');
 const source=developmentEpisodeFromScreenplay(manuscript,{originRef:'unapproved:scene-shots-fixture'});
 assert.equal(source.episode.shots.length,3);
 assert.deepEqual(source.episode.shots.map(x=>x.sceneId),['scene-01','scene-01','scene-01']);
 assert.deepEqual(source.episode.shots.map(x=>x.frames),[270,360,270]);
 assert.deepEqual(source.episode.shots.map(x=>x.camera),['Establishing wide','Reaction closeup','Return wide']);
 assert.equal(planProceduralPreview(source,{fps:10,width:180}).totalSeconds,30);
 assert.equal(source.source.sourceRevision,'sha256:'+createHash('sha256').update(manuscript).digest('hex'));
 const gap=manuscript.replace('SHOT 00:09–00:21','SHOT 00:10–00:21');
 assert.throws(()=>developmentEpisodeFromScreenplay(gap),/noncontiguous or invalid camera shots/);
 const incomplete=manuscript.replace('SHOT 00:21–00:30','SHOT 00:21–00:29');
 assert.throws(()=>developmentEpisodeFromScreenplay(incomplete),/do not cover complete/);
});

test('one-scene single-shot is allowed deliberately; it does not become a mandatory style',()=>{
 const manuscript=['# Uncut rehearsal fixture','NOT canon.',
  '**00:00–00:32 — An intentional long take**',
  'ALPHA: “This is a deliberate continuous camera choice.”'].join('\n');
 const out=developmentEpisodeFromScreenplay(manuscript);
 assert.equal(out.episode.shots.length,1);
 assert.equal(out.episode.shots[0].sceneId,'scene-01');
 assert.equal(out.episode.shots[0].id,'01-an-intentional-long-take');
 assert.equal(out.episode.shots[0].frames,960);
 assert.equal(planProceduralPreview(out,{fps:10,width:180}).totalSeconds,32);
 assert.throws(()=>developmentEpisodeFromScreenplay(manuscript.replace('00:32','00:29')),/expected 30–300 seconds/);
});
