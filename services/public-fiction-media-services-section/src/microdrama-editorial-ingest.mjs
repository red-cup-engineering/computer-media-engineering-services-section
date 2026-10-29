/**
 * Provider-neutral received film -> source-owned Causeway editorial custody.
 * One approved film needs one ORIGINAL accepted shot per source video job and
 * one accepted audio source for every external speech job. Shared video models,
 * local performers and approved customer footage all use the SAME existing
 * MicrodramaAssetManifest and FFmpeg/OTIO assembler; no provider-specific
 * duplicate editing pipeline, new canon or source-less resource table.
 *
 * Source references are claims; independent provenance and editor authority
 * must actually be received upstream. Actual input bytes are rehashed, copied
 * once and independently decoded after staging.
 */
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {copyFile,mkdir,mkdtemp,readFile,realpath,rename,rm,stat,writeFile}
 from 'node:fs/promises';
import {dirname,isAbsolute,join,relative,resolve,sep} from 'node:path';
import {validateAssemblyManifest,receiveMicrodramaInputs}
 from './microdrama-assembly.mjs';
const check=(condition,message)=>{if(!condition)throw new TypeError(message)};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const name=(x,label,max=800)=>{
 check(typeof x==='string'&&x.trim()&&x.length<=max,label+' must be bounded text');
 return x.trim();
};
const HASH=/^[a-f0-9]{64}$/u;
const MIME=Object.freeze({
 'video/mp4':'.mp4','video/webm':'.webm',
 'audio/wav':'.wav','audio/mpeg':'.mp3','audio/ogg':'.ogg'
});
const stablePath=value=>{
 const p=name(value,'original private media path',1000);
 check(!isAbsolute(p)&&!p.includes('\\')&&
  p.split('/').every(s=>s&&s!=='.'&&s!=='..'),
  'original source path must be private custody-relative');
 return p;
};
async function hashFile(file){
 const h=createHash('sha256');
 for await(const bytes of createReadStream(file))h.update(bytes);
 return h.digest('hex');
}
const exists=async path=>stat(path).then(()=>true).catch(e=>{
 if(e.code==='ENOENT')return false;throw e;
});
async function ownedSource(value){
 const root=await realpath(name(value.custodyRoot,'actual source root'));
 const path=await realpath(resolve(root,stablePath(value.relativePath)));
 const sub=relative(root,path);
 check(sub&&!sub.startsWith('..'+sep)&&sub!=='..'&&!isAbsolute(sub),
  'source provider or voice media escaped its owning custody boundary');
 const info=await stat(path);
 check(info.isFile()&&info.size>=512&&info.size<=300_000_000,
  'source media must be a real bounded file');
 return {path,info};
}
/**
 * Exact video/audio review records are inputs, not output from a provider
 * generation. No accepted source job is inferred from an MP4 checksum alone.
 */
