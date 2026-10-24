/**
 * Source-owned technical assay of ACTUAL decoded cinematic shot bytes.
 *
 * A reviewer needs objective evidence before deciding whether the performance
 * is convincing: real streams/frames, aspect, runtime, black/frozen intervals,
 * source-sound silence, and media identity. These are NOT character-recognition,
 * dialogue, consent, dramatic-continuity or publication decisions.
 *
 * No provider invocation, image/video generation, database or journal here.
 * Uses system FFprobe/FFmpeg on existing custody bytes; never logs frames.
 */
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {realpath,stat} from 'node:fs/promises';
import {promisify} from 'node:util';
import {execFile as execFileCallback} from 'node:child_process';
const execFile=promisify(execFileCallback);

const check=(ok,message)=>{if(!ok)throw new TypeError(message)};
const number=(value)=>{const x=Number(value);return Number.isFinite(x)?x:null};
const round=x=>Math.round(x*1000)/1000;
const MIME=new Set(['video/mp4','video/webm']);
const MAX_MOTION_SAMPLES=12000;

/**
 * Observed, low-resolution consecutive-frame *difference*, not an action,
 * object, performer or "interestingness" score. Output is eight-bit YAVG
 * on a 180px-wide grayscale sample after actual video decoding.
 */
export function readTemporalLumaChanges(stderr,{expectedFrames=null}={}){
 check(typeof stderr==='string','FFmpeg temporal output must be text');
 const samples=[...stderr.matchAll(/lavfi\.signalstats\.YAVG=([0-9]+(?:\.[0-9]+)?)/gu)]
  .map(match=>Number(match[1]));
 if(samples.length===0)return Object.freeze({
  state:'MOTION_OBSERVATION_UNAVAILABLE',pairs:0,
  reason:'FFmpeg emitted no consecutive-frame luma difference samples'});
 check(samples.length<=MAX_MOTION_SAMPLES,'observed motion sample count exceeds bounded assay');
 check(samples.every(x=>Number.isFinite(x)&&x>=0&&x<=255),
  'FFmpeg temporal luma difference is outside eight-bit range');
 if(Number.isSafeInteger(expectedFrames)&&expectedFrames>0)
  check(samples.length===expectedFrames-1,
   'motion observations are incomplete relative to decoded source frames');
 const ordered=[...samples].sort((a,b)=>a-b);
 const percentile=q=>round(ordered[Math.max(0,Math.ceil(q*ordered.length)-1)]);
 return Object.freeze({
  state:'MEASURED_FRAME_TO_FRAME_LUMA_CHANGE',pairs:samples.length,
  sampleWidthPixels:180,bitDepth:8,
  mean:round(samples.reduce((total,x)=>total+x,0)/samples.length),
  median:percentile(0.5),p90:percentile(0.9),
  method:'FFmpeg grayscale 180px frame difference YAVG on consecutive frames',
  limitation:'Pixel differences include actor motion, camera motion, lighting and codec variation; neither action recognition nor performance/creative acceptance is inferred.'
 });
}
const interval=(start,end,duration,type)=>{
 const a=number(start),b=number(end);
 if(a===null)return null;
 const lo=Math.max(0,Math.min(duration,a));
 const hi=Math.max(lo,Math.min(duration,b??duration));
 return Object.freeze({type,startSeconds:round(lo),endSeconds:round(hi),
   durationSeconds:round(hi-lo)});
};
const uniqueSorted=(events)=>Object.freeze(events
 .filter(Boolean).sort((a,b)=>a.startSeconds-b.startSeconds||a.type.localeCompare(b.type)));
const ratio=r=>{const [n,d]=String(r??'0/0').split('/').map(Number);
 return Number.isFinite(n)&&Number.isFinite(d)&&d>0?round(n/d):null};

