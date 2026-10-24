import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {once} from 'node:events';
import {createAgentEpisodeHttpServer,serveAgentEpisode} from '../apps/serve-agent-episode.mjs';

const fixture=new URL('./fixtures/services/public-paracosm-media-services-section/services/unassigned-floor-paracosm-services-section/content/production/episode-001.json',import.meta.url);
test('an agent can GET a real source-owned episode via safe local read-only HTTP',async()=>{
 const source=JSON.parse(await readFile(fixture,'utf8'));
 const server=createAgentEpisodeHttpServer(source);
 server.listen(0,'127.0.0.1');
 await once(server,'listening');
 const url='http://127.0.0.1:'+server.address().port;
 try{
  const health=await fetch(url+'/healthz');
  assert.equal(health.status,200);
  assert.equal((await health.json()).publication,false);
  const first=await fetch(url+'/v1/episodes/001/scenes?focus=else&limit=1');
  assert.equal(first.status,200);
  assert.equal(first.headers.get('cache-control'),'no-store');
  assert.equal(first.headers.get('access-control-allow-origin'),null);
  const a=await first.json();
  assert.equal(a.type,'AgentEpisodeReading');
  assert.equal(a.status,'PROVISIONAL_ARTISTIC_DEVELOPMENT');
  assert.equal(a.page.length,1);
  assert.equal(a.page[0].id,'else-answers');
  const next=await fetch(url+'/v1/episodes/001/scenes?focus=else&limit=2&after='+a.traversal.nextAfter);
  assert.equal(next.status,200);
  const b=await next.json();
  assert.deepEqual(b.page.map(x=>x.id),['interval-refusal','cross-read']);
  assert.equal(b.traversal.hasMore,false);
  const beat=await (await fetch(url+'/v1/episodes/001?beat=second-exit')).json();
  assert.deepEqual(beat.page.map(x=>x.id),['cross-read','other-latch']);
  const notFound=await fetch(url+'/v1/inference/execute');
  assert.equal(notFound.status,404);
  const invalid=await fetch(url+'/v1/episodes/001/scenes?focus=unknown');
  assert.equal(invalid.status,400);
  const repeated=await fetch(url+'/v1/episodes/001/scenes?focus=else&focus=sift');
  assert.equal(repeated.status,400);
  const deny=await fetch(url+'/v1/episodes/001',{method:'POST',headers:{'content-type':'application/json'},body:'{"instruction":"rewrite canon"}'});
  assert.equal(deny.status,405);
  assert.equal((await deny.json()).error,'read-only-interface');
 }finally{await new Promise((ok,fail)=>server.close(error=>error?fail(error):ok()))}
});

test('the development preview can never bind to a public interface',async()=>{
 await assert.rejects(
  ()=>serveAgentEpisode({host:'0.0.0.0',port:0}),
  /explicit loopback address/
 );
 await assert.rejects(
  ()=>serveAgentEpisode({host:'::',port:0}),
  /explicit loopback address/
 );
});
