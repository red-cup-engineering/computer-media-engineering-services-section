/**
 * Read-only agent-audience projection of a source-owned microdrama *draft*.
 * No new world, schema, authority, canon digest, persistent view store,
 * reader tracking, interactive write action, inference call or publication.
 * Narrative nodes and source claims are projected from the existing production
 * input. Dialogue belongs to fictional characters, not historical world facts.
 */
const isObj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const requireText = (x,label) => {
  if(typeof x!=='string'||!x.trim()||x.length>20000) throw new TypeError(label+' needs bounded text');
  return x;
};
const slug = (x,label) => {
  requireText(x,label);
  if(!/^[a-z0-9][a-z0-9-]{0,79}$/u.test(x)) throw new TypeError(label+' must be a canonical slug');
  return x;
};
const number = (x,label,min=0,max=10000000) => {
  if(!Number.isSafeInteger(x)||x<min||x>max)throw new TypeError(label+' must be a bounded integer');
  return x;
};
const unique = (xs,label) => {
  if(new Set(xs).size!==xs.length)throw new TypeError('duplicate '+label);
};
const ms = (frame, fps) => Math.round(frame*1000/fps);

/** Return a copy of narrative events from their original source slots, never author new facts. */
export function projectAgentEpisodeReading(input,{focus=null,after=null,limit=20,beat=null}={}){
  if(!isObj(input)||!isObj(input.episode)||!isObj(input.source))
    throw new TypeError('source-owned microdrama episode required');
  const {source,episode} = input;
  const paracosm=source.type==='NarrativeSource'&&source.paracosm?.kind==='ParacosmWorkRef';
  const development=source.type==='DevelopmentScreenplay'&&input.developmentState==='unapproved-text-audition'&&
    /^sha256:[a-f0-9]{64}$/u.test(source.sourceRevision)&&
    typeof source.originRef==='string'&&source.originRef.trim();
  if(!paracosm&&!development)throw new TypeError('expected paracosm source or explicit exact-hash unapproved development screenplay');
  const work=slug(paracosm?source.paracosm.work:source.id,'work slug');
  const sourceRevision=requireText(paracosm?source.paracosm.sourceRevision:source.sourceRevision,'source revision');
  const textSlug=paracosm?slug(episode.sourceTextSlug,'source text slug'):null;
  const fps=number(episode.fps,'fps',1,120);
  if(!Array.isArray(episode.shots)||!episode.shots.length||episode.shots.length>200)
    throw new TypeError('1–200 ordered shots required');
  if(paracosm&&(!Array.isArray(episode.beats)||!episode.beats.length||episode.beats.length>100))
    throw new TypeError('ordered causal beats required');
  if(development&&episode.beats!==undefined)throw new TypeError('a developmental scene grouping cannot claim a received causal graph');
  const beats=new Map();
  for(const b of (paracosm?episode.beats:[])){
    if(!isObj(b))throw new TypeError('beat must be an object');
    const id=slug(b.id,'beat id');
    const cause=slug(b.causeBeatId,'beat cause');
    requireText(b.action,'beat action'); requireText(b.consequence,'beat consequence');
    if(beats.has(id)||id===cause)throw new TypeError('duplicate or self-caused beat '+id);
    if(cause!=='seed'&&!beats.has(cause))throw new TypeError('unresolved or forward cause '+id+' -> '+cause);
    if(b.kind==='cliffhanger')requireText(b.question,'cliffhanger question');
    beats.set(id,Object.freeze({
      id,causeBeatId:cause,action:b.action,consequence:b.consequence,
      ...(b.kind?{kind:requireText(b.kind,'beat kind')}:{}),
      ...(b.question?{question:requireText(b.question,'beat question')}:{}),
    }));
  }
  const ids=[],appearances=new Map(),shots=[];
  let cursor=0;
  for(const raw of episode.shots){
    if(!isObj(raw))throw new TypeError('shot must be an object');
    const id=slug(raw.id,'shot id'), beatId=slug(raw.beatId,'shot beat');
    // Preserve a source-authored dramatic scene across separately framed shots.
    const sceneId=raw.sceneId===undefined?null:slug(raw.sceneId,'source scene id');
    if(paracosm&&!beats.has(beatId))throw new TypeError('shot references missing causal beat '+beatId);
    const location=slug(raw.locationId,'location slug');
    if(!Array.isArray(raw.characterIds))throw new TypeError('shot cast must be an array');
    const cast=raw.characterIds.map(c=>slug(c,'character slug'));
    unique(cast,'shot characters');
    const length=number(raw.frames,'shot frames',1,36000);
    if(!Array.isArray(raw.dialogue))throw new TypeError('shot dialogue must be an array');
    const utterances=raw.dialogue.map((d,index)=>{
      if(!isObj(d))throw new TypeError('dialogue must be an object');
      const who=slug(d.speakerId,'speaker id');
      if(!cast.includes(who))throw new TypeError('speaker not present in shot '+id);
      const from=number(d.startFrame,'dialogue start',0,length-1);
      const end=number(d.endFrame,'dialogue end',from+1,length);
      return Object.freeze({speakerId:who,text:requireText(d.text,'dialogue text'),
        localStartFrame:from,localEndFrame:end,startMs:ms(cursor+from,fps),endMs:ms(cursor+end,fps),
        position:index});
    });
    for(const who of cast){
      const seen=appearances.get(who)??[];
      seen.push(id);
      appearances.set(who,seen);
    }
    requireText(raw.action,'shot action');
    requireText(raw.camera,'shot camera');
    shots.push(Object.freeze({id,beatId,...(sceneId===null?{}:{sceneId}),locationId:location,characterIds:cast,
      action:raw.action,camera:raw.camera,
      startFrame:cursor,endFrame:cursor+length,
      startMs:ms(cursor,fps),endMs:ms(cursor+length,fps),dialogue:utterances
    }));
    cursor+=length;
    ids.push(id);
  }
  unique(ids,'shot IDs');
  number(cursor,'total frames',1,120*36000);
  if(focus!==null)slug(focus,'focus character');
  if(after!==null)slug(after,'cursor');
  if(beat!==null)slug(beat,'beat selector');
  number(limit,'page limit',1,50);
  if(focus!==null&&!appearances.has(focus))throw new RangeError('unknown on-screen focus character '+focus);
  if(beat!==null&&!(paracosm?beats.has(beat):shots.some(s=>s.beatId===beat)))
    throw new RangeError((paracosm?'unknown causal beat ':'unknown source act group ')+beat);
  if(after!==null&&!ids.includes(after))throw new RangeError('unknown shot cursor '+after);
  const eligible=shots.filter(s=>(focus===null||s.characterIds.includes(focus))&&
    (beat===null||s.beatId===beat));
  const seenAfter=after===null?-1:shots.findIndex(s=>s.id===after);
  const filtered=eligible.filter(s=>shots.findIndex(original=>original.id===s.id)>seenAfter);
  const page=filtered.slice(0,limit);
  const remaining=filtered.length>page.length;
  // A reader sees only the causal consequences of beats already completed by
  // the current timeline position. A first-page fetch must not spoil a finale.
  // Explicit focus/beat queries are opt-in nonsequential views: still reveal
  // no causal beat whose own final shot is later than the returned page.
  const visibleThrough=page.length
    ? shots.findIndex(shot=>shot.id===page.at(-1).id)
    : seenAfter;
  const visibleShots=shots.slice(0,visibleThrough+1);
  const lastShotByBeat=new Map();
  for(let i=0;i<shots.length;i++)lastShotByBeat.set(shots[i].beatId,i);
  const causal=[...beats.values()].filter(b=>
    lastShotByBeat.get(b.id)<=visibleThrough &&
    ((focus===null&&beat===null)||page.some(s=>s.beatId===b.id))
  );
  const visibleCharacters=[...new Set(visibleShots.flatMap(s=>s.characterIds))].sort();
  return Object.freeze({
    type:'AgentEpisodeReading',
    status:'PROVISIONAL_ARTISTIC_DEVELOPMENT',
    source:{work,sourceTextSlug:textSlug,sourceRevision,
      sourceKind:paracosm?'paracosm-work-preview':'exact-hash-development-script',
      worldRef:paracosm?requireText(source.paracosm.worldRef,'world ref'):null,
      canon:paracosm?requireText(source.paracosm.canon,'canon selection'):null,
      // Claimed NI or SHA never independently attests editorial acceptance.
      canonDigestClaim:paracosm?(source.paracosm.canonDigest??null):null,
      ...(development?{originRef:requireText(source.originRef,'source origin')}:{} )},
    media:{type:paracosm?'scene-text-and-causal-observation':'development-scenes-no-causal-certification',
      fps,totalFrames:cursor,durationMs:ms(cursor,fps)},
    availableFocusCharacters:visibleCharacters,
    viewpointSemantics:'focus selects witnessed scene appearances; it never fabricates internal thoughts. Available characters and completed causal beats follow the revealed episode prefix, not future scenes.',
    traversal:{focus,after,beat,limit,hasMore:remaining,nextAfter:remaining?page.at(-1)?.id:null},
    causalBeats:causal,
    page:page.map(s=>({ ...s })),
    declaredContradictions:[],
    declarationNote:paracosm?'No contradiction links are asserted by this *production input*. Do not infer that different dialogue lines constitute formal contradictions.':'The screenplay provides only timed scenes and editorial act labels; no source-derived causal graph, formal contradiction, received world NI or verified author identity is asserted.',
    boundaries:'Read-only draft projection. Not a ratified canon, an AI writers-room decision, an interactive game, a published feed, or evidence of actual audience reception.'
  });
}
