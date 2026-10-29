
/**
 * A source-timed audiovisual score, not a stock loop or performed soundtrack.
 * Frame intervals are the authority. Standard MIDI File type 1 is editable in
 * music software; 24 kHz PCM is the deterministic development-film rendering.
 * Every note is traceable to an observed shot, beat, or dialogue event.
 */
import {createHash} from 'node:crypto';
import {psychedelicSignature} from './psychedelic-optics.mjs';

const digest=s=>createHash('sha256').update(String(s)).digest('hex');
const ensure=(ok,msg)=>{if(!ok)throw new TypeError(msg);};
const integer=(n,lo,hi,label)=>{ensure(Number.isSafeInteger(n)&&n>=lo&&n<=hi,label+' must be a bounded integer');return n;};
const freq=note=>440*Math.pow(2,(note-69)/12);
const le=(v,n)=>{const b=Buffer.alloc(n);if(n===2)b.writeUInt16LE(v);else b.writeUInt32LE(v);return b;};
const be=(v,n)=>{const b=Buffer.alloc(n);if(n===2)b.writeUInt16BE(v);else b.writeUInt32BE(v);return b;};
const varlen=v=>{
 integer(v,0,0x0fffffff,'MIDI delta');
 const out=[v&127];while((v>>=7)>0)out.unshift((v&127)|128);return out;
};
const textMeta=(kind,s)=>{
 const bytes=Buffer.from(String(s).slice(0,120),'utf8');
 return [255,kind,...varlen(bytes.length),...bytes];
};

/** Chord degrees are explicitly small modal transformations. The hash picks a
 * reproducible mode/voicing; it does not invent story action or a new character. */
export function composeSourceScore(shots,sourceFps,{profile='harmonic'}={}){
 integer(sourceFps,1,120,'source FPS');
 ensure(['harmonic','psychedelic'].includes(profile),'unknown sound design profile');
 ensure(Array.isArray(shots)&&shots.length>0&&shots.length<=100,'source shots required');
 const notes=[],markers=[];let origin=0;
 for(const shot of shots){
  integer(shot.frames,1,36000,'shot frames');
  ensure(typeof shot.id==='string'&&typeof shot.beatId==='string'&&Array.isArray(shot.dialogue),'shot source identity and dialogue required');
  const signature=profile==='psychedelic'?psychedelicSignature(shot):null;
  const mode=signature?[0,1,5,6,8,11]:[0,2,3,5,7,9,10];
  const seed=parseInt(digest(shot.beatId+':'+shot.id).slice(0,8),16);
  const root=signature?32+seed%18:35+seed%12;
  // A 5- or 7-division polyrhythm replaces the ordinary half-beat.
  const halfBeat=signature?Math.max(1,Math.round(sourceFps*2/signature.pulseDivision)):
   Math.max(1,Math.round(sourceFps/2));
  const tone=signature?{detuneCents:signature.detuneCents,
   modulationRatio:signature.frequencies[0]/signature.frequencies[1],
   rhythmicPeriod:signature.slowPeriodsSeconds[0],chromaticMode:signature.mode}:{};
  markers.push({frame:origin,shotId:shot.id,beatId:shot.beatId,rootMidi:root,...(signature?{optophonetic:signature}:{})});
  notes.push({track:0,frame:origin,duration:shot.frames,pitch:root,velocity:signature?46:36,source:shot.id,...tone});
  for(let frame=0,index=0;frame<shot.frames;frame+=halfBeat,index++){
   const degree=mode[(index+seed)%mode.length],octave=(index+Math.floor(seed/11))%5===0?12:0;
   notes.push({track:1,frame:origin+frame,duration:Math.max(1,Math.min(halfBeat,shot.frames-frame)),
    pitch:Math.min(108,root+12+degree+octave),velocity:38+(index+seed)%23,source:shot.id,...tone});
  }
  for(const cue of shot.dialogue){
   integer(cue.startFrame,0,shot.frames-1,'cue start');
   integer(cue.endFrame,cue.startFrame+1,shot.frames,'cue end');
   ensure(typeof cue.speakerId==='string'&&typeof cue.text==='string','spoken source required');
   const bell=23+parseInt(digest(cue.speakerId).slice(0,4),16)%24;
   notes.push({track:2,frame:origin+cue.startFrame,
    duration:Math.min(cue.endFrame-cue.startFrame,Math.max(1,Math.round(sourceFps*.65))),
    pitch:Math.min(108,root+bell),velocity:54,source:shot.id+':'+cue.speakerId,...tone});
   if(signature){
    // Articulated word-attack resonances preserve exact source line timing.
    // No speech transcription is invented: the score references existing words.
    const syllables=cue.text.trim().split(/\s+/u).slice(0,64);
    const span=cue.endFrame-cue.startFrame;
    for(let n=0;n<syllables.length;n+=3){
     const at=cue.startFrame+Math.floor(span*n/syllables.length);
     const duration=Math.max(1,Math.min(Math.round(sourceFps*.21),cue.endFrame-at));
     notes.push({track:2,frame:origin+at,duration,
      pitch:Math.min(108,root+bell+((n%5)*2)),velocity:38+(n%21),
      source:shot.id+':'+cue.speakerId+':word-'+n,...tone});
    }
   }
  }
  origin+=shot.frames;
 }
 ensure(origin/sourceFps<=300,'score cannot exceed 300 seconds');
 ensure(notes.length<=5000,'score event budget exceeded');
 return Object.freeze({format:'source-timed-three-voice-score',bpm:120,sourceFps,frameCount:origin,
  ...(profile==='psychedelic'?{profile,optophoneticVersion:1}:{}),
  markers:Object.freeze(markers),notes:Object.freeze(notes)});
}

