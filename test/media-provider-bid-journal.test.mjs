import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createMediaNeed,recordMediaNeed,recordMediaReadiness,readMediaDemandInbox,recordMediaAllocationState} from "../src/media-demand-journal.mjs";
import {recordMediaProviderBid,readMediaProviderBids,recordAwardedMediaBid} from "../src/media-provider-bid-journal.mjs";

test("competing image providers can bid; no provider can fabricate an award without the sealed coordinator",t=>{
  const root=mkdtempSync(join(tmpdir(),"media-auction-"));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const need=createMediaNeed({type:"MediaNeed",version:1,consumer:"causeway-news",
    objective:"one verified story social asset",openedAt:"2026-10-04T12:00:00Z",
    artifacts:[{capability:"image-generation",purpose:"story-social",wanted:1,priority:100,disposition:"admissible"}]});
  recordMediaNeed({root,need});
  recordMediaReadiness({root,mediaNeed:need.id,ready:true,authority:"causeway-news-editor",
    basis:"destination, reuse and rights checked by receiver",at:"2026-10-04T12:10:00Z"});
  const makeBid=(id,provider)=>({type:"MediaProviderBid",version:1,id,provider,
    offerRef:"https://social.example/actor/"+provider+"/offers/"+id,mediaNeed:need.id,
    capability:"image-generation",purpose:"story-social",quantity:1,
    createdAt:"2026-10-05T12:00:00Z",expiresAt:"2026-10-06T12:00:00Z",
    consideration:{state:"no-charge"},deliverable:"one PNG with alt text"});
  const a=makeBid("urn:bid:chatgpt-web","chatgpt-web");
  const b=makeBid("urn:bid:other-image-provider","another-provider");
  assert.equal(recordMediaProviderBid({root,bid:a}).status,"RECORDED_UNAWARDED");
  assert.equal(recordMediaProviderBid({root,bid:b}).status,"RECORDED_UNAWARDED");
  assert.equal(readMediaProviderBids({root,mediaNeed:need.id}).length,2);
  const award={type:"MediaCustomerAward",version:1,bid:a.id,mediaNeed:need.id,purpose:"story-social",
    customer:need.consumer,provider:a.provider,quantity:1,
    decidedAt:"2026-10-05T12:30:00Z",decisionRef:"ni:///sha-256;customer-choice",
    offerWitnessRef:"ni:///sha-256;provider-offer-witness"};
  const unverified=recordAwardedMediaBid({root,award,now:new Date("2026-10-05T13:00:00Z")});
  assert.equal(unverified.status,"REFUSED");
  assert.equal(readMediaDemandInbox({root,now:new Date("2026-10-05T13:00:00Z")}).needs[0].artifacts[0].wanted,1);
  // Legacy caller-controlled booleans cannot authenticate any consumer or
  // safely reserve work. A failed award leaves demand available to other
  // providers and has not written an allocation.
  const forged=recordAwardedMediaBid({root,award,now:new Date("2026-10-05T13:00:00Z"),
    customerAuthorized:true,offerWitnessVerified:true});
  assert.equal(forged.status,"REFUSED");
  assert.ok(forged.reasons.includes("sealed-reservation-and-independent-actor-verification-required"));
  assert.equal(forged.reservationWritten,false);
  let inbox=readMediaDemandInbox({root,now:new Date("2026-10-05T13:05:00Z")});
  assert.equal(inbox.needs[0].artifacts[0].wanted,1);
  assert.equal(inbox.allocations.length,0);
  assert.equal(forged.claim.bid,a.id);
  assert.equal(forged.claim.customerDecisionRef,award.decisionRef);
  assert.equal(forged.claim.count,1);
});
