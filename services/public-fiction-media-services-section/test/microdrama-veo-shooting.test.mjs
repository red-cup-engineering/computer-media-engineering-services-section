import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdtemp,writeFile,readFile,rm,stat,copyFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compileNarrativeEpisode,projectMicrodramaProductionYield}
 from '../src/microdrama-production.mjs';
import {projectReviewedCinematicVeoEditorialSource,planMicrodramaEditorialIngest} from '../src/microdrama-editorial-ingest.mjs';
import {planCinematicVeoShoot,manufactureCinematicVeoShootingPackage,
 receiveCinematicGeminiVeoShot} from '../src/microdrama-veo-shooting.mjs';

const SHA=x=>createHash('sha256').update(x).digest('hex');
const NI=x=>'ni:///sha-256;'+Buffer.from(x,'hex').toString('base64url');
const sourceRef=NI('e'.repeat(64)),mediaNeedRef=NI('f'.repeat(64));
const consumer='causeway-original-cinematic-dramas';
const approval=()=>({
 decision:'approved-original-cinematic-shoot',
 sourceRef,consumer,mediaNeedRef,
 rightsRef:'rights:original-acting-and-cinema-review',
 creativeAuthorityRef:'director:independent-original-episode-source-selection',
 providerProcessingAuthorizationRef:'consent:external-google-veo-production-processing',
 clientPrivacyRef:'confidentiality:original-source-data-processor',
 authorizedProvider:'urn:ame:google-gemini-developer-api',
 shotIds:['shot-1','shot-2','shot-3']
});
async function inputRoot(){
 const root=await mkdtemp(join(tmpdir(),'original-visual-shoot-'));
 const originals=[];
 for(const [id,kind,color] of [
  ['rill','character','red'],['kip','character','yellow'],
  ['echo','character','green'],['temple','location','blue']
 ]){
  const path=id+'.png',out=join(root,path);
  execFileSync('ffmpeg',['-nostdin','-y','-hide_banner','-loglevel','error',
   '-f','lavfi','-i','color=c='+color+':s=16x16:r=1:d=1',
   '-frames:v','1','-update','1',out],{timeout:30000});
  const bytes=await readFile(out),sha256=SHA(bytes);
  originals.push({id,kind,relativePath:path,sha256,visualNi:NI(sha256),
   mimeType:'image/png',rightsRef:'rights:original-'+id+'-visual'});
 }
 return {root,images:originals};
}
function film(images){
 const get=id=>images.find(x=>x.id===id).visualNi;
 const source={
  type:'NarrativeSource',id:'original-shrimp-fiction',
  originRef:sourceRef,contributorRef:'original-fiction-studio-actor',
  rightsClaimRef:'rights:original-episode-claim',
  creativeAuthorityRef:'director:independently-selected-story',
  boundaries:['Original characters and acting; do not borrow actual private client records']
 };
 const series={id:'sea-drama',characters:[
  {id:'rill',name:'Rill',synthetic:true,visualRef:get('rill'),voiceRef:NI('1'.repeat(64))},
  {id:'kip',name:'Kip',synthetic:true,visualRef:get('kip'),voiceRef:NI('2'.repeat(64))},
  {id:'echo',name:'Echo',synthetic:true,visualRef:get('echo'),voiceRef:NI('3'.repeat(64))}
 ],locations:[{id:'temple',referenceRef:get('temple')}]};
 const episode={id:'pilot',number:1,fps:30,ending:'serial-question',
  beats:[
   {id:'setup',causeBeatId:'source',action:'Rill is afraid to remember',consequence:'Kip must respond'},
   {id:'reversal',causeBeatId:'setup',action:'A glass memory changes',consequence:'Rill must choose'},
   {id:'hook',causeBeatId:'reversal',kind:'cliffhanger',
    action:'Echo speaks behind the temple wall',consequence:'Nobody knows whose memory survived',
    question:'Who is remembering them?'}
  ],shots:[
   {id:'shot-1',frames:150,beatId:'setup',locationId:'temple',
    characterIds:['rill','kip'],action:'Rill refuses a shared glass memory',
    camera:'close two-shot at eye level, moving slightly closer',
    audioMode:'embedded-performance',
    dialogue:[{speakerId:'rill',startFrame:18,endFrame:119,text:'I will not give you my name.'}]},
   {id:'shot-2',frames:150,beatId:'reversal',locationId:'temple',
    characterIds:['rill'],action:'Rill touches the membrane, then recoils',
    camera:'reverse angle, macro foreground and actor eyes in focus',
    audioMode:'separate-voice',
    dialogue:[{speakerId:'rill',startFrame:22,endFrame:108,text:'Then what did you keep?'}]},
   {id:'shot-3',frames:150,beatId:'hook',locationId:'temple',
    characterIds:['rill','kip','echo'],action:'Echo appears as the membrane folds',
    camera:'original cinematic wide reveal',
    audioMode:'embedded-performance',dialogue:[]}
  ]
 };
 const receiver={consumer,destination:'private-film-studio',
  acceptanceCriteria:'Source-film rights, recognizable nonhuman cast and original acting'};
 return compileNarrativeEpisode({source,series,episode,receiver,
  openedAt:'2026-10-13T17:00:00Z'});
}
test('the original cinematic film compiles directly into existing Red Cup reference-shaped Veo shots, not a duplicate screenplay',async()=>{
 const {root,images}=await inputRoot();
 try{
  const plan=film(images),shoot=planCinematicVeoShoot({
   plan,approval:approval(),images
  });
  assert.equal(plan.jobs.video.length,3);
  assert.equal(shoot.status,'PARTIAL_SHOOT_NEEDS_ORIGINAL_SOURCE_REPAIR');
  assert.equal(shoot.readyShotCount,2);
  assert.equal(shoot.heldShotCount,1);
  assert.equal(shoot.oneAttemptBilledSeconds,16);
  const s1=shoot.shots[0],s2=shoot.shots[1],s3=shoot.shots[2];
  assert.equal(s1.spec.model,'veo-3.1-fast-generate-preview');
  assert.equal(s1.spec.durationSeconds,8);
  assert.equal(s1.spec.resolution,'1080p');
  assert.equal(s1.spec.aspectRatio,'9:16');
  assert.equal(s1.spec.sourceRef,sourceRef);
  assert.equal(s1.spec.mediaNeed,mediaNeedRef);
  assert.equal(s1.spec.referenceImages.length,3);
  assert.equal(s1.sourceFrames,150);
  assert.equal(s2.spec.referenceImages.length,2);
  assert.equal(s2.audioMode,'separate-voice');
  assert.ok(s1.spec.prompt.includes('I will not give you my name.'));
  assert.ok(s1.spec.prompt.includes('EXACT'));
  assert.ok(!s1.spec.prompt.includes('rights:original-acting-and-cinema-review'));
  assert.ok(!s1.spec.prompt.includes('director:independent-original-episode-source-selection'));
  assert.ok(!s1.spec.prompt.includes('consent:external-google-veo-production-processing'),
   'rights/privacy authorization belongs in the custody contract, never provider media prompt');
  assert.ok(s2.spec.prompt.includes('The separately accepted original dialogue'));
  assert.ok(s2.spec.prompt.includes('Then what did you keep?'));
  assert.deepEqual(s1.spec.referenceImages.filter(x=>x.id==='character-rill'),
   s2.spec.referenceImages.filter(x=>x.id==='character-rill'),
   'the same Rill reference is reused without a new look across reverse-angle cuts');
  assert.equal(s3.spec,undefined);
  assert.ok(s3.blockers.includes('veo-image-reference-limit:4'));
  assert.match(shoot.note,/Source claims/u);
  const single=planCinematicVeoShoot({plan,approval:{
   ...approval(),shotIds:['shot-2']},images});
  assert.equal(single.readyShotCount,1);
  assert.equal(single.status,'SOURCE_ADMITTED_SHOTS_READY_FOR_PROVIDER_OPERATOR');
  assert.throws(()=>planCinematicVeoShoot({plan,approval:{
   ...approval(),sourceRef:NI('a'.repeat(64))},images}),
   /source differs from screenplay/u);
  assert.throws(()=>planCinematicVeoShoot({plan,approval:{
   ...approval(),decision:'draft'},images}),/creative producing decision/u);
  assert.throws(()=>planCinematicVeoShoot({plan,approval:{
   ...approval(),providerProcessingAuthorizationRef:''},images}),
   /approved external Veo processing/u);
  assert.throws(()=>planCinematicVeoShoot({plan,approval:{
   ...approval(),authorizedProvider:'unapproved-other-model'},images}),
   /explicitly authorize this external video provider/u);
  assert.throws(()=>planCinematicVeoShoot({plan,approval:{
   ...approval(),shotIds:['not-a-shot']},images}),/unknown source shot/u);
  assert.throws(()=>planCinematicVeoShoot({plan,approval:approval(),images,
   model:'veo-3.1-lite-generate-preview'}),/does not support source reference/u);
 }finally{await rm(root,{recursive:true,force:true})}
});
test('a rights-approved original ensemble portrait unlocks a four-source-reference shot without removing any character', {timeout:90000},async()=>{
 const {root,images}=await inputRoot();
 try{
  const scenePath=join(root,'ensemble.png');
  execFileSync('ffmpeg',['-nostdin','-y','-hide_banner','-loglevel','error',
   '-f','lavfi','-i','testsrc2=size=48x48:rate=1:duration=1',
   '-frames:v','1','-update','1',scenePath],{timeout:25000});
  const sceneBytes=await readFile(scenePath),imageSha=SHA(sceneBytes);
  const scene={id:'ensemble',kind:'scene',relativePath:'ensemble.png',
   visualNi:NI(imageSha),sha256:imageSha,
   mimeType:'image/png',rightsRef:'rights:original-scenic-actor-group'};
  const pack=[...images,scene],sourceApproval=approval();
  const composition={shotId:'shot-3',id:'ensemble',sourceRef,
   visualNi:scene.visualNi,rightsRef:scene.rightsRef,
   creativeAuthorityRef:sourceApproval.creativeAuthorityRef,
   covers:images.filter(x=>x.kind==='character'||x.kind==='location')
    .map(x=>({kind:x.kind,id:x.id,visualNi:x.visualNi}))};
  const plan=film(images),shoot=planCinematicVeoShoot({
   plan,images:pack,approval:{...sourceApproval,sceneReferences:[composition]}
  });
  assert.equal(shoot.status,'SOURCE_ADMITTED_SHOTS_READY_FOR_PROVIDER_OPERATOR');
  assert.equal(shoot.readyShotCount,3);
  assert.equal(shoot.heldShotCount,0);
  assert.equal(shoot.oneAttemptBilledSeconds,24);
  const group=shoot.shots[2];
  assert.equal(group.spec.referenceImages.length,1);
  assert.equal(group.references[0].kind,'scene');
  assert.equal(group.references[0].visualNi,scene.visualNi);
  assert.equal(group.approvedSceneComposition.covers.length,4);
  assert.ok(group.spec.prompt.includes('Rill'));
  assert.ok(group.spec.prompt.includes('Kip'));
  assert.ok(group.spec.prompt.includes('Echo'));
  assert.ok(group.spec.prompt.includes('temple'));
  const dir=join(root,'ensemble-shoot');
  const output=await manufactureCinematicVeoShootingPackage({
   shootPlan:shoot,images:pack,imageRoot:root,outputDir:dir});
  assert.equal(output.readyShotCount,3);
  assert.equal(output.reusedReferenceCount,4,
   'one cast and location reference reused for earlier scenes, one actual ensemble image for shot 3');
  const shot3=JSON.parse(await readFile(join(dir,'shot-shot-3.json')));
  assert.equal(shot3.referenceImages[0].sha256,imageSha);
  const art=await readFile(join(dir,shot3.referenceImages[0].path));
  assert.equal(SHA(art),imageSha);

  const changed=planCinematicVeoShoot({plan,images:pack,approval:{
   ...sourceApproval,sceneReferences:[{...composition,covers:composition.covers.slice(0,3)}]
  }});
  assert.equal(changed.readyShotCount,2);
  assert.ok(changed.shots[2].blockers.includes(
   'composite-does-not-cover-all-exact-approved-actors-and-location'));
  const wrongRights=planCinematicVeoShoot({plan,images:pack,approval:{
   ...sourceApproval,sceneReferences:[{...composition,rightsRef:'unapproved-other-property'}]
  }});
  assert.ok(wrongRights.shots[2].blockers.includes(
   'approved-composite-image-or-original-rights-missing'));
  assert.throws(()=>planCinematicVeoShoot({plan,images:pack,approval:{
   ...sourceApproval,sceneReferences:[{...composition,sourceRef:'sha256:'+'f'.repeat(64)}]
  }}),/scene composite creative source revision diverged/u);

  const job=plan.jobs.video[2],fakeHash='a'.repeat(64);
  const direct=group.references.map(ref=>({
   kind:ref.kind,label:ref.id,identity:ref.visualNi,rightsRef:ref.rightsRef
  }));
  const artifact={provider:'urn:ame:google-gemini-developer-api',
   consumer,completionId:'models/veo-3.1-fast-generate-preview/operations/cast-received',
   purpose:job.id,allocation:'allocation:scene-original',mediaNeed:mediaNeedRef,
   output:NI(fakeHash),mimeType:'video/mp4',quotedApiUsd:0.96,
   generationModeClaim:'reference-to-video',
   referenceImageClaims:direct,sourceIdentities:[sourceRef],
   sourceCompositeCoverageClaims:composition.covers.map(ref=>({
    ...ref,composedFromNi:scene.visualNi,
    independentCompositionApproval:sourceApproval.creativeAuthorityRef
   }))
  };
  const yieldReport=projectMicrodramaProductionYield({plan,
   providerArtifacts:[artifact],
   reviews:[{completionId:artifact.completionId,
    purpose:job.id,allocation:artifact.allocation,mediaNeed:mediaNeedRef,
    accepted:true,authority:'editor:independently-reviewed-each-character',
    asset:{sha256:fakeHash}}]});
  assert.equal(yieldReport.acceptedShotSeconds,5);
  assert.equal(yieldReport.acceptedFinishedSeconds,0);
  assert.equal(yieldReport.continuityAlerts.length,3);
  assert.ok(yieldReport.continuityAlerts.some(x=>
   x.includes('composite-cast-performance-requires-independent-identity-review:rill')));
  assert.throws(()=>projectMicrodramaProductionYield({plan,
   providerArtifacts:[{...artifact,sourceCompositeCoverageClaims:[
    {...artifact.sourceCompositeCoverageClaims[0],
     composedFromNi:NI('c'.repeat(64))}]}]}),
   /source-covered actor\/place must match/u);
 }finally{await rm(root,{recursive:true,force:true})}
});
test('wrong source visual NI, missing legally accepted design, or cast mismatch HOLDS rather than secretly substituting an image',async()=>{
 const {root,images}=await inputRoot();
 try{
  const plan=film(images);
  const absent=planCinematicVeoShoot({plan,approval:approval(),
   images:images.filter(x=>x.id!=='temple')});
  assert.equal(absent.readyShotCount,0);
  assert.ok(absent.shots.every(x=>x.blockers.some(b=>b.includes('missing-original-reference:location:temple'))));
  const changed=images.map(x=>x.id==='rill'?{
   ...x,visualNi:NI('b'.repeat(64)),sha256:'b'.repeat(64)}:x);
  const wrong=planCinematicVeoShoot({plan,approval:approval(),images:changed});
  assert.ok(wrong.shots[0].blockers.includes('different-reference-than-original-source:character:rill'));
  const repeated=[...images,images[0]];
  assert.throws(()=>planCinematicVeoShoot({plan,approval:approval(),images:repeated}),
   /conflicting image identities/u);
  const claim=images.map(x=>x.id==='rill'?{...x,sha256:'a'.repeat(64)}:x);
  assert.throws(()=>planCinematicVeoShoot({plan,approval:approval(),images:claim}),
   /SHA and approved source NI disagree/u);
 }finally{await rm(root,{recursive:true,force:true})}
});
test('actual private operator bundle contains directly runnable Red Cup shot JSON and ONE copy of every original reference', {timeout:90000},async()=>{
 const {root,images}=await inputRoot();
 try{
  const plan=film(images),shoot=planCinematicVeoShoot({
   plan,approval:approval(),images});
  const dir=join(root,'private-shoot');
  const out=await manufactureCinematicVeoShootingPackage({
   shootPlan:shoot,images,imageRoot:root,outputDir:dir
  });
  assert.equal(out.readyShotCount,2);
  assert.equal(out.heldShotCount,1);
  assert.equal(out.reusedReferenceCount,3);
  const manifest=JSON.parse(await readFile(join(dir,'shooting-package.json')));
  const shootReceived=JSON.parse(await readFile(join(dir,'shooting-plan.json')));
  assert.equal(shootReceived.shots.length,3);
  assert.equal(manifest.originalShotSpecs.length,2);
  assert.equal(manifest.heldShots[0].shotId,'shot-3');
  assert.equal(manifest.originalReferenceBytes.length,3);
  const spec=JSON.parse(await readFile(join(dir,'shot-shot-1.json')));
  assert.equal(spec.referenceImages.length,3);
  for(const ref of spec.referenceImages){
   const original=await readFile(join(dir,ref.path));
   assert.equal(SHA(original),ref.sha256);
   assert.ok((await stat(join(dir,ref.path))).isFile());
   assert.ok(ref.path.startsWith('references/'));
   assert.ok(original.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')));
  }
  assert.deepEqual(JSON.parse(await readFile(join(dir,'shot-shot-2.json')))
   .referenceImages.find(x=>x.id==='character-rill'),
   spec.referenceImages.find(x=>x.id==='character-rill'));
  const producerBundle=join(root,'cli-original-film-shoot');
  await writeFile(join(root,'shoot-plan.json'),JSON.stringify(plan));
  await writeFile(join(root,'shoot-approval.json'),JSON.stringify(approval()));
  await writeFile(join(root,'visual-originals.json'),JSON.stringify({images}));
  const cliOutput=JSON.parse(execFileSync(process.execPath,[
   new URL('../apps/assemble-microdrama.mjs',import.meta.url).pathname,
   '--shoot',join(root,'shoot-plan.json'),join(root,'shoot-approval.json'),
   join(root,'visual-originals.json'),root,producerBundle
  ],{timeout:45000,encoding:'utf8'}));
  assert.equal(cliOutput.type,'MicrodramaVeoShootingPackage');
  assert.equal(cliOutput.readyShotCount,2);
  assert.equal((JSON.parse(await readFile(join(producerBundle,'shooting-package.json'))))
   .originalShotSpecs.length,2);

  await assert.rejects(()=>manufactureCinematicVeoShootingPackage({
   shootPlan:shoot,images,imageRoot:root,outputDir:dir
  }),/already exists/u);
  const altered=images.map(x=>x.id==='rill'?{...x,relativePath:'tampered.png'}:x);
  await writeFile(join(root,'tampered.png'),Buffer.alloc(96,0));
  await assert.rejects(()=>manufactureCinematicVeoShootingPackage({
   shootPlan:shoot,images:altered,imageRoot:root,outputDir:join(root,'bad-shoot')
  }),/source reference MIME|accepted content identity/u);
 }finally{await rm(root,{recursive:true,force:true})}
});
test('actual Red Cup Gemini paid operation and downloaded MP4 are joined to same original acting and exact image rights', {timeout:90000},async()=>{
 const {root,images}=await inputRoot();
 try{
  const plan=film(images),shoot=planCinematicVeoShoot({
   plan,approval:{...approval(),shotIds:['shot-1']},images
  });
  const shot=shoot.shots[0],dir=join(root,'gemini-job');
  await (await import('node:fs/promises')).mkdir(join(dir,'media'),{recursive:true});
  const video=join(dir,'media','original.mp4');
  execFileSync('ffmpeg',['-nostdin','-y','-hide_banner','-loglevel','error',
   '-f','lavfi','-i','testsrc2=size=180x320:rate=24:duration=8',
   '-f','lavfi','-i','sine=frequency=330:sample_rate=48000:duration=8',
   '-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-t','8',
   '-shortest',video],{timeout:50000});
  const bytes=await readFile(video),sha256=SHA(bytes);
  const publicPlan={type:'GeminiVeoCinematicShot',state:'PREPARED_UNSUBMITTED',
   shotId:'shot-1',sourceRef,consumer,mediaNeed:mediaNeedRef,
   model:shoot.model,mode:'reference-to-video',
   durationSeconds:8,aspectRatio:'9:16',resolution:shoot.resolution,
   requestSha256:'c'.repeat(64),
   promptSha256:SHA(Buffer.from(shot.spec.prompt,'utf8')),
   estimatedMaximumUsd:0.96,
   referenceAssets:shot.references.map(x=>({
    id:x.kind+'-'+x.id,sha256:x.sha256,rightsRef:x.rightsRef,
    mimeType:x.mimeType
   }))
  };
  // Red Cup's real provider can return the short, unscoped Google operation name.
  const operation='operations/original-paid-1';
  const submission={type:'GeminiVeoSubmittedShot',
   status:'PROVIDER_OPERATION_PENDING',shotId:'shot-1',model:shoot.model,
   provider:'urn:ame:google-gemini-developer-api',operationName:operation,
   requestSha256:publicPlan.requestSha256,estimatedMaximumUsd:0.96,
   operatorRef:'producer:source-authorized-usd-spender'};
  const providerByteReceipt={type:'GeminiVeoProviderByteReceipt',
   state:'RECEIVED_PROVIDER_BYTES_AWAITING_MEDIA_REVIEW',shotId:'shot-1',
   model:shoot.model,operationName:operation,sourceRequestSha256:publicPlan.requestSha256,
   receivedVideoSha256:sha256,mediaRelativePath:'media/original.mp4',
   bytes:bytes.length};
  const received=await receiveCinematicGeminiVeoShot({
   shootPlan:shoot,shotId:'shot-1',publicPlan,submission,providerByteReceipt,
   providerJobRoot:dir,allocationRef:'studio:actual-approved-inference-allocation'
  });
  assert.equal(received.status,'ACTUAL_VIDEO_BYTES_DECODED_AWAITING_ARTISTIC_ACCEPTANCE');
  assert.equal(received.technicalAssay.media.sha256,sha256);
  assert.ok(received.technicalAssay.media.video.decodedFrames>=192);
  assert.equal(received.providerArtifact.output,NI(sha256));
  assert.equal(received.providerArtifact.quotedApiUsd,0.96);
  assert.equal(received.providerArtifact.actualChargeUsd,null);
  await assert.rejects(()=>receiveCinematicGeminiVeoShot({
   shootPlan:shoot,shotId:'shot-1',
   publicPlan:{...publicPlan,estimatedMaximumUsd:0.01},
   submission,providerByteReceipt,providerJobRoot:dir,
   allocationRef:'studio:actual-approved-inference-allocation'
  }),/submitted USD quote does not match original source-priced/u,
  'a later lower quote cannot relabel a source-priced paid provider result');
  await assert.rejects(()=>receiveCinematicGeminiVeoShot({
   shootPlan:shoot,shotId:'shot-1',publicPlan,
   submission:{...submission,estimatedMaximumUsd:0.01},
   providerByteReceipt,providerJobRoot:dir,
   allocationRef:'studio:actual-approved-inference-allocation'
  }),/submitted USD quote does not match original source-priced/u);
  await assert.rejects(()=>receiveCinematicGeminiVeoShot({
   shootPlan:shoot,shotId:'shot-1',publicPlan,
   submission:{...submission,operatorRef:''},
   providerByteReceipt,providerJobRoot:dir,
   allocationRef:'studio:actual-approved-inference-allocation'
  }),/paid provider attempt needs its source-identified spending operator/u);
  assert.equal(received.providerArtifact.purpose,plan.jobs.video[0].id);
  assert.equal(received.providerArtifact.referenceImageClaims.length,3);
  // An internally self-consistent PAID provider bundle could still use the
  // right source NI and correct images while filming unauthorized dialogue.
  // That is a cross-office authorial breach, even if all receipts match each
  // other and the downloaded video bytes are technically valid.
  const unauthorizedPlan={...publicPlan,requestSha256:'b'.repeat(64),
   promptSha256:SHA(Buffer.from(shot.spec.prompt+' Replace the spoken line and camera move.','utf8'))};
  await assert.rejects(()=>receiveCinematicGeminiVeoShot({
   shootPlan:shoot,shotId:'shot-1',publicPlan:unauthorizedPlan,
   submission:{...submission,requestSha256:unauthorizedPlan.requestSha256},
   providerByteReceipt:{...providerByteReceipt,
    sourceRequestSha256:unauthorizedPlan.requestSha256},
   providerJobRoot:dir,allocationRef:'studio:actual-approved-inference-allocation'
  }),/provider prompt differs from approved original dramatic screenplay/u,
  'provider-confirmed bytes from unauthorized new dialogue cannot replace approved source');
  await assert.rejects(()=>receiveCinematicGeminiVeoShot({
   shootPlan:shoot,shotId:'shot-1',
   publicPlan:{...publicPlan,promptSha256:undefined},
   submission,providerByteReceipt,providerJobRoot:dir,
   allocationRef:'studio:actual-approved-inference-allocation'
  }),/provider prompt differs from approved original dramatic screenplay/u,
  'legacy unbound provider preview cannot be presented as verified source performance');
  const shootBundle=join(root,'received-film-bundle');
  await manufactureCinematicVeoShootingPackage({
   shootPlan:shoot,images,imageRoot:root,outputDir:shootBundle
  });
  const originalSpec=await readFile(join(shootBundle,'shot-shot-1.json'));
  submission.operatorRef='director:authorized-production-spending';
  const paidAttempt={type:'GeminiVeoSubmissionAttempt',
   state:'POST_OUTCOME_UNKNOWN_UNTIL_OPERATION_OBSERVED',
   sourceSpecSha256:SHA(originalSpec),prepared:publicPlan,
   spendingOperator:submission.operatorRef,spendLimitUsd:1.00};
  for(const [name,value] of [
   ['attempted.json',paidAttempt],['submitted.json',submission],
   ['received.json',providerByteReceipt]
  ])await writeFile(join(dir,name),JSON.stringify(value));
  const operatorArgs=[
   new URL('../apps/assemble-microdrama.mjs',import.meta.url).pathname,
   '--receive-veo',shootBundle,'shot-1',dir,
   'studio:actual-approved-inference-allocation'
  ];
  const onCli=JSON.parse(execFileSync(process.execPath,operatorArgs,
   {encoding:'utf8',timeout:60000,maxBuffer:2500000}));
  assert.equal(onCli.providerArtifact.output,received.providerArtifact.output);
  assert.equal(onCli.providerArtifact.quotedApiUsd,0.96);
  assert.equal(onCli.technicalAssay.media.sha256,sha256);
  await writeFile(join(dir,'attempted.json'),JSON.stringify({
   ...paidAttempt,sourceSpecSha256:'a'.repeat(64)
  }));
  assert.throws(()=>execFileSync(process.execPath,operatorArgs,
   {encoding:'utf8',timeout:60000,stdio:'pipe'}),
   /Command failed/u,'a different Red Cup source request must not be admitted as this paid shoot');


  const report=projectMicrodramaProductionYield({plan,providerArtifacts:[
   received.providerArtifact
  ],reviews:[]});
  assert.equal(report.pendingCandidateCount,1);
  assert.equal(report.quotedGeminiApiUsd,0.96);
  assert.equal(report.unknownGeminiApiQuotes,0);
  assert.equal(report.quotedFlowCredits,0);
  assert.equal(report.unknownFlowCreditQuotes,0);
  assert.equal(report.quotedFlowCreditsPerAcceptedMinute,null);
  const reviewed=projectMicrodramaProductionYield({plan,providerArtifacts:[
   received.providerArtifact
  ],reviews:[{
   completionId:operation,purpose:plan.jobs.video[0].id,
   allocation:'studio:actual-approved-inference-allocation',mediaNeed:mediaNeedRef,
   accepted:true,authority:'editor:original-performance-review',
   asset:{sha256}
  }]});
  assert.equal(reviewed.acceptedShotSeconds,5);
  assert.equal(reviewed.acceptedFinishedSeconds,0);
  // The SAME original Causeway MediaArtifactReview record, not a second
  // hand-written acceptance manifest, is directly consumed by the editor.
  const actualJournalReview={
   type:'MediaArtifactReview',version:1,
   accepted:true,allocation:'studio:actual-approved-inference-allocation',
   provider:'urn:ame:google-gemini-developer-api',
   completionId:operation,purpose:plan.jobs.video[0].id,
   mediaNeed:mediaNeedRef,
   authority:'editor:original-performance-review',
   basis:'independently reviewed original scene acting, lipsync, sound and original art',
   asset:{
    sha256,mimeType:'video/mp4',relativePath:'media/original.mp4',
    metadataSanitized:true,width:180,height:320,
    transcriptRef:'production:actual-scripted-dialogue-cues'
   }
  };
  const receivedSource=projectReviewedCinematicVeoEditorialSource({
   cinematicReceiving:received,mediaArtifactReview:actualJournalReview,
   reviewRecordRef:'journal:actual-record-id',
   rightsRef:'rights:original-cinema-and-native-performance',
   audioReviewRef:'review:actually-reviewed-original-performance-audio'
  });
  assert.equal(receivedSource.kind,'video');
  assert.equal(receivedSource.jobId,plan.jobs.video[0].id);
  assert.equal(receivedSource.sourceRef,sourceRef);
  assert.equal(receivedSource.audioReviewRef,
   'review:actually-reviewed-original-performance-audio');
  assert.equal(receivedSource.reviewRef,'journal:actual-record-id');
  assert.equal(receivedSource.sha256,sha256);
  assert.equal(receivedSource.relativePath,'media/original.mp4');
  const awaitingOthers=planMicrodramaEditorialIngest({
   plan,sources:[receivedSource],parentReviewRef:'journal:actual-source-reviews'
  });
  assert.equal(awaitingOthers.status,'HELD_MISSING_ACCEPTED_ORIGINAL_AV_MEDIA');
  assert.equal(awaitingOthers.missingJobs.length,3);
  assert.throws(()=>projectReviewedCinematicVeoEditorialSource({
   cinematicReceiving:received,mediaArtifactReview:{
    ...actualJournalReview,completionId:'models/other/operations/unrelated'
   },reviewRecordRef:'journal:actual-record-id',
   rightsRef:'rights:original-cinema'
  }),/independently accepted media review differs/u);
  assert.throws(()=>projectReviewedCinematicVeoEditorialSource({
   cinematicReceiving:received,mediaArtifactReview:{
    ...actualJournalReview,asset:{...actualJournalReview.asset,relativePath:'media/different.mp4'}
   },reviewRecordRef:'journal:actual-record-id',
   rightsRef:'rights:original-cinema'
  }),/review asset path differs/u);
  assert.throws(()=>projectReviewedCinematicVeoEditorialSource({
   cinematicReceiving:received,mediaArtifactReview:actualJournalReview,
   reviewRecordRef:'',rightsRef:'rights:original-cinema'
  }),/independently received source review journal identity/u);

  // Both operator-supported naming forms must be receivable; an unrelated
  // provider namespace must still be rejected, before touching media bytes.
  const scoped='models/veo-3.1-fast-generate-preview/operations/original-paid-1';
  const scopedReceiving=await receiveCinematicGeminiVeoShot({
   shootPlan:shoot,shotId:'shot-1',publicPlan,
   submission:{...submission,operationName:scoped},
   providerByteReceipt:{...providerByteReceipt,operationName:scoped},
   providerJobRoot:dir,allocationRef:'studio:actual-approved-inference-allocation'
  });
  assert.equal(scopedReceiving.providerArtifact.completionId,scoped);
  const invalid='projects/untrusted/operations/counterfeit';
  await assert.rejects(()=>receiveCinematicGeminiVeoShot({
   shootPlan:shoot,shotId:'shot-1',publicPlan,
   submission:{...submission,operationName:invalid},
   providerByteReceipt:{...providerByteReceipt,operationName:invalid},
   providerJobRoot:dir,allocationRef:'studio:actual-approved-inference-allocation'
  }),/not a valid source-identifying Gemini operation/u);
  const wrong={...providerByteReceipt,sourceRequestSha256:'d'.repeat(64)};
  await assert.rejects(()=>receiveCinematicGeminiVeoShot({
   shootPlan:shoot,shotId:'shot-1',publicPlan,submission,
   providerByteReceipt:wrong,providerJobRoot:dir,allocationRef:'studio:approved'
  }),/cannot be joined/u);
  await copyFile(video,join(dir,'outside.mp4'));
  await assert.rejects(()=>receiveCinematicGeminiVeoShot({
   shootPlan:shoot,shotId:'shot-1',publicPlan,submission,
   providerByteReceipt:{...providerByteReceipt,mediaRelativePath:'../outside.mp4'},
   providerJobRoot:dir,allocationRef:'studio:approved'
  }),/clean relative custody/u);
 }finally{await rm(root,{recursive:true,force:true})}
});
