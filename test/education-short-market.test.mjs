import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  dispatchEducationShortProbe,
  projectEducationShortDemand,
  reconcileEducationShorts,
} from "../src/education-short-market.mjs";
import {
  readMediaAllocationStates,
  readMediaDemandInbox,
  recordMediaAllocationState,
  recordMediaNeed,
  recordMediaReadiness,
} from "../src/media-demand-journal.mjs";

function fixture(t, { publishAt = "2026-10-07T15:00:00Z", stage = "scheduled", shortPublication } = {}) {
  const root = mkdtempSync(join(tmpdir(), "education-short-market-"));
  const channelDir = join(root, "channel");
  const episodeDir = join(channelDir, "production", "episodes", "multimodality-agents-world-models");
  mkdirSync(episodeDir, { recursive: true });
  writeFileSync(join(episodeDir, "state.json"), JSON.stringify({
    version: 1,
    channel: "machine-learning-history-frontier",
    lessonId: "multimodality-agents-world-models",
    stage,
    createdAt: "2026-10-02T15:22:18.960Z",
    commissionedAt: "2026-10-02T15:22:18.960Z",
    reportSha256: "4c543c252ac2505643fd7ddb6d75876b09d276489337ed31987ab77ef6dfc4b1",
    videoWorkReceipt: "ni:///sha-256;tVDa3dIP1S96hmUzQ5KCT_5xrdJo2H5clz94to5Dfkw",
    notebookId: "9c3eed44-7fa3-4203-8b79-e0a20b91017f",
    youtubeVideoId: "-SV_m2NEyhI",
    publishAt,
  }));
  if (shortPublication) writeFileSync(join(episodeDir, "short-publication.json"), JSON.stringify(shortPublication));

  const config = {
    id: "machine-learning-history-frontier",
    enabled: true,
    directory: channelDir,
    youtubeChannelId: "UCZY23kFU8ddtPn8mnY9xGaw",
    refreshTokenEnv: "ARTIFICIAL_INTELLIGENCE_YOUTUBE_OAUTH_REFRESH_TOKEN",
    notebookId: "9c3eed44-7fa3-4203-8b79-e0a20b91017f",
  };
  const readJson = (path, fallback) => {
    try { return JSON.parse(readFileSync(path, "utf8")); }
    catch { return fallback; }
  };
  const education = {
    channelIds: () => [config.id],
    loadChannel: () => config,
    loadEnvironment: () => {},
    readJson,
  };
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { root, channelDir, episodeDir, config, education };
}

test("accepted scheduled education episode opens one source-grounded Short demand six hours after parent", async t => {
  const f = fixture(t);
  const dataRoot = mkdtempSync(join(tmpdir(), "media-data-"));
  t.after(() => rmSync(dataRoot, { recursive: true, force: true }));
  const env = { ARTIFICIAL_INTELLIGENCE_YOUTUBE_OAUTH_REFRESH_TOKEN: "token" };
  const result = await projectEducationShortDemand({
    root: dataRoot, education: f.education, env, now: new Date("2026-10-04T18:00:00Z"),
  });
  assert.equal(result.status, "complete");
  assert.equal(result.opened.length, 1);
  assert.equal(result.opened[0].publishAt, "2026-10-07T21:00:00.000Z");

  const inbox = readMediaDemandInbox({ root: dataRoot, now: new Date("2026-10-04T18:01:00Z") });
  assert.equal(inbox.needs.length, 1);
  const need = inbox.needs[0];
  assert.equal(need.source.parentVideoId, "-SV_m2NEyhI");
  assert.equal(need.artifacts[0].generation.operation, "public-education-native-short");
  assert.equal(need.artifacts[0].generation.publishAt, "2026-10-07T21:00:00.000Z");
  assert.equal(inbox.frontier[0].state, "admissible");
});

