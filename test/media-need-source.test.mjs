import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,writeFileSync,rmSync,mkdirSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
const bin=fileURLToPath(new URL("../apps/media-need.mjs",import.meta.url));
const source=()=>({type:"MediaNeed",version:1,consumer:"561-group-content-design-services-section",
  objective:"carry an accepted source claim to a legible receiver",openedAt:"2026-10-12T20:00:00Z",
  source:{ref:"https://github.com/561-group/561-group-services-section/blob/main/README.md"},
  intake:{state:"proposed-unverified",acceptanceCriteria:"An independent reviewer checks the exact claim and alt text"},
  artifacts:[{capability:"image-generation",purpose:"news-media-component",priority:0,
    disposition:"hold",destination:"https://example.org/intended-customer",wanted:1}]});
test("consumer-owned JSON requirements validate without npm dependencies or authority elevation",t=>{
  const root=mkdtempSync(join(tmpdir(),"media-requirement-"));t.after(()=>rmSync(root,{recursive:true,force:true}));
  const p=join(root,"requirement.json");writeFileSync(p,JSON.stringify(source()));
  const output=JSON.parse(execFileSync(process.execPath,[bin,"--check",p],{encoding:"utf8"}));
  assert.equal(output.status,"SOURCE_REQUIREMENT_VALID_UNRECEIVED");
  assert.equal(output.artifacts[0].purpose,"news-media-component");
});
test("missing source or acceptance is not a useful requirement",t=>{
  const root=mkdtempSync(join(tmpdir(),"media-requirement-"));t.after(()=>rmSync(root,{recursive:true,force:true}));
  const p=join(root,"bad.json");const missingSource=source();delete missingSource.source;
  writeFileSync(p,JSON.stringify(missingSource));
  assert.throws(()=>execFileSync(process.execPath,[bin,"--check",p],{stdio:"pipe"}));
  const missingReview=source();delete missingReview.intake;writeFileSync(p,JSON.stringify(missingReview));
  assert.throws(()=>execFileSync(process.execPath,[bin,"--check",p],{stdio:"pipe"}));
});

test("source-owned MediaNeed checks the actual SignCell requirement rather than a copied title",t=>{
  const root=mkdtempSync(join(tmpdir(),"media-requirement-lineage-"));
  t.after(()=>rmSync(root,{recursive:true,force:true}));

  mkdirSync(join(root,"content","requirements"),{recursive:true});
  mkdirSync(join(root,"requirements","media"),{recursive:true});
  const requirement={kind:"requirement",id:"visual-contracts-from-science",asks:"Deliver a truthful mathematical explanatory visual", "x-provenance":{"sign-cell":{type:"emsenn/schema/requirement",mark:"ni:///sha-256;actual-source-cell"}}};
  writeFileSync(join(root,"content","requirements","visual.json"),JSON.stringify(requirement));
  const media=source();
  media.source={requirementPath:"content/requirements/visual.json",requirementId:requirement.id,signCellMark:requirement["x-provenance"]["sign-cell"].mark};
  const file=join(root,"requirements","media","need.json");
  writeFileSync(file,JSON.stringify(media));
  const run=()=>execFileSync(process.execPath,[bin,"--check",file],{cwd:root,encoding:"utf8",stdio:["ignore","pipe","pipe"]});
  assert.equal(JSON.parse(run()).status,"SOURCE_REQUIREMENT_VALID_UNRECEIVED");
  media.source.signCellMark="ni:///sha-256;fabricated";
  writeFileSync(file,JSON.stringify(media));
  assert.throws(run);
  media.source.signCellMark=requirement["x-provenance"]["sign-cell"].mark;
  media.source.requirementId="wrong";
  writeFileSync(file,JSON.stringify(media));
  assert.throws(run);
  media.source.requirementId=requirement.id;
  media.source.requirementPath="../unrelated.json";
  writeFileSync(file,JSON.stringify(media));
  assert.throws(run);
});
