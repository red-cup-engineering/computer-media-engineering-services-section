import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { qualifyPrintifyRelease, makePrintifyDraftPayload, stagePrintifyDraft } from '../src/pod-printify.mjs';

const art = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAMCAYAAABfnvydAAAAF0lEQVR4nGP8//8/Az7AhFd2VAEVFQAArboDFRKcFAQAAAAASUVORK5CYII=', 'base64');
const hash = createHash('sha256').update(art).digest('hex');
const proof = n => ({position:n,asset:{relativePath:`art/${n}.png`,sha256:hash,mimeType:'image/png',metadataSanitized:true,width:8,height:12,altText:'A heart-shaped outline around the letter A'},x:.5,y:.5,scale:1,angle:0});
const fixture = () => ({
  type:'AcceptedPODProduct',version:1,state:'accepted-for-provider-draft',id:'heart-a-crewneck',
  title:'Heart-A crewneck',description:'Original heart-A graphic sweater',
  authority:{sourceIssue:'https://github.com/causeway-services/public-media-services-section/issues/16',
    mediaAcceptanceRef:'https://example.org/media-accepted/1',productAcceptanceRef:'https://example.org/product-accepted/1',receiverAcceptanceRef:'https://example.org/store-accepted/1'},
  provider:{kind:'printify',shopId:42,blueprintId:21,printProviderId:7,variants:[{id:101,retailPriceCents:3900},{id:102,retailPriceCents:4200}]},
  placements:[proof('front'),proof('back')],
});
const temp=()=>{const root=mkdtempSync(join(tmpdir(),'pod-'));mkdirSync(join(root,'art'));writeFileSync(join(root,'art/front.png'),art);writeFileSync(join(root,'art/back.png'),art);return root;};

function fakeFetch({existing=false,collision=false,unavailable=false,loss=false}={}) {
  const calls=[];
  let stageBody;
  const respond=(value,status=200)=>({ok:status>=200&&status<300,status,json:async()=>value});
  const fetch=async(url,options={})=>{
    calls.push({url,method:options.method??'GET'});
    if(url.endsWith('/products.json?limit=100&page=1')){
      return respond({data:existing?[{id:'live-7',title:'Heart-A crewneck',tags:[marker],blueprint_id:collision?99:21,print_provider_id:7}]:[],last_page:1});
    }
    if(url.endsWith('/catalog/blueprints/21/print_providers/7/variants.json')) {
      return respond([{id:101,cost:loss?5000:2400,is_available:!unavailable},{id:102,cost:2600,is_available:true}]);
    }
    if(url.endsWith('/uploads/images.json')) {
      const input=JSON.parse(options.body);
      assert.ok(input.contents.length>0);
      return respond({id:`image-${calls.filter(c=>c.url.endsWith('/uploads/images.json')).length}`,width:8,height:12});
    }
    if(url.endsWith('/products.json') && options.method==='POST') {
      stageBody=JSON.parse(options.body);return respond({id:'live-8'});
    }
    if(url.endsWith('/products/live-8.json')) return respond({id:'live-8',title:'Heart-A crewneck',tags:[marker]});
    throw Error('Unexpected call '+url);
  };
  let marker;
  return {fetch,calls,get body(){return stageBody;},setMarker:value=>marker=value};
}

test('release is not created from creative proposal or guesses',()=>{
  assert.throws(()=>qualifyPrintifyRelease({type:'PODProductProposal'}),/AcceptedPODProduct/);
  const f=fixture(); f.state='proposed';assert.throws(()=>qualifyPrintifyRelease(f),/consumer acceptance/);
  f.state='accepted-for-provider-draft';f.provider.blueprintId=null;assert.throws(()=>qualifyPrintifyRelease(f),/blueprintId/);
  f.provider.blueprintId=21;delete f.authority.mediaAcceptanceRef;assert.throws(()=>qualifyPrintifyRelease(f),/media acceptance/);
});

test('provider plan binds every accepted variant and print placement',()=>{
  const q=qualifyPrintifyRelease(fixture());
  const payload=makePrintifyDraftPayload(q,['upload-f','upload-b']);
  assert.equal(payload.print_areas[0].variant_ids.length,2);
  assert.equal(payload.print_areas[0].placeholders[1].position,'back');
  assert.equal(payload.print_areas[0].placeholders[1].images[0].id,'upload-b');
  assert.equal(payload.tags[0],q.marker);
  assert.throws(()=>makePrintifyDraftPayload(q,['one']),/one returned upload/);
});

test('damaged or changed source image blocks all network calls',async()=>{
  const root=temp(); const f=fixture();f.placements[0].asset.sha256='a'.repeat(64);
  let count=0;
  await assert.rejects(stagePrintifyDraft({raw:f,root,token:'test',shopId:42,fetch:async()=>{count++;throw Error('unexpected network');}}),/SHA-256 mismatch/);
  assert.equal(count,0);rmSync(root,{recursive:true,force:true});
});

test('connected shop mismatch blocks network calls',async()=>{
  const root=temp();let count=0;
  await assert.rejects(stagePrintifyDraft({raw:fixture(),root,token:'test',shopId:19,fetch:async()=>{count++;}}),/connected shop/);
  assert.equal(count,0);rmSync(root,{recursive:true,force:true});
});

test('existing provider draft is read and not duplicated',async()=>{
  const root=temp(), f=fixture(), mock=fakeFetch({existing:true});
  mock.setMarker(qualifyPrintifyRelease(f).marker);
  const receipt=await stagePrintifyDraft({raw:f,root,token:'test',shopId:42,fetch:mock.fetch});
  assert.equal(receipt.status,'existing');assert.equal(receipt.productId,'live-7');assert.equal(mock.calls.length,1);
  rmSync(root,{recursive:true,force:true});
});

test('provider drift blocks silently reusing wrong product',async()=>{
  const root=temp(),f=fixture(),mock=fakeFetch({existing:true,collision:true});mock.setMarker(qualifyPrintifyRelease(f).marker);
  await assert.rejects(stagePrintifyDraft({raw:f,root,token:'test',shopId:42,fetch:mock.fetch}),/disagrees/);
  assert.equal(mock.calls.length,1);rmSync(root,{recursive:true,force:true});
});

test('stage uploads actual accepted art then verifies created draft by GET',async()=>{
  const root=temp(),f=fixture(),mock=fakeFetch();mock.setMarker(qualifyPrintifyRelease(f).marker);
  const result=await stagePrintifyDraft({raw:f,root,token:'test',shopId:42,fetch:mock.fetch});
  assert.equal(result.status,'created');assert.equal(result.productId,'live-8');
  assert.deepEqual(mock.calls.map(c=>c.method),['GET','GET','POST','POST','POST','GET']);
  assert.equal(mock.body.variants[0].price,3900);
  assert.deepEqual(mock.body.print_areas[0].placeholders.map(p=>p.position),['front','back']);
  rmSync(root,{recursive:true,force:true});
});

test('a vanished or unprofitable catalog variant prevents any uploads', async()=>{
  for(const mode of [{unavailable:true},{loss:true}]) {
    const root=temp(),f=fixture(),mock=fakeFetch(mode);mock.setMarker(qualifyPrintifyRelease(f).marker);
    await assert.rejects(stagePrintifyDraft({raw:f,root,token:'test',shopId:42,fetch:mock.fetch}),/out of stock|retail price/);
    assert.deepEqual(mock.calls.map(c=>c.method),['GET','GET']);
    rmSync(root,{recursive:true,force:true});
  }
});