export function planMicrodramaEditorialIngest({plan,sources,parentReviewRef}={}){
 check(plan?.type==='MicrodramaProductionProposal'&&
  plan.status==='PROPOSED_NOT_ADMITTED'&&
  Array.isArray(plan.jobs?.video)&&Array.isArray(plan.jobs?.speech),
  'independently compiled source film is required');
 name(parentReviewRef,'independent assembled-asset review collection');
 check(Array.isArray(sources)&&sources.length<=400,'actual reviewed media inputs required');
 const byJob=new Map(),needed=[...plan.jobs.video,...plan.jobs.speech];
 const expected=new Map(needed.map(x=>[x.id,x]));
 check(expected.size===needed.length,'source film has duplicated original video and speech job identities');
 for(const source of sources){
  check(object(source),'received media asset must be a record');
  const jobId=name(source.jobId,'exact source media worklot');
  check(expected.has(jobId),'the source film never requested job '+jobId);
  check(!byJob.has(jobId),'two independently accepted takes cannot replace one original shot');
  const job=expected.get(jobId);
  const kind=job.durationFrames!==undefined?'video':'audio';
  check(source.kind===kind,'received media class differs from the actual source job');
  check(source.sourceRef===job.sourceRef,'provider or performer source revision differs from original film');
  check(source.reviewState==='accepted','editorial source must have an independent accepted review');
  const sha256=name(source.sha256,'original source bytes SHA-256',64);
  check(HASH.test(sha256),'source SHA-256 must be exact');
  const mimeType=name(source.mimeType,'original media MIME',40);
  check(MIME[mimeType]&&
   (kind==='video'?mimeType.startsWith('video/'):mimeType.startsWith('audio/')),
   'reviewed input uses a mismatched unsupported audiovisual codec');
  const reviewRef=name(source.reviewRef,'real independent source acceptance reference');
  const rightsRef=name(source.rightsRef,'original footage and voice usage rights');
  const root=name(source.custodyRoot,'actual media source custody');
  const path=stablePath(source.relativePath);
  const audioReviewRef=kind==='video'&&job.audioMode==='embedded-performance'?
   name(source.audioReviewRef,'independently accepted native performed audio'):null;
  byJob.set(jobId,Object.freeze({
   jobId,kind,sha256,mimeType,
   custodyRoot:root,sourceRelativePath:path,
   sourceRef:job.sourceRef,rightsRef,reviewRef,
   ...(audioReviewRef?{audioReviewRef}:{}),
   ...(source.reuseAuthorityRef?{reuseAuthorityRef:name(source.reuseAuthorityRef,
     'explicit repeated-content creative authority')}: {})
  }));
 }
 const missing=needed.filter(job=>!byJob.has(job.id)).map(job=>job.id);
 const duplicateSourceUsage=new Map();
 for(const row of byJob.values()){
  const prior=duplicateSourceUsage.get(row.sha256);
  if(prior&&prior.jobId!==row.jobId){
   check(prior.reuseAuthorityRef&&row.reuseAuthorityRef&&
    prior.reuseAuthorityRef===row.reuseAuthorityRef,
    'reusing identical original video/voice bytes across source scenes needs separate creative authorization');
  }else duplicateSourceUsage.set(row.sha256,row);
 }
 const assets=needed.map(job=>byJob.get(job.id)).filter(Boolean).map(raw=>Object.freeze({
  jobId:raw.jobId,kind:raw.kind==='audio'?'speech':'video',reviewState:'accepted',
  relativePath:'media/'+raw.sha256+MIME[raw.mimeType],
  sha256:raw.sha256,mimeType:raw.mimeType,rightsRef:raw.rightsRef,
  reviewRef:raw.reviewRef,
  ...(raw.audioReviewRef?{audioReviewRef:raw.audioReviewRef}:{})
 }));
 const manifest=Object.freeze({
  type:'MicrodramaAssetManifest',
  reviewRef:parentReviewRef,
  assets:Object.freeze(assets)
 });
 if(!missing.length)validateAssemblyManifest(plan,manifest);
 return Object.freeze({
  type:'MicrodramaEditorialIngestPlan',version:1,
  sourceFilm:{seriesId:plan.seriesId,episodeId:plan.episodeId,
   originRef:plan.source.originRef},
  status:missing.length?'HELD_MISSING_ACCEPTED_ORIGINAL_AV_MEDIA':
   'COMPLETE_ORIGINAL_MEDIA_READY_FOR_BYTE_CHECK_AND_EDITING',
  missingJobs:Object.freeze(missing),
  inputRecords:Object.freeze([...byJob.values()]),
  manifest,
  note:'Source review identities are independent external claims; actual checked media and legal editorial authority are not established until separate receiving.'
 });
}


/**
 * Adapt the ACTUAL Causeway MediaArtifactReview of a Red Cup original Veo
 * completion, rather than making a producer retype guessed accepted media.
 * Must be independently reviewed through the existing journal; a downloaded
 * provider MP4 and its technical assay do not grant artistic acceptance.
 *
 * The returned source is directly consumed by planMicrodramaEditorialIngest,
 * alongside independently accepted real dialogue/voice recordings. Do not
 * confuse this with the provider receipt: review is separate source evidence.
 */
