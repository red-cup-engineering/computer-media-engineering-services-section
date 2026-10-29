/**
 * Existing Public Fiction -> Existing Red Cup Gemini Veo operator.
 * One source/rights-approved episode + actual original art produces PRIVATE
 * shot specs consumable by Red Cup's current gemini-veo-shot.mjs.
 *
 * Does not fork canon, art, the model adapter or an order ledger.
 * Requires 8-second Veo reference-guided clips, 9:16, and up to 3 exact
 * image references. Original source shot remains the only edit authority.
 */
import {createHash} from 'node:crypto';
import {assayMicrodramaShot} from './microdrama-shot-assay.mjs';
import {createReadStream} from 'node:fs';
import {copyFile,mkdir,mkdtemp,readFile,realpath,rename,rm,stat,writeFile} from 'node:fs/promises';
import {dirname,isAbsolute,join,relative,resolve,sep} from 'node:path';

const check=(value,message)=>{if(!value)throw new TypeError(message)};
const row=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const label=(v,name,max=1024)=>{
 check(typeof v==='string'&&!!v.trim()&&v.length<=max,name+' requires bounded text');
 return v.trim();
};
const NI=/^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
const SOURCE=/^(?:ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}|sha256:[a-f0-9]{64}|git:[a-f0-9]{40})$/u;
const SHA=/^[a-f0-9]{64}$/u;
const ID=/^[a-z0-9][a-z0-9-]{0,79}$/u;
const IMAGE=Object.freeze({'image/png':'.png','image/jpeg':'.jpg'});
const MODELS=new Set(['veo-3.1-generate-preview','veo-3.1-fast-generate-preview']);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const asNi=hex=>'ni:///sha-256;'+Buffer.from(hex,'hex').toString('base64url');
const isUnique=(arr,key)=>new Set(arr.map(key)).size===arr.length;
const relativeFile=value=>{
 const file=label(value,'source image path',1000);
 check(!isAbsolute(file)&&!file.includes('\\')&&
  file.split('/').every(s=>s&&s!=='.'&&s!=='..'),'source file must be clean relative custody');
 return file;
};
const exactSource=(value,name)=>{
 const source=label(value,name,256);
 check(SOURCE.test(source),name+' requires exact source SHA, NI or git revision');
 return source;
};
const exactNi=(value,name)=>{
 const identity=label(value,name,90);
 check(NI.test(identity),name+' must be exact SHA-256 NI');
 return identity;
};
const checkedRef=raw=>{
 check(row(raw),'accepted visual reference must be structured');
 const kind=label(raw.kind,'visual kind');
 check(['character','location','scene'].includes(kind),
  'reference must be an original actor, location or director-approved scene composition');
 const id=label(raw.id,'visual actor/location id',80);
 check(ID.test(id),'visual actor/location id is not a canonical slug');
 const visualNi=exactNi(raw.visualNi,'approved visual SHA');
 const sha256=label(raw.sha256,'visual bytes SHA-256',64);
 check(SHA.test(sha256)&&asNi(sha256)===visualNi,
  'visual SHA and approved source NI disagree');
 const mimeType=label(raw.mimeType,'visual media MIME',40);
 check(IMAGE[mimeType],'Veo images must be approved PNG or JPEG bytes');
 return Object.freeze({kind,id,visualNi,sha256,mimeType,
  rightsRef:label(raw.rightsRef,'image rights evidence',500),
  relativePath:relativeFile(raw.relativePath)});
};
async function shaFile(file){
 const h=createHash('sha256');
 for await(const chunk of createReadStream(file))h.update(chunk);
 return h.digest('hex');
}
async function ownedFile(root,file){
 const physical=await realpath(resolve(root,file));
 const rel=relative(root,physical),info=await stat(physical);
 check(!!rel&&rel!=='..'&&!rel.startsWith('..'+sep)&&!isAbsolute(rel)&&
  info.isFile(),'source image escapes its owning private custody');
 check(info.size>=64&&info.size<=15*1024*1024,'source image size outside Veo bounds');
 return physical;
}
const scriptPrompt=(job,refs,approval)=>{
 const sceneSeconds=job.durationFrames/30;
 const lines=job.spokenDialogue.map(line=>{
  const actor=job.cast.find(x=>x.id===line.speakerId);
  check(actor,'unapproved voice speaks in a source camera shot');
  return 'From '+(line.startFrame/30).toFixed(3)+' to '+
   (line.endFrame/30).toFixed(3)+' seconds, '+actor.name+
   ' ('+actor.id+') says EXACTLY: '+JSON.stringify(line.text)+'.';
 });
 const fixed=[
  'One ORIGINAL dramatic 9:16 cinematic film shot. Perform real character ACTION with physical motion, expressive original acting, atmospheric lighting, plausible lens and depth. No captions, letters, logos, UI, watermarks or subtitles.',
  'The image references are original APPROVED physical designs and location: '+
   refs.map(ref=>ref.display+' ('+ref.kind+')').join('; ')+
   '. Keep exact distinctive anatomies, fabric/materials, facial structure, nonhuman limbs and location continuity. Do not recast or redesign.',
  'On-screen dramatic action: '+job.action+'. Camera and framing: '+job.camera+'. Fictional setting: '+job.location.id+'.',
  'Complete the authored dramatic action within the FIRST '+
   sceneSeconds.toFixed(3)+' seconds. This is an 8-second media-source take; the existing editor will cut at exactly '+job.durationFrames+' frames at 30fps.',
  job.audioMode==='embedded-performance'?
   'Record acting, original foley and ambience. Perform ONLY these actual scripted lines with synchronized lip/body timing: '+
    (lines.length?lines.join(' '):'There is no spoken dialogue; keep purposeful original ambience.'):
   'Shoot intelligible VISUAL acting, environmental sound and foley without invented speech. The separately accepted original dialogue will be mixed in the editing room. Timed editor cue sheet: '+
    (lines.length?lines.join(' '):'This shot has no dialogue.'),
  'Keep this scene within the original fictional visual world. Do not add new characters, historical claims, logos, or dialogue absent from the source.'
 ];
 const prompt=fixed.join('\n');
 return prompt;
};
/** A spec retains actual original image SHA/path, not duplicated image bytes. */
export function planCinematicVeoShoot({plan,approval,images,
 model='veo-3.1-fast-generate-preview',resolution='1080p'}={}){
 check(plan?.type==='MicrodramaProductionProposal'&&plan.status==='PROPOSED_NOT_ADMITTED'&&
  plan.frameRate===30&&plan.aspectRatio==='9:16'&&
  Array.isArray(plan.jobs?.video)&&plan.jobs.video.length>0,
  'source-approved compiled 30fps 9:16 film proposal required');
 check(row(approval)&&approval.decision==='approved-original-cinematic-shoot',
  'one independent creative producing decision must admit the film');
 const sourceRef=exactSource(approval.sourceRef,'accepted story source');
 check(sourceRef===plan.source.originRef,'shooting decision and story source disagree');
 const consumer=label(approval.consumer,'original film consumer');
 check(consumer===plan.mediaNeedCandidate?.consumer,'producer does not own the original media need');
 const mediaNeedRef=exactNi(approval.mediaNeedRef,'independently admitted media need');
 const rightsRef=label(approval.rightsRef,'accepted original story/performance rights');
 const creativeAuthorityRef=label(approval.creativeAuthorityRef,'independent film creative approval');
 const providerProcessingAuthorizationRef=label(
  approval.providerProcessingAuthorizationRef,'approved external Veo processing and confidentiality');
 const clientPrivacyRef=label(approval.clientPrivacyRef,'original confidential source and customer privacy boundary');
 check(approval.authorizedProvider==='urn:ame:google-gemini-developer-api',
  'the customer and producing office must explicitly authorize this external video provider');
 check(MODELS.has(model),'chosen model does not support source reference images');
 check(['720p','1080p','4k'].includes(resolution),'unsupported Veo resolution');
 check(Array.isArray(approval.shotIds)&&approval.shotIds.length>0&&
  approval.shotIds.length<=plan.jobs.video.length&&isUnique(approval.shotIds,x=>x),
  'original creative admission needs unique selected source shots');
 for(const shotId of approval.shotIds)
  check(plan.jobs.video.some(x=>x.shotId===shotId),'approval names an unknown source shot');
 check(Array.isArray(images)&&images.length<=100,'source image manifest must be a bounded list');
 const refs=images.map(checkedRef);
 check(isUnique(refs,x=>x.kind+'\0'+x.id),'conflicting image identities for same original role');

 // A composite is preexisting ORIGINAL scene art and an exact source-authorized
 // statement of which characters and environment it depicts. This permits
 // group shots without silently dropping an actor to satisfy a 3-image model.
 const approvedComposites=approval.sceneReferences??[];
 check(Array.isArray(approvedComposites)&&approvedComposites.length<=approval.shotIds.length,
  'scene visual compositions must be bounded source-owned creative decisions');
 check(isUnique(approvedComposites,x=>x?.shotId),
  'duplicate scene compositions for one original shot are ambiguous');
 const composites=new Map();
 for(const request of approvedComposites){
  check(row(request),'original composed shot must be a record');
  const shotId=label(request.shotId,'source composite target shot',80);
  const id=label(request.id,'source composite visual id',80);
  check(ID.test(id)&&approval.shotIds.includes(shotId),
   'source composite applies only to an admitted selected shot and stable visual id');
  const visualNi=exactNi(request.visualNi,'source composite accepted original image');
  check(request.sourceRef===sourceRef,'scene composite creative source revision diverged');
  check(request.creativeAuthorityRef===creativeAuthorityRef,
   'scene composite lacks current independent original creative approval');
  const rightsRef=label(request.rightsRef,'source composed ensemble visual rights');
  check(Array.isArray(request.covers)&&request.covers.length>=2&&request.covers.length<=24&&
   isUnique(request.covers,x=>x?.kind+'\0'+x?.id),
   'scene composite must enumerate exact uniquely identified source cast and setting');
  const covers=request.covers.map(x=>{
   check(row(x)&&['character','location'].includes(x.kind),
    'scene image must name actual source-owned character and setting identities');
   const originalId=label(x.id,'covered source being or place',80);
   check(ID.test(originalId),'covered source being/place must be a stable id');
   return Object.freeze({kind:x.kind,id:originalId,
    visualNi:exactNi(x.visualNi,'covered original character or place NI')});
  });
  composites.set(shotId,Object.freeze({shotId,id,visualNi,rightsRef,
   covers:Object.freeze(covers)}));
 }

 const refByRole=new Map(refs.map(x=>[x.kind+'\0'+x.id,x]));
 const jobs=[];
 const auth={rightsRef,creativeAuthorityRef};
 for(const job of plan.jobs.video.filter(j=>approval.shotIds.includes(j.shotId))){
  const requirements=[
   ...job.cast.map(x=>({kind:'character',id:x.id,visualNi:x.visualRef,display:x.name})),
   {kind:'location',id:job.location.id,visualNi:job.location.referenceRef,
    display:job.location.id}
  ];
  const failures=[],present=[];
  for(const wanted of requirements){
   if(!NI.test(wanted.visualNi)){
    failures.push('unapproved-source-visual:'+wanted.kind+':'+wanted.id);continue;
   }
   const ref=refByRole.get(wanted.kind+'\0'+wanted.id);
   if(!ref){failures.push('missing-original-reference:'+wanted.kind+':'+wanted.id);continue;}
   if(ref.visualNi!==wanted.visualNi){
    failures.push('different-reference-than-original-source:'+wanted.kind+':'+wanted.id);continue;
   }
   present.push({...ref,display:wanted.display});
  }
  let actualProviderRefs=present,approvedComposite=null;
  if(requirements.length>3){
   const sourceApproved=composites.get(job.shotId);
   if(!sourceApproved)failures.push('veo-image-reference-limit:'+requirements.length);
   else{
    const actual=refByRole.get('scene\0'+sourceApproved.id);
    if(!actual||actual.visualNi!==sourceApproved.visualNi||
     actual.rightsRef!==sourceApproved.rightsRef)
     failures.push('approved-composite-image-or-original-rights-missing');
    const requires=new Map(requirements.map(x=>[x.kind+'\0'+x.id,x.visualNi]));
    if(sourceApproved.covers.length!==requires.size||
     sourceApproved.covers.some(x=>requires.get(x.kind+'\0'+x.id)!==x.visualNi))
     failures.push('composite-does-not-cover-all-exact-approved-actors-and-location');
    if(actual&&failures.length===0){
     approvedComposite=sourceApproved;
     actualProviderRefs=[{...actual,display:'Original cast-and-setting scene composition'}];
    }
   }
  }
  if(job.sourceRef!==sourceRef)failures.push('shot-source-revision-differs');
  if(job.durationFrames>240||job.durationFrames<1||job.fps!==30)
   failures.push('source-shot-cannot-fit-provider-eight-second-cut');
  if(failures.length){
   jobs.push(Object.freeze({jobId:job.id,shotId:job.shotId,
    state:'HELD_SOURCE_VISUAL_OR_PROVIDER_CONSTRAINT',
    blockers:Object.freeze([...new Set(failures)])}));
   continue;
  }
  const references=actualProviderRefs.map(ref=>Object.freeze({
   kind:ref.kind==='location'?'environment':ref.kind,id:ref.id,
   visualNi:ref.visualNi,sha256:ref.sha256,rightsRef:ref.rightsRef,
   mimeType:ref.mimeType,path:'references/'+ref.sha256+IMAGE[ref.mimeType],
   ...(approvedComposite?{compositeCoverageClaims:approvedComposite.covers,
    compositeCreativeAuthorityRef:creativeAuthorityRef}:{})
  }));
  const prompt=scriptPrompt(job,present,auth);
  // Veo's documented input is 1024 tokens. A bounded conservative character
  // ceiling avoids many obviously impossible source prompts; the Red Cup
  // provider retains final API admission authority.
  if(prompt.length>3600){
   jobs.push(Object.freeze({jobId:job.id,shotId:job.shotId,
    state:'HELD_SOURCE_VISUAL_OR_PROVIDER_CONSTRAINT',
    blockers:Object.freeze(['source-cinema-prompt-exceeds-conservative-model-context'])}));
   continue;
  }
  const spec=Object.freeze({
   shotId:job.shotId,sourceRef:job.sourceRef,consumer,mediaNeed:mediaNeedRef,
   prompt,model,aspectRatio:'9:16',resolution,durationSeconds:8,
   referenceImages:references.map(ref=>Object.freeze({
    id:ref.kind+'-'+ref.id,path:ref.path,mimeType:ref.mimeType,
    sha256:ref.sha256,rightsRef:ref.rightsRef}))
  });
  jobs.push(Object.freeze({jobId:job.id,shotId:job.shotId,
   state:'EXISTING_RED_CUP_VEO_SPEC_READY_FOR_PAID_OPERATOR',
   references:Object.freeze(references),
   ...(approvedComposite?{approvedSceneComposition:approvedComposite}:{}),
   spec,sourceFrames:job.durationFrames,shotSeconds:job.durationFrames/30,
   audioMode:job.audioMode}));
 }
 const ready=jobs.filter(x=>x.spec),held=jobs.filter(x=>!x.spec);
 return Object.freeze({
  type:'MicrodramaVeoShootingPlan',version:1,
  status:held.length?'PARTIAL_SHOOT_NEEDS_ORIGINAL_SOURCE_REPAIR':
   'SOURCE_ADMITTED_SHOTS_READY_FOR_PROVIDER_OPERATOR',
  sourceRef,consumer,mediaNeedRef,rightsRef,creativeAuthorityRef,
  providerProcessingAuthorizationRef,clientPrivacyRef,
  authorizedProvider:approval.authorizedProvider,
  model,resolution,seriesId:plan.seriesId,episodeId:plan.episodeId,
  shots:Object.freeze(jobs),readyShotCount:ready.length,heldShotCount:held.length,
  oneAttemptBilledSeconds:ready.length*8,
  note:'Red Cup receives exact original shot specs and private bytes. Source claims are not cryptographically authenticated, no spending or accepting is performed by this producer projection.'
 });
}
/** Copy original image bytes once into a real private Red Cup operator bundle. */
export async function manufactureCinematicVeoShootingPackage({
 shootPlan,images,imageRoot,outputDir
}={}){
 check(shootPlan?.type==='MicrodramaVeoShootingPlan'&&Array.isArray(shootPlan.shots),
  'source-authorized shooting projection required');
 check(Array.isArray(images),'accepted original reference inputs required');
 const bySha=new Map(images.map(checkedRef).map(x=>[x.sha256,x]));
 const referenced=[...new Map(shootPlan.shots.filter(x=>x.spec)
  .flatMap(x=>x.references).map(x=>[x.sha256,x])).values()];
 check(referenced.length>0,'no production shot has original approved camera references');
 const root=await realpath(label(imageRoot,'private original image custody'));
 const target=resolve(label(outputDir,'new shooting package directory'));
 const existing=await stat(target).then(()=>true).catch(e=>{if(e.code==='ENOENT')return false;throw e;});
 check(!existing,'original shooting package exists; never overwrite a live source order');
 await mkdir(dirname(target),{recursive:true});
 const staged=await mkdtemp(join(dirname(target),'.film-shoot-'));
 try{
  await mkdir(join(staged,'references'));
  const assets=[];
  for(const ref of referenced){
   const item=bySha.get(ref.sha256);
   check(item&&item.visualNi===ref.visualNi&&
    item.rightsRef===ref.rightsRef&&item.mimeType===ref.mimeType,
    'a referenced original actor/location image changed during production planning');
   const physical=await ownedFile(root,item.relativePath);
   const originalBytes=await readFile(physical);
   const png=ref.mimeType==='image/png'&&
    originalBytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'));
   const jpeg=ref.mimeType==='image/jpeg'&&originalBytes[0]===255&&
    originalBytes[1]===216&&originalBytes[2]===255;
   check(png||jpeg,'original art file signature does not match declared Veo reference MIME');
   check(hash(originalBytes)===ref.sha256,
    'original art differs from its accepted content identity');
   const out=join(staged,ref.path);
   await copyFile(physical,out);
   check(await shaFile(out)===ref.sha256,'private reference copy changed bytes');
   assets.push(Object.freeze({path:ref.path,sha256:ref.sha256,
    identity:ref.visualNi,rightsRef:ref.rightsRef}));
  }
  const shots=[];
  for(const shot of shootPlan.shots.filter(x=>x.spec)){
   const name='shot-'+shot.shotId+'.json';
   const bytes=Buffer.from(JSON.stringify(shot.spec,null,2)+'\n');
   await writeFile(join(staged,name),bytes,{flag:'wx',mode:0o600});
   shots.push(Object.freeze({id:shot.jobId,shotId:shot.shotId,path:name,
    specSha256:hash(bytes),requiredSourceFrames:shot.sourceFrames,
    billableSeconds:8,referenceNis:shot.references.map(r=>r.visualNi)}));
  }
  const manifest={
   type:'MicrodramaVeoShootingPackage',version:1,
   state:shootPlan.heldShotCount?'PARTIAL_SOURCE_HOLDS_REQUIRE_DIRECTOR':
    'PRIVATE_OPERATOR_SOURCE_PACKAGE',
   sourceRef:shootPlan.sourceRef,consumer:shootPlan.consumer,
   mediaNeedRef:shootPlan.mediaNeedRef,
   rightsRef:shootPlan.rightsRef,creativeAuthorityRef:shootPlan.creativeAuthorityRef,
   providerProcessingAuthorizationRef:shootPlan.providerProcessingAuthorizationRef,
   clientPrivacyRef:shootPlan.clientPrivacyRef,
   authorizedProvider:shootPlan.authorizedProvider,
   model:shootPlan.model,resolution:shootPlan.resolution,
   seriesId:shootPlan.seriesId,episodeId:shootPlan.episodeId,
   originalShotSpecs:shots,originalReferenceBytes:assets,
   heldShots:shootPlan.shots.filter(x=>!x.spec).map(x=>({shotId:x.shotId,blockers:x.blockers})),
   note:'Private original film source carrier. Each shot JSON can be passed directly to the existing Red Cup gemini-veo-shot.mjs preview/submit; no model was called and a paid attempt requires a separate producer and USD authorization.'
  };
  await writeFile(join(staged,'shooting-plan.json'),JSON.stringify(shootPlan,null,2)+'\n',
   {flag:'wx',mode:0o600});
  manifest.originalSourceShootingPlanSha256=await shaFile(join(staged,'shooting-plan.json'));
  await writeFile(join(staged,'shooting-package.json'),JSON.stringify(manifest,null,2)+'\n',
   {flag:'wx',mode:0o600});
  await rename(staged,target);
  return Object.freeze({type:manifest.type,status:manifest.state,
   packagePath:target,readyShotCount:shots.length,heldShotCount:manifest.heldShots.length,
   reusedReferenceCount:assets.length,sourceRef:shootPlan.sourceRef});
 }finally{await rm(staged,{recursive:true,force:true})}
}


