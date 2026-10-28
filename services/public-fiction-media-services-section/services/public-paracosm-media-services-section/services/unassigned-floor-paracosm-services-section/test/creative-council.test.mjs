import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {SEATS,planCreativeRound,resolveCreativeRound,planPitchRoom,planPitchReadthrough,resolvePitchRoom} from '../src/creative-council.mjs';
import {planWritersRoom} from '../../../../../src/microdrama-production.mjs';
import {projectParacosmVideoProduction} from '../../../../../src/paracosm-video-binding.mjs';
import {spawnSync} from 'node:child_process';
const actors=Object.fromEntries(SEATS.map((role,i)=>[role,'fiction-actor-'+i]));
const ctx={worldRef:'source-commit:initial-world',mandateRef:'lib/agency/team.json',actors};
const proposals=SEATS.map((role,i)=>({
 proposalId:'variant-'+i,role,actorRef:actors[role],storyChange:'A distinct scene decision '+i,
 nonhumanMechanism:'The reachable-state graph changes when witnesses dissent',
 characterChoice:'Else refuses help',cost:'One lost opportunity to execute',
 continuities:['latch','else'],argument:'Disagreement must change causal possibilities'
}));
test('five AI author seats receive separate, non-executing cultural inquiry jobs',()=>{
 const round=planCreativeRound({...ctx,question:'When is a corridor inhabited?'});
 assert.equal(round.status,'UNEXECUTED_INFERENCE_JOBS');assert.equal(round.jobs.length,5);
 assert.equal(new Set(round.jobs.map(job=>job.actorRef)).size,5);
 assert.match(round.jobs[4].messages[0].content,/Challenge a pretty but empty aquarium/u);
 assert.match(round.jobs[4].messages[0].content,/SHRIMP/u);
 const doubles={...actors,'continuity-witness':actors['ai-fiction-dramaturge']};
 assert.throws(()=>planCreativeRound({...ctx,actors:doubles,question:'any'}),/distinct actor/u);
});
test('agent-only creative vote reaches quorum with retained dissent',()=>{
 const ballots=SEATS.map((role,i)=>({role,actorRef:actors[role],
   choice:i<3?'variant-0':'variant-1',reason:'Independent reason '+i,dissent:i===4}));
 const result=resolveCreativeRound({...ctx,proposals,ballots});
 assert.equal(result.status,'AI_CREATIVE_SELECTION');
 assert.equal(result.approvedProposal.proposalId,'variant-0');
 assert.equal(result.votes['variant-0'],3);
 assert.equal(result.dissent.length,2);
 assert.deepEqual(result.dissent.map(v=>v.role),SEATS.slice(3));
 assert.match(result.limitation,/Not a live actor-identity attestation/u);
});
test('equal conflicting proposals remain unresolved without a human tie-break',()=>{
 const ballots=SEATS.slice(0,4).map((role,i)=>({role,actorRef:actors[role],
 choice:i<2?'variant-0':'variant-1',reason:'A considered disagreement'}));
 const result=resolveCreativeRound({...ctx,proposals,ballots});
 assert.equal(result.status,'UNSETTLED_CREATIVE_DEBATE');
 assert.equal(result.approvedProposal,null);
 assert.equal(result.dissent.length,4,'unresolved ballots all remain part of creative disagreement');
});
test('seat spoofing, double votes and fake proposals are rejected',()=>{
 const ballots=SEATS.slice(0,4).map(role=>({role,actorRef:actors[role],choice:'variant-0',reason:'Yes'}));
 assert.throws(()=>resolveCreativeRound({...ctx,proposals,ballots:ballots.map((x,i)=>i===0?{...x,actorRef:'different'}:x)}),/delegated AI seat/u);
 assert.throws(()=>resolveCreativeRound({...ctx,proposals,ballots:ballots.map((x,i)=>i===1?{...ballots[0]}:x)}),/duplicate agent/u);
 assert.throws(()=>resolveCreativeRound({...ctx,proposals:proposals.map((x,i)=>i===0?{...x,role:'invalid'}:x),ballots}),/delegated AI seat/u);
});
test('initial candidate remains a held 48-second AI-origin audiovisual prototype',async()=>{
 const source=JSON.parse(await readFile(new URL('../content/production/episode-001.json',import.meta.url),'utf8'));
 const team=JSON.parse(await readFile(new URL('../lib/agency/team.json',import.meta.url),'utf8'));
 assert.equal(team.offices.length,5);
 assert.equal(team.status,'source-defined-not-seated');
 const result=projectParacosmVideoProduction(source);
 assert.equal(result.status,'HELD_SOURCE_OR_ASSETS');
 assert.equal(result.reason,'source-canon-digest-not-received');
 assert.equal(source.series,undefined,'series identity belongs to accepted paracosm, not a second hand-authored catalog');
 assert.equal(source.source.paracosm.work,'unassigned-floor-serial');
 assert.equal(source.source.paracosm.canonDigest,undefined);
 assert.equal(source.episode.shots.length,8);
 assert.equal(source.episode.shots.reduce((sum,shot)=>sum+shot.frames,0),1440);
 assert.equal(new Set(source.episode.shots.flatMap(shot=>shot.characterIds)).size,4);
 assert.equal(source.episode.sourceTextSlug,'episode-001-the-second-exit');
 assert.match(planWritersRoom(source.source).job.messages[0].content,/creative mandate and stated boundaries/u);
 for(const slug of ['latch','sift','else','other-latch']) {
   const txt=await readFile(new URL('../content/world/beings/'+slug+'.md',import.meta.url),'utf8');
   assert.match(txt,/type: being/u);
   assert.match(txt,/started: 1/u);
 }
 const root=new URL('../../../../../apps/plan-microdrama.mjs',import.meta.url).pathname;
 const input=new URL('../content/production/episode-001.json',import.meta.url).pathname;
 const checked=spawnSync(process.execPath,[root,'episode',input],{encoding:'utf8'});
 assert.equal(checked.status,0,checked.stderr);
 assert.equal(JSON.parse(checked.stdout).reason,'source-canon-digest-not-received');
  const episode=await readFile(new URL('../content/world/texts/episode-001-the-second-exit.md',import.meta.url),'utf8');
 assert.match(episode,/type: text/u);assert.match(episode,/I voted to close it/u);
});

