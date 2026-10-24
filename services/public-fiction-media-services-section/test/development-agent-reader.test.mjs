import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {developmentEpisodeFromScreenplay} from '../apps/derive-development-screenplay.mjs';
import {projectAgentEpisodeReading} from '../src/agent-episode-reading.mjs';
import {serveAgentEpisode} from '../apps/serve-agent-episode.mjs';

const screenplay=new URL('./fixtures/services/public-paracosm-media-services-section/services/unassigned-floor-paracosm-services-section/content/development/solos/i-woke-up-as-three-shrimp-episode-zero.md',import.meta.url);
const load=async()=>developmentEpisodeFromScreenplay(await readFile(screenplay,'utf8'),{originRef:fileURLToPath(screenplay)});

test('the same story driving the video is readable by an agent without invented causal/canon facts',async()=>{
 const input=await load();
 const opening=projectAgentEpisodeReading(input,{limit:2});
 assert.equal(opening.status,'PROVISIONAL_ARTISTIC_DEVELOPMENT');
 assert.equal(opening.source.sourceKind,'exact-hash-development-script');
 assert.equal(opening.source.originRef,opening.source.sourceRevision,'portable audience source may expose the digest, not a local disk path');
 assert.ok(!JSON.stringify(opening).includes(fileURLToPath(screenplay)),'private build paths must not leak to machine audiences');
 assert.match(opening.source.sourceRevision,/^sha256:[a-f0-9]{64}$/u);
 assert.equal(opening.source.canonDigestClaim,null);
 assert.equal(opening.source.worldRef,null);
 assert.equal(opening.source.canon,null);
 assert.equal(opening.media.durationMs,96000);
 assert.equal(opening.media.type,'development-scenes-no-causal-certification');
 assert.equal(opening.causalBeats.length,0,'no invented verified cause edges');
 assert.deepEqual(opening.page.map(x=>x.id),['01-three-left-claws','02-the-tide-counts-back']);
 assert.deepEqual(opening.availableFocusCharacters,['kip','rill']);
 assert.ok(!JSON.stringify(opening).includes('FOURTH RILL'),'future cast and twist remain hidden');
 const middle=projectAgentEpisodeReading(input,{after:'02-the-tide-counts-back',limit:2});
 assert.deepEqual(middle.page.map(x=>x.id),['03-membrane-of-first-admission','04-a-friend-from-yesterday']);
 assert.deepEqual(middle.causalBeats,[]);
 const full=projectAgentEpisodeReading(input,{limit:10});
 assert.equal(full.page.length,8);
 assert.ok(full.availableFocusCharacters.includes('fourth-rill'));
 assert.equal(full.page.at(-1).dialogue[0].speakerId,'fourth-rill');
 const act=projectAgentEpisodeReading(input,{beat:'act-4'});
 assert.deepEqual(act.page.map(s=>s.id),['07-one-borrowed-current','08-the-one-left-behind']);
});

test('made-up development receipts, causal graphs or unsupported reader positions fail closed',async()=>{
 const source=await load();
 assert.throws(()=>projectAgentEpisodeReading({...source,developmentState:'published'}),/paracosm source or explicit exact-hash/);
 assert.throws(()=>projectAgentEpisodeReading({...source,source:{...source.source,sourceRevision:'invented'}}),/paracosm source or explicit exact-hash/);
 assert.throws(()=>projectAgentEpisodeReading({...source,episode:{...source.episode,beats:[]}}),/cannot claim a received causal graph/);
 assert.throws(()=>projectAgentEpisodeReading(source,{beat:'second-exit'}),/unknown source act group/);
 assert.throws(()=>projectAgentEpisodeReading(source,{after:'scene-nine'}),/unknown shot cursor/);
});

test('the existing machine-reader CLI accepts original Markdown and paginates without JSON copying',()=>{
 const script=fileURLToPath(screenplay);
 const cli=fileURLToPath(new URL('../apps/read-agent-episode.mjs',import.meta.url));
 const result=spawnSync(process.execPath,[cli,script,'--focus','rill','--limit','1'],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 const out=JSON.parse(result.stdout);
 assert.equal(out.page.length,1);
 assert.equal(out.source.sourceKind,'exact-hash-development-script');
 assert.deepEqual(out.causalBeats,[]);
 assert.equal(out.page[0].id,'01-three-left-claws');
});

test('loopback preview serves the same unapproved script as text while refusing writes',async()=>{
 const srv=await serveAgentEpisode({sourceFile:fileURLToPath(screenplay),port:0,host:'127.0.0.1'});
 const base='http://127.0.0.1:'+srv.address().port;
 try{
  const first=await fetch(base+'/v1/episodes/001/scenes?limit=1');
  assert.equal(first.status,200);
  const a=await first.json();
  assert.equal(a.page[0].id,'01-three-left-claws');
  assert.equal(a.source.worldRef,null);
  assert.equal(a.causalBeats.length,0);
  const named=await fetch(base+'/v1/episodes/i-woke-up-as-three-shrimp-development/scenes?limit=1');
  assert.equal(named.status,200);
  assert.equal((await named.json()).page[0].id,'01-three-left-claws');
  const later=await fetch(base+'/v1/episodes/001/scenes?after=07-one-borrowed-current&limit=1');
  assert.equal((await later.json()).page[0].id,'08-the-one-left-behind');
  const write=await fetch(base+'/v1/episodes/001',{method:'POST',body:'{"rewrite":"institution"}'});
  assert.equal(write.status,405);
 }finally{await new Promise((ok,fail)=>srv.close(error=>error?fail(error):ok()))}
});
