#!/usr/bin/env node
/** Read a locally owned source episode as a paginated machine-audience narrative. */
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {projectAgentEpisodeReading} from '../src/agent-episode-reading.mjs';
import {developmentEpisodeFromScreenplay} from './derive-development-screenplay.mjs';

export async function agentEpisodeCli(argv){
 const [file,...flags]=argv;
 if(typeof file!=='string'||!file||file.startsWith('--')||flags.length%2!==0)
   throw new TypeError('usage: read-agent-episode.mjs EPISODE.json|UNAPPROVED-SCREENPLAY.md [--focus character] [--beat id] [--after shot-id] [--limit N]');
 const allowed=new Set(['--focus','--beat','--after','--limit']);
 const options={};
 for(let i=0;i<flags.length;i+=2){
  const [flag,value]=flags.slice(i,i+2);
  if(!allowed.has(flag)||typeof value!=='string'||!value||Object.hasOwn(options,flag.slice(2)))
    throw new TypeError('unknown or duplicate reader option');
  options[flag.slice(2)]=flag==='--limit'?Number(value):value;
 }
 const filePath=resolve(file);
 const raw=await readFile(filePath,'utf8');
 if(raw.length>1024*1024)throw new RangeError('episode source exceeds 1MiB');
 const source=filePath.endsWith('.md')
   ?developmentEpisodeFromScreenplay(raw,{originRef:filePath})
   :JSON.parse(raw);
 return JSON.stringify(projectAgentEpisodeReading(source,options),null,2)+'\n';
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{process.stdout.write(await agentEpisodeCli(process.argv.slice(2)))}
 catch(e){process.stderr.write(String(e?.message??e)+'\n');process.exitCode=1}
}