function parseSignalEvents(stderr,duration,hasAudio){
 const events=[];
 for(const match of stderr.matchAll(/black_start:\s*(-?[\d.]+)\s+black_end:\s*(-?[\d.]+)\s+black_duration:\s*([\d.]+)/gu))
   events.push(interval(match[1],match[2],duration,'black-frames'));
 let freezes=[];
 for(const m of stderr.matchAll(/freeze_(start|end):\s*(-?[\d.]+)/gu))
   freezes.push({kind:m[1],at:number(m[2])});
 let started=null;
 for(const e of freezes){
   if(e.at===null)continue;
   if(e.kind==='start'){if(started===null)started=e.at;}
   else if(started!==null){events.push(interval(started,e.at,duration,'repeated-frames'));started=null;}
 }
 if(started!==null)events.push(interval(started,duration,duration,'repeated-frames'));
 if(hasAudio){
   let silence=null;
   for(const line of stderr.split('\n')){
     const a=/silence_start:\s*(-?[\d.]+)/u.exec(line);
     const b=/silence_end:\s*(-?[\d.]+)/u.exec(line);
     if(a){if(silence===null)silence=number(a[1]);}
     if(b&&silence!==null){events.push(interval(silence,b[1],duration,'low-audio-level'));silence=null;}
   }
   if(silence!==null)events.push(interval(silence,duration,duration,'low-audio-level'));
 }
 return uniqueSorted(events);
}

async function sha256(file){
 const hash=createHash('sha256');
 for await(const chunk of createReadStream(file))hash.update(chunk);
 return hash.digest('hex');
}
function technicalFlags(events,duration,video,audio,requiresAudio){
 const flags=[];
 for(const type of ['black-frames','repeated-frames','low-audio-level']){
   const longest=events.filter(x=>x.type===type).reduce((m,x)=>Math.max(m,x.durationSeconds),0);
   if(longest>=Math.max(0.8,duration*0.6))flags.push(Object.freeze({
     code:type==='black-frames'?'EXTENDED_BLACK':
       type==='repeated-frames'?'EXTENDED_FREEZE':'EXTENDED_QUIET',
     longestSeconds:round(longest),
     instruction:'Producer must judge whether this is intended staging; never automatically reject silence or stillness'
   }));
 }
 if(!audio)flags.push(Object.freeze({code:requiresAudio?'MISSING_REQUIRED_SOUND':'NO_AUDIO_STREAM',
   instruction:'Source video has no audio stream; do not infer unintelligible dialogue'}));
 if(video.frameRate===null)flags.push(Object.freeze({code:'UNKNOWN_FRAME_RATE',
   instruction:'Check frame timing manually'}));
 return Object.freeze(flags);
}

/** Bounded technical decoding of a single existing provider or edited video.
 * Typical source shots are 4-10s. Max duration/size prevent accidental
 * analysis of an entire feature film or an unbounded download.
 */