/**
 * Receive one ACTUAL Red Cup Gemini Veo operation into the existing
 * provider-neutral Causeway film/review vocabulary. Same original source,
 * model, operator, request digest and operation must agree with the private
 * shooting bundle; generated bytes are rehashed and decoded in full.
 *
 * Not an acceptance: independent human/agent receiving must judge lipsync,
 * acting, original character consistency and story consequences afterward.
 */
export async function receiveCinematicGeminiVeoShot({
 shootPlan,shotId,publicPlan,submission,providerByteReceipt,
 providerJobRoot,allocationRef,timeoutMs=120000
}={}){
 check(shootPlan?.type==='MicrodramaVeoShootingPlan'&&
  typeof shotId==='string','one approved source-bound shooting plan/shot is required');
 const shot=shootPlan.shots.find(x=>x.shotId===shotId);
 check(shot?.spec&&shot.state==='EXISTING_RED_CUP_VEO_SPEC_READY_FOR_PAID_OPERATOR',
  'cannot receive unapproved or held original film shot');
 check(record(publicPlan)&&publicPlan.type==='GeminiVeoCinematicShot'&&
  publicPlan.state==='PREPARED_UNSUBMITTED'&&
  publicPlan.shotId===shotId&&publicPlan.sourceRef===shootPlan.sourceRef&&
  publicPlan.consumer===shootPlan.consumer&&
  publicPlan.mediaNeed===shootPlan.mediaNeedRef&&
  publicPlan.model===shootPlan.model&&
  publicPlan.mode==='reference-to-video'&&
  publicPlan.durationSeconds===8&&publicPlan.aspectRatio==='9:16'&&
  publicPlan.resolution===shootPlan.resolution,
  'Gemini provider preview does not match the approved original cinematic source shot');
 // The source name and reference images alone do not bind the actual
 // narrated action, spoken lines or camera instructions. Red Cup's current
 // provider exposes the SHA-256 of EXACT UTF-8 prompt bytes without leaking
 // those private words to the provider's public operation readout. Check it
 // against the approved producing-office shot BEFORE accepting any MP4.
 const actualPromptHash=publicPlan.promptSha256;
 check(typeof actualPromptHash==='string'&&SHA.test(actualPromptHash)&&
  actualPromptHash===hash(Buffer.from(shot.spec.prompt,'utf8')),
  'Gemini provider prompt differs from approved original dramatic screenplay and camera cues');
 check(Array.isArray(publicPlan.referenceAssets)&&
  publicPlan.referenceAssets.length===shot.references.length,
  'source-performed character references disappeared in provider preview');
 for(let i=0;i<shot.references.length;i++){
  const ref=shot.references[i],seen=publicPlan.referenceAssets[i];
  check(seen.id===ref.kind+'-'+ref.id&&seen.sha256===ref.sha256&&
   seen.rightsRef===ref.rightsRef&&seen.mimeType===ref.mimeType,
   'Gemini actual source reference identities/rights differ from the original cast');
 }
 check(record(submission)&&submission.type==='GeminiVeoSubmittedShot'&&
  submission.status==='PROVIDER_OPERATION_PENDING'&&
  submission.shotId===shotId&&submission.model===shootPlan.model&&
  submission.requestSha256===publicPlan.requestSha256&&
  submission.provider==='urn:ame:google-gemini-developer-api',
  'provider operation does not identify original source request and model');
 // Provider "estimated maximum" is the PREPARED scenario, not a charge.
 // An operator can re-label a work receipt with a lower quote unless the
 // source producer matches exactly the upstream Red Cup price that was
 // attached to the same submitted request. Preserve USD as USD: subscription
 // Flow credits have no lawful conversion through this provider contract.
 const quoted=publicPlan.estimatedMaximumUsd,submittedQuote=submission.estimatedMaximumUsd;
 check(Number.isFinite(quoted)&&quoted>=0&&quoted<=10000&&
  Number.isSafeInteger(Math.round(quoted*100))&&
  Math.abs(Math.round(quoted*100)/100-quoted)<1e-9&&
  submittedQuote===quoted,
  'provider submitted USD quote does not match original source-priced video request');
 check(typeof submission.operatorRef==='string'&&submission.operatorRef.trim()&&
  submission.operatorRef.length<=256,
  'a paid provider attempt needs its source-identified spending operator');
 const operation=label(submission.operationName,'real Gemini operation identity',400);
 // Red Cup's accepted provider operations have either Google's documented
 // operations/<id> name or the models/<model>/operations/<id> form.
 // This must agree with the *actual upstream operator*, not impose a
 // second, stricter naming convention that rejects legitimately paid clips.
 check(/^(?:models\/[A-Za-z0-9._-]+\/)?operations\/[A-Za-z0-9._-]+$/u.test(operation),
  'provider operation is not a valid source-identifying Gemini operation');
 check(record(providerByteReceipt)&&
  providerByteReceipt.type==='GeminiVeoProviderByteReceipt'&&
  providerByteReceipt.state==='RECEIVED_PROVIDER_BYTES_AWAITING_MEDIA_REVIEW'&&
  providerByteReceipt.operationName===operation&&
  providerByteReceipt.sourceRequestSha256===publicPlan.requestSha256&&
  providerByteReceipt.shotId===shotId&&
  providerByteReceipt.model===shootPlan.model,
  'provider downloaded output cannot be joined to exact paid shot operation');
 const claimedSha=label(providerByteReceipt.receivedVideoSha256,'downloaded exact video SHA',64);
 check(SHA.test(claimedSha),'downloaded MP4 has no valid exact digest');
 const root=await realpath(label(providerJobRoot,'private Red Cup video job custody'));
 const source=relativeFile(providerByteReceipt.mediaRelativePath);
 const file=await realpath(resolve(root,source)),rel=relative(root,file);
 check(rel&&rel!=='..'&&!rel.startsWith('..'+sep)&&!isAbsolute(rel),
  'Gemini output escaped original provider custody');
 const info=await stat(file);
 check(info.isFile()&&info.size>=1024&&info.size<=200_000_000,
  'provider original cinematic bytes are missing/oversized');
 check(info.size===providerByteReceipt.bytes&&await shaFile(file)===claimedSha,
  'actual decoded video bytes disagree with source-paid provider receipt');
 const observed=await assayMicrodramaShot({
  file,mimeType:'video/mp4',maxSeconds:16,
  expectedAspect:'9:16',requiresAudio:shot.audioMode==='embedded-performance',
  timeoutMs
 });
 check(observed.media.sha256===claimedSha&&observed.media.video.decodedFrames>0&&
  observed.media.durationSeconds+0.1>=shot.shotSeconds,
  'original filmed performance cannot fill its authored scene window');
 const budget=quoted;
 const allocation=label(allocationRef,'independently received production allocation',600);
 const artifact=Object.freeze({
  completionId:operation,
  provider:'urn:ame:google-gemini-developer-api',
  consumer:shootPlan.consumer,
  purpose:shot.jobId,allocation,mediaNeed:shootPlan.mediaNeedRef,
  output:asNi(claimedSha),mimeType:'video/mp4',
  quotedApiUsd:budget,actualChargeUsd:null,
  generationModeClaim:'reference-to-video',
  referenceImageClaims:shot.references.map(ref=>Object.freeze({
   label:ref.id,kind:ref.kind,identity:ref.visualNi,rightsRef:ref.rightsRef
  })),
  ...(shot.approvedSceneComposition?{
   sourceCompositeCoverageClaims:shot.approvedSceneComposition.covers.map(ref=>Object.freeze({
    ...ref,composedFromNi:shot.approvedSceneComposition.visualNi,
    independentCompositionApproval:shootPlan.creativeAuthorityRef
   }))
  }:{}),
  sourceIdentities:[shootPlan.sourceRef],
  observedProviderOperation:operation,
  observedMediaSha256:claimedSha,
  observedMediaSizeBytes:info.size
 });
 return Object.freeze({
  type:'MicrodramaProviderCinematicReceiving',
  status:'ACTUAL_VIDEO_BYTES_DECODED_AWAITING_ARTISTIC_ACCEPTANCE',
  shotId,jobId:shot.jobId,
  sourceFile:file,sourceRelativePath:source,sourceRoot:root,
  providerArtifact:artifact,
  technicalAssay:observed,
  note:'Real video and original exact source refs received. This provider result is not an independent quality vote, soundtrack acceptance, paid settlement, film assembly or public release.'
 });
}