export function projectReviewedCinematicVeoEditorialSource({
 cinematicReceiving,mediaArtifactReview,reviewRecordRef,rightsRef,audioReviewRef=null
}={}){
 const received=cinematicReceiving,review=mediaArtifactReview;
 check(object(received)&&received.type==='MicrodramaProviderCinematicReceiving'&&
  received.status==='ACTUAL_VIDEO_BYTES_DECODED_AWAITING_ARTISTIC_ACCEPTANCE'&&
  object(received.providerArtifact)&&
  received.technicalAssay?.state==='DECODED_REQUIRES_INDEPENDENT_PERFORMANCE_AND_CONTINUITY_REVIEW',
  'editorial source needs actually decoded Red Cup cinematic provider bytes');
 const provider=received.providerArtifact;
 check(provider.provider==='urn:ame:google-gemini-developer-api'&&
  provider.purpose===received.jobId&&
  provider.mimeType==='video/mp4'&&
  Array.isArray(provider.sourceIdentities)&&provider.sourceIdentities.length===1,
  'provider source/job identity is not an admitted cinematic worklot');
 const observed=received.technicalAssay.media;
 const sha256=name(observed.sha256,'actual decoded MP4 SHA-256',64);
 check(HASH.test(sha256)&&sha256===provider.observedMediaSha256&&
  provider.output==='ni:///sha-256;'+Buffer.from(sha256,'hex').toString('base64url')&&
  sha256===name(provider.observedMediaSha256,'original video byte source',64)&&
  provider.observedMediaSizeBytes===observed.bytes,
  'source video file, provider digest and independently decoded bytes disagree');
 check(object(review)&&review.type==='MediaArtifactReview'&&review.version===1&&
  review.accepted===true&&review.provider===provider.provider&&
  review.completionId===provider.completionId&&
  review.allocation===provider.allocation&&
  review.mediaNeed===provider.mediaNeed&&
  review.purpose===received.jobId&&
  review.asset?.sha256===sha256&&review.asset?.mimeType==='video/mp4'&&
  review.asset?.metadataSanitized===true&&
  review.asset?.width===observed.video.width&&
  review.asset?.height===observed.video.height,
  'independently accepted media review differs from original paid film, job or actual pixels');
 // The existing MediaArtifactReview contract requires transcriptRef for video,
 // but a transcript review is NOT a performed dialogue/sync review; native
 // audio keeps a separate sound-acceptance identity.
 name(review.asset.transcriptRef,'original independent subtitle/transcript source');
 name(review.authority,'independent editorial actor');
 name(review.basis,'actual film quality/rights receiving basis');
 const acceptedPath=stablePath(review.asset.relativePath);
 check(acceptedPath===stablePath(received.sourceRelativePath),
  'review asset path differs from actual original provider custody');
 const reviewedSource=provider.sourceIdentities[0];
 name(reviewedSource,'exact licensed original screenplay source');
 const rights=name(rightsRef,'source-specific producer licensed film use');
 const embedded=received.technicalAssay.media.audio!==null;
 // A native-audio video is not necessarily an embedded-performance job. Only
 // the source job's audio mode, and its independent acceptance, can decide
 // whether that stream is included in the final mix.
 const sound=audioReviewRef===null?null:
  name(audioReviewRef,'independently reviewed native performed audio');
 return Object.freeze({
  type:'MicrodramaReviewedSourceProjection',version:1,
  state:'REVIEWED_PROVIDER_SOURCE_READY_FOR_ASSEMBLY_CUSTODY_CHECK',
  jobId:received.jobId,kind:'video',sourceRef:reviewedSource,
  sha256,mimeType:'video/mp4',
  custodyRoot:name(received.sourceRoot,'source provider custody'),
  relativePath:acceptedPath,reviewState:'accepted',
  reviewRef:name(reviewRecordRef,'independently received source review journal identity'),
  rightsRef:rights,
  ...(sound?{audioReviewRef:sound}:{}),
  observedSourceFrameRate:observed.video.frameRate,
  observedSoundStreamPresent:embedded,
  providerOperation:provider.completionId,
  limitation:'Review identity, rights, original source and native audio acceptance are externally claimed evidence; actual input bytes and story performance remain independently received.'
 });
}

