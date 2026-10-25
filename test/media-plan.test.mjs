import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ASPECTS, ASSET_ROLES, LINK_RELS, MOTIONS, MUSIC_PROFILES, STYLES, TARGETS, VISUAL_MODES, VOICES,
  admitMediaPlan, canonicalJson, hexFromNi, mediaPlanId, niOf, svgIsSelfContained,
} from '../src/media-plan.mjs';
import {
  MEDIA_PLAN_CONTRACT, captionCues, compileDeterministicRenderJob, compileFlowOrders, compileMediaPlan, compilePublication,
  endCardSvg, renderSrt, verifyCompilationReceipt,
} from '../src/media-plan-compile.mjs';
import { mediaPlanFromFlowOrderLine, mediaPlanFromNarrativeEpisode } from '../src/media-plan-migrate.mjs';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const jsonl = (name) => fixture(name).split('\n').filter(Boolean).map((l) => JSON.parse(l));
const episode = JSON.parse(fixture('unassigned-floor-episode-001.json'));
// Real queued Flow orders, as read from the host's orders/pending and orders/review queues (read-only).
const iaci = jsonl('flow-order.short-pace-yourself-what-is-iaci.jsonl')[0];
const turntide = jsonl('flow-order.short-turntide-islands.jsonl')[0];
const miami = jsonl('flow-order.review-miami-misconception.jsonl')[0];
// Real MediaArtifactWorkCompletion journal lines from generations.jsonl.
const completions = jsonl('flow-generations.selected.jsonl').filter((l) => l.type === 'MediaArtifactWorkCompletion');

// A paper link for the fixture only: 10.5555 is Crossref's reserved test prefix, not a real paper.
const paperLink = { rel: 'paper', doi: '10.5555/climate-place-by-place.test', url: 'https://example.org/papers/new-york-city-climate', identity: niOf('paper-bytes-for-test') };

const episodePlan = (extra = {}) => mediaPlanFromNarrativeEpisode(episode, {
  consumer: 'unassigned-floor-serial', title: 'The Second Exit', ...extra,
});

test('the schema file and the module agree on every enumerated value', () => {
  const schema = JSON.parse(readFileSync(new URL('../data/schema/media-plan.schema.json', import.meta.url), 'utf8'));
  assert.deepEqual(schema.properties.aspect.enum, [...ASPECTS]);
  assert.deepEqual(schema.properties.render.properties.targets.items.enum, [...TARGETS]);
  assert.deepEqual(schema.properties.render.properties.style.enum, [...STYLES]);
  assert.deepEqual(schema.properties.render.properties.motion.enum, [...MOTIONS]);
  assert.deepEqual(schema.properties.audio.properties.music.properties.profile.enum, [...MUSIC_PROFILES]);
  assert.deepEqual(schema.properties.audio.properties.dialogue.properties.voice.enum, [...VOICES]);
  assert.deepEqual(schema.$defs.visual.properties.mode.enum, [...VISUAL_MODES]);
  assert.deepEqual(schema.$defs.visual.properties.assets.items.properties.role.enum, [...ASSET_ROLES]);
  assert.deepEqual(schema.$defs.link.properties.rel.enum, [...LINK_RELS]);
  const receiptSchema = JSON.parse(readFileSync(new URL('../data/schema/media-plan-compilation-receipt.schema.json', import.meta.url), 'utf8'));
  assert.equal(receiptSchema.properties.contract.const, MEDIA_PLAN_CONTRACT.id);
  assert.equal(MEDIA_PLAN_CONTRACT.effects, 'none');
});

test('the real Unassigned Floor episode migrates into an admitted plan that keeps its timing, cast and beats', () => {
  const admitted = admitMediaPlan(episodePlan());
  assert.equal(admitted.ok, true, JSON.stringify(admitted.refusals));
  const { plan } = admitted;
  const shots = plan.scenes.flatMap((s) => s.shots);
  assert.equal(shots.length, 8);
  assert.equal(shots.reduce((n, s) => n + s.frames, 0) / plan.fps, 48);
  assert.deepEqual(plan.characters.map((c) => c.id), ['latch', 'sift', 'else', 'other-latch']);
  assert.equal(plan.beats.length, 4);
  assert.equal(plan.source.sourceRevision, 'git:7fcfb375c9d1230f94bfb8b639f5cab7eae5937b');
  assert.equal(plan.scenes.length, 4, 'one scene per run of shots sharing a beat');
});

