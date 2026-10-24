/**
 * Professional EDITABLE handoff for the existing Public Fiction shot/voice
 * compiler. Not another timeline authority or publisher: receives the same
 * independently reviewed byte sources that the FFmpeg assembler accepts.
 *
 * OpenTimelineIO is Academy Software Foundation's editorial interchange
 * model. This file writes recognized OTIO JSON schema objects directly,
 * avoiding a second install/runtime dependency. Clip identities and observed
 * media byte hashes are preserved; the folder keeps exact original video
 * and audio, not just a flattened or re-generated movie.
 */
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {copyFile, mkdir, mkdtemp, readFile, rename, rm, stat, writeFile} from 'node:fs/promises';
import {basename, dirname, extname, join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {receiveMicrodramaInputs} from './microdrama-assembly.mjs';

const assert=(value,message)=>{if(!value)throw new TypeError(message)};
const positive=(n)=>Number.isSafeInteger(n)&&n>0;
const sha256=async(file)=>{
 const hash=createHash('sha256');
 for await(const chunk of createReadStream(file))hash.update(chunk);
 return hash.digest('hex');
};
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const extensions=Object.freeze({
 'video/mp4':'.mp4','video/webm':'.webm',
 'audio/wav':'.wav','audio/mpeg':'.mp3','audio/ogg':'.ogg'
});
const rational=(value,fps)=>({OTIO_SCHEMA:'RationalTime.1',value,rate:fps});
const span=(start,length,fps)=>({
 OTIO_SCHEMA:'TimeRange.1',
 start_time:rational(start,fps),duration:rational(length,fps)
});
const gap=(length,fps)=>({
 OTIO_SCHEMA:'Gap.1',name:'Room tone / intentional gap',enabled:true,
 source_range:span(0,length,fps),effects:[],markers:[],metadata:{}
});
const track=(name,kind,children)=>({
 OTIO_SCHEMA:'Track.1',name,kind,children,source_range:null,
 effects:[],markers:[],enabled:true,metadata:{}
});
const mediaName=(input)=>{
 assert(typeof input.sha256==='string'&&/^[a-f0-9]{64}$/u.test(input.sha256),
  'accepted source must have its actual SHA-256');
 const extension=extensions[input.mimeType];
 assert(extension,'unsupported editorial input media type');
 return input.sha256+extension;
};
const mediaClip=(job,input,frames,fps,packagePath,metadata={})=>{
 const mediaFile=join(packagePath,'media',mediaName(input));
 const mediaDuration=Math.max(1,Math.floor(input.durationSeconds*fps+0.000001));
 assert(frames<=mediaDuration,'source media is shorter than the editorial cut '+job.id);
 const mediaRef={
  OTIO_SCHEMA:'ExternalReference.1',name:basename(mediaFile),
  target_url:pathToFileURL(mediaFile).href,
  available_range:span(0,mediaDuration,fps),
  metadata:{causeway:{originalSha256:input.sha256,
    packageRelativePath:'media/'+mediaName(input),
    actualSourceMime:input.mimeType}}
 };
 return {
  OTIO_SCHEMA:'Clip.2',name:job.id,enabled:true,effects:[],markers:[],
  active_media_reference_key:'DEFAULT_MEDIA',
  media_references:{DEFAULT_MEDIA:mediaRef},
  source_range:span(0,frames,fps),
  metadata:{causeway:{jobId:job.id,sha256:input.sha256,
    rightsRef:input.rightsRef,reviewRef:input.reviewRef,...metadata}}
 };
};

/**
 * Render *one editorial projection* of the accepted production source.
 * No extra script world or independent edit ledger; shot/voice timing is
 * derived exclusively from the existing compiled proposal.
 *
 * The file:// URLs point at THIS package's media. Moving/copying it to a
 * different location requires ordinary editor relinking from retained SHA
 * basenames; original source path is deliberately not recorded.
 */
export function projectMicrodramaEditorial({plan,inputs,packagePath}={}){
 assert(plan?.type==='MicrodramaProductionProposal'&&plan.status==='PROPOSED_NOT_ADMITTED',
  'existing compiled microdrama plan is required');
 assert(Array.isArray(plan.jobs?.video)&&Array.isArray(plan.jobs?.speech)&&Array.isArray(inputs),
  'accepted source inputs and video/voice jobs are required');
 const fps=plan.frameRate,allFrames=plan.totalFrames;
 assert(positive(fps)&&positive(allFrames),'video frame geometry is invalid');
 const path=resolve(packagePath);
 const inputMap=new Map();
 for(const input of inputs){
  assert(input&&typeof input.jobId==='string'&&!inputMap.has(input.jobId),
   'observed media inputs must have distinct job identities');
  inputMap.set(input.jobId,input);
 }
 assert(inputMap.size===plan.jobs.video.length+plan.jobs.speech.length,
  'every expected video and voice job requires precisely one source');
 const video=[],nativeAudio=[],speech=[];
 let total=0;
 for(const job of plan.jobs.video){
  const input=inputMap.get(job.id);
  assert(input,'missing accepted film shot '+job.id);
  assert(positive(job.durationFrames)&&job.fps===fps,'invalid film shot frames');
  const frameLength=job.durationFrames;
  const scene={shotId:job.shotId,beatId:job.beatId,
   locationId:job.location?.id??null,cast:job.cast?.map(c=>c.id)??[],
   camera:job.camera,audioMode:job.audioMode??'separate-voice'};
  video.push(mediaClip(job,input,frameLength,fps,path,scene));
  if(job.audioMode==='embedded-performance'){
   assert(input.audioReviewRef,'native film dialogue requires source audio review');
   nativeAudio.push(mediaClip(job,input,frameLength,fps,path,
    {shotId:job.shotId,role:'embedded-original-performance',
     audioReviewRef:input.audioReviewRef}));
  }else nativeAudio.push(gap(frameLength,fps));
  total+=frameLength;
 }
 assert(total===allFrames,'source shots must exactly fill the edit');
 const voices=[...plan.jobs.speech].sort((a,b)=>a.startFrame-b.startFrame||a.id.localeCompare(b.id));
 let cursor=0;
 for(const voice of voices){
  const input=inputMap.get(voice.id);
  assert(input,'missing accepted voice '+voice.id);
  assert(Number.isSafeInteger(voice.startFrame)&&Number.isSafeInteger(voice.endFrame)&&
   voice.startFrame>=cursor&&voice.endFrame<=allFrames&&voice.endFrame>voice.startFrame,
   'speech editing slots must be contiguous, non-overlapping and inside film');
  if(voice.startFrame>cursor)speech.push(gap(voice.startFrame-cursor,fps));
  const available=Math.floor(input.durationSeconds*fps+0.000001);
  const actual=Math.min(voice.endFrame-voice.startFrame,available);
  assert(actual>0,'voice recording contains no usable audio frames');
  speech.push(mediaClip(voice,input,actual,fps,path,
   {shotId:voice.shotId,speakerId:voice.speakerId,role:'separately-accepted-dialogue'}));
  cursor=voice.startFrame+actual;
 }
 if(cursor<allFrames)speech.push(gap(allFrames-cursor,fps));
 const durationOf=t=>t.children.reduce((sum,x)=>sum+x.source_range.duration.value,0);
 const tracks=[
  track('V1 — selected cinematic takes','Video',video),
  track('A1 — native performances','Audio',nativeAudio),
  track('A2 — licensed / generated dialogue','Audio',speech),
 ];
 for(const t of tracks)assert(durationOf(t)===allFrames,
  'professional editorial tracks must agree on frame-accurate total');
 return {
  OTIO_SCHEMA:'Timeline.1',
  name:plan.seriesId+' / '+plan.episodeId,
  global_start_time:rational(0,fps),
  tracks:{
   OTIO_SCHEMA:'Stack.1',name:'Editorial tracks',children:tracks,source_range:null,
   effects:[],markers:[],enabled:true,metadata:{}
  },
  metadata:{causeway:{
   purpose:'EDITABLE_INTERNAL_PRODUCTION_NOT_PUBLICATION',
   sourceOriginRef:plan.source?.originRef??null,
   seriesId:plan.seriesId,episodeId:plan.episodeId,
   frameRate:fps,totalFrames:allFrames,
   transcriptSidecar:'captions.srt',
   editorialAuthority:'Causeway Public Fiction; final sequence and rights still need independent receiving',
   mediaUriScope:'file URLs in this local package; relink by SHA filename when moved',
  }}
 };
}

/**
 * No provider API and NO image/video generation. Existing accepted inputs
 * are verified through the original FFprobe/FFmpeg custody gate; media are
 * copied byte-for-byte into an atomic sibling editorial package.
 * The source originals are never overwritten or consumed.
 */
export async function materializeMicrodramaEditorial({
 plan,manifest,assetRoot,outputDir,ffmpegTimeoutMs=300000
}={}){
 assert(typeof outputDir==='string'&&outputDir.trim(),'a new editable output directory is required');
 const target=resolve(outputDir);
 const already=await stat(target).then(()=>true).catch(e=>{if(e.code==='ENOENT')return false;throw e;});
 assert(!already,'editable film package already exists; never overwrite source edit');
 const inputs=await receiveMicrodramaInputs({plan,manifest,assetRoot,ffmpegTimeoutMs});
 await mkdir(dirname(target),{recursive:true});
 const staging=await mkdtemp(join(dirname(target),'.microdrama-editorial-'));
 try{
  await mkdir(join(staging,'media'));
  const seen=new Set();
  for(const input of inputs){
   const name=mediaName(input);
   if(seen.has(name))continue;
   seen.add(name);
   const copied=join(staging,'media',name);
   await copyFile(input.file,copied);
   assert(await sha256(copied)===input.sha256,
    'copied editorial source differs from independently verified source');
  }
  const edit=projectMicrodramaEditorial({plan,inputs,packagePath:target});
  const bytes=Buffer.from(JSON.stringify(edit,null,2)+'\n','utf8');
  await writeFile(join(staging,'edit.otio'),bytes);
  await writeFile(join(staging,'captions.srt'),plan.subtitlesSrt,'utf8');
  const tracks=edit.tracks.children;
  const hasExisting=await stat(target).then(()=>true).catch(e=>{if(e.code==='ENOENT')return false;throw e;});
  assert(!hasExisting,'another editor published the destination while this edit was staged');
  await rename(staging,target);
  return Object.freeze({
   type:'MicrodramaEditorialPackage',status:'EDITABLE_FILM_REQUIRES_INDEPENDENT_FINAL_REVIEW',
   packagePath:target,editPath:join(target,'edit.otio'),captionsPath:join(target,'captions.srt'),
   timelineSha256:digest(bytes),frameRate:plan.frameRate,frames:plan.totalFrames,
   durationSeconds:plan.durationSeconds,mediaFiles:seen.size,
   videoClips:tracks[0].children.length,nativeAudioEdits:tracks[1].children.length,
   speechEdits:plan.jobs.speech.length,
   note:'Editable local media package; does not prove creative canon, original rights, NLE adapter import, audio mastering, paid provider settlement, publication or audience.'
  });
 }finally{
  await rm(staging,{recursive:true,force:true});
 }
}
