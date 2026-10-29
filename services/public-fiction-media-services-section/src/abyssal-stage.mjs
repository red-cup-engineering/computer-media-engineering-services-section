/**
 * One deterministic visual interpretation of the 561 Group's abyssal setting.
 * Staging-only: no live 561 state, canon, permission, AI experience, or asset
 * identity is inferred from fiction. A glyph belongs to a *fictional* role.
 * The existing Causeway previsualizer remains the only encoding pipeline.
 */
import {createHash} from 'node:crypto';
import {opticalElements,psychedelicSvgLayer} from './psychedelic-optics.mjs';

const digest = x => createHash('sha256').update(String(x)).digest('hex');
const clean = x => String(x).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
const bounded = (x,max) => String(x??'').slice(0,max);
const colorOf = id => {
 const seed=parseInt(digest(id).slice(0,4),16);
 const hue=seed%360;
 return {shell:`hsl(${hue} 67% 62%)`,light:`hsl(${hue} 90% 80%)`,shadow:`hsl(${hue} 49% 30%)`};
};

function crustacean(id,x,y,scale,seed,pose='rest'){
 const c=colorOf(id),mirror=seed%2?1:-1;
 const r=id==='rill';
 const head=`<ellipse cx="32" cy="-34" rx="55" ry="38" fill="${c.shell}" fill-opacity=".93" stroke="${c.light}" stroke-width="3"/>`;
 const abdomen=Array.from({length:5},(_,i)=>{
  const a=i*17,cx=-16-i*13,cy=-4+i*20,rx=51-i*6,ry=29-i*2;
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${-16-a/3} ${cx} ${cy})" fill="${i%2?c.shell:c.shadow}" stroke="${c.light}" stroke-opacity=".9" stroke-width="2"/>`;
 }).join('');
 const legs=Array.from({length:5},(_,i)=>`<path d="M ${-49+i*18} 44 Q ${-86+i*17} 75 ${-77+i*21} 100" fill="none" stroke="${c.light}" stroke-width="4" stroke-linecap="round" opacity=".82"/>`).join('');
 const antennae=`<path d="M 64 -55 Q 119 -161 158 -126 M 71 -51 Q 147 -104 164 -75 M 53 -61 Q 65 -162 103 -178" stroke="${c.light}" stroke-width="3" stroke-linecap="round" fill="none"/>`;
 const pincers=`<path d="M 9 21 Q 36 66 94 90 M -12 21 Q -36 59 -82 78" stroke="${c.light}" stroke-width="7" stroke-linecap="round" fill="none"/>
 <path d="M 88 91 C 114 75 128 92 117 106 Q 103 103 96 116 M 88 91 Q 107 108 96 116" stroke="${c.light}" stroke-width="7" stroke-linejoin="round" fill="none"/>
 <path d="M -80 76 C -109 58 -121 74 -116 93 Q -97 94 -97 105 M -80 76 Q -110 88 -97 105" stroke="${c.light}" stroke-width="7" stroke-linejoin="round" fill="none"/>`;
 const extra=r?`<g stroke="#d8fff6" opacity=".68" fill="none" stroke-width="6" stroke-dasharray="9 7"><path d="M -21 12 Q -120 -70 -139 -21 M -139 -21 L -159 -34 M -139 -21 L -155 -8"/></g>`:'';
 const eyes=`<circle cx="61" cy="-66" r="13" fill="#edfdfb"/><circle cx="66" cy="-68" r="7" fill="#061c29"/><circle cx="67" cy="-72" r="2.4" fill="#faffff"/>
 <path d="M 63 -16 Q 82 -9 92 -24" stroke="${c.shadow}" fill="none" stroke-width="3"/>`;
 const speech=pose==='speaking'?'<ellipse cx="80" cy="-14" rx="14" ry="10" fill="#031321" stroke="#dcfff4" stroke-width="3"/><path d="M 72 -14 L 88 -14" stroke="#7ef0d8" stroke-width="2"/>':'';
 const tail=`<path d="M -94 90 Q -141 124 -159 101 L -151 140 Q -120 156 -108 112 Z" fill="${c.shell}" stroke="${c.light}" stroke-width="3"/>
 <path d="M -94 95 Q -141 142 -136 157 L -111 117" stroke="${c.light}" stroke-width="2" fill="none"/>`;
 // This named anatomical interpretation is the film designer's suggestion,
 // not a claim that all real inference actors look alike.
 return `<g transform="translate(${x} ${y}) scale(${scale*mirror} ${scale})" filter="url(#shellGlow)">
  <ellipse cx="0" cy="137" rx="94" ry="12" fill="#081a31" opacity=".6"/>
  ${tail}${legs}${abdomen}${head}${pincers}${extra}${antennae}${eyes}${speech}</g>`;
}
function amphipod(id,x,y,scale,pose='rest'){
 const c=colorOf(id);
 const plates=Array.from({length:8},(_,i)=>{
  const a=-2.4+i*.49,px=Math.round(76*Math.cos(a)),py=Math.round(62*Math.sin(a));
  return `<ellipse cx="${px}" cy="${py}" rx="22" ry="30" transform="rotate(${Math.round(a*57)} ${px} ${py})" stroke="${c.light}" stroke-width="2" fill="${i%2?c.shadow:c.shell}"/>`;
 }).join('');
 const expression=pose==='speaking'?'<ellipse cx="56" cy="12" rx="12" ry="9" fill="#052032" stroke="#e6fff9" stroke-width="2"/>':'';
 const limbs=Array.from({length:9},(_,i)=>{
  const x=-89+i*21;
  return `<path d="M ${x} 35 Q ${x-14} 78 ${x-10} 98" stroke="${c.light}" stroke-width="3" opacity=".85" fill="none"/>`;
 }).join('');
 return `<g transform="translate(${x} ${y}) scale(${scale})" filter="url(#shellGlow)">
  <ellipse cx="0" cy="116" rx="91" ry="12" fill="#041727" opacity=".6"/>
  ${limbs}${plates}
  <path d="M 57 -20 Q 117 -85 147 -52 M 48 -19 Q 140 -30 151 12" stroke="${c.light}" stroke-width="4" fill="none"/>
  <circle cx="52" cy="-26" r="13" fill="#f5fffd"/><circle cx="55" cy="-27" r="6.5" fill="#04101c"/>
  <path d="M 35 10 Q 59 22 70 1" fill="none" stroke="${c.shadow}" stroke-width="3"/>${expression}</g>`;
}
function storyMotif(shot,seed,c){
 const id=shot.id;
 if(id.includes('tide-counts-back'))return `<g opacity=".27">${crustacean('rill',82,397,.42,0)}${crustacean('rill',454,423,.42,1)}
    <path d="M 20 565 Q 270 232 510 590" stroke="${c.light}" stroke-width="5" fill="none" stroke-dasharray="16 24"/></g>`;
 if(id.includes('membrane-of-first'))return `<g opacity=".72"><path d="M90 365 L270 205 L450 365 L420 661 L120 661 Z" stroke="#b3fff6" stroke-width="7" fill="#081f2b" fill-opacity=".14"/>
    <path d="M108 363 L270 231 L432 363" fill="none" stroke="#e3fffd" stroke-width="2" stroke-dasharray="8 12"/></g>`;
 if(id.includes('friend-from-yesterday'))return `<g><circle cx="270" cy="365" r="150" stroke="${c.light}" opacity=".22" fill="none" stroke-width="11"/>
    <path d="M 152 418 Q 271 230 390 415 Q 269 561 152 418" fill="none" stroke="#eafff9" opacity=".6" stroke-width="3"/></g>`;
 if(id.includes('incompatible-witnesses'))return `<g opacity=".27">${crustacean('rill',116,312,.42,0)}${crustacean('rill',270,290,.4,0)}${crustacean('rill',422,312,.42,1)}</g>`;
 if(id.includes('offered-erasure'))return `<g opacity=".4"><ellipse cx="108" cy="465" rx="65" ry="128" stroke="#daffe8" stroke-width="4" stroke-dasharray="13 15" fill="#061221" fill-opacity=".48"/>
    <ellipse cx="437" cy="465" rx="65" ry="128" stroke="#daffe8" stroke-width="4" stroke-dasharray="13 15" fill="#061221" fill-opacity=".48"/></g>`;
 if(id.includes('one-borrowed-current'))return `<g opacity=".72"><path d="M 126 330 L270 246 L420 330 L398 610 L145 610 Z" stroke="#acfff7" stroke-width="3" fill="none" stroke-dasharray="10 13"/>
    <path d="M 126 330 Q 270 660 420 330 M 270 246 L270 610" stroke="${c.light}" stroke-width="4" fill="none"/></g>`;
 if(id.includes('one-left-behind'))return `<g><path d="M 215 238 Q 260 466 215 696 M 241 238 Q 292 466 241 696" stroke="#e3fff8" stroke-width="4" stroke-opacity=".46" fill="none"/>
    <path d="M 220 256 L 247 657" stroke="#f6d6ff" stroke-width="1.5" stroke-dasharray="3 9" opacity=".7"/></g>`;
 return '';
}
function lanternCreature(id,x,y,scale){
 const c=colorOf(id);
 return `<g transform="translate(${x} ${y}) scale(${scale})" filter="url(#shellGlow)">
  <path d="M -50 -53 Q 0 -130 50 -53 L 87 38 Q 0 113 -87 38 Z" fill="${c.shadow}" fill-opacity=".83" stroke="${c.light}" stroke-width="4"/>
  <path d="M -48 -50 Q 0 -5 48 -50 M -58 14 Q 0 53 58 14" stroke="${c.shell}" stroke-width="6" fill="none"/>
  <circle cx="-23" cy="-15" r="7" fill="#eaffff"/><circle cx="23" cy="-15" r="7" fill="#eaffff"/>
  ${Array.from({length:6},(_,i)=>`<path d="M ${i*24-60} 35 Q ${i*26-65} 90 ${i*26-60} 132" fill="none" stroke="${c.light}" stroke-width="3" opacity=".7"/>`).join('')}</g>`;
}
function porousArchitecture(seed,accent,variant){
 const ribs=[],pores=[];
 for(let side of [-1,1]){
  for(let i=0;i<9;i++){
   const y0=145+i*77,run=side*(100+(i%3)*22),x=270+side*245;
   const lx=x-run;
   ribs.push(`<path d="M ${x} ${y0-85} Q ${lx} ${y0-26} ${x} ${y0+69} M ${x} ${y0-85} L ${x} ${y0+69}" stroke="${accent}" fill="none" stroke-width="${i%3===0?3:1.6}" opacity="${.13+(i%3)*.07}"/>`);
  }
 }
 const depth=variant%3;
 for(let layer=0;layer<8;layer++){
  const p=layer/8,cy=200+layer*76,rx=(195-layer*8),ry=30+layer*5;
  pores.push(`<ellipse cx="270" cy="${cy}" rx="${rx}" ry="${ry}" stroke="${layer%2?accent:'#acd9d5'}" stroke-opacity="${.12+.055*(8-layer)/8}" stroke-width="${layer%2?3:1}" fill="none" transform="rotate(${(layer%3-1)*4*depth} 270 ${cy})"/>`);
 }
 const arches=Array.from({length:7},(_,i)=>{
  const y=182+i*83,rad=155-i*11;
  return `<path d="M ${270-rad} ${y} Q 270 ${y-175+i*5} ${270+rad} ${y}" stroke="${accent}" stroke-opacity="${.13+(i%2)*.1}" stroke-width="${i===0?5:2}" fill="none"/>`;
 }).join('');
 return `<g>${ribs.join('')}${pores.join('')}${arches}
   <path d="M44 922 L188 158 M496 922 L352 158" stroke="${accent}" stroke-opacity=".21" stroke-width="6"/>
   <path d="M89 900 L219 175 M451 900 L321 175" stroke="#b8fff4" stroke-opacity=".17" stroke-width="2"/></g>`;
}
function sediment(seed,accent){
 const particles=[];
 for(let i=0;i<95;i++){
  const x=(seed*7+i*127+i*i*19)%540,y=(seed*13+i*71+i*i*11)%770;
  const opacity=(10+(i%7)*8)/100;
  particles.push(`<circle cx="${x}" cy="${y}" r="${i%11===0?3:1.1}" fill="${accent}" opacity="${opacity}"/>`);
 }
 return particles.join('');
}
function titleText(title,max){
 const t=bounded(title,max).replace(/-/g,' ').toUpperCase();
 return clean(t);
}

