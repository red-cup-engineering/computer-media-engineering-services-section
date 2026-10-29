/**
 * Receive Red Cup dispatch-jsonl output, mapping each returned completion
 * to a pre-planned independent creative seat. This is a trusted *data-shape*
 * boundary, NOT actor authentication. Never take identity or authority from
 * model text, a caller-provided actorRef string, or successful JSON parsing.
 *
 * Fabric envelope: {id, endpoint, model, attempts, text, verification,
 *                  dryRun, jobDigest, refusal?}.
 * All results are source candidates until an authorized office verifies
 * the actual runner/actor and receives the artistic decision.
 */
import {createHash} from 'node:crypto';
const stages={AIFictionPitchRoom:'pitch',AIFictionPitchReadthrough:'readthrough'};
const required=(s,name,max=20000)=>{
 if(typeof s!=='string'||!s.trim()||s.length>max)throw new TypeError(name+' must be nonempty bounded text');
 return s;
};
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const PITCH_FIELDS=[
 'premise','protagonist','desire','opposition','irreversibleChoice','nonhumanMechanism',
 'serialEngine','aiAudienceAffordance','audiovisualProof','fatalWeakness'
];
const hex=x=>createHash('sha256').update(x,'utf8').digest('hex');
const pick=(x,fields)=>Object.fromEntries(fields.map(k=>[k,x[k]]));
function verifyPayload(stage,value,seat,actor,job){
 if(!obj(value)||value.role!==seat||value.actorRef!==actor)
  throw new TypeError('model output role/actor does not match planned job '+job.id);
 if(stage==='pitch'){
  required(value.pitchId,'pitchId',100);
  for(const field of PITCH_FIELDS)required(value[field],field,16000);
  if(value.targetSeconds!==undefined&&(!Number.isInteger(value.targetSeconds)||
    value.targetSeconds<30||value.targetSeconds>300))
    throw new TypeError('invalid pitch targetSeconds');
  return Object.freeze(pick(value,['pitchId','role','actorRef',...PITCH_FIELDS,
   ...(value.targetSeconds===undefined?[]:['targetSeconds'])]));
 }
 if(stage==='readthrough'){
  required(value.overallObjection,'overallObjection');
  if(!Array.isArray(value.evaluations))throw new TypeError('peer evaluations missing');
  const instruction=JSON.parse(job.messages[1].content);
  const own=instruction.ownPitchId;
  const eligible=new Set(instruction.anonymousPitches.filter(p=>p.pitchId!==own).map(p=>p.pitchId));
  if(value.evaluations.length!==eligible.size)throw new TypeError('missing or excess peer evaluations');
  const seen=new Set();
  const evaluations=value.evaluations.map(e=>{
   if(!obj(e)||!eligible.has(e.pitchId)||seen.has(e.pitchId))
    throw new TypeError('unplanned, self or duplicate peer evaluation');
   seen.add(e.pitchId);
   for(const field of ['strongestFeature','fatalRisk','revisionProbe'])required(e[field],field,16000);
   if(!['advance','revise','reject'].includes(e.recommendation))
    throw new TypeError('invalid peer recommendation');
   return Object.freeze(pick(e,['pitchId','strongestFeature','fatalRisk','revisionProbe','recommendation']));
  });
  return Object.freeze({role:seat,actorRef:actor,overallObjection:value.overallObjection,evaluations});
 }
 throw new TypeError('unrecognized creative stage');
}

/**
 * This deliberately refuses incomplete batches instead of letting a fake
 * quorum be built from a subset of conveniently successful completions.
 */
export function receiveCreativeDispatch({plan,records}={}){
 if(!obj(plan)||!stages[plan.type]||plan.status!=='UNEXECUTED_INFERENCE_JOBS'||
   !Array.isArray(plan.jobs)||plan.jobs.length!==5)
   throw new TypeError('one five-seat planned AI creative pitch or readthrough round required');
 if(!Array.isArray(records)||records.length>25)throw new TypeError('bounded Red Cup records array required');
 const stage=stages[plan.type];
 const jobs=new Map();
 const seats=new Set(),actors=new Set();
 for(const job of plan.jobs){
  if(!obj(job)||!required(job.id,'planned job ID')||
    !required(job.seat,'planned office')||!required(job.actorRef,'planned actor ref')||
    !Array.isArray(job.messages)||job.messages.length<2)
   throw new TypeError('invalid planned creative job');
  if(jobs.has(job.id)||seats.has(job.seat)||actors.has(job.actorRef))
   throw new TypeError('duplicate job, seat or actor in plan');
  if(job.outputContract?.format!=='json')throw new TypeError('structured JSON output contract required');
  jobs.set(job.id,job);seats.add(job.seat);actors.add(job.actorRef);
 }
 const received=new Map();
 for(const record of records){
  if(!obj(record)||!jobs.has(record.id)||received.has(record.id))
   throw new TypeError('unexpected or duplicate dispatch record');
  received.set(record.id,record);
 }
 const missing=[...jobs.keys()].filter(id=>!received.has(id));
 const failures=[];
 for(const [id,r] of received){
  if(r.refusal||r.dryRun!==false||typeof r.text!=='string'||!r.text.trim()||
    r.text.length>128*1024||!r.endpoint||!r.model||!r.jobDigest||
    r.verification?.format!=='json'||
    !Array.isArray(r.attempts)||!r.attempts.some(a=>a.outcome==='completion'&&a.endpoint===r.endpoint)){
   failures.push({id,reason:r.refusal?'provider-refusal-or-incomplete':
    r.dryRun!==false?'dry-run-or-unsettled-execution':'missing-verified-json-or-provider-provenance'});
  }
 }
 if(missing.length||failures.length)return Object.freeze({
  type:'AICreativeDispatchReception',status:'INCOMPLETE_OR_REFUSED',stage,
  missing,failures,
  limitation:'This projection cannot turn synthetic or failed results into actual writers. Retry only the owning operator, retaining the original dispatch journal.'
 });
 const results=[],evidence=[];
 for(const job of plan.jobs){
  const record=received.get(job.id);
  let value;
  try{value=JSON.parse(record.text)}
  catch{throw new TypeError('malformed completion JSON at '+job.id)}
  const safe=verifyPayload(stage,value,job.seat,job.actorRef,job);
  results.push(safe);
  evidence.push(Object.freeze({jobId:job.id,seat:job.seat,actorRef:job.actorRef,
   endpoint:required(record.endpoint,'endpoint'),model:required(record.model,'model'),
   jobDigest:required(record.jobDigest,'job digest'),
   responseSha256:hex(record.text),verification:record.verification,
   dryRun:false}));
 }
 if(stage==='pitch'){
  const ids=results.map(p=>p.pitchId);
  if(new Set(ids).size!==ids.length)throw new TypeError('different authors emitted duplicate pitch IDs');
 }
 return Object.freeze({
  type:'AICreativeDispatchReception',status:'RECEIVED_UNAUTHENTICATED_CANDIDATES',
  stage,worldRef:required(plan.worldRef,'worldRef'),
  mandateRef:required(plan.mandateRef,'mandateRef'),
  results:Object.freeze(results),evidence:Object.freeze(evidence),
  next:stage==='pitch'?'send received independent pitches to peer readthrough, then acquire external actor attestations':
   'obtain independent ballots and verify runner/actor custody before source-owner receives any proposed artistic selection',
  limitation:'Checks the exact planned job IDs, runner result fields, response JSON and actor/seat text consistency. It does NOT cryptographically authenticate provider, runner, agent identity, subjective experience, or creative authority; no canon write, funding or publication occurs.'
 });
}
