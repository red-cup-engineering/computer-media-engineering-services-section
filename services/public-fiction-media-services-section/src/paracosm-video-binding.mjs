/**
 * Source boundary: turn one ALREADY DERIVED FeltOS paracosm StoryBible v1 and
 * typed source-identity reading into the existing neutral episode compiler.
 *
 * Only canon data supplies beings and places; source references and actual
 * approved performance assets are separate. This is NOT another story bible,
 * a new world graph, an admission engine, or a generator.
 */
import {compileNarrativeEpisode,normalizeNarrativeSource} from './microdrama-production.mjs';
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const requireText=(x,what)=>{if(typeof x!=='string'||!x.trim())throw new TypeError(what+' must be nonempty');return x;};
const ni=x=>typeof x==='string'&&/^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u.test(x);
const held=(reason,details={})=>Object.freeze({type:'ParacosmVideoProjection',status:'HELD_SOURCE_OR_ASSETS',reason,...details});
const unique=(a,what)=>{if(new Set(a).size!==a.length)throw new TypeError('duplicate '+what)};
export function projectParacosmVideoProduction({source,storyBible,derivation,assay,mediaBindings,episode,receiver,openedAt}={}){
 const input=normalizeNarrativeSource(source);
 if(!input.paracosm)throw new TypeError('source must bind a paracosm work');
 const world=input.paracosm;
 if(!world.canonDigest)return held('source-canon-digest-not-received',{
   sourceRef:world.worldRef,work:world.work,sourceRevision:world.sourceRevision});
 if(!ni(world.canonDigest))throw new TypeError('source world uses noncanonical NI identity');
 if(!plain(derivation)||derivation.type!=='ParacosmStoryBibleDerivation'||derivation.version!==2||
   !Array.isArray(derivation.resourceIdentities))
   return held('feltos-derived-canon-and-source-map-unavailable',{world});
 if(derivation.canonIdentityVersion!=='paracosm-content-v2')
   return held('paracosm-source-identity-profile-not-received',{world,
     observedProfile:derivation.canonIdentityVersion??null});
 if(derivation.work!==world.work||derivation.canonDigest!==world.canonDigest)
   return held('source-revision-and-derived-world-disagree',{expected:world.canonDigest,observed:derivation.canonDigest??null});
 if(!plain(assay)||assay.state!=='checked-without-errors'||!ni(assay.canonDigest)||
    assay.canonDigest!==world.canonDigest||typeof assay.reportRef!=='string'||!assay.reportRef.trim())
   return held('independent-paracosm-check-not-received',{world});
 if(storyBible?.type!=='StoryBible'||storyBible.version!==1||
    !Array.isArray(storyBible.signature?.characters))
   throw new TypeError('existing FeltOS StoryBible v1 projection required');
 if(!plain(episode)||!Array.isArray(episode.shots)||!episode.shots.length)
   throw new TypeError('episode shots required');
 if(!plain(mediaBindings)||!plain(mediaBindings.characters)||!plain(mediaBindings.locations))
   return held('accepted-asset-binding-record-unavailable',{world});
 const sourceBySlug=new Map();
 for(const record of derivation.resourceIdentities){
   if(!plain(record))throw new TypeError('invalid derived source resource');
   const slug=requireText(record.slug,'resource slug');
   if(sourceBySlug.has(slug))throw new TypeError('ambiguous source resource slug: '+slug);
   if(!ni(record.contentIdentity)||!ni(record.bodyContentId))
     return held('source-resource-identity-unwitnessed',{slug});
   sourceBySlug.set(slug,record);
 }
 const textSlug=requireText(episode.sourceTextSlug,'canonical episode text slug');
 if(sourceBySlug.get(textSlug)?.type!=='text')
   return held('episode-text-not-in-accepted-paracosm',{slug:textSlug});
 const names=new Map(storyBible.signature.characters.map(v=>[v.id,v.name]));
 const requiredCharacters=[...new Set(episode.shots.flatMap(shot=>shot.characterIds??[]))];
 const requiredPlaces=[...new Set(episode.shots.map(shot=>shot.locationId))];
 unique(requiredCharacters,'episode cast');
 const characters=[],locations=[],missing=[];
 const spokenByExternalVoice=new Set(episode.shots
   .filter(shot=>shot.audioMode!=='embedded-performance')
   .flatMap(shot=>(shot.dialogue??[]).map(line=>line.speakerId)));
 for(const id of requiredCharacters){
   const resource=sourceBySlug.get(id),binding=mediaBindings.characters[id];
   if(!resource||resource.type!=='being'||!names.has(id)){missing.push({id,reason:'character-not-in-story-bible'});continue}
   if(!plain(binding)||!ni(binding.visualRef)||!ni(binding.voiceRef)||!ni(binding.rightsRef)||
     binding.sourceIdentity!==resource.contentIdentity){
     missing.push({id,reason:'visual-voice-rights-or-source-binding-not-accepted'});continue
   }
   // A character's canonical identity does not determine visual production
   // technique or grant synthetic voice rights. The asset binding must say.
   const performance=binding.performance;
   if(!['synthetic','recorded','puppet','abstract-animation','nonvisual'].includes(performance)){
     missing.push({id,reason:'character-performance-mode-not-received'});continue;
   }
   if(binding.voicePerformance!==undefined &&
      !['synthetic','recorded'].includes(binding.voicePerformance)){
     missing.push({id,reason:'character-voice-performance-mode-not-received'});continue;
   }
   if(spokenByExternalVoice.has(id) &&
      !['synthetic','recorded'].includes(binding.voicePerformance??(
        ['synthetic','recorded'].includes(performance)?performance:null))){
     missing.push({id,reason:'speaking-character-voice-performance-mode-not-received'});continue;
   }
   characters.push({id,name:resource.name??names.get(id),performance,
     ...(binding.voicePerformance===undefined?{}:{voicePerformance:binding.voicePerformance}),
     visualRef:binding.visualRef,voiceRef:binding.voiceRef});
 }
 for(const id of requiredPlaces){
   const resource=sourceBySlug.get(id),binding=mediaBindings.locations[id];
   if(!resource||resource.type!=='place'){missing.push({id,reason:'location-not-in-paracosm'});continue}
   if(!plain(binding)||!ni(binding.referenceRef)||!ni(binding.rightsRef)||
     binding.sourceIdentity!==resource.contentIdentity){
     missing.push({id,reason:'location-reference-rights-or-source-binding-not-accepted'});continue
   }
   locations.push({id,referenceRef:binding.referenceRef});
 }
 if(missing.length)return held('canonical-resources-not-yet-bound-to-accepted-media',{
   world,missing:Object.freeze(missing)});
 // A source-authored longer cartoon take must not inherit the short video
 // provider's eight-second default by accident. Only accepted 2D/abstract
 // cast in an extended shot can select a longer original compiler bound.
 // This is a held production proposal, not evidence of an installed renderer.
 const maxShotSeconds=episode.maxShotSeconds??8;
 if(!Number.isSafeInteger(maxShotSeconds)||maxShotSeconds<1||maxShotSeconds>30)
   throw new TypeError('source-authored maxShotSeconds must be 1..30');
 if(maxShotSeconds>8){
   const modeById=new Map(characters.map(c=>[c.id,c.performance]));
   for(const shot of episode.shots){
     if(!Number.isSafeInteger(shot.frames)||shot.frames<=8*(episode.fps??30))continue;
     const modes=Array.isArray(shot.characterIds)
       ? shot.characterIds.map(id=>modeById.get(id)) : [];
     if(!modes.some(mode=>['puppet','abstract-animation'].includes(mode))||
        !modes.every(mode=>['puppet','abstract-animation','nonvisual'].includes(mode)))
       return held('extended-shot-requires-source-bound-2d-performance',{
         world,shotId:shot.id,maxShotSeconds});
   }
 }
 const proposed=compileNarrativeEpisode({source,series:{id:world.work,characters,locations},
   episode,receiver,openedAt,maxShotSeconds});
 return Object.freeze({type:'ParacosmVideoProjection',status:'PROPOSED_NOT_ADMITTED',
   world:{...world,textSlug,textIdentity:sourceBySlug.get(textSlug).contentIdentity},
   assayRef:assay.reportRef,proposal:proposed,
   warning:'Derived view only. StoryBible, asset IDs and source checks are externally asserted here; a media allocation, expense, publication and public receiver remain separate duties.'});
}
