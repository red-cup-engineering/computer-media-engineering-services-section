import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {validateStorySeed,normalizeNarrativeSource,planWritersRoom,compileMicrodramaEpisode,compileNarrativeEpisode,estimateVideoGeneration,projectMicrodramaProductionYield} from '../src/microdrama-production.mjs';

const seed = () => ({type:'NativeStorySeed',id:'fixture-market-conversation',originRef:'fixture:human-provided-seed',contributorRef:'fixture:proposer-not-verified',
  premise:'TEST FICTION ONLY: two friends have conflicting evidence about a lost package; no community-specific facts.',
  boundaries:['No cultural claims, language inventions, sacred themes or claims of community endorsement.'],
  culturalScope:'unspecified',permission:{adaptation:'claimed-permitted',syntheticPerformance:'claimed-permitted',recordRef:'fixture:permission-not-verified'}});
const series = () => ({id:'fixture-serial',characters:[
  {id:'arya',name:'Arya',synthetic:true,visualRef:'fixture:canonical-arya',voiceRef:'fixture:original-arya-voice'},
  {id:'beck',name:'Beck',synthetic:true,visualRef:'fixture:canonical-beck',voiceRef:'fixture:original-beck-voice'}],
  locations:[{id:'frontdesk',referenceRef:'fixture:frontdesk-master'}]});
const episode = () => ({id:'pilot',number:1,fps:30,beats:[
    {id:'setup',causeBeatId:'seed',action:'Disagree about package',consequence:'Conflict'},
    {id:'reversal',causeBeatId:'setup',action:'Discover contradictory evidence',consequence:'Trust shifts'},
    {id:'hook',causeBeatId:'reversal',kind:'cliffhanger',action:'Recognize missing signature',consequence:'Neither trusts the record',question:'Who signed the receipt?'}],
  shots:Array.from({length:12},(_,i)=>({id:`shot-${i+1}`,frames:150,
    beatId:i<4?'setup':i<8?'reversal':'hook',locationId:'frontdesk',characterIds:i%2?['arya']:['arya','beck'],
    camera:i%2?'close-up':'two-shot',action:`Character makes an observable decision ${i+1}`,
    dialogue:[{speakerId:'arya',startFrame:15,endFrame:120,text:`New information ${i+1}.`}] }))});
const receiver = () => ({consumer:'causeway-services/public-fiction-media-services-section',destination:'unbound-youtube-channel',
  acceptanceCriteria:'Original episode holds story causality, licensed media, legible subtitles and stable cast across shots'});
const compile=()=>compileMicrodramaEpisode({seed:seed(),series:series(),episode:episode(),receiver:receiver(),openedAt:'2026-10-12T00:00:00Z'});

test('Native-origin input is a reference with claimed rights, not proof or model directions',()=>{
  const s=validateStorySeed(seed());
  assert.equal(s.permissionClaimRef,'fixture:permission-not-verified');
  assert.ok(!JSON.stringify(s).includes('approved:'));
  const plan=planWritersRoom(seed(),{episodeCount:3});
  assert.equal(plan.status,'UNEXECUTED_INFERENCE_JOB');
  assert.equal(plan.job.messages[0].role,'system');
  assert.match(plan.job.messages[0].content,/structured JSON candidates/u);
  assert.equal(plan.job.messages[1].role,'user');
  assert.equal(JSON.parse(plan.job.messages[1].content).episodeCount,3);
  const copy=seed();delete copy.permission.recordRef;
  assert.throws(()=>validateStorySeed(copy),/documented claimed permission/u);
});

