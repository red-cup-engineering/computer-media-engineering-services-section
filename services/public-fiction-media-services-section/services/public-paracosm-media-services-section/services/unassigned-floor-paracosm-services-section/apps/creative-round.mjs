#!/usr/bin/env node
/**
 * CLI carrier for the existing Red Cup inference-fabric JSONL job contract.
 * Never contacts models, mutates canon, authorizes budgets, or publishes.
 */
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {planCreativeRound,resolveCreativeRound,planPitchRoom,planPitchReadthrough,resolvePitchRoom} from '../src/creative-council.mjs';

async function readJson(path){
 if(typeof path!=='string'||!path.trim())throw new TypeError('a JSON input file is required');
 const source=await readFile(path,'utf8');
 if(source.length>1024*1024)throw new TypeError('creative input file exceeds 1 MiB');
 return JSON.parse(source);
}
export async function creativeRoundCli(args){
 const [mode,path,flag]=args;
 const planners={plan:planCreativeRound,pitch:planPitchRoom,readthrough:planPitchReadthrough};
 const resolvers={resolve:resolveCreativeRound,'decide-pitch':resolvePitchRoom};
 if(!(mode in planners)&&!(mode in resolvers)||!path||args.length>3||
    (flag&&flag!=='--jsonl')||(mode in resolvers&&flag))
   throw new TypeError('Usage: creative-round.mjs plan|pitch|readthrough|resolve|decide-pitch INPUT.json [--jsonl]');
 const input=await readJson(path);
 if(mode in resolvers)return JSON.stringify(resolvers[mode](input),null,2)+'\n';
 const result=planners[mode](input);
 if(flag==='--jsonl')return result.jobs.map(job=>JSON.stringify({
  id:job.id,messages:job.messages,maxTokens:job.maxTokens,
  ...(job.outputContract?{outputContract:job.outputContract}:{}),
  metadata:{fictionActorRef:job.actorRef,creativeOffice:job.seat,sourceWorldRef:result.worldRef,
   creativeStage:mode,sourceMandateRef:result.mandateRef,unexecuted:true}
 })).join('\n')+'\n';
 return JSON.stringify(result,null,2)+'\n';
}

if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{process.stdout.write(await creativeRoundCli(process.argv.slice(2)))}
 catch(error){process.stderr.write(String(error?.message??error)+'\n');process.exitCode=1}
}
