import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {
 admitMicrodramaCommission,planMicrodramaCommission,
 projectMicrodramaCapabilityJobs,costMicrodramaCommission,
 projectMicrodramaMilestones,projectMicrodramaProductionDependencies
} from '../src/microdrama-commission.mjs';

const digest='ni:///sha-256;'+'A'.repeat(43);
function brief(overrides={}){
 const request={
  customer:{actorRef:'https://actors.561.group/client-studio',
   customerRef:'client:example-signed-engagement'},
  work:{seriesId:'sea-drama',workingTitle:'The Third Shore',
   sourceRef:digest,provenance:'fiction-original'},
  rights:{storyRightsRef:'claim:original-screenplay-rights',
   performanceRightsRef:'claim:synthetic-voices-and-characters',
   clientPrivacyRef:'claim:private-film-protocol',
   syntheticDisclosureRequired:true},
  scope:{
   product:'full-cinematic-series',primaryLanguage:'en',
   subtitleLanguages:['zh-Hans','es'],
   deliverySurfaces:['private-web-screening','private-youtube-draft'],
   episodes:[{
    id:'episode-one',durationSeconds:90,sourceRef:digest,
    cast:[{id:'rill',voiceRightsRef:'actor:rill-source',
     designAuthorityRef:'authority:rill-creator'},
     {id:'kip',voiceRightsRef:'actor:kip-source',
     designAuthorityRef:'authority:kip-creator',acceptedReferenceNi:digest}],
    shots:Array.from({length:12},(_,i)=>({
     id:'shot-'+String(i+1),billableSeconds:8,
     audioMode:i===1?'separate-voice':'embedded-performance',
     referenceNis:[digest],sourceRef:digest
    })),separateVoiceSeconds:4
   }]
  },
  receiving:{demandRef:digest,producingOffice:'Causeway Public Fiction'},
  requestedAt:'2026-10-13T17:30:00Z'
 };
 return {...request,...overrides};
}
function rates(){
 return {
  observedAt:'2026-10-13T17:00:00Z',expiresAt:'2026-10-14T17:00:00Z',
  evidenceRef:'cost:independent-source-quote-claims',
  currency:'USD',
  rates:[
   ['source-rights-review','commission',15000],
   ['creative-treatment','episode',20000],
   ['character-reference','original-reference',10000],
   ['cinematic-generation','attempt-billable-second',40],
   ['dialogue-recording','performed-second',20],
   ['editorial-master','finished-minute',12000],
   ['localization','language-finished-minute',4000],
   ['release-manufacturing','episode',2500],
   ['private-delivery','authorized-channel-episode',750],
   ['independent-qc','episode',3000]
  ].map(([kind,unit,centsPerUnit])=>({kind,unit,centsPerUnit,
   quoteRef:'provider:observed-'+kind,providerId:'real-qualified-provider-needed:'+kind}))
 };
}
const asInt=x=>Number.isSafeInteger(x);
test('a real source/rights-bound serial commission produces recurring cast, source-shot and client contracts',()=>{
 const intake=admitMicrodramaCommission(brief());
 assert.equal(intake.type,'MicrodramaCommission');
 assert.ok(intake.id.startsWith('ni:///sha-256;'));
 assert.equal(intake.acceptanceState,'SOURCE_AND_RIGHTS_CLAIMS_UNVERIFIED');
 assert.equal(intake.work.seriesId,'sea-drama');
 assert.equal(intake.scope.episodes[0].shots.length,12);
 assert.equal(intake.scope.episodes[0].cast.length,2);
 assert.equal(intake.scope.deliverySurfaces.length,2);
 const plan=planMicrodramaCommission(intake,{maxAttemptsPerShot:3});
 assert.equal(plan.type,'MicrodramaCommissionWorkPlan');
 assert.equal(plan.state,'COSTABLE_NOT_ADMITTED_FOR_EXECUTION');
 assert.deepEqual(plan.holds,[]);
 assert.equal(plan.lots.filter(l=>l.kind==='cinematic-generation').length,12);
 assert.equal(plan.lots.filter(l=>l.kind==='character-reference').length,1,
   'original actor visuals are commissioned once, not re-rendered per shot');
 assert.equal(plan.lots.filter(l=>l.kind==='dialogue-recording').length,1,
   'embedded-performance footage does not order redundant voice acting');
 assert.equal(plan.lots.find(l=>l.id==='sea-drama-episode-one-shot-1-cinema').quantity,24);
 assert.equal(plan.lots.filter(l=>l.kind==='localization').length,2);
 assert.equal(plan.lots.filter(l=>l.kind==='private-delivery').length,2);
 const jobs=projectMicrodramaCapabilityJobs(plan);
 assert.equal(jobs.length,plan.lots.length);
 assert.equal(jobs[0].sourceCommission,intake.id);
 assert.ok(jobs.find(x=>x.jobId.endsWith('shot-1-cinema'))
  .requiredCapabilities.includes('reference-conditioned-video'));
 assert.equal(jobs[0].executionAuthority,
  'WORK_SPECIFIC_PROVIDER_QUALIFICATION_AND_ACCEPTED_CUSTOMER_ORDER_REQUIRED');
 assert.throws(()=>projectMicrodramaCapabilityJobs(plan,{relationshipModes:['unapproved']}),
  /unsupported/u);
 assert.throws(()=>planMicrodramaCommission(intake,{maxAttemptsPerShot:0}),
  /authorized maximum video attempts/u);
});
test('indigenous/contributor-controlled productions require independently named cultural authority; separate tenants stay distinct',()=>{
 const row=brief({work:{...brief().work,provenance:'contributor-governed'}});
 assert.throws(()=>admitMicrodramaCommission(row),
  /contributor creative authority/u);
 const owned=admitMicrodramaCommission({...row,rights:{
  ...row.rights,contributorAuthorityRef:'claim:distinct-native-creative-authority'}});
 assert.equal(owned.rights.contributorAuthorityRef,'claim:distinct-native-creative-authority');
 assert.notEqual(owned.id,admitMicrodramaCommission(brief()).id);
 assert.throws(()=>admitMicrodramaCommission(brief({
  rights:{...brief().rights,syntheticDisclosureRequired:false}})),
  /synthetic-media disclosure/u);
 assert.throws(()=>admitMicrodramaCommission(brief({
  scope:{...brief().scope,deliverySurfaces:['public-release']}})),
  /unknown delivery surface/u);
});
test('postproduction customer-supplied film receives no phantom provider generation and preserves exact original bytes',()=>{
 const original=brief();
 const scope={...original.scope,product:'edit-received-footage',
  episodes:[{id:'episode-one',durationSeconds:90,
   acceptedFilmSha256:'a'.repeat(64),sourceRef:digest}],
  subtitleLanguages:['es'],deliverySurfaces:['private-web-screening']};
 const intake=admitMicrodramaCommission(brief({scope}));
 const plan=planMicrodramaCommission(intake,{maxAttemptsPerShot:1});
 assert.equal(plan.lots.filter(x=>x.kind==='cinematic-generation').length,0);
 assert.equal(plan.lots.filter(x=>x.kind==='editorial-master').length,1);
 assert.equal(plan.lots.find(x=>x.kind==='localization').quantity,2);
 assert.throws(()=>admitMicrodramaCommission(brief({scope:{
  ...scope,episodes:[{...scope.episodes[0],acceptedFilmSha256:null}]
 }})),/actual source film identity/u);
});
test('observed USD input tariff generates a reproducible conditional scenario and separate customer-negotiated milestone schedule',()=>{
 const commission=admitMicrodramaCommission(brief());
 const plan=planMicrodramaCommission(commission,{maxAttemptsPerShot:3});
 const scenario=costMicrodramaCommission({
  plan,rateCard:rates(),contingencyBasisPoints:2000,
  targetGrossMarginBasisPoints:3000,quoteAt:'2026-10-13T17:30:00Z'
 });
 assert.equal(scenario.state,
  'COSTED_SCENARIO_AWAITING_CUSTOMER_PROVIDER_AND_RIGHTS_ACCEPTANCE');
 assert.equal(scenario.missing.length,0);
 assert.equal(scenario.breakdown.length,plan.lots.length);
 assert.equal(scenario.currency,'USD');
 assert.ok(asInt(scenario.estimatedInputCostCents));
 assert.equal(scenario.maximumBudgetedCostCents,
  Math.ceil(scenario.estimatedInputCostCents*1.2));
 assert.equal(scenario.suggestedCustomerQuoteCents,
  Math.ceil(scenario.maximumBudgetedCostCents/0.7));
 assert.ok(scenario.id.startsWith('ni:///sha-256;'));
 const quoteAgain=costMicrodramaCommission({
  plan,rateCard:rates(),contingencyBasisPoints:2000,
  targetGrossMarginBasisPoints:3000,quoteAt:'2026-10-13T17:30:00Z'
 });
 assert.equal(quoteAgain.id,scenario.id);
 const milestones=projectMicrodramaMilestones({
  commission,costScenario:scenario,milestones:[
   {id:'source-approval',basisPoints:2500,
    acceptanceRef:'independent:source-and-rights',deliverableKind:'rights-and-script'},
   {id:'final-film',basisPoints:5000,
    acceptanceRef:'independent:approved-cinematic-master',deliverableKind:'finished-episode'},
   {id:'delivery',basisPoints:2500,
    acceptanceRef:'independent:source-hashed-package',deliverableKind:'private-delivery'}
  ]
 });
 assert.equal(milestones.status,'CUSTOMER_AND_PROVIDER_SIGNATURES_REQUIRED_NO_PAYMENTS_OBSERVED');
 assert.equal(milestones.totalProposedCents,scenario.suggestedCustomerQuoteCents);
 assert.equal(milestones.milestones.reduce((s,x)=>s+x.proposedCustomerAmountCents,0),
  scenario.suggestedCustomerQuoteCents);
 assert.ok(milestones.id.startsWith('ni:///sha-256;'));
 assert.throws(()=>projectMicrodramaMilestones({commission,costScenario:scenario,
  milestones:[{id:'a',basisPoints:9000,acceptanceRef:'x',deliverableKind:'x'},
   {id:'b',basisPoints:999,acceptanceRef:'x',deliverableKind:'x'}]}),
  /equal 100%/u);
});
test('unknown, stale, wrong-unit, contradictory and Flow-credit-denominated rates HOLD instead of inventing prices',()=>{
 const work=planMicrodramaCommission(admitMicrodramaCommission(brief()),{
  maxAttemptsPerShot:3});
 const original=rates();
 const scenario=book=>costMicrodramaCommission({plan:work,rateCard:book,
  contingencyBasisPoints:2000,targetGrossMarginBasisPoints:3000,
  quoteAt:'2026-10-13T17:30:00Z'});
 const missing=scenario({...original,rates:original.rates.filter(x=>x.kind!=='cinematic-generation')});
 assert.equal(missing.suggestedCustomerQuoteCents,null);
 assert.ok(missing.missing.includes('unknown-rate:cinematic-generation'));
 assert.throws(()=>projectMicrodramaMilestones({
  commission:admitMicrodramaCommission(brief()),costScenario:missing,
  milestones:[]}),/cannot schedule financial obligations/u);
 const stale=scenario({...original,expiresAt:'2026-10-12T19:00:00Z'});
 assert.equal(stale.state,'HELD_UNPRICED_OR_INCOMPLETE_PRODUCTION');
 assert.ok(stale.missing.includes('observed-rate-card-not-current'));
 const credits=scenario({...original,currency:'Flow credits'});
 assert.equal(credits.suggestedCustomerQuoteCents,null);
 assert.ok(credits.missing.includes('unsupported-currency-no-automatic-credit-to-USD-conversion'));
 assert.throws(()=>scenario({...original,rates:[
  ...original.rates,{...original.rates[0]}]}),/ambiguous duplicate prices/u);
 assert.throws(()=>scenario({...original,rates:[
  {...original.rates[0],unit:'episode'},...original.rates.slice(1)
 ]}),/must agree with actual service quantity/u);
});
test('incomplete shot planning and explicit cost ceilings remain held and do not assert real provider availability',()=>{
 const original=brief(),episode=original.scope.episodes[0];
 const commission=admitMicrodramaCommission(brief({scope:{...original.scope,
  episodes:[{...episode,shots:[]}]}}));
 const plan=planMicrodramaCommission(commission,{maxAttemptsPerShot:2});
 assert.equal(plan.state,'HELD_INCOMPLETE_SOURCE_PLAN');
 assert.ok(plan.holds.includes('unbudgeted-shot-breakdown:episode-one'));
 const scenario=costMicrodramaCommission({plan,rateCard:rates(),
  contingencyBasisPoints:1000,targetGrossMarginBasisPoints:2500,
  quoteAt:'2026-10-13T17:30:00Z'});
 assert.equal(scenario.suggestedCustomerQuoteCents,null);
 assert.equal(scenario.state,'HELD_UNPRICED_OR_INCOMPLETE_PRODUCTION');
});