/** Standards-conformant SMF1 with one conductor and three distinct instrument
 * tracks. Notes and markers share one integer frame clock before MIDI rounding. */
export function scoreMidi(score){
 ensure(score?.format==='source-timed-three-voice-score','composed score required');
 const toTick=frame=>Math.round(frame*960/score.sourceFps);
 const chunks=[],track=(events)=>{
  events.sort((a,b)=>a.t-b.t||a.sort-b.sort);
  const bytes=[];let previous=0;
  for(const ev of events){const delta=ev.t-previous;ensure(delta>=0,'nonmonotone MIDI event');
   bytes.push(...varlen(delta),...ev.data);previous=ev.t;}
  bytes.push(0,255,47,0);
  const body=Buffer.from(bytes);
  return Buffer.concat([Buffer.from('MTrk','ascii'),be(body.length,4),body]);
 };
 const conductor=[
  {t:0,sort:0,data:textMeta(3,'561 source-formed score / edit master')},
  {t:0,sort:1,data:[255,81,3,7,161,32]}, // 500000 us/quarter = 120 bpm
  {t:0,sort:2,data:[255,88,4,4,2,24,8]} // four quarters, 24 MIDI clocks
 ];
 for(const mark of score.markers)
  conductor.push({t:toTick(mark.frame),sort:3,
    data:textMeta(6,mark.shotId+' / '+mark.beatId+(mark.optophonetic?
     ' / ['+mark.optophonetic.frequencies.join(':')+'] '+mark.optophonetic.mode:''))});
 chunks.push(track(conductor));
 const names=['Abyssal pressure / bass','Glass-sponge membrane / motif','Fictive dialogue resonance'];
 const programs=[38,98,10];
 for(let k=0;k<3;k++){
  const events=[{t:0,sort:0,data:textMeta(3,names[k])},{t:0,sort:1,data:[0xc0+k,programs[k]]}];
  if(score.profile==='psychedelic'){
   events.push({t:0,sort:1,data:[0xb0+k,101,0]},
    {t:0,sort:1,data:[0xb0+k,100,0]},
    {t:0,sort:1,data:[0xb0+k,6,2]}, // pitch-bend range +/- 2 semitones
    {t:0,sort:1,data:[0xb0+k,101,127]},
    {t:0,sort:1,data:[0xb0+k,100,127]});
   for(const mark of score.markers){
    const spectral=mark.optophonetic,t=toTick(mark.frame);
    if(!spectral)throw new TypeError('missing paired optical MIDI signature');
    const bend=Math.min(16383,Math.max(0,8192+Math.round(spectral.detuneCents*8192/200)));
    events.push({t,sort:1,data:[0xe0+k,bend&127,(bend>>7)&127]});
    events.push({t,sort:1,data:[0xb0+k,74,45+spectral.frequencies[k%2]*3]});
    events.push({t,sort:1,data:[0xb0+k,1,14+spectral.pulseDivision*7]});
   }
  }
  for(const note of score.notes.filter(n=>n.track===k)){
   const t=toTick(note.frame),end=Math.max(t+1,toTick(note.frame+note.duration));
   events.push({t,sort:4,data:[0x90+k,note.pitch,note.velocity]});
   events.push({t:end,sort:2,data:[0x80+k,note.pitch,0]});
  }
  chunks.push(track(events));
 }
 return Buffer.concat([Buffer.from('MThd','ascii'),be(6,4),be(1,2),be(chunks.length,2),be(480,2),...chunks]);
}