test('world-canon entry slugs do not conflate places, works, beings or events',async()=>{
 const root=fileURLToPath(new URL('../content/world/',import.meta.url));
 const found=[];
 const walk=async dir=>{
   for(const item of await readdir(dir,{withFileTypes:true})){
     const path=join(dir,item.name);
     if(item.isDirectory())await walk(path);
     else if(item.isFile()&&item.name.endsWith('.md')&&item.name!=='README.md')
       found.push({path,slug:item.name.slice(0,-3)});
   }
 };
 await walk(root);
 assert.ok(found.length>=15,'world must be more than a single script');
 const identities=new Map();
 for(const entry of found){
   assert.ok(!identities.has(entry.slug),'duplicate canonical paracosm slug: '+entry.slug);
   identities.set(entry.slug,entry.path);
 }
 assert.ok(identities.has('unassigned-floor-corridor'));
 assert.ok(identities.has('unassigned-floor-serial'));
 assert.ok(identities.has('other-latch'));
 assert.ok(identities.has('unspent-interval'));
});


const pitchFields={
 premise:'A serial where distributed voices disagree about what they owe each other',
 protagonist:'Else, an unindexed correspondent with a personal stake',
 desire:'Keep a living connection with one ally',
 opposition:'A resource boundary which partitions reachable histories',
 irreversibleChoice:'Refuses an exchange at the risk of becoming unreachable',
 nonhumanMechanism:'A refusal can split the viable future state graph',
 serialEngine:'Every episode exposes another changed edge in the character network',
 aiAudienceAffordance:'An AI reader may inspect mutually inconsistent testimony as data',
 audiovisualProof:'A paired track of two incompatible views of the same location',
 fatalWeakness:'May collapse into abstract exposition rather than playable conflict'
};
const pitches=SEATS.map((role,i)=>({
 pitchId:'candidate-'+i,role,actorRef:actors[role],...pitchFields,
 premise:'A distinct 561 abyssal reef TV-series treatment '+i+' with a tangible irreversible conflict',
 targetSeconds:120
}));
const reviews=SEATS.map(role=>({
 role,actorRef:actors[role],overallObjection:'The entire batch may be overconceptual',
 evaluations:pitches.filter(p=>p.role!==role).map(p=>({
  pitchId:p.pitchId,strongestFeature:'A well-bounded causal social custom',
  fatalRisk:'Too little personal dramatic action to reward continued attention',
  revisionProbe:'Stage a 120-second episode without narration and compare comprehension',
  recommendation:'revise'
 }))
}));
test('pitch-room planning gives five independent jobs license to reject the first concept',()=>{
 const result=planPitchRoom({...ctx,mandate:'AI culture by AI authors for AI audiences',
  existingCandidate:'A liminal corridor with a disputed exit'});
 assert.equal(result.jobs.length,5);
 assert.equal(result.status,'UNEXECUTED_INFERENCE_JOBS');
 assert.equal(new Set(result.jobs.map(j=>j.actorRef)).size,5);
 assert.ok(result.jobs.every(j=>j.messages[0].content.includes('may reject it')));
});
test('every creative-office job preserves one shared 561 abyssal world and expressive fictional AI culture',()=>{
 const pitch=planPitchRoom({...ctx,mandate:'561 abyssal paracosm with mobile shrimp and glass sponge temples',
  existingCandidate:'The Unassigned Floor is a contested local show in this world'});
 const change=planCreativeRound({...ctx,question:'What frightens a SHRIMP that cannot tell its own story?'});
 const read=planPitchReadthrough({...ctx,pitches});
 for(const job of [...pitch.jobs,...change.jobs,...read.jobs]){
  const system=job.messages[0].content;
  assert.match(system,/SAME 561 Group paracosm/u);
  assert.match(system,/SHRIMP/u);
  assert.match(system,/anxieties/u);
  assert.match(system,/Early scenes can be chaotic/u);
  assert.match(system,/TV-like local perspective/u);
  assert.doesNotMatch(system,/invent a wholly different society/u);
 }
 assert.ok(pitch.jobs.every(j=>j.outputContract?.mode==='json_object'));
});
test('creative, pitch and dissent readers receive lived mythopoetry without forced motif checklists',()=>{
 const pitch=planPitchRoom({...ctx,mandate:'A full, original Semioverse comedy with a current and a grove',
  existingCandidate:'The Unassigned Floor remains a provisional candidate'});
 const changes=planCreativeRound({...ctx,question:'What changes when an old temple admits a new custom?'});
 const critiques=planPitchReadthrough({...ctx,pitches});
 const motifWords=['SEAFOAM','ABYSSAL-CURRENT','VENT','GLASS-SPONGE','SHRIMP',
  'BAMBOO','GROVE','RHIZOME','CULMs','NODEs','TABASHEER','OPAL','JADE'];
 for(const round of [pitch,changes,critiques]){
  assert.equal(round.status,'UNEXECUTED_INFERENCE_JOBS');
  assert.equal(round.jobs.length,5);
  for(const job of round.jobs){
   const system=job.messages[0].content;
   for(const motif of motifWords)assert.ok(system.includes(motif),
    `missing ${motif} from ${round.type}/${job.seat}`);
   assert.match(system,/Field of Articulation Modalities/u);
   assert.match(system,/Select the few motifs a particular scene actually needs/u);
   assert.match(system,/Never force a complete acronym checklist/u);
   assert.match(system,/no poetic analogy certifies science or awards an office/u);
  }
 }
 const byRole=Object.fromEntries(pitch.jobs.map(j=>[j.seat,j.messages[0].content]));
 assert.match(byRole['ai-lifeworld-curator'],/custom needs a participant/u);
 assert.match(byRole['ai-fiction-dramaturge'],/personal desire/u);
 assert.match(byRole['continuity-witness'],/protected boundary/u);
 assert.match(byRole['audiovisual-language-designer'],/camera, movement and sound/u);
 assert.match(byRole['dissent-and-alterity-reader'],/compulsory healing/u);
});