export async function assayMicrodramaShot({
 file,mimeType='video/mp4',maxBytes=250_000_000,maxSeconds=32,
 expectedAspect=null,expectedSeconds=null,requiresAudio=false,
 ffprobe='ffprobe',ffmpeg='ffmpeg',timeoutMs=120000
}={}){
 check(typeof file==='string'&&file.trim(),'existing video file is required');
 check(MIME.has(mimeType),'unsupported cinematic MIME');
 check(Number.isSafeInteger(maxBytes)&&maxBytes>=1024&&maxBytes<=500_000_000,'invalid media size ceiling');
 check(Number.isFinite(maxSeconds)&&maxSeconds>0&&maxSeconds<=300,'invalid assay time ceiling');
 check(expectedAspect===null||['9:16','16:9'].includes(expectedAspect),'expected aspect must be 9:16 or 16:9');
 check(expectedSeconds===null||(Number.isFinite(expectedSeconds)&&expectedSeconds>0&&expectedSeconds<=maxSeconds),
   'invalid expected shot duration');
 check(typeof requiresAudio==='boolean','requiresAudio must be boolean');
 check(Number.isSafeInteger(timeoutMs)&&timeoutMs>=1000&&timeoutMs<=600000,'invalid decode timeout');
 const physical=await realpath(file),info=await stat(physical);
 check(info.isFile()&&info.size>=1024&&info.size<=maxBytes,'source is not a bounded regular video file');
 const {stdout}=await execFile(ffprobe,['-v','error','-count_frames',
  '-show_entries','format=duration:stream=index,codec_type,codec_name,width,height,pix_fmt,avg_frame_rate,nb_read_frames,start_time,duration,channels,channel_layout',
  '-of','json',physical],{timeout:timeoutMs,maxBuffer:512000});
 let probe;
 try{probe=JSON.parse(stdout)}catch{throw new TypeError('ffprobe returned invalid metadata')}
 const duration=number(probe.format?.duration);
 check(duration!==null&&duration>0&&duration<=maxSeconds,'invalid or unbounded video duration');
 // A provider can return multiple picture/sound tracks in a single container.
 // Our downstream editor selects video/audio by position, so a different
 // default FFmpeg selection would silently assay one track and publish another.
 // Hold ambiguous source custody rather than asserting acceptance of its bytes.
 check(Array.isArray(probe.streams),'ffprobe returned no stream inventory');
 const all=probe.streams;
 const pictureTracks=all.filter(s=>s.codec_type==='video');
 const soundTracks=all.filter(s=>s.codec_type==='audio');
 check(pictureTracks.length===1&&soundTracks.length<=1,
  'ambiguous cinematic picture or sound track inventory');
 const image=pictureTracks[0];
 check(image&&image.width>0&&image.height>0,'video has no decoded picture stream');
 const sound=soundTracks[0]??null;
 check(!requiresAudio||sound,'audio-bearing performance requires a real audio stream');
 const aspect=image.width/image.height;
 if(expectedAspect!==null){
  const [w,h]=expectedAspect.split(':').map(Number);
  check(Math.abs(aspect-w/h)<0.012,'video aspect disagrees with required editorial canvas');
 }
 if(expectedSeconds!==null)check(Math.abs(duration-expectedSeconds)<=0.12,
   'actual shot duration differs from authorized shot');
 const video=Object.freeze({codec:image.codec_name??null,width:image.width,height:image.height,
  pixelFormat:image.pix_fmt??null,frameRate:ratio(image.avg_frame_rate),
  decodedFrames:number(image.nb_read_frames),startSeconds:number(image.start_time),
  streamDurationSeconds:number(image.duration)});
 const audio=sound?Object.freeze({codec:sound.codec_name??null,channels:number(sound.channels),
  channelLayout:sound.channel_layout??null,startSeconds:number(sound.start_time),
  streamDurationSeconds:number(sound.duration)}):null;
 // Keep the existing frame/audio event assay. On bounded frame counts, also
 // measure actual temporal luma change at fixed sample width in the SAME
 // full decode. Do not substitute motion-energy for physical acting review.
 const frameEstimate=video.decodedFrames??(video.frameRate===null?null:
  Math.ceil(video.frameRate*duration));
 const measureMotion=frameEstimate!==null&&frameEstimate>1&&
  frameEstimate<=MAX_MOTION_SAMPLES;
 const motionFilter=measureMotion?
  ',scale=180:-2:flags=fast_bilinear,format=gray,tblend=all_mode=difference'+
  ',signalstats,metadata=print:key=lavfi.signalstats.YAVG':'';
 const command=['-nostdin','-hide_banner','-xerror','-v','info','-i',physical,
  '-vf','blackdetect=d=0.4:pix_th=0.08,freezedetect=n=-55dB:d=0.8'+motionFilter];
 if(sound)command.push('-af','silencedetect=noise=-50dB:d=0.5');
 else command.push('-an');
 command.push('-f','null','-');
 let stderr;
 try{({stderr}=await execFile(ffmpeg,command,{timeout:timeoutMs,
  maxBuffer:measureMotion?Math.max(2_000_000,Math.ceil(frameEstimate*160)):2_000_000}));}
 catch(error){
  // Do not leak source names or provider URLs in a public diagnostic.
  const failure=new Error('the source video did not successfully decode through FFmpeg');
  failure.code='CINEMATIC_DECODE_FAILED';failure.cause=error;throw failure;
 }
 const events=parseSignalEvents(stderr,duration,Boolean(sound));
 const motion=measureMotion?readTemporalLumaChanges(stderr,{
  expectedFrames:video.decodedFrames}):Object.freeze({
   state:'MOTION_OBSERVATION_NOT_ATTEMPTED',pairs:0,
   reason:'input has no qualified frame count or exceeds 12000-frame motion sample budget'});
 return Object.freeze({
  type:'MicrodramaShotTechnicalAssay',version:1,
  state:'DECODED_REQUIRES_INDEPENDENT_PERFORMANCE_AND_CONTINUITY_REVIEW',
  media:Object.freeze({sha256:await sha256(physical),mimeType,bytes:info.size,
    durationSeconds:round(duration),video,audio}),
  signals:events,
  temporalLumaChange:motion,
  reviewFlags:technicalFlags(events,duration,video,audio,requiresAudio),
  decoder:'ffprobe stream/frame count + full ffmpeg decode; blackdetect/freezedetect/silencedetect plus bounded frame-difference luma assay when supported',
  limitations:'Stream/signal and luma-change observations cannot prove character identity, actual acting, lipsync, consent, emotion, continuity, originality, sound mix or narrative acceptance. Low pixel change can be intended stillness; high change can be noise, camera movement or lighting.'
 });
}
