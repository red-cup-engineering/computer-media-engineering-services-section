/**
 * Timed-text manufacturing from the same accepted film cut.
 * Based on W3C WebVTT and SubRip interchange. No translation is invented:
 * additional languages are separately reviewed supplied text.
 *
 * https://www.w3.org/TR/webvtt1/
 */
const assert=(yes,message)=>{if(!yes)throw new TypeError(message)};
const nonempty=(s,label)=>{assert(typeof s==='string'&&s.trim(),label+' must contain text');return s.trim()};
const mmss=/^(\d{2,}):([0-5]\d):([0-5]\d)[,.](\d{3})$/u;
const secondsValue=raw=>{
 const m=mmss.exec(raw);
 assert(m,'invalid HH:MM:SS,mmm subtitle timecode');
 const h=Number(m[1]),min=Number(m[2]),sec=Number(m[3]),ms=Number(m[4]);
 const result=((h*60+min)*60+sec)*1000+ms;
 assert(Number.isSafeInteger(result),'subtitle time is unbounded');
 return result;
};
const clock=(milliseconds,dot=false)=>{
 assert(Number.isSafeInteger(milliseconds)&&milliseconds>=0,'negative or fractional caption time');
 const n=milliseconds,h=Math.floor(n/3600000),m=Math.floor(n%3600000/60000),
  s=Math.floor(n%60000/1000),ms=n%1000;
 const pad=(x,length=2)=>String(x).padStart(length,'0');
 return pad(h)+':'+pad(m)+':'+pad(s)+(dot?'.':',')+pad(ms,3);
};
const escapeVtt=text=>text.replace(/&/gu,'&amp;').replace(/</gu,'&lt;')
 .replace(/>/gu,'&gt;').replace(/-->/gu,'--&gt;');
export const isSubtitleLanguage=tag=>
 typeof tag==='string'&&/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,3}$/u.test(tag);

function admittedCue(cue,index,durationMs){
 assert(cue&&typeof cue==='object'&&!Array.isArray(cue),'caption cue must be an object');
 assert(Number.isSafeInteger(cue.startMs)&&Number.isSafeInteger(cue.endMs)&&
  cue.startMs>=0&&cue.endMs>cue.startMs&&cue.endMs<=durationMs+50,
  'caption cue falls outside playable media');
 assert(typeof cue.text==='string'&&cue.text.trim()&&cue.text.length<=5000,
  'caption cue requires bounded existing dialog');
 assert(!/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(cue.text),
  'caption cue has invalid control characters');
 return Object.freeze({startMs:cue.startMs,endMs:cue.endMs,
  text:cue.text.trim(),ordinal:index+1});
}
/** Returns sorted reviewed cues. A silent film can intentionally have none. */
export function parseMicrodramaSrt(value,{durationMs=Number.MAX_SAFE_INTEGER}={}){
 assert(typeof value==='string'&&value.length<=2_000_000,'SRT must be bounded text');
 assert(Number.isSafeInteger(durationMs)&&durationMs>=1,'film duration is required');
 const blocks=value.replace(/^\uFEFF/u,'').replace(/\r\n?/gu,'\n').trim()
  .split(/\n[ \t]*\n/gu).filter(x=>x.trim());
 const cues=[];
 let previousStart=-1;
 for(const block of blocks){
  const lines=block.split('\n').map(line=>line.trimEnd());
  if(/^\d+$/u.test(lines[0]?.trim()??''))lines.shift();
  const timing=lines.shift();
  assert(typeof timing==='string','subtitle cue time is missing');
  const m=/^(\d{2,}:[0-5]\d:[0-5]\d[,.]\d{3})\s*-->\s*(\d{2,}:[0-5]\d:[0-5]\d[,.]\d{3})$/u.exec(timing.trim());
  assert(m,'malformed or unsupported SRT subtitle timing');
  const cue=admittedCue({startMs:secondsValue(m[1]),
   endMs:secondsValue(m[2]),text:lines.join('\n')},cues.length,durationMs);
  assert(cue.startMs>=previousStart,'SRT subtitles must be sorted by start time');
  previousStart=cue.startMs;cues.push(cue);
  assert(cues.length<=10000,'SRT has too many cues');
 }
 return Object.freeze(cues);
}
export function renderMicrodramaSrt(cues){
 assert(Array.isArray(cues),'SRT cues must be a list');
 return cues.map((c,i)=>String(i+1)+'\n'+clock(c.startMs)+' --> '+
  clock(c.endMs)+'\n'+c.text+'\n').join('\n');
}
export function renderMicrodramaVtt(cues){
 assert(Array.isArray(cues),'WebVTT cues must be a list');
 return 'WEBVTT\n\n'+cues.map(c=>clock(c.startMs,true)+' --> '+
  clock(c.endMs,true)+'\n'+escapeVtt(c.text)+'\n').join('\n');
}
export function renderMicrodramaTranscript(cues){
 assert(Array.isArray(cues),'transcript cues must be a list');
 return cues.map(c=>'['+clock(c.startMs,true)+'] '+c.text.replace(/\n/gu,' ')).join('\n')+
  (cues.length?'\n':'');
}
/**
 * Cut subtitles with a trailer made from selected EXISTING finished-film
 * frame spans. Intersections split the source cue and rebase it onto the new
 * exact frame timeline; no newly authored screenplay text is generated.
 */