test("native Short probe executes only one unknown-cost allocation and carries lineage", async t => {
  const f = fixture(t);
  const dataRoot = mkdtempSync(join(tmpdir(), "media-data-"));
  t.after(() => rmSync(dataRoot, { recursive: true, force: true }));
  await projectEducationShortDemand({
    root: dataRoot, education: f.education,
    env: { ARTIFICIAL_INTELLIGENCE_YOUTUBE_OAUTH_REFRESH_TOKEN: "token" },
    now: new Date("2026-10-04T18:00:00Z"),
  });
  const calls = [];
  const education = {
    ...f.education,
    async produceShortForChannel(channelId, lessonId, options) {
      calls.push({ channelId, lessonId, options });
      return {
        channel: channelId, lesson: lessonId, status: "short-scheduled",
        videoId: "abcdefghijk", parentVideoId: "-SV_m2NEyhI",
        publishAt: options.publishAt, receipt: "ni:///sha-256;short-receipt",
        ...options.lineage,
      };
    },
  };
  const first = await dispatchEducationShortProbe({
    root: dataRoot, education, now: new Date("2026-10-04T18:10:00Z"),
  });
  assert.equal(first.status, "short-scheduled");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].channelId, "machine-learning-history-frontier");
  assert.equal(calls[0].lessonId, "multimodality-agents-world-models");
  assert.equal(calls[0].options.publishAt, "2026-10-07T21:00:00.000Z");
  assert.equal(calls[0].options.lineage.allocation, first.allocation);
  assert.equal(calls[0].options.lineage.mediaNeed, first.mediaNeed);
  assert.equal(calls[0].options.parentVideoId,"-SV_m2NEyhI");

  const state = readMediaAllocationStates({ root: dataRoot })[0];
  assert.equal(state.state, "delivered");
  assert.equal(state.provider, "urn:ame:gemini-notebook");

  const second = await dispatchEducationShortProbe({
    root: dataRoot, education, now: new Date("2026-10-04T18:20:00Z"),
  });
  assert.equal(second.reason, "native-short-probe-already-completed");
  assert.equal(calls.length, 1);
});

test("automatic Short demand does not mine an already-past historical parent", async t => {
  const f = fixture(t, { publishAt: "2026-07-24T15:00:00Z", stage: "published" });
  const dataRoot = mkdtempSync(join(tmpdir(), "media-data-"));
  t.after(() => rmSync(dataRoot, { recursive: true, force: true }));
  const result = await projectEducationShortDemand({
    root: dataRoot, education: f.education,
    env: { ARTIFICIAL_INTELLIGENCE_YOUTUBE_OAUTH_REFRESH_TOKEN: "token" },
    now: new Date("2026-10-04T18:00:00Z"),
  });
  assert.equal(result.opened.length, 0);
  assert.equal(result.skipped[0].reason, "automatic-short-window-passed");
  assert.equal(readMediaDemandInbox({ root: dataRoot }).needs.length, 0);
});

test("Short reconciliation closes a published allocation to public use", async t => {
  const dataRoot = mkdtempSync(join(tmpdir(), "media-data-"));
  t.after(() => rmSync(dataRoot, { recursive: true, force: true }));
  const need = recordMediaNeed({ root: dataRoot, need: {
    type: "MediaNeed", version: 1, consumer: "education-channel:machine-learning-history-frontier",
    objective: "Short fixture", openedAt: "2026-10-02T15:22:18.960Z",
    artifacts: [{ capability: "source-grounded-short-video", purpose: "youtube-short-companion", priority: 95, wanted: 1, disposition: "admissible" }],
  }}).need;
  const allocation = "ni:///sha-256;allocation-short";
  recordMediaAllocationState({
    root: dataRoot, allocation, mediaNeed: need.id, purpose: "youtube-short-companion", count: 1,
    state: "held", provider: "urn:ame:gemini-notebook", at: "2026-10-04T18:00:00Z", receipt: "probe",
  });
  const f = fixture(t, { shortPublication: {
    version: 1, parentVideoId: "-SV_m2NEyhI", videoId: "abcdefghijk",
    publishAt: "2026-10-07T21:00:00Z", observedPublishAt: "2026-10-07T21:00:01Z",
    workReceipt: "ni:///sha-256;short-receipt", mediaNeed: need.id, allocation,
    purpose: "youtube-short-companion", stage: "published",
  }});
  const result = await reconcileEducationShorts({
    root: dataRoot, education: f.education, now: new Date("2026-10-07T21:05:00Z"),
  });
  assert.deepEqual(result.transitions.map(row => row.state), ["generated", "delivered", "public-use"]);
  assert.equal(readMediaAllocationStates({ root: dataRoot })[0].state, "public-use");
});


