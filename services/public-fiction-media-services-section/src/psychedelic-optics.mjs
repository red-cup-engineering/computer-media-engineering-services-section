/**
 * Source-grounded optical acoustics for the original 561 paracosm.
 *
 * A shared *spectral signature* is read by both vector geometry and the score
 * composer; no stochastic generator, model inference, browser APIs, remote
 * assets, inferred real-world testimony, or new world canon.
 *
 * The paths below are phase-modulated superformula/epicycle approximations,
 * not raster effects. They survive as editable SVG shapes. Animation uses
 * very slow native SVG/SMIL transformations; FFmpeg consumes a still optical
 * layer and supplies separate frame-clock motion.
 */
import {createHash} from 'node:crypto';

const primes=Object.freeze([5,7,11,13,17,19]);
const digest=value=>createHash('sha256').update(value).digest('hex');
const valid=(s,label)=> {
 if(typeof s!=='string'||!s.length||s.length>100||!/^[a-z0-9][a-z0-9-]*$/u.test(s))
  throw new TypeError(label+' must be a bounded source slug');
 return s;
};
const fixed=n=>Number(n.toFixed(3));
const mod=(a,b)=>((a%b)+b)%b;
const hsl=(h,s,l)=>{
 h=mod(h,360)/60;s/=100;l/=100;
 const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs(h%2-1)),m=l-c/2;
 const triples=[[c,x,0],[x,c,0],[0,c,x],[0,x,c],[x,0,c],[c,0,x]];
 return '#'+triples[Math.floor(h)].map(v=>Math.round((v+m)*255).toString(16).padStart(2,'0')).join('');
};
const html=s=>String(s).replace(/[&<>"']/gu,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const periodicPath=(samples,point)=>{
 const commands=[];
 for(let i=0;i<=samples;i++){
  const p=point(2*Math.PI*i/samples);
  commands.push((i?'L ':'M ')+fixed(p[0])+' '+fixed(p[1]));
 }
 return commands.join(' ')+' Z';
};

/**
 * A bounded, frame-independent identity shared by music and optics.
 * Geometry frequencies are coprime; harmony can use a different mode.
 * Dialogue count affects intensity, NOT invented speech or characters.
 */
export function psychedelicSignature(shot){
 if(!shot||typeof shot!=='object')throw new TypeError('shot required');
 const id=valid(shot.id,'shot id'),beatId=valid(shot.beatId,'beat id');
 if(!Array.isArray(shot.dialogue)||shot.dialogue.length>12)throw new TypeError('source dialogue required');
 // Source serialization is structural, not a pathname or provider-claimed canon.
 // A changed action, camera, word or timed cue changes BOTH sound and geometry.
 const written=JSON.stringify({id,beatId,action:shot.action??'',camera:shot.camera??'',
  dialogue:shot.dialogue.map(d=>({speakerId:d.speakerId,startFrame:d.startFrame,
   endFrame:d.endFrame,text:d.text}))});
 if(written.length>256*1024)throw new TypeError('optophonetic source event exceeds bound');
 const sourceDigest=digest(written);
 const bytes=Buffer.from(digest('561-optophonetic-v1:'+sourceDigest),'hex');
 const a=primes[bytes[0]%primes.length],b=primes[(bytes[0]+1+bytes[1]%(primes.length-1))%primes.length];
 const hue=bytes[2]*360/256;
 const intensity=Math.min(0.84,0.44+shot.dialogue.length*.055);
 const semantic=(beatId+' '+String(shot.action??'')+' '+String(shot.camera??'')).toLowerCase();
 const mode=/witness|contradict|split|erasure/u.test(semantic)?'contradiction':
  /memory|remember|yesterday/u.test(semantic)?'recurrence':
  /tide|current|gate|arrival/u.test(semantic)?'flow':'diffraction';
 return Object.freeze({
  kind:'SourceOptophoneticSignature',version:1,shotId:id,beatId,mode,sourceDigest:'sha256:'+sourceDigest,
  frequencies:Object.freeze([a,b]),chirality:bytes[3]%2?-1:1,
  hue:Math.round(hue),phase:fixed(bytes[4]/255*2*Math.PI),
  intensity:fixed(intensity),
  // Durations are comfortably above human photosensitive flashing thresholds.
  slowPeriodsSeconds:Object.freeze([11+bytes[5]%8,19+bytes[6]%11]),
  detuneCents:((bytes[7]%29)-14),
  pulseDivision:bytes[8]%2===0?5:7
 });
}

/** Explicitly limited gradients and open-source SVG 1.1 geometry. */
export function opticalElements(shot,{animated=false,idSuffix='base'}={}){
 if(!['base','motion','standalone'].includes(idSuffix))throw new TypeError('unsupported SVG gradient identity');
 const s=psychedelicSignature(shot),[a,b]=s.frequencies;
 const mag=hsl(s.hue,96,68),cyan=hsl(s.hue+142,99,72),gold=hsl(s.hue+233,90,67);
 const ink=hsl(s.hue+54,60,27);
 const morph=s.mode==='contradiction'?1.3:s.mode==='recurrence'?.83:s.mode==='flow'?1.12:1;
 const rings=Array.from({length:7},(_,i)=>{
  const r=71+i*29,amp=(.08+i*.006)*morph,theta=s.phase+i*.33;
  const curve=periodicPath(132,t=>{
   const w=1+amp*Math.sin(a*t+theta)+.055*Math.cos(b*t-theta);
   return [270+r*w*Math.cos(t),435+r*1.34*w*Math.sin(t)];
  });
  return `<path d="${curve}" stroke="${i%3===0?cyan:i%3===1?mag:gold}"
    stroke-width="${i%3===0?2.8:1.8}" opacity="${fixed(.20+i*.07)}" fill="none"/>`;
 }).join('');
 // Four disciplined, near-glyph ribbons instead of a carpet of thin lines.
 const orbit=Array.from({length:4},(_,i)=>{
  const p=periodicPath(144,t=>[
   270+((127+i*14)*Math.sin(a*t+s.phase+i*.7)+11*Math.sin(b*t*.5)),
   448+((197-i*12)*morph*Math.sin(b*t+s.phase*.7+i*.48))
  ]);
  return `<path d="${p}" fill="none" stroke="${i%2?cyan:mag}" stroke-width="${i%3===0?3.1:2.05}"
    stroke-opacity="${fixed(.28+i*.085)}"/>`;
 }).join('');
 const spokes=Array.from({length:Math.min(14,a+b)},(_,i)=>{
  const t=i*2*Math.PI/Math.min(14,a+b);
  const r=119+(i%3)*46,x1=270+Math.cos(t)*r,y1=436+Math.sin(t)*r*1.35;
  const x2=270+Math.cos(t+Math.PI/a)*(r+85),y2=436+Math.sin(t+Math.PI/a)*(r+85)*1.35;
  return `<path d="M ${fixed(x1)} ${fixed(y1)} Q 270 436 ${fixed(x2)} ${fixed(y2)}"
    stroke="${i%2?gold:cyan}" stroke-opacity=".3" stroke-width="1.35" fill="none"/>`;
 }).join('');
 const heart=`<g opacity=".5">${Array.from({length:7},(_,i)=>{
  const r=14+i*11;
  return `<ellipse cx="270" cy="435" rx="${r}" ry="${r*1.5}" fill="none"
   stroke="${i%2?mag:cyan}" stroke-opacity=".45" stroke-width="2"/>`;
 }).join('')}</g>`;
 // Symmetry is not decoration: the star polygon has exactly the same
 // 5-or-7 pulse division as the MIDI/PCM score. Its negative space is legible.
 const prism=Array.from({length:4},(_,k)=>{
  const radius=187-k*43,spokes=s.pulseDivision;
  const vertices=Array.from({length:spokes*2},(_,j)=>{
   const theta=j*Math.PI/spokes+s.phase*.12+(k%2?Math.PI/spokes:0);
   const r=j%2?radius*(.36+k*.035):radius;
   return fixed(270+r*Math.cos(theta))+','+fixed(435+r*1.31*Math.sin(theta));
  }).join(' ');
  return `<polygon points="${vertices}" fill="${k%2?mag:cyan}" fill-opacity="${fixed(.035+k*.012)}"
   stroke="${k%2?gold:mag}" stroke-width="${k===0?3.6:2.4}" stroke-opacity=".61"/>`;
 }).join('');
 const prismRig=`<g data-optical-grammar="polyrhythmic-prism" data-pulse-division="${s.pulseDivision}">
 ${prism}
 ${animated?`<animateTransform attributeName="transform" type="rotate" values="0 270 435; ${s.chirality*12} 270 435; 0 270 435"
 dur="${s.slowPeriodsSeconds[0]}s" repeatCount="indefinite"/>`:''}
 </g>`;
 const one=`<g data-interference="coprime-rosette" transform="rotate(${fixed(s.phase*10)} 270 435)">
 ${rings}${spokes}
 ${animated?`<animateTransform attributeName="transform" type="rotate" values="0 270 435; ${s.chirality*23} 270 435; 0 270 435" dur="${s.slowPeriodsSeconds[0]}s" repeatCount="indefinite"/>`:''}</g>`;
 const two=`<g data-interference="lissajous-fold">
 ${orbit}
 ${animated?`<animateTransform attributeName="transform" type="rotate" values="0 270 435; ${-s.chirality*16} 270 435; 0 270 435" dur="${s.slowPeriodsSeconds[1]}s" repeatCount="indefinite"/>`:''}</g>`;
 const aperture=`<g data-interference="spectral-aperture" opacity="${s.intensity}">
 <ellipse cx="270" cy="435" rx="183" ry="301" fill="none" stroke="${ink}" stroke-width="21" stroke-opacity=".12"/>
 ${heart}
 ${animated?`<animate attributeName="opacity" values="${fixed(s.intensity*.62)};${s.intensity};${fixed(s.intensity*.62)}" dur="${s.slowPeriodsSeconds[1]}s" repeatCount="indefinite"/>`:''}
 </g>`;
 return `<g data-layer="optophonetic-fold" data-psychedelic-mode="${s.mode}"
   data-shot="${html(s.shotId)}" data-frequencies="${a},${b}" data-chirality="${s.chirality}"
   data-optophonetic-version="1" data-source-digest="${s.sourceDigest}" opacity=".88">
  <defs><radialGradient id="optic-halo-${idSuffix}" cx="50%" cy="45%" r="58%">
   <stop offset="0" stop-color="${mag}" stop-opacity=".28"/>
   <stop offset=".58" stop-color="${cyan}" stop-opacity=".11"/>
   <stop offset="1" stop-color="${gold}" stop-opacity="0"/>
  </radialGradient></defs>
  <ellipse cx="270" cy="435" rx="263" ry="448" fill="url(#optic-halo-${idSuffix})"/>
  ${one}${two}${prismRig}${aperture}
  </g>`;
}

/** Standalone transparent original art; suitable for reuse in vector editors. */
export function psychedelicSvgLayer(shot,{animated=false}={}){
 return `<svg xmlns="http://www.w3.org/2000/svg" width="540" height="960" viewBox="0 0 540 960">
  <title>Source-derived ${html(psychedelicSignature(shot).mode)} optical field</title>
  <desc>Editable coprime rosettes and Lissajous folds. No script or external resource.</desc>
  ${opticalElements(shot,{animated,idSuffix:'standalone'})}</svg>`;
}