export function recutMicrodramaCaptions({cues,segments,fps=30}={}){
 assert(Array.isArray(cues)&&Array.isArray(segments)&&segments.length>0,
  'trailer needs actual subtitle cues and selected film segments');
 assert(Number.isSafeInteger(fps)&&fps>0&&fps<=120,'trailer frame rate is invalid');
 let offsetMs=0;const out=[];
 for(const segment of segments){
  const startMs=Math.round(segment.startFrame*1000/fps),
   endMs=Math.round(segment.endFrame*1000/fps);
  assert(Number.isSafeInteger(startMs)&&Number.isSafeInteger(endMs)&&endMs>startMs,
   'trailer clip has invalid frame boundaries');
  for(const cue of cues){
   const begin=Math.max(startMs,cue.startMs),end=Math.min(endMs,cue.endMs);
   if(end<=begin)continue;
   out.push(admittedCue({startMs:offsetMs+begin-startMs,
    endMs:offsetMs+end-startMs,text:cue.text},out.length,Number.MAX_SAFE_INTEGER));
  }
  offsetMs+=endMs-startMs;
 }
 return Object.freeze(out);
}
/** Chapter names and timing are editorial selections; never infer chapters. */
export function chaptersToVtt(chapters,fps=30){
 assert(Array.isArray(chapters)&&Number.isSafeInteger(fps)&&fps>0,
  'chapters need their original source timeline');
 const cues=chapters.map((c,i)=>admittedCue({
  startMs:Math.round(c.startFrame*1000/fps),
  endMs:Math.round(c.endFrame*1000/fps),
  text:nonempty(c.title,'chapter title')
 },i,Number.MAX_SAFE_INTEGER));
 assert(cues.every((c,i)=>i===0||c.startMs>=cues[i-1].endMs),
  'chapter boundaries must not overlap');
 return renderMicrodramaVtt(cues);
}

/**
 * Measured editor-facing text-track observables. These are NEVER universal
 * quality thresholds. For example, Chinese grapheme density, English letters,
 * abbreviations, dyslexic accessibility and agent-readable tracks have very
 * different reading and cognitive costs. A zero-cue intentional silent work
 * returns explicit NULL reading-rate observations, not false perfect scores.
 *
 * Grapheme rate is measured on timed text, not audio ASR or perceived reading.
 */
export function measureMicrodramaTextTrack({cues,durationMs,language}={}){
 assert(Array.isArray(cues)&&cues.length<=10000&&
  Number.isSafeInteger(durationMs)&&durationMs>=1,
  'science text-track observation requires bounded timed cues and film duration');
 assert(isSubtitleLanguage(language),'measured subtitles require a valid language');
 const graphemes=new Intl.Segmenter(language,{granularity:'grapheme'});
 let priorStart=-1,overlapPairs=0;
 const cueStarts=[],cueEnds=[];
 let covered=0,lastCoverEnd=0,totalChars=0,multiline=0,shortCues=0;
 const speeds=[],durations=[];
 for(const [i,raw] of cues.entries()){
  const c=admittedCue(raw,i,durationMs);
  assert(c.startMs>=priorStart,'measurement cues must be chronologically sorted');
  priorStart=c.startMs;
  cueStarts.push(c.startMs);cueEnds.push(c.endMs);
  covered+=Math.max(0,c.endMs-Math.max(lastCoverEnd,c.startMs));
  lastCoverEnd=Math.max(lastCoverEnd,c.endMs);
  const chars=[...graphemes.segment(c.text.replace(/\n/gu,' '))].length;
  totalChars+=chars;
  const interval=c.endMs-c.startMs;
  durations.push(interval);
  speeds.push(chars*1000/interval);
  if(c.text.split('\n').length>2)multiline++;
  if(interval<800)shortCues++;
 }
 // An overlap PAIR is two cues whose time intervals intersect, even if a
 // third cue encloses both. Counting only whether each new cue overlaps any
 // prior cue undercounts dense multi-speaker caption scenes. Sweep the
 // ordered starts against ordered end times in O(n log n), not O(n²).
 const closingTimes=[...cueEnds].sort((a,b)=>a-b);
 let closed=0;
 for(const [index,start] of cueStarts.entries()){
   while(closed<closingTimes.length && closingTimes[closed]<=start)closed++;
   overlapPairs+=index-closed;
 }
 const percentile=(array,q)=>{
  if(array.length===0)return null;
  const ordered=[...array].sort((a,b)=>a-b);
  const at=Math.min(ordered.length-1,Math.max(0,Math.ceil(q*ordered.length)-1));
  return Math.round(ordered[at]*1000)/1000;
 };
 const median=array=>{
  if(!array.length)return null;
  const sorted=[...array].sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);
  const v=sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;
  return Math.round(v*1000)/1000;
 };
 const round=n=>Math.round(n*1000)/1000;
 return Object.freeze({
  type:'MicrodramaCaptionMetrology',version:1,language,
  source:'ACTUAL_TIMED_TEXT_NOT_SPEECH_RECOGNITION',
  filmDurationMs:durationMs,cueCount:cues.length,
  coveredDurationMs:covered,
  visualCoverageFraction:round(Math.min(1,covered/durationMs)),
  totalGraphemes:totalChars,
  intervalOverlapPairs:overlapPairs,
  cuesWithMoreThanTwoLines:multiline,
  cuesUnderEightHundredMs:shortCues,
  cueDurationMsMedian:median(durations),
  graphemesPerSecondMedian:median(speeds),
  graphemesPerSecondP95:percentile(speeds,.95),
  graphemesPerSecondMax:percentile(speeds,1),
  limitation:'Objective text timing and grapheme counts only. No automatic claim of comprehension, meaning-preserving translation, lip synchronization or suitability for a human or agent audience.'
 });
}
