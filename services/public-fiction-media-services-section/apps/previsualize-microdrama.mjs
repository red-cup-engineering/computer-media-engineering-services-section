#!/usr/bin/env node
/**
 * Public Fiction: deterministic, source-owned procedural animatic.
 * A cheap visual table-read, not a generative-model output, accepted audiovisual
 * asset, world canon, authenticated rights claim, publication, or media award.
 * All words, dramatic timing, character and beat references come from one existing
 * episode JSON; this script generates only audiovisual staging primitives.
 */
import { createHash } from 'node:crypto';
import { sceneSvgAbyssal,sceneSvgAbyssalActorLayer,sceneSvgAbyssalAnimated,sceneSvgAbyssalSedimentLayer,sceneSvgAbyssalOpticalLayer } from '../src/abyssal-stage.mjs';
import { composeSourceScore,scoreMidi,scoreWav as renderSourceScore } from '../src/kinetic-score.mjs';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {synthesizeRehearsalDialogue} from '../src/rehearsal-dialogue.mjs';

const requireText = (value, label) => {
  if (typeof value !== 'string' || !value.trim() || value.length > 20000) throw new TypeError(label+' needs bounded nonempty text');
  return value;
};
const slug = (value, label) => {
  requireText(value,label);
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(value)) throw new TypeError(label+' must be a slug');
  return value;
};
const integer = (v, name, lo=0, hi=100000) => {
  if (!Number.isSafeInteger(v) || v < lo || v > hi) throw new TypeError(name+' must be a bounded integer');
  return v;
};
const esc = value => String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
const hash = data => createHash('sha256').update(data).digest('hex');
const wrap = (str, max=36, n=3) => {
  const words=String(str).split(/\s+/), lines=[]; let line='';
  for(const word of words){
    if(line&&line.length+word.length+1>max){lines.push(line);line='';}
    line+=(line?' ':'')+word;
  }
  if(line)lines.push(line);
  return lines.slice(0,n);
};
const palettes = Object.freeze({
 'vacancy':['#99d1be','#80e9d0','#a8bfb9'],
 'contested-map':['#aca2ff','#7f8cfa','#f0adff'],
 'hold-open':['#efad6c','#ffc778','#87dad1'],
 'second-exit':['#8ab9fe','#dd9d7b','#c5c2f0'],
});
const characterNames=Object.freeze({latch:'LATCH',sift:'SIFT',else:'ELSE','other-latch':'OTHER LATCH'});
const paletteFor = key => {
 if(palettes[key])return palettes[key];
 const hue=parseInt(hash(key).slice(0,6),16)%360;
 return [`hsl(${hue} 66% 73%)`,`hsl(${(hue+42)%360} 68% 69%)`,`hsl(${(hue+195)%360} 48% 73%)`];
};
const timecode = s => {
  const millis=Math.round(s*1000),h=Math.floor(millis/3600000),m=Math.floor(millis/60000)%60,
    sec=Math.floor(millis/1000)%60,ms=millis%1000;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')},${String(ms).padStart(3,'0')}`;
};