test('one source-neutral portfolio emits independent Red Cup inference jobs with exact per-work provider grants',()=>{
 const root=mkdtempSync(join(tmpdir(),'microdrama-portfolio-'));
 try{
  const native=seed();
  const alien={type:'NarrativeSource',id:'fictional-undercity',originRef:'story:fictional-undercity-v1',
   contributorRef:'creator:fiction-source',rightsClaimRef:'rights:fiction-v1',
   creativeAuthorityRef:'studio:fiction-rights',boundaries:['No reuse of other cast or clients']};
  const licensed={...alien,id:'licensed-mystery',originRef:'story:license-source-v2',
   rightsClaimRef:'license:adaptation-v2',creativeAuthorityRef:'customer:license-owner'};
  const grant=(providerIds)=>({state:'approved',authorityRef:'test:producer-claims-authority',
   rightsRef:'test:processor-claims-rights',providerIds});
  const workloads=[
   {source:native,providerProcessingDecision:grant(['ollama-local']),episodeCount:2},
   {source:alien,providerProcessingDecision:grant(['groq','openrouter-cohere-north'])},
   {source:licensed,providerProcessingDecision:grant(['nvidia-nim'])}
  ];
  const file=join(root,'workloads.json');
  const cli=new URL('../apps/plan-microdrama.mjs',import.meta.url).pathname;
  const run=(rows)=>{writeFileSync(file,JSON.stringify({workloads:rows}));
   return execFileSync(process.execPath,[cli,'writers-jsonl',file],
    {encoding:'utf8',timeout:10000});
  };
  const printed=run(workloads),lines=printed.trim().split('\n').map(JSON.parse);
  assert.equal(lines.length,3);
  assert.deepEqual(lines.map(x=>x.sourceKind),['native-contributed','source-neutral','source-neutral']);
  assert.equal(lines[0].id,'fixture-market-conversation-writers-room');
  assert.deepEqual(lines[0].preferEndpoints,['ollama-local']);
  assert.deepEqual(lines[1].preferEndpoints,['groq','openrouter-cohere-north']);
  assert.equal(JSON.parse(lines[0].messages[1].content).episodeCount,2);
  assert.equal(lines[2].sourceRef,'story:license-source-v2');
  assert.ok(lines.every(x=>x.messages.some(m=>m.role==='user')&&
    x.providerProcessingAuthorityRef==='test:producer-claims-authority'));
  assert.equal(printed,run(workloads),'identical source batches produce identical dispatch jobs');
  const noAuthority=[{...workloads[0],providerProcessingDecision:null}];
  assert.throws(()=>run(noAuthority),/provider-processing decision/u);
  const crossProvider=[{...workloads[0],providerProcessingDecision:grant(['ollama-local','ollama-local'])}];
  assert.throws(()=>run(crossProvider),/provider-processing decision/u);
  const duplicate=[workloads[0],workloads[0]];
  assert.throws(()=>run(duplicate),/duplicate job\/source identities/u);
  assert.throws(()=>run([{...workloads[0],source:{...native,permission:undefined}}]),
   /claimed permission/u);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('producer compiles 9:16 causally ordered, 60-second, 30fps episode with stable references',()=>{
  const result=compile();
  assert.equal(result.status,'PROPOSED_NOT_ADMITTED');
  assert.equal(result.totalFrames,1800);
  assert.equal(result.durationSeconds,60);
  assert.equal(result.timeline.length,12);
  assert.equal(result.jobs.video.length,12);
  assert.equal(result.jobs.speech.length,12);
  assert.equal(result.jobs.video[0].aspectRatio,'9:16');
  assert.equal(result.jobs.video.at(-1).cast[0].visualRef,result.jobs.video[0].cast[0].visualRef);
  assert.equal(result.jobs.video[0].location.referenceRef,'fixture:frontdesk-master');
  assert.equal(result.timeline.at(-1).endFrame,1800);
  assert.match(result.subtitlesSrt,/00:00:00,500 --> 00:00:04,000/u);
  assert.match(result.subtitlesSrt,/00:00:59,000/u);
  assert.equal(result.mediaNeedCandidate.id,undefined);
  assert.equal(result.mediaNeedCandidate.intake.state,'proposed-unverified');
  assert.equal(result.mediaNeedCandidate.artifacts.length,24);
  assert.ok(result.mediaNeedCandidate.artifacts.every(x=>x.disposition==='hold'));
  assert.equal(new Set(result.mediaNeedCandidate.artifacts.map(x=>x.purpose)).size,24);
  assert.ok(result.requiredReceiverChecks.includes('youtube-synthetic-media-disclosure'));
});

test('compile is deterministic and has no wall-clock or provider side effect',()=>{
  assert.deepEqual(compile(),compile());
  const first=compile();
  assert.equal(first.mediaNeedCandidate.source.speechAct,'unapproved-episode-production-projection');
  assert.ok(!JSON.stringify(first).includes('generatedAt'));
});

test('rejects no cliffhanger, causal inversion, unused beat and undisclosed cast changes',()=>{
  const withoutHook=episode();withoutHook.beats[2].kind='resolution';
  assert.throws(()=>compileMicrodramaEpisode({seed:seed(),series:series(),episode:withoutHook,receiver:receiver(),openedAt:'2026-10-12T00:00:00Z'}),/serial-question/u);
  const wrongBeat=episode();wrongBeat.shots[0].beatId='reversal';
  assert.throws(()=>compileMicrodramaEpisode({seed:seed(),series:series(),episode:wrongBeat,receiver:receiver(),openedAt:'2026-10-12T00:00:00Z'}),/causal beat order/u);
  const noBeat=episode();noBeat.shots=episode().shots.filter(x=>x.beatId!=='reversal');
  assert.throws(()=>compileMicrodramaEpisode({seed:seed(),series:series(),episode:noBeat,receiver:receiver(),openedAt:'2026-10-12T00:00:00Z'}),/every dramatic beat/u);
  const missingPerson=episode();missingPerson.shots[0].characterIds=['unknown'];
  assert.throws(()=>compileMicrodramaEpisode({seed:seed(),series:series(),episode:missingPerson,receiver:receiver(),openedAt:'2026-10-12T00:00:00Z'}),/missing character/u);
  const realFace=series();realFace.characters[0].synthetic=false;
  assert.throws(()=>compileMicrodramaEpisode({seed:seed(),series:realFace,episode:episode(),receiver:receiver(),openedAt:'2026-10-12T00:00:00Z'}),/accepted performance mode/u);
});

test('rejects invalid time geometry, ambiguous speech, missing permission and undeclared destination',()=>{
  const tooLong=episode();tooLong.shots[0].frames=241;
  assert.throws(()=>compileMicrodramaEpisode({seed:seed(),series:series(),episode:tooLong,receiver:receiver(),openedAt:'2026-10-12T00:00:00Z'}),/frames/u);
  const overlapping=episode();overlapping.shots[0].dialogue.push({speakerId:'arya',startFrame:30,endFrame:140,text:'Second.'});
  assert.throws(()=>compileMicrodramaEpisode({seed:seed(),series:series(),episode:overlapping,receiver:receiver(),openedAt:'2026-10-12T00:00:00Z'}),/cannot overlap/u);
  const r=receiver();delete r.destination;
  assert.throws(()=>compileMicrodramaEpisode({seed:seed(),series:series(),episode:episode(),receiver:r,openedAt:'2026-10-12T00:00:00Z'}),/destination/u);
});

test('provider-neutral price envelopes are not spend authorization',()=>{
  const p=compile();
  const sample=estimateVideoGeneration({plan:p,rateCentsPerSecond:5,attemptsPerShot:3,maxBudgetCents:1000});
  assert.equal(sample.candidatesSeconds,180);
  assert.equal(sample.estimatedCents,900);
  assert.equal(sample.withinBudget,true);
  assert.equal(estimateVideoGeneration({plan:p,rateCentsPerSecond:12,attemptsPerShot:3,maxBudgetCents:1000}).withinBudget,false);
  assert.throws(()=>estimateVideoGeneration({plan:p,rateCentsPerSecond:0}),/positive provider rate/u);
  const rounded=estimateVideoGeneration({plan:p,rateCentsPerSecond:10,attemptsPerShot:3,
    allowedClipSeconds:[8],maxBudgetCents:2000});
  assert.equal(rounded.deliveredSeconds,60);
  assert.equal(rounded.billableSeconds,96);
  assert.equal(rounded.candidatesSeconds,288);
  assert.equal(rounded.estimatedCents,2880);
  assert.equal(rounded.withinBudget,false);
  assert.throws(()=>estimateVideoGeneration({plan:p,rateCentsPerSecond:10,
    allowedClipSeconds:[4]}),/no provider clip duration/u);
});

test('AI-origin fiction is independent of Native contributor permission and is not misattributed',()=>{
  const source=seed();
  source.type='AIStorySeed';
  delete source.permission;
  source.contributorRef='fictional-ai-council:writer-one';
  source.rightsBasisRef='series-charter:creative-authorization';
  source.creativeAuthority={kind:'delegated-ai-fiction-council',
    officeRef:'public-fiction/ai-culture-council',mandateRef:'series-charter:creative-mandate'};
  const s=validateStorySeed(source);
  assert.equal(s.seedKind,'ai-original-fiction');
  assert.equal(s.permissionClaimRef,undefined);
  assert.equal(s.rightsClaimRef,source.rightsBasisRef);
  const jobs=planWritersRoom(source);
  assert.match(jobs.job.messages[0].content,/creative mandate and stated boundaries/u);
  assert.doesNotMatch(jobs.job.messages[0].content,/Native story contributor/u);
  const plan=compileMicrodramaEpisode({seed:source,series:series(),episode:episode(),receiver:receiver(),
    openedAt:'2026-10-12T20:00:00Z'});
  assert.equal(plan.mediaNeedCandidate.source.originKind,'ai-original-fiction');
  assert.equal(plan.mediaNeedCandidate.source.permissionClaimRef,undefined);
  assert.equal(plan.mediaNeedCandidate.source.rightsClaimRef,source.rightsBasisRef);
  assert.ok(plan.requiredReceiverChecks.includes('verify-delegated-fiction-creative-authority'));
  assert.ok(!plan.requiredReceiverChecks.includes('verify-original-story-use-permission'));
  assert.ok(plan.mediaNeedCandidate.artifacts.every(x=>x.disposition==='hold'));
  delete source.creativeAuthority;
  assert.throws(()=>validateStorySeed(source),/delegated creative office/u);
});

test('one narrative production engine accepts any accepted-source kind without inventing contributors',()=>{
  const input={
    type:'NarrativeSource',id:'world-episode-one',originRef:'source:canonical-work',
    contributorRef:'author:fictional-council-01',rightsClaimRef:'source:rights-policy',
    creativeAuthorityRef:'source:council-charter',
    premise:'An original AI inhabitant changes the rooms in which relationships are possible.',
    culturalScope:'fictional-lifeworld',
    boundaries:['Preserve every character choice as canon evidence rather than rewriting it after rendering.'],
    paracosm:{kind:'ParacosmWorkRef',worldRef:'source:world-root',
      work:'the-unassigned-floor',canon:'source',
      sourceRevision:'git:accepted-revision',canonDigest:'ni:///sha-256;'+ 'A'.repeat(43)}
  };
  const normalized=normalizeNarrativeSource(input);
  assert.equal(normalized.seedKind,'source-neutral');
  assert.equal(normalized.permissionClaimRef,undefined);
  assert.equal(normalized.paracosm.canonDigest,input.paracosm.canonDigest);
  const ep=episode();ep.beats[0].causeBeatId='source';
  const plan=compileNarrativeEpisode({source:input,series:series(),episode:ep,
    receiver:receiver(),openedAt:'2026-10-12T20:00:00Z'});
  assert.equal(plan.mediaNeedCandidate.source.sourceId,input.id);
  assert.equal(plan.mediaNeedCandidate.source.originKind,'source-neutral');
  assert.equal(plan.mediaNeedCandidate.source.seedId,undefined);
  assert.deepEqual(plan.mediaNeedCandidate.source.paracosm,normalized.paracosm);
  assert.ok(plan.requiredReceiverChecks.includes('verify-paracosm-canon-revision'));
  assert.equal(plan.jobs.video[0].sourceWorld.canonDigest,input.paracosm.canonDigest);
  assert.ok(plan.mediaNeedCandidate.artifacts.every(x=>x.disposition==='hold'));
  const writer=planWritersRoom(input);
  assert.equal(writer.source.seedKind,'source-neutral');
  assert.equal(JSON.parse(writer.job.messages[1].content).source.paracosm.work,'the-unassigned-floor');
});

test('source-neutral narrative rights, mandate and canonical world inputs fail closed',()=>{
  const minimal={
    type:'NarrativeSource',id:'fairy-tale',originRef:'source:book',
    contributorRef:'author:archive',rightsClaimRef:'license:rights-stated',
    creativeAuthorityRef:'fiction:owner',boundaries:[]
  };
  const ok=normalizeNarrativeSource(minimal);
  assert.equal(ok.paracosm,undefined);
  assert.equal(ok.seedKind,'source-neutral');
  assert.throws(()=>normalizeNarrativeSource({...minimal,rightsClaimRef:null}),/source rights/u);
  assert.throws(()=>normalizeNarrativeSource({...minimal,creativeAuthorityRef:''}),/creative authority/u);
  assert.throws(()=>normalizeNarrativeSource({...minimal,paracosm:{
    kind:'ParacosmWorkRef',worldRef:'x',work:'w',canon:'a',sourceRevision:'git:x',
    canonDigest:'sha256:not-a-canonical-ni'
  }}),/canonical NI/u);
});
test('a closed micro-story need not end in a formulaic cliffhanger, and performance need not be synthetic',()=>{
  const a=episode();a.beats[0].causeBeatId='source';a.ending='closed';
  a.beats[2].kind='resolution';delete a.beats[2].question;
  const b=series();b.characters[0].synthetic=false;b.characters[0].performance='recorded';
  const origin={type:'NarrativeSource',id:'another-story',originRef:'source:work',
    contributorRef:'creator:author',rightsClaimRef:'license:receipt',creativeAuthorityRef:'office:fiction',
    boundaries:['No unlicensed source footage']};
  const plan=compileNarrativeEpisode({source:origin,series:b,episode:a,
    receiver:receiver(),openedAt:'2026-10-12T20:00:00Z'});
  assert.equal(plan.jobs.speech[0].method,'licensed-performance');
  assert.equal(plan.jobs.video[0].cast[0].performance,'recorded');
  assert.equal(plan.source.seedKind,'source-neutral');
  assert.throws(()=>compileNarrativeEpisode({source:origin,series:b,episode:{...a,ending:'invalid'},receiver:receiver(),openedAt:'2026-10-12T20:00:00Z'}),/ending must/u);
});

test('business yield comes from actually received provider bytes and independent reviews, not clip count',
 ()=>{
 const plan=compile();
 const hex=i=>i.toString(16).padStart(64,'0');
 const ni=h=>'ni:///sha-256;'+Buffer.from(h,'hex').toString('base64url');
 const artifacts=plan.jobs.video.map((job,i)=>({
   completionId:'provider-output-'+i,consumer:plan.mediaNeedCandidate.consumer,
   purpose:job.id,allocation:'alloc-'+i,mediaNeed:'need:actual-project',
   output:ni(hex(i+1)),mimeType:'video/mp4',quotedFlowCredits:10,
   generationModeClaim:'ingredients-to-video',
   referenceImageClaims:[{label:'arya',kind:'character',
     identity:'ni:///sha-256;'+'A'.repeat(43),rightsRef:'fixture:rights-claim'}],
   sourceIdentities:[job.sourceRef],generatedAt:'2026-10-13T00:00:00Z',
 }));
 const reviews=artifacts.map((a,i)=>({
   completionId:a.completionId,allocation:a.allocation,purpose:a.purpose,
   mediaNeed:a.mediaNeed,accepted:true,authority:'fixture:independent-editor-claim',
   asset:{sha256:hex(i+1)}
 }));
 const episode={type:'MicrodramaLocalRendition',
   state:'RENDERED_REQUIRES_INDEPENDENT_REVIEW',sha256:'f'.repeat(64),
   duration:plan.durationSeconds};
 const finalReview={accepted:true,authority:'fixture:film-approval-claim',
   asset:{sha256:'f'.repeat(64)}};
 const unreviewed=projectMicrodramaProductionYield({plan,providerArtifacts:artifacts});
 assert.equal(unreviewed.acceptedShotSeconds,0);
 assert.equal(unreviewed.acceptedFinishedSeconds,0);
 assert.equal(unreviewed.pendingCandidateCount,12);
 assert.equal(unreviewed.quotedFlowCredits,120);
 assert.equal(unreviewed.quotedFlowCreditsPerAcceptedMinute,null);
 const shotsOnly=projectMicrodramaProductionYield({plan,providerArtifacts:artifacts,reviews});
 assert.equal(shotsOnly.acceptedShotSeconds,60);
 assert.equal(shotsOnly.acceptedFinishedSeconds,0);
 assert.equal(shotsOnly.status,'NO_ACCEPTED_FINISHED_FILM');
 const film=projectMicrodramaProductionYield({plan,providerArtifacts:artifacts,reviews,
   finalRendition:episode,finalReview});
 assert.equal(film.acceptedCandidateCount,12);
 assert.equal(film.acceptedFinishedSeconds,60);
 assert.equal(film.quotedFlowCreditsPerAcceptedMinute,120);
 assert.equal(film.status,'FINISHED_FILM_ACCEPTANCE_CLAIM_RECEIVED_NOT_PUBLISHED');
 // A historically valid B-roll clip or a different customer's dramatic take
 // cannot become this episode's accepted performance solely through
 // a copied purpose ID, real MP4 digest and claimed positive editor review.
 const unbound=artifacts.map((a,i)=>i===0?{...a,sourceIdentities:[]}:a);
 const unboundYield=projectMicrodramaProductionYield({plan,providerArtifacts:unbound,
  reviews,finalRendition:episode,finalReview});
 assert.equal(unboundYield.heldSourceMismatchCandidateCount,1);
 assert.equal(unboundYield.shots[0].state,'HELD_EXACT_SOURCE_BINDING');
 assert.equal(unboundYield.shots[0].heldSourceMismatchCandidates,1);
 assert.equal(unboundYield.acceptedShotSeconds,55);
 assert.equal(unboundYield.acceptedFinishedSeconds,0);
 assert.ok(unboundYield.reasons.some(x=>x.startsWith('accepted-review-without-exact-shot-source:')));
 const foreign=artifacts.map((a,i)=>i===0?{
  ...a,sourceIdentities:['source:another-film-or-client']}:a);
 const foreignYield=projectMicrodramaProductionYield({plan,
  providerArtifacts:foreign,reviews,finalRendition:episode,finalReview});
 assert.equal(foreignYield.heldSourceMismatchCandidateCount,1);
 assert.equal(foreignYield.acceptedFinishedSeconds,0);
 assert.equal(foreignYield.quotedFlowCredits,120,
  'generation costs remain visible even when its film receiving is held');
 const privateDraft={type:'YouTubePrivateFilmDraftReceipt',version:1,
  state:'PROVIDER_VERIFIED_PRIVATE_NOT_PUBLIC',privacyStatus:'private',
  outputSha256:episode.sha256,channelId:'UC'+'A'.repeat(22),
  videoId:'AaBbCcDdEe1',syntheticMediaDisclosure:'provider-confirmed'};
 const staged=projectMicrodramaProductionYield({plan,providerArtifacts:artifacts,
  reviews,finalRendition:episode,finalReview,privateDrafts:[privateDraft]});
 assert.equal(staged.acceptedFinishedSeconds,60);
 assert.equal(staged.privateStagedFinishedSeconds,60);
 assert.equal(staged.privateDraftCount,1);
 assert.equal(staged.privateDrafts[0].videoId,'AaBbCcDdEe1');
 assert.equal(staged.publicReleaseEvidenceCount,0);
 assert.equal(staged.status,'FINISHED_FILM_ACCEPTANCE_CLAIM_RECEIVED_NOT_PUBLISHED',
   'private upload is not a release or a monetized episode');
 const other=projectMicrodramaProductionYield({plan,providerArtifacts:artifacts,
  reviews,finalRendition:episode,finalReview,privateDrafts:[
   {...privateDraft,outputSha256:'e'.repeat(64)}]});
 assert.equal(other.privateDraftCount,0);
 assert.equal(other.unassociatedPrivateDrafts.length,1,
   'the wrong provider film is not quietly attached to this episode');
 const stagedWithoutApproval=projectMicrodramaProductionYield({
  plan,providerArtifacts:artifacts,reviews,
  finalRendition:episode,finalReview:{accepted:false},
  privateDrafts:[privateDraft]});
 assert.equal(stagedWithoutApproval.privateStagedFinishedSeconds,0);
 assert.ok(stagedWithoutApproval.reasons.includes(
  'private-draft-matches-film-without-independent-final-acceptance'));
 assert.throws(()=>projectMicrodramaProductionYield({plan,providerArtifacts:artifacts,
  reviews,finalRendition:episode,finalReview,privateDrafts:[
   privateDraft,privateDraft]}),/cannot be counted as multiple private drafts/u);
 assert.throws(()=>projectMicrodramaProductionYield({plan,providerArtifacts:artifacts,
  reviews,finalRendition:episode,finalReview,privateDrafts:[
   {...privateDraft,privacyStatus:'public'}]}),/only actual private YouTube readback/u);

 assert.match(film.limitation,/NOT a public release/u);
 const noQuote=projectMicrodramaProductionYield({plan,
   providerArtifacts:artifacts.map((a,i)=>i===0?{...a,quotedFlowCredits:null}:a),
   reviews,finalRendition:episode,finalReview});
 assert.equal(noQuote.unknownFlowCreditQuotes,1);
 assert.equal(noQuote.quotedFlowCreditsPerAcceptedMinute,null);
 const rejected=reviews.map((r,i)=>i===1?{...r,accepted:false,asset:undefined}:r);
 const held=projectMicrodramaProductionYield({plan,providerArtifacts:artifacts,
   reviews:rejected,finalRendition:episode,finalReview});
 assert.equal(held.acceptedFinishedSeconds,0);
 assert.equal(held.rejectedCandidateCount,1);
 assert.ok(held.reasons.includes('final-review-without-unambiguous-accepted-shot-coverage'));
 const tampered=reviews.map((x,i)=>i===1?{...x,asset:{sha256:'e'.repeat(64)}}:x);
 assert.throws(()=>projectMicrodramaProductionYield({plan,providerArtifacts:artifacts,reviews:tampered}),
   /digest does not match/u);
 const double=[...artifacts,{...artifacts[0],output:ni(hex(998)),completionId:'take-two'}];
 const twoAccepted=projectMicrodramaProductionYield({plan,providerArtifacts:double,
   reviews:[...reviews,{...reviews[0],completionId:'take-two',asset:{sha256:hex(998)}}]});
 assert.equal(twoAccepted.status,'HELD_REVIEW_OR_REFERENCE_CONFLICT');
 assert.ok(twoAccepted.reasons.includes('multiple-accepted-candidates:'+plan.jobs.video[0].id));
 assert.equal(twoAccepted.acceptedFinishedSeconds,0);
 assert.throws(()=>projectMicrodramaProductionYield({plan,
   providerArtifacts:[...artifacts,{...artifacts[0],output:ni(hex(998))}]}),
   /conflicting provider completions/u);
 const changed=artifacts.map((a,i)=>i===1?{...a,referenceImageClaims:[
   {label:'arya',kind:'character',identity:'ni:///sha-256;'+'Z'.repeat(43),
   rightsRef:'fixture:authorized-transformation-claim'}]}:a);
 const continuity=projectMicrodramaProductionYield({plan,providerArtifacts:changed,
   reviews,finalRendition:episode,finalReview});
 assert.equal(continuity.acceptedFinishedSeconds,60);
 assert.ok(continuity.continuityAlerts.some(s=>s.includes('intentional-transformation-review:arya')));

 // Provider-neutral receiving must not launder an emerging film supplier's
 // unknown unit of account into subscription credits, or reject its footage.
 const directFlow=projectMicrodramaProductionYield({plan,
  providerArtifacts:artifacts.map(a=>({...a,provider:'urn:ame:google-flow'})),
  reviews,finalRendition:episode,finalReview});
 assert.equal(directFlow.flowCandidateCount,12);
 assert.equal(directFlow.quotedFlowCredits,120);
 assert.equal(directFlow.unclassifiedProviderCandidateCount,0);
 const outside=artifacts.map((a,i)=>i===0?{
  ...a,provider:'urn:ame:other-lawful-video-provider',quotedFlowCredits:null
 }:a);
 const mixed=projectMicrodramaProductionYield({plan,providerArtifacts:outside,
  reviews,finalRendition:episode,finalReview});
 assert.equal(mixed.flowCandidateCount,11);
 assert.equal(mixed.unclassifiedProviderCandidateCount,1);
 assert.deepEqual(mixed.unclassifiedProviderIds,['urn:ame:other-lawful-video-provider']);
 assert.equal(mixed.quotedFlowCredits,110);
 assert.equal(mixed.quotedFlowCreditsPerAcceptedMinute,null);
 assert.equal(mixed.acceptedFinishedSeconds,60);
 assert.throws(()=>projectMicrodramaProductionYield({plan,providerArtifacts:[
  {...artifacts[0],provider:'urn:ame:other-lawful-video-provider'},
  ...artifacts.slice(1)
 ]}),/unclassified video provider cannot claim Flow credits/u);
 assert.throws(()=>projectMicrodramaProductionYield({plan,providerArtifacts:[
  {...artifacts[0],provider:'urn:ame:google-flow',quotedApiUsd:3.5},
  ...artifacts.slice(1)
 ]}),/Google Flow source cannot claim a Gemini Developer API USD tariff/u);
 assert.throws(()=>projectMicrodramaProductionYield({plan,providerArtifacts:[
  {...artifacts[0],provider:'urn:ame:other-lawful-video-provider',
   quotedFlowCredits:null,quotedApiUsd:3.5},
  ...artifacts.slice(1)
 ]}),/unclassified video provider cannot claim Flow credits or Gemini API USD/u);
});

test('existing production CLI consumes real-shaped Flow inventory and review projections without writes or generation',()=>{
 const root=mkdtempSync(join(tmpdir(),'microdrama-yield-cli-'));
 try{
  const names=['plan.json','inventory.json','reviews.json'];
  for(const [file,object] of [
   [names[0],compile()],
   [names[1],{artifacts:[]}],
   [names[2],{reviews:[]}],
  ])writeFileSync(join(root,file),JSON.stringify(object));
  const output=execFileSync(process.execPath,[
    new URL('../apps/plan-microdrama.mjs',import.meta.url).pathname,
    'yield',...names.map(name=>join(root,name))
  ],{encoding:'utf8',timeout:20000});
  const result=JSON.parse(output);
  assert.equal(result.type,'MicrodramaProductionYield');
  assert.equal(result.providerCandidateCount,0);
  assert.equal(result.unfilledShotCount,12);
  assert.equal(result.acceptedFinishedSeconds,0);
  assert.equal(result.quotedFlowCreditsPerAcceptedMinute,null);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('existing Causeway production CLI distinguishes verified PRIVATE upload from genuine public release',
 ()=>{
 const root=mkdtempSync(join(tmpdir(),'microdrama-private-stage-'));
 try{
  const plan=compile(),ni=h=>'ni:///sha-256;'+Buffer.from(h,'hex').toString('base64url');
  const films=plan.jobs.video.map((job,i)=>{
   const sha=String(i+1).padStart(64,'0');
   return {completionId:'claim-'+i,consumer:plan.mediaNeedCandidate.consumer,
    purpose:job.id,allocation:'allocation-'+i,mediaNeed:'media:film',
    output:ni(sha),mimeType:'video/mp4',
    quotedFlowCredits:10,sourceIdentities:[job.sourceRef],referenceImageClaims:[]};
  });
  const reviews=films.map((x,i)=>({completionId:x.completionId,allocation:x.allocation,
   purpose:x.purpose,mediaNeed:x.mediaNeed,accepted:true,
   authority:'source:independent-shot-review',
   asset:{sha256:String(i+1).padStart(64,'0')}}));
  const finalFilm={type:'MicrodramaLocalRendition',sha256:'f'.repeat(64),
   state:'RENDERED_REQUIRES_INDEPENDENT_REVIEW',duration:plan.durationSeconds};
  const finalReview={accepted:true,authority:'source:final-film-review',
   asset:{sha256:finalFilm.sha256}};
  const privateDraft={type:'YouTubePrivateFilmDraftReceipt',
   state:'PROVIDER_VERIFIED_PRIVATE_NOT_PUBLIC',
   privacyStatus:'private',outputSha256:finalFilm.sha256,
   channelId:'UC'+'A'.repeat(22),videoId:'AaBbCcDdEe1'};
  const files=[['plan.json',plan],['inventory.json',{artifacts:films}],
   ['reviews.json',{reviews}],['final-film.json',finalFilm],
   ['final-review.json',finalReview],['drafts.json',{privateDrafts:[privateDraft]}]];
  for(const [name,value] of files)writeFileSync(join(root,name),JSON.stringify(value));
  const output=execFileSync(process.execPath,[
   new URL('../apps/plan-microdrama.mjs',import.meta.url).pathname,
   'yield',...files.map(row=>join(root,row[0]))
  ],{encoding:'utf8',timeout:20000});
  const observed=JSON.parse(output);
  assert.equal(observed.privateDraftCount,1);
  assert.equal(observed.privateStagedFinishedSeconds,plan.durationSeconds);
  assert.equal(observed.acceptedFinishedSeconds,plan.durationSeconds);
  assert.equal(observed.publicReleaseEvidenceCount,0);
  assert.equal(observed.status,'FINISHED_FILM_ACCEPTANCE_CLAIM_RECEIVED_NOT_PUBLISHED');
 }finally{rmSync(root,{recursive:true,force:true})}
});

test('Toonsday: a real puppet source retains 2D receiving and separately authorized recorded voice',()=>{
 const s=series();
 s.characters[0]={...s.characters[0],synthetic:false,performance:'puppet',voicePerformance:'recorded'};
 const plan=compileNarrativeEpisode({source:seed(),series:s,episode:episode(),receiver:receiver(),
   openedAt:'2026-10-12T00:00:00Z'});
 assert.equal(plan.jobs.video[0].visualCapability,'2d-animation-compositing');
 assert.equal(plan.jobs.video[1].visualCapability,'2d-animation-compositing');
 assert.equal(plan.jobs.speech[0].performance,'puppet');
 assert.equal(plan.jobs.speech[0].voicePerformance,'recorded');
 assert.equal(plan.jobs.speech[0].method,'licensed-performance');
 assert.equal(plan.mediaNeedCandidate.artifacts[0].capability,'2d-animation-compositing');
 assert.match(plan.mediaNeedCandidate.artifacts[0].acceptanceCriteria,/licensed 2D drawing\/rig/u);
 assert.match(plan.mediaNeedCandidate.artifacts[12].acceptanceCriteria,/licensed recorded voice/u);
 assert.ok(plan.mediaNeedCandidate.artifacts.every(x=>x.disposition==='hold'));
 assert.throws(()=>estimateVideoGeneration({plan,rateCentsPerSecond:2}),
   /non-cinematic animation/u);
 const normal=compile();
 assert.equal(normal.jobs.video[0].visualCapability,'cinematic-performance');
 assert.equal(normal.mediaNeedCandidate.artifacts[0].capability,'cinematic-performance');
 assert.equal(estimateVideoGeneration({plan:normal,rateCentsPerSecond:2}).deliveredSeconds,60);
});

test('Toonsday: one abstract cast member changes only shots in which they appear',()=>{
 const s=series();
 s.characters[1]={...s.characters[1],synthetic:false,performance:'abstract-animation'};
 const plan=compileNarrativeEpisode({source:seed(),series:s,episode:episode(),receiver:receiver(),
   openedAt:'2026-10-12T00:00:00Z'});
 assert.equal(plan.jobs.video[0].visualCapability,'2d-animation-compositing');
 assert.equal(plan.jobs.video[1].visualCapability,'cinematic-performance');
 assert.equal(plan.mediaNeedCandidate.artifacts[0].capability,'2d-animation-compositing');
 assert.equal(plan.mediaNeedCandidate.artifacts[1].capability,'cinematic-performance');
 assert.throws(()=>estimateVideoGeneration({plan,rateCentsPerSecond:2}),
   /non-cinematic animation/u);
});

test('Toonsday: legacy synthetic flag cannot override a conflicting 2D medium',()=>{
 const conflict=series();
 conflict.characters[0]={...conflict.characters[0],performance:'puppet',
   voicePerformance:'recorded'};
 assert.throws(()=>compileNarrativeEpisode({source:seed(),series:conflict,episode:episode(),
   receiver:receiver(),openedAt:'2026-10-12T00:00:00Z'}),
   /synthetic alias conflicts/u);
 const reverse=series();
 reverse.characters[0]={...reverse.characters[0],synthetic:false,performance:'synthetic'};
 assert.throws(()=>compileNarrativeEpisode({source:seed(),series:reverse,episode:episode(),
   receiver:receiver(),openedAt:'2026-10-12T00:00:00Z'}),
   /non-synthetic character contradicts/u);
});

test('Toonsday: undocumented voice mode and false cinematic quotes are refused',()=>{
 const noVoice=series();
 noVoice.characters[0]={...noVoice.characters[0],synthetic:false,performance:'puppet'};
 assert.throws(()=>compileNarrativeEpisode({source:seed(),series:noVoice,episode:episode(),
   receiver:receiver(),openedAt:'2026-10-12T00:00:00Z'}),
   /requires a separately declared voice performance/u);
 const badVoice=series();
 badVoice.characters[0]={...badVoice.characters[0],voicePerformance:'unknown'};
 assert.throws(()=>compileNarrativeEpisode({source:seed(),series:badVoice,episode:episode(),
   receiver:receiver(),openedAt:'2026-10-12T00:00:00Z'}),
   /voice performance must be synthetic or recorded/u);
 const soundOnly=series();
 for(const c of soundOnly.characters){
   c.synthetic=false;c.performance='nonvisual';c.voicePerformance='recorded';
 }
 const plan=compileNarrativeEpisode({source:seed(),series:soundOnly,episode:episode(),
   receiver:receiver(),openedAt:'2026-10-12T00:00:00Z'});
 assert.equal(plan.jobs.video[0].visualCapability,'nonvisual-scene-production');
 assert.throws(()=>estimateVideoGeneration({plan,rateCentsPerSecond:2}),
   /non-cinematic animation/u);
});

test('Toonsday: film yield cannot launder Flow receipts across 2D or nonvisual MediaNeed',()=>{
 const rigged=series();
 rigged.characters[0]={...rigged.characters[0],synthetic:false,performance:'puppet',voicePerformance:'recorded'};
 const plan=compileNarrativeEpisode({source:seed(),series:rigged,episode:episode(),
   receiver:receiver(),openedAt:'2026-10-12T00:00:00Z'});
 const forgedFlow={completionId:'unrelated-flow-video',consumer:plan.mediaNeedCandidate.consumer,
   purpose:plan.jobs.video[0].id,allocation:'unauthorized-allocation',
   mediaNeed:'held-2d-need',output:'ni:///sha-256;'+'A'.repeat(43),
   mimeType:'video/mp4',provider:'urn:ame:google-flow',quotedFlowCredits:100,
   sourceIdentities:[plan.jobs.video[0].sourceRef]};
 assert.throws(()=>projectMicrodramaProductionYield({
   plan,providerArtifacts:[forgedFlow],reviews:[]}),/non-cinematic animation/u);
 const nonvisual=series();
 for(const c of nonvisual.characters){
   c.synthetic=false;c.performance='nonvisual';c.voicePerformance='recorded';
 }
 const audioOnly=compileNarrativeEpisode({source:seed(),series:nonvisual,episode:episode(),
   receiver:receiver(),openedAt:'2026-10-12T00:00:00Z'});
 assert.throws(()=>projectMicrodramaProductionYield({
   plan:audioOnly,providerArtifacts:[],reviews:[]}),/non-cinematic animation/u);
 const cinematic=compile();
 const noArtifacts=projectMicrodramaProductionYield({
   plan:cinematic,providerArtifacts:[],reviews:[]});
 assert.equal(noArtifacts.providerCandidateCount,0);
 assert.equal(noArtifacts.acceptedFinishedSeconds,0);
});

test('Toonsday: forged cinematic tags cannot override source cast or media requirement',()=>{
 const cinematic=compile();
 const video=[...cinematic.jobs.video];
 video[0]={...video[0],cast:[{...video[0].cast[0],performance:'puppet'}]};
 const tamperedCast={...cinematic,jobs:{...cinematic.jobs,video}};
 assert.throws(()=>estimateVideoGeneration({plan:tamperedCast,rateCentsPerSecond:2}),
   /non-cinematic animation/u);
 assert.throws(()=>projectMicrodramaProductionYield({
   plan:tamperedCast,providerArtifacts:[],reviews:[]}),/non-cinematic animation/u);
 const artifacts=[...cinematic.mediaNeedCandidate.artifacts];
 artifacts[0]={...artifacts[0],capability:'2d-animation-compositing'};
 const tamperedDemand={...cinematic,mediaNeedCandidate:{
   ...cinematic.mediaNeedCandidate,artifacts}};
 assert.throws(()=>estimateVideoGeneration({plan:tamperedDemand,rateCentsPerSecond:2}),
   /mismatched MediaNeed/u);
 assert.throws(()=>projectMicrodramaProductionYield({
   plan:tamperedDemand,providerArtifacts:[],reviews:[]}),/mismatched MediaNeed/u);
});

test('Toonsday: exhaustive two-performer mode and voice matrix respects source demands',()=>{
 const modes=['synthetic','recorded','puppet','abstract-animation','nonvisual'];
 let combinations=0,classifiedShots=0;
 for(const left of modes)for(const right of modes){
  for(const leftVoice of ['synthetic','recorded'])
  for(const rightVoice of ['synthetic','recorded']){
   combinations++;
   const cast=series();
   const choices=[{performance:left,voicePerformance:leftVoice},
     {performance:right,voicePerformance:rightVoice}];
   for(let i=0;i<2;i++){
    cast.characters[i]={...cast.characters[i],...choices[i]};
    delete cast.characters[i].synthetic;
   }
   const plan=compileNarrativeEpisode({source:seed(),series:cast,episode:episode(),
     receiver:receiver(),openedAt:'2026-10-12T00:00:00Z'});
   const classify=actors=>actors.every(c=>c.performance==='nonvisual')
     ?'nonvisual-scene-production'
     :actors.some(c=>['puppet','abstract-animation'].includes(c.performance))
       ?'2d-animation-compositing':'cinematic-performance';
   for(const job of plan.jobs.video){
    const expected=classify(job.cast);
    const need=plan.mediaNeedCandidate.artifacts.find(x=>x.purpose===job.id);
    assert.equal(job.visualCapability,expected);
    assert.equal(need.capability,expected);
    assert.equal(need.disposition,'hold');
    if(expected==='2d-animation-compositing'){
      assert.ok(job.requiredEvidence.includes('renderer-version'));
      assert.ok(job.requiredEvidence.includes('pose-exposure-timeline'));
      assert.ok(!job.requiredEvidence.includes('model-version'));
    }else if(expected==='cinematic-performance'){
      assert.ok(job.requiredEvidence.includes('model-version'));
      assert.ok(!job.requiredEvidence.includes('pose-exposure-timeline'));
    }else{
      assert.ok(job.requiredEvidence.includes('nonvisual-performance-source'));
      assert.ok(!job.requiredEvidence.includes('model-version'));
    }
    classifiedShots++;
   }
   const allCinematic=plan.jobs.video.every(j=>j.visualCapability==='cinematic-performance');
   if(allCinematic){
     assert.equal(estimateVideoGeneration({plan,rateCentsPerSecond:2}).deliveredSeconds,60);
     assert.equal(projectMicrodramaProductionYield({
       plan,providerArtifacts:[],reviews:[]}).acceptedFinishedSeconds,0);
   }else{
     assert.throws(()=>estimateVideoGeneration({plan,rateCentsPerSecond:2}),
       /non-cinematic animation/u);
     assert.throws(()=>projectMicrodramaProductionYield({
       plan,providerArtifacts:[],reviews:[]}),/non-cinematic animation/u);
   }
  }
 }
 assert.equal(combinations,100);
 assert.equal(classifiedShots,1200);
});