test('real source-owning planning CLI emits machine-readable commission capability jobs and bounded price without writes',()=>{
 const root=mkdtempSync(join(tmpdir(),'microdrama-hireable-service-'));
 try{
  const client=join(root,'customer.json'),book=join(root,'rates.json'),
   milestones=join(root,'milestones.json');
  writeFileSync(client,JSON.stringify(brief()));
  writeFileSync(book,JSON.stringify(rates()));
  writeFileSync(milestones,JSON.stringify([
   {id:'source',basisPoints:3000,acceptanceRef:'source:reviewed',
    deliverableKind:'approved-script-and-rights'},
   {id:'edit',basisPoints:7000,acceptanceRef:'film:reviewed',
    deliverableKind:'accepted-episode-master'}
  ]));
  const entry=new URL('../apps/plan-microdrama.mjs',import.meta.url).pathname;
  const plan=JSON.parse(execFileSync(process.execPath,
   [entry,'commission',client,'3'],{encoding:'utf8',timeout:15000}));
  assert.equal(plan.plan.state,'COSTABLE_NOT_ADMITTED_FOR_EXECUTION');
  assert.equal(plan.capabilityJobs.length,plan.plan.lots.length);
  assert.equal(plan.dependencyGraph.type,'MicrodramaProductionDependencyGraph');
  assert.equal(plan.dependencyGraph.jobs.length,plan.plan.lots.length);
  assert.equal(plan.dependencyGraph.workPlanId,plan.plan.id);
  const paid=JSON.parse(execFileSync(process.execPath,
   [entry,'commission-quote',client,'3',book,'2026-10-13T17:30:00Z',
    '1200','2500',milestones],{encoding:'utf8',timeout:15000}));
  assert.equal(paid.costScenario.missing.length,0);
  assert.ok(paid.costScenario.suggestedCustomerQuoteCents>0);
  assert.equal(paid.milestones.milestones.length,2);
  assert.equal(paid.costScenario.sourceCommission,plan.commission.id);
  assert.equal(paid.dependencyGraph.id,plan.dependencyGraph.id);
  assert.equal(paid.milestones.totalProposedCents,
   paid.costScenario.suggestedCustomerQuoteCents);
  assert.equal(paid.milestones.status,
   'CUSTOMER_AND_PROVIDER_SIGNATURES_REQUIRED_NO_PAYMENTS_OBSERVED');
 }finally{rmSync(root,{recursive:true,force:true})}
});


