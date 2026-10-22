import test from 'node:test';
import assert from 'node:assert/strict';
import {admitOtioVideoCuts} from '../src/otio-render.mjs';

test('renderer refuses a missing standard OTIO timeline',()=>{
 assert.throws(()=>admitOtioVideoCuts({edit:{},sourceMedia:[]}),/OpenTimelineIO/u);
});
