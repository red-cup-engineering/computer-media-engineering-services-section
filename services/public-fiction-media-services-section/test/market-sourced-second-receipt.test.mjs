import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileNarrativeEpisode,estimateVideoGeneration}
 from '../src/microdrama-production.mjs';

const file=new URL('./fixtures/content/productions/the-second-receipt/production.json',import.meta.url);
const original=()=>JSON.parse(readFileSync(file,'utf8'));
const producer=(packet,ep)=>compileNarrativeEpisode({
 source:packet.source,series:packet.series,episode:ep,
 receiver:packet.receiver,openedAt:packet.openedAt,maxShotSeconds:8
});
const cli=fileURLToPath(new URL('../apps/plan-microdrama.mjs',import.meta.url));
const run=path=>JSON.parse(execFileSync(process.execPath,[cli,'series',path],{
 encoding:'utf8',timeout:30000,maxBuffer:7000000
}));

test('market signal and first original source identity have independent dated and exact provenance',()=>{
 const p=original();
 assert.equal(p.kind,'causeway.public-fiction.original-market-sourced-microdrama');
 assert.equal(p.status,'ORIGINAL_SOURCE_DRAFT_NOT_FILMED_NOT_AUTHORIZED_FOR_PROVIDER_SPEND');
 const actual='ni:///sha-256;'+createHash('sha256').update(p.sourceSeed,'utf8').digest('base64url');
 assert.equal(p.source.originRef,actual);
 assert.equal(p.source.type,'NarrativeSource');
 assert.equal(p.source.paracosm,undefined,
  'this is new fictional intellectual property, not the existing shrimp world');
 assert.match(p.source.rightsClaimRef,/needs-independent/u);
 assert.match(p.source.creativeAuthorityRef,/not-yet-given/u);
 assert.equal(p.source.culturalScope.includes('Indigenous'),true);
 const sources=p.market.observations;
 assert.ok(sources.length>=4&&sources.some(x=>x.publisher==='Federal Reserve SHED')&&
  sources.some(x=>x.publisher==='Sensor Tower')&&
  sources.some(x=>x.publisher==='Pew Research Center'));
 assert.ok(sources.every(x=>x.sourceUrl.startsWith('https://')&&x.published<=p.createdOn),
  'research references are dated, not made-up audience view data');
 assert.match(p.market.audienceHypothesis,/not a verified customer profile/u);
 assert.match(p.market.preregisteredPilotTests.decisionRule,/inconclusive/u);
 const teasers=p.market.preregisteredPilotTests.promotionalCuts;
 assert.deepEqual(teasers.map(x=>x.variant),['A','B']);
 const episodeOne=new Map(p.episodes[0].shots.map(x=>[x.id,x.frames/30]));
 for(const teaser of teasers){
  assert.equal(teaser.state,'EDITOR_SOURCE_EDL_NOT_RENDERED');
  assert.equal(teaser.sourceEdits.reduce((secs,shot)=>secs+shot.outSeconds-shot.inSeconds,0),15);
  assert.ok(teaser.sourceEdits.every(x=>x.episodeId==='episode-one'&&
   episodeOne.has(x.shotId)&&x.outSeconds<=episodeOne.get(x.shotId)));
 }
 assert.notEqual(teasers[0].hook,teasers[1].hook,
  'genuine emotional vs injustice teaser comparison requires distinct source opening lines');
});

test('all three ORIGINAL scripted microdramas compile through the unchanged public-fiction film engine',()=>{
 const p=original(),ids=new Set();
 assert.equal(p.episodes.length,3);
 for(const ep of p.episodes){
  const compiled=producer(p,ep);
  assert.equal(compiled.status,'PROPOSED_NOT_ADMITTED');
  assert.equal(compiled.durationSeconds,72);
  assert.equal(compiled.totalFrames,2160);
  assert.equal(compiled.aspectRatio,'9:16');
  assert.equal(compiled.frameRate,30);
  assert.equal(compiled.jobs.video.length,9);
  assert.equal(compiled.jobs.speech.length,0,
   'dialogue is performed in the actual modeled cinematic shot, not a fake vector table read');
  assert.equal(compiled.timeline[0].startFrame,0);
  assert.equal(compiled.timeline.at(-1).endFrame,2160);
  assert.equal(compiled.source.originRef,p.source.originRef);
  assert.equal(compiled.mediaNeedCandidate.intake.state,'proposed-unverified');
  assert.ok(compiled.mediaNeedCandidate.artifacts.every(x=>x.disposition==='hold'));
  assert.ok(compiled.requiredReceiverChecks.includes('compare-actual-rendered-audio-and-video'));
  assert.ok(compiled.requiredReceiverChecks.includes('independent-editorial-acceptance'));
  for(const shot of compiled.jobs.video){
   assert.equal(shot.durationFrames,240);
   assert.equal(shot.audioMode,'embedded-performance');
   assert.ok(shot.cast.length<=2,
    'one lobby visual and at most two cast identity references preserve real Veo input bounds');
   assert.ok(shot.cast.every(a=>a.visualRef.startsWith('UNAPPROVED:')));
   assert.ok(shot.location.referenceRef.startsWith('UNAPPROVED:'));
   assert.ok(shot.action.length>45&&shot.camera.length>30,
    'a provider shot needs actual performance and camera direction, not empty filler');
   ids.add(shot.id);
  }
  assert.equal(producer(p,ep).subtitlesSrt,compiled.subtitlesSrt,
   'story timing, original dialogue and caption proposals remain deterministic');
  const scenario=estimateVideoGeneration({plan:compiled,rateCentsPerSecond:1,
   attemptsPerShot:1,maxBudgetCents:72,allowedClipSeconds:[8]});
  assert.equal(scenario.deliveredSeconds,72);
  assert.equal(scenario.billableSeconds,72);
  assert.equal(scenario.estimatedCents,72,
   'one-cent synthetic unit test is NOT a provider tariff or paid quote');
 }
 assert.equal(ids.size,27,'source-authored shot identities must be unique across all three episodes');
});

