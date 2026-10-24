/**
 * Public Fiction: compile a claimed-permission story-seed candidate and a generated
 * episode into a reproducible, provider-neutral production *proposal*.
 * No inference, video, procurement, channel writes, or publication occur here.
 * Every output MediaNeed remains on hold until actual receiver admission.
 */
import { admitMediaNeed } from '../../../src/media-need-contract.mjs';

const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
// Only received provider identities may be assigned a denomination. New
// providers are valid footage sources, not silently Google Flow spend.
const FLOW_PROVIDERS = new Set(['legacy-flow-source','urn:ame:google-flow']);
const GEMINI_API_PROVIDER = 'urn:ame:google-gemini-developer-api';
const text = (x, what) => {
  if (typeof x !== 'string' || !x.trim()) throw new TypeError(`${what} must be nonempty text`);
  return x.trim();
};
const cleanId = (x, what) => {
  const s = text(x, what);
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/u.test(s)) throw new TypeError(`${what} must be a stable lowercase kebab-case id`);
  return s;
};
const int = (v, what, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  if (!Number.isSafeInteger(v) || v < min || v > max) throw new TypeError(`${what} must be an integer in [${min},${max}]`);
  return v;
};
const unique = (arr, label) => {
  if (new Set(arr).size !== arr.length) throw new TypeError(`${label} contains duplicate identities`);
};
const ensure = (condition, message) => { if (!condition) throw new TypeError(message); };
const frozen = x => Object.freeze(x);

export function validateStorySeed(seed) {
  ensure(object(seed) && ['NativeStorySeed', 'AIStorySeed'].includes(seed.type),
    'NativeStorySeed or AIStorySeed is required');
  const id = cleanId(seed.id, 'seed id');
  const premise = text(seed.premise, 'story premise');
  const originRef = text(seed.originRef, 'origin source reference');
  const contributorRef = text(seed.contributorRef, 'contributor source reference');
  ensure(Array.isArray(seed.boundaries) && seed.boundaries.length > 0, 'creator boundaries are required');
  const boundaries = seed.boundaries.map((v, i) => text(v, `boundary ${i}`));
  const culturalScope = seed.culturalScope === undefined ? 'unspecified' : text(seed.culturalScope, 'cultural scope');
  if (seed.type === 'AIStorySeed') {
    ensure(object(seed.creativeAuthority) &&
      seed.creativeAuthority.kind === 'delegated-ai-fiction-council' &&
      typeof seed.creativeAuthority.officeRef === 'string' &&
      seed.creativeAuthority.officeRef.trim() &&
      typeof seed.creativeAuthority.mandateRef === 'string' &&
      seed.creativeAuthority.mandateRef.trim(), 'AI fiction requires a delegated creative office and mandate reference');
    return frozen({id,premise,originRef,contributorRef,seedKind:'ai-original-fiction',
      boundaries:frozen(boundaries),culturalScope,
      rightsClaimRef:text(seed.rightsBasisRef,'AI fiction rights basis reference'),
      creativeAuthority:frozen({kind:'delegated-ai-fiction-council',
        officeRef:seed.creativeAuthority.officeRef.trim(),
        mandateRef:seed.creativeAuthority.mandateRef.trim()})});
  }
  ensure(object(seed.permission) && seed.permission.adaptation === 'claimed-permitted' &&
    seed.permission.syntheticPerformance === 'claimed-permitted' &&
    typeof seed.permission.recordRef === 'string' && seed.permission.recordRef.trim(),
    'documented claimed permission for AI adaptation and original synthetic performances is required');
  // Input claims, whether human permission or AI authorship, do not prove legal rights.
  return frozen({id,premise,originRef,contributorRef,seedKind:'native-contributed',
    boundaries:frozen(boundaries),permissionClaimRef:seed.permission.recordRef.trim(),culturalScope});
}
/** Admission of a *source* is distinct from cultural, contributor and
 * publicity claims. Provenance is interpreted by the owning source service,
 * not by whether a source is human, AI, translated, commissioned or historic. */
