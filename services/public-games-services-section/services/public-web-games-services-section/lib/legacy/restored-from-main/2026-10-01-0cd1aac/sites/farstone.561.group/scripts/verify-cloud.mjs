import { Miniflare } from "miniflare";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";

const root = fileURLToPath(new URL("../", import.meta.url));
if (!process.argv[2]) {
  const directory = mkdtempSync(join(tmpdir(), "farstone-cloud-proof-"));
  try {
    for (const phase of ["seed", "restore", "anonymous"]) {
      const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), phase, join(directory, "state.json")], { stdio: "inherit", timeout: 120_000 });
      assert.equal(result.status, 0, `${phase} failed: ${result.error ?? "see output"}`);
    }
  } finally { rmSync(directory, { recursive: true, force: true }); }
  process.exit(0);
}
const phase=process.argv[2];
const stateFile=process.argv[3];
const saved=phase==='seed'?null:JSON.parse(readFileSync(stateFile));
const storage=saved?.storage??join(stateFile+'-storage');
const options={modulesRoot:root,modules:true,scriptPath:join(root,'dist/worker.mjs'),cf:false,compatibilityDate:'2026-07-22',compatibilityFlags:['nodejs_compat'],durableObjects:{WORLD:{className:'FarstoneWorld',useSQLite:true}},durableObjectsPersist:storage};
let mf=new Miniflare(options);await mf.ready;
const call=async(path,body,{method=body===undefined?'GET':'POST',token}={})=>{const headers={};if(body!==undefined)headers['content-type']='application/json';if(token)headers.authorization=`Bearer ${token}`;const r=await mf.dispatchFetch('http://localhost'+path,{method,headers,...(body===undefined?{}:{body:JSON.stringify(body)})});const result=await r.json();assert.ok(r.ok,`${method} ${path}: ${JSON.stringify(result)}`);return result};
const ws=async(name)=>{const r=await mf.dispatchFetch('http://localhost/',{headers:{Upgrade:'websocket'}});assert.equal(r.status,101);const socket=r.webSocket;const messages=[];socket.addEventListener('message',e=>messages.push(JSON.parse(e.data)));socket.accept();socket.send(JSON.stringify({k:'join',name}));return {socket,messages};};
const control=async(connection,payload)=>{const requestId=`proof-${Date.now()}-${Math.random()}`;connection.socket.send(JSON.stringify({k:'control',requestId,payload}));await until(()=>connection.messages.some(m=>m.k==='control-result'&&m.requestId===requestId));const response=connection.messages.find(m=>m.k==='control-result'&&m.requestId===requestId);assert.ok(response.ok,response.error);return response.result;};
const until=async(predicate)=>{for(let i=0;i<100;i++){if(predicate())return;await new Promise(r=>setTimeout(r,50));}throw Error('timed out awaiting frame')};
try {
 for(let attempt=0;;attempt++){try{console.log('health',await call('/health'));break;}catch(error){if(attempt===4)throw error;await new Promise(r=>setTimeout(r,100));}}
 if(phase==='seed'){
 const alice=await ws('CloudAlice'),bob=await ws('CloudBob');
 await until(()=>alice.messages.some(m=>m.k==='snapshot')&&bob.messages.some(m=>m.k==='snapshot'));
 const httpSession=await call('/connect',{});
 const account=await call('/account',{action:'register',name:'cloudalice'},{token:httpSession.token});
 const bobAccount=await control(bob,{action:'register',name:'cloudbob'});
 assert.ok(bobAccount.actor && bobAccount.password,'the second player registers before using voice chat');
 const signedIn=await control(alice,{action:'login',name:'cloudalice',password:account.password});
 assert.equal(signedIn.actor,account.actor,'the live control path binds the web session to the persistent character');
 const actor=account.actor;
 const protectedTalk=await call('/talk',{command:'whoami'},{token:httpSession.token});
 assert.ok(protectedTalk.lines.join('\n').includes('cloudalice'));
 const denied=await mf.dispatchFetch('http://localhost/talk',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({command:'whoami'})});
 assert.equal(denied.status,401,'HTTP identity commands require a bearer session');
 const beforeChat=await call('/metrics');
 alice.socket.send(JSON.stringify({k:'intent',seq:1,kind:'command',args:{command:'chat harbor-cloud-proof'}}));
 await until(()=>bob.messages.some(m=>m.e?.some(e=>e.recentEvents?.some(e=>e.text.includes('harbor-cloud-proof')))));
 assert.equal((await call('/metrics')).tick,beforeChat.tick);
 console.log('two-player chat delivered without simulation tick',true);
 alice.socket.send(JSON.stringify({k:'intent',seq:2,kind:'command',args:{command:'look'}}));
 await until(()=>alice.messages.filter(m=>m.k==='snapshot').at(-1)?.e[0]?.recentEvents.some(e=>/harbor/i.test(e.text)));
 console.log('browser place',alice.messages.filter(m=>m.k==='snapshot').at(-1).e[0].place.name);
 await call('/command',{command:'inventory'},{token:httpSession.token});
 const before=await call('/metrics');assert.equal(before.pendingCommands,1);
 writeFileSync(stateFile,JSON.stringify({storage,actor,before,resumeToken:alice.messages.find(m=>m.k==='authenticated').resumeToken,sessionId:alice.messages.find(m=>m.k==='snapshot').e[0].id,accountName:'cloudalice',accountPassword:account.password,httpToken:httpSession.token}));
 alice.socket.close();bob.socket.close();
 } else if(phase==='restore'){
 const {actor,before}=saved;
 const restored=await call('/metrics');assert.equal(restored.pendingCommands,1);assert.equal(restored.tick,before.tick);
 await call('/tick',{}, {token:saved.httpToken});const delivered=await call('/events',undefined,{token:saved.httpToken});assert.ok(delivered.events.some(e=>e.to===actor));
 console.log('restart preserved actors, queued command and tick',restored.actors,restored.tick);
 const response=await mf.dispatchFetch('http://localhost/',{headers:{Upgrade:'websocket'}});
 const socket=response.webSocket,frames=[];
 socket.addEventListener('message',e=>frames.push(JSON.parse(e.data)));socket.accept();
 socket.send(JSON.stringify({k:'resume',token:saved.resumeToken}));
 await until(()=>frames.some(m=>m.k==='snapshot'));
 assert.equal(frames.find(m=>m.k==='snapshot').e[0].id,saved.sessionId);
 socket.send(JSON.stringify({k:'intent',seq:3,kind:'command',args:{command:'go up'}}));
 try { await until(()=>frames.some(m=>m.e?.[0]?.place?.name === "The Warden's Walk")); }
 catch (error) {
   console.log('movement frames',JSON.stringify(frames.map(m=>({k:m.k,tick:m.tick,entries:m.e?.map(e=>({id:e.id,name:e.identity?.name,place:e.place?.name,exits:e.place?.exits}))}))));
   console.log('movement metrics',await call('/metrics'));
   throw error;
 }
 console.log('resume preserved identity and movement reached Warden’s Walk',true);
 socket.close();
 const returning=await ws('A temporary visitor');
 await until(()=>returning.messages.some(m=>m.k==='snapshot'));
 const login=await control(returning,{action:'login',name:saved.accountName,password:saved.accountPassword});
 assert.equal(login.actor,actor,'a fresh session after restart logs back into the same character');
 const anonymousSession=await call('/connect',{});
 writeFileSync(stateFile,JSON.stringify({...saved,anonymous:anonymousSession.actor,anonymousToken:anonymousSession.token}));
 returning.socket.close();
 }else {
 const who=await call('/talk',{command:'whoami'},{token:saved.anonymousToken});assert.ok(who.lines[0].includes('Anonymouse'));console.log('anonymous identity survives restart',true);
 }
} finally {await mf.dispose()}
