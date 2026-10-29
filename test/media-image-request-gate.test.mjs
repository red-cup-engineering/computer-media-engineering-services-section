import test from 'node:test';
import assert from 'node:assert/strict';
import {composeImageBrief, preflightImageDispatch, assessImageRequest as check} from '../src/media-image-request-gate.mjs';
const brief={consumer:'Causeway Science',subject:'wild rice plants in shallow water',medium:'black ink linocut',purpose:'private campaign visual',composition:'foreground seedheads and distant reeds',palette:'black and ochre',aspectRatio:'1:1',forbidden:['pottery','blue cubes','a harbor']};
const prior={kind:'effective-image-request',subject:brief.subject,medium:brief.medium,ref:'caller assertion'};
const provider={kind:'provider-attested-effective-image-request',issuer:'image-provider',requestId:'request-abc',subject:brief.subject,medium:brief.medium};
const goodReview={generatedFileId:'file_1',subjectMatches:true,mediumMatches:true,compositionMatches:true,exclusionsAbsent:true};

test('complete brief includes the subject, medium and exclusions',()=>{const x=composeImageBrief(brief);for(const v of [brief.subject,brief.medium,brief.composition,brief.palette,'pottery'])assert.ok(x.includes(v));});
test('incomplete image brief rejected',()=>assert.throws(()=>composeImageBrief({...brief,subject:''}),/missing subject/));
test('no effective request evidence',()=>assert.equal(check({brief,generatedFileId:'file_1'}).state,'GENERATED_REQUEST_UNVERIFIED'));
test('caller-reported evidence is NOT provider attestation',()=>assert.equal(check({brief,effectiveRequestEvidence:prior,generatedFileId:'file_1'}).request,'UNVERIFIED'));
test('missing image is NOT_GENERATED',()=>assert.equal(check({brief,effectiveRequestEvidence:provider}).state,'NOT_GENERATED'));
test('observed subject mismatch rejects even without provider attestation',()=>assert.deepEqual(check({brief,generatedFileId:'file_1',visualReview:{...goodReview,subjectMatches:false}}),{state:'QA_REJECTED',request:'UNVERIFIED',consumerAccepted:false,reasons:['subject-mismatch']}));
test('provider request attested but no visual QA is unassessed',()=>assert.equal(check({brief,effectiveRequestEvidence:provider,generatedFileId:'file_1'}).state,'QA_UNASSESSED'));
test('provider attestation and complete visual match yield candidate, never acceptance',()=>assert.deepEqual(check({brief,effectiveRequestEvidence:provider,generatedFileId:'file_1',visualReview:goodReview}),{state:'QA_CANDIDATE',request:'VERIFIED',consumerAccepted:false}));
test('invalid aspect ratio rejected',()=>assert.throws(()=>composeImageBrief({...brief,aspectRatio:'4:5'}),/unsupported aspect ratio/));
test('observed forbidden plant rejects on-topic Go art with unverified request',()=>{
  const go={...brief,subject:'Go board and stones',medium:'16-bit pixel art',composition:'top-down board',forbidden:['plants'],geometry:'19 by 19 grid'};
  const result=check({brief:go,generatedFileId:'file_go',visualReview:{generatedFileId:'file_go',subjectMatches:true,mediumMatches:true,compositionMatches:true,exclusionsAbsent:false,observedForbidden:['plants'],geometryMatches:null}});
  assert.equal(result.state,'QA_REJECTED');assert.deepEqual(result.reasons,['forbidden-content-observed']);assert.equal(result.consumerAccepted,false);
});
test('wrong visual review cannot qualify later image',()=>assert.equal(check({brief,effectiveRequestEvidence:provider,generatedFileId:'file_2',visualReview:goodReview}).state,'QA_UNASSESSED'));
test('composition mismatch is rejected',()=>assert.deepEqual(check({brief,effectiveRequestEvidence:provider,generatedFileId:'file_1',visualReview:{...goodReview,compositionMatches:false}}).reasons,['composition-mismatch']));
test('geometry requirement must be positively verified before candidate',()=>{
  const geometryBrief={...brief,geometry:'19 by 19 grid'};
  assert.equal(check({brief:geometryBrief,effectiveRequestEvidence:provider,generatedFileId:'file_1',visualReview:goodReview}).state,'QA_UNASSESSED');
  assert.deepEqual(check({brief:geometryBrief,effectiveRequestEvidence:provider,generatedFileId:'file_1',visualReview:{...goodReview,geometryMatches:false}}).reasons,['geometry-mismatch']);
});
test('unknown exclusions are not silently assumed clear',()=>assert.equal(check({brief,effectiveRequestEvidence:provider,generatedFileId:'file_1',visualReview:{...goodReview,exclusionsAbsent:undefined}}).state,'QA_UNASSESSED'));
test('geometry brief is expressed in generation instruction',()=>assert.match(composeImageBrief({...brief,geometry:'19 by 19 grid'}),/Required geometry: 19 by 19 grid/));


