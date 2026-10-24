import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  latestMediaPerformanceByVideo,
  readMediaPerformanceObservations,
  recordMediaPerformanceObservation,
  recordMediaPerformanceObservations,
  youtubeVideoIdOf, parentYouTubeVideoIdOf,
} from "../src/media-performance-journal.mjs";

const observation=(overrides={})=>({
  type:"MediaPerformanceObservation",
  version:1,
  observedAt:"2026-10-04T17:00:00.000Z",
  provider:"youtube",
  channel:"machine-learning-history-frontier",
  youtubeChannelId:"UCZY23kFU8ddtPn8mnY9xGaw",
  lessonId:"multimodality-agents-world-models",
  mediaKind:"long-form",
  videoId:"-SV_m2NEyhI",
  publishAt:"2026-10-07T15:00:00.000Z",
  snapshot:{statistics:{viewCount:"0"}},
  ownerAnalytics:{basic:{status:"not-yet-published"},contentType:{status:"not-yet-published"},trafficSources:{status:"not-yet-published"}},
  ...overrides,
});

test("shared projection keeps the complete YouTube observation and is replay-idempotent",t=>{
  const root=mkdtempSync(join(tmpdir(),"media-performance-"));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const first=recordMediaPerformanceObservation({root,observation:observation()});
  assert.equal(first.appended,1);
  const replay=recordMediaPerformanceObservation({root,observation:observation()});
  assert.equal(replay.id,first.id);
  assert.equal(replay.appended,0);

  const [row]=readMediaPerformanceObservations({root});
  assert.equal(row.observation.videoId,"-SV_m2NEyhI");
  assert.deepEqual(row.observation.snapshot,{statistics:{viewCount:"0"}});
  assert.deepEqual(row.observation.ownerAnalytics.contentType,{status:"not-yet-published"});
  assert.equal(row.told.for,true);
  assert.equal(row.told.against,false);
});

test("shared projection queries across channel, media kind, video, and time without deleting history",t=>{
  const root=mkdtempSync(join(tmpdir(),"media-performance-"));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const rows=[
    observation(),
    observation({observedAt:"2026-10-05T17:00:00.000Z",mediaKind:"short",videoId:"abcdefghijk",parentVideoId:"-SV_m2NEyhI"}),
    observation({observedAt:"2026-10-06T17:00:00.000Z",channel:"modern-business-practices",videoId:"kSZF78O4Wrc"}),
  ];
  const receipt=recordMediaPerformanceObservations({root,observations:rows});
  assert.equal(receipt.observations,3);
  assert.equal(receipt.appended,3);

  assert.equal(readMediaPerformanceObservations({root,channel:"machine-learning-history-frontier"}).length,2);
  assert.equal(readMediaPerformanceObservations({root,mediaKind:"short"}).length,1);
  assert.equal(readMediaPerformanceObservations({root,videoId:"kSZF78O4Wrc"}).length,1);
  assert.equal(readMediaPerformanceObservations({root,since:"2026-10-05T00:00:00Z",until:"2026-10-05T23:59:59Z"}).length,1);
  assert.equal(readMediaPerformanceObservations({root}).length,3);
});

test("latest readout is a projection over the retained history, not a destructive current-state store",t=>{
  const root=mkdtempSync(join(tmpdir(),"media-performance-"));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  recordMediaPerformanceObservations({root,observations:[
    observation({observedAt:"2026-10-04T17:00:00.000Z",snapshot:{statistics:{viewCount:"1"}}}),
    observation({observedAt:"2026-10-05T17:00:00.000Z",snapshot:{statistics:{viewCount:"9"}}}),
    observation({observedAt:"2026-10-05T18:00:00.000Z",videoId:"abcdefghijk",mediaKind:"short"}),
  ]});
  assert.equal(readMediaPerformanceObservations({root}).length,3);
  const latest=latestMediaPerformanceByVideo({root});
  assert.equal(latest.length,2);
  assert.equal(latest.find(row=>row.observation.videoId==="-SV_m2NEyhI").observation.snapshot.statistics.viewCount,"9");
});

test("non-YouTube or malformed observations are refused before journal mutation",t=>{
  const root=mkdtempSync(join(tmpdir(),"media-performance-"));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  assert.throws(()=>recordMediaPerformanceObservation({root,observation:observation({provider:"other"})}),/YouTube observations only/u);
  assert.throws(()=>recordMediaPerformanceObservation({root,observation:observation({observedAt:"bad"})}),/instant/u);
  assert.equal(readMediaPerformanceObservations({root}).length,0);
});

test("v2 named IDs are an actual append-only EAVT journal input; historical v1 stays unchanged",t=>{
  const root=mkdtempSync(join(tmpdir(),"media-performance-v2-"));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const first=observation();
  const second=observation({
    type:"MediaPerformanceObservation",version:2,
    youtubeVideoId:"abcdefghijk",videoId:undefined,
    mediaKind:"short",parentYouTubeVideoId:"-SV_m2NEyhI",
    observedAt:"2026-10-09T17:00:00.000Z"
  });
  const a=recordMediaPerformanceObservation({root,observation:first});
  const b=recordMediaPerformanceObservation({root,observation:second});
  assert.equal(a.appended,1);assert.equal(b.appended,1);
  assert.equal(recordMediaPerformanceObservation({root,observation:second}).appended,0);
  const all=readMediaPerformanceObservations({root});
  assert.equal(all.length,2);
  const retained=all.find(row=>row.observation.version===1);
  assert.equal(retained.observation.videoId,first.videoId);
  assert.equal(retained.observation.youtubeVideoId,undefined);
  const typed=all.find(row=>row.observation.version===2);
  assert.equal(typed.observation.youtubeVideoId,"abcdefghijk");
  assert.equal(typed.observation.videoId,undefined);
  assert.equal(youtubeVideoIdOf(typed.observation),"abcdefghijk");
  assert.equal(parentYouTubeVideoIdOf(typed.observation),"-SV_m2NEyhI");
  assert.equal(readMediaPerformanceObservations({root,youtubeVideoId:"abcdefghijk"}).length,1);
  assert.equal(readMediaPerformanceObservations({root,videoId:"abcdefghijk"}).length,1);
  assert.throws(()=>readMediaPerformanceObservations({root,videoId:"abcdefghijk",youtubeVideoId:"-SV_m2NEyhI"}),/Conflicting YouTube video filters/u);
  assert.equal(latestMediaPerformanceByVideo({root}).length,2);
});

test("v2 identities refuse opaque aliases, source contradiction, foreign transport and unsupported versions",t=>{
  const root=mkdtempSync(join(tmpdir(),"media-performance-invalid-"));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const base=observation({version:2,videoId:undefined,youtubeVideoId:"abcdefghijk"});
  const bad=[
   {...base,videoId:"abcdefghijk"},
   {...base,videoId:"otherVideo1"},
   {...base,youtubeVideoId:""},
   {...base,youtubeVideoId:"wrong"},
   {...base,parentVideoId:"-SV_m2NEyhI"},
   {...base,parentYouTubeVideoId:"wrong"},
   {...base,version:3},
   {...base,provider:"vimeo"},
   {...base,youtubeChannelId:"UC-invalid"},
   {...base,mediaKind:"untyped-short"},
   {...base,mediaKind:"long-form",parentYouTubeVideoId:"-SV_m2NEyhI"},
  ];
  for(const row of bad)assert.throws(()=>recordMediaPerformanceObservation({root,observation:row}),TypeError);
  assert.equal(readMediaPerformanceObservations({root}).length,0);
});
