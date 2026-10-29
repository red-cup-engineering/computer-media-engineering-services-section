import test from "node:test";
import assert from "node:assert/strict";

import { admitMediaNeed, mediaDemandFrontier, planMediaAllowance } from "../src/media-demand-market.mjs";

const need=(overrides={})=>({
  type:"MediaNeed",
  id:"ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  consumer:"koios-news-services-section",
  objective:"extend an accepted release",
  openedAt:"2026-10-04T17:00:00.000Z",
  artifacts:[
    {capability:"image-generation",purpose:"social-outbound",priority:100,disposition:"admissible"},
    {capability:"source-grounded-short-video",purpose:"short-form-discovery",priority:70,disposition:"conditional",condition:"short destination exists"},
    {capability:"source-grounded-slide-deck",purpose:"daily-feature",priority:60,disposition:"conditional",condition:"wins daily feature"},
  ],
  ...overrides,
});

test("admission preserves receiver demand and refuses duplicate artifact keys",()=>{
  const admitted=admitMediaNeed(need());
  assert.equal(admitted.consumer,"koios-news-services-section");
  assert.equal(admitted.artifacts[0].wanted,1);
  assert.throws(()=>admitMediaNeed(need({artifacts:[
    {capability:"image-generation",purpose:"social-outbound"},
    {capability:"image-generation",purpose:"social-outbound"},
  ]})),/duplicate artifact purpose/u);
  // All downstream reservation/readiness keys use purpose alone; capability
  // cannot distinguish two demands that share the same purpose.
  assert.throws(()=>admitMediaNeed(need({artifacts:[
    {capability:"image-generation",purpose:"social-outbound"},
    {capability:"source-grounded-short-video",purpose:"social-outbound"},
  ]})),/duplicate artifact purpose/u);
});

test("frontier never turns provider capacity into demand and keeps unsettled conditions blocked",()=>{
  const rows=mediaDemandFrontier([need()],{
    receivers:{"ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA":true},
    readiness:{"ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA#short-form-discovery":true},
    now:new Date("2026-10-04T18:00:00Z"),
  });
  assert.equal(rows.find(r=>r.purpose==="social-outbound").state,"admissible");
  assert.equal(rows.find(r=>r.purpose==="short-form-discovery").state,"admissible");
  assert.equal(rows.find(r=>r.purpose==="daily-feature").state,"blocked");
});

test("known-price work shares perishable capacity by explicit priority then fairness",()=>{
  const another=need({
    id:"ni:///sha-256;BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
    consumer:"education",
    artifacts:[{capability:"image-generation",purpose:"lesson-social",priority:100,disposition:"admissible",wanted:2}],
  });
  const plan=planMediaAllowance({
    available:3,
    costs:{"image-generation":1},
    needs:[need(),another],
    receivers:{"ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA":true,"ni:///sha-256;BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB":true},
    served:{"koios-news-services-section\0image-generation":4,"education\0image-generation":0},
  });
  assert.equal(plan.allocated,3);
  assert.deepEqual(Object.fromEntries(plan.grants.map(g=>[g.consumer,g.draws])),{
    education:2,
    "koios-news-services-section":1,
  });
  assert.equal(plan.probe,null);
});

test("unknown-price native Short yields at most one explicit probe when permitted",()=>{
  const other=need({
    id:"ni:///sha-256;CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
    consumer:"education",
    artifacts:[{capability:"source-grounded-short-video",purpose:"lesson-short",priority:80,disposition:"admissible"}],
  });
  const readiness={
    "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA#short-form-discovery":true,
  };
  const plan=planMediaAllowance({
    available:4,
    costs:{"source-grounded-short-video":null},
    needs:[need(),other],
    receivers:{"ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA":true,"ni:///sha-256;CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC":true},
    readiness,
    allowProbe:true,
  });
  assert.equal(plan.grants.length,0);
  assert.equal(plan.probe.consumer,"education");
  assert.equal(plan.probe.purpose,"lesson-short");
  assert.equal(plan.unknown.length,2);
});

test("expired demand cannot consume allowance",()=>{
  const expired=need({expiresAt:"2026-10-04T17:30:00.000Z"});
  const plan=planMediaAllowance({
    available:10,
    costs:{"image-generation":1},
    needs:[expired],
    receivers:{"ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA":true},
    now:new Date("2026-10-04T18:00:00Z"),
  });
  assert.equal(plan.allocated,0);
  assert.ok(plan.blocked.every(row=>row.state==="expired"));
});

test("a capability absent from an allowance is unsupported, never an unknown-price probe",()=>{
  const plan=planMediaAllowance({
    available:5,
    costs:{"image-generation":1},
    needs:[need()],
    receivers:{"ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA":true},
    readiness:{"ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA#short-form-discovery":true},
    allowProbe:true,
  });
  assert.equal(plan.probe,null);
  assert.ok(plan.unsupported.some(row=>row.purpose==="short-form-discovery"));
});

test("receiver readiness is a separate house gate before any artifact can draw capacity",()=>{
  const frontier=mediaDemandFrontier([need()],{now:new Date("2026-10-04T18:00:00Z")});
  assert.ok(frontier.every(row=>row.state==="blocked"));
  assert.ok(frontier.every(row=>row.reason==="receiver-readiness-unsettled"));

  const plan=planMediaAllowance({
    available:5,
    costs:{"image-generation":1},
    needs:[need()],
  });
  assert.equal(plan.allocated,0);
  assert.equal(plan.grants.length,0);
  assert.equal(plan.probe,null);
});

test("zero-credit provider work stays bounded by admitted demand without consuming allowance",()=>{
  const id="ni:///sha-256;DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD";
  const freeNeed=need({
    id,
    consumer:"koios-news-services-section",
    artifacts:[{capability:"image-generation",purpose:"social-outbound",priority:100,disposition:"admissible",wanted:2}],
  });
  const plan=planMediaAllowance({
    available:7,
    costs:{"image-generation":0},
    needs:[freeNeed],
    receivers:{[id]:true},
  });
  assert.equal(plan.allocated,0);
  assert.equal(plan.unallocated,7);
  assert.deepEqual(plan.free,[{
    mediaNeed:id,
    consumer:"koios-news-services-section",
    capability:"image-generation",
    purpose:"social-outbound",
    draws:2,
    units:0,
  }]);
});

test("GitHub issue projections cannot acquire production eligibility by readiness alone",()=>{
  const unverified=need({intake:{state:"proposed-unverified",source:"github-issue"}});
  const rows=mediaDemandFrontier([unverified],{
    receivers:{[unverified.id]:true},
    readiness:{[unverified.id+"#short-form-discovery"]:true,[unverified.id+"#daily-feature"]:true}
  });
  assert.ok(rows.every(row=>row.state==="blocked"&&row.reason==="source-proposal-not-admitted"));
});