test('the same AI-fiction cast is designed ONCE for the entire series and scheduled before every affected episode',()=>{
 const original=brief(),first=original.scope.episodes[0];
 const episode2={...first,id:'episode-two',
  shots:first.shots.map(s=>({...s,id:'second-'+s.id}))};
 const customer=admitMicrodramaCommission(brief({
  scope:{...original.scope,episodes:[first,episode2]}
 }));
 const plan=planMicrodramaCommission(customer,{maxAttemptsPerShot:2});
 assert.equal(plan.state,'COSTABLE_NOT_ADMITTED_FOR_EXECUTION');
 assert.equal(plan.episodeCast.length,2);
 assert.equal(plan.lots.filter(x=>x.kind==='character-reference').length,1,
  'original Rill body may not be regenerated every episode');
 assert.equal(plan.lots.find(x=>x.kind==='character-reference').actorId,'rill');
 assert.equal(plan.lots.filter(x=>x.kind==='cinematic-generation').length,24);
 const graph=projectMicrodramaProductionDependencies(plan);
 assert.equal(graph.type,'MicrodramaProductionDependencyGraph');
 assert.equal(graph.state,'DEPENDENCIES_DEFINED_QUALIFIED_CAPACITY_STILL_REQUIRED');
 assert.equal(graph.jobs.length,plan.lots.length);
 const reference=plan.lots.find(x=>x.kind==='character-reference').id;
 for(const shot of graph.jobs.filter(j=>j.kind==='cinematic-generation')){
  assert.ok(shot.dependencies.includes(reference),
   'all future scenes containing a recurring original actor reuse its approved visual reference');
 }
 const firstEdit=graph.jobs.find(x=>x.kind==='editorial-master'&&x.episodeId==='episode-one');
 assert.equal(firstEdit.dependencies.filter(x=>x.includes('-cinema')).length,12);
 assert.ok(firstEdit.dependencies.some(x=>x.endsWith('-voice')));
 const firstQC=graph.jobs.find(x=>x.kind==='independent-qc'&&x.episodeId==='episode-one');
 assert.ok(firstQC.dependencies.includes(firstEdit.worklotId));
 assert.equal(firstQC.dependencies.filter(x=>x.includes('-captions-')).length,2);
 const delivery=graph.jobs.find(x=>x.kind==='private-delivery'&&x.episodeId==='episode-one');
 assert.deepEqual(delivery.dependencies,['sea-drama-episode-one-deliverables']);
 const seen=new Set();
 for(const task of graph.jobs){
  assert.ok(task.dependencies.every(x=>seen.has(x)),task.worklotId+' requires topologically earlier real work');
  seen.add(task.worklotId);
 }
 const dependency2=projectMicrodramaProductionDependencies(plan);
 assert.equal(dependency2.id,graph.id,'schedule dependency identities are reproducible');
});
test('different actors and intentional metamorphosis only commission the exact missing visual variant',()=>{
 const original=brief(),ep1=original.scope.episodes[0];
 const revision='ni:///sha-256;'+'B'.repeat(43);
 const ep2={...ep1,id:'episode-two',cast:[
  {...ep1.cast[0],lookRevisionRef:revision,
   transformationAuthorityRef:'authority:original-rill-metamorphosis'},
  ep1.cast[1],
  {id:'octavia',voiceRightsRef:'octavia:performed-rights',
   designAuthorityRef:'octavia:author'}
 ],shots:ep1.shots.map(s=>({...s,id:'second-'+s.id}))};
 const plan=planMicrodramaCommission(
  admitMicrodramaCommission(brief({scope:{...original.scope,episodes:[ep1,ep2]}})),
  {maxAttemptsPerShot:3});
 const visual=plan.lots.filter(x=>x.kind==='character-reference');
 assert.equal(visual.length,3,'one Rill original, one authorized metamorphosis and one new actor');
 assert.deepEqual(visual.map(x=>x.actorId),['rill','rill','octavia']);
 assert.equal(visual[1].lookRevisionRef,revision);
 assert.equal(plan.holds.length,0);
 const graph=projectMicrodramaProductionDependencies(plan);
 const originalLook=visual[0].id,metamorphosis=visual[1].id,newActor=visual[2].id;
 assert.ok(graph.jobs.find(x=>x.worklotId===metamorphosis).dependencies.includes(originalLook));
 const firstShoot=graph.jobs.find(x=>x.kind==='cinematic-generation'&&x.episodeId==='episode-one');
 assert.ok(firstShoot.dependencies.includes(originalLook));
 assert.ok(!firstShoot.dependencies.includes(newActor));
 assert.ok(!firstShoot.dependencies.includes(metamorphosis),
  'episode 1 cannot depend on a future episode 2 visual change');
 const secondShoot=graph.jobs.find(x=>x.kind==='cinematic-generation'&&x.episodeId==='episode-two');
 assert.ok(secondShoot.dependencies.includes(metamorphosis));
 assert.ok(secondShoot.dependencies.includes(newActor));
 assert.ok(!secondShoot.dependencies.includes(originalLook),
  'the original reference enters through the transformed look predecessor rather than being an extra shot input');
 const forbidden=brief({scope:{...original.scope,episodes:[
  ep1,{...ep2,cast:[{...ep1.cast[0],designAuthorityRef:'different-unauthorized-designer'},ep1.cast[1]]}
 ]}});
 const conflictPlan=planMicrodramaCommission(admitMicrodramaCommission(forbidden),{
  maxAttemptsPerShot:3});
 assert.ok(conflictPlan.holds.some(x=>x.startsWith('recurring-character-identity-or-rights-conflict')));
 assert.equal(projectMicrodramaProductionDependencies(conflictPlan).state,
  'SOURCE_GATES_HELD_NO_DISPATCH');
 const falseMetamorphosis={...ep1.cast[0],lookRevisionRef:revision};
 assert.throws(()=>admitMicrodramaCommission(brief({scope:{...original.scope,
  episodes:[{...ep1,cast:[falseMetamorphosis,ep1.cast[1]]}]}})),
  /visual transformation creative authority/u);
});


