#!/usr/bin/env node
/** Assemble a previously compiled MicrodramaProductionProposal and accepted bytes. */
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {planCinematicVeoShoot,manufactureCinematicVeoShootingPackage,
 receiveCinematicGeminiVeoShot} from '../src/microdrama-veo-shooting.mjs';
import {assembleMicrodrama} from '../src/microdrama-assembly.mjs';
import {planMicrodramaEditorialIngest,manufactureMicrodramaEditorialIngest,
 projectReviewedCinematicVeoEditorialSource} from '../src/microdrama-editorial-ingest.mjs';
import {materializeMicrodramaEditorial} from '../src/microdrama-editorial.mjs';
import {assayMicrodramaShot} from '../src/microdrama-shot-assay.mjs';
import {admitMicrodramaRelease,manufactureMicrodramaRelease,verifyMicrodramaReleasePackage} from '../src/microdrama-release.mjs';
const usage='Usage: node apps/assemble-microdrama.mjs <compiled-plan.json> <accepted-assets.json> <asset-root> <output.mp4> [width height] [--master-lufs -16]';
async function main(argv){
 // One admitted source media ingest for both the existing final FFmpeg cut and
 // its editable OpenTimelineIO companion. This DOES NOT make a review decision.
 if(argv[0]==='--ingest'){
  const [command,planFile,reviewedInputsFile,outputDir,...extra]=argv;
  if(!planFile||!reviewedInputsFile||!outputDir||extra.length)
   throw new TypeError('Usage: assemble-microdrama.mjs --ingest COMPILED-FILM.json INDEPENDENTLY-REVIEWED-SOURCES.json NEW-EDITOR-MEDIA-DIR');
  const readBounded=async file=>{
   const bytes=await readFile(file);
   if(bytes.length>4_000_000)throw new TypeError('original editorial receiving inputs exceed 4MB');
   return JSON.parse(bytes.toString('utf8'));
  };
  const [plan,received]=await Promise.all([
   readBounded(planFile),readBounded(reviewedInputsFile)]);
  if(!Array.isArray(received.sources??[])||
     !Array.isArray(received.reviewedVeo??[]))
   throw new TypeError('reviewed source inputs and verified Veo reviews must be arrays');
  // The producer can supply actual existing MediaArtifactReview journal records
  // and the independently decoded receiving results without rewriting a
  // second video acceptance table for the editor.
  const sources=[
   ...(received.sources??[]),
   ...(received.reviewedVeo??[]).map(row=>
    projectReviewedCinematicVeoEditorialSource(row))
  ];
  const ingest=planMicrodramaEditorialIngest({
   plan,sources,parentReviewRef:received.parentReviewRef});
  if(ingest.status!=='COMPLETE_ORIGINAL_MEDIA_READY_FOR_BYTE_CHECK_AND_EDITING')
   return {type:ingest.type,status:ingest.status,sourceFilm:ingest.sourceFilm,
    missingJobs:ingest.missingJobs,note:'Incomplete original scene inputs were not manufactured into an accepted edit.'};
  return manufactureMicrodramaEditorialIngest({plan,ingestPlan:ingest,outputDir});
 }
 // Source-approved cinematic shooting specs are a PRIVATE operational
 // transport for the existing Red Cup paid video operator, not new canon.
 if(argv[0]==='--shoot'){
  const [command,planFile,approvalFile,imageManifestFile,imageRoot,outputDir,
   model='veo-3.1-fast-generate-preview',resolution='1080p',...extra]=argv;
  if(!planFile||!approvalFile||!imageManifestFile||!imageRoot||!outputDir||extra.length)
   throw new TypeError('Usage: assemble-microdrama.mjs --shoot PLAN.json APPROVAL.json ORIGINAL-IMAGES.json IMAGE-ROOT NEW-PRIVATE-SHOOT-DIR [model resolution]');
  const load=async(file)=>{
   const data=await readFile(file,'utf8');
   if(data.length>3000000)throw new TypeError('Cinematic shoot input exceeds 3MB');
   return JSON.parse(data);
  };
  const [plan,approval,imagesPacket]=await Promise.all([
   load(planFile),load(approvalFile),load(imageManifestFile)]);
  const images=imagesPacket.images??imagesPacket;
  const shootPlan=planCinematicVeoShoot({plan,approval,images,model,resolution});
  return manufactureCinematicVeoShootingPackage({
   shootPlan,images,imageRoot,outputDir});
 }
 if(argv[0]==='--receive-veo'){
  const [command,packageDir,shotId,providerJobRoot,allocationRef,...extra]=argv;
  if(!packageDir||!shotId||!providerJobRoot||!allocationRef||extra.length)
   throw new TypeError('Usage: assemble-microdrama.mjs --receive-veo PRIVATE-SHOOT-DIR SHOT-ID ACTUAL-RED-CUP-JOB-DIR ALLOCATION-REF');
  if(!/^[a-z0-9][a-z0-9-]{0,79}$/u.test(shotId))
   throw new TypeError('source film shot ID must be a canonical 80-character slug');
  const load=async(file)=>{
   const bytes=await readFile(file);
   if(bytes.length>3000000)throw new TypeError('provider receipt exceeds 3MB');
   return JSON.parse(bytes.toString('utf8'));
  };
  const planBytes=await readFile(join(packageDir,'shooting-plan.json'));
  const manifest=await load(join(packageDir,'shooting-package.json'));
  const actual=createHash('sha256').update(planBytes).digest('hex');
  if(manifest.originalSourceShootingPlanSha256!==actual)
   throw new TypeError('private source shooting plan changed since its own operator bundle was packed');
  const sourceSpec=await readFile(join(packageDir,'shot-'+shotId+'.json'));
  const originalJob=manifest.originalShotSpecs?.find(x=>x.shotId===shotId);
  const jobHash=createHash('sha256').update(sourceSpec).digest('hex');
  if(!originalJob||originalJob.specSha256!==jobHash)
   throw new TypeError('Red Cup paid cinematic source shot differs from approved private shoot package');
  const shootPlan=JSON.parse(planBytes);
  const [attempted,submission,providerByteReceipt]=await Promise.all([
   load(join(providerJobRoot,'attempted.json')),
   load(join(providerJobRoot,'submitted.json')),
   load(join(providerJobRoot,'received.json'))]);
  if(attempted?.type!=='GeminiVeoSubmissionAttempt'||
   attempted?.state!=='POST_OUTCOME_UNKNOWN_UNTIL_OPERATION_OBSERVED'||
   attempted.sourceSpecSha256!==jobHash||
   !attempted.prepared)
   throw new TypeError('Red Cup paid-attempt original source request does not match Causeway film');
  if(attempted.spendingOperator!==submission.operatorRef||
   !Number.isFinite(attempted.spendLimitUsd)||
   attempted.spendLimitUsd<submission.estimatedMaximumUsd)
   throw new TypeError('Red Cup source-bound spending authority differs from actual provider submission');
  return receiveCinematicGeminiVeoShot({
   shootPlan,shotId,publicPlan:attempted.prepared,submission,providerByteReceipt,
   providerJobRoot,allocationRef});
 }
 // A release package is the same source-owned finished-film rendition made
 // ready for screening, localized review, posters, teaser and HLS distribution.
 // Actual public publication is a separately authorized YouTube/web office.
 if(argv[0]==='--release'){
  const [command,spec,output,...rest]=argv;
  if(!spec||!output||rest.length)throw new TypeError(
   'Usage: assemble-microdrama.mjs --release ACCEPTED-FILM-SPEC.json NEW-PACKAGE-DIR');
  const payload=await readFile(spec,'utf8');
  if(payload.length>3_000_000)throw new TypeError('Release specification must be <= 3 MB');
  const proposal=admitMicrodramaRelease(JSON.parse(payload));
  return manufactureMicrodramaRelease({proposal,outputDir:output});
 }
 if(argv[0]==='--verify-release'){
  if(argv.length!==2)throw new TypeError(
   'Usage: assemble-microdrama.mjs --verify-release EXISTING-PACKAGE-DIR');
  return verifyMicrodramaReleasePackage(argv[1]);
 }
 if(argv[0]==='--editorial'){
  const [mode,planPath,manifestPath,assetRoot,outputDir,...extra]=argv;
  if(!planPath||!manifestPath||!assetRoot||!outputDir||extra.length)
   throw new TypeError('Usage: node apps/assemble-microdrama.mjs --editorial PLAN.json ACCEPTED-ASSETS.json ASSET-ROOT NEW-EDIT-DIRECTORY');
  const [plan,manifest]=await Promise.all([planPath,manifestPath].map(async path=>{
   const source=await readFile(path,'utf8');
   if(source.length>3000000)throw new TypeError('Input manifest too large');
   return JSON.parse(source);
  }));
  return materializeMicrodramaEditorial({plan,manifest,assetRoot,outputDir});
 }
 // Observe candidate provider bytes BEFORE rights/creative approval, without
 // generating media or inventing an accepted-asset manifest.
 if(argv[0]==='--inspect'){
  const [command,file,...args]=argv;
  if(!file||args.length>7)throw new TypeError(
    'Usage: node apps/assemble-microdrama.mjs --inspect <existing.mp4> [--aspect 9:16|16:9] [--seconds N] [--max-seconds N] [--require-audio]');
  const options={file},seen=new Set();
  for(let i=0;i<args.length;i++){
    const flag=args[i];
    if(seen.has(flag))throw new TypeError('duplicate inspect flag '+flag);
    seen.add(flag);
    if(flag==='--require-audio'){options.requiresAudio=true;continue;}
    if(flag==='--aspect'){options.expectedAspect=args[++i];continue;}
    if(flag==='--seconds'){options.expectedSeconds=Number(args[++i]);continue;}
    if(flag==='--max-seconds'){options.maxSeconds=Number(args[++i]);continue;}
    throw new TypeError('unknown inspect flag '+flag);
  }
  return assayMicrodramaShot(options);
 }
  let mastering=null;
  if(argv.includes('--master-lufs')){
    if(argv.at(-2)!=='--master-lufs')throw new TypeError(usage);
    const value=Number(argv.at(-1));
    if(!Number.isFinite(value))throw new TypeError('mastered integrated LUFS must be numeric');
    mastering={integratedLufs:value};
    argv=argv.slice(0,-2);
  }
  if(argv.length!==4 && argv.length!==6)throw new TypeError(usage);
  const [planFile,manifestFile,assetRoot,outputPath,w,h]=argv;
  const [plan,manifest]=await Promise.all([planFile,manifestFile].map(async path=>{
    const content=await readFile(path,'utf8');
    if(content.length>3000000)throw new TypeError('Input manifest too large');
    return JSON.parse(content);
  }));
  return assembleMicrodrama({plan,manifest,assetRoot,outputPath,
    ...(w!==undefined?{width:Number(w),height:Number(h)}:{}),mastering});
}
try{process.stdout.write(JSON.stringify(await main(process.argv.slice(2)),null,2)+'\n');}
catch(e){process.stderr.write(String(e.message||e)+'\n');process.exitCode=1;}
