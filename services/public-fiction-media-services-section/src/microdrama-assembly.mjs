/**
 * Receive locally delivered shot/voice bytes, verify their identity and geometry,
 * and render a 9:16 audition copy plus captions with FFmpeg. This is a producing
 * Fiction service's assembler, not a rights authority, media order or publisher.
 *
 * Execution requires a complete manifest with independent review references.
 * The manifest's assertions are checked for shape, not authenticated here.
 */
import { createHash } from 'node:crypto';
import { assayMicrodramaShot } from './microdrama-shot-assay.mjs';
import { prepareMicrodramaTwoPassMastering,observeMicrodramaMasteredOutput } from './microdrama-audio-mastering.mjs';
import { createReadStream } from 'node:fs';
import { mkdtemp, realpath, rm, stat, writeFile, mkdir, link, rename } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { execFile as execFileCallback } from 'node:child_process';
const execFile = promisify(execFileCallback);

const check = (x, message) => { if (!x) throw new TypeError(message); };
const nonempty = (v, label) => { check(typeof v === 'string' && !!v.trim(), `${label} must be nonempty`); return v.trim(); };
const record = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const hashPattern = /^[a-f0-9]{64}$/u;
const videoTypes = new Set(['video/mp4','video/webm']);
const audioTypes = new Set(['audio/wav','audio/mpeg','audio/ogg']);

function relativeAssetPath(input) {
  const name = nonempty(input, 'asset relativePath');
  check(!isAbsolute(name) && !name.includes('\\') &&
    name.split('/').every(s => !!s && s !== '.' && s !== '..'), 'assets require clean relative paths');
  return name;
}

/** Only layout, job and receiver-*claim* consistency, no file I/O. */
export function validateAssemblyManifest(plan, manifest) {
  check(record(plan) && plan.type === 'MicrodramaProductionProposal' &&
    plan.status === 'PROPOSED_NOT_ADMITTED', 'expected a compiled microdrama proposal');
  check(plan.frameRate === 30 && plan.aspectRatio === '9:16', 'expected a 30fps 9:16 microdrama');
  check(Array.isArray(plan.timeline) && plan.timeline.length > 0 &&
    Array.isArray(plan.jobs?.video) && Array.isArray(plan.jobs?.speech), 'compiled job arrays missing');
  check(record(manifest) && manifest.type === 'MicrodramaAssetManifest' &&
    Array.isArray(manifest.assets), 'a MicrodramaAssetManifest is required');
  nonempty(manifest.reviewRef, 'independent review record reference');
  const expected = new Map();
  const embeddedJobs = new Set(plan.jobs.video.filter(j=>j.audioMode==='embedded-performance').map(j=>j.id));
  for (const job of plan.jobs.video) expected.set(job.id, 'video');
  for (const job of plan.jobs.speech) {
    check(!expected.has(job.id), 'duplicate compiled job identity'); expected.set(job.id, 'speech');
  }
  check(expected.size === plan.jobs.video.length + plan.jobs.speech.length, 'duplicate compiled job identity');
  const accepted = new Map();
  for (const raw of manifest.assets) {
    check(record(raw), 'manifest asset must be an object');
    const id = nonempty(raw.jobId, 'asset jobId');
    check(expected.has(id), `asset for undeclared job ${id}`);
    check(!accepted.has(id), `multiple assets claimed for ${id}`);
    check(raw.kind === expected.get(id), `wrong asset kind for ${id}`);
    check(raw.reviewState === 'accepted', `asset not independently accepted: ${id}`);
    nonempty(raw.reviewRef,'artifact review record reference');
    nonempty(raw.rightsRef,'artifact rights evidence reference');
    const sha = nonempty(raw.sha256,'asset sha256').toLowerCase();
    check(hashPattern.test(sha),'asset SHA-256 must be exact lowercase hex');
    const mimeType = nonempty(raw.mimeType,'asset MIME type');
    // A generic visual approval does not independently approve generated speech/sound.
    const audioReviewRef = embeddedJobs.has(id)
      ? nonempty(raw.audioReviewRef,'embedded-performance dialogue/audio review reference') : null;
    check((raw.kind==='video'?videoTypes:audioTypes).has(mimeType), `unexpected media kind for ${id}`);
    accepted.set(id, Object.freeze({jobId:id,kind:raw.kind,relativePath:relativeAssetPath(raw.relativePath),
      sha256:sha,mimeType,rightsRef:raw.rightsRef,reviewRef:raw.reviewRef,
      ...(audioReviewRef?{audioReviewRef}:{})}));
  }
  for (const id of expected.keys()) check(accepted.has(id), `missing accepted asset for ${id}`);
  return accepted;
}

