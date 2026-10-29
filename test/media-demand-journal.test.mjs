import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createMediaNeed,
  planMediaDemandInbox,
  readMediaDemandInbox,
  readMediaArtifactReviews,
  recordMediaAllocationState,
  recordMediaArtifactReview,
  recordMediaNeed,
  recordMediaReadiness,
} from "../src/media-demand-journal.mjs";

const need = (overrides = {}) => createMediaNeed({
  type: "MediaNeed",
  version: 1,
  consumer: "koios-news-services-section",
  objective: "extend one accepted article onto outbound media surfaces",
  openedAt: "2026-10-04T18:00:00.000Z",
  source: { publicAddress: "https://koios.news/posts/example/" },
  artifacts: [
    {
      capability: "image-generation",
      purpose: "social-outbound",
      priority: 100,
      disposition: "conditional",
      condition: "Bluesky receiver exists",
      preferredAspects: ["1:1", "16:9"],
    },
    {
      capability: "source-grounded-short-video",
      purpose: "short-form-discovery",
      priority: 70,
      disposition: "conditional",
      condition: "Short destination exists",
    },
  ],
  ...overrides,
});

test("shared media need admission is stable and preserves consumer brief extensions", t => {
  const root = mkdtempSync(join(tmpdir(), "media-inbox-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const value = need();
  assert.equal(value.id, need().id);
  assert.deepEqual(value.artifacts[0].preferredAspects, ["1:1", "16:9"]);
  const first = recordMediaNeed({ root, need: value });
  const replay = recordMediaNeed({ root, need: value });
  assert.equal(first.mediaNeed, value.id);
  assert.equal(first.appended, 1);
  assert.equal(replay.appended, 0);
});

test("receiver and artifact readiness are independent and latest evidence controls the frontier", t => {
  const root = mkdtempSync(join(tmpdir(), "media-inbox-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const value = need();
  recordMediaNeed({ root, need: value });

  let inbox = readMediaDemandInbox({ root, now: new Date("2026-10-04T18:01:00Z") });
  assert.ok(inbox.frontier.every((row) => row.reason === "receiver-readiness-unsettled"));

  recordMediaReadiness({
    root, mediaNeed: value.id, scope: "receiver", ready: true,
    authority: "causeway-public-media", basis: "Koios is an admitted generated-media receiver",
    at: "2026-10-04T18:02:00Z",
  });
  recordMediaReadiness({
    root, mediaNeed: value.id, scope: "artifact", purpose: "social-outbound", ready: true,
    authority: "koios-news-service-section",
    basis: "koiosnews.bsky.social is configured as the outbound social receiver",
    destination: "https://bsky.app/profile/koiosnews.bsky.social",
    at: "2026-10-04T18:03:00Z",
  });
  inbox = readMediaDemandInbox({ root, now: new Date("2026-10-04T18:04:00Z") });
  assert.equal(inbox.frontier.find((row) => row.purpose === "social-outbound").state, "admissible");
  assert.equal(inbox.frontier.find((row) => row.purpose === "short-form-discovery").state, "blocked");

  recordMediaReadiness({
    root, mediaNeed: value.id, scope: "artifact", purpose: "social-outbound", ready: false,
    authority: "koios-news-service-section",
    basis: "receiver temporarily withdrew outbound media demand",
    at: "2026-10-04T18:05:00Z",
  });
  inbox = readMediaDemandInbox({ root, now: new Date("2026-10-04T18:06:00Z") });
  assert.equal(inbox.frontier.find((row) => row.purpose === "social-outbound").state, "blocked");
});

test("live allocation reserves wanted work, release reopens it, and public-use fulfills it", t => {
  const root = mkdtempSync(join(tmpdir(), "media-inbox-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const value = need({ artifacts: [{
    capability: "image-generation", purpose: "social-outbound", priority: 100,
    disposition: "admissible", wanted: 1,
  }] });
  recordMediaNeed({ root, need: value });
  recordMediaReadiness({
    root, mediaNeed: value.id, ready: true, authority: "causeway-public-media",
    basis: "receiver is ready", at: "2026-10-04T18:01:00Z",
  });

  recordMediaAllocationState({
    root, allocation: "alloc-1", mediaNeed: value.id, purpose: "social-outbound",
    provider: "google-flow", state: "held", at: "2026-10-04T18:02:00Z",
  });
  let inbox = readMediaDemandInbox({ root, now: new Date("2026-10-04T18:03:00Z") });
  assert.equal(inbox.needs[0].artifacts[0].wanted, 0);
  assert.equal(inbox.counts.liveAllocations, 1);

  recordMediaAllocationState({
    root, allocation: "alloc-1", mediaNeed: value.id, purpose: "social-outbound",
    provider: "google-flow", state: "released", at: "2026-10-04T18:04:00Z",
  });
  inbox = readMediaDemandInbox({ root, now: new Date("2026-10-04T18:05:00Z") });
  assert.equal(inbox.needs[0].artifacts[0].wanted, 1);

  recordMediaAllocationState({
    root, allocation: "alloc-2", mediaNeed: value.id, purpose: "social-outbound",
    provider: "google-flow", state: "held", at: "2026-10-04T18:06:00Z",
  });
  recordMediaAllocationState({
    root, allocation: "alloc-2", mediaNeed: value.id, purpose: "social-outbound",
    provider: "google-flow", state: "generated", receipt: "ni:///sha-256;generated",
    at: "2026-10-04T18:07:00Z",
  });
  recordMediaAllocationState({
    root, allocation: "alloc-2", mediaNeed: value.id, purpose: "social-outbound",
    provider: "google-flow", state: "delivered", receipt: "ni:///sha-256;delivered",
    at: "2026-10-04T18:08:00Z",
  });
  recordMediaAllocationState({
    root, allocation: "alloc-2", mediaNeed: value.id, purpose: "social-outbound",
    provider: "google-flow", state: "public-use", receipt: "https://bsky.app/profile/koiosnews.bsky.social/post/example",
    at: "2026-10-04T18:09:00Z",
  });
  inbox = readMediaDemandInbox({ root, now: new Date("2026-10-04T18:10:00Z") });
  assert.equal(inbox.needs[0].artifacts[0].wanted, 0);
  assert.equal(inbox.counts.fulfilledAllocations, 1);
  assert.throws(() => recordMediaAllocationState({
    root, allocation: "alloc-2", mediaNeed: value.id, purpose: "social-outbound",
    provider: "google-flow", state: "released", at: "2026-10-04T18:11:00Z",
  }), /terminal/u);
});

test("planning from shared demand sees zero-credit Flow images as bounded free work", t => {
  const root = mkdtempSync(join(tmpdir(), "media-inbox-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const value = need({ artifacts: [{
    capability: "image-generation", purpose: "social-outbound", priority: 100,
    disposition: "admissible", wanted: 2,
  }] });
  recordMediaNeed({ root, need: value });
  recordMediaReadiness({
    root, mediaNeed: value.id, ready: true, authority: "causeway-public-media",
    basis: "receiver is ready", at: "2026-10-04T18:01:00Z",
  });
  const plan = planMediaDemandInbox({
    root, available: 50, costs: { "image-generation": 0 },
    now: new Date("2026-10-04T18:02:00Z"),
  });
  assert.equal(plan.allocated, 0);
  assert.equal(plan.unallocated, 50);
  assert.equal(plan.free.length, 1);
  assert.equal(plan.free[0].draws, 2);
  assert.equal(plan.free[0].mediaNeed, value.id);
});


