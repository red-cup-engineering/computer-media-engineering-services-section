#!/usr/bin/env node
/** Read a reviewed source JSON file; print an inference job or held shot/audio plan. */
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {planWritersRoom,compileMicrodramaEpisode,compileNarrativeEpisode,estimateVideoGeneration,projectMicrodramaProductionYield} from '../src/microdrama-production.mjs';
import {projectParacosmVideoProduction} from '../src/paracosm-video-binding.mjs';
import {reconcileMicrodramaCommissionOutcomes} from '../src/microdrama-commission-economics.mjs';
import {admitMicrodramaCommission,planMicrodramaCommission,
 projectMicrodramaCapabilityJobs,costMicrodramaCommission,
 projectMicrodramaMilestones,projectMicrodramaProductionDependencies} from '../src/microdrama-commission.mjs';
const usage='Usage: node apps/plan-microdrama.mjs series ORIGINAL-MARKET-PRODUCTION.json | writers-jsonl PRIVATE-WORKLOADS.json | writers SOURCE.json | episode PRODUCTION.json [rateCentsPerSecond attempts maxBudgetCents allowedClipSecondsCSV] | commission CUSTOMER-BRIEF.json MAX-ATTEMPTS | commission-quote CUSTOMER-BRIEF.json MAX-ATTEMPTS RATES.json QUOTE-AT CONTINGENCY-BPS MARGIN-BPS [MILESTONES.json] | commission-reconcile ORIGINAL-COMMISSION-QUOTE.json RECEIVED-CLAIMS.json | yield COMPILED.json INVENTORY.json REVIEWS.json [FINAL.json REVIEW.json [DRAFTS.json]]';
async function main(argv){
 // A claim-level closing view over the ORIGINAL source work and price
 // scenario; this deliberately cannot sign invoices, accept cultural rights,
 // reconcile a payment processor, submit a provider job, or publish a film.
 if(argv[0]==='commission-reconcile'){
  const [,sourceFile,claimsFile,...extra]=argv;
  if(!sourceFile||!claimsFile||extra.length)
   throw new TypeError('Usage: plan-microdrama.mjs commission-reconcile ORIGINAL-QUOTE.json RECEIVED-CLAIMS.json');
  const load=async file=>{
   const bytes=await readFile(file,'utf8');
   if(Buffer.byteLength(bytes,'utf8')>3000000)
    throw new TypeError('observed economics input exceeds three MB');
   return JSON.parse(bytes);
  };
  const [source,claims]=await Promise.all([load(sourceFile),load(claimsFile)]);
  if(!source||!claims||typeof source!=='object'||typeof claims!=='object'||
     Array.isArray(source)||Array.isArray(claims))
   throw new TypeError('two structured source-bound economic inputs required');
  const allowed=new Set(['productionYields','expenseReceipts','expenseClosures',
   'contract','customerReceipts','observedAt']);
  if(Object.keys(claims).some(key=>!allowed.has(key)))
   throw new TypeError('an observation cannot override customer, work plan or rate scenario');
  return reconcileMicrodramaCommissionOutcomes({
   ...claims,commission:source.commission,workPlan:source.plan,
   costScenario:source.costScenario
  });
 }
 // One MARKET-SOURCED original series packet enters the SAME generic producer
 // compiler for each episode. No independently invented planning datastore,
 // social research claim authority, cinematic reference, purchase or publisher.
 if(argv[0]==='series'){
  const [,sourceFile,...extra]=argv;
  if(!sourceFile||extra.length)
   throw new TypeError('Usage: plan-microdrama.mjs series ORIGINAL-MARKET-PRODUCTION.json');
  const bytes=await readFile(sourceFile,'utf8');
  if(Buffer.byteLength(bytes,'utf8')>500000)
   throw new TypeError('market-sourced original fiction source exceeds 500 KB');
  const packet=JSON.parse(bytes);
  if(packet?.kind!=='causeway.public-fiction.original-market-sourced-microdrama'||
     packet.version!==1||
     packet.status!=='ORIGINAL_SOURCE_DRAFT_NOT_FILMED_NOT_AUTHORIZED_FOR_PROVIDER_SPEND'||
     typeof packet.sourceSeed!=='string'||
     typeof packet.source?.originRef!=='string')
   throw new TypeError('source-original market fiction packet required; no implicit production authority');
  const ni='ni:///sha-256;'+createHash('sha256').update(packet.sourceSeed,'utf8').digest('base64url');
  if(packet.source.originRef!==ni)
   throw new TypeError('source seed differs from its original SCA/NI content identity');
  if(!Array.isArray(packet.episodes)||packet.episodes.length<1||packet.episodes.length>6||
     new Set(packet.episodes.map(e=>e?.id)).size!==packet.episodes.length)
   throw new TypeError('bounded unique original serial episodes required');
  if(!Array.isArray(packet.market?.observations)||packet.market.observations.length<2||
     packet.market.observations.some(r=>typeof r?.sourceUrl!=='string'||
      !/^https:\/\/(?:www\.)?(?:sensortower\.com|ibc\.org|reuters\.com|federalreserve\.gov|pewresearch\.org)\//u.test(r.sourceUrl)))
   throw new TypeError('market evidence must retain identifiable primary/report source URLs');
  const proposals=packet.episodes.map(episode=>compileNarrativeEpisode({
   source:packet.source,series:packet.series,episode,
   receiver:packet.receiver,openedAt:packet.openedAt,maxShotSeconds:8
  }));
  // Even if the story schema compiles, absent ORIGINAL image identities are
  // nonadmitted assets, not permission to submit a paid Gemini video request.
  const unadmitted=[...packet.series.characters.map(x=>x.visualRef),
    ...packet.series.characters.map(x=>x.voiceRef),
    ...packet.series.locations.map(x=>x.referenceRef)];
  if(unadmitted.some(x=>typeof x!=='string'||!x.startsWith('UNAPPROVED:')))
   throw new TypeError('market pilot must remain held until independently reviewed original visual/voice references are received');
  const totalShots=proposals.reduce((sum,p)=>sum+p.jobs.video.length,0);
  const totalSeconds=proposals.reduce((sum,p)=>sum+p.durationSeconds,0);
  // Marketing variants are deterministic EDLs over the SAME source shots.
  // An EDL does not justify new video jobs or fake viewer metrics.
  const shotDurations=new Map(proposals.flatMap(p=>p.jobs.video.map(job=>[
   p.episodeId+'\\0'+job.shotId,job.durationFrames/30
  ])));
  const promotions=packet.market.preregisteredPilotTests?.promotionalCuts??[];
  if(!Array.isArray(promotions)||promotions.length>4||
     new Set(promotions.map(p=>p?.variant)).size!==promotions.length)
   throw new TypeError('promotional edits must be bounded and distinctly named');
  for(const promo of promotions){
   if(typeof promo?.variant!=='string'||!promo.variant.trim()||
      promo.state!=='EDITOR_SOURCE_EDL_NOT_RENDERED'||
      !Array.isArray(promo.sourceEdits)||promo.sourceEdits.length<1||promo.sourceEdits.length>8)
    throw new TypeError('only original nonrendered source-pinned marketing EDLs are admitted');
   let total=0;
   for(const cut of promo.sourceEdits){
    const seconds=shotDurations.get(cut.episodeId+'\\0'+cut.shotId);
    if(seconds===undefined||!Number.isSafeInteger(cut.inSeconds)||
       !Number.isSafeInteger(cut.outSeconds)||cut.inSeconds<0||
       cut.outSeconds<=cut.inSeconds||cut.outSeconds>seconds)
     throw new TypeError('marketing cut refers to unknown or impossible original film frames');
    total+=cut.outSeconds-cut.inSeconds;
   }
   if(total!==15)
    throw new TypeError('preregistered fifteen-second teaser is not a complete source-bound cut');
  }
  return {
   type:'MarketSourcedMicrodramaSerialProjection',version:1,
   state:'ORIGINAL_SCREENPLAY_PROPOSALS_NOT_APPROVED_NOT_FILMED',
   seriesId:packet.series.id,sourceRef:ni,
   researchStatus:'SOURCED_MARKET_HYPOTHESES_NOT_VERIFIED_ORIGINAL_AUDIENCE_DEMAND',
   originalMarketSourceCount:packet.market.observations.length,
   marketingCutPlans:promotions,marketingCutRenderCount:0,
   episodes:proposals,totalPlannedShots:totalShots,
   totalPlannedSeconds:totalSeconds,
   sourceAssetsState:'HELD_MISSING_ORIGINAL_RIGHTS_ACCEPTED_VISUAL_AND_VOICE_REFERENCES',
   providerSubmissionCount:0,
   deliveredFilmCount:0,acceptedFinishedSeconds:0,
   actualCurrencySpent:null,
   nextRealEffect:packet.operations.firstPhysicalShot,
   limitation:'An original screenplay is not film. Source studies justify exploring a premise, not a discovered customer or accepted creative rights; all MediaNeeds remain unadmitted.'
  };
 }
 // A source-neutral multi-work producer sends ONLY Red Cup's existing job
 // format to stdout: no model client, dispatcher, provider registry, or queue.
 // The per-work source/rights evidence and exact permitted provider identities
 // remain separate. Printing work cannot independently verify authorization.
 if(argv[0]==='writers-jsonl'){
  const [,inputFile,...extra]=argv;
  if(!inputFile||extra.length)
   throw new TypeError('Usage: plan-microdrama.mjs writers-jsonl BOUNDED-PRIVATE-WORKLOADS.json');
  const bytes=await readFile(inputFile,'utf8');
  if(bytes.length>2_000_000)throw new TypeError('Portfolio input exceeds 2 MB');
  const packet=JSON.parse(bytes);
  if(!Array.isArray(packet?.workloads)||packet.workloads.length<1||packet.workloads.length>64)
   throw new TypeError('Portfolio needs 1-64 original rights-bearing story workloads');
  const ids=new Set(),sourceIds=new Set();
  const jobs=packet.workloads.map(item=>{
   if(!item||typeof item!=='object'||Array.isArray(item))
    throw new TypeError('Every source workload must be an object');
   const decision=item.providerProcessingDecision;
   if(!decision||decision.state!=='approved'||
      typeof decision.authorityRef!=='string'||!decision.authorityRef.trim()||
      typeof decision.rightsRef!=='string'||!decision.rightsRef.trim()||
      !Array.isArray(decision.providerIds)||decision.providerIds.length<1||
      decision.providerIds.length>32||new Set(decision.providerIds).size!==decision.providerIds.length||
      decision.providerIds.some(id=>typeof id!=='string'||!/^[a-z0-9][a-z0-9._-]{0,127}$/u.test(id)))
    throw new TypeError('Each story requires a source-specific approved provider-processing decision and exact provider identities');
   const compiled=planWritersRoom(item.source,{
    episodeCount:item.episodeCount??3,maxTokens:item.maxTokens??3500});
   const {job,source}=compiled;
   if(ids.has(job.id)||sourceIds.has(source.originRef))
    throw new TypeError('Portfolio cannot silently join duplicate job/source identities');
   ids.add(job.id);sourceIds.add(source.originRef);
   return {...job,workType:'creative-writing',preferEndpoints:[...decision.providerIds],
    sourceRef:source.originRef,sourceKind:source.seedKind,
    providerProcessingAuthorityRef:decision.authorityRef,
    providerProcessingRightsRef:decision.rightsRef};
  });
  return jobs;
 }
 // A hireable *customer request* is not an approved production or a contract.
 // These are projections of original work into the existing Causeway producer
 // and Coesite capability-market matching interfaces: no second sales ledger.
 if(argv[0]==='commission'||argv[0]==='commission-quote'){
  const [mode,briefFile,attemptsText,rateCardFile,quoteAt,contingencyText,
    marginText,milestonesFile,...extra]=argv;
  if(!briefFile||!attemptsText||extra.length||
     (mode==='commission'&&argv.length!==3)||
     (mode==='commission-quote'&&(!rateCardFile||!quoteAt||
      !contingencyText||!marginText||argv.length>8)))
   throw new TypeError('Usage: plan-microdrama.mjs commission CLIENT-BRIEF.json MAX_ATTEMPTS_PER_SHOT | commission-quote CLIENT-BRIEF.json MAX_ATTEMPTS_PER_SHOT OBSERVED-RATES.json QUOTE_AT CONTINGENCY_BPS MARGIN_BPS [CUSTOMER-MILESTONES.json]');
  const load=async(file)=>{
   const data=await readFile(file,'utf8');
   if(data.length>1_000_000)throw new TypeError('Commission input exceeds 1MB');
   return JSON.parse(data);
  };
  const commission=admitMicrodramaCommission(await load(briefFile));
  const plan=planMicrodramaCommission(commission,{
   maxAttemptsPerShot:Number(attemptsText)});
  const capabilityJobs=projectMicrodramaCapabilityJobs(plan);
  const dependencyGraph=projectMicrodramaProductionDependencies(plan);
  if(mode==='commission')return {commission,plan,capabilityJobs,dependencyGraph};
  const costScenario=costMicrodramaCommission({
   plan,rateCard:await load(rateCardFile),quoteAt,
   contingencyBasisPoints:Number(contingencyText),
   targetGrossMarginBasisPoints:Number(marginText)
  });
  const milestones=milestonesFile?projectMicrodramaMilestones({
   commission,costScenario,milestones:await load(milestonesFile)}):null;
  return {commission,plan,capabilityJobs,dependencyGraph,costScenario,
   ...(milestones?{milestones}:{})};
 }
 // This observes existing real Flow custody and Causeway review records.
 // It does not write another ledger or buy/generate another film.
 if(argv[0]==='yield'){
  const [mode,planFile,inventoryFile,reviewsFile,renditionFile,finalReviewFile,privateDraftsFile]=argv;
  if(!planFile||!inventoryFile||!reviewsFile||
     argv.length>7||(finalReviewFile&&!renditionFile)||
     (privateDraftsFile&&(!renditionFile||!finalReviewFile)))
   throw new TypeError('Usage: node apps/plan-microdrama.mjs yield <compiled-plan.json> <Flow-inventory.json> <Causeway-reviews.json> [rendered-film.json final-review.json [verified-private-drafts.json]]');
  async function load(file){
   const content=await readFile(file,'utf8');
   if(content.length>3000000)throw new TypeError('Production input exceeds 3 MB');
   return JSON.parse(content);
  }
  const [planPacket,providerPacket,reviewPacket,finalRendition,finalReview,privateDraftPacket]=await Promise.all([
   load(planFile),load(inventoryFile),load(reviewsFile),
   renditionFile?load(renditionFile):null,
   finalReviewFile?load(finalReviewFile):null,
   privateDraftsFile?load(privateDraftsFile):[],
  ]);
  const plan=planPacket.proposal??planPacket;
  const providerArtifacts=providerPacket.artifacts??providerPacket;
  const reviews=reviewPacket.reviews??reviewPacket;
  const privateDrafts=privateDraftPacket?.privateDrafts??privateDraftPacket;
  return projectMicrodramaProductionYield({plan,providerArtifacts,reviews,
   finalRendition,finalReview,privateDrafts});
 }
  const [mode,path,rate,attempts,budget,durations]=argv;
  if (!['writers','episode'].includes(mode)||!path||argv.length > (mode==='episode'?6:2)) throw new TypeError(usage);
  const content=await readFile(path,'utf8');
  if(content.length>1000000)throw new TypeError('Input must be <= 1 MB');
  const input=JSON.parse(content);
  if(mode==='writers')return planWritersRoom(input.source??input.seed??input,{episodeCount:input.episodeCount??3});
  const proposal=input.source?.paracosm?
    projectParacosmVideoProduction(input)
    :input.source?compileNarrativeEpisode(input):compileMicrodramaEpisode(input);
  if(proposal.status==='HELD_SOURCE_OR_ASSETS')return proposal;
  if(rate!==undefined){
    const rateNumber=Number(rate), attemptCount=attempts===undefined?1:Number(attempts), budgetNumber=budget===undefined?undefined:Number(budget);
    return {proposal,estimate:estimateVideoGeneration({plan:proposal,rateCentsPerSecond:rateNumber,
      attemptsPerShot:attemptCount,maxBudgetCents:budgetNumber,
      ...(durations!==undefined?{allowedClipSeconds:durations.split(',').map(Number)}:{})})};
  }
  return proposal;
}
try{
 const argv=process.argv.slice(2),result=await main(argv);
 process.stdout.write(argv[0]==='writers-jsonl'
  ? result.map(row=>JSON.stringify(row)).join('\n')+'\n'
  : JSON.stringify(result,null,2)+'\n');
}
catch(error){process.stderr.write(String(error?.message||error)+'\n');process.exitCode=1}
