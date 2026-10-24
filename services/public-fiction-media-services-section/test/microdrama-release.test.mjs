import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm,stat,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {parseMicrodramaSrt,renderMicrodramaSrt,renderMicrodramaVtt,
 renderMicrodramaTranscript,recutMicrodramaCaptions,chaptersToVtt,measureMicrodramaTextTrack
} from '../src/microdrama-text-tracks.mjs';
import {admitMicrodramaRelease,manufactureMicrodramaRelease,
 verifyMicrodramaReleasePackage} from '../src/microdrama-release.mjs';

const sha=x=>createHash('sha256').update(x).digest('hex');
const srt='1\n00:00:00,500 --> 00:00:02,300\nWhat are you doing?\n\n'+
 '2\n00:00:04,600 --> 00:00:06,000\nShe knows.\n\n'+
 '3\n00:00:06,500 --> 00:00:07,800\nRun!\n';
const zh='1\n00:00:00,500 --> 00:00:02,300\n你在做什么？\n\n'+
 '2\n00:00:04,600 --> 00:00:06,000\n她知道了。\n\n'+
 '3\n00:00:06,500 --> 00:00:07,800\n快跑！\n';
function fixture(source,sha256){
 return {
  rendition:{type:'MicrodramaLocalRendition',state:'RENDERED_REQUIRES_INDEPENDENT_REVIEW',
   videoPath:source,captionsPath:join(source,'..','source.srt'),sha256,duration:8,
   source:{seriesId:'original-drama',episodeId:'ep-1'}},
  review:{accepted:true,asset:{sha256},authority:'review:separate-editor',
   reviewRef:'review:independent-final-master',rightsRef:'license:original-claim'},
  edition:{title:'The Answer Is Not Here',synopsis:'An original AI-cast drama about a missing door.',
   seriesId:'original-drama',episodeId:'ep-1',consumer:'Causeway Public Fiction',
   sourceRef:'sha256:'+'a'.repeat(64),slug:'answer-not-here-ep1',language:'en',
   madeForKids:false,containsSyntheticMedia:true,tags:['original series','microdrama']},
  posterFrame:30,
  trailer:{editorialRef:'source:original-editorial-cut-selection',
   segments:[{startFrame:0,endFrame:60},{startFrame:150,endFrame:240}]},
  chapters:[{startFrame:0,endFrame:120,title:'First clue'},
    {startFrame:120,endFrame:240,title:'Unexpected answer'}],
  localizations:[{language:'zh-Hans',srtPath:join(source,'..','chinese.srt'),
   rightsRef:'translation:rights-claim',reviewRef:'translation:independent-review'}],
  hls:true,
 };
}
async function createSource(dir){
 const video=join(dir,'source.mp4');
 execFileSync('ffmpeg',['-nostdin','-hide_banner','-loglevel','error',
  '-f','lavfi','-i','testsrc2=size=180x320:rate=30:duration=8',
  '-f','lavfi','-i','sine=frequency=360:sample_rate=48000:duration=8',
  '-c:v','libx264','-preset','veryfast','-crf','26','-pix_fmt','yuv420p',
  '-c:a','aac','-ar','48000','-ac','2','-t','8','-shortest',
  // Deliberately include secret-looking source tags: the PRIVATE exact master
  // remains byte-identical, but newly encoded teaser/HLS must not inherit them.
  '-metadata','comment=PRIVATE_SOURCE_ACCOUNT',
  '-metadata','description=PRIVATE_SOURCE_DESCRIPTION',
  '-movflags','+faststart',video],{timeout:60000});
 await writeFile(join(dir,'source.srt'),srt);
 await writeFile(join(dir,'chinese.srt'),zh);
 return fixture(video,sha(await readFile(video)));
}
function inspectMovie(path){
 const json=execFileSync('ffprobe',['-v','error','-show_entries',
  'format=duration:stream=codec_type,width,height','-of','json',path],{
  timeout:30000,encoding:'utf8'});
 return JSON.parse(json);
}
test('SRT/WebVTT, transcript and teaser caption timings obey source text and exact frames',()=>{
 const cues=parseMicrodramaSrt(srt,{durationMs:8000});
 assert.equal(cues.length,3);
 assert.equal(cues[0].startMs,500);
 assert.equal(cues[2].endMs,7800);
 const metrology=measureMicrodramaTextTrack({cues,language:'en',durationMs:8000});
 assert.equal(metrology.type,'MicrodramaCaptionMetrology');
 assert.equal(metrology.cueCount,3);
 assert.equal(metrology.coveredDurationMs,4500);
 assert.equal(metrology.visualCoverageFraction,.563);
 assert.equal(metrology.intervalOverlapPairs,0);
 assert.ok(metrology.graphemesPerSecondP95>0);
 const chinese=measureMicrodramaTextTrack({
  cues:parseMicrodramaSrt(zh,{durationMs:8000}),language:'zh-Hans',durationMs:8000});
 assert.notEqual(chinese.totalGraphemes,metrology.totalGraphemes);
 const empty=measureMicrodramaTextTrack({cues:[],language:'en',durationMs:8000});
 assert.equal(empty.cueCount,0);
 assert.equal(empty.graphemesPerSecondP95,null);
 const overlapping=measureMicrodramaTextTrack({cues:[
  {startMs:0,endMs:1500,text:'First',ordinal:1},
  {startMs:1000,endMs:2000,text:'Second',ordinal:2}
 ],language:'en',durationMs:3000});
 assert.equal(overlapping.intervalOverlapPairs,1);
 assert.equal(overlapping.coveredDurationMs,2000);
 const nested=measureMicrodramaTextTrack({cues:[
  {startMs:0,endMs:3000,text:'First',ordinal:1},
  {startMs:1000,endMs:2500,text:'Second',ordinal:2},
  {startMs:1800,endMs:2900,text:'Third',ordinal:3},
  {startMs:3000,endMs:4000,text:'Touches, does not overlap',ordinal:4}
 ],language:'en',durationMs:4000});
 assert.equal(nested.intervalOverlapPairs,3,
  'each of three simultaneous caption cues overlaps both others, not just the previous cue');
 const denselyOverlapped=measureMicrodramaTextTrack({cues:Array.from(
  {length:10000},(_,i)=>({startMs:i,endMs:10001,text:'A',ordinal:i+1})
 ),language:'en',durationMs:10002});
 assert.equal(denselyOverlapped.intervalOverlapPairs,49995000,
  'bounded large caption cover counts every pair without quadratic scanning');

 assert.match(renderMicrodramaVtt(cues),/^WEBVTT\n\n/u);
 assert.match(renderMicrodramaTranscript(cues),/\[00:00:06\.500\] Run!/u);
 assert.deepEqual(parseMicrodramaSrt(renderMicrodramaSrt(cues),{durationMs:8000})
  .map(c=>c.text),cues.map(c=>c.text));
 const teaser=recutMicrodramaCaptions({cues,
  segments:[{startFrame:0,endFrame:60},{startFrame:150,endFrame:240}],fps:30});
 assert.deepEqual(teaser.map(x=>[x.startMs,x.endMs]),
  [[500,2000],[2000,3000],[3500,4800]]);
 assert.match(chaptersToVtt([{startFrame:0,endFrame:60,title:'Start'}],30),
  /00:00:00\.000 --> 00:00:02\.000/u);
 assert.deepEqual(parseMicrodramaSrt('',{durationMs:1000}),[],
  'intentional silent films are supported');
 assert.throws(()=>parseMicrodramaSrt('1\n00:00:10,000 --> 00:00:11,000\nToo late',
  {durationMs:8000}),/outside playable media/u);
 assert.throws(()=>parseMicrodramaSrt('1\n00:00:02,000 --> 00:00:01,000\nBackwards',
  {durationMs:8000}),/outside playable media/u);
 const escaped=renderMicrodramaVtt([{startMs:0,endMs:1000,text:'<script>& a',ordinal:1}]);
 assert.match(escaped,/&lt;script&gt;&amp; a/u);
});
test('edition gates require exact accepted master, original authority and actual editorial selections',
 {timeout:60000},async()=>{
 const dir=await mkdtemp(join(tmpdir(),'film-release-admission-'));
 try{
  const input=await createSource(dir);
  assert.equal(admitMicrodramaRelease(input).status,'PREPARED_FOR_PRIVATE_MANUFACTURING');
  assert.throws(()=>admitMicrodramaRelease({...input,
   review:{...input.review,asset:{sha256:'b'.repeat(64)}}}),/bind exact movie bytes/u);
  assert.throws(()=>admitMicrodramaRelease({...input,
   edition:{...input.edition,publicationDate:'2026-10-13'}}),/cannot invent publication date/u);
  assert.throws(()=>admitMicrodramaRelease({...input,
   edition:{...input.edition,containsSyntheticMedia:false}}),/synthetic AI drama/u);
  assert.throws(()=>admitMicrodramaRelease({...input,posterFrame:245}),/poster frame must be chosen/u);
  assert.throws(()=>admitMicrodramaRelease({...input,
   trailer:{editorialRef:'author',segments:[{startFrame:0,endFrame:243}]}}),
   /outside accepted film/u);
  assert.throws(()=>admitMicrodramaRelease({...input,
   localizations:[...input.localizations,...input.localizations]}),/subtitle languages must be unique/u);
  assert.throws(()=>admitMicrodramaRelease({...input,
   edition:{...input.edition,privacyStatus:'public'}}),/may not authorize public/u);
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('real manufactured private edition includes exact master, HLS, portrait poster, edited teaser and multilingual media',
 {timeout:180000},async()=>{
 const root=await mkdtemp(join(tmpdir(),'release-manufacturing-'));
 try{
  const input=await createSource(root),proposal=admitMicrodramaRelease(input);
  const outputDir=join(root,'release-v1');
  const result=await manufactureMicrodramaRelease({proposal,outputDir,timeoutMs:150000});
  assert.equal(result.status,'PRIVATE_ASSETS_MANUFACTURED_REQUIRES_DISTRIBUTION_REVIEW');
  assert.deepEqual(result.subtitleLanguages,['en','zh-Hans']);
  assert.equal(result.sourceSha256,input.rendition.sha256);
  const content=await readdir(outputDir);
  for(const file of ['master.mp4','poster.jpg','screening.html','teaser.mp4',
   'chapters.vtt','release.json','hls','teaser-captions','transcripts','captions'])
   assert.ok(content.includes(file),'expected delivery asset '+file);
  assert.equal(sha(await readFile(join(outputDir,'master.mp4'))),input.rendition.sha256);
  assert.ok((await stat(join(outputDir,'poster.jpg'))).size>1024);
  assert.match(await readFile(join(outputDir,'captions','en.vtt'),'utf8'),/^WEBVTT\n/u);
  assert.match(await readFile(join(outputDir,'captions','zh-Hans.vtt'),'utf8'),/你在做什么/u);
  assert.match(await readFile(join(outputDir,'teaser-captions','en.vtt'),'utf8'),
   /00:00:03\.500 --> 00:00:04\.800/u);
  assert.match(await readFile(join(outputDir,'chapters.vtt'),'utf8'),/Unexpected answer/u);
  const teaser=inspectMovie(join(outputDir,'teaser.mp4'));
  assert.ok(Math.abs(Number(teaser.format.duration)-5)<.2);
  assert.equal(teaser.streams.find(x=>x.codec_type==='video').width,180);
  assert.ok(teaser.streams.some(x=>x.codec_type==='audio'));
  const tags=file=>JSON.parse(execFileSync('ffprobe',[
    '-v','error','-show_entries','format_tags=comment,description','-of','json',file],
    {encoding:'utf8',timeout:30000})).format.tags??{};
  assert.equal(tags(join(outputDir,'master.mp4')).comment,'PRIVATE_SOURCE_ACCOUNT',
    'private exact master keeps its independently accepted source bytes');
  assert.equal(tags(join(outputDir,'teaser.mp4')).comment,undefined,
    'derived shareable teaser cannot inherit a private source account');
  assert.equal(tags(join(outputDir,'teaser.mp4')).description,undefined,
    'derived teaser cannot inherit a private source description');
  const playlist=await readFile(join(outputDir,'hls','index.m3u8'),'utf8');
  assert.match(playlist,/#EXT-X-PLAYLIST-TYPE:VOD/u);
  assert.match(playlist,/#EXT-X-INDEPENDENT-SEGMENTS/u);
  assert.match(playlist,/#EXT-X-ENDLIST/u);
  assert.ok((await readdir(join(outputDir,'hls'))).some(x=>x.endsWith('.ts')));
  const screening=await readFile(join(outputDir,'screening.html'),'utf8');
  assert.match(screening,/noindex,nofollow/u);
  assert.match(screening,/zh-Hans\.vtt/u);
  assert.doesNotMatch(screening,/source:original-editorial-cut-selection/u);
  const stored=JSON.parse(await readFile(join(outputDir,'release.json'),'utf8'));
  assert.equal(stored.state,'PRIVATE_MANUFACTURED_NOT_PUBLISHED');
  assert.equal(stored.source.originalFilmSha256,input.rendition.sha256);
  assert.equal(stored.textObservations.length,2);
  assert.equal(stored.textObservations[0].cueCount,3);
  assert.equal(stored.textObservations[0].coveredDurationMs,4500);
  assert.equal(stored.textObservations[1].language,'zh-Hans');
  assert.equal(stored.teaserTextObservations.length,2);
  assert.equal(stored.teaserTextObservations[0].coveredDurationMs,3800);
  assert.equal(stored.teaserTextObservations[0].visualCoverageFraction,.76);

  assert.ok(stored.assets.every(x=>/^[a-f0-9]{64}$/u.test(x.sha256)));
  const verified=await verifyMicrodramaReleasePackage(outputDir);
  assert.equal(verified.state,'CONTENT_BYTES_VERIFIED_NOT_PUBLICATION');
  assert.equal(verified.sourceSha256,input.rendition.sha256);
  assert.equal(verified.assetCount,stored.assets.length);
  assert.equal(verified.hasHls,true);
  assert.equal(verified.hasTrailer,true);
  await assert.rejects(()=>manufactureMicrodramaRelease({
   proposal,outputDir,timeoutMs:150000}),/already exists/u);
  await writeFile(join(outputDir,'captions','en.vtt'),'WEBVTT\n\nTAMPERED\n');
  await assert.rejects(()=>verifyMicrodramaReleasePackage(outputDir),
   /release media bytes differ/u);
  assert.equal(sha(await readFile(input.rendition.videoPath)),input.rendition.sha256,
   'source final master is unchanged by new packaging');
  assert.deepEqual((await readdir(root)).filter(x=>x.startsWith('.microdrama-release-')),[]);
 }finally{await rm(root,{recursive:true,force:true})}
});