test('original four-reference ensemble shots commission ONE director-approved cast-and-location composition across episodes',()=>{
 const standard=brief(),episode=standard.scope.episodes[0];
 const originals=['A','B','C','D'].map(letter=>'ni:///sha-256;'+letter.repeat(43));
 const composing={id:'glass-spongy-ensemble',sourceRef:digest,
  rightsRef:'original:cast-and-setting-composed-art-rights',
  creativeAuthorityRef:'director:independent-ensemble-approval',
  acceptedReferenceNi:null};
 const shot={...episode.shots[0],castIds:['rill','kip'],
  referenceNis:originals,sceneComposition:composing};
 const first={...episode,shots:[shot,...episode.shots.slice(1)]};
 const second={...episode,id:'episode-two',shots:[
  {...shot,id:'second-'+shot.id,castIds:[...shot.castIds].reverse(),
   referenceNis:[...shot.referenceNis].reverse()},
  ...episode.shots.slice(1).map(x=>({...x,id:'second-'+x.id}))
 ]};
 const commission=admitMicrodramaCommission(brief({scope:{
  ...standard.scope,episodes:[first,second]
 }}));
 assert.equal(commission.scope.episodes[0].shots[0].referenceNis.length,4);
 assert.equal(commission.scope.episodes[0].shots[0].castIds.length,2);
 const plan=planMicrodramaCommission(commission,{maxAttemptsPerShot:2});
 assert.equal(plan.state,'COSTABLE_NOT_ADMITTED_FOR_EXECUTION');
 assert.equal(plan.holds.length,0);
 const scenes=plan.lots.filter(x=>x.kind==='scene-composition');
 assert.equal(scenes.length,1,'one approved composition worklot may be reused across camera angles and episodes');
 assert.equal(scenes[0].sceneCompositionId,composing.id);
 assert.equal(scenes[0].unit,'original-composed-reference');
 assert.deepEqual(scenes[0].requiredReferences,originals);
 assert.equal(scenes[0].episodeId,'episode-one');
 const graph=projectMicrodramaProductionDependencies(plan);
 assert.equal(graph.state,'DEPENDENCIES_DEFINED_QUALIFIED_CAPACITY_STILL_REQUIRED');
 const sceneJob=graph.jobs.find(x=>x.kind==='scene-composition');
 assert.ok(sceneJob.dependencies.includes('sea-drama-episode-one-story'));
 assert.ok(sceneJob.dependencies.includes('sea-drama-episode-one-rill-reference'));
 const firstCamera=graph.jobs.find(x=>x.worklotId==='sea-drama-episode-one-shot-1-cinema');
 const secondCamera=graph.jobs.find(x=>x.worklotId==='sea-drama-episode-two-second-shot-1-cinema');
 assert.ok(firstCamera.dependencies.includes(sceneJob.worklotId));
 assert.ok(secondCamera.dependencies.includes(sceneJob.worklotId));
 assert.ok(!firstCamera.dependencies.some(x=>x.endsWith('-scene-composition')&&x!==sceneJob.worklotId));
 const projected=projectMicrodramaCapabilityJobs(plan);
 const supplier=projected.find(x=>x.jobId===sceneJob.worklotId);
 assert.deepEqual(supplier.requiredCapabilities,
  ['original-scene-composition','multi-character-visual-continuity']);
 assert.equal(supplier.requiredOutputUnit,'original-composed-reference');
 const missing=costMicrodramaCommission({plan,rateCard:rates(),
  contingencyBasisPoints:1500,targetGrossMarginBasisPoints:2500,
  quoteAt:'2026-10-13T17:30:00Z'});
 assert.equal(missing.suggestedCustomerQuoteCents,null);
 assert.ok(missing.missing.includes('unknown-rate:scene-composition'));
 const book=rates();
 book.rates.push({kind:'scene-composition',unit:'original-composed-reference',
  centsPerUnit:6000,providerId:'original-composer-awaiting-acceptance',
  quoteRef:'provider:independently-dated-original-ensemble-offer'});
 const cost=costMicrodramaCommission({plan,rateCard:book,
  contingencyBasisPoints:1500,targetGrossMarginBasisPoints:2500,
  quoteAt:'2026-10-13T17:30:00Z'});
 assert.equal(cost.missing.length,0);
 assert.equal(cost.breakdown.filter(x=>x.kind==='scene-composition').length,1);
 assert.ok(cost.suggestedCustomerQuoteCents>0);
 const sourceReady=admitMicrodramaCommission(brief({scope:{
  ...standard.scope,episodes:[{...first,shots:[
   {...shot,sceneComposition:{...composing,acceptedReferenceNi:originals[0]}},
   ...first.shots.slice(1)
  ]}]
 }}));
 const preapproved=planMicrodramaCommission(sourceReady,{maxAttemptsPerShot:2});
 assert.equal(preapproved.lots.filter(x=>x.kind==='scene-composition').length,0);
 assert.equal(preapproved.holds.length,0);
 const existingGraph=projectMicrodramaProductionDependencies(preapproved);
 assert.ok(!existingGraph.jobs.some(x=>x.kind==='scene-composition'));
});
test('full filmed episodes never promise a runtime the existing cinematic compiler cannot produce',()=>{
 const base=brief(),ep=base.scope.episodes[0];
 assert.throws(()=>admitMicrodramaCommission(brief({scope:{...base.scope,
  episodes:[{...ep,durationSeconds:181}]}})),
  /authorized finished film seconds/u);
 const external=admitMicrodramaCommission(brief({scope:{...base.scope,
  product:'edit-received-footage',episodes:[{id:ep.id,sourceRef:digest,
   durationSeconds:181,acceptedFilmSha256:'a'.repeat(64),cast:[],shots:[]}]}}));
 assert.equal(external.scope.episodes[0].durationSeconds,181,
  'a legally supplied longer client film can be edited without falsely promising a 181-second new Shorts production');
});
test('unapproved or cross-property multi-character composite images hold the specific original scene source requirements',()=>{
 const baseline=brief(),episode=baseline.scope.episodes[0],images=
  ['A','B','C','D'].map(letter=>'ni:///sha-256;'+letter.repeat(43));
 const original={...episode.shots[0],castIds:['rill','kip'],
  referenceNis:images};
 const episodeWith=shots=>({...episode,shots:[...shots,...episode.shots.slice(1)]});
 const absent=planMicrodramaCommission(admitMicrodramaCommission(brief({scope:{
  ...baseline.scope,episodes:[episodeWith([original])]
 }})),{maxAttemptsPerShot:1});
 assert.ok(absent.holds.some(x=>x.includes('source-ensemble-requires-accepted-group-reference')));
 assert.equal(projectMicrodramaProductionDependencies(absent).state,'SOURCE_GATES_HELD_NO_DISPATCH');
 const incomplete={...original,sceneComposition:{
  id:'unlicensed-ensemble',sourceRef:digest,creativeAuthorityRef:'director:approval'
 }};
 assert.throws(()=>admitMicrodramaCommission(brief({scope:{
  ...baseline.scope,episodes:[episodeWith([incomplete])]
 }})),/original composed image usage rights/u);
 const wrongActor={...original,castIds:['unknown'],sceneComposition:{
  id:'original-cast',sourceRef:digest,rightsRef:'original:rights',
  creativeAuthorityRef:'director:approved'
 }};
 assert.throws(()=>admitMicrodramaCommission(brief({scope:{
  ...baseline.scope,episodes:[episodeWith([wrongActor])]
 }})),/source shot cast must belong/u);
 const correct={...original,sceneComposition:{
  id:'original-cast',sourceRef:digest,rightsRef:'original:rights',
  creativeAuthorityRef:'director:approved'
 }};
 const mismatched={...correct,sceneComposition:{
  ...correct.sceneComposition,rightsRef:'other-property-rights'
 }};
 const second={...episode,id:'episode-two',
  shots:[{...mismatched,id:'second-'+mismatched.id},
   ...episode.shots.slice(1).map(x=>({...x,id:'second-'+x.id}))]};
 const conflict=planMicrodramaCommission(admitMicrodramaCommission(brief({scope:{
  ...baseline.scope,episodes:[episodeWith([correct]),second]
 }})),{maxAttemptsPerShot:2});
 assert.ok(conflict.holds.some(x=>x.includes('composition-reuse-changed-source-roles-or-rights')));
 assert.equal(conflict.lots.filter(x=>x.kind==='scene-composition').length,1);
});
