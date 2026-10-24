/**
 * One customer-facing commission compiler for the EXISTING Causeway fiction
 * production service, not another studio, script canon, price database or
 * marketplace. Builds source/rights-bound requirements and costable worklots.
 *
 * It distinguishes three events: (1) what a customer asks for, (2) which
 * observed costs can be estimated, (3) which work providers and reviewers
 * have actually accepted. None implies a purchase, authorized public release,
 * an independently proven cultural authority or successful acting.
 *
 * Upstream interfaces:
 * - Causeway MicrodramaProductionProposal, editorial, EBU and release package
 * - Coesite Capability Marketplace provider-market jobs and qualifications
 * - Red Cup Flow/Veo media, original performed sound and source custody
 * - Independent rights/editing/cultural receiving and customer payment
 */
import {createHash} from 'node:crypto';
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const ensure=(yes,message)=>{if(!yes)throw new TypeError(message)};
const requireText=(v,label,max=1000)=>{
 ensure(typeof v==='string'&&v.trim().length>0&&v.length<=max,
  label+' requires bounded nonempty text');
 return v.trim();
};
const NI=/^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
const SOURCE=/^(?:ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}|sha256:[a-f0-9]{64}|git:[a-f0-9]{40})$/u;
const SLUG=/^[a-z][a-z0-9-]{0,79}$/u;
const LANG=/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,3}$/u;
const MODES=new Set(['fiction-original','licensed-adaptation','contributor-governed']);
const PRODUCTS=new Set(['full-cinematic-series','edit-received-footage','localize-and-release']);
const CHANNELS=new Set(['private-web-screening','private-youtube-draft','activitypub-agent-reader']);
const AUDIO=new Set(['embedded-performance','separate-voice']);
const CAPABILITIES=Object.freeze({
 'source-rights-review':['media-rights-clearance','consent-review'],
 'creative-treatment':['microdrama-screenwriting','dramaturgy'],
 'character-reference':['original-character-design','visual-continuity'],
 'scene-composition':['original-scene-composition','multi-character-visual-continuity'],
 'cinematic-generation':['reference-conditioned-video','cinematic-performance'],
 'dialogue-recording':['acted-dialogue','speech-rights'],
 'editorial-master':['nonlinear-editing','sound-mixing','cinematic-continuity'],
 'localization':['subtitle-translation','timed-text-accessibility'],
 'release-manufacturing':['video-delivery-manufacturing','media-quality-control'],
 'private-delivery':['private-channel-receiving','media-distribution'],
 'independent-qc':['independent-film-review','copyright-and-consent-review']
});
const UNITS=Object.freeze({
 'source-rights-review':'commission',
 'creative-treatment':'episode',
 'character-reference':'original-reference',
 'scene-composition':'original-composed-reference',
 'cinematic-generation':'attempt-billable-second',
 'dialogue-recording':'performed-second',
 'editorial-master':'finished-minute',
 'localization':'language-finished-minute',
 'release-manufacturing':'episode',
 'private-delivery':'authorized-channel-episode',
 'independent-qc':'episode'
});
const frozen=v=>Object.freeze(v);
const canonical=v=>{
 if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';
 if(isObject(v))return '{'+Object.keys(v).sort().filter(k=>v[k]!==undefined)
  .map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
 return JSON.stringify(v);
};
const ni=v=>'ni:///sha-256;'+createHash('sha256').update(canonical(v)).digest('base64url');
const exactRef=(v,label,max=150)=>{
 const value=requireText(v,label,max);
 ensure(SOURCE.test(value),label+' must identify an exact source revision');
 return value;
};
const int=(v,label,min,max)=>{
 ensure(Number.isSafeInteger(v)&&v>=min&&v<=max,
  label+' requires an integer between '+min+' and '+max);
 return v;
};
const language=(v,label)=>{
 const x=requireText(v,label,30);
 ensure(LANG.test(x),label+' requires a valid BCP47-style tag');
 return x;
};
const slug=(v,label)=>{
 const x=requireText(v,label,80);
 ensure(SLUG.test(x),label+' must be a stable lowercase slug');
 return x;
};
const unique=(list,key,label)=>{
 const seen=new Set();
 for(const x of list){
  const identity=key(x);
  ensure(!seen.has(identity),'duplicate '+label+': '+identity);
  seen.add(identity);
 }
};
const money=(n,label)=>int(n,label,0,Number.MAX_SAFE_INTEGER);
const positiveDate=(value,label)=>{
 const date=requireText(value,label,45);
 ensure(Number.isFinite(Date.parse(date))&&date.includes('T')&&
  /(?:Z|[+-]\d\d:\d\d)$/u.test(date),label+' needs offset-aware ISO 8601');
 return date;
};
const enterpriseKinds=['studio-produced','client-supplied'];
/**
 * Intake is confidential customer SOURCE DATA, never a publicly published
 * ActivityPub offer or signed contract. No cast or cultural authority is
 * imported from another client or from fictional paracosm characters.
 */
