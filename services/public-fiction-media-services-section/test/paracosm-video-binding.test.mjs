import test from 'node:test';
import assert from 'node:assert/strict';
import {projectParacosmVideoProduction} from '../src/paracosm-video-binding.mjs';
const ni=(letter)=>'ni:///sha-256;'+letter.repeat(43);
const source=()=>({type:'NarrativeSource',id:'canonical-episode',originRef:'git:work',
 contributorRef:'ai:creative-council',rightsClaimRef:'git:rights',
 creativeAuthorityRef:'git:charter',boundaries:[],paracosm:{
 kind:'ParacosmWorkRef',worldRef:'git:paracosm',work:'show',canon:'source',sourceRevision:'git:1',
 canonDigest:ni('A')}});
const signature=()=>({type:'StoryBible',version:1,signature:{
 characters:[{id:'latch',name:'Latch',pov:true}],places:[{name:'Hall'}],lexicon:[]}});
const derivation=()=>({type:'ParacosmStoryBibleDerivation',version:2,canonIdentityVersion:'paracosm-content-v2',work:'show',
 canonDigest:ni('A'),resourceIdentities:[
 {slug:'latch',name:'Latch',type:'being',path:'beings/latch.md',contentIdentity:ni('B'),bodyContentId:ni('C')},
 {slug:'hall',name:'Hall',type:'place',path:'places/hall.md',contentIdentity:ni('D'),bodyContentId:ni('E')},
 {slug:'episode-one',name:'Episode 1',type:'text',path:'texts/episode-one.md',
 contentIdentity:ni('F'),bodyContentId:ni('G')}
]});
const bindings=()=>({characters:{latch:{visualRef:ni('H'),voiceRef:ni('I'),rightsRef:ni('J'),sourceIdentity:ni('B')}},
 locations:{hall:{referenceRef:ni('K'),rightsRef:ni('L'),sourceIdentity:ni('D')}}});
const episode=()=>({id:'episode-one',number:1,fps:30,sourceTextSlug:'episode-one',ending:'closed',
 beats:[
 {id:'first',causeBeatId:'source',action:'Notices door',consequence:'Must decide'},
 {id:'choice',causeBeatId:'first',action:'Declines gift',consequence:'State changes'},
 {id:'resolution',causeBeatId:'choice',kind:'resolution',action:'A path is retained',consequence:'Neighbors disagree'}
 ],
 shots:[0,1,2].map((i)=>({id:'shot-'+(i+1),beatId:['first','choice','resolution'][i],
 frames:150,locationId:'hall',characterIds:['latch'],action:'Abstract animation of an unfolding bracket',
 camera:'Close framed vertical view',dialogue:[{speakerId:'latch',startFrame:15,endFrame:100,text:'The interval remains open.'}]}))});
const args=()=>({source:source(),storyBible:signature(),derivation:derivation(),
 assay:{state:'checked-without-errors',canonDigest:ni('A'),reportRef:'git:check-evidence'},
 mediaBindings:bindings(),episode:episode(),
 receiver:{consumer:'causeway:fiction',destination:'unbound-publishing',acceptanceCriteria:'Independently received film'},
 openedAt:'2026-10-12T20:00:00Z'});
test('canonical paracosm projection derives cast and locations, not a second hand-written world',()=>{
 const out=projectParacosmVideoProduction(args());
 assert.equal(out.status,'PROPOSED_NOT_ADMITTED');
 assert.equal(out.world.textIdentity,ni('F'));
 assert.equal(out.proposal.totalFrames,450);
 assert.equal(out.proposal.jobs.video[0].cast[0].id,'latch');
 assert.equal(out.proposal.jobs.video[0].cast[0].name,'Latch');
 assert.equal(out.proposal.jobs.video[0].location.referenceRef,ni('K'));
 assert.ok(out.proposal.mediaNeedCandidate.artifacts.every(x=>x.disposition==='hold'));
});
test('missing world NI is an explicit hold, never invented from path or title',()=>{
 const a=args();delete a.source.paracosm.canonDigest;
 const out=projectParacosmVideoProduction(a);
 assert.equal(out.status,'HELD_SOURCE_OR_ASSETS');
 assert.equal(out.reason,'source-canon-digest-not-received');
});
test('incorrect world revision, absent assay, or missing text is a refusal to project',()=>{
 const a=args();a.derivation.canonDigest=ni('Z');
 assert.equal(projectParacosmVideoProduction(a).reason,'source-revision-and-derived-world-disagree');
 const b=args();b.assay=null;
 assert.equal(projectParacosmVideoProduction(b).reason,'independent-paracosm-check-not-received');
 const c=args();c.episode.sourceTextSlug='unknown';
 assert.equal(projectParacosmVideoProduction(c).reason,'episode-text-not-in-accepted-paracosm');
});
test('unverified asset rights, source changes, and character inventions stay held',()=>{
 const a=args();a.mediaBindings.characters.latch.sourceIdentity=ni('Z');
 assert.match(projectParacosmVideoProduction(a).missing[0].reason,/source-binding-not-accepted/u);
 const b=args();b.episode.shots[0].characterIds=['invented'];
 assert.equal(projectParacosmVideoProduction(b).missing[0].reason,'character-not-in-story-bible');
});

test('legacy source identity profiles cannot be mistaken for the body-aware canon',()=>{
 const a=args();delete a.derivation.canonIdentityVersion;
 assert.equal(projectParacosmVideoProduction(a).reason,'paracosm-source-identity-profile-not-received');
 const b=args();b.derivation.canonIdentityVersion='paracosm-frontmatter-v1';
 assert.equal(projectParacosmVideoProduction(b).reason,'paracosm-source-identity-profile-not-received');
});
