import test from "node:test";
import assert from "node:assert/strict";
import {admitMediaProviderBid,admitMediaCustomerAward,evaluateMediaAward,prepareMediaAwardReservation} from "../src/media-provider-bid-contract.mjs";
const now="2026-10-12T20:00:00Z";
const bid=()=>({type:"MediaProviderBid",version:1,id:"ni:///sha-256;bid",provider:"@chatgpt-web.561.group",
  offerRef:"https://actors.561.group/outbox/offer-1",mediaNeed:"ni:///sha-256;need",purpose:"social-cover",
  capability:"image-generation",quantity:1,createdAt:"2026-10-12T19:00:00Z",expiresAt:"2026-10-13T19:00:00Z",
  consideration:{state:"no-charge"},deliverable:"text-free PNG component, 1:1"});
const award=()=>({type:"MediaCustomerAward",version:1,bid:"ni:///sha-256;bid",mediaNeed:"ni:///sha-256;need",
  purpose:"social-cover",customer:"causeway-news",provider:"@chatgpt-web.561.group",quantity:1,
  decidedAt:"2026-10-12T19:30:00Z",decisionRef:"ni:///sha-256;decision",offerWitnessRef:"ni:///sha-256;offer-observation"});
const inbox=()=>({needs:[{id:"ni:///sha-256;need",consumer:"causeway-news",artifacts:[{purpose:"social-cover",capability:"image-generation"}]}],
  frontier:[{need:"ni:///sha-256;need",purpose:"social-cover",state:"admissible",wanted:1}],allocations:[]});
test("a customer award may reserve but never implies image acceptance",()=>{
  const result=evaluateMediaAward({inbox:inbox(),bid:bid(),award:award(),now});
  assert.equal(result.eligible,true);
  assert.match(result.postcondition,/never automatic acceptance/u);
});
test("provider cannot self-award, mutate capability, outbid remaining demand or replay",()=>{
  const i=inbox(),self=award();self.customer="@chatgpt-web.561.group";
  assert.ok(evaluateMediaAward({inbox:i,bid:bid(),award:self,now}).reasons.includes("award-not-from-consuming-enterprise"));
  const wrong=bid();wrong.capability="audio-production";
  assert.ok(evaluateMediaAward({inbox:i,bid:wrong,award:award(),now}).reasons.includes("bid-capability-mismatch"));
  i.frontier[0].wanted=0;
  assert.ok(evaluateMediaAward({inbox:i,bid:bid(),award:award(),now}).reasons.includes("quantity-exceeds-unreserved-demand"));
  i.frontier[0].wanted=1;i.allocations.push({bid:bid().id,state:"generated"});
  assert.ok(evaluateMediaAward({inbox:i,bid:bid(),award:award(),now}).reasons.includes("bid-already-reserved-or-fulfilled"));
});
test("missing readiness and expired offers are refused",()=>{
  const i=inbox();i.frontier[0].state="blocked";
  assert.ok(evaluateMediaAward({inbox:i,bid:bid(),award:award(),now}).reasons.includes("frontier-blocked"));
  const b=bid();b.expiresAt="2026-10-12T19:15:00Z";
  assert.ok(evaluateMediaAward({inbox:inbox(),bid:b,award:award(),now}).reasons.includes("bid-expired"));
  assert.ok(evaluateMediaAward({inbox:undefined,bid:bid(),award:award(),now}).reasons.includes("demand-inbox-not-observed"));
});
test("unknown consideration never means free; quoted terms must match exactly",()=>{
  const b=bid();b.consideration={state:"unknown"};
  assert.ok(evaluateMediaAward({inbox:inbox(),bid:b,award:award(),now}).reasons.includes("consideration-unknown"));
  b.consideration={state:"quoted",termsRef:"ni:///sha-256;exact-terms"};
  assert.ok(evaluateMediaAward({inbox:inbox(),bid:b,award:award(),now}).reasons.includes("terms-not-accepted-exactly"));
  const a=award();a.termsAcceptanceRef="ni:///sha-256;exact-terms";
  assert.equal(evaluateMediaAward({inbox:inbox(),bid:b,award:a,now}).eligible,true);
});
test("invalid bids and awards fail before allocation",()=>{
  assert.throws(()=>admitMediaProviderBid({...bid(),quantity:0}),/bid quantity/u);
  assert.throws(()=>admitMediaProviderBid({...bid(),expiresAt:"2026-10-12T18:00:00Z"}),/expiresAt/u);
  assert.throws(()=>admitMediaCustomerAward({...award(),decisionRef:""}),/decision evidence/u);
});

test("Hoare plan carries exact demand and provider terms but cannot claim a held allocation",()=>{
  const observed=inbox();
  observed.observedAt="2026-10-12T19:45:00Z";
  const prepared=prepareMediaAwardReservation({inbox:observed,bid:bid(),award:award(),now});
  assert.equal(prepared.status,"PREPARED_NOT_RESERVED");
  assert.equal(prepared.claim.mediaNeed,bid().mediaNeed);
  assert.equal(prepared.claim.offerRef,bid().offerRef);
  assert.equal(prepared.claim.customerDecisionRef,award().decisionRef);
  assert.equal(prepared.claim.observedUnreserved,1);
  assert.ok(prepared.requiredExternalWitnesses.some(s=>s.includes("compare-and-swap")));
  assert.equal(observed.allocations.length,0);
  const missing=prepareMediaAwardReservation({inbox:undefined,bid:bid(),award:award(),now});
  assert.equal(missing.status,"REFUSED_PRECONDITION");
  assert.deepEqual(missing.reasons,["demand-inbox-not-observed"]);
});