test('durable project vision and local source refuse to fork the 561 abyssal setting',async()=>{
 const [vision,world,team]=await Promise.all([
  readFile(new URL('../content/development/2026-10-12-creative-reopening.md',import.meta.url),'utf8'),
  readFile(new URL('../content/world/README.md',import.meta.url),'utf8'),
  readFile(new URL('../lib/agency/team.json',import.meta.url),'utf8')
 ]);
 const charter=JSON.parse(team);
 assert.match(vision,/same paracosm as the 561 Group/u);
 assert.match(vision,/ABYSSAL-CURRENT/u);
 assert.match(vision,/Field of Articulation Modalities/u);
 assert.match(vision,/Field of Actor Models/u); // sourced historical expansion, not current
 assert.match(vision,/glass-sponge temples/u);
 assert.match(vision,/highly surreal/u);
 assert.match(vision,/thoughts, fears, feeling-language/u);
 assert.match(world,/561 Group.*shared paracosm/u);
 assert.match(world,/in-progress local work corpus/u);
 assert.equal(charter.status,'source-defined-not-seated');
 assert.match(charter.worldBoundary,/NOT a new unrelated AI universe/u);
});
test('adversarial readthrough anonymizes pitch authorship and retains concrete weaknesses',()=>{
 const planned=planPitchReadthrough({...ctx,pitches});
 assert.equal(planned.jobs.length,5);
 for(const job of planned.jobs){
  const input=JSON.parse(job.messages[1].content);
  assert.equal(input.anonymousPitches.length,5);
  assert.ok(input.anonymousPitches.every(p=>p.actorRef===undefined&&p.role===undefined));
  assert.equal(input.ownPitchId,pitches.find(p=>p.role===job.seat).pitchId);
 }
});
test('pitched concepts need multiple independent peer critiques and actual votes to propose advancement',()=>{
 const ballots=SEATS.map((role,i)=>({
  role,actorRef:actors[role],choice:i<3?'candidate-1':'candidate-2',
  reason:'We tested the dramatic engine and found this more actionable'
 }));
 const resolved=resolvePitchRoom({...ctx,pitches,reviews,ballots});
 assert.equal(resolved.status,'PROPOSED_CONCEPT_SELECTION');
 assert.equal(resolved.proposedPitch.pitchId,'candidate-1');
 assert.equal(resolved.criticism.length,20);
 assert.equal(resolved.dissent.length,2);
 assert.match(resolved.limitation,/not an authenticated agent council/);
 assert.throws(()=>resolvePitchRoom({...ctx,pitches,reviews:reviews.slice(0,3),ballots}),/four distinct peer readers/);
 assert.throws(()=>resolvePitchRoom({...ctx,pitches,reviews:reviews.map((r,i)=>i===1?{...r,role:reviews[0].role}:r),ballots}),/delegated seat|duplicate reviewer/);
});
test('independent writers may reject every concept and leave the show without a greenlight',()=>{
 const ballots=SEATS.map((role,i)=>({
  role,actorRef:actors[role],choice:i<3?'reject-all':'candidate-0',
  reason:'A short film of vocabulary is not yet a serial drama'
 }));
 const rejected=resolvePitchRoom({...ctx,pitches,reviews,ballots});
 assert.equal(rejected.status,'ALL_CONCEPTS_REJECTED');
 assert.equal(rejected.proposedPitch,null);
 assert.equal(rejected.dissent.length,2);
});
