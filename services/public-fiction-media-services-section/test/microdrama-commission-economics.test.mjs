import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {admitMicrodramaCommission,planMicrodramaCommission,costMicrodramaCommission}
 from '../src/microdrama-commission.mjs';
import {reconcileMicrodramaCommissionOutcomes}
 from '../src/microdrama-commission-economics.mjs';

const digest='ni:///sha-256;'+'A'.repeat(43);
const brief=()=>({
 customer:{actorRef:'https://actors.561.group/client-studio',customerRef:'client:source-contract'},
 work:{seriesId:'source-drama',workingTitle:'Original Shore',
  sourceRef:digest,provenance:'fiction-original'},
 rights:{storyRightsRef:'claim:original-screenplay-rights',
  performanceRightsRef:'claim:synthetic-performers',
  clientPrivacyRef:'claim:private-client-data',syntheticDisclosureRequired:true},
 scope:{
  product:'full-cinematic-series',primaryLanguage:'en',
  subtitleLanguages:['es'],deliverySurfaces:['private-web-screening'],
  episodes:[{id:'episode-one',durationSeconds:90,sourceRef:digest,
   cast:[{id:'rill',voiceRightsRef:'voice:rights-rill',
     designAuthorityRef:'design:source-rill'}],
   shots:Array.from({length:12},(_,i)=>({
    id:'shot-'+String(i+1),billableSeconds:8,audioMode:'embedded-performance',
    referenceNis:[digest],sourceRef:digest})),separateVoiceSeconds:0}]
 },
 receiving:{demandRef:digest,producingOffice:'Causeway Public Fiction'},
 requestedAt:'2026-10-13T17:30:00Z'
});
const card=()=>({
 observedAt:'2026-10-13T17:00:00Z',expiresAt:'2026-10-14T17:00:00Z',
 evidenceRef:'cost:source-quote-claims',currency:'USD',
 rates:[
  ['source-rights-review','commission',15000],
  ['creative-treatment','episode',20000],
  ['character-reference','original-reference',10000],
  ['cinematic-generation','attempt-billable-second',40],
  ['dialogue-recording','performed-second',20],
  ['editorial-master','finished-minute',12000],
  ['localization','language-finished-minute',4000],
  ['release-manufacturing','episode',2500],
  ['private-delivery','authorized-channel-episode',750],
  ['independent-qc','episode',3000]
 ].map(([kind,unit,centsPerUnit])=>({
  kind,unit,centsPerUnit,quoteRef:'provider:quote-'+kind,
  providerId:'source-qualified-provider:'+kind
 }))
});
function observed(){
 const commission=admitMicrodramaCommission(brief());
 const workPlan=planMicrodramaCommission(commission,{maxAttemptsPerShot:3});
 const costScenario=costMicrodramaCommission({plan:workPlan,rateCard:card(),
  quoteAt:'2026-10-13T17:30:00Z',contingencyBasisPoints:2000,
  targetGrossMarginBasisPoints:3000});
 const productionYields=[{type:'MicrodramaProductionYield',
  seriesId:commission.work.seriesId,episodeId:'episode-one',
  acceptedFinishedSeconds:90,acceptedCandidateCount:12,
  rejectedCandidateCount:6,pendingCandidateCount:0,
  status:'FINISHED_FILM_ACCEPTANCE_CLAIM_RECEIVED_NOT_PUBLISHED'}];
 const expenseReceipts=costScenario.breakdown.map((lot,i)=>({
  receiptId:'provider-cash-'+i,worklotId:lot.worklotId,
  amountCents:lot.expectedMaximumCostCents,currency:'USD',state:'settled',
  paymentEvidenceRef:'processor:source-payment-'+i,
  paidAt:'2026-10-13T18:03:00Z'
 }));
 const expenseClosures=workPlan.lots.map((lot,i)=>({
  worklotId:lot.id,complete:true,
  closeoutRef:'independent:cost-review-'+i,authorityRef:'Coesite Finance'
 }));
 const contract={state:'signed-and-accepted',commissionId:commission.id,
  currency:'USD',agreedAmountCents:costScenario.suggestedCustomerQuoteCents,
  customerSignatureVerificationRef:'signature:received-customer-terms',
  producerAcceptanceRef:'Causeway:received',acceptedAt:'2026-10-13T17:40:00Z'};
 const customerReceipts=[{receiptId:'paid-customer-1',commissionId:commission.id,
  amountCents:contract.agreedAmountCents,currency:'USD',state:'settled',
  settlementEvidenceRef:'processor:customer-receipt',
  settledAt:'2026-10-13T18:05:00Z'}];
 return {commission,workPlan,costScenario,productionYields,expenseReceipts,
  expenseClosures,contract,customerReceipts,observedAt:'2026-10-13T19:00:00Z'};
}