test("artifact review only accepts generated custody and requires sanitized accessible-media metadata",t=>{
  const root=mkdtempSync(join(tmpdir(),"media-review-"));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const common={root,allocation:"alloc-review",mediaNeed:"need-review",purpose:"social-outbound",count:1,provider:"urn:ame:google-flow"};
  recordMediaAllocationState({...common,state:"held",at:"2026-10-04T18:00:00Z",receipt:"queue"});
  assert.throws(()=>recordMediaArtifactReview({
    root,allocation:"alloc-review",completionId:"completion",accepted:true,authority:"reviewer",basis:"looks right",at:"2026-10-04T18:01:00Z",
    asset:{relativePath:"media/accepted/a.jpg",sha256:"a".repeat(64),mimeType:"image/jpeg",width:1200,height:675,metadataSanitized:true,altText:"Alt"},
    distribution:{channel:"bluesky",handle:"koiosnews.bsky.social",text:"Story",url:"https://koios.news/posts/story/"},
  }),/generated or delivered/u);
  recordMediaAllocationState({...common,state:"generated",at:"2026-10-04T18:02:00Z",receipt:"completion"});
  assert.throws(()=>recordMediaArtifactReview({
    root,allocation:"alloc-review",completionId:"completion",accepted:true,authority:"reviewer",basis:"looks right",at:"2026-10-04T18:03:00Z",
    asset:{relativePath:"media/accepted/a.jpg",sha256:"a".repeat(64),mimeType:"image/jpeg",width:1200,height:675,metadataSanitized:false,altText:"Alt"},
    distribution:{channel:"bluesky",handle:"koiosnews.bsky.social",text:"Story",url:"https://koios.news/posts/story/"},
  }),/metadataSanitized/u);
  const receipt=recordMediaArtifactReview({
    root,allocation:"alloc-review",completionId:"completion",accepted:true,authority:"reviewer",basis:"abstract image matches accepted brief",at:"2026-10-04T18:04:00Z",
    asset:{relativePath:"media/accepted/a.jpg",sha256:"a".repeat(64),mimeType:"image/jpeg",width:1200,height:675,metadataSanitized:true,altText:"Royal-blue abstract editorial illustration."},
    distribution:{channel:"bluesky",handle:"koiosnews.bsky.social",text:"Story\n\nhttps://koios.news/posts/story/",url:"https://koios.news/posts/story/"},
  });
  assert.equal(receipt.appended,1);
  assert.equal(readMediaArtifactReviews({root,accepted:true})[0].allocation,"alloc-review");
});
