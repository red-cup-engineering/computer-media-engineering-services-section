import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { mediaPortfolioReadout } from "../src/media-portfolio-readout.mjs";
import { recordMediaNeed, recordMediaReadiness } from "../src/media-demand-journal.mjs";
import { recordMediaPerformanceObservations } from "../src/media-performance-journal.mjs";

const headers = (...names) => names.map((name,index)=>({name,columnType:index===0?"DIMENSION":"METRIC",dataType:index===0?"STRING":"INTEGER"}));

test("CMO readout joins cross-channel performance, parent/Short lineage, and current demand without scoring it",t=>{
  const root=mkdtempSync(join(tmpdir(),"media-readout-"));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  recordMediaPerformanceObservations({root,observations:[
    {
      type:"MediaPerformanceObservation",version:1,observedAt:"2026-10-08T18:00:00.000Z",
      provider:"youtube",channel:"machine-learning-history-frontier",youtubeChannelId:"UCabcdefghijklmnopqrstuv",
      lessonId:"multimodality-agents-world-models",mediaKind:"long-form",videoId:"-SV_m2NEyhI",
      publishAt:"2026-10-07T15:00:00.000Z",
      snapshot:{statistics:{viewCount:"100",likeCount:"7",commentCount:"2"}},
      ownerAnalytics:{basic:{status:"observed",report:{columnHeaders:headers("engagedViews","views","estimatedMinutesWatched","averageViewDuration","averageViewPercentage","likes","comments","shares","subscribersGained","subscribersLost"),rows:[[80,95,500,315,65,7,2,4,5,1]]}},contentType:{status:"observed",report:{columnHeaders:headers("creatorContentType","views"),rows:[["VIDEO_ON_DEMAND",95]]}},trafficSources:{status:"observed",report:{columnHeaders:headers("insightTrafficSourceType","views"),rows:[["BROWSE",60]]}}},
    },
    {
      type:"MediaPerformanceObservation",version:2,observedAt:"2026-10-08T18:00:00.000Z",
      provider:"youtube",channel:"machine-learning-history-frontier",youtubeChannelId:"UCabcdefghijklmnopqrstuv",
      lessonId:"multimodality-agents-world-models",mediaKind:"short",youtubeVideoId:"abcdefghijk",
      parentYouTubeVideoId:"-SV_m2NEyhI",publishAt:"2026-10-07T21:00:00.000Z",
      mediaNeed:"ni:///sha-256;short-need",allocation:"ni:///sha-256;short-allocation",purpose:"youtube-short-companion",
      snapshot:{statistics:{viewCount:"250",likeCount:"12",commentCount:"1"}},
      ownerAnalytics:{basic:{status:"observed",report:{columnHeaders:headers("engagedViews","views","estimatedMinutesWatched","averageViewDuration","averageViewPercentage","likes","comments","shares","subscribersGained","subscribersLost"),rows:[[180,240,180,45,75,12,1,10,8,1]]}},contentType:{status:"observed",report:{columnHeaders:headers("creatorContentType","engagedViews"),rows:[["SHORTS",180]]}},trafficSources:{status:"observed",report:{columnHeaders:headers("insightTrafficSourceType","views"),rows:[["SHORTS",200]]}}},
    },
  ]});
  const need=recordMediaNeed({root,need:{
    type:"MediaNeed",consumer:"koios-news-services-section",objective:"make outbound social art",
    openedAt:"2026-10-08T17:00:00.000Z",
    artifacts:[{capability:"image-generation",purpose:"social-outbound",priority:100,wanted:1,disposition:"admissible"}],
  }}).need;
  recordMediaReadiness({root,mediaNeed:need.id,ready:true,authority:"causeway-public-media",basis:"receiver cleared",at:"2026-10-08T17:01:00.000Z"});

  const result=mediaPortfolioReadout({root,flow:{flowMediaInventory:()=>({counts:{pending:0,generated:0,delivered:0,publicUse:0,undelivered:0},artifacts:[]})},now:new Date("2026-10-08T18:30:00Z")});
  assert.equal(result.youtube.counts.trackedVideos,2);
  assert.equal(result.youtube.counts.trackedShorts,1);
  assert.equal(result.youtube.counts.allocationLinkedShorts,1);
  assert.equal(result.youtube.channels[0].snapshotViews,350);
  const short=result.youtube.videos.find((row)=>row.mediaKind==="short");
  assert.equal(short.classification.shortConfirmed,true);
  assert.equal(short.youtubeVideoId,"abcdefghijk");
  assert.equal(short.parentYouTubeVideoId,"-SV_m2NEyhI");
  assert.equal(result.youtube.shortPairs[0].parentYouTubeVideoId,"-SV_m2NEyhI");
  assert.equal(result.youtube.shortPairs[0].shortYouTubeVideoId,"abcdefghijk");
  assert.equal(short.videoId,short.youtubeVideoId,"legacy readout alias still agrees");
  assert.equal(short.attention.subscriberNet,7);
  assert.equal(short.attention.elapsedHours,21);
  assert.equal(short.attention.subscriberNetPer1000EngagedViews,38.8889);
  assert.equal(result.youtube.shortPairs[0].allocation,"ni:///sha-256;short-allocation");
  assert.equal(result.youtube.shortPairs[0].contentType[0].creatorContentType,"SHORTS");
  assert.equal(result.youtube.shortPairs[0].shortClassificationConfirmed,true);
  assert.equal(result.youtube.shortPairs[0].evidenceWindow.comparable72h,false);
  assert.equal(result.youtube.experiment.confirmedShorts,1);
  assert.match(result.youtube.experiment.note,/not a universal media\/viral score/u);
  assert.equal(result.demand.counts.admissibleArtifacts,1);
  assert.equal(result.custody.reviewStatus,"complete");
  assert.equal("score" in result,false);
});