export function admitMicrodramaCommission({
 customer,work,rights,scope,receiving,requestedAt
}={}){
 ensure(isObject(customer)&&isObject(work)&&isObject(rights)&&
  isObject(scope)&&isObject(receiving),'commission needs five real customer/work/legal/scope/receiving objects');
 const actor=requireText(customer.actorRef,'customer ActivityPub/actor identity',500);
 const customerName=requireText(customer.customerRef,'client relationship identifier',500);
 const workRef=exactRef(work.sourceRef,'canonical story source');
 const workId=slug(work.seriesId,'series ID');
 const title=requireText(work.workingTitle,'customer story title',200);
 const provenance=requireText(work.provenance,'source legal regime',100);
 ensure(MODES.has(provenance),'unknown original/adaptation/contributor regime');
 const permission={
  storyRightsRef:requireText(rights.storyRightsRef,'original story/adaptation rights'),
  performanceRightsRef:requireText(rights.performanceRightsRef,'actor/voice/synthetic-performance rights'),
  adaptationRef:provenance==='licensed-adaptation'?
   requireText(rights.adaptationRef,'third-party adaptation rights'):rights.adaptationRef??null,
  contributorAuthorityRef:provenance==='contributor-governed'?
   requireText(rights.contributorAuthorityRef,'contributor creative authority'):null,
  syntheticDisclosureRequired:rights.syntheticDisclosureRequired===true,
  clientPrivacyRef:requireText(rights.clientPrivacyRef,'client private media handling agreement')
 };
 ensure(permission.syntheticDisclosureRequired,'commission needs an explicit synthetic-media disclosure policy');
 const product=requireText(scope.product,'commission product');
 ensure(PRODUCTS.has(product),'unknown microdrama service product');
 ensure(Array.isArray(scope.episodes)&&scope.episodes.length>=1&&scope.episodes.length<=24,
  'commission needs 1–24 specifically named episode requirements');
 const episodes=scope.episodes.map((episode,index)=>{
  ensure(isObject(episode),'episode must be a structured customer requirement');
  const id=slug(episode.id,'episode identity');
  const sourceRef=exactRef(episode.sourceRef??workRef,'episode screenplay revision');
  const maxEpisodeSeconds=product==='full-cinematic-series'?180:240;
   const durationSeconds=int(episode.durationSeconds,'authorized finished film seconds',30,maxEpisodeSeconds);
  const cast=episode.cast??[];
  ensure(Array.isArray(cast)&&cast.length<=25,'cast must be a bounded original character set');
  const actors=cast.map(x=>{
   ensure(isObject(x),'cast member must be an object');
   const charId=slug(x.id,'cast identity');
   const voiceRights= requireText(x.voiceRightsRef,'character voice/performance authorization');
   const roleRef=requireText(x.designAuthorityRef,'character visual authority');
   // A deliberate new visible incarnation is allowed, but ONLY as a
   // source-owned revision with a separate accountable transformation decision.
   // A changing provider image must never silently rewrite recurring canon.
   const lookRevisionRef=x.lookRevisionRef?
    exactRef(x.lookRevisionRef,'intentional visual look revision'):null;
   const transformationAuthorityRef=lookRevisionRef?
    requireText(x.transformationAuthorityRef,'visual transformation creative authority'):null;
   return frozen({id:charId,voiceRightsRef:voiceRights,
    designAuthorityRef:roleRef,
    ...(lookRevisionRef?{lookRevisionRef,transformationAuthorityRef}:{}),
    ...(x.acceptedReferenceNi?{acceptedReferenceNi:exactRef(x.acceptedReferenceNi,'visual reference')}: {})});
  });
  unique(actors,x=>x.id,'cast');
  const shots=episode.shots??[];
  ensure(Array.isArray(shots)&&shots.length<=160,'episode shots must be a bounded plan');
  const jobs=shots.map(shot=>{
   ensure(isObject(shot),'shot must be a structured source-bound plan');
   const id=slug(shot.id,'source shot ID');
   const seconds=int(shot.billableSeconds,'provider-billable shot seconds',1,32);
   const mode=requireText(shot.audioMode,'scene audio mode',40);
   ensure(AUDIO.has(mode),'shot must choose source-performed or separate-dialogue sound');
   const requiredReferenceNis=shot.referenceNis??[];
   ensure(Array.isArray(requiredReferenceNis)&&requiredReferenceNis.length<=24,
    'source shot may name at most 24 exact original visual identities');
   const sourceCast=shot.castIds??[];
   ensure(Array.isArray(sourceCast)&&sourceCast.length<=25,
    'original shot cast identities must be bounded');
   const castIds=sourceCast.map(x=>slug(x,'original acted character'));
   unique(castIds,x=>x,'original performed cast role');
   ensure(castIds.every(x=>actors.some(actor=>actor.id===x)),
    'source shot cast must belong to the independently admitted original episode');
   const refs=requiredReferenceNis.map(v=>exactRef(v,'shot visual reference'));
   ensure(refs.every(ref=>NI.test(ref)),
    'source film visual reference is an exact physical image SHA-256 NI, not an unreceived story commit');
   unique(refs,x=>x,'shot visual reference');
   let sceneComposition=null;
   if(shot.sceneComposition!==undefined){
    ensure(refs.length>3,
     'source composition is only required when more than three visual identities appear');
    ensure(isObject(shot.sceneComposition),'composed original scene must be structured');
    const c=shot.sceneComposition;
    ensure(castIds.length>=2,
     'source-composed original ensemble needs at least two named actual characters');
    const compositionId=slug(c.id,'original composed scene asset identity');
    const compositionSource=exactRef(c.sourceRef,'composed scene original source revision');
    const rightsRef=requireText(c.rightsRef,'original composed image usage rights',600);
    const creativeAuthorityRef=requireText(c.creativeAuthorityRef,
     'independent director composition authority',600);
    const acceptedReferenceNi=c.acceptedReferenceNi?
     exactRef(c.acceptedReferenceNi,'approved original ensemble source image'):null;
    if(acceptedReferenceNi)ensure(NI.test(acceptedReferenceNi),
     'accepted original composed scene artwork must have physical SHA-256 NI');
    sceneComposition=frozen({
     id:compositionId,sourceRef:compositionSource,rightsRef,creativeAuthorityRef,
     acceptedReferenceNi
    });
   }
   return frozen({id,billableSeconds:seconds,audioMode:mode,
    referenceNis:frozen(refs),castIds:frozen(castIds),
    ...(sceneComposition?{sceneComposition}:{}),
    sourceRef:exactRef(shot.sourceRef??sourceRef,'shot scripted source')});
  });
  unique(jobs,x=>x.id,'film shot');
  // The number of voice seconds is an EDITORIAL INPUT; never invent dialogue
  // duration or assume that already filmed sound needs a second voice.
  const performedSeconds=int(episode.separateVoiceSeconds??0,'planned separately voiced seconds',0,durationSeconds);
  if(product!=='full-cinematic-series')
   ensure(jobs.length===0&&performedSeconds===0,
    'postproduction and localization cannot commission fresh AI shot or voice generation');
  return frozen({id,sourceRef,durationSeconds,cast:frozen(actors),shots:frozen(jobs),
   separateVoiceSeconds:performedSeconds,
   ...(episode.acceptedFilmSha256?
    {acceptedFilmSha256:requireText(episode.acceptedFilmSha256,'reviewed input MP4 digest',64)}:{})});
 });
 unique(episodes,x=>x.id,'episode');
 if(product==='full-cinematic-series'){
  ensure(episodes.every(e=>e.cast.length>0),'full series work needs named original cast');
 }else{
  ensure(episodes.every(e=>e.acceptedFilmSha256&&/^[a-f0-9]{64}$/u.test(e.acceptedFilmSha256)),
   'editing/localization needs actual source film identity, not a new generation proposal');
 }
 const primaryLanguage=language(scope.primaryLanguage,'original performance language');
 const languages=scope.subtitleLanguages??[];
 ensure(Array.isArray(languages)&&languages.length<=12,'localization must be bounded');
 const localization=languages.map(x=>language(x,'subtitle language'));
 unique(localization,x=>x,'subtitle language');
 ensure(!localization.includes(primaryLanguage),'do not duplicate the original caption language');
 const surfaces=scope.deliverySurfaces??[];
 ensure(Array.isArray(surfaces)&&surfaces.length>=1&&surfaces.length<=3,
  'receiving must name authorized delivery surfaces');
 const distribution=surfaces.map(x=>{
  ensure(CHANNELS.has(x),'unknown delivery surface (publishing cannot be invented)');
  return x;
 });
 unique(distribution,x=>x,'delivery surface');
 const demandId=exactRef(receiving.demandRef,'original customer demand');
 const office=requireText(receiving.producingOffice,'consumer production office');
 const inquiry=positiveDate(requestedAt,'commission intake date');
 const body={
  type:'MicrodramaCommission',version:1,
  customer:frozen({actorRef:actor,customerRef:customerName}),
  work:frozen({seriesId:workId,title,sourceRef:workRef,provenance}),
  rights:frozen(permission),
  scope:frozen({product,primaryLanguage,
   episodes:frozen(episodes),subtitleLanguages:frozen(localization),
   deliverySurfaces:frozen(distribution)}),
  receiving:frozen({demandRef:demandId,producingOffice:office}),
  requestedAt:inquiry,
  acceptanceState:'SOURCE_AND_RIGHTS_CLAIMS_UNVERIFIED'
 };
 return frozen({id:ni(body),...body});
}
function lot({id,kind,quantity,episodeId=null,sourceRef,detail,requiredReferences=[],
 actorId=null,lookRevisionRef=null,sceneCompositionId=null}){
 ensure(CAPABILITIES[kind]&&Number.isSafeInteger(quantity)&&quantity>=1,
  'invalid commercial worklot kind/quantity');
 const job={
  id,kind,unit:UNITS[kind],quantity,episodeId,sourceRef,detail,
  ...(actorId?{actorId,lookRevisionRef}:{}),
  ...(sceneCompositionId?{sceneCompositionId}:{}),
  requiredCapabilities:frozen([...CAPABILITIES[kind]]),
  requiredReferences:frozen([...requiredReferences]),
  state:'PROPOSED_REQUIRES_QUALIFIED_FULFILLMENT'
 };
 return frozen(job);
}
const mins=s=>Math.ceil(s/60);
/** These are actual conditional hireable services within the existing studio. */
export function planMicrodramaCommission(commission,{
 maxAttemptsPerShot
}={}){
 ensure(commission?.type==='MicrodramaCommission'&&commission.version===1,
  'source-owned commission intake must precede procurement');
 // Set by the production/customer agreement, NEVER a guessed success rate.
 const attempts=int(maxAttemptsPerShot,'authorized maximum video attempts per shot',1,8);
 const lots=[],holds=[],source=commission.work.sourceRef;
 const prefix=commission.work.seriesId;
 // These two maps are across the WHOLE client series, not episode-local.
 // "same cast" is not "please buy another character reference every episode".
 const recurringRoles=new Map(),visualVariants=new Map(),sceneReferences=new Map();
 lots.push(lot({id:prefix+'-rights',kind:'source-rights-review',
  quantity:1,sourceRef:source,detail:'Original/adaptation/performance/consent review by independent authority'}));
 for(const ep of commission.scope.episodes){
  const epPrefix=prefix+'-'+ep.id;
  const details='Original episode '+ep.id+', '+ep.durationSeconds+' seconds';
  if(commission.scope.product==='full-cinematic-series'){
   lots.push(lot({id:epPrefix+'-story',kind:'creative-treatment',
    quantity:1,episodeId:ep.id,sourceRef:ep.sourceRef,detail:details}));
   // Canonical identity and voice authority persist across the customer's
   // episodes. An explicitly sourced, separately authorized metamorphosis
   // may introduce a new VISUAL variant, but never a new unapproved person.
   for(const actor of ep.cast){
    const priorRole=recurringRoles.get(actor.id);
    if(priorRole&&(priorRole.voiceRightsRef!==actor.voiceRightsRef||
      priorRole.designAuthorityRef!==actor.designAuthorityRef))
     holds.push('recurring-character-identity-or-rights-conflict:'+actor.id+':'+ep.id);
    else if(!priorRole)recurringRoles.set(actor.id,actor);
    const variantKey=actor.id+'\u0000'+(actor.lookRevisionRef??'original');
    const priorVariant=visualVariants.get(variantKey);
    if(priorVariant){
     if((priorVariant.acceptedReferenceNi??null)!==(actor.acceptedReferenceNi??null)||
        (priorVariant.transformationAuthorityRef??null)!==
        (actor.transformationAuthorityRef??null))
      holds.push('recurring-visual-reference-conflict:'+actor.id+':'+ep.id);
     continue;
    }
    visualVariants.set(variantKey,actor);
    if(!actor.acceptedReferenceNi){
     // An intentional transformation has its own source-linked reference
     // worklot; repeated shots/episodes of the SAME revision reuse it.
     const suffix=actor.lookRevisionRef?
      '-look-'+ni(actor.lookRevisionRef).split(';')[1].slice(0,12):'';
     lots.push(lot({id:epPrefix+'-'+actor.id+suffix+'-reference',
      kind:'character-reference',actorId:actor.id,
      lookRevisionRef:actor.lookRevisionRef??null,
      quantity:1,episodeId:ep.id,sourceRef:actor.lookRevisionRef??ep.sourceRef,
      detail:'Approve the original '+actor.id+' exact reference once for the series'+
       (actor.lookRevisionRef?' / independently authorized visual transformation':'')}));
    }
   }
   if(ep.shots.length===0)holds.push('unbudgeted-shot-breakdown:'+ep.id);
   const totalShotSeconds=ep.shots.reduce((n,x)=>n+x.billableSeconds,0);
   if(totalShotSeconds<ep.durationSeconds)
    holds.push('source-footage-shorter-than-finished-episode:'+ep.id);
   for(const shot of ep.shots){
    if(shot.referenceNis.length>3&&!shot.sceneComposition)
     holds.push('source-ensemble-requires-accepted-group-reference:'+ep.id+':'+shot.id);
    const scene=shot.sceneComposition;
    if(scene){
     // One already existing actor/setting composition may be reused only
     // when its original source, covered characters, creative grant, rights
     // and accepted physical NI are identical across all served shots.
     const signature=ni({sourceRef:scene.sourceRef,rightsRef:scene.rightsRef,
      creativeAuthorityRef:scene.creativeAuthorityRef,
      acceptedReferenceNi:scene.acceptedReferenceNi,
      castIds:[...shot.castIds].sort(),originalVisuals:[...shot.referenceNis].sort()});
     const existing=sceneReferences.get(scene.id);
     if(existing){
      if(existing.signature!==signature)
       holds.push('composition-reuse-changed-source-roles-or-rights:'+ep.id+':'+shot.id);
     }else{
      const lotId=epPrefix+'-'+scene.id+'-scene-composition';
      sceneReferences.set(scene.id,{signature,lotId});
      if(!scene.acceptedReferenceNi)
       lots.push(lot({id:lotId,kind:'scene-composition',quantity:1,
        episodeId:ep.id,sourceRef:scene.sourceRef,
        sceneCompositionId:scene.id,requiredReferences:shot.referenceNis,
        detail:'One independently accepted original ensemble scene portrait for cast '+
         shot.castIds.join(', ')}));
     }
    }
    lots.push(lot({id:epPrefix+'-'+shot.id+'-cinema',
     kind:'cinematic-generation',
     quantity:shot.billableSeconds*attempts,
     episodeId:ep.id,sourceRef:shot.sourceRef,
     detail:'Maximum '+attempts+' billable attempts at '+shot.billableSeconds+
      's for original shot '+shot.id+' (success not guaranteed)',
     requiredReferences:shot.referenceNis}));
   }
   if(ep.separateVoiceSeconds>0)
    lots.push(lot({id:epPrefix+'-voice',kind:'dialogue-recording',
     quantity:ep.separateVoiceSeconds,episodeId:ep.id,
     sourceRef:ep.sourceRef,detail:'Separately performed/approved spoken duration; excludes embedded performance'}));
  }
  if(commission.scope.product!=='localize-and-release')
   lots.push(lot({id:epPrefix+'-master',kind:'editorial-master',
    quantity:mins(ep.durationSeconds),episodeId:ep.id,
    sourceRef:ep.sourceRef,detail:'One mixed, subtitled and independently reviewed cinematic final edit'}));
  for(const lang of commission.scope.subtitleLanguages)
   lots.push(lot({id:epPrefix+'-captions-'+lang.toLowerCase(),kind:'localization',
    quantity:mins(ep.durationSeconds),episodeId:ep.id,
    sourceRef:ep.sourceRef,detail:'Rights-reviewed '+lang+' subtitles and transcript'}));
  lots.push(lot({id:epPrefix+'-deliverables',kind:'release-manufacturing',
   quantity:1,episodeId:ep.id,sourceRef:ep.sourceRef,
   detail:'Exact finished film, poster, HLS, subtitle tracks, accessible screening, reviewed teaser'}));
  for(const surface of commission.scope.deliverySurfaces)
   lots.push(lot({id:epPrefix+'-delivery-'+surface,kind:'private-delivery',
    quantity:1,episodeId:ep.id,sourceRef:ep.sourceRef,
    detail:'Separate receiving and publishing authorization for '+surface}));
  lots.push(lot({id:epPrefix+'-final-qc',kind:'independent-qc',
   quantity:1,episodeId:ep.id,sourceRef:ep.sourceRef,
   detail:'Separate finished audiovisual continuity, rights and technical receiving'}));
 }
 unique(lots,x=>x.id,'commission worklot');
 const body={
  type:'MicrodramaCommissionWorkPlan',version:1,
  commissionId:commission.id,seriesId:commission.work.seriesId,
  workRef:source,producingOffice:commission.receiving.producingOffice,
  customerActor:commission.customer.actorRef,
  lots:frozen(lots),attemptCeiling:attempts,
  episodeShots:frozen(commission.scope.episodes.map(ep=>frozen({
   episodeId:ep.id,shots:frozen(ep.shots.map(shot=>frozen({
    shotId:shot.id,castIds:shot.castIds,
    sourceRef:shot.sourceRef,referenceNis:shot.referenceNis,
    ...(shot.sceneComposition?{sceneComposition:shot.sceneComposition}:{})
   })))
  }))),
  episodeCast:frozen(commission.scope.episodes.map(ep=>frozen({
   episodeId:ep.id,
   actors:frozen(ep.cast.map(actor=>frozen({
    id:actor.id,lookRevisionRef:actor.lookRevisionRef??null,
    acceptedReferenceNi:actor.acceptedReferenceNi??null
   })))
  }))),
  holds:frozen(holds),
  state:holds.length?'HELD_INCOMPLETE_SOURCE_PLAN':'COSTABLE_NOT_ADMITTED_FOR_EXECUTION'
 };
 return frozen({id:ni(body),...body});
}
export function projectMicrodramaCapabilityJobs(plan,{
 relationshipModes=['competitor','potential-partner','subcontractor-candidate',
  'referral-destination','white-label-provider']
}={}){
 ensure(plan?.type==='MicrodramaCommissionWorkPlan','worklot projection needs original plan');
 ensure(Array.isArray(relationshipModes)&&relationshipModes.length>0,
  'real customer must admit contractor relationship modes');
 const allowed=new Set(['competitor','potential-partner','prime-candidate',
  'subcontractor-candidate','referral-destination','white-label-provider']);
 const modes=[...new Set(relationshipModes)];
 ensure(modes.every(x=>allowed.has(x)),'provider relationship mode is unsupported');
 return frozen(plan.lots.map(lot=>frozen({
  jobId:lot.id,workRef:lot.sourceRef,
  requiredCapabilities:lot.requiredCapabilities,
  relationshipModes:frozen(modes),
  remoteRequired:true,
  consumerActor:plan.customerActor,
  sourceCommission:plan.commissionId,
  requiredOutputUnit:lot.unit,quantity:lot.quantity,
  executionAuthority:'WORK_SPECIFIC_PROVIDER_QUALIFICATION_AND_ACCEPTED_CUSTOMER_ORDER_REQUIRED'
 })));
}
/**
 * A *cost scenario* from observed source-bound rate evidence. This is not a
 * market price, x402 sale, signed customer offer, or provider commitment.
 *
 * USD cents are intentionally NOT exchanged with Flow subscription credits:
 * a Flow credit amount cannot be inserted as a USD tariff.
 */
