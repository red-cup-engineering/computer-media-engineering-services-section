import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {mkdtemp,rm,readFile,writeFile,symlink,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileMicrodramaEpisode} from '../src/microdrama-production.mjs';
import {validateAssemblyManifest,assembleMicrodrama} from '../src/microdrama-assembly.mjs';
import {assayMicrodramaShot,readTemporalLumaChanges} from '../src/microdrama-shot-assay.mjs';
import {materializeMicrodramaEditorial} from '../src/microdrama-editorial.mjs';
import {planMicrodramaEditorialIngest,manufactureMicrodramaEditorialIngest} from '../src/microdrama-editorial-ingest.mjs';
import {admitMicrodramaMastering} from '../src/microdrama-audio-mastering.mjs';
const fixture = ({embeddedShots=[]}={}) => {
 const seed={type:'NativeStorySeed',id:'synthetic-engineering-only',premise:'FICTION TEST ONLY: a delivery manifest is wrong.',originRef:'test:synthetic',contributorRef:'test:none',boundaries:['No representation of real Nation or people'],permission:{adaptation:'claimed-permitted',syntheticPerformance:'claimed-permitted',recordRef:'test:fake'}};
 const series={id:'sample-show',characters:[{id:'a',name:'A',synthetic:true,visualRef:'test:visual-a',voiceRef:'test:voice-a'}],locations:[{id:'store',referenceRef:'test:store'}]};
 const episode={id:'pilot',number:1,beats:[
  {id:'setup',causeBeatId:'seed',action:'A reads manifest',consequence:'She notices an error'},
  {id:'reversal',causeBeatId:'setup',action:'A learns of missing mail',consequence:'A must respond'},
  {id:'cliffhanger',kind:'cliffhanger',causeBeatId:'reversal',action:'Unknown letter appears',consequence:'A cannot decide',question:'Who sent it?'}],
  shots:[0,1,2].map(i=>({id:`s${i+1}`,frames:150,beatId:['setup','reversal','cliffhanger'][i],locationId:'store',characterIds:['a'],action:`Action ${i}`,camera:'portrait closeup',audioMode:embeddedShots.includes(i)?'embedded-performance':'separate-voice',dialogue:[{speakerId:'a',startFrame:30,endFrame:90,text:`Story line ${i+1}.`}]}))};
 return compileMicrodramaEpisode({seed,series,episode,receiver:{consumer:'fiction-producer',destination:'unbound-channel',acceptanceCriteria:'Audition only'},openedAt:'2026-10-12T15:00:00Z'});
};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const accept = (plan) => ({type:'MicrodramaAssetManifest',reviewRef:'test:fake-unverified-editorial-review',assets:[
  ...plan.jobs.video.map((x,i)=>({jobId:x.id,kind:'video',mimeType:'video/mp4',relativePath:`shot${i}.mp4`,reviewState:'accepted',rightsRef:'test:fictional-rights',reviewRef:'test:mock-reviewed',sha256:'0'.repeat(64),
    ...(x.audioMode==='embedded-performance'?{audioReviewRef:'test:fictional-audio-review'}:{})})),
  ...plan.jobs.speech.map((x,i)=>({jobId:x.id,kind:'speech',mimeType:'audio/wav',relativePath:`voice${i}.wav`,reviewState:'accepted',rightsRef:'test:fictional-rights',reviewRef:'test:mock-reviewed',sha256:'0'.repeat(64)}))
]});
test('mastering target is an independent bounded editorial decision, never an invisible provider default',()=>{
 const approved=admitMicrodramaMastering({integratedLufs:-16});
 assert.equal(approved.truePeakDb,-1.5);
 assert.throws(()=>admitMicrodramaMastering({integratedLufs:-5}),/outside calibrated range/u);
 assert.throws(()=>admitMicrodramaMastering({truePeakDb:1}),/outside calibrated range/u);
});
test('assets must match every compiled job, rights and review references',()=>{
 const p=fixture(),m=accept(p);
 assert.equal(validateAssemblyManifest(p,m).size,6);
 m.assets.pop();assert.throws(()=>validateAssemblyManifest(p,m),/missing accepted asset/u);
 const dup=accept(p);dup.assets.push({...dup.assets[0]});assert.throws(()=>validateAssemblyManifest(p,dup),/multiple assets/u);
 const notAccepted=accept(p);notAccepted.assets[0].reviewState='submitted';assert.throws(()=>validateAssemblyManifest(p,notAccepted),/not independently accepted/u);
 const unsafe=accept(p);unsafe.assets[0].relativePath='../untrusted.mov';assert.throws(()=>validateAssemblyManifest(p,unsafe),/relative paths/u);
});
// Integration test uses deterministic locally generated TEST color blocks and sine waves,
// NOT any contributed Native story, AI video provider, human likeness or paid generator.
test('FFmpeg renders three 5-second vertical clips, placed voices, captions and source hashes', {timeout:60000}, async()=>{
 const p=fixture(),m=accept(p),root=await mkdtemp(join(tmpdir(),'fiction-assets-'));
 try{
  for(let i=0;i<3;i++){
    const f=join(root,`shot${i}.mp4`);
    execFileSync('ffmpeg',['-nostdin','-y','-loglevel','error','-f','lavfi','-i',`color=c=${['red','green','blue'][i]}:s=180x320:r=30:d=5`,'-c:v','libx264','-pix_fmt','yuv420p',
      ...(i===0?['-metadata','comment=PRIVATE_SOURCE_ACCOUNT',
        '-metadata','description=PRIVATE_SOURCE_DESCRIPTION']:[]),
      '-t','5',f],{timeout:30000});
    m.assets[i].sha256=hash(await readFile(f));
  }
  for(let i=0;i<3;i++){
    const f=join(root,`voice${i}.wav`);
    execFileSync('ffmpeg',['-nostdin','-y','-loglevel','error','-f','lavfi','-i',`sine=frequency=${440+i*100}:duration=1.6`,'-c:a','pcm_s16le',f],{timeout:30000});
    m.assets[i+3].sha256=hash(await readFile(f));
  }
  // Deliver the SAME actual video and voice bytes through the new provider-
  // neutral source editor receiving. This shares the original FFprobe and
  // rights-review acceptance gate, rather than inventing an AI-Veo-only editor.
  const byJob=new Map([...p.jobs.video,...p.jobs.speech].map(j=>[j.id,j]));
  const independentlyReceived=m.assets.map(a=>({
   jobId:a.jobId,kind:a.kind==='speech'?'audio':'video',
   reviewState:'accepted',sourceRef:byJob.get(a.jobId).sourceRef,
   sha256:a.sha256,mimeType:a.mimeType,custodyRoot:root,
   relativePath:a.relativePath,reviewRef:a.reviewRef,rightsRef:a.rightsRef,
   ...(a.audioReviewRef?{audioReviewRef:a.audioReviewRef}:{})
  }));
  const preflight=planMicrodramaEditorialIngest({plan:p,sources:independentlyReceived,
   parentReviewRef:'test:independent-source-review-collection'});
  assert.equal(preflight.status,'COMPLETE_ORIGINAL_MEDIA_READY_FOR_BYTE_CHECK_AND_EDITING');
  assert.equal(preflight.manifest.assets.length,6);
  assert.equal(preflight.manifest.assets[3].kind,'speech');
  assert.ok(preflight.manifest.assets.every(a=>a.reviewState==='accepted'));
  const ingested=await manufactureMicrodramaEditorialIngest({plan:p,ingestPlan:preflight,
   outputDir:join(root,'received-editor-media')});
  assert.equal(ingested.acceptedJobs,6);
  assert.equal(ingested.uniqueMediaFiles,6);
  const actualManifest=JSON.parse(await readFile(ingested.assetManifestPath,'utf8'));
  assert.equal(validateAssemblyManifest(p,actualManifest).size,6);
  assert.equal(actualManifest.assets[0].sha256,m.assets[0].sha256);
  assert.equal(hash(await readFile(join(ingested.assetRoot,
   actualManifest.assets[0].relativePath))),m.assets[0].sha256);
  const actualEditable=await materializeMicrodramaEditorial({plan:p,
   manifest:actualManifest,assetRoot:ingested.assetRoot,
   outputDir:join(root,'received-original-edit')});
  assert.equal(actualEditable.frames,450);
  const incomplete=planMicrodramaEditorialIngest({plan:p,
   sources:independentlyReceived.slice(0,-1),
   parentReviewRef:'test:original-review-collection'});
  assert.equal(incomplete.status,'HELD_MISSING_ACCEPTED_ORIGINAL_AV_MEDIA');
  assert.equal(incomplete.missingJobs.length,1);
  await assert.rejects(()=>manufactureMicrodramaEditorialIngest({
   plan:p,ingestPlan:incomplete,outputDir:join(root,'unreceived-would-be-edit')
  }),/all original source audio and video must be independently accepted/u);
  const watched=independentlyReceived.map(v=>({...v}));
  watched[0].sha256='f'.repeat(64);
  const wrongBytes=planMicrodramaEditorialIngest({plan:p,sources:watched,
   parentReviewRef:'test:strict-source-verification'});
  await assert.rejects(()=>manufactureMicrodramaEditorialIngest({
   plan:p,ingestPlan:wrongBytes,outputDir:join(root,'tampered-unreceived')
  }),/original provider video\/voice bytes changed/u);
  const planFile=join(root,'original-plan.json');
  const reviewedFile=join(root,'original-reviewed-sources.json');
  await writeFile(planFile,JSON.stringify(p));
  await writeFile(reviewedFile,JSON.stringify({sources:independentlyReceived,
   parentReviewRef:'test:independent-source-review-collection'}));
  const cliIngest=JSON.parse(execFileSync(process.execPath,[
   new URL('../apps/assemble-microdrama.mjs',import.meta.url).pathname,
   '--ingest',planFile,reviewedFile,join(root,'received-editor-cli')
  ],{encoding:'utf8',timeout:45000}));
  assert.equal(cliIngest.acceptedJobs,6);
  assert.equal(cliIngest.uniqueMediaFiles,6);
  assert.equal(cliIngest.status,'EXACT_AV_BYTES_STAGED_AWAITING_FINAL_FILM_ASSEMBLY');

  const result=await assembleMicrodrama({plan:p,manifest:m,assetRoot:root,outputPath:join(root,'final.mp4'),width:180,height:320,mastering:{integratedLufs:-16}});
  assert.equal(result.type,'MicrodramaLocalRendition');
  assert.equal(result.state,'RENDERED_REQUIRES_INDEPENDENT_REVIEW');
  assert.equal(result.width,180);assert.equal(result.height,320);
  assert.equal(result.inputs.length,6);
  // One physical MP4 can contain two competing video tracks. Source inspection
  // must not attest track 0 while a downstream FFmpeg default consumes track 1.
  // Reject it before either editorial assembly or independent footage assay.
  const ambiguous=join(root,'ambiguous-source.mp4');
  execFileSync('ffmpeg',['-nostdin','-y','-loglevel','error',
    '-f','lavfi','-i','color=c=black:s=180x320:r=24:d=2',
    '-f','lavfi','-i','testsrc2=s=180x320:r=24:d=2',
    '-map','0:v:0','-map','1:v:0',
    '-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p',
    '-t','2',ambiguous],{timeout:30000});
  await assert.rejects(()=>assayMicrodramaShot({
    file:ambiguous,expectedAspect:'9:16'}),
    /ambiguous cinematic picture or sound track inventory/u);
  const split=accept(p);split.assets=m.assets.map(asset=>({...asset}));
  split.assets[0].relativePath='ambiguous-source.mp4';
  split.assets[0].sha256=hash(await readFile(ambiguous));
  await assert.rejects(()=>assembleMicrodrama({plan:p,manifest:split,assetRoot:root,
    outputPath:join(root,'ambiguous-assembled.mp4'),width:180,height:320}),
    /ambiguous video stream inventory/u);
  assert.equal(result.loudness.type,'MicrodramaTwoPassLoudnessObservation');
  assert.equal(result.loudness.state,'RENDERED_AUDIO_REQUIRES_LISTENING_AND_TRUE_PEAK_REVIEW');
  assert.equal(result.loudness.requested.integratedLufs,-16);
  assert.ok(Number.isFinite(result.loudness.measuredFirstPass.inputI));
  assert.ok(Number.isFinite(result.loudness.measuredOutput.outputI));
  assert.ok(Math.abs(result.loudness.measuredOutput.outputI+16)<1.8,
   'two-pass program normalization must measurably approach requested LUFS');
  assert.ok(result.loudness.measuredOutput.outputTruePeak<=-1,
   'finished soundtrack must respect a conservative true-peak ceiling');
  assert.ok(Math.abs(result.duration-15)<0.1);
  assert.equal(hash(await readFile(result.videoPath)),result.sha256);
  // Input 0 has arbitrary owner-only metadata: by default FFmpeg would
  // silently copy these private tags into the edited video. The rendered
  // film must not leak them; original source bytes remain in their custody.
  const probeTags=file=>JSON.parse(execFileSync('ffprobe',[
    '-v','error','-show_entries','format_tags=comment,description','-of','json',file],
    {timeout:30000,encoding:'utf8'})).format.tags??{};
  const originalTags=probeTags(join(root,'shot0.mp4'));
  assert.equal(originalTags.comment,'PRIVATE_SOURCE_ACCOUNT');
  assert.equal(originalTags.description,'PRIVATE_SOURCE_DESCRIPTION');
  const renderedTags=probeTags(result.videoPath);
  assert.equal(renderedTags.comment,undefined,'final MP4 cannot inherit private source account');
  assert.equal(renderedTags.description,undefined,'final MP4 cannot inherit source description');
  const caps=await readFile(result.captionsPath,'utf8');
  assert.equal(caps,p.subtitlesSrt);
  const editable=await materializeMicrodramaEditorial({plan:p,manifest:m,
    assetRoot:root,outputDir:join(root,'editable-cut')});
  assert.equal(editable.mediaFiles,6);
  assert.equal(editable.frames,450);
  assert.equal(editable.status,'EDITABLE_FILM_REQUIRES_INDEPENDENT_FINAL_REVIEW');
  const timeline=JSON.parse(await readFile(editable.editPath,'utf8'));
  assert.equal(timeline.OTIO_SCHEMA,'Timeline.1');
  assert.deepEqual(timeline.tracks.children.map(t=>t.kind),['Video','Audio','Audio']);
  for(const t of timeline.tracks.children)
    assert.equal(t.children.reduce((total,x)=>total+x.source_range.duration.value,0),450);
  assert.equal(timeline.tracks.children[0].children.length,3);
  const firstClip=timeline.tracks.children[0].children[0];
  assert.equal(firstClip.OTIO_SCHEMA,'Clip.2');
  const ref=firstClip.media_references.DEFAULT_MEDIA;
  assert.equal(ref.OTIO_SCHEMA,'ExternalReference.1');
  assert.match(ref.target_url,/^file:\/\//u);
  assert.equal(ref.metadata.causeway.originalSha256,m.assets[0].sha256);
  assert.equal(hash(await readFile(join(root,'editable-cut',ref.metadata.causeway.packageRelativePath))),
    m.assets[0].sha256,'editables preserve the exact original media bytes');
  assert.equal(timeline.tracks.children[1].children.filter(x=>x.OTIO_SCHEMA==='Clip.2').length,0);
  assert.equal(timeline.tracks.children[2].children.filter(x=>x.OTIO_SCHEMA==='Clip.2').length,3);
  assert.equal(await readFile(editable.captionsPath,'utf8'),p.subtitlesSrt);
  await assert.rejects(()=>materializeMicrodramaEditorial({plan:p,manifest:m,
    assetRoot:root,outputDir:editable.packagePath}),/already exists/u);
  assert.deepEqual((await readdir(root)).filter(name=>name.startsWith('.microdrama-render-')),[],
    'successful compilation leaves no staging litter');
  // A failed rerender must NOT damage existing distributable bytes, even
  // when overwrite was allowed. This used to stream straight into final.mp4.
  const stableMovie=hash(await readFile(result.videoPath));
  const stableCaptions=await readFile(result.captionsPath);
  await assert.rejects(assembleMicrodrama({plan:p,manifest:m,assetRoot:root,
    outputPath:result.videoPath,width:180,height:320,overwrite:true,ffmpegTimeoutMs:1}));
  assert.equal(hash(await readFile(result.videoPath)),stableMovie,
    'failed overwrite must retain the previous complete movie');
  assert.deepEqual(await readFile(result.captionsPath),stableCaptions,
    'failed overwrite must retain the previous captions');
  assert.deepEqual((await readdir(root)).filter(name=>name.startsWith('.microdrama-render-')),[],
    'failed compilation cannot strand staging directories');
  assert.match(caps,/00:00:01,000 --> 00:00:03,000/u);
  assert.match(caps,/00:00:11,000 --> 00:00:13,000/u);
  await assert.rejects(()=>assembleMicrodrama({plan:p,manifest:m,assetRoot:root,outputPath:join(root,'final.mp4'),width:180,height:320}),/output exists/u);
  const corrupt=accept(p);corrupt.assets=m.assets.map(a=>({...a}));corrupt.assets[0].sha256='a'.repeat(64);
  await assert.rejects(()=>assembleMicrodrama({plan:p,manifest:corrupt,assetRoot:root,outputPath:join(root,'bad.mp4'),width:180,height:320}),/checksum mismatch/u);
  await symlink('/etc/hosts',join(root,'evil.mp4'));
  const bad=accept(p);bad.assets=m.assets.map(a=>({...a}));bad.assets[0].relativePath='evil.mp4';
  await assert.rejects(()=>assembleMicrodrama({plan:p,manifest:bad,assetRoot:root,outputPath:join(root,'bad.mp4'),width:180,height:320}),/outside declared custody root/u);
 } finally {await rm(root,{recursive:true,force:true});}
});

test('native performed dialogue remains in the video job, with captions but no redundant speech generation',()=>{
 const p=fixture({embeddedShots:[0,2]});
 assert.equal(p.jobs.video.length,3);
 assert.equal(p.jobs.speech.length,1);
 assert.equal(p.jobs.video[0].audioMode,'embedded-performance');
 assert.equal(p.jobs.video[2].spokenDialogue[0].text,'Story line 3.');
 assert.ok(p.jobs.video[0].requiredEvidence.includes('dialogue-and-sync-review'));
 assert.match(p.subtitlesSrt,/Story line 1\./u);
 assert.match(p.subtitlesSrt,/Story line 3\./u);
 const m=accept(p);
 assert.equal(validateAssemblyManifest(p,m).size,4);
 delete m.assets[0].audioReviewRef;
 assert.throws(()=>validateAssemblyManifest(p,m),/embedded-performance dialogue\/audio review/u);
});

test('FFmpeg preserves scene-native performed audio across cuts and mixes separately accepted voice where requested',
 {timeout:90000},async()=>{
 const p=fixture({embeddedShots:[0,2]}),m=accept(p),root=await mkdtemp(join(tmpdir(),'fiction-native-audio-'));
 try{
  for(let i=0;i<3;i++){
   const out=join(root,`shot${i}.mp4`);
   const cmd=['-nostdin','-y','-loglevel','error','-f','lavfi','-i',
     `color=c=${['red','green','blue'][i]}:s=180x320:r=30:d=5`];
   if(i!==1)cmd.push('-f','lavfi','-i',`sine=frequency=${i===0?700:1100}:sample_rate=48000:duration=5`);
   cmd.push('-c:v','libx264','-pix_fmt','yuv420p');
   if(i!==1)cmd.push('-c:a','aac','-shortest');
   cmd.push('-t','5',out);
   execFileSync('ffmpeg',cmd,{timeout:30000});
   m.assets[i].sha256=hash(await readFile(out));
  }
  const voice=join(root,'voice0.wav');
  execFileSync('ffmpeg',['-nostdin','-y','-loglevel','error','-f','lavfi','-i',
   'sine=frequency=500:duration=1.6','-c:a','pcm_s16le',voice],{timeout:30000});
  m.assets[3].sha256=hash(await readFile(voice));
  const result=await assembleMicrodrama({plan:p,manifest:m,assetRoot:root,
    outputPath:join(root,'cinematic.mp4'),width:180,height:320});
  assert.ok(Math.abs(result.duration-15)<0.1);
  assert.equal(result.inputs.length,4);
  assert.equal(result.inputs[0].audioMode,'embedded-performance');
  assert.equal(result.inputs[0].technicalAssay.temporalLumaChange.state,
    'MEASURED_FRAME_TO_FRAME_LUMA_CHANGE',
    'editorial receiving must preserve actual motion evidence instead of losing it');
  assert.equal(result.inputs[0].technicalAssay.temporalLumaChange.pairs,149);
  assert.equal(result.inputs[1].audioMode,'separate-voice');
  // The SAME accepted media must retain objective motion measurements when
  // its bytes pass through the existing editor ingest, not only direct assembly.
  const originalJobs=new Map([...p.jobs.video,...p.jobs.speech].map(j=>[j.id,j]));
  const originalSources=m.assets.map(a=>({
   jobId:a.jobId,kind:a.kind==='speech'?'audio':'video',
   reviewState:'accepted',sourceRef:originalJobs.get(a.jobId).sourceRef,
   sha256:a.sha256,mimeType:a.mimeType,custodyRoot:root,
   relativePath:a.relativePath,reviewRef:a.reviewRef,rightsRef:a.rightsRef,
   ...(a.audioReviewRef?{audioReviewRef:a.audioReviewRef}:{})
  }));
  const ingress=planMicrodramaEditorialIngest({plan:p,sources:originalSources,
   parentReviewRef:'test:synthetic-acting-audio-receiving'});
  const acceptedEditor=await manufactureMicrodramaEditorialIngest({
   plan:p,ingestPlan:ingress,outputDir:join(root,'temporal-editor-ingest')});
  assert.equal(acceptedEditor.embeddedPerformanceReviewFlags.length,2);
  assert.ok(acceptedEditor.embeddedPerformanceReviewFlags.every(x=>
   x.temporalLumaChange.state==='MEASURED_FRAME_TO_FRAME_LUMA_CHANGE'&&
   x.temporalLumaChange.pairs===149));
  const editable=await materializeMicrodramaEditorial({plan:p,manifest:m,
    assetRoot:root,outputDir:join(root,'editable-native')});
  const cuts=JSON.parse(await readFile(editable.editPath,'utf8')).tracks.children;
  assert.equal(cuts[0].children.length,3);
  assert.equal(cuts[1].children.filter(c=>c.OTIO_SCHEMA==='Clip.2').length,2);
  assert.equal(cuts[2].children.filter(c=>c.OTIO_SCHEMA==='Clip.2').length,1);
  assert.equal(cuts[1].children[0].metadata.causeway.audioReviewRef,
    'test:fictional-audio-review');
  assert.equal(cuts[1].children[1].OTIO_SCHEMA,'Gap.1');
  assert.ok(cuts[2].children.some(c=>c.OTIO_SCHEMA==='Gap.1'));
  const pcm=t=>execFileSync('ffmpeg',['-v','error','-ss',String(t),'-t','0.5','-i',
    result.videoPath,'-map','0:a:0','-f','s16le','-ac','1','-ar','8000','-'],
    {timeout:30000,maxBuffer:50000});
  const first=pcm(1),voiceExcerpt=pcm(6.3),last=pcm(11);
  for(const bytes of [first,voiceExcerpt,last])assert.ok(bytes.some(x=>x!==0));
  assert.notDeepEqual(first,last,'different native shot performances survive the cut');
  const silent=join(root,'silent.mp4');
  execFileSync('ffmpeg',['-nostdin','-y','-loglevel','error','-f','lavfi','-i',
   'color=c=black:s=180x320:r=30:d=5','-c:v','libx264','-pix_fmt','yuv420p','-t','5',silent],
    {timeout:30000});
  const rejected=accept(p);
  rejected.assets=m.assets.map(a=>({...a}));rejected.assets[0].relativePath='silent.mp4';
  rejected.assets[0].sha256=hash(await readFile(silent));
  await assert.rejects(()=>assembleMicrodrama({plan:p,manifest:rejected,assetRoot:root,
    outputPath:join(root,'cannot-lose-sound.mp4'),width:180,height:320}),
    /embedded-performance shot requires an audio stream/u);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('real decoded source frames and soundtrack reveal freeze/black/silence without editorial invention',
 {timeout:90000},async()=>{
 const root=await mkdtemp(join(tmpdir(),'fiction-film-assay-'));
 try{
  const video=join(root,'long-stillness.mp4');
  execFileSync('ffmpeg',['-nostdin','-y','-loglevel','error',
   '-f','lavfi','-i','color=c=black:s=180x320:r=24:d=2',
   '-f','lavfi','-i','anullsrc=r=48000:cl=stereo',
   '-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',
   '-t','2','-shortest',video],{timeout:30000});
  const review=await assayMicrodramaShot({file:video,expectedAspect:'9:16',
    expectedSeconds:2,requiresAudio:true});
  assert.equal(review.type,'MicrodramaShotTechnicalAssay');
  assert.equal(review.state,'DECODED_REQUIRES_INDEPENDENT_PERFORMANCE_AND_CONTINUITY_REVIEW');
  assert.equal(review.media.sha256,hash(await readFile(video)));
  assert.equal(review.media.video.width,180);
  assert.equal(review.media.video.height,320);
  assert.ok(review.media.video.decodedFrames>=48);
  assert.equal(review.temporalLumaChange.state,'MEASURED_FRAME_TO_FRAME_LUMA_CHANGE');
  assert.equal(review.temporalLumaChange.pairs,review.media.video.decodedFrames-1);
  assert.ok(review.temporalLumaChange.median<0.05,
    'fully stationary black frames have negligible frame-to-frame luma change');
  assert.equal(review.media.audio.codec,'aac');
  assert.ok(review.signals.some(x=>x.type==='black-frames'));
  assert.ok(review.signals.some(x=>x.type==='low-audio-level'));
  assert.ok(review.reviewFlags.some(x=>x.code==='EXTENDED_BLACK'));
  assert.match(review.limitations,/cannot prove character identity/u);
  // Tune the actual operator-facing read-only route, not just its imported
  // library. CI must prove actual decoded bytes reach the public CLI without
  // treating the technical report as editorial or cultural acceptance.
  const inspectCli=fileURLToPath(new URL('../apps/assemble-microdrama.mjs',import.meta.url));
  const printed=execFileSync(process.execPath,[inspectCli,'--inspect',video,
    '--aspect','9:16','--seconds','2','--require-audio'],
   {encoding:'utf8',timeout:45000});
  const observed=JSON.parse(printed);
  assert.equal(observed.media.sha256,review.media.sha256);
  assert.equal(observed.state,'DECODED_REQUIRES_INDEPENDENT_PERFORMANCE_AND_CONTINUITY_REVIEW');
  assert.ok(observed.reviewFlags.some(x=>x.code==='EXTENDED_BLACK'));
  assert.ok(observed.signals.some(x=>x.type==='low-audio-level'));
  assert.equal(observed.media.video.frameRate,24);
  assert.equal(observed.temporalLumaChange.pairs,review.temporalLumaChange.pairs,
    'the real CLI and source assay must return the same independent temporal observation');
  const moving=join(root,'physical-motion.mp4');
  execFileSync('ffmpeg',['-nostdin','-y','-loglevel','error',
   '-f','lavfi','-i','testsrc2=s=180x320:r=24:d=2',
   '-c:v','libx264','-pix_fmt','yuv420p','-t','2',moving],{timeout:30000});
  const active=await assayMicrodramaShot({file:moving,expectedAspect:'9:16',
    expectedSeconds:2,requiresAudio:false});
  assert.equal(active.temporalLumaChange.pairs,active.media.video.decodedFrames-1);
  assert.ok(active.temporalLumaChange.median>review.temporalLumaChange.median+0.4,
    'pixel difference must distinguish a moving signal from a true static source');
  assert.equal(active.state,'DECODED_REQUIRES_INDEPENDENT_PERFORMANCE_AND_CONTINUITY_REVIEW',
    'motion does NOT prove a good acting performance');
  assert.throws(()=>execFileSync(process.execPath,[inspectCli,'--inspect',video,
    '--aspect','16:9'],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:45000}),
   /video aspect disagrees/u);
  await assert.rejects(()=>assayMicrodramaShot({file:video,expectedAspect:'16:9'}),
   /video aspect disagrees/u);
  await assert.rejects(()=>assayMicrodramaShot({file:video,expectedSeconds:4}),
   /actual shot duration differs/u);
  const mute=join(root,'no-audio.mp4');
  execFileSync('ffmpeg',['-nostdin','-y','-loglevel','error',
   '-f','lavfi','-i','color=c=black:s=180x320:r=24:d=2',
   '-c:v','libx264','-pix_fmt','yuv420p','-t','2',mute],{timeout:30000});
  await assert.rejects(()=>assayMicrodramaShot({file:mute,requiresAudio:true}),
   /audio-bearing performance requires/u);
  const validSilent=await assayMicrodramaShot({file:mute,requiresAudio:false});
  assert.equal(validSilent.state,'DECODED_REQUIRES_INDEPENDENT_PERFORMANCE_AND_CONTINUITY_REVIEW');
  assert.ok(validSilent.reviewFlags.some(x=>x.code==='NO_AUDIO_STREAM'));
 }finally{await rm(root,{recursive:true,force:true});}
});

test('temporal metrology rejects incomplete frame evidence without inventing an artistic judgment',()=>{
 const sample='lavfi.signalstats.YAVG=0.0\\nlavfi.signalstats.YAVG=2.5\\n';
 const measured=readTemporalLumaChanges(sample,{expectedFrames:3});
 assert.equal(measured.pairs,2);
 assert.equal(measured.median,0);
 assert.equal(measured.p90,2.5);
 assert.equal(measured.state,'MEASURED_FRAME_TO_FRAME_LUMA_CHANGE');
 assert.match(measured.limitation,/neither action recognition nor performance/u);
 assert.throws(()=>readTemporalLumaChanges(sample,{expectedFrames:4}),/incomplete/u);
 assert.equal(readTemporalLumaChanges('').state,'MOTION_OBSERVATION_UNAVAILABLE');
});

test('bounded long-film inspect exposes source assay beyond default 32 seconds', {timeout:120000},()=>{
 const work=mkdtempSync(join(tmpdir(),'microdrama-long-assay-'));
 try{
  const film=join(work,'original-concept.mp4');
  execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-nostdin',
   '-f','lavfi','-i','color=c=blue:s=180x320:r=2:d=33',
   '-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-y',film],
   {timeout:45000});
  const cli=fileURLToPath(new URL('../apps/assemble-microdrama.mjs',import.meta.url));
  const output=execFileSync(process.execPath,
   [cli,'--inspect',film,'--aspect','9:16','--max-seconds','40'],
   {encoding:'utf8',timeout:60000});
  const measured=JSON.parse(output);
  assert.equal(measured.state,'DECODED_REQUIRES_INDEPENDENT_PERFORMANCE_AND_CONTINUITY_REVIEW');
  assert.ok(Math.abs(measured.media.durationSeconds-33)<0.12);
  assert.ok(measured.reviewFlags.some(flag=>flag.code==='EXTENDED_FREEZE'));
  assert.throws(()=>execFileSync(process.execPath,
   [cli,'--inspect',film,'--max-seconds','0'],{encoding:'utf8',timeout:30000}),
   /invalid assay time ceiling/);
 }finally{rmSync(work,{recursive:true,force:true})}
});
