import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { projectYouTubeAnalyticsTree } from "../src/media-performance-projector.mjs";
import { readMediaPerformanceObservations } from "../src/media-performance-journal.mjs";

const row=(channel,videoId,observedAt)=>({
  type:"MediaPerformanceObservation",version:1,observedAt,provider:"youtube",channel,
  youtubeChannelId:"UCabcdefghijklmnopqrstuv",lessonId:"lesson",mediaKind:"long-form",videoId,
  snapshot:{statistics:{viewCount:"1"}},ownerAnalytics:{},
});

test("projector discovers retained analytics across nested channel repositories and replays safely",t=>{
  const educationRoot=mkdtempSync(join(tmpdir(),"education-tree-"));
  const dataRoot=mkdtempSync(join(tmpdir(),"group-data-"));
  t.after(()=>{rmSync(educationRoot,{recursive:true,force:true});rmSync(dataRoot,{recursive:true,force:true});});
  const a=join(educationRoot,"services","a","channels","alpha","production");
  const b=join(educationRoot,"services","b","channels","beta","production");
  mkdirSync(a,{recursive:true});mkdirSync(b,{recursive:true});
  writeFileSync(join(a,"analytics.jsonl"),JSON.stringify(row("alpha","abcdefghijk","2026-10-04T17:00:00.000Z"))+"\n");
  writeFileSync(join(b,"analytics.jsonl"),[
    JSON.stringify(row("beta","lmnopqrstuv","2026-10-04T17:01:00.000Z")),
    JSON.stringify(row("beta","zyxwvutsrqp","2026-10-04T17:02:00.000Z")),
  ].join("\n")+"\n");
  const first=projectYouTubeAnalyticsTree({educationRoot,dataRoot});
  assert.equal(first.files,2);assert.equal(first.observations,3);assert.equal(first.appended,3);
  const second=projectYouTubeAnalyticsTree({educationRoot,dataRoot});
  assert.equal(second.observations,3);assert.equal(second.appended,0);
  assert.equal(readMediaPerformanceObservations({root:dataRoot}).length,3);
});

test("projector with no analytics files is a successful zero-effect read",t=>{
  const educationRoot=mkdtempSync(join(tmpdir(),"education-tree-"));
  const dataRoot=mkdtempSync(join(tmpdir(),"group-data-"));
  t.after(()=>{rmSync(educationRoot,{recursive:true,force:true});rmSync(dataRoot,{recursive:true,force:true});});
  const result=projectYouTubeAnalyticsTree({educationRoot,dataRoot});
  assert.equal(result.files,0);assert.equal(result.observations,0);assert.equal(result.appended,0);
});

test("original Education v2 NDJSON carrier reaches the same semantic EAVT projection, no parallel ledger",t=>{
 const educationRoot=mkdtempSync(join(tmpdir(),"v2-education-"));
 const dataRoot=mkdtempSync(join(tmpdir(),"v2-media-"));
 t.after(()=>{rmSync(educationRoot,{recursive:true,force:true});rmSync(dataRoot,{recursive:true,force:true});});
 const directory=join(educationRoot,"services","publishing","channels","emsenn0","production");
 mkdirSync(directory,{recursive:true});
 const orig=row("emsenn0","abcdefghijk","2026-10-21T22:00:00.000Z");
 const v2={...orig,version:2,youtubeVideoId:orig.videoId,videoId:undefined};
 writeFileSync(join(directory,"analytics.jsonl"),JSON.stringify(orig)+"\n"+JSON.stringify(v2)+"\n");
 const result=projectYouTubeAnalyticsTree({educationRoot,dataRoot});
 assert.equal(result.files,1);assert.equal(result.observations,2);assert.equal(result.appended,2);
 const persisted=readMediaPerformanceObservations({root:dataRoot,youtubeVideoId:"abcdefghijk"});
 assert.equal(persisted.length,2);
 assert.equal(persisted.find(x=>x.observation.version===1).observation.videoId,"abcdefghijk");
 assert.equal(persisted.find(x=>x.observation.version===2).observation.youtubeVideoId,"abcdefghijk");
 assert.equal(projectYouTubeAnalyticsTree({educationRoot,dataRoot}).appended,0);
});