export function normalizeNarrativeSource(value) {
  if (value?.type === "NativeStorySeed" || value?.type === "AIStorySeed") {
    return validateStorySeed(value); // compatibility at the INPUT boundary
  }
  ensure(object(value) && value.type === "NarrativeSource", "NarrativeSource required");
  const id=cleanId(value.id,"narrative source id");
  const originRef=text(value.originRef,"narrative source originRef");
  const contributorRef=text(value.contributorRef,"narrative source contributorRef");
  const rightsClaimRef=text(value.rightsClaimRef,"source rights evidence reference");
  const creativeAuthorityRef=text(value.creativeAuthorityRef,"creative authority reference");
  ensure(Array.isArray(value.boundaries),"source boundaries must be an array");
  const boundaries=value.boundaries.map((v,i)=>text(v,`boundary ${i}`));
  const premise=value.premise===undefined?null:text(value.premise,"narrative premise");
  let paracosm;
  if(value.paracosm!==undefined){
    const world=value.paracosm;
    ensure(object(world)&&world.kind==="ParacosmWorkRef","paracosm binding must be ParacosmWorkRef");
    paracosm=frozen({
      kind:"ParacosmWorkRef",worldRef:text(world.worldRef,"paracosm worldRef"),
      work:text(world.work,"paracosm work"),canon:text(world.canon,"paracosm canon"),
      sourceRevision:text(world.sourceRevision,"world source revision"),
      // An unknown digest is an explicit hold; never construct one from a pathname.
      ...(world.canonDigest===undefined?{}:{canonDigest:text(world.canonDigest,"world canon digest")}),
    });
    if(paracosm.canonDigest!==undefined)
      ensure(/^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u.test(paracosm.canonDigest),
        "paracosm canon digest must be canonical NI");
  }
  return frozen({id,originRef,contributorRef,rightsClaimRef,creativeAuthorityRef,
    seedKind:"source-neutral",boundaries:frozen(boundaries),
    ...(premise===null?{}:{premise}),
    culturalScope:value.culturalScope??"unspecified",
    ...(paracosm?{paracosm}:{})
  });
}

/** A job for the existing Red Cup inference-dispatch JSONL contract, not an API call. */
export function planWritersRoom(seed, {episodeCount = 3, maxTokens = 3500} = {}) {
  const source = normalizeNarrativeSource(seed);
  int(episodeCount, 'episodeCount', 1, 12);
  int(maxTokens, 'maxTokens', 512, 12000);
  return frozen({
    type:'MicrodramaWriterCandidate',status:'UNEXECUTED_INFERENCE_JOB',source,
    job:frozen({id:`${source.id}-writers-room`, maxTokens,
      messages:frozen([
        frozen({role:'system',content:'Develop ORIGINAL serialized dramatic fiction from the supplied source and its accepted paracosm/canon, if any. Return structured JSON candidates, not tool calls. Character choices must have costs, causal consequences and intelligible relationships; avoid formulaic recycling. You are a candidate author, not an authority to invent consent, community representation, or publication rights. Preserve the source ownership, creative mandate and stated boundaries. Do not treat first-person fictional voices as scientific evidence about actual AI systems. Do not invent cultural claims as verified facts.'}),
        frozen({role:'user',content:JSON.stringify({source,episodeCount,formatProfile:'microdrama-9:16'})})
      ])})
  });
}

const formatSrtTime = (frames, fps) => {
  const ms = Math.round(frames * 1000 / fps);
  const hh = Math.floor(ms / 3600000), mm = Math.floor(ms % 3600000 / 60000);
  const ss = Math.floor(ms % 60000 / 1000), mmm = ms % 1000;
  return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')},${String(mmm).padStart(3,'0')}`;
};
const legalRef = (x, label) => text(x, label);

