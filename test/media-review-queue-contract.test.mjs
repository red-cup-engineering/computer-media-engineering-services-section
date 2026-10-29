import test from "node:test";
import assert from "node:assert/strict";
import {projectMediaArtifactReviewQueue} from "../src/media-review-queue-contract.mjs";
const needs=[{id:"need-1",consumer:"science",objective:"explain a verified result",
  source:{ref:"science-paper"},artifacts:[{purpose:"diagram",capability:"image-generation",
  acceptanceCriteria:"matches formal theorem"}]}];
const allocations=[{allocation:"alloc-A",mediaNeed:"need-1",purpose:"diagram",state:"generated",
  provider:"renderer-A",bid:"bid-A",awardRef:"customer-award-A"}];
const artifact=(overrides={})=>({
  allocation:"alloc-A",mediaNeed:"need-1",purpose:"diagram",provider:"renderer-A",
  completionId:"gen-A",storedPath:"media/assets/sha256-A.png",mimeType:"image/png",
  generatedAt:"2026-10-12T20:00:00Z",...overrides
});
const project=(overrides={})=>projectMediaArtifactReviewQueue({
  allocations,needs,artifacts:[artifact()],now:new Date("2026-10-12T20:10:00Z"),...overrides
});
test("an awarded image is reviewable with exact provider and bid lineage, never autoaccepted",()=>{
  const q=project();assert.equal(q.count,1);assert.equal(q.blockedCount,0);
  assert.equal(q.items[0].provider,"renderer-A");assert.equal(q.items[0].bid,"bid-A");
  assert.equal(q.items[0].acceptanceCriteria,"matches formal theorem");
  assert.equal(q.items[0].distribution,null);
});
test("competing or unverified provider output never substitutes for awarded custody",()=>{
  const wrong=project({artifacts:[artifact({provider:"renderer-B"})]});
  assert.equal(wrong.count,0);assert.equal(wrong.blocked[0].reason,"provider-custody-lineage-mismatch");
  const duplicate=project({artifacts:[artifact(),artifact({completionId:"other"})]});
  assert.equal(duplicate.count,0);assert.equal(duplicate.blocked[0].reason,"ambiguous-provider-custody");
  const missing=project({artifacts:[]});
  assert.equal(missing.blocked[0].reason,"provider-custody-not-observed");
});
test("one customer review suppresses the completed lot but does not alter other supplier offers",()=>{
  const q=project({reviews:[{allocation:"alloc-A",accepted:false}]});
  assert.equal(q.count,0);assert.equal(q.blockedCount,0);
});
test("missing media need, false completion or missing binary cannot reach review",()=>{
  assert.equal(project({needs:[]}).blocked[0].reason,"source-need-or-artifact-missing");
  assert.equal(project({artifacts:[artifact({storedPath:""})]}).blocked[0].reason,"provider-completion-bytes-not-retained");
});