test('real cinematic source, reviewed takes, closed worklots and claimed cash remain distinct',()=>{
 const f=observed(),x=reconcileMicrodramaCommissionOutcomes(f);
 assert.equal(x.type,'MicrodramaCommissionObservedEconomics');
 assert.equal(x.fullyProduced,true);
 assert.equal(x.acceptedFinishedSeconds,90);
 assert.equal(x.closedWorklotCount,f.workPlan.lots.length);
 assert.equal(x.reviewedTakeCount,18);
 assert.equal(x.approvedTakeCount,12);
 assert.equal(x.pendingTakeCount,0);
 assert.equal(x.observedTakeAcceptance,.6667);
 assert.ok(x.reviewedTakeWilson95.lower<.6667);
 assert.ok(x.reviewedTakeWilson95.upper>.6667);
 assert.equal(x.settledProviderExpenseClaimsCents,
  f.costScenario.estimatedInputCostCents);
 assert.equal(x.scenarioVarianceClaimsCents,0);
 assert.equal(x.claimedCostPerAcceptedMinuteCents,
  Math.round(f.costScenario.estimatedInputCostCents*60/90));
 assert.equal(x.customerPaidClaims,true);
 assert.equal(x.outstandingCustomerContractCents,0);
 assert.equal(x.unallocatedCustomerCashCents,0);
 assert.equal(x.contributionAfterSettledClaimsCents,
  f.contract.agreedAmountCents-f.costScenario.estimatedInputCostCents);
 assert.equal(x.state,'SOURCE_AND_CASH_CLAIMS_COMPLETE_EXTERNAL_AUTHENTICATION_REQUIRED');
 assert.match(x.limitation,/not authenticated/u);
 assert.equal(reconcileMicrodramaCommissionOutcomes(f).id,x.id);
});

test('pending takes, unfinished film, missing cost closures and partial customer cash never become profit',()=>{
 const f=observed();f.productionYields=[{...f.productionYields[0],
  acceptedFinishedSeconds:0,pendingCandidateCount:3,status:'NO_ACCEPTED_FINISHED_FILM'}];
 f.expenseClosures=[];f.customerReceipts=[];
 const x=reconcileMicrodramaCommissionOutcomes(f);
 assert.equal(x.fullyProduced,false);
 assert.equal(x.pendingTakeCount,3);
 assert.equal(x.closedWorklotCount,0);
 assert.equal(x.claimedCostPerAcceptedMinuteCents,null);
 assert.equal(x.contributionAfterSettledClaimsCents,null);
 assert.equal(x.customerPaidClaims,false);
 assert.equal(x.outstandingCustomerContractCents,f.contract.agreedAmountCents);
 assert.equal(x.state,'HELD_INCOMPLETE_FILM_OR_ECONOMIC_RECEIVING');
});
test('customer overpayment remains a liability, not bonus cinematic margin',()=>{
 const f=observed();f.customerReceipts=[{...f.customerReceipts[0],
  amountCents:f.contract.agreedAmountCents+75}];
 const x=reconcileMicrodramaCommissionOutcomes(f);
 assert.equal(x.unallocatedCustomerCashCents,75);
 assert.equal(x.customerPaidClaims,false);
 assert.equal(x.contributionAfterSettledClaimsCents,null);
});
test('wrong-customer yield, duplicate invoice, subscription credits and modified NI quote are refused',()=>{
 const f=observed();
 assert.throws(()=>reconcileMicrodramaCommissionOutcomes({...f,
  productionYields:[{...f.productionYields[0],seriesId:'another-customer'}]}),
  /foreign or duplicate episode/u);
 assert.throws(()=>reconcileMicrodramaCommissionOutcomes({...f,
  expenseReceipts:[...f.expenseReceipts,f.expenseReceipts[0]]}),
  /already counted/u);
 assert.throws(()=>reconcileMicrodramaCommissionOutcomes({...f,
  expenseReceipts:[{...f.expenseReceipts[0],currency:'Flow credits'}]}),
  /non-USD provider credit/u);
 assert.throws(()=>reconcileMicrodramaCommissionOutcomes({...f,
  costScenario:{...f.costScenario,estimatedInputCostCents:1}}),
  /changed since content-addressed/u);
 assert.throws(()=>reconcileMicrodramaCommissionOutcomes({...f,
  customerReceipts:[{...f.customerReceipts[0],
    settledAt:'2026-10-15T00:00:00Z'}]}),
  /after the claimed observation/u);
});
test('original producer CLI accepts exact source with received claims, never a replacement quote',()=>{
 const f=observed(),root=mkdtempSync(join(tmpdir(),'microdrama-economics-'));
 try{
  const source=join(root,'source.json'),claims=join(root,'claims.json');
  writeFileSync(source,JSON.stringify({commission:f.commission,
   plan:f.workPlan,costScenario:f.costScenario}));
  const {commission:unusedCommission,workPlan:unusedWorkPlan,
   costScenario:unusedScenario,...received}=f;
  writeFileSync(claims,JSON.stringify(received));
  const cli=fileURLToPath(new URL('../apps/plan-microdrama.mjs',import.meta.url));
  const result=JSON.parse(execFileSync(process.execPath,
   [cli,'commission-reconcile',source,claims],
   {encoding:'utf8',timeout:30000}));
  assert.equal(result.id,reconcileMicrodramaCommissionOutcomes(f).id);
  writeFileSync(claims,JSON.stringify({...received,
   commission:{type:'unadmitted-customer-override'}}));
  assert.throws(()=>execFileSync(process.execPath,
   [cli,'commission-reconcile',source,claims],
   {encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe']}),
   /observation cannot override/u);
 }finally{rmSync(root,{recursive:true,force:true});}
});