/** Validate source structure without requiring the canonical, withheld Sign/FeltOS NI. */
export function planProceduralPreview(input,{scene=null,width=360,fps=18,style='abstract'}={}){
 if(!input||!input.episode||!input.source)throw new TypeError('episode source required');
 const e=input.episode,ref=input.source;
 const paracosm=ref.type==='NarrativeSource'&&ref.paracosm?.kind==='ParacosmWorkRef';
 const development=ref.type==='DevelopmentScreenplay'&&typeof ref.sourceRevision==='string'&&
   /^sha256:[a-f0-9]{64}$/.test(ref.sourceRevision)&&typeof ref.originRef==='string';
 // A MediaPlanSource is the shared upstream plan (computer-media `plan`) compiled to a
 // deterministic render job: its revision is the plan's exact source revision.
 const mediaPlan=ref.type==='MediaPlanSource'&&typeof ref.sourceRevision==='string'&&
   /^(?:sha256:[a-f0-9]{64}|git:[a-f0-9]{40}|ni:\/\/\/sha-256;[A-Za-z0-9_-]{43})$/.test(ref.sourceRevision)&&
   typeof ref.planId==='string';
 if(!paracosm&&!development&&!mediaPlan)throw new TypeError('only a source-owned paracosm, exact-hash development screenplay or compiled media plan is previewable');
 const work=paracosm?ref.paracosm.work:ref.id;
 const revision=paracosm?ref.paracosm.sourceRevision:ref.sourceRevision;
 slug(work,'work');requireText(revision,'source revision');
 integer(e.fps,'source fps',1,120); integer(width,'output width',180,1080);integer(fps,'output fps',8,30);
 if(width%18!==0)throw new TypeError('preview width must be a multiple of 18 for exact 9:16 geometry');
 if(!['abstract','abyssal-glass','abyssal-psychedelic'].includes(style))throw new TypeError('unsupported visual style');
 if(!Array.isArray(e.shots)||!e.shots.length||e.shots.length>100)throw new TypeError('1–100 shots required');
 const seen=new Set(),all=[],shots=e.shots;
 for(let i=0;i<shots.length;i++){
  const shot=shots[i],id=slug(shot.id,'shot ID');
  if(seen.has(id))throw new TypeError('duplicate shot '+id);seen.add(id);
  slug(shot.beatId,'beat ID');
  integer(shot.frames,'scene frames',1,120*600);
  if(shot.frames*fps%e.fps!==0)throw new TypeError('shot timing cannot be represented at output fps without drift');
  slug(shot.locationId,'location');requireText(shot.action,'shot action');
  if(!Array.isArray(shot.characterIds)||shot.characterIds.length>5)throw new TypeError('invalid shot cast');
  const cast=shot.characterIds.map(id=>slug(id,'cast id'));
  if(new Set(cast).size!==cast.length)throw new TypeError('preview cannot stage duplicated characters');
  if(!Array.isArray(shot.dialogue)||shot.dialogue.length>12)throw new TypeError('shot dialogue required');
  for(const line of shot.dialogue){
   if(!cast.includes(line.speakerId))throw new TypeError('speaker is missing from staged cast');
   integer(line.startFrame,'line start frame',0,shot.frames-1);
   integer(line.endFrame,'line end frame',line.startFrame+1,shot.frames);
   requireText(line.text,'dialogue words');
  }
  all.push(Object.freeze({...shot,previewFrames:shot.frames*fps/e.fps}));
 }
 if(scene!==null&&!seen.has(scene))throw new RangeError('unknown selected scene '+scene);
 const selected=scene===null?all:all.filter(s=>s.id===scene);
 return Object.freeze({type:'MicrodramaProceduralPreviewPlan',status:'DEVELOPMENT_ONLY_NOT_APPROVED',
  sourceWork:work,sourceRevision:revision,
  sourceFps:e.fps,outputFps:fps,width,height:width*16/9,scene,visualStyle:style,
  shots:selected,totalSeconds:selected.reduce((t,s)=>t+s.frames/e.fps,0),
  limitations:'Staged nonverbal animatic only: no synthetic speech, licensed actor performance, independent canonical digest, creative approval or publication.'});
}