export function compileNarrativeEpisode({source: inputSource, series, episode, receiver, openedAt, maxShotSeconds = 8} = {}) {
  const source = normalizeNarrativeSource(inputSource);
  ensure(object(series), 'series bible is required');
  const seriesId = cleanId(series.id, 'series id');
  ensure(Array.isArray(series.characters) && series.characters.length > 0, 'series characters are required');
  ensure(Array.isArray(series.locations) && series.locations.length > 0, 'series locations are required');
  const characters = new Map(), locations = new Map();
  for (const raw of series.characters) {
    ensure(object(raw),'character must be a resource binding');
    const performance=raw.synthetic===true?'synthetic':raw.performance;
    ensure(['synthetic','recorded','puppet','abstract-animation','nonvisual'].includes(performance),
      'character requires a declared accepted performance mode');
    const id = cleanId(raw.id, 'character id');
    ensure(!characters.has(id), 'duplicate character id');
    characters.set(id, frozen({id,performance,visualRef:legalRef(raw.visualRef,'canonical character visual reference'),
      voiceRef:legalRef(raw.voiceRef,'canonical original synthetic voice reference'),
      name:text(raw.name,'character name')}));
  }
  for (const raw of series.locations) {
    ensure(object(raw), 'location must be an object');
    const id = cleanId(raw.id, 'location id');
    ensure(!locations.has(id), 'duplicate location id');
    locations.set(id, frozen({id,referenceRef:legalRef(raw.referenceRef,'location reference')}));
  }
  ensure(object(episode), 'episode is required');
  const episodeId = cleanId(episode.id, 'episode id');
  int(episode.number, 'episode number', 1, 999);
  const fps = episode.fps ?? 30;
  ensure(fps === 30, 'only 30fps is supported by this deterministic compiler');
  int(maxShotSeconds,'maxShotSeconds',1,30);
  ensure(Array.isArray(episode.beats) && episode.beats.length >= 3, 'at least three causal beats required');
  ensure(Array.isArray(episode.shots) && episode.shots.length >= 3, 'at least three shots required');
  const beats = new Map();
  for (const [i,b] of episode.beats.entries()) {
    ensure(object(b),`beat ${i} must be an object`);
    const id = cleanId(b.id,`beat ${i} id`);
    ensure(!beats.has(id), 'duplicate beat id');
    text(b.action,`beat ${i} action`); text(b.consequence,`beat ${i} consequence`);
    if (i === 0) ensure(['source','seed'].includes(b.causeBeatId), 'first beat must trace to the narrative source');
    else ensure(beats.has(b.causeBeatId),`beat ${id} must causally reference an earlier beat`);
    beats.set(id, frozen({...b,id}));
  }
  const lastBeat = episode.beats.at(-1);
  const ending=episode.ending??'serial-question';
  ensure(['serial-question','closed'].includes(ending),'ending must be serial-question or closed');
  if(ending==='serial-question') ensure(lastBeat.kind==='cliffhanger' &&
    typeof lastBeat.question==='string' && lastBeat.question.trim(),
    'serial-question requires a substantive unresolved dramatic question');
  else ensure(lastBeat.kind==='resolution','a closed micro-story needs a consequence-bearing resolution');
  ensure(object(receiver), 'receiving media service is required');
  const consumer = text(receiver.consumer,'receiving owner');
  const destination = text(receiver.destination,'intended destination');
  const acceptanceCriteria = text(receiver.acceptanceCriteria,'receiver acceptance criteria');
  const openedTime = new Date(openedAt);
  ensure(typeof openedAt === 'string' && Number.isFinite(openedTime.getTime()),'openedAt must be an explicit instant');
  const shotIds=[], timeline=[], videoJobs=[], speechJobs=[], captions=[];
  const beatSequence=[...beats.keys()];
  let previousBeatIndex=-1, totalFrames=0;
  for (const [i,s] of episode.shots.entries()) {
    ensure(object(s),`shot ${i} must be an object`);
    const id = cleanId(s.id,`shot ${i} id`);
    shotIds.push(id);
    const frames = int(s.frames,`shot ${id} frames`,1,maxShotSeconds*fps);
    // Keep synchronized, provider-native acting/sound instead of re-synthesizing every line.
    const audioMode = s.audioMode ?? 'separate-voice';
    ensure(['separate-voice','embedded-performance'].includes(audioMode),
      `shot ${id} audioMode must be separate-voice or embedded-performance`);
    const beatIndex = beatSequence.indexOf(s.beatId);
    ensure(beatIndex >= 0,`shot ${id} must reference an existing dramatic beat`);
    ensure(beatIndex >= previousBeatIndex, 'shot sequence must preserve causal beat order');
    previousBeatIndex = beatIndex;
    const loc = locations.get(s.locationId);
    ensure(loc,`shot ${id} references missing location`);
    ensure(Array.isArray(s.characterIds) && s.characterIds.length > 0,`shot ${id} requires cast`);
    unique(s.characterIds,`shot ${id} cast`);
    const cast = s.characterIds.map(cid=>{
      ensure(characters.has(cid), `shot ${id} references missing character ${cid}`);
      return characters.get(cid);
    });
    const action = text(s.action,`shot ${id} action`);
    const camera = text(s.camera,`shot ${id} camera`);
    const startFrame=totalFrames, endFrame=startFrame+frames;
    ensure(Array.isArray(s.dialogue), `shot ${id} dialogue array required`);
    let preceding=0;
    const spokenDialogue=[];
    for (const [j,line] of s.dialogue.entries()) {
      ensure(object(line),`shot ${id} dialogue ${j} must be an object`);
      ensure(s.characterIds.includes(line.speakerId),`shot ${id} dialogue speaker must be in shot cast`);
      const begin=int(line.startFrame,`shot ${id} dialogue start`,0,frames-1);
      const end=int(line.endFrame,`shot ${id} dialogue end`,begin+1,frames);
      ensure(begin >= preceding,`shot ${id} dialogue lines cannot overlap`);
      preceding=end;
      const utterance=text(line.text,`shot ${id} dialogue content`);
      ensure(!/[\r\n]/u.test(utterance),`shot ${id} dialogue text must be single-line`);
      const speaker=characters.get(line.speakerId);
      const ref=`${seriesId}-${episodeId}-${id}-line-${j+1}`;
      spokenDialogue.push(frozen({id:ref,speakerId:speaker.id,text:utterance,startFrame:begin,endFrame:end}));
      if (audioMode==='separate-voice') speechJobs.push(frozen({id:ref,shotId:id,speakerId:speaker.id,performance:speaker.performance,voiceRef:speaker.voiceRef,
        text:utterance,startFrame:startFrame+begin,endFrame:startFrame+end,
        method:speaker.performance==='synthetic'?'synthetic-original-voice':'licensed-performance',sourceRef:source.originRef,sourceWorld:source.paracosm??null}));
      captions.push({startFrame:startFrame+begin,endFrame:startFrame+end,text:utterance});
    }
    videoJobs.push(frozen({id:`${seriesId}-${episodeId}-${id}-video`,shotId:id,
      durationFrames:frames,fps,aspectRatio:'9:16',audioMode,
      spokenDialogue:frozen(spokenDialogue),camera,action,cast:frozen(cast),
      location:loc,beatId:s.beatId,sourceRef:source.originRef,sourceWorld:source.paracosm??null,
      requiredEvidence:frozen(['provider-id','model-version','input-digest','output-sha256','license','asset-custody',
        ...(audioMode==='embedded-performance'?['audio-stream','dialogue-and-sync-review','sound-rights']:[])])}));
    timeline.push(frozen({shotId:id,beatId:s.beatId,startFrame,endFrame,locationId:loc.id,
      characterIds:frozen([...s.characterIds])}));
    totalFrames=endFrame;
  }
  unique(shotIds,'episode shots');
  ensure(previousBeatIndex === beatSequence.length-1,'last shot must show the cliffhanger beat');
  ensure(new Set(timeline.map(x=>x.beatId)).size === episode.beats.length,
    'every dramatic beat must appear in the shot plan');
  ensure(totalFrames >= 15*fps && totalFrames <= 180*fps,
    'episode must be 15-180 seconds for this Shorts production profile');
  const subtitles=captions.map((c,i)=>`${i+1}\n${formatSrtTime(c.startFrame,fps)} --> ${formatSrtTime(c.endFrame,fps)}\n${c.text}\n`).join('\n');
  const needs=[...videoJobs.map(v=>({capability:'cinematic-performance',purpose:v.id,
    wanted:1,priority:0,disposition:'hold',destination,
    acceptanceCriteria:`${acceptanceCriteria}; must retain 9:16; exact shot/canonical cast/location refs; ${v.durationFrames} frames at ${fps}fps; source/provenance/usage rights; actual character performance, legible physical choice and source-specific acting; atmosphere-only or location B-roll cannot substitute; inspect actual output; ${v.audioMode==='embedded-performance'?'retain source performance audio and independently review dialogue/synchronization':'audio is externally performed and assembled from accepted speech jobs'}`})),
    ...speechJobs.map(a=>({capability:'audio-production',purpose:a.id,
      wanted:1,priority:0,disposition:'hold',destination,
      acceptanceCriteria:`${acceptanceCriteria}; original synthetic voice identity, transcript and frame-accurate dialogue sync, rights/provenance`}))];
  const candidate={type:'MediaNeed',version:1,consumer,objective:`Produce ${episodeId} from ${source.id}`,
    openedAt:openedTime.toISOString(),source:{ideaRef:source.originRef,sourceId:source.id,
      ...(source.seedKind!=="source-neutral"?{seedId:source.id}:{}),
      episodeId,seriesId,contributorRef:source.contributorRef,
      originKind:source.seedKind,
      ...(source.permissionClaimRef?{permissionClaimRef:source.permissionClaimRef}:{}),
      ...(source.rightsClaimRef?{rightsClaimRef:source.rightsClaimRef}:{}),
      ...(source.creativeAuthority?{creativeAuthority:source.creativeAuthority}:{}),
      ...(source.creativeAuthorityRef?{creativeAuthorityRef:source.creativeAuthorityRef}:{}),
      ...(source.paracosm?{paracosm:source.paracosm}:{}),
      speechAct:'unapproved-episode-production-projection'},
    intake:{state:'proposed-unverified',acceptanceCriteria},artifacts:needs};
  // Existing house validator checks stable artifact keys, bounds and shape.
  // This is never an admitted journal identity or a procurement authorization.
  admitMediaNeed({...candidate,id:'unrecorded-microdrama-projection'});
  return frozen({type:'MicrodramaProductionProposal',version:1,status:'PROPOSED_NOT_ADMITTED',
    seriesId,episodeId,source,frameRate:fps,aspectRatio:'9:16',totalFrames,durationSeconds:totalFrames/fps,
    cast:frozen([...characters.values()]),locations:frozen([...locations.values()]),
    jobs:frozen({video:frozen(videoJobs),speech:frozen(speechJobs)}),
    timeline:frozen(timeline),subtitlesSrt:subtitles,mediaNeedCandidate:frozen(candidate),
    requiredReceiverChecks:frozen([...(source.seedKind==='native-contributed'
      ? ['verify-original-story-use-permission','verify-cultural-claim-provenance']
      : source.seedKind==='ai-original-fiction'
      ? ['verify-delegated-fiction-creative-authority','verify-original-fiction-rights-basis',
        'label-fictional-ai-culture-not-empirical-testimony']
      : ['verify-narrative-source-authority','verify-source-rights-claims',
        ...(source.paracosm?['verify-paracosm-canon-revision','verify-paracosm-work-source']:[])]),
      'verify-visual-and-voice-licenses','inspect-cast-and-location-continuity',
      'compare-actual-rendered-audio-and-video','independent-editorial-acceptance',
      'youtube-synthetic-media-disclosure','youtube-channel-and-upload-authority'])});
}

