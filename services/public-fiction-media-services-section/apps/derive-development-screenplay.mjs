#!/usr/bin/env node
/** Transform an explicit, unapproved timed screenplay into the SAME procedural
 * animatic scene interface as a source-owned paracosm episode. No shadow canon. */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {renderProceduralPreview} from './previsualize-microdrama.mjs';
const slug=s=>s.normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70);
const seconds=s=>{const [min,sec]=s.split(':').map(Number);return min*60+sec;};
const nonempty=x=>typeof x==='string'&&x.trim().length>0;

export function developmentEpisodeFromScreenplay(markdown,{originRef='unlocated-development-source'}={}){
 if(!nonempty(markdown)||markdown.length>128*1024)throw new TypeError('bounded screenplay markdown required');
 if(!markdown.includes('NOT canonical')&&!markdown.includes('not canon')&&!markdown.includes('NOT canon'))
  throw new TypeError('only explicitly noncanonical development manuscripts are previewable');
 const title=/^#[ \t]+([^\r\n]+)$/m.exec(markdown)?.[1]?.trim();
 if(!title||title.length>100)throw new TypeError('screenplay needs one titled property');
 const markers=[...markdown.matchAll(/^\*\*(\d{2}:\d{2})[–-](\d{2}:\d{2})\s+—\s+([^*\r\n]+)\*\*/gm)];
 if(markers.length<1||markers.length>60)throw new TypeError('need 1–60 explicitly timed scenes');
 const scenes=[];
 let cursor=0;
 for(let i=0;i<markers.length;i++){
  const m=markers[i],start=seconds(m[1]),end=seconds(m[2]);
  if(start!==cursor||end<=start||end>300||end-start>60)throw new TypeError('noncontiguous or invalid screenplay times at '+m[3]);
  const from=m.index+m[0].length,to=markers[i+1]?.index??markdown.length;
  const raw=markdown.slice(from,to).split(/^#{2,4}\s/m)[0];
  const titlePart=m[3].replace(/\.$/,'').trim();
  // One dramatic scene may contain multiple editorial shots. Never infer a
  // cut from dialogue, and never prohibit an intentionally continuous take.
  // Existing manuscripts without SHOT markers retain their exact shot IDs.
  const cuts=[...raw.matchAll(/^\*\*SHOT\s+(\d{2}:\d{2})[–-](\d{2}:\d{2})\s+—\s+([^*\r\n]+)\*\*/gm)];
  const shots=cuts.length?cuts.map((cut,j)=>({
    start:seconds(cut[1]),end:seconds(cut[2]),
    name:cut[3].replace(/\.$/,'').trim(),
    body:(j===0?raw.slice(0,cut.index):'')+raw.slice(cut.index+cut[0].length,cuts[j+1]?.index??raw.length),
  })):[{start,end,name:titlePart,body:raw}];
  let shotCursor=start;
  for(let j=0;j<shots.length;j++){
   const shot=shots[j];
   if(shot.start!==shotCursor||shot.end<=shot.start||shot.end>end||
      shot.end-shot.start>60||!shot.name)
     throw new TypeError('noncontiguous or invalid camera shots in screenplay scene '+titlePart);
   const dialogue=[...shot.body.matchAll(/^([A-Z][A-Z0-9 .\-]{1,50}?)(?:\s+\([^)]+\))?:\s*[“"]([^”"\n]+)[”"]/gm)]
     .map((hit,k)=>({id:k,speakerId:slug(hit[1]),text:hit[2]}));
   const cast=[...new Set(dialogue.map(x=>x.speakerId))];
   const frames=(shot.end-shot.start)*30,slot=Math.floor((frames-18)/Math.max(1,dialogue.length));
   const timed=dialogue.map((d,k)=>({speakerId:d.speakerId,text:d.text,
     startFrame:9+k*slot,endFrame:Math.min(frames-4,9+(k+1)*slot-3)}));
   if(timed.some(x=>x.endFrame<=x.startFrame))throw new TypeError('insufficient spoken shot time');
   let action=shot.body.replace(/^([A-Z][A-Z0-9 .\-]{1,50}?)(?:\s+\([^)]+\))?:\s*[“"][^”"\n]+[”"]/gm,' ').trim();
   action=action.split(/\n\n/)[0].replace(/[*_\x60]/g,' ').replace(/\s+/g,' ').slice(0,1200).trim()||shot.name;
   const id=(String(i+1).padStart(2,'0')+'-'+(cuts.length?String(j+1).padStart(2,'0')+'-':'')+slug(shot.name)).slice(0,79);
   scenes.push({id,sceneId:'scene-'+String(i+1).padStart(2,'0'),
     beatId:'act-'+String(Math.min(4,1+Math.floor(4*i/markers.length))),
     frames,characterIds:cast,locationId:'unassigned-staging',
     camera:shot.name,action,dialogue:timed});
   shotCursor=shot.end;
  }
  if(shotCursor!==end)throw new TypeError('camera shots do not cover complete screenplay scene '+titlePart);
  cursor=end;
 }
 if(cursor<30||cursor>300)throw new TypeError('expected 30–300 seconds of explicit development screenplay');
 const revision='sha256:'+createHash('sha256').update(markdown).digest('hex');
 return {episode:{id:slug(title)+'-development',fps:30,shots:scenes},source:{type:'DevelopmentScreenplay',id:slug(title),
  originRef,sourceRevision:revision},developmentState:'unapproved-text-audition',
  timingNote:'Dialogue spans estimated uniformly from screenplay order; not a recorded performance'};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  const [source,outDir,...opts]=process.argv.slice(2);
  if(!source||!outDir||opts.length%2)throw new TypeError('usage: derive-screenplay.mjs screenplay.md output-dir [--width 360] [--fps 18] [--scene shot-id] [--style abstract|abyssal-glass] [--voice none|rehearsal] [--motion still|character-bob|kinetic-rig]');
  const options={};for(let i=0;i<opts.length;i+=2){if(!['--width','--fps','--scene','--style','--voice','--motion'].includes(opts[i])||options[opts[i]]!==undefined)throw new TypeError('unknown option '+opts[i]);options[opts[i]]=opts[i+1];}
  const text=readFileSync(resolve(source),'utf8');
  const parsed=developmentEpisodeFromScreenplay(text,{originRef:source});
  const manifest=renderProceduralPreview(parsed,{outDir,width:Number(options['--width']??360),fps:Number(options['--fps']??18),scene:options['--scene']??null,style:options['--style']??'abstract',voice:options['--voice']??'none',motion:options['--motion']??'still',sourceBytes:Buffer.from(text,'utf8')});
  process.stdout.write(JSON.stringify({...manifest,timingNote:parsed.timingNote},null,2)+'\n');
 }catch(e){process.stderr.write(String(e?.stack??e)+'\n');process.exitCode=1;}
}