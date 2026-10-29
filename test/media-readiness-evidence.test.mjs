import test from "node:test";
import assert from "node:assert/strict";
import {normalizeReadinessEvidence,readinessTruth,aggregateReadinessEvidence,scopeMediaReadinessEvidence} from "../src/media-readiness-evidence.mjs";
const entry=(authority,recordedAt,evidence,scope="receiver",purpose)=>({
  type:"MediaReadiness",mediaNeed:"need-1",scope,authority,recordedAt,
  ...(scope==="artifact"?{purpose}:{}),evidence
});
test("two-sided truth retains supported, refuted, both and neither",()=>{
 assert.deepEqual(normalizeReadinessEvidence({ready:true}),{for:true,against:false});
 assert.deepEqual(normalizeReadinessEvidence({ready:false}),{for:false,against:true});
 assert.equal(readinessTruth({for:true,against:true}),"both");
 assert.equal(readinessTruth({for:false,against:false}),"neither");
 assert.equal(readinessTruth({for:true,against:false}),"supported");
 assert.equal(readinessTruth({for:false,against:true}),"refuted");
 assert.throws(()=>normalizeReadinessEvidence({ready:true,evidence:{for:true,against:true}}),/contradicts/u);
});
test("distinct authorities can contradict without last writer wins",()=>{
 const rows=[
  entry("rights","2026-10-12T13:00:00Z",{for:true,against:false}),
  entry("publisher","2026-10-12T13:05:00Z",{for:false,against:true})
 ];
 const r=aggregateReadinessEvidence(rows);
 assert.equal(r.receiver.get("need-1").truth,"both");
 assert.equal(r.receiver.get("need-1").ready,false);
 assert.deepEqual(r.receiver.get("need-1").evidence,{for:true,against:true});
});
test("a local withdrawal affects only its own support or refusal; history is retained in journal",()=>{
 const rows=[
  entry("rights","2026-10-12T13:00:00Z",{for:true,against:false}),
  entry("editor","2026-10-12T13:01:00Z",{for:false,against:true}),
  entry("editor","2026-10-12T13:02:00Z",{for:false,against:false})
 ];
 const result=aggregateReadinessEvidence(rows);
 assert.equal(result.receiver.get("need-1").ready,true);
 assert.equal(result.receiver.get("need-1").truth,"supported");
});
test("simultaneous contradictory evidence joins, not nondeterministic last-writer",()=>{
 const a=entry("same-authority","2026-10-12T13:00:00Z",{for:true,against:false});
 const b=entry("same-authority","2026-10-12T13:00:00Z",{for:false,against:true});
 assert.equal(aggregateReadinessEvidence([a,b]).receiver.get("need-1").truth,"both");
 assert.equal(aggregateReadinessEvidence([b,a]).receiver.get("need-1").truth,"both");
});
test("artifact authority never implicitly clears separate receiver readiness",()=>{
 const x=entry("art-rights","2026-10-12T13:00:00Z",{for:true,against:false},"artifact","social");
 const r=aggregateReadinessEvidence([x]);
 assert.equal(r.receiver.size,0);
 assert.equal(r.artifact.get("need-1#social").ready,true);
});
test("recorded readiness legacy Boolean projects but does not replace conflicting evidence",()=>{
 const old={type:"MediaReadiness",mediaNeed:"need-1",scope:"receiver",authority:"legacy",
   recordedAt:"2026-10-12T13:00:00Z",ready:true};
 const newer=entry("science","2026-10-12T13:01:00Z",{for:false,against:true});
 const r=aggregateReadinessEvidence([old,newer]);
 assert.equal(r.receiver.get("need-1").truth,"both");
 assert.equal(r.receiver.get("need-1").ready,false);
});


test("consumer-scoped readiness exposes exact needs only and never sibling principals",()=>{
  const receipts=[
    entry("editor","2026-10-12T13:00:00Z",{for:true,against:false}),
    {...entry("private-author","2026-10-12T13:05:00Z",{for:false,against:true}),mediaNeed:"private-need"},
    entry("child-rights","2026-10-12T13:10:00Z",{for:true,against:false},"artifact","hero"),
    entry("other-artifact","2026-10-12T13:11:00Z",{for:false,against:true},"artifact","confidential"),
    {...entry("other-consumer","2026-10-12T13:12:00Z",{for:true,against:false},"artifact","hero"),mediaNeed:"private-need"}
  ];
  const aggregated=aggregateReadinessEvidence(receipts);
  const visible=scopeMediaReadinessEvidence(aggregated,[
    {id:"need-1",artifacts:[{purpose:"hero"}]}
  ]);
  assert.deepEqual([...visible.receiver.keys()],["need-1"]);
  assert.deepEqual([...visible.artifact.keys()],["need-1#hero"]);
  assert.deepEqual(visible.receiver.get("need-1").evidence,{for:true,against:false});
  assert.equal(aggregated.receiver.has("private-need"),true);
  assert.equal(visible.receiver.has("private-need"),false);
  assert.equal(visible.artifact.has("need-1#confidential"),false);
  assert.equal(visible.artifact.has("private-need#hero"),false);
});

test("missing scoped needs expose no readiness and invalid scope is refused",()=>{
  const full=aggregateReadinessEvidence([entry("rights","2026-10-12T14:00:00Z",{for:true,against:false})]);
  const empty=scopeMediaReadinessEvidence(full,[]);
  assert.equal(empty.receiver.size,0);
  assert.equal(empty.artifact.size,0);
  assert.throws(()=>scopeMediaReadinessEvidence(full,[{id:"a"}]),/invalid MediaNeed/u);
});
