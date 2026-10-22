import test from 'node:test';
import assert from 'node:assert/strict';
import {admitOtioVideoCuts} from '../src/otio-render.mjs';

test('renderer refuses a missing standard OTIO timeline',()=>{
 assert.throws(()=>admitOtioVideoCuts({edit:{},sourceMedia:[]}),/OpenTimelineIO/u);
});

const NI='ni:///sha-256;'+'A'.repeat(43);
const source={filePath:'/original.mp4',sourceVideoNi:NI,mediaType:'video/mp4'};
const clip=(start,duration)=>({
 OTIO_SCHEMA:'Clip.2',name:'Source-qualified cut',enabled:true,effects:[],
 active_media_reference_key:'DEFAULT_MEDIA',
 media_references:{DEFAULT_MEDIA:{
  OTIO_SCHEMA:'ExternalReference.1',target_url:'file:///original.mp4',
  metadata:{causeway:{sourceVideoNi:NI}}
 }},
 source_range:{OTIO_SCHEMA:'TimeRange.1',
  start_time:{OTIO_SCHEMA:'RationalTime.1',value:start,rate:1000},
  duration:{OTIO_SCHEMA:'RationalTime.1',value:duration,rate:1000}}
});
const timeline=cuts=>({OTIO_SCHEMA:'Timeline.1',
 tracks:{OTIO_SCHEMA:'Stack.1',children:[{
  OTIO_SCHEMA:'Track.1',kind:'Video',children:cuts,effects:[]}]}
});
test('OTIO source-relative cuts may reorder the media without inventing a second timeline',()=>{
 const edit=timeline([clip(2000,300),clip(0,500)]);
 const admitted=admitOtioVideoCuts({edit,sourceMedia:[source]});
 assert.equal(admitted.expectedDurationSeconds,.8);
 assert.deepEqual(admitted.cuts.map(x=>x.sourceStartMilliseconds),[2000,0]);
});
test('unsupported effects, ambiguous media and missing source identity refuse the original edit',()=>{
 const edit=timeline([clip(2000,300),clip(0,500)]);
 assert.throws(()=>admitOtioVideoCuts({edit,sourceMedia:[source],frameRate:29}),/frame rate/u);
 const effect=structuredClone(edit);
 effect.tracks.children[0].children[0].effects=[{OTIO_SCHEMA:'TimeWarp.1'}];
 assert.throws(()=>admitOtioVideoCuts({edit:effect,sourceMedia:[source]}),/Unsupported/u);
 const unknown=structuredClone(edit);
 unknown.tracks.children[0].children[0].media_references.DEFAULT_MEDIA.metadata.causeway.sourceVideoNi='not-a-real-NI';
 assert.throws(()=>admitOtioVideoCuts({edit:unknown,sourceMedia:[source]}),/admitted byte-identity/u);
 assert.throws(()=>admitOtioVideoCuts({edit:timeline([clip(0,50),clip(50,500)]),sourceMedia:[source]}),/shorter/u);
});
