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
 for(const id of requiredCharacters){
   const resource=sourceBySlug.get(id),binding=mediaBindings.characters[id];
   if(!resource||resource.type!=='being'||!names.has(id)){missing.push({id,reason:'character-not-in-story-bible'});continue}
   if(!plain(binding)||!ni(binding.visualRef)||!ni(binding.voiceRef)||!ni(binding.rightsRef)||
     binding.sourceIdentity!==resource.contentIdentity){
     missing.push({id,reason:'visual-voice-rights-or-source-binding-not-accepted'});continue
   }
   characters.push({id,name:resource.name??names.get(id),synthetic:true,
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
 const proposed=compileNarrativeEpisode({source,series:{id:world.work,characters,locations},
   episode,receiver,openedAt});
 return Object.freeze({type:'ParacosmVideoProjection',status:'PROPOSED_NOT_ADMITTED',
   world:{...world,textSlug,textIdentity:sourceBySlug.get(textSlug).contentIdentity},
   assayRef:assay.reportRef,proposal:proposed,
   warning:'Derived view only. StoryBible, asset IDs and source checks are externally asserted here; a media allocation, expense, publication and public receiver remain separate duties.'});
}