const previousGo={consumer:'weiqi.play.561.group',subject:'top down Go board with black and ivory stones',medium:'16-bit pixel art',purpose:'private game illustration',composition:'square overhead scene of board',palette:'charcoal ivory ochre',aspectRatio:'1:1'};
const newBuoy={consumer:'Turntide Islands FlowCell research',subject:'single orange floating buoy tethered to seabed anchor',medium:'risograph cut-paper editorial illustration',purpose:'private conceptual storytelling visual',composition:'asymmetric horizontal water cutaway',palette:'coral burnt orange sea green cream',aspectRatio:'3:2',forbidden:['photorealistic boats']};
test('distinct buoy creative brief passes when immediately transmitted',()=>{
  const result=preflightImageDispatch({brief:newBuoy,immediatelyPrecedingMessage:composeImageBrief(newBuoy),recentBriefs:[previousGo]});
  assert.equal(result.state,'READY_FOR_IMAGE_TOOL');assert.equal(result.comparisonCount,1);assert.ok(result.instruction.includes('buoy'));
});
test('generic plan cannot stand in for exact creative instruction',()=>assert.equal(preflightImageDispatch({brief:newBuoy,immediatelyPrecedingMessage:'I will generate something different',recentBriefs:[previousGo]}).state,'BLOCKED_MISSING_EXACT_BRIEF'));
test('earlier brief from another subject cannot stand in for current instruction',()=>assert.equal(preflightImageDispatch({brief:newBuoy,immediatelyPrecedingMessage:composeImageBrief(previousGo),recentBriefs:[previousGo]}).state,'BLOCKED_MISSING_EXACT_BRIEF'));
test('changed palette does not make repeated Go board distinct',()=>{
  const repeated={...previousGo,palette:'violet silver'};
  assert.equal(preflightImageDispatch({brief:repeated,immediatelyPrecedingMessage:composeImageBrief(repeated),recentBriefs:[previousGo]}).state,'BLOCKED_NEAR_DUPLICATE');
});
test('similar subject with rephrasing is blocked',()=>{
  const repeated={...previousGo,subject:'wooden Go board stones topdown',medium:'pixel art',palette:'black orange'};
  assert.equal(preflightImageDispatch({brief:repeated,immediatelyPrecedingMessage:composeImageBrief(repeated),recentBriefs:[previousGo]}).state,'BLOCKED_NEAR_DUPLICATE');
});
test('same medium and composition blocks recycled templates',()=>{
  const repeated={...previousGo,consumer:'another property',subject:'chess board and pieces',palette:'silver gold'};
  assert.equal(preflightImageDispatch({brief:repeated,immediatelyPrecedingMessage:composeImageBrief(repeated),recentBriefs:[previousGo]}).state,'BLOCKED_NEAR_DUPLICATE');
});
test('known recent nonmatching property and medium remains allowed',()=>{
  const distinct={...newBuoy,subject:'hand braided willow basket',consumer:'Causeway basket craft research',medium:'natural light studio photo',composition:'close-up three quarter portrait'};
  assert.equal(preflightImageDispatch({brief:distinct,immediatelyPrecedingMessage:composeImageBrief(distinct),recentBriefs:[previousGo,newBuoy]}).state,'READY_FOR_IMAGE_TOOL');
});
test('incomplete brief is never eligible',()=>assert.throws(()=>preflightImageDispatch({brief:{...previousGo,subject:''},immediatelyPrecedingMessage:'hi'}),/missing subject/));
test('history input is validated',()=>assert.throws(()=>preflightImageDispatch({brief:previousGo,immediatelyPrecedingMessage:composeImageBrief(previousGo),recentBriefs:'not a list'}),TypeError));
