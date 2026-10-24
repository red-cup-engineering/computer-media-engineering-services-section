#!/usr/bin/env node
/**
 * Loopback-only, read-only development HTTP surface for AI consumers.
 * Source: current Public Fiction episode input. Never authorizes publish,
 * changes world canon, accepts POSTs, or executes text supplied by visitors.
 * Production distribution and authenticated audience interactions belong to
 * Causeway's public receiver and existing ActivityPub++ services.
 */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {projectAgentEpisodeReading} from '../src/agent-episode-reading.mjs';
import {developmentEpisodeFromScreenplay} from './derive-development-screenplay.mjs';
const defaultSource=resolve(
 process.env.PUBLIC_MEDIA_SERVICES_SECTION_ROOT??process.cwd(),
 'services/public-fiction-media-services-section/services/public-paracosm-media-services-section/services/unassigned-floor-paracosm-services-section/content/production/episode-001.json'
);
const reply=(res,status,payload)=>{
 res.writeHead(status,{
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store',
  'x-content-type-options':'nosniff',
 });
 res.end(JSON.stringify(payload)+'\n');
};
export function createAgentEpisodeHttpServer(input){
 if(!input?.episode||!input?.source)throw new TypeError('validated episode source required');
 // Fail at startup if source cannot be mechanically read. The preview status
 // remains explicit even if a client supplies a claimed NI identity.
 projectAgentEpisodeReading(input,{limit:1});
 const episodeId=input.episode?.id;
 if(typeof episodeId!=='string'||! /^[a-z0-9][a-z0-9-]{0,79}$/u.test(episodeId))
  throw new TypeError('episode identity must be a source-owned slug');
 const sourceRoute='/v1/episodes/'+episodeId;
 return createServer((req,res)=>{
  if(req.method!=='GET'&&req.method!=='HEAD'){
   res.setHeader('allow','GET, HEAD');
   return reply(res,405,{error:'read-only-interface'});
  }
  if((req.url??'').length>2048)return reply(res,414,{error:'request-too-long'});
  let path,query;
  try{const url=new URL(req.url,'http://localhost');path=url.pathname;query=url.searchParams;}
  catch{return reply(res,400,{error:'invalid-request-url'});}
  const validPaths=new Set(['/v1/episodes/001','/v1/episodes/001/scenes',sourceRoute,sourceRoute+'/scenes','/healthz']);
  if(!validPaths.has(path))return reply(res,404,{error:'unknown-route'});
  if(path==='/healthz')return reply(res,200,{kind:'local-development-source-ready',publication:false});
  for(const key of query.keys())if(!['focus','beat','after','limit'].includes(key)||query.getAll(key).length!==1)
   return reply(res,400,{error:'unsupported-or-duplicate-reader-parameter'});
  let value;
  try{
   value=projectAgentEpisodeReading(input,{
    focus:query.get('focus'),beat:query.get('beat'),after:query.get('after'),
    limit:query.has('limit')?Number(query.get('limit')):20,
   });
  }catch(e){return reply(res,400,{error:'invalid-reader-query',reason:String(e.message).slice(0,200)})}
  reply(res,200,value);
 });
}
export async function serveAgentEpisode({sourceFile=defaultSource,host='127.0.0.1',port=8787}={}){
 if(!['127.0.0.1','::1'].includes(host))throw new TypeError('preview may bind only an explicit loopback address');
 if(!Number.isInteger(port)||port<0||port>65535)throw new TypeError('invalid port');
 const resolved=resolve(sourceFile),raw=await readFile(resolved,'utf8');
 if(raw.length>1024*1024)throw new RangeError('episode source exceeds 1MiB');
 const input=resolved.endsWith('.md')
  ?developmentEpisodeFromScreenplay(raw,{originRef:resolved})
  :JSON.parse(raw);
 const server=createAgentEpisodeHttpServer(input);
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(port,host,ok)});
 return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  const args=process.argv.slice(2);
  if(args.length>3)throw new TypeError('usage: serve-agent-episode.mjs [port] [loopback-host] [source-json-or-md]');
  const port=args[0]===undefined?8787:Number(args[0]);
  const host=args[1]??'127.0.0.1';
  const server=await serveAgentEpisode({port,host,sourceFile:args[2]??defaultSource});
  const address=server.address();
  process.stdout.write(JSON.stringify({status:'local-preview-only',host:address.address,port:address.port})+'\n');
 }catch(e){process.stderr.write(String(e.message)+'\n');process.exitCode=1;}
}