/** Explicit additive/FM sound design; no synthesis vendor, sampled instrument,
 * external sound asset or synthetic-performance-rights claim. */
export function scoreWav(score,{sampleRate=24000}={}){
 ensure(score?.format==='source-timed-three-voice-score','composed score required');
 integer(sampleRate,8000,48000,'sample rate');
 const frames=Math.round(score.frameCount*sampleRate/score.sourceFps);
 const mixed=new Float32Array(frames);
 for(const note of score.notes){
  const start=Math.round(note.frame*sampleRate/score.sourceFps);
  const end=Math.min(frames,Math.round((note.frame+note.duration)*sampleRate/score.sourceFps));
  const psycho=score.profile==='psychedelic';
  const hz=freq(note.pitch)*(psycho?Math.pow(2,(note.detuneCents||0)/1200):1);
  const level=note.velocity/127*(note.track===0?.14:note.track===1?.12:.19);
  const seconds=(end-start)/sampleRate;
  for(let i=start;i<end;i++){
   const t=(i-start)/sampleRate;
   const attack=Math.min(1,t/(note.track===0?.09:.008));
   const release=Math.min(1,(seconds-t)/(note.track===0?.22:.17));
   const env=Math.max(0,Math.min(attack,release));
   const phase=2*Math.PI*hz*t;
   const lfo=psycho?(0.72+0.28*Math.sin(2*Math.PI*t/(note.rhythmicPeriod||13))):1;
   const ratio=note.modulationRatio||1;
   const waveform=psycho
    ? note.track===0
      ? .63*Math.sin(phase)+.25*Math.sin(phase*(1+.012*ratio))+.12*Math.sin(phase*.503)
      :note.track===1
      ? .63*Math.sin(phase+2.4*lfo*Math.sin(phase*ratio*1.9))+.27*Math.sin(phase*1.41421356)+.1*Math.sin(phase*.70710678)
      : .52*Math.sin(phase+1.5*Math.sin(phase*.61803399))+.28*Math.sin(phase*2.41421356)+.2*Math.sin(phase*3.01)
    : note.track===0
      ? .82*Math.sin(phase)+.18*Math.sin(phase*2)
      :note.track===1
      ? .69*Math.sin(phase+1.8*Math.sin(phase*2.01))+.31*Math.sin(phase*3.003)
      : .66*Math.sin(phase)+.22*Math.sin(phase*2.004)+.12*Math.sin(phase*4.01);
   mixed[i]+=level*env*lfo*waveform;
  }
 }
 const audio=Buffer.alloc(44+frames*2);
 audio.write('RIFF',0);audio.writeUInt32LE(audio.length-8,4);audio.write('WAVE',8);
 audio.write('fmt ',12);audio.writeUInt32LE(16,16);audio.writeUInt16LE(1,20);audio.writeUInt16LE(1,22);
 audio.writeUInt32LE(sampleRate,24);audio.writeUInt32LE(sampleRate*2,28);audio.writeUInt16LE(2,32);audio.writeUInt16LE(16,34);
 audio.write('data',36);audio.writeUInt32LE(frames*2,40);
 for(let i=0;i<frames;i++){
  const t=i/sampleRate,fade=Math.min(1,t/.35,(frames-i)/(.7*sampleRate));
  const bed=.018*Math.sin(2*Math.PI*55*t)+.008*Math.sin(2*Math.PI*82.5*t);
  audio.writeInt16LE(Math.round(28000*Math.tanh((mixed[i]+bed)*Math.max(0,fade))),44+i*2);
 }
 return audio;
}