function characterSVG(id,x,y,scale=1){
 const open=`<g transform="translate(${x} ${y}) scale(${scale})">`,close='</g>';
 if(id==='latch'||id==='other-latch'){
  const mirror=id==='other-latch'?-1:1;
  return open+`<g transform="scale(${mirror} 1)"><path d="M 45 -115 L -36 -115 L -81 -68 L -81 68 L -36 115 L 45 115" stroke="#ffae67" stroke-width="16" fill="none" stroke-linecap="round" filter="url(#glow)"/><path d="M 45 -115 L -36 -115 L -81 -68 L -81 68 L -36 115 L 45 115" stroke="#ffc58c" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="-81" cy="0" r="12" fill="#fff1d5"/></g>`+close;
 }
 if(id==='sift')return open+`<path d="M -104 -112 C 156 -50 -167 22 106 108 M 108 -111 C -141 -49 139 27 -105 115" stroke="#b0a3ff" stroke-width="12" fill="none" filter="url(#glow)"/><path d="M -104 -112 C 156 -50 -167 22 106 108 M 108 -111 C -141 -49 139 27 -105 115" stroke="#e0c9ff" stroke-width="5" fill="none"/><circle cx="-104" cy="-112" r="9" fill="#f0e0ff"/><circle cx="106" cy="108" r="9" fill="#f0e0ff"/>`+close;
 if(id==='else')return open+`<ellipse cx="0" cy="0" rx="77" ry="128" fill="#070b19" stroke="#7bdacb" stroke-width="3" stroke-dasharray="8 15"/><path d="M-42 -102 C -130 -20 -86 101 -12 142" stroke="#b9f5e1" stroke-width="4" fill="none" filter="url(#glow)"/><path d="M 35 -94 Q 80 -25 33 60" stroke="#527f79" stroke-width="3" fill="none"/>`+close;
 const color=`hsl(${parseInt(hash(id).slice(0,6),16)%360} 78% 76%)`;
 const phase=parseInt(hash(id).slice(0,4),16)%4;
 return open+`<path d="M ${-80+phase*8} -118 Q ${-110+phase*7} 0 -80 118 M 40 -118 Q ${135-phase*10} 0 40 118 M -58 -70 Q 0 ${-130+phase*15} 52 -70 M -58 70 Q 0 ${145-phase*15} 52 70" stroke="${color}" stroke-width="10" fill="none" filter="url(#glow)"/><path d="M -80 -118 Q -125 0 -80 118 M 40 -118 Q 130 0 40 118" stroke="${color}" stroke-width="4" fill="none"/><circle cy="0" cx="0" r="14" fill="${color}" opacity=".88"/>`+close;
}
/** Pure SVG staging of an episode shot, no extra story content. */
export function sceneSvg(shot,index,total,work){
 const colors=paletteFor(shot.beatId);
 const featured=shot.characterIds;
 const spots=featured.length===1?[270]:featured.length===2?[170,366]:featured.length===3?[125,270,417]:[90,195,330,450];
 const positions=featured.map((id,i)=>characterSVG(id,spots[i]??270,455,featured.length>=3?0.62:featured.length===2?0.83:1)).join('');
 const dual=shot.id==='cross-read'||shot.id==='other-latch';
 const door=dual?`<path d="M105 280 L224 246 L224 680 L105 710 Z M 310 246 L436 278 L436 710 L310 680 Z" stroke="${colors[1]}" stroke-width="8" fill="none"/><path d="M226 242 L309 242 L309 680 L226 680" stroke="${colors[0]}" stroke-width="4" fill="none"/>`:
  `<path d="M 175 280 L 365 280 L 405 705 L 130 705 Z" stroke="${colors[0]}" stroke-width="5" fill="#050d16" fill-opacity=".36"/><path d="M 195 306 L 347 306 L 378 681 L 158 681" stroke="${colors[1]}" stroke-width="2" fill="none"/>`;
 const title=work.replace(/-serial$/,'').replace(/-/g,' ').toUpperCase();
 const lines=wrap(shot.action,39,2),shotLabel=shot.id.replace(/-/g,' ').toUpperCase();
 const progress=Array.from({length:total},(_,i)=>`<rect x="${36+i*(468/total)}" y="914" width="${Math.max(2,468/total-5)}" height="5" rx="2" fill="${i<=index?colors[0]:'#50636b'}" opacity="${i<=index?'1':'.3'}"/>`).join('');
 const seed=parseInt(hash(shot.id).slice(0,6),16),particles=Array.from({length:38},(_,i)=>{
  const x=(seed+i*137+Math.floor(i*i*17))%540,y=(seed+i*61+i*i*7)%730;
  return `<circle cx="${x}" cy="${y}" r="${i%5===0?1.7:0.7}" fill="${colors[2]}" opacity="${.12+(i%4)*.12}"/>`;
 }).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="540" height="960" viewBox="0 0 540 960">
 <defs><linearGradient id="bg" x1="0" y1="0" x2="0.55" y2="1"><stop stop-color="#070e17"/><stop offset=".57" stop-color="#132730"/><stop offset="1" stop-color="#090b15"/></linearGradient><radialGradient id="vapor"><stop stop-color="${colors[0]}" stop-opacity=".23"/><stop offset="1" stop-color="${colors[0]}" stop-opacity="0"/></radialGradient><filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="7"/></filter></defs>
 <rect width="540" height="960" fill="url(#bg)"/><ellipse cx="270" cy="405" rx="230" ry="385" fill="url(#vapor)"/>${particles}
 <path d="M 48 960 L 202 240 M 492 960 L 338 240 M 0 850 L 200 242 M 540 850 L 340 242 M 0 752 L 540 752 M 0 817 L 540 817" stroke="${colors[2]}" stroke-width="1.3" opacity=".27" fill="none"/>
 <path d="M 35 760 L 505 760 M 45 725 L 495 725 M 70 651 L 470 651 M 102 567 L 438 567" stroke="${colors[0]}" stroke-width="1" opacity=".12"/>
 <g opacity=".96">${door}</g>${positions}
 <rect x="20" y="20" width="500" height="112" rx="8" fill="#06121d" fill-opacity=".83" stroke="${colors[0]}" stroke-opacity=".25"/>
 <text x="39" y="55" font-family="DejaVu Sans" font-size="16" letter-spacing="3" fill="${colors[0]}">CAUSEWAY / PARACOSM</text>
 <text x="39" y="97" font-family="DejaVu Sans" font-size="28" font-weight="bold" letter-spacing="1.2" fill="#f1eee9">${esc(title)}</text>
 <text x="38" y="179" font-family="DejaVu Sans" font-size="20" letter-spacing="1" fill="${colors[0]}">${String(index+1).padStart(2,'0')} / ${String(total).padStart(2,'0')}</text>
 <text x="502" y="179" text-anchor="end" font-family="DejaVu Sans" font-size="13" fill="#acbcc6">${esc(shot.beatId.toUpperCase())}</text>
 <rect x="21" y="716" width="498" height="204" rx="7" fill="#030a15" fill-opacity=".87" stroke="${colors[0]}" stroke-opacity=".28"/><text x="270" y="217" text-anchor="middle" font-family="DejaVu Sans" font-size="12" letter-spacing="2" fill="${colors[0]}">${esc(shotLabel)}</text>
 <text x="270" y="907" font-family="DejaVu Sans" font-size="11" letter-spacing="1" text-anchor="middle" fill="#899da8">UNAPPROVED / PREVIS</text>${progress}
 </svg>`;
}

function run(tool,args,cwd){
 const argsWithCpuPolicy=tool==='ffmpeg'
   ?['-cpuflags','0','-filter_threads','1','-filter_complex_threads','1',...args]
   :args;
 const p=spawnSync(tool,argsWithCpuPolicy,{cwd,encoding:'utf8',maxBuffer:2*1024*1024,timeout:180000});
 if(p.error||p.status!==0)throw new Error(`${tool} failed: ${(p.stderr||p.error||'unknown error').toString().slice(-1500)}`);
 return p.stdout;
}
function makeSrt(shots,sourceFps){
 let start=0,num=1;const lines=[];
 for(const shot of shots){
  for(const cue of shot.dialogue){
   const speaker=characterNames[cue.speakerId]??cue.speakerId.replace(/-/g,' ').toUpperCase();
   lines.push(String(num++),`${timecode(start+cue.startFrame/sourceFps)} --> ${timecode(start+cue.endFrame/sourceFps)}`,`${speaker}: ${cue.text}`,'');
  }
  start+=shot.frames/sourceFps;
 }
 return lines.join('\n')+'\n';
}

/**
 * Compose deterministic SVG shot assets (from a media plan) onto a 540x960 scene.
 * A `frame` asset replaces the scene art; `overlay` assets are drawn over it, in order.
 * Assets are self-contained SVG documents embedded as data URIs, so nothing external is read.
 */
export function composeShotSvg(baseSvg,assets=[]){
 if(!assets.length)return baseSvg;
 const embed=asset=>`<image x="0" y="0" width="540" height="960" preserveAspectRatio="xMidYMid meet" href="data:image/svg+xml;base64,${Buffer.from(asset.svg,'utf8').toString('base64')}"/>`;
 const frame=assets.find(a=>a.role==='frame');
 const overlays=assets.filter(a=>a.role==='overlay').map(embed).join('');
 const body=frame?`<svg xmlns="http://www.w3.org/2000/svg" width="540" height="960" viewBox="0 0 540 960">${embed(frame)}</svg>`:baseSvg;
 return body.replace(/<\/svg>\s*$/,overlays+'</svg>');
}

export function renderProceduralPreview(input,{outDir,width=360,fps=18,scene=null,style='abstract',voice='none',motion='still',sourceBytes=null,
 captions=null,assets=[],provenance=null}={}){
 const assetsFor=shotId=>assets.filter(a=>a.shotId===shotId);
 if(captions&&(typeof captions.srt!=='string'||captions.burnedIn!==undefined&&typeof captions.burnedIn!=='boolean'))throw new TypeError('captions need compiled srt text');
 if(!['still','character-bob','kinetic-rig'].includes(motion)||(motion!=='still'&&style==='abstract'))throw new TypeError('character motion requires abyssal-glass or abyssal-psychedelic stage');
 if(!['none','rehearsal'].includes(voice))throw new TypeError('supported voice profile is none or rehearsal');
 const plan=planProceduralPreview(input,{width,fps,scene,style}),destination=resolve(requireText(outDir,'output directory'));
  const psycho=plan.visualStyle==='abyssal-psychedelic',abyssal=plan.visualStyle!=='abstract';
 if(existsSync(join(destination,'preview.mp4')))throw new Error('refusing to overwrite an existing preview');
 mkdirSync(destination,{recursive:true});
 const temp=mkdtempSync(join(tmpdir(),'fiction-previs-'));
 try{
  const parts=[],pngs=[],vectorMasters=[];
  for(const [i,shot] of plan.shots.entries()){
   const svg=join(temp,`shot-${String(i).padStart(2,'0')}.svg`),png=svg.replace('.svg','.png'),clip=svg.replace('.svg','.mp4');
   const shotAssets=assetsFor(shot.id);
   writeFileSync(svg,composeShotSvg(abyssal?sceneSvgAbyssal(shot,i,plan.shots.length,plan.sourceWork,{psychedelic:psycho}):sceneSvg(shot,i,plan.shots.length,plan.sourceWork),shotAssets),'utf8');
    const sceneLabel=String(i+1).padStart(2,'0');
    vectorMasters.push({path:svg,filename:'scene-'+sceneLabel+'.svg',kind:'editable-static-svg'});
    if(abyssal){
     const native=join(temp,'animated-'+sceneLabel+'.svg');
     writeFileSync(native,sceneSvgAbyssalAnimated(shot,i,plan.shots.length,plan.sourceWork,{sourceFps:plan.sourceFps,psychedelic:psycho}),'utf8');
     vectorMasters.push({path:native,filename:'animated-scene-'+sceneLabel+'.svg',kind:'animated-svg-smil'});
     for(const actor of shot.characterIds){
      const layer=join(temp,'actor-'+sceneLabel+'-'+actor+'.svg');
      writeFileSync(layer,sceneSvgAbyssalActorLayer(shot,actor),'utf8');
      vectorMasters.push({path:layer,filename:'actor-'+sceneLabel+'-'+actor+'.svg',kind:'reusable-actor-svg'});
     }
     if(psycho){
      const opticalMaster=join(temp,'optophonetic-'+sceneLabel+'.svg');
      writeFileSync(opticalMaster,sceneSvgAbyssalOpticalLayer(shot,{animated:true}),'utf8');
      vectorMasters.push({path:opticalMaster,filename:'optophonetic-'+sceneLabel+'.svg',kind:'animated-optical-svg-smil'});
     }
    }
   run('ffmpeg',['-nostdin','-y','-hide_banner','-loglevel','error','-i',svg,'-frames:v','1',png],temp);
   const frames=shot.previewFrames;
   if((motion==='character-bob'||motion==='kinetic-rig')&&shot.characterIds.length){
    const backgroundSvg=join(temp,`background-${String(i).padStart(2,'0')}.svg`),backgroundPng=backgroundSvg.replace('.svg','.png');
    writeFileSync(backgroundSvg,composeShotSvg(sceneSvgAbyssal(shot,i,plan.shots.length,plan.sourceWork,{hideActors:true,psychedelic:psycho}),shotAssets),'utf8');
    run('ffmpeg',['-nostdin','-y','-hide_banner','-loglevel','error','-i',backgroundSvg,'-frames:v','1',backgroundPng],temp);
    const inputs=[backgroundPng],graph=['[0:v]format=rgba[base]'];let previous='base';
    for(const [j,actor] of shot.characterIds.entries()){
     const spriteSvg=join(temp,`sprite-${i}-${j}.svg`),spritePng=spriteSvg.replace('.svg','.png');
     writeFileSync(spriteSvg,sceneSvgAbyssalActorLayer(shot,actor),'utf8');
     run('ffmpeg',['-nostdin','-y','-hide_banner','-loglevel','error','-i',spriteSvg,'-frames:v','1','-pix_fmt','rgba',spritePng],temp);
     inputs.push(spritePng);const spriteNumber=inputs.length-1;graph.push(`[${spriteNumber}:v]format=rgba[sprite${j}]`);
     const speaking=shot.dialogue.filter(cue=>cue.speakerId===actor).map(cue=>`between(t,${(cue.startFrame/plan.sourceFps).toFixed(3)},${(cue.endFrame/plan.sourceFps).toFixed(3)})`).join('+')||'0';
     const phase=((i*5+j*7)%11)/3;
     const dx=`9*sin(2*PI*t/3+${phase})`;
     const dy=`6*sin(2*PI*t/2.1+${phase})-13*(${speaking})*abs(sin(2*PI*t*3.8))`;
     graph.push(`[${previous}][sprite${j}]overlay=x='${dx}':y='${dy}':eval=frame:format=auto[v${j}]`);
     previous=`v${j}`;
     if(motion==='kinetic-rig'&&shot.dialogue.some(cue=>cue.speakerId===actor)){
      const expressiveSvg=join(temp,'expressive-'+i+'-'+j+'.svg'),expressivePng=expressiveSvg.replace('.svg','.png');
      writeFileSync(expressiveSvg,sceneSvgAbyssalActorLayer(shot,actor,{pose:'speaking'}),'utf8');
      run('ffmpeg',['-nostdin','-y','-hide_banner','-loglevel','error','-i',expressiveSvg,'-frames:v','1','-pix_fmt','rgba',expressivePng],temp);
      inputs.push(expressivePng);
      const inputNumber=inputs.length-1;
      graph.push(`[${inputNumber}:v]format=rgba[expression${j}]`);
      graph.push(`[${previous}][expression${j}]overlay=x='${dx}':y='${dy}':eval=frame:format=auto:enable='gt(${speaking},0)'[perform${j}]`);
      previous=`perform${j}`;
     }
    }
    if(motion==='kinetic-rig'){
     const ssvg=join(temp,'sediment-'+i+'.svg'),spng=ssvg.replace('.svg','.png');
     writeFileSync(ssvg,sceneSvgAbyssalSedimentLayer(shot),'utf8');
     run('ffmpeg',['-nostdin','-y','-hide_banner','-loglevel','error','-i',ssvg,'-frames:v','1','-pix_fmt','rgba',spng],temp);
     inputs.push(spng);
     const inputNumber=inputs.length-1;
     graph.push(`[${inputNumber}:v]format=rgba[sediment]`);
     graph.push(`[${previous}][sediment]overlay=x='9*sin(2*PI*t/9)':y='-10*t/3':eval=frame:format=auto[depth]`);
     previous='depth';
    }
    if(psycho){
     // The editable animated master uses SMIL; FFmpeg animates the optical
     // plane independently at a bounded low-frequency rotation.
     const opticalSvg=join(temp,'optical-motion-'+i+'.svg'),opticalPng=opticalSvg.replace('.svg','.png');
     writeFileSync(opticalSvg,sceneSvgAbyssalOpticalLayer(shot),'utf8');
     run('ffmpeg',['-nostdin','-y','-hide_banner','-loglevel','error','-i',opticalSvg,'-frames:v','1','-pix_fmt','rgba',opticalPng],temp);
     inputs.push(opticalPng);
     const n=inputs.length-1;
     graph.push(`[${n}:v]format=rgba,rotate=a='0.055*sin(2*PI*t/11)':fillcolor=none,format=rgba[optic${i}]`);
     graph.push(`[${previous}][optic${i}]overlay=x='6*sin(2*PI*t/13)':y='9*sin(2*PI*t/17)':eval=frame:format=auto[opticalComposite]`);
     previous='opticalComposite';
    }
    graph.push(`[${previous}]scale=${plan.width}:${plan.height}:flags=lanczos,format=yuv420p[final]`);
    run('ffmpeg',['-nostdin','-y','-hide_banner','-loglevel','error',
     ...inputs.flatMap(f=>['-loop','1','-framerate',String(plan.outputFps),'-i',f]),
     '-filter_complex',graph.join(';'),'-map','[final]','-frames:v',String(frames),
     '-c:v','libx264','-x264-params','asm=0','-threads','1','-preset','veryfast','-crf','23','-pix_fmt','yuv420p','-an','-map_metadata','-1',clip],temp);
   }else{
    run('ffmpeg',['-nostdin','-y','-hide_banner','-loglevel','error','-loop','1','-framerate','1','-i',png,
     '-vf',`zoompan=z=1.02+0.075*(on/${frames}):x=(iw-iw/zoom)/2:y=(ih-ih/zoom)/2:d=${frames}:s=${plan.width}x${plan.height}:fps=${plan.outputFps},format=yuv420p`,
     '-frames:v',String(frames),'-c:v','libx264','-x264-params','asm=0','-threads','1','-preset','veryfast','-crf','23','-pix_fmt','yuv420p','-an','-map_metadata','-1',clip],temp);
   }
   parts.push(clip);pngs.push(png);
  }
  const fileList=parts.map(file=>`file '${file}'`).join('\n')+'\n',concat=join(temp,'files.txt');writeFileSync(concat,fileList);
  const srt=captions?captions.srt:makeSrt(plan.shots,plan.sourceFps),srtPath=join(temp,'captions.srt');writeFileSync(srtPath,srt,'utf8');
  const score=composeSourceScore(plan.shots,plan.sourceFps,{profile:psycho?'psychedelic':'harmonic'});
   const audioPath=join(temp,'score.wav'),midiPath=join(temp,'score.mid');
   writeFileSync(audioPath,renderSourceScore(score));writeFileSync(midiPath,scoreMidi(score));
  let performance=null,voicePath=null;
  if(voice==='rehearsal'){
   performance=synthesizeRehearsalDialogue(plan.shots,plan.sourceFps,plan.totalSeconds);
   voicePath=join(temp,'voice-rehearsal.wav');
   writeFileSync(voicePath,performance.wav);
   copyFileSync(voicePath,join(destination,'dialogue-rehearsal.wav'));
  }
  const final=join(destination,'preview.mp4');
  run('ffmpeg',['-nostdin','-y','-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',concat,'-i',audioPath,
   ...(voicePath?['-i',voicePath]:[]),
   ...(voicePath?['-filter_complex','[1:a]volume=0.22[bed];[2:a]volume=1.0[cast];[bed][cast]amix=inputs=2:duration=first:normalize=0:dropout_transition=0,alimiter=limit=0.92[mixed]',
     '-map','0:v','-map','[mixed]']:[]),
   ...(captions&&captions.burnedIn===false?[]:['-vf',`subtitles=filename=captions.srt:force_style='FontName=DejaVu Sans,FontSize=${Math.max(13,Math.round(9+plan.width/52))},Outline=2,Shadow=0,MarginV=${Math.max(12,Math.round(16*plan.width/180))},Alignment=2'`]),
   '-c:v','libx264','-x264-params','asm=0','-threads','1','-preset','veryfast','-crf','22','-pix_fmt','yuv420p',
   '-c:a','aac','-b:a','96k','-ar','24000','-ac','1','-shortest','-map_metadata','-1','-movflags','+faststart',final],temp);
  copyFileSync(srtPath,join(destination,'captions.srt'));
   copyFileSync(audioPath,join(destination,'score.wav'));
   copyFileSync(midiPath,join(destination,'score.mid'));
   for(const item of vectorMasters)copyFileSync(item.path,join(destination,item.filename));
  for(let i=0;i<pngs.length;i++)copyFileSync(pngs[i],join(destination,`scene-${String(i+1).padStart(2,'0')}.png`));
  const poster=join(destination,'contact-sheet.png');
  if(pngs.length===1)copyFileSync(pngs[0],poster);
  else run('ffmpeg',['-nostdin','-y','-hide_banner','-loglevel','error',...pngs.flatMap(p=>['-i',p]),
   '-filter_complex',`${pngs.map((_,i)=>`[${i}:v]scale=180:320[p${i}]`).join(';')};${pngs.map((_,i)=>`[p${i}]`).join('')}xstack=inputs=${pngs.length}:layout=${pngs.map((_,i)=>`${(i%4)*180}_${Math.floor(i/4)*320}`).join('|')}[out]`,
   '-map','[out]','-frames:v','1',poster],temp);
  const sourceHash=hash(sourceBytes??JSON.stringify(input));
  const face=spawnSync('fc-match',['-f','%{file}','DejaVu Sans'],{encoding:'utf8',timeout:5000});
  const fontPath=face.status===0?face.stdout.trim():null;
  const toolchain={
    node:process.version,
    ffmpeg:run('ffmpeg',['-version'],temp).split('\n')[0].trim(),
    rendererSha256:hash(readFileSync(fileURLToPath(import.meta.url))),
    reproducibilityPolicy:'ffmpeg cpuflags=0, single filter thread and x264 asm=0 for portable CPU-scalar execution',
    font:fontPath&&existsSync(fontPath)
      ?{family:'DejaVu Sans',faceSha256:hash(readFileSync(fontPath))}
      :{family:'DejaVu Sans',faceSha256:null,unwitnessed:true}
  };
  const summary={kind:'MicrodramaProceduralPreview',state:'DEVELOPMENT_ONLY_NOT_APPROVED',sourceWork:plan.sourceWork,
    sourceRevision:plan.sourceRevision,sourceSha256:sourceHash,previewSha256:hash(readFileSync(final)),
    frames:Math.round(plan.totalSeconds*plan.outputFps),seconds:plan.totalSeconds,
    output:{width:plan.width,height:plan.height,fps:plan.outputFps},visualStyle:plan.visualStyle,motionProfile:motion,sceneIds:plan.shots.map(x=>x.id),
    textTrack:'captions.srt',poster:'contact-sheet.png',toolchain,
    ...(provenance?{mediaPlan:provenance,shotAssets:assets.map(a=>({shotId:a.shotId,assetId:a.assetId,role:a.role,sha256:a.sha256}))}:{}),
     editableAssets:{
       vectorMasters:vectorMasters.map(a=>({file:a.filename,format:a.kind,sha256:hash(readFileSync(a.path))})),
       soundtrack:{waveform:'score.wav',waveformSha256:hash(readFileSync(audioPath)),
         midi:'score.mid',midiSha256:hash(readFileSync(midiPath)),midiFormat:'SMF1',sourceFps:score.sourceFps,
         noteCount:score.notes.length,shotMotifs:score.markers,profile:score.profile??'harmonic',
          ...(psycho?{optophoneticVersion:score.optophoneticVersion}:{})}
     },
    performance:performance?{
      profile:'LOCAL_ESPEAK_UNAPPROVED_REHEARSAL',dialogueTrack:'dialogue-rehearsal.wav',dialogueSha256:performance.sha256,
      eventCount:performance.cues.length,events:performance.cues,
      engineVersion:run('espeak',['--version'],temp).split('\n')[0].trim(),
      synthesisSourceSha256:hash(readFileSync(fileURLToPath(new URL('../src/rehearsal-dialogue.mjs',import.meta.url))))
    }:{profile:'NONVERBAL_TONE_ONLY'},
    methodology:'Exact-source static and SVG/SMIL masters plus editable Standard MIDI and PCM; psychedelic optics/inharmonic polyrhythms share a shot-derived optophonetic signature. FFmpeg separately encodes bounded frame-driven kinetic optical motion, optional locally synthesized rehearsal. No script, inferred canon or external visual/audio assets. Bytes depend on pinned fonts/codec/toolchain',
    rights:'No paid upstream model or licensed source graphics used; original minimal procedural staging of existing fictional scene source',
    limitations:performance?'Locally generated eSpeak line readings are TEMPORARY performance sketches, not approved character voices, performed dialogue, canonical identity, editorial release or audience response. No rights/production claims follow.':plan.limitations};
  writeFileSync(join(destination,'preview-manifest.json'),JSON.stringify(summary,null,2)+'\n');
  return summary;
 }finally{rmSync(temp,{recursive:true,force:true});}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  const [source,outDir,...opts]=process.argv.slice(2);
  if(!source||!outDir||opts.length%2)throw new TypeError('usage: previsualize.mjs source.json output-dir [--width 360] [--fps 18] [--scene shot-id] [--style abstract|abyssal-glass|abyssal-psychedelic] [--voice none|rehearsal] [--motion still|character-bob|kinetic-rig]');
  const options={};
  for(let i=0;i<opts.length;i+=2){
   const name=opts[i],value=opts[i+1];
   if(!['--width','--fps','--scene','--style','--voice','--motion'].includes(name)||name in options)throw new TypeError('unknown or repeated option '+name);
   options[name]=name==='--scene'||name==='--style'||name==='--voice'||name==='--motion'?value:Number(value);
  }
  const bytes=readFileSync(resolve(source));if(bytes.length>1024*1024)throw new RangeError('source JSON exceeds 1 MiB');
  const summary=renderProceduralPreview(JSON.parse(bytes),{outDir,sourceBytes:bytes,width:options['--width']??360,
   fps:options['--fps']??18,scene:options['--scene']??null,style:options['--style']??'abstract',voice:options['--voice']??'none',motion:options['--motion']??'still'});
  process.stdout.write(JSON.stringify(summary,null,2)+'\n');
 }catch(e){process.stderr.write((e?.stack||String(e))+'\n');process.exitCode=1;}
}