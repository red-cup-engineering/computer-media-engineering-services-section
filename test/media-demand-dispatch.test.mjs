import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { dispatchFreeFlowMediaDemand } from "../src/media-demand-dispatch.mjs";
import { readMediaDemandInbox, recordMediaNeed, recordMediaReadiness } from "../src/media-demand-journal.mjs";

function opened(root, { priority = 100, title = "Story" } = {}) {
  const need={
    type:"MediaNeed",version:1,consumer:"koios-news-services-section",
    objective:"outbound social companion",openedAt:"2026-10-04T18:20:00.000Z",
    source:{title,publicAddress:"https://koios.news/posts/story/"},
    artifacts:[{
      capability:"image-generation",purpose:"social-outbound",priority,wanted:1,disposition:"conditional",
      condition:"receiver exists",destination:"https://bsky.app/profile/koiosnews.bsky.social",
      preferredAspects:["16:9","1:1"],
      generation:{prompt:`Royal-blue abstract editorial illustration for ${title}.`},
    }],
  };
  const receipt=recordMediaNeed({root,need});
  recordMediaReadiness({
    root,mediaNeed:receipt.mediaNeed,scope:"receiver",ready:true,authority:"causeway-public-media",
    basis:"receiver cleared",at:"2026-10-04T18:21:00.000Z",
  });
  recordMediaReadiness({
    root,mediaNeed:receipt.mediaNeed,scope:"artifact",purpose:"social-outbound",ready:true,
    authority:"koios-news-service-section",basis:"Bluesky route cleared",
    destination:"https://bsky.app/profile/koiosnews.bsky.social",at:"2026-10-04T18:22:00.000Z",
  });
  return receipt.mediaNeed;
}

test("dispatcher queues receiver-ready free Flow image demand once and reserves it",async t=>{
  const root=mkdtempSync(join(tmpdir(),"media-dispatch-"));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const mediaNeed=opened(root);
  const queued=[];
  const seen=new Set();
  const flow={
    async flowMediaOffer(){return {
      provider:"urn:ame:google-flow",balance:1050,renewsAt:"2026-11-03T07:00:00.000Z",
      capabilities:{"image-generation":{capability:"image-generation",medium:"image",units:0,model:"GEM_PIX_2",supportedAspects:["1:1","16:9"]}},
    };},
    queueFlowOrderOnce(lines){
      const line=lines[0];
      if(seen.has(line.allocation)) return {queued:0,path:null,allocations:[],duplicates:[line.allocation]};
      seen.add(line.allocation);queued.push(line);
      return {queued:line.count,path:"/state/orders/pending/test.jsonl",allocations:[line.allocation],duplicates:[]};
    },
  };
  const first=await dispatchFreeFlowMediaDemand({root,flow,now:new Date("2026-10-04T18:30:00Z")});
  assert.equal(first.status,"complete");
  assert.equal(first.dispatched.length,1);
  assert.equal(first.dispatched[0].mediaNeed,mediaNeed);
  assert.equal(queued[0].model,"GEM_PIX_2");
  assert.equal(queued[0].aspect,"16:9");
  assert.equal(queued[0].destination,"https://bsky.app/profile/koiosnews.bsky.social");
  assert.match(queued[0].prompt,/Royal-blue/u);
  let inbox=readMediaDemandInbox({root,now:new Date("2026-10-04T18:31:00Z")});
  assert.equal(inbox.needs[0].artifacts[0].wanted,0);
  assert.equal(inbox.counts.liveAllocations,1);
  const second=await dispatchFreeFlowMediaDemand({root,flow,now:new Date("2026-10-04T18:32:00Z")});
  assert.equal(second.dispatched.length,0);
  assert.equal(queued.length,1);
});

test("dispatcher fails closed until Flow exposes allocation-idempotent custody",async t=>{
  const root=mkdtempSync(join(tmpdir(),"media-dispatch-"));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  opened(root);
  const result=await dispatchFreeFlowMediaDemand({root,flow:{},now:new Date("2026-10-04T18:30:00Z")});
  assert.equal(result.status,"blocked");
  assert.equal(result.reason,"google-flow-custody-upgrade-not-released");
  assert.equal(readMediaDemandInbox({root,now:new Date("2026-10-04T18:31:00Z")}).counts.liveAllocations,0);
});

test("dispatcher gives its bounded slots to higher-priority zero-credit demand first",async t=>{
  const root=mkdtempSync(join(tmpdir(),"media-dispatch-"));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const low=opened(root,{priority:20,title:"Low priority"});
  const high=opened(root,{priority:200,title:"High priority"});
  const queued=[];
  const flow={
    async flowMediaOffer(){return {provider:"urn:ame:google-flow",balance:50,capabilities:{"image-generation":{units:0,model:"GEM_PIX_2",supportedAspects:["16:9"]}}};},
    queueFlowOrderOnce(lines){queued.push(lines[0]);return {queued:1,path:"/q",allocations:[lines[0].allocation],duplicates:[]};},
  };
  await dispatchFreeFlowMediaDemand({root,flow,maxGenerations:1,now:new Date("2026-10-04T18:30:00Z")});
  assert.equal(queued.length,1);
  assert.equal(queued[0].mediaNeed,high);
  assert.notEqual(queued[0].mediaNeed,low);
});
