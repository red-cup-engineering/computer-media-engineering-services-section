/**
 * Purely provisional, locally synthesized dialogue for deterministic screen tests.
 * Uses the OS-installed eSpeak executable through a fixed argv/stdin boundary.
 * This is NOT a licensed performer, canonical voice, accepted character identity,
 * production mix, speaker authentication, AI subjective experience, or publication.
 */
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

const digest=x=>createHash('sha256').update(x).digest('hex');
const text=(x,name,max=300)=>{
 if(typeof x!=='string'||!x.trim()||x.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(x))throw new TypeError(name+' requires bounded printable text');
 return x;
};
const safe=(x,name,min,max)=>{
 if(!Number.isSafeInteger(x)||x<min||x>max)throw new TypeError(name+' requires bounded integer');return x;
};
export function planRehearsalDialogue(shots,fps,totalSeconds){
 safe(fps,'source fps',1,120);
 if(!Number.isFinite(totalSeconds)||totalSeconds<=0||totalSeconds>300)throw new TypeError('bounded duration required');
 if(!Array.isArray(shots)||shots.length<1||shots.length>100)throw new TypeError('bounded shots required');
 const cues=[];let offset=0;
 for(const shot of shots){
  safe(shot.frames,'shot frames',1,36000);
  if(!Array.isArray(shot.dialogue)||shot.dialogue.length>12)throw new TypeError('bounded dialogue required');
  for(const d of shot.dialogue){
   safe(d.startFrame,'startFrame',0,shot.frames-1);safe(d.endFrame,'endFrame',d.startFrame+1,shot.frames);
   const speakerId=text(d.speakerId,'speaker',80);
   if(!/^[a-z0-9][a-z0-9-]*$/u.test(speakerId))throw new TypeError('speaker must be a slug');
   const utterance=text(d.text,'dialogue',300);
   const seed=parseInt(digest(speakerId).slice(0,8),16);
   const startMs=(offset+d.startFrame)*1000/fps,endMs=(offset+d.endFrame)*1000/fps;
   if(endMs-startMs<180)throw new TypeError('spoken dialogue window too short');
   cues.push(Object.freeze({speakerId,text:utterance,startMs,endMs,espeakPitch:34+seed%51}));
  }
  offset+=shot.frames;
 }
 if(cues.length>120)throw new TypeError('too many rehearsal lines');
 if(Math.abs(offset/fps-totalSeconds)>.001)throw new TypeError('timeline duration mismatch');
 return Object.freeze(cues);
}
/** Read an actual PCM16 RIFF file without trusting a hard-coded 44-byte header. */
export function decodeMonoPcm16(wav){
 if(!Buffer.isBuffer(wav)||wav.length<44||wav.toString('ascii',0,4)!=='RIFF'||wav.toString('ascii',8,12)!=='WAVE')throw new TypeError('eSpeak did not produce WAV');
 if(wav.readUInt32LE(4)+8>wav.length)throw new TypeError('truncated RIFF');
 let rate=null,pcm=null;
 for(let at=12;at+8<=wav.length;){
  const kind=wav.toString('ascii',at,at+4),len=wav.readUInt32LE(at+4),from=at+8;
  if(from+len>wav.length)throw new TypeError('truncated WAV chunk');
  if(kind==='fmt '){
   if(len<16||wav.readUInt16LE(from)!==1||wav.readUInt16LE(from+2)!==1||wav.readUInt16LE(from+14)!==16)throw new TypeError('required mono signed PCM16');
   rate=wav.readUInt32LE(from+4);
  }
  if(kind==='data')pcm=wav.subarray(from,from+len);
  at=from+len+(len%2);
 }
 if(!rate||rate<8000||rate>96000||!pcm||pcm.length%2)throw new TypeError('invalid WAV audio content');
 return {rate,samples:pcm};
}
export function encodeMonoPcm16(samples,rate=24000){
 safe(rate,'PCM rate',8000,96000);
 if(!ArrayBuffer.isView(samples)||samples.length>rate*301)throw new TypeError('bounded PCM array required');
 const wav=Buffer.alloc(44+samples.length*2);
 wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);
 wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);
 wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);
 wav.write('data',36);wav.writeUInt32LE(samples.length*2,40);
 for(let i=0;i<samples.length;i++)wav.writeInt16LE(Math.round(Math.max(-32768,Math.min(32767,samples[i]))),44+i*2);
 return wav;
}
/** Invoke espeak only through a fixed executable and stdin; never a shell. */
export function synthesizeRehearsalDialogue(shots,fps,totalSeconds,{espeak='espeak',rate=24000,volume=.74,maxSpeed=2.8,tempRoot=tmpdir()}={}){
 if(espeak!=='espeak')throw new TypeError('only independently installed system eSpeak is supported');
 safe(rate,'PCM sample rate',8000,48000);
 if(!(volume>0&&volume<=1)||!(maxSpeed>=1&&maxSpeed<=4))throw new TypeError('bounded volume and tempo required');
 const cues=planRehearsalDialogue(shots,fps,totalSeconds);
 const len=Math.round(totalSeconds*rate),track=new Float64Array(len),events=[];
 const work=mkdtempSync(join(tempRoot,'shrimp-voice-rehearsal-'));
 try{
  for(let k=0;k<cues.length;k++){
   const cue=cues[k],file=join(work,'line-'+String(k).padStart(3,'0')+'.wav');
   const result=spawnSync('espeak',['-w',file,'-v','en-us','-s','215','-p',String(cue.espeakPitch),'-a','155'],{
    input:cue.text+'\n',encoding:'utf8',timeout:15000,maxBuffer:10000});
   if(result.error||result.status!==0)throw new Error('eSpeak failed: '+String(result.error||result.stderr||'unknown').slice(0,240));
   const decoded=decodeMonoPcm16(readFileSync(file));
   const nativeLength=decoded.samples.length/2,slotStart=Math.round(cue.startMs*rate/1000),
     slotLen=Math.max(1,Math.floor((cue.endMs-cue.startMs)*rate/1000)),naturalOutputLen=Math.ceil(nativeLength*rate/decoded.rate);
   const speed=Math.max(1,naturalOutputLen/slotLen);
   if(speed>maxSpeed)throw new RangeError('line '+(k+1)+' ('+cue.speakerId+') needs '+speed.toFixed(2)+'x playback; enlarge dialogue timing instead');
   const outputLen=Math.min(slotLen,Math.ceil(naturalOutputLen/speed));
   const gain=volume*.77;
   for(let i=0;i<outputLen&&slotStart+i<len;i++){
    const position=i*speed*decoded.rate/rate,lower=Math.floor(position),fraction=position-lower;
    const a=decoded.samples.readInt16LE(Math.min(nativeLength-1,lower)*2),
     b=decoded.samples.readInt16LE(Math.min(nativeLength-1,lower+1)*2);
    const env=Math.min(1,i/(rate*.025),(outputLen-i-1)/(rate*.045));
    track[slotStart+i]+=((a*(1-fraction)+b*fraction)*gain*Math.max(0,env));
   }
   events.push(Object.freeze({speakerId:cue.speakerId,startMs:cue.startMs,endMs:cue.endMs,
    pitch:cue.espeakPitch,tempoMultiplier:Number(speed.toFixed(4)),utteranceSha256:digest(cue.text),
    nominalEngine:'espeak 1.x (system executable)',originalSpokenSeconds:Number((nativeLength/decoded.rate).toFixed(3))}));
  }
  // Bound accidental overlap via soft limiting. A speaking part is never silently erased.
  const limited=new Float64Array(len);for(let i=0;i<len;i++)limited[i]=Math.tanh(track[i]/32768)*32767;
  const sound=encodeMonoPcm16(limited,rate);
  return Object.freeze({wav:sound,cues:Object.freeze(events),sha256:digest(sound)});
 }finally{rmSync(work,{recursive:true,force:true});}
}