export async function manufactureMicrodramaEditorialIngest({
 plan,ingestPlan,outputDir,ffmpegTimeoutMs=300000
}={}){
 check(ingestPlan?.type==='MicrodramaEditorialIngestPlan'&&
  ingestPlan.status==='COMPLETE_ORIGINAL_MEDIA_READY_FOR_BYTE_CHECK_AND_EDITING',
  'all original source audio and video must be independently accepted before editor ingest');
 check(plan?.seriesId===ingestPlan.sourceFilm.seriesId&&
  plan?.episodeId===ingestPlan.sourceFilm.episodeId&&
  plan?.source?.originRef===ingestPlan.sourceFilm.originRef,
  'editor ingest source was revised after source approval');
 validateAssemblyManifest(plan,ingestPlan.manifest);
 const target=resolve(name(outputDir,'new private editorial media directory',4000));
 check(!await exists(target),'a prior accepted editorial media package already occupies destination');
 await mkdir(dirname(target),{recursive:true});
 const staging=await mkdtemp(join(dirname(target),'.film-edit-ingest-'));
 try{
  await mkdir(join(staging,'media'));
  const unique=new Map();
  for(const record of ingestPlan.inputRecords){
   const {path}=await ownedSource({
    custodyRoot:record.custodyRoot,relativePath:record.sourceRelativePath});
   check(await hashFile(path)===record.sha256,
    'original provider video/voice bytes changed after claimed independent acceptance');
   const dest=join(staging,'media',record.sha256+MIME[record.mimeType]);
   if(unique.has(dest))continue;
   await copyFile(path,dest);
   check(await hashFile(dest)===record.sha256,
    'copied cinematic take differs from source-owned bytes');
   unique.set(dest,record.sha256);
  }
  // Reuse the ORIGINAL codec/geometry/rights receiving gate, including
  // embedded dialogue stream assays and performance audio durations.
  const observed=await receiveMicrodramaInputs({
   plan,manifest:ingestPlan.manifest,assetRoot:staging,
   ffmpegTimeoutMs});
  check(observed.length===plan.jobs.video.length+plan.jobs.speech.length,
   'actual editor failed to receive every original cinematic worklot');
  const output=Buffer.from(JSON.stringify(ingestPlan.manifest,null,2)+'\n');
  await writeFile(join(staging,'accepted-media-manifest.json'),output,
   {flag:'wx',mode:0o600});
  check(!await exists(target),'another editor staged a conflicting media package');
  await rename(staging,target);
  return Object.freeze({
   type:'MicrodramaSourceVerifiedEditorialIngest',version:1,
   status:'EXACT_AV_BYTES_STAGED_AWAITING_FINAL_FILM_ASSEMBLY',
   sourceFilm:ingestPlan.sourceFilm,
   assetRoot:target,assetManifestPath:join(target,'accepted-media-manifest.json'),
   manifestSha256:createHash('sha256').update(output).digest('hex'),
   acceptedJobs:observed.length,uniqueMediaFiles:unique.size,
   embeddedPerformanceReviewFlags:observed.filter(x=>x.technicalAssay).map(x=>({
    jobId:x.jobId,sourceSha256:x.sha256,reviewFlags:x.technicalAssay.reviewFlags,
    temporalLumaChange:x.technicalAssay.temporalLumaChange
   })),
   note:'Actual accepted original film sources were decoded and staged. Final movie, audience, review-authenticity, costs and publication remain separately received.'
  });
 }finally{await rm(staging,{recursive:true,force:true})}
}
