import test from "node:test";
import assert from "node:assert/strict";
import {proposeMediaNeedFromIssue} from "../src/media-requirement-intake.mjs";
const issue=(overrides={})=>({html_url:"https://github.com/causeway-services/public-media-services-section/issues/123",
  created_at:"2026-10-12T20:00:00Z",user:{login:"requester"},
  body:[
  "### Consuming enterprise or office","causeway-news",
  "### Source or requirement reference","https://example.org/requirement/1",
  "### What must this media accomplish?","Explain a claim without inventing source evidence",
  "### Artifact capability","image-generation",
  "### Artifact purpose (stable key)","article-social",
  "### Delivery destination or placement","https://example.org/social",
  "### Acceptance criteria","A text-free accessible and truth-preserving component",
  "### Reviewing office or person","Public News Editor",
  "### Rights and reuse status","Rights claimed by consumer",
  "### Visual and factual constraints","No generated logo",
  "### Suggested urgency","Normal"
  ].join("\n\n"),...overrides});
test("any enterprise can express a media requirement as a typed held proposal",()=>{
  const p=proposeMediaNeedFromIssue(issue());
  assert.equal(p.status,"PROPOSED_NOT_ADMITTED");
  assert.equal(p.mediaNeedCandidate.type,"MediaNeed");
  assert.equal(p.mediaNeedCandidate.artifacts[0].disposition,"conditional");
  assert.equal(p.mediaNeedCandidate.artifacts[0].priority,0);
  assert.equal(p.mediaNeedCandidate.intake.reviewer,"Public News Editor");
});
test("unknown rights require hold; prohibited personal projects are never auto-eligible",()=>{
  const b=issue().body;
  assert.equal(proposeMediaNeedFromIssue(issue({body:b.replace("Rights claimed by consumer","Unknown / needs review")}))
    .mediaNeedCandidate.artifacts[0].disposition,"hold");
  assert.equal(proposeMediaNeedFromIssue(issue({body:b.replace("Rights claimed by consumer","Prohibited / do not generate")}))
    .mediaNeedCandidate.artifacts[0].disposition,"ineligible");
});
test("rejects malformed provenance, purpose, capability or missing acceptance criteria",()=>{
  assert.throws(()=>proposeMediaNeedFromIssue(issue({html_url:"https://not-github.example/issue"})),/canonical private media-intake/u);
  assert.throws(()=>proposeMediaNeedFromIssue(issue({html_url:"https://github.com/561-group/561-group-site/issues/123"})),/canonical private media-intake/u);
  assert.throws(()=>proposeMediaNeedFromIssue(issue({body:issue().body.replace("article-social","../escape")})),/stable kebab-case/u);
  assert.throws(()=>proposeMediaNeedFromIssue(issue({body:issue().body.replace("image-generation","unspecified")})),/artifact capability/u);
  assert.throws(()=>proposeMediaNeedFromIssue(issue({body:issue().body.replace("### Acceptance criteria","### No acceptance")})),/Acceptance criteria/u);
});