/** The old source-specific input shape remains an explicitly named adapter.
 * The production engine above has no coupling to Native or AI provenance. */
export function compileMicrodramaEpisode({seed, ...options} = {}) {
  return compileNarrativeEpisode({...options,source:seed});
}

/** Budget calculation, not reservation, price forecast, or spending authority. */
export function estimateVideoGeneration({plan, rateCentsPerSecond, attemptsPerShot=1,
  maxBudgetCents, allowedClipSeconds=null}={}) {
  ensure(plan?.type==='MicrodramaProductionProposal', 'compiled production plan required');
  ensure(Number.isFinite(rateCentsPerSecond) && rateCentsPerSecond > 0,
    'an observed positive provider rate is required');
  int(attemptsPerShot,'attemptsPerShot',1,100);
  if(allowedClipSeconds!==null) {
    ensure(Array.isArray(allowedClipSeconds) && allowedClipSeconds.length>0, 'allowedClipSeconds must be a nonempty array');
    unique(allowedClipSeconds,'provider clip durations');
    for(const n of allowedClipSeconds) int(n,'provider clip duration',1,120);
  }
  const durationOptions=allowedClipSeconds===null?null:[...allowedClipSeconds].sort((a,b)=>a-b);
  let deliveredSeconds=0,billableSeconds=0;
  const shots=plan.jobs.video.map(job=>{
    const needed=job.durationFrames/plan.frameRate;
    const billed=durationOptions?.find(n=>n+1e-9>=needed)??(durationOptions===null?needed:null);
    ensure(billed!==null,`no provider clip duration can satisfy shot ${job.shotId}`);
    deliveredSeconds+=needed;
    billableSeconds+=billed;
    return frozen({shotId:job.shotId,requiredSeconds:needed,billableClipSeconds:billed});
  });
  const candidatesSeconds=billableSeconds*attemptsPerShot;
  const estimatedCents=Math.ceil(candidatesSeconds*rateCentsPerSecond);
  if(maxBudgetCents !== undefined) int(maxBudgetCents,'maxBudgetCents',0);
  return frozen({type:'VideoGenerationEstimate',shots:frozen(shots),deliveredSeconds,billableSeconds,
    candidatesSeconds,attemptsPerShot,estimatedCents,
    withinBudget:maxBudgetCents === undefined?null:estimatedCents <= maxBudgetCents,
    note:'Video generation duration billed by each provider model, including clip rounding and repeats; excludes provider reference surcharges, rejected outputs beyond modeled attempts, audio, editorial, assembly, and publishing. No purchase or hold.'});
}


