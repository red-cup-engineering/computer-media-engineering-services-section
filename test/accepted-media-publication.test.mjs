import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { blueskyTid, publishAcceptedMedia } from "../src/accepted-media-publication.mjs";
import {
  readMediaAllocationStates, readMediaDemandInbox, recordMediaAllocationState, recordMediaArtifactReview, recordMediaNeed,
} from "../src/media-demand-journal.mjs";

function setup(root,{accepted=true}={}){
  const need=recordMediaNeed({root,need:{
    type:"MediaNeed",version:1,consumer:"koios-news-services-section",objective:"social companion",openedAt:"2026-10-04T18:00:00.000Z",
    source:{title:"A story",publicAddress:"https://koios.news/posts/story/"},
    artifacts:[{capability:"image-generation",purpose:"social-outbound",priority:100,wanted:1,disposition:"admissible",destination:"https://bsky.app/profile/koiosnews.bsky.social"}],
  }}).need;
  const common={root,allocation:"alloc-publish",mediaNeed:need.id,purpose:"social-outbound",count:1,provider:"urn:ame:google-flow"};
  recordMediaAllocationState({...common,state:"held",at:"2026-10-04T18:01:00Z",receipt:"queue"});
  recordMediaAllocationState({...common,state:"generated",at:"2026-10-04T18:02:00Z",receipt:"completion-1"});
  const bytes=Buffer.from("sanitized-reviewed-image");
  const relativePath="media/accepted/story.jpg";
  mkdirSync(join(root,"media","accepted"),{recursive:true});
  writeFileSync(join(root,relativePath),bytes);
  recordMediaArtifactReview({
    root,allocation:"alloc-publish",completionId:"completion-1",accepted,authority:"causeway-media-visual-review",
    basis:accepted?"matches the consumer brief":"contains misleading documentary-looking detail",at:"2026-10-04T18:10:00Z",
    ...(accepted?{
      asset:{relativePath,sha256:createHash("sha256").update(bytes).digest("hex"),mimeType:"image/jpeg",width:1200,height:675,metadataSanitized:true,altText:"Royal-blue abstract editorial illustration."},
      distribution:{channel:"bluesky",handle:"koiosnews.bsky.social",text:"A story\n\nhttps://koios.news/posts/story/",url:"https://koios.news/posts/story/"},
    }:{}),
  });
  return need;
}

test("derived Bluesky TID is stable and syntactically valid",()=>{
  const one=blueskyTid({at:"2026-10-04T18:10:00Z",salt:"alloc-publish"});
  const two=blueskyTid({at:"2026-10-04T18:10:00Z",salt:"alloc-publish"});
  assert.equal(one,two);
  assert.match(one,/^[234567abcdefghij][234567abcdefghijklmnopqrstuvwxyz]{12}$/u);
});

test("accepted media publishes once and closes Flow/shared custody at public use",async t=>{
  const root=mkdtempSync(join(tmpdir(),"accepted-publish-"));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  setup(root);
  let posts=0,deliveries=0,lastRkey;
  const social={
    BLUESKY_DETERMINISTIC_RKEY:true,
    async postBluesky({stories}){posts+=1;lastRkey=stories[0].rkey;assert.equal(stories[0].image.sanitized,true);return {status:"ok",uri:`at://did:plc:abc/app.bsky.feed.post/${lastRkey}`,posts:[{status:"ok"}]};},
  };
  const flow={
    flowMediaInventory(){return {artifacts:[{completionId:"completion-1",allocation:"alloc-publish",mediaNeed:readMediaAllocationStates({root})[0].mediaNeed,purpose:"social-outbound"}]};},
    recordFlowDelivery(input){deliveries+=1;assert.equal(input.completionId,"completion-1");assert.equal(input.destination,"https://bsky.app/profile/koiosnews.bsky.social");return {id:"delivery-1",...input};},
  };
  const first=await publishAcceptedMedia({root,social,flow,env:{BLUESKY_APP_PASSWORD:"secret"},fetch:async()=>{throw new Error("fake social consumes no fetch");},now:new Date("2026-10-04T18:20:00Z")});
  assert.equal(first.published.length,1);
  assert.equal(posts,1);assert.equal(deliveries,1);
  assert.equal(first.published[0].publicAddress,`https://bsky.app/profile/koiosnews.bsky.social/post/${lastRkey}`);
  assert.equal(readMediaAllocationStates({root})[0].state,"public-use");
  const second=await publishAcceptedMedia({root,social,flow,env:{BLUESKY_APP_PASSWORD:"secret"},now:new Date("2026-10-04T18:30:00Z")});
  assert.equal(second.published.length,0);
  assert.equal(posts,1);assert.equal(deliveries,1);
});

test("rejected review releases allocation so the consumer demand becomes live again",async t=>{
  const root=mkdtempSync(join(tmpdir(),"accepted-publish-"));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  setup(root,{accepted:false});
  const result=await publishAcceptedMedia({root,social:{BLUESKY_DETERMINISTIC_RKEY:true,postBluesky:async()=>{throw new Error("must not publish rejected media");}},flow:{flowMediaInventory(){return {artifacts:[]};},recordFlowDelivery(){throw new Error("must not deliver");}},now:new Date("2026-10-04T18:20:00Z")});
  assert.equal(result.released.length,1);
  assert.equal(readMediaAllocationStates({root})[0].state,"released");
  assert.equal(readMediaDemandInbox({root,now:new Date("2026-10-04T18:21:00Z")}).needs[0].artifacts[0].wanted,1);
});


test("accepted media refuses publication when the reviewed completion does not belong to the allocation",async t=>{
  const root=mkdtempSync(join(tmpdir(),"accepted-publish-"));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  setup(root);
  let posts=0;
  const result=await publishAcceptedMedia({
    root,
    social:{BLUESKY_DETERMINISTIC_RKEY:true,async postBluesky(){posts+=1;return {status:"ok",uri:"at://unexpected",posts:[{status:"ok"}]};}},
    flow:{
      flowMediaInventory(){return {artifacts:[{completionId:"completion-1",allocation:"some-other-allocation",mediaNeed:"wrong",purpose:"social-outbound"}]};},
      recordFlowDelivery(){throw new Error("must not deliver mismatched provider lineage");},
    },
    now:new Date("2026-10-04T18:20:00Z"),
  });
  assert.equal(posts,0);
  assert.equal(result.obstructions[0].reason,"provider-completion-lineage-mismatch");
  assert.equal(readMediaAllocationStates({root})[0].state,"generated");
});