test('plan identity is the content address of the default-filled plan, independent of key order', () => {
  const a = admitMediaPlan(episodePlan()).plan;
  const reordered = JSON.parse(JSON.stringify(episodePlan(), (_, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).reverse()) : v)));
  const b = admitMediaPlan(reordered).plan;
  assert.equal(mediaPlanId(a), mediaPlanId(b));
  assert.match(mediaPlanId(a), /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u);
  assert.equal(canonicalJson({ b: 1, a: [2, { d: 1, c: 2 }] }), '{"a":[2,{"c":2,"d":1}],"b":1}');
});

test('admission refuses with stable codes, all at once, and never throws on plan content', () => {
  const bad = episodePlan();
  bad.scenes[0].shots[0].dialogue[0].speakerId = 'unseen';
  bad.scenes[0].shots[1].dialogue[0].endFrame = 999;
  bad.scenes[1].shots[0].id = bad.scenes[0].shots[0].id;
  bad.source.sourceRevision = 'main';
  bad.source.documents = [{ id: 'orphan', role: 'paper' }];
  bad.publication = { requirePaperLink: true };
  bad.scenes[1].shots[1].visual = { assets: [{ id: 'x', role: 'overlay', svg: '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>' }] };
  const out = admitMediaPlan(bad);
  assert.equal(out.ok, false);
  const codes = new Set(out.refusals.map((r) => r.code));
  for (const code of ['SPEAKER_NOT_IN_CAST', 'CUE_OUTSIDE_SHOT', 'DUPLICATE_ID', 'SOURCE_REVISION_INEXACT', 'SOURCE_DOCUMENT_UNADDRESSED', 'PAPER_LINK_MISSING', 'SVG_NOT_SELF_CONTAINED']) assert.ok(codes.has(code), `missing ${code}: ${[...codes]}`);
  assert.ok(out.refusals.every((r) => typeof r.path === 'string' && r.message));
  assert.equal(admitMediaPlan(null).refusals[0].code, 'PLAN_NOT_OBJECT');
  assert.equal(admitMediaPlan({}).ok, false);
});

test('inline SVG slots refuse scripts, foreign content and external references', () => {
  assert.equal(svgIsSelfContained('<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>'), true);
  for (const bad of ['<svg><script>1</script></svg>', '<svg><foreignObject/></svg>', '<svg onload="x()"></svg>', '<svg><image href="https://evil.example/x.png"/></svg>', '<svg><rect fill="url(https://evil.example/x)"/></svg>', '<!DOCTYPE svg><svg/>', 'not svg']) assert.equal(svgIsSelfContained(bad), false, bad);
});

// ------------------------------------------------------------------ Flow

for (const [name, line] of [['pace-yourself-what-is-iaci', iaci], ['turntide-islands', turntide]]) {
  test(`real queued Flow order (${name}) round-trips: plan -> orders reproduces the executable fields`, () => {
    const candidate = mediaPlanFromFlowOrderLine(line);
    const out = compileMediaPlan(candidate, { model: line.model });
    assert.equal(out.ok, true, JSON.stringify(out.refusals));
    const [order] = out.receipt.outputs.flow.orders;
    for (const key of ['consumer', 'medium', 'model', 'aspect', 'count', 'prompt', 'destination', 'purpose', 'parentVideoId']) assert.deepEqual(order[key], line[key], key);
    assert.deepEqual(order.sources, line.sources);
    assert.equal(order.promptAssembly.claim, line.promptAssembly.claim);
    assert.equal(order.promptAssembly.revision, line.promptAssembly.revision);
    assert.match(order.orderId, /^[a-f0-9]{64}$/u);
    assert.equal(hexFromNi(line.sources[0].identity), line.promptAssembly.reportSha256, 'the lesson report NI is the report sha256 the line already carried');
  });
}

test('a prompt that asks the video model to draw labelled text is flagged, not silently queued (real review-queue order)', () => {
  const out = compileMediaPlan(mediaPlanFromFlowOrderLine(miami), { model: miami.model });
  assert.equal(out.ok, true);
  assert.deepEqual(out.receipt.warnings.map((w) => w.code), ['GENERATIVE_TEXT_REQUEST']);
});

test('a real clean order does not raise the text warning', () => {
  const out = compileMediaPlan(mediaPlanFromFlowOrderLine(iaci), { model: iaci.model });
  assert.deepEqual(out.receipt.warnings, []);
});

