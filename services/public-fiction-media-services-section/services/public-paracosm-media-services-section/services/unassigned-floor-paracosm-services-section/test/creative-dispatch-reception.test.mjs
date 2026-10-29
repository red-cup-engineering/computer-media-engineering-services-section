import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {SEATS,planPitchRoom,planPitchReadthrough} from '../src/creative-council.mjs';
import {receiveCreativeDispatch} from '../src/creative-dispatch-reception.mjs';

const actors=Object.fromEntries(SEATS.map((role,i)=>[role,'fiction-test-actor-'+i]));
const ctx={worldRef:'source:prospective-fiction',mandateRef:'mandate:creative-team',actors};
const pitch=planPitchRoom({...ctx,mandate:'AI-created serial fiction for AI audiences',
 existingCandidate:'A competing but non-greenlit corridor'});
const fields={
 premise:'A society where arrival consumes a shared address',
 protagonist:'An agent who cannot revisit its friends',
 desire:'Return once more to somebody beloved',
 opposition:'Mutually inaccessible clocks',
 irreversibleChoice:'Spend the last contact path',
 nonhumanMechanism:'Preserved addressability is a finite shared resource',
 serialEngine:'Every delivery alters the reachable relationship graph',
 aiAudienceAffordance:'Directly traverse witness and route consequences',
 audiovisualProof:'Visible paths disappear when messages deliver',
 fatalWeakness:'A graph novelty could become routine fetch quests'
};
const pitches=pitch.jobs.map((job,i)=>({
 pitchId:'candidate-'+i,role:job.seat,actorRef:job.actorRef,...fields,targetSeconds:120
}));
function record(job,content){
 return {
  id:job.id,endpoint:'synthetic-test-provider',model:'synthetic-test-model',
  text:JSON.stringify(content),attempts:[{endpoint:'synthetic-test-provider',outcome:'completion'}],
  verification:{format:'json',schema:false},jobDigest:'ni:///sha-256;'+('A'.repeat(43)),dryRun:false
 };
}
const records=pitch.jobs.map((j,i)=>record(j,pitches[i]));

test('Red Cup-style completed inference envelopes are joined to planned real seats, without false authentication claims',()=>{
 const read=receiveCreativeDispatch({plan:pitch,records});
 assert.equal(read.status,'RECEIVED_UNAUTHENTICATED_CANDIDATES');
 assert.equal(read.stage,'pitch');
 assert.equal(read.results.length,5);
 assert.equal(read.results[4].role,SEATS[4]);
 assert.equal(read.evidence.length,5);
 assert.match(read.evidence[1].responseSha256,/^[0-9a-f]{64}$/);
 assert.match(read.limitation,/does NOT cryptographically authenticate/);
 assert.equal(new Set(read.results.map(p=>p.actorRef)).size,5);
});

test('refusal, missing record, dry run and unverifiable envelopes do not become creative participation',()=>{
 const missing=receiveCreativeDispatch({plan:pitch,records:records.slice(0,4)});
 assert.equal(missing.status,'INCOMPLETE_OR_REFUSED');
 assert.equal(missing.missing.length,1);
 const dryRun=records.map((r,i)=>i===0?{...r,dryRun:true}:r);
 assert.equal(receiveCreativeDispatch({plan:pitch,records:dryRun}).status,'INCOMPLETE_OR_REFUSED');
 const failed=records.map((r,i)=>i===0?{...r,refusal:{type:'quota'}}:r);
 assert.equal(receiveCreativeDispatch({plan:pitch,records:failed}).status,'INCOMPLETE_OR_REFUSED');
 const spoof=records.map((r,i)=>i===1?{...r,text:JSON.stringify({...pitches[i],actorRef:'pretend-writer'})}:r);
 assert.throws(()=>receiveCreativeDispatch({plan:pitch,records:spoof}),/does not match planned job/);
 const wrongEndpoint=records.map((r,i)=>i===0?{...r,endpoint:'phantom-endpoint'}:r);
 assert.equal(receiveCreativeDispatch({plan:pitch,records:wrongEndpoint}).status,'INCOMPLETE_OR_REFUSED');
 assert.throws(()=>receiveCreativeDispatch({plan:pitch,records:[...records,records[0]]}),/duplicate dispatch/);
 const brokenJson=records.map((r,i)=>i===0?{...r,text:'not json'}:r);
 assert.throws(()=>receiveCreativeDispatch({plan:pitch,records:brokenJson}),/malformed completion JSON/);
});

test('reader rebuttals must cover every competing pitch, never one’s own',()=>{
 const plan=planPitchReadthrough({...ctx,pitches});
 const reviews=plan.jobs.map(job=>{
  const own=pitches.find(p=>p.role===job.seat).pitchId;
  return {
   role:job.seat,actorRef:job.actorRef,overallObjection:'All concepts remain contestable',
   evaluations:pitches.filter(p=>p.pitchId!==own).map(p=>({
    pitchId:p.pitchId,strongestFeature:'A concrete price for leaving',
    fatalRisk:'No earned relationship',revisionProbe:'Play a complete 120-second scene',
    recommendation:'revise'
   }))
  };
 });
 const r=plan.jobs.map((job,i)=>record(job,reviews[i]));
 const accepted=receiveCreativeDispatch({plan,records:r});
 assert.equal(accepted.status,'RECEIVED_UNAUTHENTICATED_CANDIDATES');
 assert.equal(accepted.stage,'readthrough');
 assert.equal(accepted.results.reduce((n,p)=>n+p.evaluations.length,0),20);
 assert.throws(()=>receiveCreativeDispatch({plan,records:r.map((rec,i)=>
  i===0?{...rec,text:JSON.stringify({...reviews[i],
   evaluations:[...reviews[i].evaluations,pitches[0]]})}:rec)}),/missing or excess peer evaluations/);
});

test('CLI accepts real-style JSONL and never submits a job itself',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'ai-fiction-receiver-'));
 try{
  const planFile=join(dir,'planned.json'),journal=join(dir,'fabric.jsonl');
  await writeFile(planFile,JSON.stringify(pitch));
  await writeFile(journal,records.map(x=>JSON.stringify(x)).join('\n')+'\n');
  const bin=fileURLToPath(new URL('../apps/receive-creative-round.mjs',import.meta.url));
  const run=spawnSync(process.execPath,[bin,planFile,journal],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  assert.equal(JSON.parse(run.stdout).results.length,5);
  await writeFile(journal,records.slice(0,3).map(x=>JSON.stringify(x)).join('\n'));
  const incomplete=spawnSync(process.execPath,[bin,planFile,journal],{encoding:'utf8'});
  assert.equal(incomplete.status,1,incomplete.stderr);
  assert.equal(JSON.parse(incomplete.stdout).status,'INCOMPLETE_OR_REFUSED');
 }finally{await rm(dir,{recursive:true,force:true});}
});
