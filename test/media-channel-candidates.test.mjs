import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mediaChannelCandidateReadout } from "../src/media-channel-candidates.mjs";
import { recordMediaNeed, recordMediaReadiness } from "../src/media-demand-journal.mjs";

const climateRelative="lib/emsenn/services/561-group/services/public-services-section/services/public-social-services-section/services/public-education-services-section/services/public-science-education-services-section/services/engineering-science-education-services-section/services/ecological-science-education-services-section/services/climate-science-education-services-section";

function climateTree(root,{reports=4,config}={}){
  const domain=join(root,climateRelative);
  const curriculumDir=join(domain,"content","curricula","climate-place-by-place");
  mkdirSync(curriculumDir,{recursive:true});
  const lessons=Array.from({length:6},(_,i)=>({id:`place-${i+1}`,title:`Place ${i+1}`,report:`lessons/place-${i+1}/report.md`}));
  writeFileSync(join(curriculumDir,"curriculum.json"),JSON.stringify({title:"Climate, Place-by-Place",lessons}));
  for(let i=0;i<reports;i+=1){const dir=join(curriculumDir,"lessons",`place-${i+1}`);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,"report.md"),`# Place ${i+1}`);}
  if(config){const dir=join(domain,"channels","climate-place-by-place");mkdirSync(dir,{recursive:true});writeFileSync(join(dir,"config.json"),JSON.stringify(config));}
}

test("Climate with mature report supply but no carrier is the first provisioning candidate",t=>{
  const repositoryRoot=mkdtempSync(join(tmpdir(),"media-channels-"));
  const dataRoot=mkdtempSync(join(tmpdir(),"media-data-"));
  t.after(()=>{rmSync(repositoryRoot,{recursive:true,force:true});rmSync(dataRoot,{recursive:true,force:true});});
  climateTree(repositoryRoot,{reports:5});
  const readout=mediaChannelCandidateReadout({repositoryRoot,root:dataRoot,env:{},now:new Date("2026-10-04T19:00:00Z")});
  const climate=readout.candidates.find((row)=>row.id==="climate-place-by-place");
  assert.equal(climate.status,"needs-channel-provisioning");
  assert.equal(climate.evidence.readyReports,5);
  assert.equal(climate.launchBundle.length,4);
  assert.equal(climate.obligation.kind,"human-account-ui");
});

test("Climate carrier progresses to Notebook binding rather than founding a duplicate channel",t=>{
  const repositoryRoot=mkdtempSync(join(tmpdir(),"media-channels-"));
  const dataRoot=mkdtempSync(join(tmpdir(),"media-data-"));
  t.after(()=>{rmSync(repositoryRoot,{recursive:true,force:true});rmSync(dataRoot,{recursive:true,force:true});});
  climateTree(repositoryRoot,{reports:4,config:{youtubeChannelId:"UCabcdefghijabcdefghijab",enabled:false,notebookId:null}});
  const climate=mediaChannelCandidateReadout({repositoryRoot,root:dataRoot,env:{}}).candidates.find((row)=>row.id==="climate-place-by-place");
  assert.equal(climate.status,"needs-notebook-binding");
});

test("PACE remains health-governance gated even when its OAuth credential exists",t=>{
  const repositoryRoot=mkdtempSync(join(tmpdir(),"media-channels-"));
  const dataRoot=mkdtempSync(join(tmpdir(),"media-data-"));
  t.after(()=>{rmSync(repositoryRoot,{recursive:true,force:true});rmSync(dataRoot,{recursive:true,force:true});});
  climateTree(repositoryRoot,{reports:0});
  const pace=mediaChannelCandidateReadout({repositoryRoot,root:dataRoot,env:{PACE_YOURSELF_YOUTUBE_OAUTH_REFRESH_TOKEN:"token"}}).candidates.find((row)=>row.id==="pace-yourself");
  assert.equal(pace.status,"governance-readiness-review");
  assert.equal(pace.evidence.credentialPresent,true);
  assert.ok(pace.obligations.some((row)=>row.kind==="health-editorial-readiness"));
  assert.ok(!pace.obligations.some((row)=>row.kind==="google-oauth-consent"));
});

test("Koios video channel waits for recurring demand and crosses the assessment threshold at six Short needs",t=>{
  const repositoryRoot=mkdtempSync(join(tmpdir(),"media-channels-"));
  const dataRoot=mkdtempSync(join(tmpdir(),"media-data-"));
  t.after(()=>{rmSync(repositoryRoot,{recursive:true,force:true});rmSync(dataRoot,{recursive:true,force:true});});
  climateTree(repositoryRoot,{reports:0});
  for(let i=0;i<6;i+=1){
    const receipt=recordMediaNeed({root:dataRoot,need:{
      type:"MediaNeed",consumer:"koios-news-services-section",objective:`story ${i}`,openedAt:`2026-10-04T18:0${i}:00Z`,
      artifacts:[{capability:"source-grounded-short-video",purpose:"short-form-discovery",priority:70,wanted:1,disposition:"conditional",condition:"video receiver"}],
    }});
    recordMediaReadiness({root:dataRoot,mediaNeed:receipt.mediaNeed,ready:true,authority:"koios",basis:"article accepted",at:`2026-10-04T18:1${i}:00Z`});
  }
  const koios=mediaChannelCandidateReadout({repositoryRoot,root:dataRoot,env:{},now:new Date("2026-10-04T19:00:00Z")}).candidates.find((row)=>row.id==="koios-video");
  assert.equal(koios.status,"channel-provisioning-assessment");
  assert.equal(koios.evidence.openShortDemands,6);
  assert.equal(koios.evidence.receiverReadyShortDemands,0);
});
