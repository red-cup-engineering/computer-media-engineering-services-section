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
    async postBluesky({stories}){posts+=1;lastRkey=stories[0].rkey;assert.equal(stories[0].image.sanitized,true);return {status:"ok",did:"did:plc:abc",cid:"bafyreireceived",uri:`at://did:plc:abc/app.bsky.feed.post/${lastRkey}`,posts:[{status:"ok"}]};},
    async observeBlueskyPost({uri,cid,did,text,url,imageAlt}){
      assert.equal(uri,`at://did:plc:abc/app.bsky.feed.post/${lastRkey}`);
      assert.equal(cid,"bafyreireceived");assert.equal(did,"did:plc:abc");
      assert.match(text,/koios\.news/u);assert.equal(url,"https://koios.news/posts/story/");
      assert.match(imageAlt,/abstract editorial/u);
      return {status:"verified",uri,cid,did,source:"bluesky-appview-public-getPostThread"};
    },
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
  const result=await publishAcceptedMedia({root,social:{BLUESKY_DETERMINISTIC_RKEY:true,postBluesky:async()=>{throw new Error("must not publish rejected media");},observeBlueskyPost:async()=>{throw new Error("must not observe rejected media");}},flow:{flowMediaInventory(){return {artifacts:[]};},recordFlowDelivery(){throw new Error("must not deliver");}},now:new Date("2026-10-04T18:20:00Z")});
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
    social:{BLUESKY_DETERMINISTIC_RKEY:true,async postBluesky(){posts+=1;return {status:"ok",uri:"at://unexpected",posts:[{status:"ok"}]};},observeBlueskyPost:async()=>{throw new Error("must not observe mismatched lineage");}},
    flow:{
      flowMediaInventory(){return {artifacts:[{completionId:"completion-1",allocation:"some-other-allocation",mediaNeed:"wrong",purpose:"social-outbound"}]};},
      recordFlowDelivery(){throw new Error("must not deliver mismatched provider lineage");},
    },
    now:new Date("2026-10-04T18:20:00Z"),
  });
  assert.equal(posts,0);
  assert.equal(result.obstructions[0].reason,"provider-completion-lineage-mismatch");
  assert.equal(result.status,"held");
  assert.equal(readMediaAllocationStates({root})[0].state,"generated");
});


test("provider acknowledgement remains delivered pending independently verified public readback",async t=>{
  const root=mkdtempSync(join(tmpdir(),"accepted-receiving-"));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  setup(root);
  let attempted=0,created=0,publicReads=0,flowDelivery=0,originalRkey;
  const social={
    BLUESKY_DETERMINISTIC_RKEY:true,
    async postBluesky({stories}){
      attempted++;
      const key=stories[0].rkey;
      if(!originalRkey){originalRkey=key;created++;}
      assert.equal(key,originalRkey,"same allocation always uses same provider key");
      return {status:"ok",did:"did:plc:abc",cid:"bafyreirecord",
        uri:"at://did:plc:abc/app.bsky.feed.post/"+key,
        posts:[{status:"ok",recovered:attempted>1}]};
    },
    async observeBlueskyPost({uri,cid,did}){
      publicReads++;
      if(publicReads===1)return {status:"held",reason:"public-appview-http-404"};
      return {status:"verified",uri,cid,did,source:"bluesky-appview-public-getPostThread"};
    },
  };
  const flow={
    flowMediaInventory(){return {artifacts:[{
      completionId:"completion-1",allocation:"alloc-publish",
      mediaNeed:readMediaAllocationStates({root})[0].mediaNeed,purpose:"social-outbound",
    }]};},
    recordFlowDelivery(input){flowDelivery++;return {id:"delivery-"+flowDelivery,...input};},
  };
  const args={root,social,flow,env:{BLUESKY_APP_PASSWORD:"secret"}};
  const first=await publishAcceptedMedia({...args,now:new Date("2026-10-04T18:20:00Z")});
  assert.equal(first.published.length,0,"provider create is not received public use");
  assert.equal(first.status,"held","unwitnessed post may not settle the publication scan");
  assert.equal(flowDelivery,0);
  assert.equal(readMediaAllocationStates({root})[0].state,"delivered");
  assert.match(first.obstructions[0].reason,/public-readback-not-received/u);
  const second=await publishAcceptedMedia({...args,now:new Date("2026-10-04T18:21:00Z")});
  assert.equal(second.published.length,1);
  assert.equal(second.status,"complete","read-back and Flow receipt now settle the scan");
  assert.equal(second.published[0].cid,"bafyreirecord");
  assert.equal(second.published[0].recovered,true);
  assert.equal(second.published[0].publicReadback,"bluesky-appview-public-getPostThread");
  assert.equal(readMediaAllocationStates({root})[0].state,"public-use");
  assert.equal(created,1,"two client attempts remain one deterministic provider post");
  assert.equal(attempted,2);
  assert.equal(flowDelivery,1);
  const third=await publishAcceptedMedia({...args,now:new Date("2026-10-04T18:22:00Z")});
  assert.equal(third.published.length,0);
  assert.equal(attempted,2);
});

test("media publisher refuses missing public-readback adapter before remote posting",async t=>{
  const root=mkdtempSync(join(tmpdir(),"accepted-readback-held-"));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  setup(root);
  let attempts=0;
  const result=await publishAcceptedMedia({
    root,now:new Date("2026-10-04T18:20:00Z"),
    social:{BLUESKY_DETERMINISTIC_RKEY:true,async postBluesky(){attempts++;}},
    flow:{flowMediaInventory(){return {artifacts:[]};},recordFlowDelivery(){}},
  });
  assert.equal(result.status,"blocked");
  assert.equal(result.reason,"public-bluesky-readback-adapter-not-released");
  assert.equal(attempts,0);
  assert.equal(readMediaAllocationStates({root})[0].state,"generated");
});
