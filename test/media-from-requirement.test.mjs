import test from "node:test";
import assert from "node:assert/strict";
import {proposeMediaNeedFromRequirement} from "../src/media-from-requirement.mjs";

const requirement=()=>({
  id:"visual-communication-of-web-family",kind:"requirement",name:"Existing web family explained",
  "raised-by":"emsenn",asks:"Explain how upstream web engines relate without fabricating runtime evidence",
  "met-when":[{cell:"web-family:specification-held",target:"held"}],
  "x-provenance":{"sign-cell":{
    type:"emsenn/schema/requirement",
    mark:"ni:///sha-256;source-mark-from-real-requirement",
    cell:"ni:///sha-256;source-cell"
  }}
});
const brief=()=>({
  consumer:"red-cup-engineering/computer-web-engineering-services-section",
  objective:"Make an evidence-labeled diagram for an already accepted specification",
  openedAt:"2026-10-12T20:00:00Z",
  reviewer:"Computer Web Engineering receiving office",
  artifacts:[{capability:"image-generation",purpose:"architecture-explainer",
    destination:"engineering documentation",acceptanceCriteria:"Nodes and arrows match the existing science and architecture specification"}]
});
test("an existing signed-cell requirement projects to a held media proposal, not work",()=>{
  const from=requirement(),owner=brief();
  const result=proposeMediaNeedFromRequirement({requirement:from,brief:owner,
    sourcePath:"content/requirements/web-family.json"});
  assert.equal(result.type,"MediaRequirementProjection");
  assert.equal(result.status,"PROPOSED_NOT_ADMITTED");
  assert.equal(result.mediaNeedCandidate.type,"MediaNeed");
  assert.equal(result.mediaNeedCandidate.id,undefined);
  assert.equal(result.mediaNeedCandidate.source.signCellMark,from["x-provenance"]["sign-cell"].mark);
  assert.equal(result.mediaNeedCandidate.source.signCell,from["x-provenance"]["sign-cell"].cell);
  assert.equal(result.mediaNeedCandidate.intake.state,"proposed-unverified");
  assert.equal(result.mediaNeedCandidate.artifacts[0].disposition,"hold");
  assert.equal(result.mediaNeedCandidate.artifacts[0].priority,0);
  assert.equal(result.mediaNeedCandidate.artifacts[0].acceptanceCriteria,owner.artifacts[0].acceptanceCriteria);
  assert.equal(from["met-when"][0].target,"held");
});
test("no media intent is inferred from mere original words; customer must specify a receiving artifact",()=>{
  assert.throws(()=>proposeMediaNeedFromRequirement({requirement:requirement(),brief:null,sourcePath:"content/requirements/a.json"}),/media brief/u);
  const withNoDestination=brief();delete withNoDestination.artifacts[0].destination;
  assert.throws(()=>proposeMediaNeedFromRequirement({requirement:requirement(),brief:withNoDestination,sourcePath:"content/requirements/a.json"}),/artifact receiver/u);
  const withNoAcceptance=brief();delete withNoAcceptance.artifacts[0].acceptanceCriteria;
  assert.throws(()=>proposeMediaNeedFromRequirement({requirement:requirement(),brief:withNoAcceptance,sourcePath:"content/requirements/a.json"}),/acceptance criteria/u);
});
test("the original SignCell mark, artifact identity, and demand cardinality are not rewritten",()=>{
  const malformed=requirement();malformed["x-provenance"]["sign-cell"].mark="fabricated";
  assert.throws(()=>proposeMediaNeedFromRequirement({requirement:malformed,brief:brief(),sourcePath:"content/requirements/a.json"}),/SignCell/u);
  const duplicated=brief();duplicated.artifacts.push({...duplicated.artifacts[0],capability:"audio-production"});
  assert.throws(()=>proposeMediaNeedFromRequirement({requirement:requirement(),brief:duplicated,sourcePath:"content/requirements/a.json"}),/duplicate artifact purpose/u);
});