export function costMicrodramaCommission({
 plan,rateCard,contingencyBasisPoints,targetGrossMarginBasisPoints,
 quoteAt
}={}){
 ensure(plan?.type==='MicrodramaCommissionWorkPlan','exact production work plan required');
 ensure(isObject(rateCard)&&Array.isArray(rateCard.rates),
  'measured provider/role rate book is required');
 const observedAt=positiveDate(rateCard.observedAt,'rate observation');
 const expiresAt=positiveDate(rateCard.expiresAt,'rate expiration');
 const now=positiveDate(quoteAt,'quote timestamp');
 const contingency=int(contingencyBasisPoints,'explicit contingency basis points',0,10000);
 const grossMargin=int(targetGrossMarginBasisPoints,'target gross margin basis points',0,7000);
 const blockers=[...plan.holds],rates=new Map();
 if(Date.parse(now)<Date.parse(observedAt)||Date.parse(now)>=Date.parse(expiresAt))
  blockers.push('observed-rate-card-not-current');
 if(rateCard.currency!=='USD')blockers.push('unsupported-currency-no-automatic-credit-to-USD-conversion');
 const rateCardEvidence=requireText(rateCard.evidenceRef,'current rate card evidence reference');
 for(const row of rateCard.rates){
  ensure(isObject(row),'each quoted source rate needs a structured record');
  const kind=requireText(row.kind,'service capability role');
  ensure(CAPABILITIES[kind],'unknown rate card worklot type');
  const unit=requireText(row.unit,'service rate unit');
  ensure(unit===UNITS[kind],'rate unit must agree with actual service quantity');
  ensure(!rates.has(kind),'rate card must not contain ambiguous duplicate prices');
  const cents=money(row.centsPerUnit,'USD cents per observed unit');
  const basis=requireText(row.quoteRef,'independent provider price/offer observation');
  rates.set(kind,{kind,unit,centsPerUnit:cents,quoteRef:basis,
   providerId:requireText(row.providerId,'specific execution provider')});
 }
 const breakdown=[];
 let costs=0;
 for(const lot of plan.lots){
  const rate=rates.get(lot.kind);
  if(!rate){blockers.push('unknown-rate:'+lot.kind);continue}
  const subtotal=lot.quantity*rate.centsPerUnit;
  ensure(Number.isSafeInteger(subtotal)&&Number.isSafeInteger(costs+subtotal),
   'commission pricing exceeds safe monetary precision');
  costs+=subtotal;
  breakdown.push(frozen({worklotId:lot.id,kind:lot.kind,unit:lot.unit,quantity:lot.quantity,
   quotedRateCents:rate.centsPerUnit,sourceRateRef:rate.quoteRef,providerId:rate.providerId,
   expectedMaximumCostCents:subtotal}));
 }
 const ready=blockers.length===0;
 const buffered=ready?Math.ceil(costs*(10000+contingency)/10000):null;
 const price=ready?Math.ceil(buffered*10000/(10000-grossMargin)):null;
 if(ready)ensure(Number.isSafeInteger(price)&&Number.isSafeInteger(buffered),
  'priced commission exceeds safe integer range');
 const body={
  type:'MicrodramaCommissionCostScenario',version:1,
  workPlanId:plan.id,sourceCommission:plan.commissionId,sourceRateRef:rateCardEvidence,
  observedAt,expiresAt,quoteAt:now,currency:'USD',
  contingencyBasisPoints:contingency,targetGrossMarginBasisPoints:grossMargin,
  breakdown:frozen(breakdown),
  estimatedInputCostCents:ready?costs:null,
  maximumBudgetedCostCents:buffered,
  suggestedCustomerQuoteCents:price,
  missing:frozen([...new Set(blockers)].sort()),
  state:ready?'COSTED_SCENARIO_AWAITING_CUSTOMER_PROVIDER_AND_RIGHTS_ACCEPTANCE':
   'HELD_UNPRICED_OR_INCOMPLETE_PRODUCTION',
  caveat:'Observed provider/labor quotes are claims; no real provider acceptance, success probability, rights grant, Flow-credit conversion, payment or customer order is established.'
 };
 return frozen({id:ni(body),...body});
}
/** Customer-negotiated milestone weights, never universal forced down payments. */
export function projectMicrodramaMilestones({
 commission,costScenario,milestones
}={}){
 ensure(commission?.type==='MicrodramaCommission'&&
  costScenario?.sourceCommission===commission.id,
  'milestones must come from same customer commission and source-priced scenario');
 ensure(costScenario.state.startsWith('COSTED_')&&
  Number.isSafeInteger(costScenario.suggestedCustomerQuoteCents),
  'cannot schedule financial obligations for unpriced media');
 ensure(Array.isArray(milestones)&&milestones.length>=2&&milestones.length<=8,
  'customer terms must specify 2–8 independently accepted milestones');
 let total=0;const normalized=milestones.map(row=>{
  ensure(isObject(row),'payment milestone needs a row');
  const name=slug(row.id,'milestone identity');
  const percent=int(row.basisPoints,'contract milestone share',1,10000);
  total+=percent;
  return frozen({id:name,basisPoints:percent,
   acceptanceRef:requireText(row.acceptanceRef,'independent customer acceptance authority'),
   deliverableKind:requireText(row.deliverableKind,'exact deliverable specification'),
   state:'PROPOSED_PAYMENT_MILESTONE_NOT_ACCEPTED_OR_PAID'});
 });
 unique(normalized,x=>x.id,'customer milestone');
 ensure(total===10000,'payment milestone weights must equal 100%');
 let allocated=0;const expected=costScenario.suggestedCustomerQuoteCents;
 const rows=normalized.map((row,i)=>{
  const cents=i===normalized.length-1?expected-allocated:
   Math.floor(expected*row.basisPoints/10000);
  allocated+=cents;
  return frozen({...row,proposedCustomerAmountCents:cents});
 });
 const body={type:'MicrodramaCommercialMilestoneProposal',version:1,
  commissionId:commission.id,scenarioId:costScenario.id,currency:'USD',
  totalProposedCents:expected,milestones:frozen(rows),
  status:'CUSTOMER_AND_PROVIDER_SIGNATURES_REQUIRED_NO_PAYMENTS_OBSERVED'};
 return frozen({id:ni(body),...body});
}


