/**
 * From the EXACT independently reviewed cinematic MP4 to a self-contained
 * professional distribution/screening package. This is Causeway's EXISTING
 * Public Fiction receiving operation, not a generator, publisher, copyright
 * tribunal or a second production ledger.
 *
 * Output: exact master, vertical poster, W3C WebVTT/SRT/transcript languages,
 * optional chapter track and editor-authored reel, HLS VOD, offline screening
 * page, and a single verified content-addressed delivery manifest.
 *
 * MP4 -> HLS uses FFmpeg's documented hls_playlist_type vod and independently
 * keyframed segments; source audio is retained. https://ffmpeg.org/ffmpeg-formats.html
 */
import {createHash,randomUUID} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {copyFile, mkdir, mkdtemp, open, readFile, realpath, readdir, rename, rm,
 stat, writeFile} from 'node:fs/promises';
import {dirname,join,relative,resolve,sep} from 'node:path';
import {promisify} from 'node:util';
import {execFile as callback} from 'node:child_process';
import {
 isSubtitleLanguage,parseMicrodramaSrt,renderMicrodramaSrt,
 renderMicrodramaVtt,renderMicrodramaTranscript,recutMicrodramaCaptions,
 chaptersToVtt,measureMicrodramaTextTrack
} from './microdrama-text-tracks.mjs';

