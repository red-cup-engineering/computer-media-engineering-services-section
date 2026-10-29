import test from 'node:test';
import assert from 'node:assert/strict';
import { qualifyMediaSocialDistributor, qualifyMediaSocialReadback } from '../src/media-social-receiving.mjs';

const did='did:plc:abc',rkey='3k2aabc234567',cid='bafyreireceived';
const uri='at://'+did+'/app.bsky.feed.post/'+rkey;
const receipt={status:'ok',uri,cid,did};
const observation={status:'verified',uri,cid,did,source:'bluesky-appview-public-getPostThread'};

test('no public use without actual deterministic replay and public-readback capabilities',()=>{
  assert.equal(qualifyMediaSocialDistributor({}).ok,false);
  assert.equal(qualifyMediaSocialDistributor({
    BLUESKY_DETERMINISTIC_RKEY:true,postBluesky:async()=>{},
  }).reason,'public-bluesky-readback-adapter-not-released');
  assert.equal(qualifyMediaSocialDistributor({
    BLUESKY_DETERMINISTIC_RKEY:true,
    postBluesky:async()=>{},observeBlueskyPost:async()=>{},
  }).ok,true);
});

test('same-account, same-record public app-view readback qualifies exact public use',()=>{
  assert.deepEqual(qualifyMediaSocialReadback({receipt,observation,rkey}),
    {ok:true,uri,cid,did,source:'bluesky-appview-public-getPostThread'});
});

test('an API acknowledgement is not an observed public post',()=>{
  for(const unverified of [null,{}, {status:'held',uri,cid,did},
    {...observation,status:'ok'}, {...observation,source:'provider-ack'}]){
    assert.equal(qualifyMediaSocialReadback({receipt,observation:unverified,rkey}).ok,false);
  }
});

test('wrong account, key, CID, and apparent public identity are refused',()=>{
  for(const bad of [
    {receipt:{...receipt,did:'did:plc:other'}},
    {receipt:{...receipt,uri:uri+'/other'}},
    {receipt:{...receipt,cid:null}},
    {observation:{...observation,uri:'at://did:plc:other/app.bsky.feed.post/'+rkey}},
    {observation:{...observation,cid:'bafyreiwrong'}},
    {observation:{...observation,did:'did:plc:someoneelse'}},
    {rkey:'not-a-tid'},
  ])assert.equal(qualifyMediaSocialReadback({receipt,observation,rkey,...bad}).ok,false);
});