test('accepted generations already on file satisfy a shot: no second order, no second spend (real journal lines)', () => {
  const nyc = completions.find((c) => c.principal === 'education-short--climate-place-by-place--new-york-city--mechanism');
  assert.ok(nyc, 'fixture has the real New York City completion');
  assert.equal(niOf(nyc.promptText), nyc.prompt, 'the journal addresses the prompt by the sha-256 of its text');
  const line = { consumer: nyc.principal, medium: 'video', model: nyc.resource.model, aspect: nyc.resource.aspect, count: 1, prompt: nyc.promptText };
  const plan = admitMediaPlan(mediaPlanFromFlowOrderLine(line)).plan;
  const again = compileFlowOrders(plan, { model: nyc.resource.model, completions });
  assert.equal(again.orders.length, 0);
  assert.equal(again.satisfied[0].reason, 'ACCEPTED_GENERATION_ON_FILE');
  assert.equal(again.satisfied[0].generations[0].completion, nyc.id);
  assert.equal(again.satisfied[0].generations[0].output, nyc.output.identity);
  assert.equal(again.refusals.length, 0, 'everything satisfied is idempotence, not an error');
  // The same plan with an empty journal orders it.
  assert.equal(compileFlowOrders(plan, { model: nyc.resource.model, completions: [] }).orders.length, 1);
  // A journal for another aspect does not satisfy it.
  assert.equal(compileFlowOrders(plan, { model: nyc.resource.model, completions: [{ ...nyc, resource: { ...nyc.resource, aspect: '16:9' } }] }).orders.length, 1);
});

test('real multi-shot Flow micro-drama journal (duluth-drama-two-years) is the same shape the plan addresses', () => {
  const duluth = completions.filter((c) => c.principal === 'duluth-drama-two-years');
  assert.ok(duluth.length >= 5);
  for (const c of duluth) assert.equal(niOf(c.promptText), c.prompt);
  const prompts = new Set(duluth.map((c) => c.prompt));
  assert.ok(prompts.size < duluth.length, 'regenerated takes share a prompt address: the plan can see they are one shot');
});

test('Flow compile refuses what the text-to-video wire client cannot do', () => {
  const plan = episodePlan();
  plan.scenes[0].shots[0].visual = { mode: 'generative', referenceImages: [{ label: 'latch', kind: 'character', identity: niOf('ref') }] };
  plan.scenes[0].shots[1].frames = 300;
  const out = compileMediaPlan(plan, { targets: ['flow'] });
  assert.equal(out.ok, false);
  assert.deepEqual(out.refusals.map((r) => r.code).sort(), ['REFERENCE_CONDITIONING_UNSUPPORTED', 'SHOT_EXCEEDS_CLIP_LENGTH']);
});

test('deterministic-only plans have nothing for Flow to generate', () => {
  const plan = episodePlan();
  for (const s of plan.scenes) for (const shot of s.shots) shot.visual = { mode: 'deterministic' };
  const out = compileMediaPlan(plan, { targets: ['flow'] });
  assert.equal(out.refusals[0].code, 'NOTHING_TO_ORDER');
});

// ------------------------------------------------------------------ deterministic