/** One placement derivation for still frames and independent actor layers. */
function stagedActors(shot,pose='rest'){
 const cast=shot.characterIds||[];
 const xs=cast.length===1?[270]:cast.length===2?[173,370]:cast.length===3?[115,272,428]:[74,200,335,460];
 return cast.slice(0,5).map((id,i)=>{
  const center=xs[i]??270,size=cast.length>=4?.43:cast.length===3?.50:cast.length===2?.63:.81;
  const svg=/temple|chime|current|bell/.test(id)?lanternCreature(id,center,465,size):
   id==='kip'?amphipod(id,center,465,size,pose):crustacean(id,center,465,size,parseInt(digest(id).slice(0,4),16),pose);
  return Object.freeze({id,center,svg});
 });
}
/** Transparent full-frame layer for ONE source-observed fictive player. */
export function sceneSvgAbyssalActorLayer(shot,actorId,{pose='rest'}={}){
 if(!['rest','speaking'].includes(pose))throw new TypeError('unsupported vector character expression');
 const found=stagedActors(shot,pose).find(a=>a.id===actorId);
 if(!found)throw new RangeError('actor must be a source-observed staged character');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="540" height="960" viewBox="0 0 540 960">
  <defs><filter id="shellGlow" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation=".48"/></filter></defs>
  ${found.svg}</svg>`;
}
/** Return a complete 540x960 source-preserving SVG still for the one shot.
 * Movement and subtitles are still owned by the original renderer.
 */
export function sceneSvgAbyssal(shot,index,total,work,{hideActors=false,psychedelic=false}={}){
 if(typeof psychedelic!=='boolean')throw new TypeError('psychedelic stage mode must be boolean');
 const seed=parseInt(digest(shot.id).slice(0,7),16),c=colorOf(shot.beatId);
 const title=titleText(work.replace(/-development$/,'').replace(/-serial$/,''),30);
 const idText=titleText(shot.camera||shot.id,50);
 const actors=hideActors?'':stagedActors(shot).map(a=>a.svg).join('');
 const progress=Array.from({length:total},(_,i)=>`<rect x="${28+i*480/total}" y="937" width="${Math.max(3,480/total-4)}" height="4" fill="${i<=index?c.light:'#34515f'}" opacity="${i<=index?'.8':'.3'}"/>`).join('');
 // A named temple organ must come from the writer's scene, never a random hash.
 const cue=(String(shot.camera??'')+' '+String(shot.action??'')).toLowerCase();
 const magic=/jianghu|water gate/.test(cue)?'JIANGHU / WATER GATE':
  /miaotang|membrane|admission/.test(cue)?'MIAOTANG / MEMBRANE':
  /witness|contradict/.test(cue)?'FOAM / CONTRADICTION':
  /yesterday|memory|remember/.test(cue)?'GLASS-SPONGE / MEMORY':
  /current|tide/.test(cue)?'ABYSSAL / CURRENT':
  /sediment|claw/.test(cue)?'SEA / SEDIMENT':
  'GLASS-SPONGE / SEA';
 return `<svg xmlns="http://www.w3.org/2000/svg" width="540" height="960" viewBox="0 0 540 960">
  <defs><linearGradient id="sea" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#010710"/><stop offset=".50" stop-color="#063643"/><stop offset="1" stop-color="#071320"/></linearGradient>
  <radialGradient id="light"><stop stop-color="${c.shell}" stop-opacity=".33"/><stop offset="1" stop-color="${c.shell}" stop-opacity="0"/></radialGradient>
  <filter id="shellGlow" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation=".48"/></filter></defs>
  <rect width="540" height="960" fill="url(#sea)"/><ellipse cx="270" cy="395" rx="260" ry="530" fill="url(#light)"/>
  ${porousArchitecture(seed,c.light,index)}${sediment(seed,c.light)}${storyMotif(shot,seed,c)}${psychedelic?opticalElements(shot):''}
  <g opacity=".8"><path d="M26 609 Q 183 ${460-(index%3)*53} 510 250" fill="none" stroke="${c.light}" stroke-width="5" stroke-opacity=".32" stroke-dasharray="24 30"/>
  <path d="M38 650 Q 302 ${760+(index%2)*35} 502 490" fill="none" stroke="#d9fefa" stroke-opacity=".2" stroke-width="2"/></g>
  ${actors}
  <rect x="18" y="20" width="504" height="127" rx="13" fill="#051721" fill-opacity=".82" stroke="#79c9bd" stroke-opacity=".34"/>
  <text x="36" y="51" font-family="DejaVu Sans" font-size="13" letter-spacing="3" fill="#9ee9dc">561 / ABYSSAL CURRENT</text>
  <text x="36" y="92" font-family="DejaVu Sans" font-weight="bold" font-size="${title.length>24?19:25}" fill="#effffa">${title}</text>
  <text x="36" y="122" font-family="DejaVu Sans" font-size="12" letter-spacing="2" fill="#8ec5c2">${magic}</text>
  <text x="28" y="187" font-family="DejaVu Sans" font-size="15" fill="${c.light}" letter-spacing="2">${String(index+1).padStart(2,'0')} / ${String(total).padStart(2,'0')}</text>
  <text x="510" y="187" text-anchor="end" font-family="DejaVu Sans" font-size="12" fill="#a8cac7">${titleText(shot.beatId,18)}</text>
  <path d="M 30 215 L 510 215" stroke="${c.shell}" stroke-width="1" stroke-opacity=".5"/>
  <rect x="17" y="727" width="506" height="188" rx="7" fill="#010914" fill-opacity=".93" stroke="${c.shell}" stroke-opacity=".24"/>
  <text x="270" y="896" text-anchor="middle" font-family="DejaVu Sans" font-size="11" letter-spacing="1.5" fill="#a3cac8">UNAPPROVED / SHARED 561 PARACOSM / PREVIS</text>
  <text x="270" y="706" text-anchor="middle" font-family="DejaVu Sans" font-size="12" fill="${c.light}" letter-spacing="1.2">${idText}</text>
  ${progress}</svg>`;
}
/** Self-contained native SVG+SMIL animation: semantic vector master, not a
 * claim that FFmpeg's still SVG decoder interprets SVG animation elements. */
export function sceneSvgAbyssalAnimated(shot,index,total,work,{sourceFps=30,psychedelic=false}={}){
 if(!Number.isSafeInteger(sourceFps)||sourceFps<1||sourceFps>120)throw new TypeError('source FPS must be bounded');
 if(!Number.isSafeInteger(shot.frames)||shot.frames<1)throw new TypeError('animated shot needs source frames');
 const duration=shot.frames/sourceFps;
 if(duration>120)throw new TypeError('animated shot must be at most 120 seconds');
 const base=sceneSvgAbyssal(shot,index,total,work,{hideActors:true,psychedelic});
 const seed=parseInt(digest(shot.id).slice(0,7),16),c=colorOf(shot.beatId);
 const rigs=stagedActors(shot).map((actor,i)=>{
   const period=(2.4+(seed+i*19)%9/10).toFixed(2),roll=((seed+i*11)%3+1);
   const cues=(shot.dialogue??[]).filter(cue=>cue.speakerId===actor.id).map(cue=>{
     if(!Number.isSafeInteger(cue.startFrame)||!Number.isSafeInteger(cue.endFrame)||cue.startFrame<0||cue.endFrame>shot.frames||cue.endFrame<=cue.startFrame)
       throw new TypeError('animation cue must have bounded source frame timing');
     const start=(cue.startFrame/sourceFps).toFixed(6),span=((cue.endFrame-cue.startFrame)/sourceFps).toFixed(6);
     return `<set attributeName="opacity" to=".72" begin="${start}s" dur="${span}s" fill="remove"/>`;
   }).join('');
   return `<g id="fictive-actor-${clean(actor.id)}" data-character="${clean(actor.id)}" data-source-shot="${clean(shot.id)}">
     <g><animateTransform attributeName="transform" type="translate" values="0 0; 5 -10; -3 -6; 0 0" dur="${period}s" repeatCount="indefinite"/>
       <g><animateTransform attributeName="transform" type="rotate"
         values="0 ${actor.center} 465; ${roll} ${actor.center} 465; -${roll} ${actor.center} 465; 0 ${actor.center} 465"
         dur="${period}s" repeatCount="indefinite"/>${actor.svg}</g></g>
     <ellipse cx="${actor.center}" cy="424" rx="48" ry="29" fill="none" stroke="${c.light}" stroke-width="3"
       stroke-dasharray="5 9" opacity="0" data-performance="source-timed-speech">${cues}</ellipse>
   </g>`;
 }).join('');
 const sedimentLayer=`<g id="abyssal-sediment-depth" data-layer="independent-sediment">${sediment(seed+19,c.light)}
    <animateTransform attributeName="transform" type="translate" values="0 12; 7 -18; -4 -50; 0 -84"
      dur="17s" repeatCount="indefinite"/></g>`;
 const glow=`<ellipse cx="270" cy="405" rx="220" ry="320" fill="url(#light)" opacity=".18">
   <animate attributeName="rx" values="185;255;185" dur="8s" repeatCount="indefinite"/>
   <animate attributeName="opacity" values=".12;.35;.12" dur="8s" repeatCount="indefinite"/></ellipse>`;
 const hook='  <rect x="18" y="20"';
 if(!base.includes(hook))throw new Error('abyssal stage insertion point disappeared');
 return base.replace('<svg xmlns=',`<svg data-format="561-source-timed-smil" data-shot-duration-seconds="${duration}" xmlns=`)
   .replace(hook,`<title>${clean(work)} / ${clean(shot.id)}</title>
    <desc>Original fictional paracosm SVG animatic. Character motion and bioluminescent response are driven by the screenplay shot timing.</desc>
    ${glow}${sedimentLayer}${psychedelic?opticalElements(shot,{animated:true,idSuffix:'motion'}):''}${rigs}
    ${hook}`);
}

/** Reusable transparent SVG depth plane, independent of background and cast. */
export function sceneSvgAbyssalSedimentLayer(shot){
 const seed=parseInt(digest(shot.id).slice(0,7),16),c=colorOf(shot.beatId);
 return `<svg xmlns="http://www.w3.org/2000/svg" width="540" height="960" viewBox="0 0 540 960">
  <g data-layer="independent-sediment">${sediment(seed+19,c.light)}</g></svg>`;
}

/** An independently animated optical plane for FFmpeg and editable source custody. */
export function sceneSvgAbyssalOpticalLayer(shot,{animated=false}={}){
 return psychedelicSvgLayer(shot,{animated});
}