test('separate literal dramatic payoffs and counterfactual marketing cuts remain traceable to social research',()=>{
 const p=original(),last=p.episodes.map(e=>e.beats.at(-1));
 assert.deepEqual(last.map(x=>x.kind),['cliffhanger','cliffhanger','cliffhanger']);
 assert.ok(last.every(b=>b.question&&b.action&&b.consequence));
 const dialogue=p.episodes.flatMap(e=>e.shots.flatMap(x=>x.dialogue.map(d=>d.text)));
 assert.ok(dialogue.some(x=>/paid yesterday/i.test(x)));
 assert.ok(dialogue.some(x=>/verification engine/i.test(x)));
 assert.ok(dialogue.some(x=>/my mother/i.test(x)));
 assert.equal(p.series.locations.length,1,'constrain original video cost: repeat one real location');
 assert.equal(p.series.characters.length,3);
 assert.ok(p.episodes.every(e=>e.shots.every(s=>s.characterIds.length<=2)));
 assert.match(p.operations.firstPhysicalShot.status,/HELD_UNTIL/u);
 assert.match(p.operations.firstPhysicalShot.success,/Real 8-second/u);
 assert.ok(!p.market.preregisteredPilotTests.outcomes.some(x=>/fictional sales are confirmed/i.test(x)));
});

test('real existing producer CLI compiles all 27 original video jobs from one source package and spends nothing',()=>{
 const p=original(),result=run(fileURLToPath(file));
 assert.equal(result.type,'MarketSourcedMicrodramaSerialProjection');
 assert.equal(result.state,'ORIGINAL_SCREENPLAY_PROPOSALS_NOT_APPROVED_NOT_FILMED');
 assert.equal(result.episodes.length,3);
 assert.equal(result.totalPlannedShots,27);
 assert.equal(result.totalPlannedSeconds,216);
 assert.equal(result.marketingCutPlans.length,2);
 assert.equal(result.marketingCutRenderCount,0);
 assert.equal(result.sourceRef,p.source.originRef);
 assert.equal(result.providerSubmissionCount,0);
 assert.equal(result.deliveredFilmCount,0);
 assert.equal(result.acceptedFinishedSeconds,0);
 assert.equal(result.actualCurrencySpent,null);
 assert.equal(result.sourceAssetsState,
  'HELD_MISSING_ORIGINAL_RIGHTS_ACCEPTED_VISUAL_AND_VOICE_REFERENCES');
 assert.equal(result.nextRealEffect.shotId,'door-refuses');
 assert.ok(result.episodes.every(e=>e.mediaNeedCandidate.intake.state==='proposed-unverified'));
});

test('a swapped story seed, duplicate episode, forged market URL or alleged accepted visual cannot purchase the source',()=>{
 const p=original(),root=mkdtempSync(join(tmpdir(),'fiction-market-source-'));
 const input=join(root,'input.json');
 function reject(changed){
  writeFileSync(input,JSON.stringify(changed));
  assert.throws(()=>execFileSync(process.execPath,[cli,'series',input],{
   encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe']
  }),/Command failed/u);
 }
 try{
  reject({...p,sourceSeed:p.sourceSeed+' silently change Ada into someone else'});
  reject({...p,episodes:[p.episodes[0],p.episodes[0]]});
  reject({...p,market:{...p.market,
   preregisteredPilotTests:{...p.market.preregisteredPilotTests,
    promotionalCuts:[{...p.market.preregisteredPilotTests.promotionalCuts[0],
     sourceEdits:[{episodeId:'episode-one',shotId:'fake-shot',
      inSeconds:0,outSeconds:15}]}]}}});
  reject({...p,market:{...p.market,observations:[
   {...p.market.observations[0],sourceUrl:'https://invented.example/unverified'},...p.market.observations.slice(1)]}});
  reject({...p,series:{...p.series,characters:[
   {...p.series.characters[0],visualRef:'ni:///sha-256;'+'A'.repeat(43)},
   ...p.series.characters.slice(1)]}});
  assert.equal(run(fileURLToPath(file)).deliveredFilmCount,0);
 }finally{rmSync(root,{recursive:true,force:true});}
});