async function sha256(file) {
  const h = createHash('sha256');
  for await(const data of createReadStream(file)) h.update(data);
  return h.digest('hex');
}

async function checkedPath(root, path) {
  const physicalRoot = await realpath(root);
  const physicalFile = await realpath(resolve(physicalRoot, path));
  const sub = relative(physicalRoot, physicalFile);
  check(sub && sub !== '..' && !sub.startsWith(`..${sep}`) && !isAbsolute(sub),
    'asset resolves outside declared custody root');
  check((await stat(physicalFile)).isFile(), 'asset must be a regular file');
  return physicalFile;
}

async function inspectMedia(file) {
  const {stdout} = await execFile('ffprobe', ['-v','error','-show_entries',
    'format=duration:stream=codec_type,width,height,duration','-of','json',file], {timeout:30000,maxBuffer:200000});
  const result=JSON.parse(stdout), duration=Number(result.format?.duration);
  check(Number.isFinite(duration) && duration>0, 'asset has no valid duration');
  return {duration,streams:result.streams??[]};
}

const voiceSeconds = (job, fps) => (job.endFrame-job.startFrame)/fps;

/**
 * One source of truth for preflight across flattened rendition and editable
 * editorial package. Rights/review refs are required input CLAIMS; exact
 * media bytes, path confinement, stream types, timeline geometry and duration
 * are independently checked here. No generator or publisher is called.
 */
export async function receiveMicrodramaInputs({plan,manifest,assetRoot,
  forbiddenPaths=[],ffmpegTimeoutMs=300000}={}){
  const assets=validateAssemblyManifest(plan,manifest);
  const root=nonempty(assetRoot,'assetRoot');
  check(Array.isArray(forbiddenPaths),'forbiddenPaths must be an array');
  const inputs=[];
  const forbidden=new Set(forbiddenPaths.map(p=>resolve(p)));
  for (const job of [...plan.jobs.video,...plan.jobs.speech]) {
    const asset=assets.get(job.id);
    const file=await checkedPath(root,asset.relativePath);
    check(!forbidden.has(file),'destination cannot overwrite a source asset');
    const actualHash=await sha256(file);
    check(actualHash===asset.sha256,`asset checksum mismatch for ${job.id}`);
    const media=await inspectMedia(file);
    const kind=job.durationFrames !==undefined?'video':'audio';
    let filmAssay=null;
    check(media.streams.some(s=>s.codec_type===kind),`invalid ${kind} stream for ${job.id}`);
    // FFmpeg filter labels [N:v] and [N:a] choose a track position.
    // Reject ambiguous tracks before video/voice acceptance so technical QA,
    // editor, and final release all refer to the very same decoded source.
    const pictures=media.streams.filter(s=>s.codec_type==='video');
    const sounds=media.streams.filter(s=>s.codec_type==='audio');
    check(kind==='video'?
      pictures.length===1&&sounds.length<=1:
      pictures.length===0&&sounds.length===1,
      `ambiguous ${kind} stream inventory for ${job.id}`);
    if(kind==='video') {
      check(media.duration + 0.045 >=job.durationFrames/plan.frameRate,`shot too short for ${job.id}`);
      const stream=media.streams.find(s=>s.codec_type==='video');
      check(stream.width>0 && stream.height>0 &&
        Math.abs(stream.width/stream.height - 9/16) < 0.012,`shot must be 9:16 for ${job.id}`);
      if(job.audioMode==='embedded-performance'){
        const audio=media.streams.find(s=>s.codec_type==='audio');
        check(audio,`embedded-performance shot requires an audio stream for ${job.id}`);
        const soundDuration=Number(audio.duration),wanted=job.durationFrames/plan.frameRate;
        check(!Number.isFinite(soundDuration)||soundDuration+0.08>=wanted,
          `embedded-performance audio is too short for ${job.id}`);
        // Technically inspect REAL footage before an editor receives this edit.
        // Stillness and silence are flagged, not rejected: silent storytelling
        // and sustained shots are valid creative decisions.
        filmAssay=await assayMicrodramaShot({file,mimeType:asset.mimeType,
          expectedAspect:'9:16',requiresAudio:true,timeoutMs:ffmpegTimeoutMs});
      }
    } else {
      check(media.duration <= voiceSeconds(job,plan.frameRate)+0.065,`speech too long for assigned slot ${job.id}`);
    }
    inputs.push({jobId:job.id,file,sha256:actualHash,mimeType:asset.mimeType,
      durationSeconds:media.duration,
      rightsRef:asset.rightsRef,reviewRef:asset.reviewRef,
      ...(job.durationFrames!==undefined?{audioMode:job.audioMode??'separate-voice'}:{}),
      ...(asset.audioReviewRef?{audioReviewRef:asset.audioReviewRef}:{}),
      ...(filmAssay?{technicalAssay:Object.freeze({
        state:filmAssay.state,sourceSha256:filmAssay.media.sha256,
        media:filmAssay.media,reviewFlags:filmAssay.reviewFlags,signals:filmAssay.signals,
        temporalLumaChange:filmAssay.temporalLumaChange
      })}:{})});
  }
  return Object.freeze(inputs.map(x=>Object.freeze(x)));
}

