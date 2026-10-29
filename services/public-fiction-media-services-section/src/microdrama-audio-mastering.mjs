/**
 * Source-owned EBU R128 two-pass PROGRAM audio mastering for the EXISTING
 * microdrama assembly filtergraph. This never synthesizes voices, video or
 * music. It processes only independently accepted original source audio.
 *
 * A loudness target is an editorial choice, not a YouTube certification;
 * flags, measurements and possible fallback to dynamic normalization stay
 * visible in the returned production result.
 *
 * https://ffmpeg.org/ffmpeg-filters.html#loudnorm
 */
import {promisify} from 'node:util';
import {execFile as execFileCallback} from 'node:child_process';
const execFile=promisify(execFileCallback);
const requireValue=(ok,message)=>{if(!ok)throw new TypeError(message)};
const finite=n=>Number.isFinite(n);
const bound=(n,min,max,label)=>{requireValue(finite(n)&&n>=min&&n<=max,
  label+' outside calibrated range');return n};

export function admitMicrodramaMastering({integratedLufs=-16,
 loudnessRange=11,truePeakDb=-1.5}={}){
 return Object.freeze({
  integratedLufs:bound(integratedLufs,-24,-10,'integrated LUFS'),
  loudnessRange:bound(loudnessRange,1,20,'loudness range'),
  truePeakDb:bound(truePeakDb,-6,-1,'true peak dBTP'),
 });
}
const argsFor=(settings)=>`I=${settings.integratedLufs}:LRA=${settings.loudnessRange}:TP=${settings.truePeakDb}`;
const sample=(string)=>{
 const start=string.lastIndexOf('{\n');
 if(start<0)throw new TypeError('FFmpeg emitted no loudness measurement JSON');
 const segment=string.slice(start);
 const stop=segment.indexOf('}');
 if(stop<0)throw new TypeError('FFmpeg loudness measurement was truncated');
 let data;
 try{data=JSON.parse(segment.slice(0,stop+1))}
 catch{throw new TypeError('FFmpeg loudnorm returned invalid JSON')}
 for(const key of ['input_i','input_tp','input_lra','input_thresh','target_offset',
                    'output_i','output_tp','output_lra','normalization_type'])
   if(!Object.hasOwn(data,key))throw new TypeError('FFmpeg loudnorm omitted '+key);
 return data;
};
function numericLoudness(row,key){
 const raw=row[key],n=Number(raw);
 return raw==='-inf'||raw==='inf'||!Number.isFinite(n)?null:n;
}
function measurement(row){
 return Object.freeze({
  inputI:numericLoudness(row,'input_i'),
  inputTruePeak:numericLoudness(row,'input_tp'),
  inputRange:numericLoudness(row,'input_lra'),
  inputThreshold:numericLoudness(row,'input_thresh'),
  targetOffset:numericLoudness(row,'target_offset'),
  outputI:numericLoudness(row,'output_i'),
  outputTruePeak:numericLoudness(row,'output_tp'),
  outputRange:numericLoudness(row,'output_lra'),
  normalizationType:String(row.normalization_type??'unknown')
 });
}
export const collectLoudnormJson=stderr=>measurement(sample(stderr));
const inputArgs=(inputs)=>inputs.flatMap(x=>['-i',x.file]);
const safeFilters=arr=>Array.isArray(arr)&&arr.length&&arr.every(s=>typeof s==='string'&&s.trim());

/**
 * First pass processes the *same complete audio mix* as the movie, not
 * individual clips in isolation. Measurement never writes rendered video.
 */
export async function prepareMicrodramaTwoPassMastering({
 inputs,audioGraph,cwd,mastering,timeoutMs=300000,run=execFile
}={}){
 requireValue(Array.isArray(inputs)&&inputs.length>0&&inputs.every(x=>typeof x.file==='string'),
  'verified source audio inputs required');
 requireValue(safeFilters(audioGraph),'existing unmodified audio filtergraph required');
 requireValue(audioGraph.at(-1).endsWith('[aout]'),'graph must terminate at source-mixed audio');
 requireValue(typeof cwd==='string'&&cwd.trim(),'existing private render directory required');
 const settings=admitMicrodramaMastering(mastering);
 const measureGraph=[...audioGraph,`[aout]loudnorm=${argsFor(settings)}:print_format=json[measured]`].join(';');
 const cmd=['-nostdin','-hide_banner','-nostats','-loglevel','info',
  ...inputArgs(inputs),'-filter_complex',measureGraph,'-map','[measured]','-f','null','-'];
 const result=await run('ffmpeg',cmd,{cwd,timeout:timeoutMs,maxBuffer:1_000_000});
 const before=collectLoudnormJson(result.stderr);
 // An entirely silent episode is a legitimate piece of dramatic storytelling;
 // claiming it has achieved -16 LUFS would be materially false.
 if(before.inputI===null||before.inputTruePeak===null||before.inputThreshold===null||
   before.inputRange===null||before.targetOffset===null){
  return Object.freeze({state:'SILENT_OR_UNMEASURABLE_AUDIO_HELD_AS_IS',
   requested:settings,premeasure:before,secondPassFilter:null,
   note:'No false loudness claim: source mix is silent or unmeasurable; output uses original sound.'});
 }
 const p=before;
 const suffix=`:measured_I=${p.inputI}:measured_TP=${p.inputTruePeak}`+
  `:measured_LRA=${p.inputRange}:measured_thresh=${p.inputThreshold}`+
  `:offset=${p.targetOffset}:linear=true:print_format=json`;
 return Object.freeze({state:'MEASURED_READY_TO_MASTER',
  requested:settings,premeasure:before,
  secondPassFilter:`loudnorm=${argsFor(settings)}${suffix}`,
  note:'FFmpeg may choose dynamic mode when input characteristics make linear gain impossible; inspect final output.'});
}
/** Only parse an actual second-pass render report, not a simulated target. */
export function observeMicrodramaMasteredOutput({preparation,stderr}={}){
 requireValue(preparation?.state==='MEASURED_READY_TO_MASTER',
  'real measured first pass is required');
 const measured=collectLoudnormJson(stderr);
 return Object.freeze({
  requested:preparation.requested,measuredFirstPass:preparation.premeasure,
  measuredOutput:measured,
  type:'MicrodramaTwoPassLoudnessObservation',
  state:'RENDERED_AUDIO_REQUIRES_LISTENING_AND_TRUE_PEAK_REVIEW',
  warning:'Observed FFmpeg loudnorm result, not a certification of intelligibility, music clearance, stream loudness normalization by YouTube, or completed artistic review.'
 });
}
