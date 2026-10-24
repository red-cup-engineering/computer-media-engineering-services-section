/**
 * The existing producer's observed commercial outcomes: a read-only projection.
 * NOT another sales ledger, financial signer, payment adapter or authority.
 *
 * A booked film minute is not a generated minute. A receipt claim is not
 * authenticated bank/provider settlement. Subscription credits are not USD.
 * A later replay of the same source claims gives exactly the same NI.
 */
import {microdramaContentAddress} from './microdrama-commission.mjs';

const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const check=(ok,message)=>{if(!ok)throw new TypeError(message)};
const string=(x,label)=>{check(typeof x==='string'&&x.trim().length>0&&x.length<=1024,label+' requires bounded text');return x.trim()};
const integer=(x,label,max=Number.MAX_SAFE_INTEGER)=>{
 check(Number.isSafeInteger(x)&&x>=0&&x<=max,label+' requires an exact nonnegative integer');
 return x;
};
const add=(a,b,label)=>{
 const n=a+b;check(Number.isSafeInteger(n),label+' exceeds exact integer precision');return n;
};
const date=(x,label)=>{
 string(x,label);
 check(/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/u.test(x)&&Number.isFinite(Date.parse(x)),
  label+' must name an absolute timestamp');
 const day=x.slice(0,10),utc=new Date(day+'T00:00:00Z');
 check(Number.isFinite(utc.getTime())&&utc.toISOString().slice(0,10)===day,
  label+' must name a real calendar date');
 return x;
};
const original=(value,type,label)=>{
 check(object(value)&&value.type===type&&typeof value.id==='string',
  label+' requires its original typed NI carrier');
 const {id,...body}=value;
 check(microdramaContentAddress(body)===id,label+' changed since content-addressed admission');
 return value;
};
const capped=values=>{
 for(const [name,rows] of Object.entries(values))
  check(Array.isArray(rows)&&rows.length<=20000,name+' must be a bounded evidence set');
};
const roundUnit=(numerator,denominator,label)=>{
 check(denominator>0,label+' requires accepted film');
 const result=(BigInt(numerator)+BigInt(denominator)/2n)/BigInt(denominator);
 check(result<=BigInt(Number.MAX_SAFE_INTEGER),label+' exceeds representable USD cents');
 return Number(result);
};
const wilson=(approved,reviewed)=>{
 if(reviewed<10)return null;
 const z=1.959963984540054,p=approved/reviewed,d=1+z*z/reviewed;
 const c=(p+z*z/(2*reviewed))/d;
 const radius=z*Math.sqrt((p*(1-p)+z*z/(4*reviewed))/reviewed)/d;
 return Object.freeze({
  lower:Math.round(Math.max(0,c-radius)*10000)/10000,
  upper:Math.round(Math.min(1,c+radius)*10000)/10000,
  confidenceLevel:.95,method:'Wilson-score-reviewed-source-takes',
  limitation:'Selective reviewed attempts, model/cast nonstationarity and dependence are not controlled.'
 });
};