const execFile=promisify(callback);
const check=(ok,message)=>{if(!ok)throw new TypeError(message)};
const text=(v,label,max=3000)=>{
 check(typeof v==='string'&&v.trim()&&v.length<=max,label+' needs bounded text');
 return v.trim();
};
const SHA=/^[a-f0-9]{64}$/u;
const SOURCE=/^(?:sha256:[a-f0-9]{64}|git:[a-f0-9]{40}|ni:\/\/\/sha-256;[A-Za-z0-9_-]{43})$/u;
const SLUG=/^[a-z][a-z0-9-]{0,69}$/u;
const isRecord=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const sha=async file=>{
 const hash=createHash('sha256');
 for await (const block of createReadStream(file))hash.update(block);
 return hash.digest('hex');
};
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
const exists=async file=>stat(file).then(()=>true).catch(e=>{
 if(e.code==='ENOENT')return false;throw e;
});
const isConfined=(root,file)=>{
 const sub=relative(root,file);
 return !!sub&&sub!=='..'&&!sub.startsWith('..'+sep)&&!sub.startsWith(sep);
};
const quote=html=>html.replace(/&/gu,'&amp;').replace(/</gu,'&lt;')
 .replace(/>/gu,'&gt;').replace(/"/gu,'&quot;').replace(/'/gu,'&#39;');
const rational=s=>{
 const [n,d]=String(s??'0/0').split('/').map(Number);
 return Number.isFinite(n)&&Number.isFinite(d)&&d>0?n/d:null;
};
const clockFrames=(n,fps)=>Number((n/fps).toFixed(6));
const validDuration=n=>Number.isFinite(n)&&n>0&&n<=3600;
const durationIso=n=>'PT'+Number(n.toFixed(3))+'S';
const mimeFor=name=>{
 if(name.endsWith('.mp4'))return 'video/mp4';
 if(name.endsWith('.jpg'))return 'image/jpeg';
 if(name.endsWith('.srt'))return 'application/x-subrip';
 if(name.endsWith('.vtt'))return 'text/vtt';
 if(name.endsWith('.txt'))return 'text/plain';
 if(name.endsWith('.m3u8'))return 'application/vnd.apple.mpegurl';
 if(name.endsWith('.ts'))return 'video/mp2t';
 if(name.endsWith('.html'))return 'text/html';
 throw new TypeError('unknown delivery MIME: '+name);
};
const run=async(args,{cwd,timeoutMs})=>execFile('ffmpeg',
 ['-nostdin','-y','-hide_banner','-loglevel','error',...args],
 {cwd,timeout:timeoutMs,maxBuffer:800_000});
const ffprobe=async(file,timeoutMs)=>{
 const {stdout}=await execFile('ffprobe',['-v','error',
  '-show_entries','format=duration:stream=codec_type,width,height,avg_frame_rate,channels',
  '-of','json',file],{timeout:Math.min(timeoutMs,45_000),maxBuffer:250_000});
 const data=JSON.parse(stdout),duration=Number(data.format?.duration);
 const video=data.streams?.find(x=>x.codec_type==='video');
 const audio=data.streams?.find(x=>x.codec_type==='audio');
 check(validDuration(duration)&&video?.width>0&&video?.height>0,
  'production film has no valid decoded video geometry/duration');
 return {duration,width:video.width,height:video.height,
  rate:rational(video.avg_frame_rate),hasAudio:Boolean(audio)};
};
/**
 * Explicit producer decisions; a package is NOT a public-release order.
 * Trailer in/out and poster frame are editorially chosen, never guessed.
 */
export function admitMicrodramaRelease({rendition,review,edition,posterFrame,
 trailer=null,chapters=[],localizations=[],hls=true}={}){
 check(isRecord(rendition)&&rendition.type==='MicrodramaLocalRendition'&&
  rendition.state==='RENDERED_REQUIRES_INDEPENDENT_REVIEW',
  'release needs a real final cinematic rendition');
 const sha256=text(rendition.sha256,'final MP4 SHA-256',64);
 check(SHA.test(sha256),'final movie needs a full SHA-256');
 check(review?.accepted===true&&review.asset?.sha256===sha256,
  'independent final acceptance must bind exact movie bytes');
 const reviewAuthority=text(review.authority,'independent review authority');
 const reviewRef=text(review.reviewRef,'final review identity');
 const rightsRef=text(review.rightsRef,'final media rights identity');
 check(isRecord(edition),'release needs the receiving producer edition');
 const seriesId=text(edition.seriesId,'series',100);
 const episodeId=text(edition.episodeId,'episode',100);
 const title=text(edition.title,'episode title',150);
 const synopsis=text(edition.synopsis,'approved episode synopsis',3000);
 const owner=text(edition.consumer,'production customer',300);
 const sourceRef=text(edition.sourceRef,'exact screenplay source',120);
 check(SOURCE.test(sourceRef),'release screenplay must be a content-exact NI, git or sha256');
 const language=text(edition.language,'primary dialog language',30);
 check(isSubtitleLanguage(language),'unsupported language tag');
 check(edition.containsSyntheticMedia===true,
  'synthetic AI drama needs truthful synthetic-media metadata');
 check(typeof edition.madeForKids==='boolean','audience classification must be explicit');
 check(edition.privacyStatus===undefined||edition.privacyStatus==='private',
  'production release pack may not authorize public platform publication');
 check(edition.publicationDate===undefined,'cannot invent publication date');
 const slug=text(edition.slug,'film edition slug',70);
 check(SLUG.test(slug),'edition slug must be a safe stable file stem');
 const fps=30;
 const duration=Number(rendition.duration);
 check(validDuration(duration),'source cinematic duration must be observed');
 const maxFrames=Math.round(duration*fps);
 check(Number.isSafeInteger(posterFrame)&&posterFrame>=0&&posterFrame<maxFrames,
  'poster frame must be chosen inside exact final film');
 const tags=edition.tags??[];
 check(Array.isArray(tags)&&tags.length<=20&&tags.every(x=>typeof x==='string'&&x.trim()&&x.length<=100),
  'release tags must be authored bounded text');
 let cuts=null;
 if(trailer!==null){
  check(isRecord(trailer)&&Array.isArray(trailer.segments)&&
   trailer.segments.length>=1&&trailer.segments.length<=12,
   'trailer needs 1-12 specific film-frame spans');
  text(trailer.editorialRef,'trailer editorial selection authority',500);
  const segments=trailer.segments.map(s=>{
   check(Number.isSafeInteger(s?.startFrame)&&Number.isSafeInteger(s?.endFrame)&&
    s.startFrame>=0&&s.endFrame>s.startFrame&&s.endFrame<=maxFrames,
    'trailer references frames outside accepted film');
   check(s.endFrame-s.startFrame>=Math.ceil(fps*.3),
    'trailer scene must be at least 300 milliseconds');
   return Object.freeze({startFrame:s.startFrame,endFrame:s.endFrame});
  });
  const frames=segments.reduce((sum,s)=>sum+s.endFrame-s.startFrame,0);
  check(frames<=90*fps,'short trailer must be at most 90 seconds');
  cuts=Object.freeze({editorialRef:trailer.editorialRef,segments:Object.freeze(segments),
   frames,durationSeconds:frames/fps});
 }
 check(Array.isArray(chapters)&&chapters.length<=100,
  'chapters must be bounded author-approved markers');
 const selectedChapters=chapters.map(c=>{
  check(Number.isSafeInteger(c.startFrame)&&Number.isSafeInteger(c.endFrame)&&
   c.startFrame>=0&&c.endFrame<=maxFrames&&c.endFrame>c.startFrame,
   'chapter references video frames outside the film');
  return Object.freeze({startFrame:c.startFrame,endFrame:c.endFrame,
   title:text(c.title,'chapter title',200)});
 });
 check(Array.isArray(localizations)&&localizations.length<=12,
  'use at most twelve independently accepted subtitle languages');
 const languages=new Set([language]),translated=localizations.map(x=>{
  check(isRecord(x),'localized captions must be a separately owned record');
  const tag=text(x.language,'subtitle language',30);
  check(isSubtitleLanguage(tag)&&!languages.has(tag),'subtitle languages must be unique');
  languages.add(tag);
  const path=text(x.srtPath,'existing translated SRT custody path',3000);
  return Object.freeze({language:tag,srtPath:resolve(path),
   rightsRef:text(x.rightsRef,'translation rights',600),
   reviewRef:text(x.reviewRef,'reviewed translation',600)});
 });
 check(typeof hls==='boolean','HLS choice must be boolean');
 return Object.freeze({
  type:'MicrodramaReleaseProposal',version:1,status:'PREPARED_FOR_PRIVATE_MANUFACTURING',
  sourceFile:resolve(text(rendition.videoPath,'physical movie',4000)),
  sourceCaptions:resolve(text(rendition.captionsPath,'original SRT',4000)),
  sourceSha256:sha256,declaredDuration:duration,
  edition:Object.freeze({seriesId,episodeId,title,synopsis,consumer:owner,sourceRef,
   language,slug,tags:Object.freeze(tags),madeForKids:edition.madeForKids,
   containsSyntheticMedia:true,privacyStatus:'private'}),
  reviewedBy:reviewAuthority,reviewRef,rightsRef,posterFrame,
  trailer:cuts,chapters:Object.freeze(selectedChapters),
  localizations:Object.freeze(translated),hls
 });
}
async function inspectReleaseSource(proposal,timeoutMs){
 const source=await realpath(proposal.sourceFile);
 const info=await stat(source);
 check(info.isFile()&&info.size>=1024&&info.size<=1_500_000_000,
  'accepted cinematic original must be a bounded ordinary file');
 const probe=await ffprobe(source,timeoutMs);
 check(Math.abs(probe.duration-proposal.declaredDuration)<.16,
  'accepted movie duration differs from source film review');
 check(Math.abs(probe.width/probe.height-9/16)<.012&&
  probe.width%2===0&&probe.height%2===0&&probe.width>=180,
  'release format must be even-dimension 9:16 portrait');
 check(probe.rate!==null&&Math.abs(probe.rate-30)<.025,
  'release source must be 30 fps conformant to its timeline');
 check(probe.hasAudio,'source film must have its independently reviewed soundtrack');
 check(await sha(source)===proposal.sourceSha256,
  'source film bytes changed since independent final review');
 const sub=await readFile(proposal.sourceCaptions,'utf8');
 const cues=parseMicrodramaSrt(sub,{durationMs:Math.round(probe.duration*1000)});
 return {source,probe,cues};
}
function screeningPage(p,subtitleLanguages){
 const title=quote(p.edition.title),synopsis=quote(p.edition.synopsis);
 const tracks=subtitleLanguages.map((tag,i)=>
  '<track kind="captions" src="captions/'+tag+'.vtt" srclang="'+tag+
  '" label="'+tag+'"'+(i===0?' default':'')+'>').join('\n    ');
 return '<!doctype html>\n<html lang="'+p.edition.language+'">\n'+
 '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'+
 '<meta name="robots" content="noindex,nofollow">'+
 '<title>'+title+' — private screening</title>'+
 '<style>html{background:#101016;color:#f6f6f7;font:1rem/1.6 system-ui,sans-serif}'+
 'main{max-width:48rem;margin:auto;padding:1.5rem}video{display:block;width:100%;max-height:80vh;'+
 'background:#000;object-fit:contain}a{color:#a9d3fc}p{max-width:68ch}</style></head>\n'+
 '<body><main><h1>'+title+'</h1><p>'+synopsis+'</p>'+
 '<video controls playsinline preload="metadata" poster="poster.jpg" src="master.mp4">\n    '+
 tracks+'\n    Your browser requires MP4 playback support.</video>'+
 '<p>Internal editorial screening only. Source, consent and public-release authority remain separate.</p>'+
 '</main></body></html>\n';
}
async function encodeTrailer({source,staging,plan,probe,timeoutMs}){
 const filter=[],frames=plan.segments;
 for(let i=0;i<frames.length;i++){
  const s=frames[i],a=clockFrames(s.startFrame,30),
   b=clockFrames(s.endFrame,30);
  filter.push('[0:v]fps=30,trim=start_frame='+s.startFrame+
   ':end_frame='+s.endFrame+',setpts=PTS-STARTPTS,setsar=1[v'+i+']');
  filter.push('[0:a]atrim=start='+a+':end='+b+
   ',asetpts=PTS-STARTPTS[a'+i+']');
 }
 filter.push(frames.map((_,i)=>'[v'+i+'][a'+i+']').join('')+
  'concat=n='+frames.length+':v=1:a=1[vout][aout]');
 await run(['-i',source,'-filter_complex',filter.join(';'),
  '-map','[vout]','-map','[aout]',
  // Each derivative has fresh editorial custody; do not inherit arbitrary
  // recording metadata, private descriptions or chapters from input master.
  '-map_metadata','-1','-map_chapters','-1','-c:v','libx264',
  '-preset','veryfast','-crf','22','-pix_fmt','yuv420p',
  '-c:a','aac','-b:a','160k','-movflags','+faststart',
  '-t',String(plan.durationSeconds),join(staging,'teaser.mp4')],
  {cwd:staging,timeoutMs});
 const delivered=await ffprobe(join(staging,'teaser.mp4'),timeoutMs);
 check(Math.abs(delivered.duration-plan.durationSeconds)<.16&&
  delivered.width===probe.width&&delivered.height===probe.height&&delivered.hasAudio,
  'produced trailer is not frame-time or media-format conformant');
}
async function encodeHls({source,staging,probe,timeoutMs}){
 const dir=join(staging,'hls');
 await mkdir(dir);
 const width=Math.min(540,probe.width),height=Math.max(2,Math.round((width*16/9)/2)*2);
 await run(['-i',source,'-map','0:v:0','-map','0:a:0',
  '-map_metadata','-1','-map_chapters','-1',
  '-vf','fps=30,scale='+width+':'+height+':flags=lanczos,setsar=1',
  '-c:v','libx264','-preset','veryfast','-crf','23','-pix_fmt','yuv420p',
  '-sc_threshold','0','-force_key_frames','expr:gte(t,n_forced*4)',
  '-c:a','aac','-b:a','128k','-ar','48000','-ac','2',
  '-f','hls','-hls_time','4','-hls_list_size','0',
  '-hls_playlist_type','vod','-hls_flags','independent_segments',
  '-hls_segment_filename',join(dir,'segment-%05d.ts'),
  join(dir,'index.m3u8')],{cwd:staging,timeoutMs});
 const playlist=await readFile(join(dir,'index.m3u8'),'utf8');
 check(playlist.startsWith('#EXTM3U')&&
  playlist.includes('#EXT-X-PLAYLIST-TYPE:VOD')&&
  playlist.includes('#EXT-X-INDEPENDENT-SEGMENTS')&&
  playlist.includes('#EXT-X-ENDLIST'),'VOD HLS playlist is incomplete or non-independent');
 const names=playlist.split('\n').map(x=>x.trim()).filter(x=>x&&!x.startsWith('#'));
 check(names.length>0&&names.every(x=>/^segment-\d{5}\.ts$/u.test(x)),
  'HLS playlist references unsafe or missing segment names');
 const durations=[...playlist.matchAll(/^#EXTINF:([\d.]+)/gmu)].map(m=>Number(m[1]));
 check(durations.length===names.length&&durations.every(n=>validDuration(n)),
  'HLS segment duration inventory is incomplete');
 check(Math.abs(durations.reduce((a,b)=>a+b,0)-probe.duration)<.7,
  'HLS playlist duration does not correspond to final film');
 for(const item of names){
  const info=await stat(join(dir,item));
  check(info.isFile()&&info.size>0,'HLS output is missing a referenced segment');
 }
}
async function fileInventory(stage){
 const entries=[];
 async function walk(dir){
  for(const item of await readdir(dir,{withFileTypes:true})){
   const path=join(dir,item.name),name=relative(stage,path).split(sep).join('/');
   if(item.isDirectory()){await walk(path);continue}
   check(item.isFile(),'release package may only contain regular files');
   const info=await stat(path);
   entries.push(Object.freeze({path:name,mimeType:mimeFor(name),
    bytes:info.size,sha256:await sha(path)}));
  }
 }
 await walk(stage);
 return Object.freeze(entries.sort((a,b)=>a.path.localeCompare(b.path)));
}
/**
 * Produce one actual, atomically installed internal-delivery package.
 * Does not claim that any one provider or author approved these rights strings.
 */
export async function manufactureMicrodramaRelease({
 proposal,outputDir,timeoutMs=600000
}={}){
 check(proposal?.type==='MicrodramaReleaseProposal',
  'a source-admitted cinematic release is required');
 check(Number.isSafeInteger(timeoutMs)&&timeoutMs>=30000&&timeoutMs<=1_800_000,
  'render timeout must be bounded');
 const target=resolve(text(outputDir,'new release directory',4000));
 check(!await exists(target),'release edition already exists: use a NEW version');
 const {source,probe,cues}=await inspectReleaseSource(proposal,timeoutMs);
 const parent=dirname(target);await mkdir(parent,{recursive:true});
 // Serialize simultaneous publishers for one named edition. An unexpected
 // process death keeps the reservation; do not silently remove uncertain work.
 const lock=target+'.lock';const lockFd=await open(lock,'wx',0o600);
 let staging=null;
 try{
  staging=await mkdtemp(join(parent,'.microdrama-release-'));
  const master=join(staging,'master.mp4');
  await copyFile(source,master);
  check(await sha(master)===proposal.sourceSha256,
   'copied original film was altered during private delivery');
  const language=proposal.edition.language,subtitleLanguages=[language];
  await mkdir(join(staging,'captions'));
  await mkdir(join(staging,'transcripts'));
  const originalVtt=renderMicrodramaVtt(cues);
  await writeFile(join(staging,'captions',language+'.srt'),renderMicrodramaSrt(cues));
  await writeFile(join(staging,'captions',language+'.vtt'),originalVtt);
  await writeFile(join(staging,'transcripts',language+'.txt'),
   renderMicrodramaTranscript(cues));
  const observedLanguages=new Map([[language,cues]]);
  const filmDurationMs=Math.round(probe.duration*1000),teaserTextObservations=[];
  for(const sub of proposal.localizations){
   const value=await readFile(sub.srtPath,'utf8');
   const translated=parseMicrodramaSrt(value,{durationMs:Math.round(probe.duration*1000)});
   await writeFile(join(staging,'captions',sub.language+'.srt'),
    renderMicrodramaSrt(translated));
   await writeFile(join(staging,'captions',sub.language+'.vtt'),
    renderMicrodramaVtt(translated));
   await writeFile(join(staging,'transcripts',sub.language+'.txt'),
    renderMicrodramaTranscript(translated));
   subtitleLanguages.push(sub.language);observedLanguages.set(sub.language,translated);
  }
  if(proposal.chapters.length)
   await writeFile(join(staging,'chapters.vtt'),chaptersToVtt(proposal.chapters,30));
  // First-party poster selected at a source-authorized exact film frame. No
  // typography/logo hallucination and no dependency on a paid image model.
  await run(['-ss',String(clockFrames(proposal.posterFrame,30)),
   '-i',master,'-an','-frames:v','1',
   '-vf','scale='+Math.min(1080,probe.width)+':'+Math.min(1920,probe.height)+':flags=lanczos',
   '-q:v','2',join(staging,'poster.jpg')],{cwd:staging,timeoutMs});
  check((await stat(join(staging,'poster.jpg'))).size>1024,
   'source film did not produce a poster frame');
  if(proposal.trailer){
   await encodeTrailer({source:master,staging,plan:proposal.trailer,probe,timeoutMs});
   const trailerDir=join(staging,'teaser-captions');await mkdir(trailerDir);
   for(const [lang,track] of observedLanguages){
    const shortened=recutMicrodramaCaptions({
     cues:track,segments:proposal.trailer.segments,fps:30
    });
    teaserTextObservations.push(measureMicrodramaTextTrack({cues:shortened,
     language:lang,durationMs:Math.round(proposal.trailer.durationSeconds*1000)}));
    await writeFile(join(trailerDir,lang+'.vtt'),renderMicrodramaVtt(shortened));
    await writeFile(join(trailerDir,lang+'.srt'),renderMicrodramaSrt(shortened));
   }
  }
  if(proposal.hls)await encodeHls({source:master,staging,probe,timeoutMs});
  await writeFile(join(staging,'screening.html'),screeningPage(proposal,subtitleLanguages));
  const assets=await fileInventory(staging);
  const manifest={
   type:'MicrodramaReleasePackage',version:1,
   state:'PRIVATE_MANUFACTURED_NOT_PUBLISHED',
   edition:proposal.edition,
   source:Object.freeze({originalFilmSha256:proposal.sourceSha256,
    filmDurationSeconds:Number(probe.duration.toFixed(3)),
    width:probe.width,height:probe.height,frameRate:30,
    claims:Object.freeze({independentEditorialReview:proposal.reviewRef,
     editorialAuthority:proposal.reviewedBy,rightsRef:proposal.rightsRef})}),
   selectedPosterFrame:proposal.posterFrame,
   ...(proposal.trailer?{trailer:Object.freeze({editorialRef:proposal.trailer.editorialRef,
    durationSeconds:proposal.trailer.durationSeconds,
    segments:proposal.trailer.segments})}:{}),
   ...(proposal.chapters.length?{chapterCount:proposal.chapters.length}:{}),
   subtitleLanguages:Object.freeze(subtitleLanguages.map(tag=>{
    const row=proposal.localizations.find(x=>x.language===tag);
    return Object.freeze({language:tag,rightsRef:row?.rightsRef??proposal.rightsRef,
     reviewRef:row?.reviewRef??proposal.reviewRef});
   })),
   textObservations:Object.freeze([...observedLanguages].map(([lang,track])=>
    measureMicrodramaTextTrack({cues:track,language:lang,durationMs:filmDurationMs}))),
   ...(proposal.trailer?{teaserTextObservations:Object.freeze(teaserTextObservations)}:{}),
   assets,
   distributionRule:'The package is an unshipped PRIVATE deliverable; actual channel/public use requires a separate receiving authority and witnessed publication.',
  };
  const json=Buffer.from(JSON.stringify(manifest,null,2)+'\n');
  await writeFile(join(staging,'release.json'),json);
  check(await sha(source)===proposal.sourceSha256,
   'original film mutated while its release package was being built');
  check(!await exists(target),'another edition already occupies this destination');
  await rename(staging,target);
  return Object.freeze({
   type:'MicrodramaReleaseManufacturingResult',
   status:'PRIVATE_ASSETS_MANUFACTURED_REQUIRES_DISTRIBUTION_REVIEW',
   outputDir:target,sourceSha256:proposal.sourceSha256,
   manifestSha256:hash(json),files:assets.length+1,
   subtitleLanguages:Object.freeze(subtitleLanguages),
   hasTrailer:Boolean(proposal.trailer),hasHls:proposal.hls,
   note:'Finished private distribution assets, not evidence of published video, approved rights authenticity, viewers or sale.'
  });
 }finally{
  if(staging)await rm(staging,{recursive:true,force:true});
  await lockFd.close();
  await rm(lock,{force:true});
 }
}
/**
 * Independent receiving check for the exact package. Never trust manifest
 * claims alone: each regular file must match its listed bytes and SHA-256.
 * Deny symlinks, missing files, surplus files and path traversal.
 */
export async function verifyMicrodramaReleasePackage(outputDir){
 const root=await realpath(resolve(text(outputDir,'package to receive')));
 const raw=await readFile(join(root,'release.json'));
 const m=JSON.parse(raw.toString('utf8'));
 check(m?.type==='MicrodramaReleasePackage'&&m.version===1&&
  m.state==='PRIVATE_MANUFACTURED_NOT_PUBLISHED'&&Array.isArray(m.assets),
  'unrecognized cinematic release package');
 check(SHA.test(m.source?.originalFilmSha256??''),'manifest lacks final source identity');
 const expected=new Map();
 for(const item of m.assets){
  check(isRecord(item)&&typeof item.path==='string'&&
   /^[A-Za-z0-9][A-Za-z0-9._/-]*$/u.test(item.path)&&
   !item.path.split('/').some(x=>!x||x==='.'||x==='..')&&
   !expected.has(item.path),'package asset paths must be bounded relative and unique');
  check(SHA.test(item.sha256)&&Number.isSafeInteger(item.bytes)&&item.bytes>=0,
   'asset lacks actual SHA and byte length');
  expected.set(item.path,item);
 }
 const encountered=new Set();
 async function visit(dir){
  for(const item of await readdir(dir,{withFileTypes:true})){
   const file=join(dir,item.name);
   if(item.isSymbolicLink())throw new TypeError('symlinks are forbidden in release bundles');
   if(item.isDirectory()){await visit(file);continue}
   check(item.isFile(),'nonregular release media found');
   const name=relative(root,file).split(sep).join('/');
   if(name==='release.json')continue;
   check(expected.has(name),'unlisted or surplus release media: '+name);
   const declared=expected.get(name),info=await stat(file);
   check(isConfined(root,file)&&info.size===declared.bytes&&
    await sha(file)===declared.sha256,'release media bytes differ from manifest: '+name);
   encountered.add(name);
  }
 }
 await visit(root);
 check(encountered.size===expected.size,'release package lacks expected files');
 const master=expected.get('master.mp4');
 check(master?.sha256===m.source.originalFilmSha256,
  'release package master differs from independently reviewed film');
 if(expected.has('hls/index.m3u8')){
  const playlist=await readFile(join(root,'hls/index.m3u8'),'utf8');
  check(playlist.includes('#EXT-X-ENDLIST'),'streaming playlist is incomplete');
  for(const line of playlist.split(/\r?\n/gu).map(x=>x.trim())){
   if(!line||line.startsWith('#'))continue;
   check(expected.has('hls/'+line),'HLS manifest references missing segment');
  }
 }
 return Object.freeze({type:'MicrodramaReleaseVerification',
  state:'CONTENT_BYTES_VERIFIED_NOT_PUBLICATION',
  sourceSha256:master.sha256,manifestSha256:hash(raw),
  assetCount:expected.size,subtitleLanguages:m.subtitleLanguages.map(x=>x.language),
  hasHls:expected.has('hls/index.m3u8'),hasTrailer:expected.has('teaser.mp4'),
  note:'Exact bytes only; media rights, content quality, channel acceptance and public audience are separate.'});
}