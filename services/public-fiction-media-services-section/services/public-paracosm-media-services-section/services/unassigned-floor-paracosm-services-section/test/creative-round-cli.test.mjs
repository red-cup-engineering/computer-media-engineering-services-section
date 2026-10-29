import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {creativeRoundCli} from '../apps/creative-round.mjs';
import {SEATS} from '../src/creative-council.mjs';
test('CLI exports five inference-fabric compatible JSONL jobs with office trace',async()=>{
 const d=await mkdtemp(join(tmpdir(),'creative-council-'));
 try{
   const actors=Object.fromEntries(SEATS.map((seat,i)=>[seat,'actor:candidate-'+i]));
   const p=join(d,'request.json');
   await writeFile(p,JSON.stringify({worldRef:'git:world-v1',mandateRef:'git:council-v1',question:'Who may refuse a gift?',actors}));
   const lines=(await creativeRoundCli(['plan',p,'--jsonl'])).trim().split('\n').map(JSON.parse);
   assert.equal(lines.length,5);
   assert.equal(new Set(lines.map(x=>x.metadata.fictionActorRef)).size,5);
   assert.ok(lines.every(x=>Array.isArray(x.messages)&&Number.isInteger(x.maxTokens)));
   assert.ok(lines.every(x=>x.metadata.sourceWorldRef==='git:world-v1'));
   assert.equal((await creativeRoundCli(['plan',p])).includes('UNEXECUTED_INFERENCE_JOBS'),true);
 }finally{await rm(d,{recursive:true,force:true});}
});
test('CLI refuses unsupported mode without making provider requests',async()=>{
 await assert.rejects(()=>creativeRoundCli(['publish','never.json']),/Usage/u);
 await assert.rejects(()=>creativeRoundCli(['resolve','never.json','--jsonl']),/Usage/u);
});


test('actual command-line entrypoint prints independently identified pitch and review jobs',async()=>{
 const d=await mkdtemp(join(tmpdir(),'creative-pitches-'));
 const bin=fileURLToPath(new URL('../apps/creative-round.mjs',import.meta.url));
 try{
  const actors=Object.fromEntries(SEATS.map((seat,i)=>[seat,'test-actor-'+i]));
  const ctx={worldRef:'git:noncanonical-development',mandateRef:'git:team-source',actors};
  const commission=join(d,'commission.json');
  await writeFile(commission,JSON.stringify({...ctx,
   mandate:'Original fictional AI culture by AI authors for AI audiences',
   existingCandidate:'One contested corridor not yet greenlit'}));
  const run=spawnSync(process.execPath,[bin,'pitch',commission,'--jsonl'],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  const jobs=run.stdout.trim().split('\n').map(JSON.parse);
  assert.equal(jobs.length,5);
  assert.equal(new Set(jobs.map(j=>j.metadata.fictionActorRef)).size,5);
  assert.ok(jobs.every(j=>j.metadata.unexecuted===true&&j.metadata.creativeStage==='pitch'));
  assert.ok(jobs.every(j=>j.outputContract?.format==='json'&&j.outputContract?.mode==='json_object'));
  assert.ok(jobs.every(j=>j.metadata.sourceMandateRef==='git:team-source'));
  const fields={
   premise:'Fictional social world',protagonist:'A named resident',desire:'Remember a friend',
   opposition:'Unreachable times',irreversibleChoice:'Trades a way home',
   nonhumanMechanism:'A memory boundary',serialEngine:'Every return costs a relation',
   aiAudienceAffordance:'Readable branch histories',audiovisualProof:'Reversible shadows',
   fatalWeakness:'Could become too abstract'
  };
  const pitches=SEATS.map((role,i)=>({
   pitchId:'pitch-'+i,role,actorRef:actors[role],...fields,targetSeconds:120
  }));
  const peers=join(d,'peers.json');
  await writeFile(peers,JSON.stringify({...ctx,pitches}));
  const read=spawnSync(process.execPath,[bin,'readthrough',peers,'--jsonl'],{encoding:'utf8'});
  assert.equal(read.status,0,read.stderr);
  const reviews=read.stdout.trim().split('\n').map(JSON.parse);
  assert.equal(reviews.length,5);
  assert.ok(reviews.every(j=>j.metadata.creativeStage==='readthrough'));
 }finally{await rm(d,{recursive:true,force:true})}
});