/** Files must already exist; this function never calls generation/publishing APIs. */
export async function assembleMicrodrama({plan,manifest,assetRoot,outputPath,width=1080,height=1920,
  overwrite=false,ffmpegTimeoutMs=300000,mastering=null}={}) {
  check(Number.isSafeInteger(width) && Number.isSafeInteger(height) && width>=180 && height>=320 &&
    width%2===0 && height%2===0 && width*16===height*9, 'output dimensions must be even-numbered 9:16 at least 180x320');
  const root=nonempty(assetRoot,'assetRoot');
  const output=resolve(nonempty(outputPath,'outputPath'));
  check(output.endsWith('.mp4'),'output must end in .mp4');
  const captionPath=output.slice(0,-4)+'.srt';
  if (!overwrite) {
    for (const dest of [output,captionPath]) {
      const seen=await stat(dest).then(()=>true).catch(e=>{if(e.code==='ENOENT')return false;throw e;});
      check(!seen, 'output exists; explicitly pass overwrite=true to replace');
    }
  }
  const inputs=await receiveMicrodramaInputs({plan,manifest,assetRoot,
    forbiddenPaths:[output,captionPath],ffmpegTimeoutMs});
  const inputIndices=new Map(inputs.map((a,i)=>[a.jobId,i]));
  const duration=plan.totalFrames/plan.frameRate;
  const graph=[],audioGraph=[];
  const addAudio=filter=>{graph.push(filter);audioGraph.push(filter)};
  const f=plan.frameRate;
  for(const [i,job] of plan.jobs.video.entries()){
    const index=inputIndices.get(job.id);
    graph.push(`[${index}:v]fps=${f},scale=${width}:${height}:flags=lanczos,setsar=1,trim=end_frame=${job.durationFrames},setpts=PTS-STARTPTS[v${i}]`);
    const seconds=(job.durationFrames/f).toFixed(6);
    if(job.audioMode==='embedded-performance'){
      // Keep physically acted dialogue, foley and ambience aligned with the source clip.
      addAudio(`[${index}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,atrim=duration=${seconds},asetpts=PTS-STARTPTS,apad=whole_dur=${seconds}[sa${i}]`);
    }else{
      // Separate-voice shots deliberately exclude unreviewed model audio.
      addAudio(`anullsrc=r=48000:cl=stereo:d=${seconds}[sa${i}]`);
    }
  }
  graph.push(`${plan.jobs.video.map((_,i)=>`[v${i}]`).join('')}concat=n=${plan.jobs.video.length}:v=1:a=0[catvideo]`);
  addAudio(`${plan.jobs.video.map((_,i)=>`[sa${i}]`).join('')}concat=n=${plan.jobs.video.length}:v=0:a=1[cataudio]`);
  // Fixed work directory ensures no caller-controlled path is ever interpolated into FFmpeg filters.
  graph.push('[catvideo]subtitles=filename=captions.srt[vout]');
  if (plan.jobs.speech.length) {
    for(const [i,j] of plan.jobs.speech.entries()){
      const index=inputIndices.get(j.id),start=Math.round(j.startFrame*1000/f);
      addAudio(`[${index}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=duration=${voiceSeconds(j,f)},asetpts=PTS-STARTPTS,adelay=${start}|${start}[voice${i}]`);
    }
    addAudio(`[cataudio]${plan.jobs.speech.map((_,i)=>`[voice${i}]`).join('')}amix=inputs=${plan.jobs.speech.length+1}:duration=first:normalize=0:dropout_transition=0,alimiter=limit=0.95[aout]`);
  } else addAudio('[cataudio]anull[aout]');

  await mkdir(dirname(output),{recursive:true});
  // Place the entire worksite on the destination filesystem: an interrupted
  // FFmpeg process must not expose an incomplete or mistaken-as-final movie.
  const work=await mkdtemp(join(dirname(output),'.microdrama-render-'));
  const stagedVideo=join(work,'rendered.mp4');
  const stagedCaptions=join(work,'rendered.srt');
  try {
    await writeFile(join(work,'captions.srt'),plan.subtitlesSrt,'utf8');
    const prepared=mastering===null?null:await prepareMicrodramaTwoPassMastering({
      inputs,audioGraph,cwd:work,mastering,timeoutMs:ffmpegTimeoutMs});
    const normalized=prepared?.secondPassFilter??null;
    const finalGraph=normalized?
      [...graph,`[aout]${normalized}[amastered]`]:graph;
    const args=['-nostdin','-y','-hide_banner','-nostats','-loglevel',normalized?'info':'error'];
    for(const input of inputs)args.push('-i',input.file);
    // FFmpeg otherwise copies global metadata from input 0 to the new MP4,
    // leaking arbitrary source comments, descriptions or private identifiers.
    // The source-owned edit has its own explicit rights and review custody.
    args.push('-filter_complex',finalGraph.join(';'),'-map','[vout]','-map',
      normalized?'[amastered]':'[aout]',
      '-map_metadata','-1','-map_chapters','-1',
      '-c:v','libx264','-preset','veryfast','-crf','22','-pix_fmt','yuv420p',
      '-c:a','aac','-ar','48000','-ac','2','-b:a','160k','-movflags','+faststart',
      '-t',String(duration),stagedVideo);
    const encoded=await execFile('ffmpeg',args,{cwd:work,timeout:ffmpegTimeoutMs,maxBuffer:1_000_000});
    const loudness=normalized?observeMicrodramaMasteredOutput({preparation:prepared,stderr:encoded.stderr}):
      prepared??null;
    const rendered=await inspectMedia(stagedVideo);
    const renderedVideo=rendered.streams.find(s=>s.codec_type==='video');
    const renderedAudio=rendered.streams.find(s=>s.codec_type==='audio');
    check(renderedVideo?.width===width && renderedVideo?.height===height && renderedAudio,
      'rendered copy has unexpected geometry or missing audio');
    check(Math.abs(rendered.duration-duration)<=1/f+0.06,'rendered duration differs from source plan');
    // Stage both completed deliverables before exposing either. No partial MP4
    // survives a crash, codec failure, deadline or source inspection failure.
    const digest=await sha256(stagedVideo);
    await writeFile(stagedCaptions,plan.subtitlesSrt,'utf8');
    if(!overwrite){
      // Atomic hardlink creation is an O_EXCL-style publication of each path;
      // the earlier existence check alone cannot defend simultaneous renders.
      let captionInstalled=false;
      try{
        await link(stagedCaptions,captionPath);
        captionInstalled=true;
        await link(stagedVideo,output);
      }catch(error){
        if(captionInstalled)await rm(captionPath,{force:true});
        throw error;
      }
    }else{
      // Preserve a preexisting caption during the second file's atomic replace.
      // There is still no filesystem-wide transaction across two filenames.
      const backup=join(work,'prior-caption.srt');
      let hadCaption=false;
      try{await link(captionPath,backup);hadCaption=true}
      catch(e){if(e.code!=='ENOENT')throw e}
      let captionInstalled=false;
      try{
        await rename(stagedCaptions,captionPath);
        captionInstalled=true;
        await rename(stagedVideo,output);
      }catch(error){
        if(captionInstalled){
          if(hadCaption)await rename(backup,captionPath);
          else await rm(captionPath,{force:true});
        }
        throw error;
      }
    }
    return Object.freeze({type:'MicrodramaLocalRendition',state:'RENDERED_REQUIRES_INDEPENDENT_REVIEW',
      videoPath:output,captionsPath:captionPath,sha256:digest,duration:rendered.duration,
      width,height,...(loudness?{loudness}:{}),source:{seriesId:plan.seriesId,episodeId:plan.episodeId,seedId:plan.source.id,
        reviewClaimRef:manifest.reviewRef},inputs:Object.freeze(inputs),
      note:'Rendition and external review claims do not establish editorial approval, verified contributor consent, media acceptance, YouTube upload or observed public delivery.'});
  } finally {await rm(work,{recursive:true,force:true});}
}