test("failed native Short probe waits for the five-hour Notebook window before retrying",async t=>{
  const dataRoot=mkdtempSync(join(tmpdir(),"media-data-"));
  t.after(()=>rmSync(dataRoot,{recursive:true,force:true}));
  const f=fixture(t);
  const need=recordMediaNeed({root:dataRoot,need:{
    type:"MediaNeed",version:1,consumer:"education-channel:machine-learning-history-frontier",
    objective:"Short fixture",openedAt:"2026-10-04T18:00:00Z",
    artifacts:[{capability:"source-grounded-short-video",purpose:"youtube-short-companion",priority:95,wanted:1,disposition:"admissible",
      generation:{operation:"public-education-native-short",channelId:f.config.id,lessonId:"multimodality-agents-world-models",parentVideoId:"-SV_m2NEyhI",publishAt:"2026-10-07T21:00:00Z"}}],
  }}).need;
  recordMediaReadiness({root:dataRoot,mediaNeed:need.id,ready:true,authority:"education",basis:"ready",at:"2026-10-04T18:00:00Z"});
  const allocation="ni:///sha-256;failed-short";
  recordMediaAllocationState({root:dataRoot,allocation,mediaNeed:need.id,purpose:"youtube-short-companion",count:1,state:"held",provider:"urn:ame:gemini-notebook",at:"2026-10-04T18:05:00Z",receipt:"probe"});
  recordMediaAllocationState({root:dataRoot,allocation,mediaNeed:need.id,purpose:"youtube-short-companion",count:1,state:"released",provider:"urn:ame:gemini-notebook",at:"2026-10-04T18:06:00Z",receipt:"quota"});
  let calls=0;
  const education={...f.education,async produceShortForChannel(){calls+=1;throw new Error("must not run during cooldown");}};
  const result=await dispatchEducationShortProbe({root:dataRoot,education,now:new Date("2026-10-04T20:00:00Z")});
  assert.equal(result.reason,"native-short-probe-cooldown");
  assert.equal(result.retryAfter,"2026-10-04T23:06:00.000Z");
  assert.equal(calls,0);
});

async function fundedNativeProbe(t) {
  const f=fixture(t),root=mkdtempSync(join(tmpdir(),"media-native-probe-"));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  await projectEducationShortDemand({
    root,education:f.education,
    env:{ARTIFICIAL_INTELLIGENCE_YOUTUBE_OAUTH_REFRESH_TOKEN:"token"},
    now:new Date("2026-10-04T18:00:00Z"),
  });
  return {f,root};
}

test("uncertain native Short operation retains the exact allocation, including a lost provider response",async t=>{
  const {f,root}=await fundedNativeProbe(t);
  const calls=[];
  const education={...f.education,produceShortForChannel:async (channel,lesson,opts)=>{
    calls.push(opts);
    if(calls.length===1)throw new Error("Provider accepted but connection closed");
    return {...opts.lineage,parentVideoId:opts.parentVideoId,publishAt:opts.publishAt,
      status:"short-youtube-scheduling",videoId:"abcdefghijk",workAccepted:true,receipt:"sha256:"+"a".repeat(64)};
  }};
  const first=await dispatchEducationShortProbe({root,education,now:new Date("2026-10-04T18:10:00Z")});
  assert.equal(first.status,"blocked");
  assert.equal(first.reason,"short-operation-uncertain");
  assert.equal(readMediaAllocationStates({root})[0].state,"held");
  const second=await dispatchEducationShortProbe({root,education,now:new Date("2026-10-04T18:15:00Z")});
  assert.equal(second.status,"short-youtube-scheduling");
  assert.equal(second.state,"generated");
  assert.equal(second.allocation,first.allocation);
  assert.equal(readMediaAllocationStates({root}).length,1);
  const third=await dispatchEducationShortProbe({root,education,now:new Date("2026-10-04T18:20:00Z")});
  assert.equal(third.state,"generated");
  assert.equal(third.allocation,first.allocation);
  assert.equal(calls.length,3);
});

test("an independently unverified native schedule cannot become delivered",async t=>{
  const {f,root}=await fundedNativeProbe(t);
  const education={...f.education,produceShortForChannel:async (channel,lesson,opts)=>({
    ...opts.lineage,videoId:"abcdefghijk",parentVideoId:"other-parent",
    publishAt:opts.publishAt,status:"short-scheduled",workAccepted:true,
  })};
  const result=await dispatchEducationShortProbe({root,education,now:new Date("2026-10-04T18:10:00Z")});
  assert.equal(result.reason,"short-receiving-identity-unverified");
  assert.equal(readMediaAllocationStates({root})[0].state,"held");
});

test("generated native Short resumes and reaches delivery only when scheduled by its owner",async t=>{
  const {f,root}=await fundedNativeProbe(t);
  let calls=0;
  const education={...f.education,produceShortForChannel:async (channel,lesson,opts)=>{
    calls++;
    return {...opts.lineage,videoId:"abcdefghijk",parentVideoId:opts.parentVideoId,
      publishAt:opts.publishAt,receipt:"sha256:"+"b".repeat(64),workAccepted:true,
      status:calls===1?"short-ready":"short-scheduled"};
  }};
  const first=await dispatchEducationShortProbe({root,education,now:new Date("2026-10-04T18:10:00Z")});
  assert.equal(first.state,"generated");
  const second=await dispatchEducationShortProbe({root,education,now:new Date("2026-10-04T18:11:00Z")});
  assert.equal(second.state,"delivered");
  assert.equal(second.allocation,first.allocation);
  const third=await dispatchEducationShortProbe({root,education,now:new Date("2026-10-04T18:12:00Z")});
  assert.equal(third.reason,"native-short-probe-already-completed");
  assert.equal(calls,2);
});