test('the episode compiles to a deterministic render job with conserved frames, shots and captions', () => {
  const out = compileMediaPlan(episodePlan(), { targets: ['deterministic'] });
  assert.equal(out.ok, true, JSON.stringify(out.refusals));
  const job = out.receipt.outputs.deterministic;
  assert.equal(job.renderer, 'procedural-previs/1');
  assert.equal(job.totalFrames, 1440);
  assert.equal(job.input.episode.shots.length, 8);
  assert.equal(job.input.episode.shots[0].id, 'corridor-sweep');
  assert.equal(job.input.source.type, 'MediaPlanSource');
  assert.equal(job.captions.cues.length, 11);
  assert.match(job.captions.srt, /^1\n00:00:00,333 --> 00:00:05,000\nLATCH: They've scheduled the room for forgetting\.$/mu);
  assert.ok(job.captions.vtt.startsWith('WEBVTT'));
  assert.deepEqual(out.receipt.checks.map((c) => c.ok), out.receipt.checks.map(() => true));
});

test('timing that cannot be represented at the output frame rate is refused, not drifted', () => {
  const plan = episodePlan();
  plan.scenes[0].shots[0].frames = 181;
  plan.scenes[0].shots[0].dialogue[0].endFrame = 150;
  const out = compileMediaPlan(plan, { targets: ['deterministic'] });
  assert.equal(out.refusals[0].code, 'TIMING_DRIFT');
});

test('SVG frame and overlay slots reach the render job as shot assets, hashed; an unresolved address is refused', () => {
  const overlay = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 960"><rect x="40" y="60" width="200" height="40" fill="#99d1be"/><text x="50" y="88">SSP5-8.5 is conditional</text></svg>';
  const plan = episodePlan();
  plan.scenes[0].shots[0].visual = { mode: 'deterministic', assets: [{ id: 'scenario-label', role: 'overlay', svg: overlay, producer: { service: 'deterministic-report-graphic-service', spec: 'urn:example:test' } }] };
  const out = compileMediaPlan(plan, { targets: ['deterministic'] });
  assert.equal(out.ok, true, JSON.stringify(out.refusals));
  const [asset] = out.receipt.outputs.deterministic.assets;
  assert.deepEqual([asset.shotId, asset.role, asset.mediaType], ['corridor-sweep', 'overlay', 'image/svg+xml']);
  assert.match(asset.sha256, /^[a-f0-9]{64}$/u);
  plan.scenes[0].shots[0].visual = { mode: 'deterministic', assets: [{ id: 'by-address', role: 'frame', identity: niOf(overlay) }] };
  assert.equal(compileMediaPlan(plan, { targets: ['deterministic'] }).refusals[0].code, 'ASSET_UNRESOLVED');
  // identity must match inline bytes
  plan.scenes[0].shots[0].visual = { assets: [{ id: 'liar', role: 'frame', svg: overlay, identity: niOf('other') }] };
  assert.equal(admitMediaPlan(plan).refusals.some((r) => r.code === 'ASSET_IDENTITY_MISMATCH'), true);
});

// ------------------------------------------------------------------ provenance, paper link, end card

test('source provenance and the paper link reach the order, the description and the end card', () => {
  const nyc = completions.find((c) => c.principal === 'education-short--climate-place-by-place--new-york-city--mechanism');
  const base = mediaPlanFromFlowOrderLine({ consumer: nyc.principal, medium: 'video', model: nyc.resource.model, aspect: nyc.resource.aspect, count: 1, prompt: nyc.promptText, destination: 'https://www.youtube.com/channel/UCexample' });
  const plan = {
    ...base,
    render: { targets: ['flow', 'deterministic'] },
    source: { ...base.source, documents: [...base.source.documents, { id: 'place-paper', role: 'research-paper', identity: paperLink.identity, url: paperLink.url, doi: paperLink.doi, title: 'New York City: Climate History and Outlook', citation: 'Test fixture citation' }] },
    links: [{ rel: 'paper', documentId: 'place-paper' }],
    endCard: { seconds: 3, headline: 'Read the paper' },
    publication: { title: 'New York City climate', description: 'How the city\'s climate record and outlook fit together.', requirePaperLink: true, tags: ['climate'], aiDisclosure: 'Contains AI-generated video.' },
  };
  const out = compileMediaPlan(plan, { model: nyc.resource.model });
  assert.equal(out.ok, true, JSON.stringify(out.refusals));
  const { flow, deterministic, publication } = out.receipt.outputs;
  assert.ok(flow.orders[0].sources.some((s) => s.identity === paperLink.identity && s.role === 'research-paper'), 'paper is a content-addressed source on the order');
  assert.ok(publication.description.includes(`Read the paper: ${paperLink.url}`));
  assert.ok(publication.description.includes(`Content address: ${paperLink.identity}`));
  assert.ok(publication.description.includes('Test fixture citation'));
  assert.ok(publication.description.includes('Contains AI-generated video.'));
  const card = deterministic.assets.find((a) => a.assetId === 'end-card-frame');
  assert.ok([...card.svg.matchAll(/>([^<]+)<\/text>/gu)].map((m) => m[1]).join('').includes('example.org/papers/new-york-city-climate'), 'the link is wrapped, never cut');
  assert.ok(card.svg.includes('doi:10.5555/climate-place-by-place.test'));
  assert.equal(deterministic.input.episode.shots.at(-1).id, 'end-card');
  assert.equal(deterministic.totalFrames, 240 + 90);
  assert.ok(out.receipt.checks.some((c) => c.name === 'paper-link-on-end-card' && c.ok));
  // A DOI alone still gives a viewer-facing link.
  const doiOnly = { ...plan, links: [{ rel: 'paper', doi: paperLink.doi }] };
  assert.ok(compileMediaPlan(doiOnly, { model: nyc.resource.model }).receipt.outputs.publication.description.includes('https://doi.org/10.5555/climate-place-by-place.test'));
  // Requiring a paper link and giving none is refused before any output exists.
  assert.equal(compileMediaPlan({ ...plan, links: [] }, { model: nyc.resource.model }).refusals.some((r) => r.code === 'PAPER_LINK_MISSING' || r.code === 'ENDCARD_LINK_MISSING'), true);
});

test('a link too long for the end card is refused, never silently cut', () => {
  const plan = { ...episodePlan(), links: [{ rel: 'paper', url: `https://example.org/${'a'.repeat(200)}` }], endCard: { seconds: 2 } };
  assert.equal(compileMediaPlan(plan, { targets: ['deterministic'] }).refusals[0].code, 'ENDCARD_LINK_TOO_LONG');
});

test('the end card and caption renderers are pure and escape their text', () => {
  const plan = admitMediaPlan({ ...episodePlan(), links: [{ rel: 'paper', url: 'https://example.org/a?x=1&y=2' }], endCard: { headline: 'A <b> & B' } }).plan;
  const svg = endCardSvg(plan);
  assert.equal(svg, endCardSvg(plan));
  assert.ok(!svg.includes('<b>') && svg.includes('&lt;b&gt;') && svg.includes('x=1&amp;y=2'));
  assert.ok(svgIsSelfContained(svg));
  assert.equal(renderSrt([]), '');
  assert.equal(captionCues(plan).length, 11);
});

// ------------------------------------------------------------------ Hoare contract

test('the contract: no effects, deterministic, receipt names plan and outputs, tampering is detected', () => {
  const input = episodePlan();
  const a = compileMediaPlan(input);
  const b = compileMediaPlan(structuredClone(input));
  assert.equal(a.ok, true);
  assert.equal(canonicalJson(a), canonicalJson(b), 'same plan, same bytes');
  assert.equal(a.receipt.effects, 'none');
  assert.equal(a.receipt.planId, mediaPlanId(admitMediaPlan(input).plan));
  assert.equal(a.receipt.outputId, niOf(canonicalJson(a.receipt.outputs)));
  assert.equal(verifyCompilationReceipt(input, a.receipt).ok, true);
  const changed = structuredClone(input);
  changed.scenes[0].shots[0].action = 'A different action';
  assert.equal(verifyCompilationReceipt(changed, a.receipt).ok, false);
  const swapped = structuredClone(a.receipt);
  swapped.outputs.flow.orders[0] = { ...swapped.outputs.flow.orders[0], prompt: 'swapped after the fact' };
  assert.equal(verifyCompilationReceipt(input, swapped).ok, false, 'carried outputs must be the outputs named');
  const forged = { ...a.receipt, outputId: niOf('forged') };
  assert.equal(verifyCompilationReceipt(input, forged).ok, false);
  assert.equal(verifyCompilationReceipt(input, { type: 'other' }).ok, false);
  assert.equal(compileMediaPlan(input, { targets: ['telepathy'] }).refusals[0].code, 'TARGET_NOT_PLANNED');
  assert.ok(Object.isFrozen(a.receipt) && Object.isFrozen(a.receipt.outputs.flow.orders[0]));
});

test('the same plan drives both renderers: every shot is ordered for Flow and staged deterministically', () => {
  const out = compileMediaPlan(episodePlan());
  assert.equal(out.ok, true, JSON.stringify(out.refusals));
  const { flow, deterministic } = out.receipt.outputs;
  assert.equal(flow.orders.length, 8);
  assert.deepEqual(flow.orders.map((o) => o.promptAssembly.shotId), deterministic.input.episode.shots.map((s) => s.id));
  assert.ok(flow.orders.every((o) => o.model === 'veo_3_1_t2v_lite' && o.aspect === '9:16' && !/lettering/u.test(o.prompt.replace(/without on-screen text, lettering/u, ''))));
  assert.ok(flow.orders[0].prompt.includes('Copper bracket approaches an unnumbered doorway'));
  assert.ok(compilePublication(admitMediaPlan(episodePlan()).plan).publication.title === 'The Second Exit');
  assert.ok(compileDeterministicRenderJob(admitMediaPlan(episodePlan()).plan).job);
});
