import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {renderOtioVideoCuts,OTIO_RENDER_TYPE} from '../src/otio-render.mjs';

const digest=p=>'ni:///sha-256;'+createHash('sha256').update(readFileSync(p)).digest('base64url');
const duration=(start,ms)=>({OTIO_SCHEMA:'TimeRange.1',
 start_time:{OTIO_SCHEMA:'RationalTime.1',value:start,rate:1000},
 duration:{OTIO_SCHEMA:'RationalTime.1',value:ms,rate:1000}});
test('actual input video is decoded, cut and reassembled in native OTIO order',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'otio-video-receiving-'));
 t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const files=['red.mp4','blue.mp4'].map(n=>join(dir,n));
 for(let i=0;i<2;i++){
  execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y',
   '-f','lavfi','-i','color=c='+(i?'blue':'red')+':s=320x180:r=30:d=2',
   '-f','lavfi','-i','sine=frequency=440:duration=2',
   '-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p',
   '-c:a','aac','-shortest',files[i]],{timeout:60000});
 }
 const sources=files.map(filePath=>({filePath,sourceVideoNi:digest(filePath),mediaType:'video/mp4'}));
 const clip=(index,ms,length)=>({OTIO_SCHEMA:'Clip.2',enabled:true,effects:[],
  active_media_reference_key:'DEFAULT_MEDIA',
  media_references:{DEFAULT_MEDIA:{OTIO_SCHEMA:'ExternalReference.1',
   target_url:pathToFileURL(files[index]).href,
   metadata:{causeway:{sourceVideoNi:sources[index].sourceVideoNi}}}},
  source_range:duration(ms,length)});
 const edit={OTIO_SCHEMA:'Timeline.1',tracks:{OTIO_SCHEMA:'Stack.1',
  children:[{OTIO_SCHEMA:'Track.1',kind:'Video',effects:[],
   children:[clip(0,700,500),clip(1,200,700),clip(0,0,400)]}]}};
 const otio=join(dir,'review.otio'),output=join(dir,'master.mp4');
 writeFileSync(otio,JSON.stringify(edit));
 const receipt=await renderOtioVideoCuts({editPath:otio,sourceMedia:sources,
  outputPath:output,width:320,height:180,frameRate:30});
 assert.equal(receipt.type,OTIO_RENDER_TYPE);
 assert.equal(receipt.clipCount,3);
 assert.ok(Math.abs(receipt.outputDurationSeconds-1.6)<.18);
 assert.equal(receipt.outputVideoNi,digest(output));
});