test("native accepted generation is not commissioned again as a second Short",async t=>{
  const f=fixture(t),root=mkdtempSync(join(tmpdir(),"media-existing-native-"));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  writeFileSync(join(f.episodeDir,"notebook-short.json"),JSON.stringify({notebook:{generationStarted:true}}));
  const result=await projectEducationShortDemand({
    root,education:f.education,env:{ARTIFICIAL_INTELLIGENCE_YOUTUBE_OAUTH_REFRESH_TOKEN:"token"},
    now:new Date("2026-10-04T18:00:00Z"),
  });
  assert.equal(result.opened.length,0);
  assert.equal(result.skipped[0].reason,"short-already-exists");
  assert.equal(readMediaDemandInbox({root}).needs.length,0);
});

test("native Notebook checkpoint reconciles generated, observed schedule, then public receiving",async t=>{
  const {f,root}=await fundedNativeProbe(t);
  const need=readMediaDemandInbox({root}).needs[0],allocation="ni:///sha-256;native-short-allocation";
  recordMediaAllocationState({root,allocation,mediaNeed:need.id,purpose:"youtube-short-companion",count:1,
    state:"held",provider:"urn:ame:gemini-notebook",at:"2026-10-04T18:01:00Z",receipt:"probe"});
  const path=join(f.episodeDir,"notebook-short.json");
  const checkpoint={
    mediaNeed:need.id,allocation,purpose:"youtube-short-companion",parentVideoId:"-SV_m2NEyhI",
    youtubeVideoId:"abcdefghijk",publishAt:"2026-10-07T21:00:00.000Z",
    drive:{sha256:"sha256:"+"c".repeat(64)},stage:"scheduled",
  };
  writeFileSync(path,JSON.stringify(checkpoint));
  let result=await reconcileEducationShorts({root,education:f.education,now:new Date("2026-10-04T18:10:00Z")});
  assert.deepEqual(result.transitions.map(x=>x.state),["generated","delivered"]);
  assert.equal(readMediaAllocationStates({root})[0].state,"delivered");
  writeFileSync(path,JSON.stringify({...checkpoint,stage:"published"}));
  result=await reconcileEducationShorts({root,education:f.education,now:new Date("2026-10-08T18:10:00Z")});
  assert.deepEqual(result.transitions.map(x=>x.state),["public-use"]);
  assert.equal(readMediaAllocationStates({root})[0].state,"public-use");
});

test("native Short reconciliation rejects unrelated parent or allocation evidence without effects",async t=>{
  const {f,root}=await fundedNativeProbe(t);
  const need=readMediaDemandInbox({root}).needs[0],allocation="ni:///sha-256;native-mismatched-parent";
  recordMediaAllocationState({root,allocation,mediaNeed:need.id,purpose:"youtube-short-companion",count:1,
    state:"held",provider:"urn:ame:gemini-notebook",at:"2026-10-04T18:01:00Z",receipt:"probe"});
  writeFileSync(join(f.episodeDir,"notebook-short.json"),JSON.stringify({
    mediaNeed:need.id,allocation,purpose:"youtube-short-companion",
    parentVideoId:"other-parent",youtubeVideoId:"abcdefghijk",stage:"published",
  }));
  const result=await reconcileEducationShorts({root,education:f.education,now:new Date("2026-10-08T18:10:00Z")});
  assert.deepEqual(result.transitions.map(x=>x.state),["obstructed"]);
  assert.equal(readMediaAllocationStates({root})[0].state,"held");
});


test("a missing mounted channel portfolio refuses projection, dispatch and reconciliation without side effects",async t=>{
  const root=mkdtempSync(join(tmpdir(),"media-empty-education-"));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const unavailable={
    channelIds:()=>[],
    loadEnvironment:()=>assert.fail("No credential reads without admitted channels"),
    loadChannel:()=>assert.fail("No channel may be invented"),
    produceShortForChannel:()=>assert.fail("No provider call without admitted channels"),
  };
  const projection=await projectEducationShortDemand({root,education:unavailable});
  assert.equal(projection.status,"blocked");
  assert.equal(projection.reason,"no-admitted-education-channels");
  assert.deepEqual(projection.opened,[]);
  const probe=await dispatchEducationShortProbe({root,education:unavailable});
  assert.equal(probe.status,"blocked");
  assert.equal(probe.reason,"no-admitted-education-channels");
  const reconciliation=await reconcileEducationShorts({root,education:unavailable});
  assert.equal(reconciliation.status,"blocked");
  assert.equal(reconciliation.reason,"no-admitted-education-channels");
  assert.deepEqual(reconciliation.transitions,[]);
  assert.deepEqual(readdirSync(root),[]);
});