/**
 * Source-owned dependency law for actual production execution.
 *
 * Worklot kinds have a single upstream sequence. This graph can be consumed
 * by a generic Coesite finite-capacity scheduler, without copying the film
 * canon or implementing a second studio. Original character reference work
 * crosses episode boundaries ONLY where that exact character/visual revision
 * occurs in the actual episode cast; unrelated casts can shoot independently.
 *
 * Edits/voice/release do not begin because a GPT said "done": each dependency
 * has to be independently received by the qualified executing office.
 */
export function projectMicrodramaProductionDependencies(workPlan){
 ensure(workPlan?.type==='MicrodramaCommissionWorkPlan'&&
  Array.isArray(workPlan.lots)&&Array.isArray(workPlan.episodeCast)&&Array.isArray(workPlan.episodeShots),
  'dependency graph requires the full source-bound production work plan');
 const all=workPlan.lots,byId=new Map(),order=new Map();
 for(const [index,lot] of all.entries()){
  ensure(typeof lot.id==='string'&&!byId.has(lot.id),
   'production worklot identity cannot repeat');
  byId.set(lot.id,lot);order.set(lot.id,index);
 }
 const rights=all.filter(l=>l.kind==='source-rights-review');
 ensure(rights.length===1,'production must have one shared original rights gate');
 const root=rights[0].id;
 const episodeCast=new Map(workPlan.episodeCast.map(ep=>[ep.episodeId,ep.actors]));
 const episodeShots=new Map(workPlan.episodeShots.map(ep=>[ep.episodeId,ep.shots]));
 ensure(episodeShots.size===workPlan.episodeShots.length&&
  episodeShots.size===episodeCast.size,
  'each original episode must retain exactly one source-owned performed-shot schedule');
 ensure(episodeCast.size===workPlan.episodeCast.length,
  'one original cast schedule per episode is required');
 const episodes=new Map();
 for(const lot of all){
  if(lot.episodeId===null){
   ensure(lot.id===root,'only global source rights may lack episode identity');
   continue;
  }
  ensure(episodeCast.has(lot.episodeId),'commercial task belongs to an unknown episode');
  if(!episodes.has(lot.episodeId))episodes.set(lot.episodeId,[]);
  episodes.get(lot.episodeId).push(lot);
 }
 ensure(episodes.size===episodeCast.size,'each source episode needs actual worklots');
 const refs=new Map();
 for(const lot of all.filter(x=>x.kind==='character-reference')){
  ensure(typeof lot.actorId==='string','reference task must preserve original actor');
  const key=lot.actorId+'\0'+(lot.lookRevisionRef??'original');
  ensure(!refs.has(key),'the same canonical character visual revision cannot be commissioned twice');
  refs.set(key,lot.id);
 }
 const composedLots=new Map();
 for(const l of all.filter(x=>x.kind==='scene-composition')){
  ensure(typeof l.sceneCompositionId==='string'&&!composedLots.has(l.sceneCompositionId),
   'one composed source image may not be purchased twice');
  composedLots.set(l.sceneCompositionId,l.id);
 }
 const shotForCinema=new Map();
 for(const [episodeId,shots] of episodeShots){
  for(const shot of shots){
   const key=workPlan.seriesId+'-'+episodeId+'-'+shot.shotId+'-cinema';
   ensure(!shotForCinema.has(key)&&byId.has(key),
    'each filmed source shot must have a unique actual original camera worklot');
   shotForCinema.set(key,shot);
  }
 }
 const byStage=(episode,kind)=>episode.filter(l=>l.kind===kind).map(l=>l.id);
 const uniqueIds=values=>[...new Set(values.filter(Boolean))]
  .sort((a,b)=>(order.get(a)??0)-(order.get(b)??0));
 const jobs=[];
 for(const lot of all){
  const ep=episodes.get(lot.episodeId)??[];
  const story=byStage(ep,'creative-treatment');
  const edit=byStage(ep,'editorial-master');
  const translations=byStage(ep,'localization');
  const qc=byStage(ep,'independent-qc');
  const deliveryPackage=byStage(ep,'release-manufacturing');
  let deps=[];
  switch(lot.kind){
   case 'source-rights-review':break;
   case 'creative-treatment':deps=[root];break;
   case 'character-reference':{
    deps=[root,...story];
    // A genuine transformation is an authored consequence of the original
    // body. An approved prior visual ref, or its accepted source reference
    // lot, is a production prerequisite when the initial body was unapproved.
    if(lot.lookRevisionRef){
     const predecessor=refs.get(lot.actorId+'\0original');
     if(predecessor&&predecessor!==lot.id)deps.push(predecessor);
    }
    break;
   }
   case 'scene-composition':{
    const served=(episodeShots.get(lot.episodeId)??[])
     .filter(shot=>shot.sceneComposition?.id===lot.sceneCompositionId);
    ensure(served.length>0,'composed scene art needs a genuine source acted-shot consumer');
    const characters=new Set(served.flatMap(shot=>shot.castIds));
    const originalCast=episodeCast.get(lot.episodeId)??[];
    deps=[root,...story,...originalCast.filter(actor=>characters.has(actor.id))
     .map(actor=>refs.get(actor.id+'\0'+(actor.lookRevisionRef??'original')))];
    break;
   }
   case 'cinematic-generation':{
    const sourceShot=shotForCinema.get(lot.id);
    ensure(sourceShot,'cinematic worklot lacks an actual original scene source');
    const episodeActors=episodeCast.get(lot.episodeId)??[];
    const sourceCast=sourceShot.castIds.length?
     episodeActors.filter(actor=>sourceShot.castIds.includes(actor.id)):episodeActors;
    deps=[root,...story,...sourceCast.map(actor=>
     refs.get(actor.id+'\0'+(actor.lookRevisionRef??'original')))];
    if(sourceShot.sceneComposition){
     const composer=composedLots.get(sourceShot.sceneComposition.id);
     if(composer)deps.push(composer);
    }
    break;
   }
   case 'dialogue-recording':deps=[root,...story];break;
   case 'editorial-master':
    deps=[root,...byStage(ep,'cinematic-generation'),
     ...byStage(ep,'dialogue-recording')];
    break;
   case 'localization':deps=edit.length?edit:[root];break;
   case 'independent-qc':deps=[...edit,...translations];
    if(deps.length===0)deps=[root];
    break;
   case 'release-manufacturing':deps=[...qc];
    ensure(deps.length===1,'each cinematic release needs exactly one independent final QC gate');
    break;
   case 'private-delivery':deps=[...deliveryPackage];
    ensure(deps.length===1,'each distribution target depends on original reviewed media package');
    break;
   default:throw new TypeError('unsupported source-bound microdrama worklot '+lot.kind);
  }
  deps=uniqueIds(deps);
  ensure(deps.every(id=>byId.has(id)&&id!==lot.id),
   'production dependency is missing, wrong or self-referential');
  jobs.push(frozen({worklotId:lot.id,kind:lot.kind,episodeId:lot.episodeId,
   unit:lot.unit,quantity:lot.quantity,sourceRef:lot.sourceRef,
   dependencies:frozen(deps),
   state:'PLANNED_DEPENDENCY_NOT_AN_EXECUTED_WORK_ORDER'}));
 }
 const rows=new Map(jobs.map(j=>[j.worklotId,j])),done=new Set(),active=new Set(),sorted=[];
 const walk=id=>{
  ensure(!active.has(id),'source production work dependency cycle');
  if(done.has(id))return;
  active.add(id);
  for(const dep of rows.get(id).dependencies)walk(dep);
  active.delete(id);done.add(id);sorted.push(rows.get(id));
 };
 for(const item of jobs)walk(item.worklotId);
 const body={type:'MicrodramaProductionDependencyGraph',version:1,
  workPlanId:workPlan.id,commissionId:workPlan.commissionId,
  sourceRef:workPlan.workRef,producer:workPlan.producingOffice,
  jobs:frozen(sorted),
  holds:frozen([...workPlan.holds]),
  state:workPlan.holds.length?'SOURCE_GATES_HELD_NO_DISPATCH':
   'DEPENDENCIES_DEFINED_QUALIFIED_CAPACITY_STILL_REQUIRED',
  limitation:'Dependencies are lawful scheduling prerequisites, not completion receipts, available provider assignments or a guarantee of finishing by any date.'
 };
 return frozen({id:ni(body),...body});
}

/** Shared content identity for this existing customer-commission source schema. */
export const microdramaContentAddress=ni;
