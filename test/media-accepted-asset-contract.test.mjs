import test from "node:test";
import assert from "node:assert/strict";
import {admitAcceptedMediaAsset} from "../src/media-accepted-asset-contract.mjs";
const base=(mimeType)=>({
  relativePath:"accepted/source/asset",sha256:"a".repeat(64),mimeType,metadataSanitized:true
});
const bluesky={channel:"bluesky",handle:"koiosnews.bsky.social",text:"A checked news release",
  url:"https://koios.news/checked-story"};
test("consumer acceptance is independent of publication; social packet is an optional separate contract",()=>{
  const asset={...base("image/png"),width:1600,height:900,altText:"Clean blue geometrical structure."};
  const accepted=admitAcceptedMediaAsset({asset});
  assert.equal(accepted.asset.mimeType,"image/png");
  assert.equal(accepted.distribution,undefined);
  assert.equal(admitAcceptedMediaAsset({asset,distribution:bluesky}).distribution.channel,"bluesky");
});
test("video and audio require accessible transcripts without implying Bluesky publication",()=>{
  const video=admitAcceptedMediaAsset({asset:{...base("video/mp4"),width:1920,height:1080,transcriptRef:"ni:///sha-256;video-transcript"}});
  const audio=admitAcceptedMediaAsset({asset:{...base("audio/mpeg"),transcriptRef:"ni:///sha-256;audio-transcript"}});
  assert.equal(video.asset.transcriptRef,"ni:///sha-256;video-transcript");
  assert.equal(audio.asset.transcriptRef,"ni:///sha-256;audio-transcript");
  assert.throws(()=>admitAcceptedMediaAsset({asset:{...base("video/mp4"),width:1080,height:1920}}),/transcript/u);
  assert.throws(()=>admitAcceptedMediaAsset({asset:{...base("audio/mpeg"),transcriptRef:"x"},distribution:bluesky}),/only reviewed raster/u);
});
test("accessible scientific document and slide deck can be reviewed without social channel",()=>{
  const pdf=admitAcceptedMediaAsset({asset:{...base("application/pdf"),accessibleTextRef:"ni:///sha-256;pdf-text"}});
  const deck=admitAcceptedMediaAsset({asset:{...base("application/vnd.openxmlformats-officedocument.presentationml.presentation"),accessibleTextRef:"ni:///sha-256;deck-text"}});
  assert.equal(pdf.distribution,undefined);
  assert.ok(deck.asset.mimeType.includes("presentation"));
});
test("unsafe paths, wrong media types, missing sanitation or alt text are never accepted",()=>{
  assert.throws(()=>admitAcceptedMediaAsset({asset:{...base("image/png"),relativePath:"../escape",width:100,height:100,altText:"x"}}),/clean relative/u);
  assert.throws(()=>admitAcceptedMediaAsset({asset:{...base("text/html"),metadataSanitized:true}}),/MIME/u);
  assert.throws(()=>admitAcceptedMediaAsset({asset:{...base("image/png"),width:100,height:100,metadataSanitized:false,altText:"x"}}),/metadataSanitized/u);
  assert.throws(()=>admitAcceptedMediaAsset({asset:{...base("image/png"),width:100,height:100}}),/altText/u);
});
