#!/usr/bin/env node
/** Read an independently executed Red Cup fabric journal; no provider calls. */
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {receiveCreativeDispatch} from '../src/creative-dispatch-reception.mjs';

export async function creativeReceptionCli(argv){
 if(argv.length!==2||argv.some(x=>!x||x.startsWith('--')))
  throw new TypeError('usage: receive-creative-round.mjs PLANNED-ROUND.json REDCUP-RESULTS.jsonl');
 const [planFile,recordsFile]=argv.map(x=>resolve(x));
 const [p,r]=await Promise.all([readFile(planFile,'utf8'),readFile(recordsFile,'utf8')]);
 if(p.length>2*1024*1024||r.length>5*1024*1024)throw new RangeError('creative batch exceeds allowed size');
 const parsed=r.trim()?r.trim().split('\n').map(line=>JSON.parse(line)):[];
 return receiveCreativeDispatch({plan:JSON.parse(p),records:parsed});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  const result=await creativeReceptionCli(process.argv.slice(2));
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  if(result.status==='INCOMPLETE_OR_REFUSED')process.exitCode=1;
 }catch(e){process.stderr.write(String(e?.message??e)+'\n');process.exitCode=2}
}