/**
 * Derive cinema throughput from ALREADY RETAINED provider custody, parent Media
 * Artifact Reviews and a genuine assembled rendition. No new receipt, ledger,
 * provider call, money conversion or inferred editorial acceptance is created.
 *
 * A shot accepted for editing is NOT an independently accepted finished film.
 * The latter requires a separate exact-byte parent review of the final MP4.
 */
export function projectMicrodramaProductionYield({
 plan,providerArtifacts,reviews=[],finalRendition=null,finalReview=null,
 privateDrafts=[]
}={}){
 ensure(plan?.type==='MicrodramaProductionProposal'&&Array.isArray(plan.jobs?.video),
  'compiled source-bound microdrama plan is required');
 ensure(Array.isArray(providerArtifacts)&&Array.isArray(reviews)&&Array.isArray(privateDrafts),
  'observed provider custody, review and private draft collections are required');
 const own=plan.mediaNeedCandidate?.consumer;
 const jobs=new Map(plan.jobs.video.map(j=>[j.id,j]));
 ensure(jobs.size===plan.jobs.video.length,'compiled video job IDs are ambiguous');
 const emitted=new Map(),observations=[];
 const niForSha=x=>'ni:///sha-256;'+Buffer.from(x,'hex').toString('base64url');
 const exactNi=x=>typeof x==='string'&&/^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u.test(x);
 for(const row of providerArtifacts){
  if(!object(row)||row.consumer!==own||!jobs.has(row.purpose))continue;
  const id=text(row.completionId,'provider completion identity');
  const evidence={completionId:id,purpose:row.purpose,output:row.output??null,
   allocation:row.allocation??null,mediaNeed:row.mediaNeed??null,
   generatedAt:row.generatedAt??null,quotedFlowCredits:row.quotedFlowCredits??null,
   provider:row.provider??'legacy-flow-source',
   quotedApiUsd:row.quotedApiUsd??null,
   generationModeClaim:row.generationModeClaim??null,
   referenceImageClaims:row.referenceImageClaims??[],
   sourceCompositeCoverageClaims:row.sourceCompositeCoverageClaims??[],
   sourceIdentities:row.sourceIdentities??[]};
  if(emitted.has(id)){
   const previous=emitted.get(id);
   // Replays may have updated delivery state; a completion cannot change its
   // source, purposes, output or original cost.
   ensure(JSON.stringify(previous)===JSON.stringify(evidence),
     'conflicting provider completions reuse the same identity');
   continue;
  }
  ensure(row.mimeType==='video/mp4'||row.mimeType==='video/webm',
   'provider output for a video job has the wrong media type');
  ensure(exactNi(row.output),'provider completion must contain exact output identity');
  ensure(evidence.quotedFlowCredits===null||Number.isSafeInteger(evidence.quotedFlowCredits)&&
   evidence.quotedFlowCredits>=0,'Flow credit quote must be a nonnegative integer or unknown');
  if(evidence.provider===GEMINI_API_PROVIDER){
   ensure(evidence.quotedFlowCredits===null,
    'Gemini API USD media cannot claim a Google Flow subscription credit');
   ensure(evidence.quotedApiUsd===null||Number.isFinite(evidence.quotedApiUsd)&&
    evidence.quotedApiUsd>=0&&Number.isSafeInteger(Math.round(evidence.quotedApiUsd*100)),
    'Gemini API USD estimate must be bounded and separate from actual charged amount');
  }else if(FLOW_PROVIDERS.has(evidence.provider)){
   ensure(evidence.quotedApiUsd===null,
    'Google Flow source cannot claim a Gemini Developer API USD tariff');
  }else{
   ensure(evidence.quotedFlowCredits===null&&evidence.quotedApiUsd===null,
    'unclassified video provider cannot claim Flow credits or Gemini API USD');
  }
  ensure(Array.isArray(evidence.referenceImageClaims)&&
   Array.isArray(evidence.sourceCompositeCoverageClaims)&&
   Array.isArray(evidence.sourceIdentities),
   'provider reference provenance must be arrays');
  if(evidence.sourceCompositeCoverageClaims.length){
   const composed=new Set(evidence.referenceImageClaims.filter(x=>x.kind==='scene')
    .map(x=>x.identity));
   ensure(composed.size>0,'composite coverage requires a real provider-visible original scene image');
   const seen=new Set();
   for(const coverage of evidence.sourceCompositeCoverageClaims){
    ensure(object(coverage)&&['character','location'].includes(coverage.kind)&&
     typeof coverage.id==='string'&&coverage.id.trim()&&
     exactNi(coverage.visualNi)&&exactNi(coverage.composedFromNi)&&
     composed.has(coverage.composedFromNi)&&
     typeof coverage.independentCompositionApproval==='string'&&
     coverage.independentCompositionApproval.trim(),
     'source-covered actor/place must match the original provider-visible ensemble composition');
    const key=coverage.kind+'\0'+coverage.id;
    ensure(!seen.has(key),'ambiguous duplicate source role in original ensemble composition');
    seen.add(key);
   }
  }
  emitted.set(id,evidence);observations.push(evidence);
 }
 const reviewsByCompletion=new Map();
 for(const review of reviews){
  if(!object(review)||!emitted.has(review.completionId))continue;
  const id=review.completionId;
  ensure(!reviewsByCompletion.has(id),'multiple conflicting reviews for one provider completion');
  reviewsByCompletion.set(id,review);
 }
 const reasons=[],alerts=[],shots=[],continuityByRole=new Map();
 let acceptedSourceSeconds=0,acceptedCandidates=0,rejectedCandidates=0,awaitingReview=0;
 let heldSourceMismatchCandidates=0;
 let quotedFlowCredits=0,unknownFlowCreditQuotes=0,flowCandidateCount=0;
 let quotedGeminiApiCents=0,unknownGeminiApiQuotes=0,geminiApiCandidateCount=0;
 const unclassifiedProviderIds=new Set();
 let unclassifiedProviderCandidateCount=0;
 for(const row of observations){
  if(row.provider===GEMINI_API_PROVIDER){
   geminiApiCandidateCount++;
   if(row.quotedApiUsd===null)unknownGeminiApiQuotes++;
   else quotedGeminiApiCents+=Math.round(row.quotedApiUsd*100);
  }else if(FLOW_PROVIDERS.has(row.provider)){
   flowCandidateCount++;
   if(row.quotedFlowCredits===null)unknownFlowCreditQuotes++;
   else quotedFlowCredits+=row.quotedFlowCredits;
  }else{
   unclassifiedProviderCandidateCount++;
   unclassifiedProviderIds.add(row.provider);
  }
 }
 ensure(Number.isSafeInteger(quotedGeminiApiCents),
  'estimated video provider USD total exceeds exact financial precision');
 for(const job of plan.jobs.video){
  const proposed=observations.filter(row=>row.purpose===job.id);
  const accepted=[];
  let rejected=0,pending=0,heldSourceMismatch=0;
  for(const candidate of proposed){
   const review=reviewsByCompletion.get(candidate.completionId);
   if(!review){pending++;continue;}
   ensure(review.purpose===job.id&&review.allocation===candidate.allocation&&
     review.mediaNeed===candidate.mediaNeed,
     'review attribution disagrees with source-owned provider completion');
   if(review.accepted===false){rejected++;continue;}
   ensure(review.accepted===true,'review must explicitly accept or reject');
   const digest=review.asset?.sha256;
   ensure(typeof digest==='string'&&/^[a-f0-9]{64}$/u.test(digest)&&
     niForSha(digest)===candidate.output,
     'accepted review digest does not match the provider output bytes');
   ensure(typeof review.authority==='string'&&review.authority.trim(),
     'accepted footage needs independent receiving authority reference');
   // Environmental B-roll or another customer's media can be legitimate video
   // with an independent favorable review but NOT this screenplay's footage.
   // Missing or contrary source provenance is an evidence hold, never
   // automatic artistic rejection or retroactive repurposing.
   if(!candidate.sourceIdentities.includes(job.sourceRef)){
     heldSourceMismatch++;heldSourceMismatchCandidates++;
     reasons.push('accepted-review-without-exact-shot-source:'+job.id+':'+candidate.completionId);
     continue;
   }
   accepted.push(candidate);
  }
  rejectedCandidates+=rejected;awaitingReview+=pending;
  if(accepted.length>1)reasons.push('multiple-accepted-candidates:'+job.id);
  if(accepted.length===1){
   acceptedCandidates++;
   acceptedSourceSeconds+=job.durationFrames/plan.frameRate;
   const winner=accepted[0];
   // A composed cast image never proves that each constituent character
   // actually survived Veo on screen. Keep that editorial obligation visible.
   for(const covered of winner.sourceCompositeCoverageClaims){
    if(covered.kind==='character'&&job.cast.some(x=>x.id===covered.id))
     alerts.push('composite-cast-performance-requires-independent-identity-review:'+
      covered.id+':'+job.shotId);
   }
   const characterRefs=winner.referenceImageClaims.filter(v=>v.kind==='character');
   for(const ref of characterRefs){
     if(!job.cast.some(x=>x.id===ref.label))continue;
     const prev=continuityByRole.get(ref.label);
     if(prev&&prev.identity!==ref.identity)
       alerts.push('character-reference-change-requires-intentional-transformation-review:'+ref.label+':'+prev.shotId+'->'+job.shotId);
     else if(!prev)continuityByRole.set(ref.label,{identity:ref.identity,shotId:job.shotId});
   }
  }
  shots.push(frozen({shotId:job.shotId,jobId:job.id,
   requiredSeconds:job.durationFrames/plan.frameRate,
   candidateCount:proposed.length,rejectedCandidates:rejected,pendingCandidates:pending,
   heldSourceMismatchCandidates:heldSourceMismatch,
   acceptedCompletionId:accepted.length===1?accepted[0].completionId:null,
   state:accepted.length>1?'AMBIGUOUS_ACCEPTANCE':
     accepted.length===1?'SHOT_REVIEW_CLAIM_ACCEPTED':
     heldSourceMismatch>0?'HELD_EXACT_SOURCE_BINDING':
     rejected>0&&pending===0?'NO_ACCEPTED_CANDIDATE':'AWAITING_ACCEPTED_FOOTAGE'}));
 }
 const fullCoverage=shots.every(x=>x.acceptedCompletionId!==null);
 let acceptedFinishedSeconds=0;
 if(finalReview!==null){
  ensure(object(finalRendition)&&finalRendition.type==='MicrodramaLocalRendition',
   'a final film review needs a real rendered MP4');
  ensure(typeof finalRendition.sha256==='string'&&/^[a-f0-9]{64}$/u.test(finalRendition.sha256),
   'finished film needs a valid exact digest');
  ensure(Number.isFinite(finalRendition.duration)&&
   Math.abs(finalRendition.duration-plan.durationSeconds)<0.15,
   'rendered film duration differs from source plan');
  ensure(object(finalReview)&&typeof finalReview.accepted==='boolean',
   'final receiving must explicitly accept or reject');
  if(finalReview.accepted){
   ensure(finalReview.asset?.sha256===finalRendition.sha256,
    'final film review must identify the exact rendered MP4');
   ensure(typeof finalReview.authority==='string'&&finalReview.authority.trim(),
    'independent finished-film receiving authority is missing');
   if(fullCoverage&&reasons.length===0)acceptedFinishedSeconds=plan.durationSeconds;
   else reasons.push('final-review-without-unambiguous-accepted-shot-coverage');
  }
 }
 // Private uploaded bytes represent a separate, stronger DELIVERY state, not
 // public release. Join exclusively by the reviewed FINAL MP4 SHA, never title,
 // video thumbnail, producer channel handle or generated-source shot hash.
 // This projects the existing YouTube private-draft provider receipt: no new
 // ledger, synthetic audience metrics or settlement claim is manufactured.
 const privateDraftMatches=[],unmatchedPrivateDrafts=[];
 const usedVideoIds=new Set();
 for(const draft of privateDrafts){
  ensure(object(draft)&&draft.type==='YouTubePrivateFilmDraftReceipt'&&
   draft.state==='PROVIDER_VERIFIED_PRIVATE_NOT_PUBLIC'&&
   draft.privacyStatus==='private'&&
   typeof draft.outputSha256==='string'&&/^[a-f0-9]{64}$/u.test(draft.outputSha256)&&
   typeof draft.channelId==='string'&&/^UC[A-Za-z0-9_-]{22}$/u.test(draft.channelId)&&
   typeof draft.videoId==='string'&&/^[A-Za-z0-9_-]{11}$/u.test(draft.videoId),
   'only actual private YouTube readback receipts may be projected as private drafts');
  ensure(!usedVideoIds.has(draft.videoId),
   'one provider video identity cannot be counted as multiple private drafts');
  usedVideoIds.add(draft.videoId);
  if(!finalRendition||draft.outputSha256!==finalRendition.sha256){
   unmatchedPrivateDrafts.push({videoId:draft.videoId,channelId:draft.channelId,
    reason:'private-draft-film-sha-does-not-match-current-episode'});
   continue;
  }
  if(acceptedFinishedSeconds<=0){
   reasons.push('private-draft-matches-film-without-independent-final-acceptance');
   continue;
  }
  privateDraftMatches.push(frozen({videoId:draft.videoId,channelId:draft.channelId,
   outputSha256:draft.outputSha256,privacyStatus:'private',
   syntheticMediaDisclosure:draft.syntheticMediaDisclosure??'unconfirmed',
   state:'PROVIDER_VERIFIED_PRIVATE_NOT_PUBLIC'}));
 }
 const privateStagedFinishedSeconds=privateDraftMatches.length>0?
  acceptedFinishedSeconds:0;
 const candidateCount=observations.length;
 const reviewOutcome=acceptedFinishedSeconds>0?
  'FINISHED_FILM_ACCEPTANCE_CLAIM_RECEIVED_NOT_PUBLISHED':
  reasons.length?'HELD_REVIEW_OR_REFERENCE_CONFLICT':'NO_ACCEPTED_FINISHED_FILM';
 return frozen({type:'MicrodramaProductionYield',version:1,status:reviewOutcome,
  seriesId:plan.seriesId,episodeId:plan.episodeId,
  shots:frozen(shots),acceptedShotSeconds:acceptedSourceSeconds,
  acceptedFinishedSeconds,providerCandidateCount:candidateCount,
  acceptedCandidateCount:acceptedCandidates,rejectedCandidateCount:rejectedCandidates,
  pendingCandidateCount:awaitingReview,heldSourceMismatchCandidateCount:heldSourceMismatchCandidates,
  unfilledShotCount:shots.filter(x=>!x.acceptedCompletionId).length,
  quotedFlowCredits,unknownFlowCreditQuotes,flowCandidateCount,
  unclassifiedProviderCandidateCount,
  unclassifiedProviderIds:frozen([...unclassifiedProviderIds].sort()),
  quotedFlowCreditsPerAcceptedMinute:acceptedFinishedSeconds>0&&
   flowCandidateCount>0&&unknownFlowCreditQuotes===0&&
   unclassifiedProviderCandidateCount===0?
   Math.round((quotedFlowCredits*60/acceptedFinishedSeconds)*100)/100:null,
  quotedGeminiApiUsd:quotedGeminiApiCents/100,
  unknownGeminiApiQuotes,geminiApiCandidateCount,
  quotedGeminiApiUsdPerAcceptedMinute:acceptedFinishedSeconds>0&&
   geminiApiCandidateCount>0&&unknownGeminiApiQuotes===0&&
   unclassifiedProviderCandidateCount===0?
   Math.round((quotedGeminiApiCents*60/acceptedFinishedSeconds))/100:null,
  privateDrafts:frozen(privateDraftMatches),
  privateDraftCount:privateDraftMatches.length,
  privateStagedFinishedSeconds,
  unassociatedPrivateDrafts:frozen(unmatchedPrivateDrafts),
  publicReleaseEvidenceCount:0,
  reasons:frozen(reasons),continuityAlerts:frozen(alerts),
  limitation:'Only an exact source-identity overlap plus independent positive review can provisionally accept shot seconds. Atmospheric B-roll, missing or different story provenance remains held, not automatically rejected or repurposed. Only received Flow and Gemini API provider identities carry their respective quote denominations. Unclassified video sources must be costed independently. Google Flow credits and Gemini API quoted US dollars are entirely separate provider estimates, NOT settled cash expenses. Source reviews and acceptance references require independent authentication. Even an accepted film or provider-verified PRIVATE draft is NOT a public release or paying customer; Gemini API USD and Flow credits are not combined.'});
}