/** Consume original work + witnessed claims without booking new events. */
export function reconcileMicrodramaCommissionOutcomes({
 commission,workPlan,costScenario,productionYields=[],expenseReceipts=[],
 expenseClosures=[],contract=null,customerReceipts=[],observedAt
}={}){
 original(commission,'MicrodramaCommission','customer commission');
 original(workPlan,'MicrodramaCommissionWorkPlan','production work plan');
 original(costScenario,'MicrodramaCommissionCostScenario','priced scenario');
 check(workPlan.commissionId===commission.id&&
  costScenario.workPlanId===workPlan.id&&
  costScenario.sourceCommission===commission.id,
  'cannot reconcile unrelated customer, plan or source quote');
 const at=date(observedAt,'observation date');
 const past=(x,label)=>{date(x,label);check(Date.parse(x)<=Date.parse(at),
  label+' is after the claimed observation');return x;};
 capped({productionYields,expenseReceipts,expenseClosures,customerReceipts});
 const episodes=new Map(commission.scope.episodes.map(e=>[e.id,e]));
 check(episodes.size===commission.scope.episodes.length,'duplicate customer episode');
 const seen=new Set();
 let acceptedSeconds=0,approved=0,rejected=0,pending=0;
 for(const y of productionYields){
  check(object(y)&&y.type==='MicrodramaProductionYield'&&
   y.seriesId===commission.work.seriesId&&episodes.has(y.episodeId)&&
   !seen.has(y.episodeId),'film yield belongs to a foreign or duplicate episode');
  seen.add(y.episodeId);
  const planned=integer(episodes.get(y.episodeId).durationSeconds,'episode duration');
  const seconds=integer(y.acceptedFinishedSeconds,'accepted source film seconds',planned);
  check(seconds===0||(seconds===planned&&
    y.status==='FINISHED_FILM_ACCEPTANCE_CLAIM_RECEIVED_NOT_PUBLISHED'),
   'unfinished episode does not count as independently accepted film');
  acceptedSeconds=add(acceptedSeconds,seconds,'accepted film duration');
  approved=add(approved,integer(y.acceptedCandidateCount,'approved source takes',100000),'approved take count');
  rejected=add(rejected,integer(y.rejectedCandidateCount,'rejected source takes',100000),'rejected take count');
  pending=add(pending,integer(y.pendingCandidateCount,'unreviewed source takes',100000),'pending take count');
 }
 const fullyProduced=seen.size===episodes.size&&
  productionYields.every(y=>y.acceptedFinishedSeconds===episodes.get(y.episodeId).durationSeconds);
 const reviewed=add(approved,rejected,'reviewed take count');
 const lots=new Set(workPlan.lots.map(x=>x.id));
 check(lots.size===workPlan.lots.length,'work plan contains duplicate worklot identities');
 let expenseCents=0;
 const expenseIds=new Set();
 for(const x of expenseReceipts){
  check(object(x),'expense must carry a provider settlement receipt');
  const id=string(x.receiptId,'provider settlement identity');
  check(!expenseIds.has(id),'provider settlement receipt was already counted');
  expenseIds.add(id);
  check(lots.has(x.worklotId),'provider receipt is not for this commission worklot');
  check(x.currency==='USD'&&x.state==='settled',
   'unpaid or non-USD provider credit is not settled dollars');
  string(x.paymentEvidenceRef,'independent provider settlement reference');
  past(x.paidAt,'provider paidAt');
  expenseCents=add(expenseCents,integer(x.amountCents,'provider settled cents'),'settled expense');
 }
 const closed=new Set();
 for(const x of expenseClosures){
  check(object(x)&&lots.has(x.worklotId)&&!closed.has(x.worklotId),
   'expense closure must name one original worklot once');
  check(x.complete===true,'provider cost completeness cannot be speculative');
  string(x.closeoutRef,'independent cost completeness witness');
  string(x.authorityRef,'finance receiving actor');
  closed.add(x.worklotId);
 }
 const allCostsClosed=closed.size===lots.size;
 const hasContract=contract!==null;
 let agreedCents=null;
 if(hasContract){
  check(object(contract)&&contract.commissionId===commission.id&&
   contract.state==='signed-and-accepted'&&contract.currency==='USD',
   'customer contract must name this original commission and USD consideration');
  agreedCents=integer(contract.agreedAmountCents,'signed customer price cents');
  string(contract.customerSignatureVerificationRef,'signed customer agreement witness');
  string(contract.producerAcceptanceRef,'producer agreement witness');
  past(contract.acceptedAt,'contract acceptance');
 }
 let collectedCents=0;
 const collectedIds=new Set();
 for(const x of customerReceipts){
  check(object(x)&&hasContract&&x.commissionId===commission.id&&
   x.currency==='USD'&&x.state==='settled',
   'no unsigned or unpaid customer payment is earned income');
  const id=string(x.receiptId,'customer receipt identity');
  check(!collectedIds.has(id),'customer settlement cannot be counted twice');
  collectedIds.add(id);
  string(x.settlementEvidenceRef,'independent payment settlement reference');
  past(x.settledAt,'customer settledAt');
  collectedCents=add(collectedCents,
   integer(x.amountCents,'customer settled cents'),'customer receipts');
 }
 // A partial payment does not settle the contract. Extra cash may need refund
 // or reallocation and is NOT extra earned production revenue.
 const unallocatedCustomerCashCents=hasContract?
  Math.max(0,collectedCents-agreedCents):0;
 const outstandingCustomerContractCents=hasContract?
  Math.max(0,agreedCents-collectedCents):null;
 const fullyCostedFilmClaims=fullyProduced&&allCostsClosed&&pending===0;
 const customerPaidClaims=hasContract&&collectedCents===agreedCents;
 const claimedCloseoutComplete=fullyCostedFilmClaims&&customerPaidClaims;
 const costPerAcceptedMinuteCents=fullyCostedFilmClaims&&acceptedSeconds>0?
  roundUnit(BigInt(expenseCents)*60n,acceptedSeconds,'cost per accepted minute'):null;
 const scenarioVarianceCents=allCostsClosed&&
  Number.isSafeInteger(costScenario.estimatedInputCostCents)?
  expenseCents-costScenario.estimatedInputCostCents:null;
 const contributionClaimsCents=claimedCloseoutComplete?
  collectedCents-expenseCents:null;
 let contributionMarginBasisPoints=null;
 if(claimedCloseoutComplete&&collectedCents>0){
  // Rational first: cents and units never silently round through float math.
  const bps=(BigInt(contributionClaimsCents)*10000n)/BigInt(collectedCents);
  if(bps>=BigInt(Number.MIN_SAFE_INTEGER)&&
     bps<=BigInt(Number.MAX_SAFE_INTEGER))
   contributionMarginBasisPoints=Number(bps);
 }
 const body={
  type:'MicrodramaCommissionObservedEconomics',version:1,
  commissionId:commission.id,workPlanId:workPlan.id,scenarioId:costScenario.id,
  observedAt:at,episodeCount:episodes.size,receivedFilmYieldCount:seen.size,
  acceptedFinishedSeconds:acceptedSeconds,fullyProduced,
  approvedTakeCount:approved,rejectedTakeCount:rejected,pendingTakeCount:pending,
  reviewedTakeCount:reviewed,
  observedTakeAcceptance:reviewed===0?null:Math.round(approved*10000/reviewed)/10000,
  reviewedTakeWilson95:wilson(approved,reviewed),
  closedWorklotCount:closed.size,totalWorklots:lots.size,
  missingExpenseCloseouts:Object.freeze([...lots].filter(id=>!closed.has(id))),
  settledProviderExpenseClaimsCents:expenseCents,
  quotedInputCostCents:costScenario.estimatedInputCostCents,
  scenarioVarianceClaimsCents:scenarioVarianceCents,
  claimedCostPerAcceptedMinuteCents:costPerAcceptedMinuteCents,
  signedCustomerPriceClaimsCents:agreedCents,
  collectedCustomerPaymentClaimsCents:collectedCents,
  outstandingCustomerContractCents,unallocatedCustomerCashCents,
  contributionAfterSettledClaimsCents:contributionClaimsCents,
  contributionMarginBasisPoints,
  fullyCostedFilmClaims,customerPaidClaims,
  state:claimedCloseoutComplete?
   'SOURCE_AND_CASH_CLAIMS_COMPLETE_EXTERNAL_AUTHENTICATION_REQUIRED':
   'HELD_INCOMPLETE_FILM_OR_ECONOMIC_RECEIVING',
  limitation:'Claims and receipt references are not authenticated provider/bank transactions, independent narrative/cultural review, signed customer settlement or public delivery. No Google Flow credit is exchanged for USD. Forecasts, pending takes, invoices, private drafts and customer overpayments are not profit. Reviewed-take Wilson bounds are descriptive only.'
 };
 return Object.freeze({id:microdramaContentAddress(body),...body});
}
