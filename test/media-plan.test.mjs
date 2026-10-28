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

// ------------------------------------------------------------------ PR5 source-contract regressions
// Pure synthetic data supplements, rather than replaces, the existing real fixtures.
// No subprocess, network, file write, install, rendering or queueing is used here.

const syntheticPlan = () => ({
  kind: 'MediaPlan', version: 1, id: 'source-contract', title: 'Source contract', consumer: 'source-contract',
  source: { sourceRevision: 'git:' + 'a'.repeat(40), documents: [{ id: 'paper', role: 'paper', identity: niOf('synthetic paper') }] },
  scenes: [{ id: 'scene', shots: [{ id: 'shot', frames: 240, action: 'A room.', visual: { prompt: 'A still room.' } }] }],
});
const syntheticCompletion = (prompt = 'A still room.') => ({
  type: 'MediaArtifactWorkCompletion', capability: 'text-to-video', id: niOf('synthetic completion'),
  prompt: niOf(prompt), promptText: prompt, resource: { aspect: '9:16' },
  output: { identity: niOf('synthetic video bytes'), mimeType: 'video/mp4', bytes: 21 },
});
const syntheticSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 960"><rect width="540" height="960"/></svg>';
const withCard = (plan) => ({ ...plan, links: [{ rel: 'paper', documentId: 'paper' }], endCard: {} });
const at = (value, parts) => parts.reduce((node, key) => node[key], value);
const pathOf = (parts) => parts.reduce((path, key) => typeof key === 'number' ? path + '[' + key + ']' : path + (path ? '.' : '') + key, '');

function richStructuralPlan() {
  const plan = withCard(syntheticPlan());
  plan.source.documents[0].url = 'https://example.org/paper';
  plan.characters = [{ id: 'actor', name: 'Actor', synthetic: true }];
  plan.locations = [{ id: 'room', name: 'Room' }];
  plan.beats = [{ id: 'beat', causeBeatId: 'seed', action: 'Enter', consequence: 'Arrive' }];
  plan.audio = { music: { profile: 'harmonic' }, dialogue: { voice: 'none' } };
  plan.captions = { derive: 'auto', burnedIn: true };
  plan.render = { targets: ['deterministic', 'flow'] };
  plan.publication = { privacy: 'private', requirePaperLink: true };
  const shot = plan.scenes[0].shots[0];
  Object.assign(shot, {
    beatId: 'beat', locationId: 'room', characterIds: ['actor'],
    dialogue: [{ speakerId: 'actor', startFrame: 0, endFrame: 30, text: 'Hello.' }],
    captions: [{ startFrame: 0, endFrame: 30, text: 'Hello.' }],
  });
  Object.assign(shot.visual, {
    referenceImages: [{ label: 'actor', kind: 'character', identity: niOf('reference') }],
    generated: [{ completion: niOf('accepted completion'), output: niOf('accepted output') }],
    assets: [{ id: 'frame', role: 'frame', svg: syntheticSvg, producer: { service: 'synthetic-test' } }],
  });
  return plan;
}

// Schema traversal only enumerates authored test cases. It is not an instance validator.
function structuralCases(schema, input) {
  const closed = [], defaults = [];
  function visit(node, value, parts) {
    if (!node || typeof node !== 'object') return;
    if (node.$ref) node = { ...schema.$defs[node.$ref.slice('#/$defs/'.length)], ...Object.fromEntries(Object.entries(node).filter(([key]) => key !== '$ref')) };
    if (node.type === 'object' && value && typeof value === 'object' && !Array.isArray(value)) {
      if (node.additionalProperties === false || node.unevaluatedProperties === false) closed.push({ parts, fields: Object.keys(node.properties) });
      for (const [key, child] of Object.entries(node.properties ?? {})) {
        if (child && typeof child === 'object' && Object.hasOwn(child, 'default')) defaults.push({ parts: [...parts, key], value: child.default });
        if (Object.hasOwn(value, key)) visit(child, value[key], [...parts, key]);
      }
    }
    if (node.type === 'array' && Array.isArray(value)) for (const [i, child] of value.entries()) visit(node.items, child, [...parts, i]);
  }
  visit(schema, input, []);
  return { closed, defaults };
}

test('schema-closed object boundaries refuse unknown fields at their original paths', () => {
  const schema = JSON.parse(readFileSync(new URL('../data/schema/media-plan.schema.json', import.meta.url), 'utf8'));
  const plan = richStructuralPlan();
  assert.equal(admitMediaPlan(plan).ok, true);
  const { closed } = structuralCases(schema, plan);
  assert.equal(closed.length, 23, 'all root, nested, array-element and audio object surfaces are represented');
  for (const { parts, fields } of closed) {
    assert.ok(fields.length, pathOf(parts));
    const changed = structuredClone(plan);
    at(changed, parts).undeclared = 'must not disappear';
    const result = admitMediaPlan(changed);
    assert.equal(result.ok, false, pathOf(parts));
    assert.ok(result.refusals.some((r) => r.code === 'FIELD_UNKNOWN' && r.path === pathOf([...parts, 'undeclared'])), pathOf(parts));
  }
  const conditioned = syntheticPlan();
  conditioned.scenes[0].shots[0].visual.firstFrame = niOf('first frame');
  assert.ok(compileMediaPlan(conditioned).refusals.some((r) => r.code === 'FIELD_UNKNOWN' && r.path === 'scenes[0].shots[0].visual.firstFrame'));
});

test('schema defaults apply to absence, never null; nested audio and NI fields keep their declared types', () => {
  const schema = JSON.parse(readFileSync(new URL('../data/schema/media-plan.schema.json', import.meta.url), 'utf8'));
  const plan = richStructuralPlan();
  for (const { parts, value } of structuralCases(schema, plan).defaults) {
    const explicit = structuredClone(plan), omitted = structuredClone(plan), nulled = structuredClone(plan);
    at(explicit, parts.slice(0, -1))[parts.at(-1)] = value;
    delete at(omitted, parts.slice(0, -1))[parts.at(-1)];
    at(nulled, parts.slice(0, -1))[parts.at(-1)] = null;
    assert.deepEqual(admitMediaPlan(explicit), admitMediaPlan(omitted), pathOf(parts));
    assert.equal(admitMediaPlan(nulled).ok, false, pathOf(parts));
  }
  for (const field of ['music', 'dialogue']) for (const value of [null, [], 'ignored', 2, false]) {
    const changed = syntheticPlan(); changed.audio = { [field]: value };
    assert.ok(admitMediaPlan(changed).refusals.some((r) => r.code === 'FIELD_OBJECT' && r.path === 'audio.' + field));
  }
  const changed = richStructuralPlan();
  changed.scenes[0].shots[0].visual.assets[0].mediaType = null;
  assert.equal(admitMediaPlan(changed).ok, false);
  const arrayIdentity = syntheticPlan(); arrayIdentity.source.documents[0].identity = [niOf('coerced')];
  assert.ok(admitMediaPlan(arrayIdentity).refusals.some((r) => r.code === 'LOCATOR_IDENTITY'));
  // Validation precedes normalization, including coercive derived operations.
  for (const targets of [['flow', { toString: null }], ['flow', []], ['flow', null], ['flow', 1], ['flow', true]]) {
    const malformed = syntheticPlan(); malformed.render = { targets };
    const result = admitMediaPlan(malformed);
    assert.equal(result.ok, false);
    assert.ok(result.refusals.some((r) => r.code === 'UNKNOWN_TARGET' && r.path === 'render.targets'));
  }
  const malformed = syntheticPlan(), nonText = { toString: null };
  malformed.render = { targets: ['flow', nonText], width: nonText };
  malformed.source.documents[0].identity = nonText;
  malformed.scenes[0].shots[0].frames = nonText;
  malformed.scenes[0].shots[0].characterIds = ['actor', nonText];
  malformed.scenes[0].shots[0].dialogue = [{ speakerId: nonText, startFrame: nonText, endFrame: nonText, text: nonText }];
  malformed.publication = { description: nonText, tags: ['valid', nonText] };
  const result = admitMediaPlan(malformed);
  assert.equal(result.ok, false);
  for (const path of ['render.targets', 'render.width', 'source.documents[0].identity', 'scenes[0].shots[0].frames', 'publication.description', 'publication.tags'])
    assert.ok(result.refusals.some((r) => r.path === path), path + ' remains an explicit refusal, not a normalization exception');

});

test('journal reuse requires compatible video evidence, not a matching prompt alone', () => {
  const plan = syntheticPlan(), valid = syntheticCompletion();
  const compile = (completions) => compileMediaPlan(plan, { targets: ['flow'], completions });
  assert.equal(compile([valid]).receipt.outputs.flow.satisfied.length, 1);
  assert.equal(compile([valid]).receipt.outputs.flow.orders.length, 0);
  const mutations = [
    (c) => { c.capability = 'text-to-image'; c.output.mimeType = 'image/png'; },
    (c) => { delete c.id; }, (c) => { c.id = 'unaddressed'; },
    (c) => { delete c.output; }, (c) => { delete c.output.identity; },
    (c) => { c.output.identity = [niOf('not a string')]; },
    (c) => { c.output.bytes = 0; }, (c) => { delete c.output.bytes; },
    (c) => { c.output.mimeType = 'image/jpeg'; },
    (c) => { delete c.resource; }, (c) => { c.resource.aspect = null; },
    (c) => { c.resource.aspect = '16:9'; },
    (c) => { c.promptText = 'Different prompt.'; },
    (c) => { c.capability = 'video-generation-mode-unverified'; },
  ];
  for (const mutate of mutations) {
    const changed = structuredClone(valid); mutate(changed);
    const result = compile([changed]);
    assert.equal(result.ok, true);
    assert.equal(result.receipt.outputs.flow.orders.length, 1, mutate.toString());
    assert.equal(result.receipt.outputs.flow.satisfied.length, 0);
  }
  const accepted = syntheticPlan();
  accepted.scenes[0].shots[0].visual.generated = [{ completion: valid.id, output: valid.output.identity }];
  assert.equal(compileMediaPlan(accepted, { targets: ['flow'] }).receipt.outputs.flow.satisfied.length, 1, 'explicit author acceptance retains its existing shape');
  accepted.scenes[0].shots[0].visual.generated[0].mimeType = 'image/png';
  assert.equal(compileMediaPlan(accepted, { targets: ['flow'] }).receipt.outputs.flow.orders.length, 1);
});

test('generated end-card identity preserves author IDs and binds its own frame asset', () => {
  const plan = withCard(syntheticPlan());
  plan.scenes[0].shots[0].id = 'end-card';
  plan.scenes[0].shots[0].visual.assets = [{ id: 'end-card-frame', role: 'overlay', svg: syntheticSvg }];
  plan.scenes[0].shots.push({ id: 'end-card-2', frames: 240, action: 'Another room.' });
  const compiled = compileMediaPlan(plan, { targets: ['deterministic'] });
  assert.equal(compiled.ok, true, JSON.stringify(compiled.refusals));
  const job = compiled.receipt.outputs.deterministic;
  assert.deepEqual(job.input.episode.shots.map((s) => s.id), ['end-card', 'end-card-2', 'end-card-3']);
  assert.deepEqual(job.assets.map((a) => a.shotId), ['end-card', 'end-card-3']);
  assert.ok(compiled.receipt.checks.every((c) => c.ok));
  assert.equal(verifyCompilationReceipt(plan, compiled.receipt).ok, true);
});

test('procedural-previs limits are target-specific and never truncate the shared plan', () => {
  const landscape = syntheticPlan(); landscape.aspect = '16:9';
  assert.equal(admitMediaPlan(landscape).ok, true);
  assert.equal(compileMediaPlan(landscape, { targets: ['flow'] }).ok, true);
  assert.ok(compileMediaPlan(landscape, { targets: ['deterministic'] }).refusals.some((r) => r.code === 'RENDERER_UNSUPPORTED' && r.path === 'aspect'));
  for (const [field, maximum] of [['characterIds', 5], ['dialogue', 12], ['frames', 1]]) {
    const candidate = syntheticPlan(), shot = candidate.scenes[0].shots[0];
    const fill = (count) => {
      if (field === 'characterIds') shot.characterIds = Array.from({ length: count }, (_, i) => 'actor-' + i);
      if (field === 'dialogue') {
        shot.characterIds = ['actor'];
        shot.dialogue = Array.from({ length: count }, (_, i) => ({ speakerId: 'actor', startFrame: i, endFrame: i + 1, text: 'Line ' + i }));
      }
      if (field === 'frames') shot.visual.assets = Array.from({ length: count }, (_, i) => ({ id: 'frame-' + i, role: 'frame', svg: syntheticSvg }));
    };
    fill(maximum);
    assert.equal(compileMediaPlan(candidate, { targets: ['deterministic'] }).ok, true, field);
    fill(maximum + 1);
    assert.equal(admitMediaPlan(candidate).ok, true, field);
    assert.equal(compileMediaPlan(candidate, { targets: ['flow'] }).ok, true, field);
    const result = compileMediaPlan(candidate, { targets: ['deterministic'] });
    assert.ok(result.refusals.some((r) => r.code === 'RENDERER_UNSUPPORTED'), field);
  }
  const many = syntheticPlan();
  const shots = (start, count) => Array.from({ length: count }, (_, i) => ({ id: 'shot-' + (start + i), frames: 240, action: 'A room.' }));
  many.scenes[0].shots = shots(0, 100);
  assert.equal(compileMediaPlan(many, { targets: ['deterministic'] }).ok, true);
  assert.ok(compileMediaPlan(withCard(many), { targets: ['deterministic'] }).refusals.some((r) => r.code === 'RENDERER_UNSUPPORTED' && r.path === 'scenes'));
  many.scenes.push({ id: 'second-scene', shots: shots(100, 1) });
  assert.equal(admitMediaPlan(many).ok, true);
  assert.equal(compileMediaPlan(many, { targets: ['flow'] }).ok, true);
  assert.equal(compileMediaPlan(many, { targets: ['deterministic'] }).ok, false);
  many.scenes.pop(); many.scenes[0].shots.pop();
  assert.equal(compileMediaPlan(withCard(many), { targets: ['deterministic'] }).ok, true, '99 author shots plus card is the exact boundary');
});

test('full receipt replay protects warnings and every carried authoritative field', () => {
  const plan = syntheticPlan(); plan.scenes[0].shots[0].visual.prompt = 'A room. Text overlays appear.';
  const completion = syntheticCompletion(plan.scenes[0].shots[0].visual.prompt);
  const receipt = compileMediaPlan(plan, { targets: ['flow'], completions: [completion] }).receipt;
  assert.equal(receipt.warnings[0].code, 'GENERATIVE_TEXT_REQUEST');
  assert.equal(verifyCompilationReceipt(plan, receipt, { completions: [completion] }).ok, true);
  assert.equal(verifyCompilationReceipt(plan, receipt).ok, false, 'the same journal is required for reuse replay');
  const mutations = [
    (r) => { r.warnings = []; }, (r) => { delete r.warnings; },
    (r) => { r.checks = []; }, (r) => { r.checks[0].ok = false; },
    (r) => { r.version = 2; }, (r) => { r.effects = 'queue'; },
    (r) => { r.planSlug = 'other'; }, (r) => { delete r.options; },
    (r) => { r.options = null; }, (r) => { delete r.options.model; },
    (r) => { r.options.model = []; }, (r) => { r.options.maxClipSeconds = null; },
    (r) => { r.options.completionsConsulted = []; }, (r) => { r.options.extra = true; },
    (r) => { delete r.targets; }, (r) => { r.targets = []; },
    (r) => { r.targets = 'flow'; }, (r) => { r.extra = 'not in the receipt'; },
    (r) => { delete r.outputs; },
  ];
  for (const mutate of mutations) {
    const changed = structuredClone(receipt); mutate(changed);
    assert.equal(verifyCompilationReceipt(plan, changed, { completions: [completion] }).ok, false, mutate.toString());
  }
  const reordered = Object.fromEntries(Object.entries(receipt).reverse());
  assert.equal(verifyCompilationReceipt(plan, reordered, { completions: [completion] }).ok, true);
});

test('malformed compile options yield coded refusals instead of runtime exceptions', () => {
  const plan = syntheticPlan();
  for (const options of [null, [], { targets: null }, { targets: [] }, { targets: 'flow' }, { targets: ['flow', 'flow'] },
    { model: null }, { model: '' }, { maxClipSeconds: null }, { maxClipSeconds: 0 }, { maxClipSeconds: 1.5 }, { completions: null }, { completions: {} }]) {
    const result = compileMediaPlan(plan, options);
    assert.equal(result.ok, false);
    assert.ok(result.refusals.every((r) => r.code && typeof r.path === 'string'));
  }
  assert.equal(compileMediaPlan(plan, { targets: ['unknown'] }).refusals[0].code, 'TARGET_NOT_PLANNED');
});

// Release-source repair: retain every preceding original/received case unchanged.
const inertSvg = (body, attributes = '') => `<svg xmlns="http://www.w3.org/2000/svg"${attributes ? ` ${attributes}` : ''}>${body}</svg>`;
const escapedLocator = (s) => s.replace(/[&<>"']/gu, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
const cardText = (job) => [...job.assets.find((a) => a.assetId === 'end-card-frame').svg.matchAll(/>([^<]*)<\/text>/gu)].map((m) => m[1]).join('');

test('inert profile preserves actual chart bytes and required report, hatching and end-card controls', () => {
  // Exact public producer example, not a local producer execution:
  // chart-specification-rendering-service@4a02cef5aa1310dc5869c056ffbf5994621b2e12,
  // package.json x-market.offers[0].examples.output.svg (MIT).
  const chart = fixture('chart-market-example.svg');
  assert.equal(Buffer.byteLength(chart), 1026);
  assert.equal(niOf(chart), 'ni:///sha-256;-tq9eH72IwP5mlqwSAbr0SfQsrNcfCYje7I8MzajLeA');
  // Source-shaped controls from the chart README's hatching grammar and the
  // report owner's renderSvgBytes at 19f6775122b5cab33f92c02c2d07a1f66c5df514.
  const hatch = inertSvg('<defs><pattern id="hatch-123abc" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="4" stroke="#123abc" stroke-width="1.4"/></pattern></defs><path d="M.5,-.5h10v20h-10Z" fill="url(#hatch-123abc)" stroke-dasharray="3,3"/><text x="1" y="2">Author&#39;s &amp; climate — café</text>');
  const report = inertSvg('<title>Report &amp; source</title><desc>Source: https://example.org/a</desc><rect width="1200" height="1240" fill="#fff"/><rect x="20" y="30" width="4" height="4" fill="#000"/>', 'version="1.2" baseProfile="tiny" width="1200" height="1240" viewBox="0 0 1200 1240"');
  const card = endCardSvg(admitMediaPlan(withCard(syntheticPlan())).plan);
  for (const svg of [chart, hatch, report, card, syntheticSvg]) {
    assert.equal(svgIsSelfContained(svg), true, svg);
    const candidate = syntheticPlan();
    candidate.scenes[0].shots[0].visual.assets = [{ id: 'source-graphic', role: 'overlay', svg, identity: niOf(svg) }];
    const out = compileMediaPlan(candidate, { targets: ['deterministic'] });
    assert.equal(out.ok, true, JSON.stringify(out.refusals));
    assert.equal(out.receipt.outputs.deterministic.assets[0].svg, svg, 'receiver gets exact author bytes');
    assert.equal(niOf(out.receipt.outputs.deterministic.assets[0].svg), niOf(svg));
  }
});

test('inert profile rejects unmodeled markup, namespace changes and non-scalar/entity input', () => {
  const bad = [
    '<svg/>', '<s:svg xmlns:s="http://www.w3.org/2000/svg"/>', inertSvg('<g></rect>'),
    inertSvg('<g>') , inertSvg('<rect width="1" width="2"/>'), inertSvg('<rect width=1/>'),
    inertSvg('<rect/>') + '<svg xmlns="http://www.w3.org/2000/svg"/>', inertSvg('not whitespace'),
    inertSvg('<style>@import "https://example.invalid/a.css";</style>'),
    inertSvg('<style>@im\\70ort "https://example.invalid/a.css";</style>'),
    inertSvg('<foreignObject/>'), inertSvg('<image href="data:image/svg+xml,anything"/>'),
    inertSvg('<use href="#x"/>'), inertSvg('<a href="https://example.invalid"/>'),
    inertSvg('<g xmlns="https://example.invalid"/>'), inertSvg('<g xmlns:xlink="http://www.w3.org/1999/xlink"/>'),
    inertSvg('<g xml:base="https://example.invalid"/>'), inertSvg('<x:path/>'),
    inertSvg('<rect style="fill:red"/>'), inertSvg('<rect onload="run()"/>'),
    inertSvg('<rect/>', 'xmlns:xlink="https://example.invalid"'),
    '<!DOCTYPE svg [<!ENTITY x "payload">]>' + inertSvg('<text>&x;</text>'),
    inertSvg('<!-- unsupported comment -->'), inertSvg('<![CDATA[unsupported]]>'),
    inertSvg('<?instruction data?>'), '<?xml version="1.1"?>' + inertSvg(''),
    '<?xml version="1.0" encoding="UTF-16"?>' + inertSvg(''),
    inertSvg('<text>&unknown;</text>'), inertSvg('<text>&#0;</text>'), inertSvg('<text>&#x110000;</text>'),
    inertSvg('<text>&#xD800;</text>'), inertSvg('<text>&#xFFFE;</text>'), inertSvg('<text>]]></text>'),
    inertSvg('<text>\u0000</text>'), inertSvg('<text>\uD800</text>'), inertSvg('<text>\uFFFF</text>'),
    inertSvg('<text title="raw<markup"/>'),
  ];
  for (const svg of bad) assert.equal(svgIsSelfContained(svg), false, JSON.stringify(svg));
  assert.equal(svgIsSelfContained('\uFEFF<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + inertSvg('<text>&lt;style&gt; &amp;#60; &#x1F30D; &quot; &#39;</text>')), true);
  assert.equal(svgIsSelfContained({ toString: null }), false);
});

test('inert profile consumes finite presentation, geometry, path and transform languages completely', () => {
  const valid = [
    '<path d="M0 0 L1-2 H3 V4 C1 2 3 4 5 6 S7 8 9 10 Q1 2 3 4 T5 6 A2 3 45 0 1 7 8 Z"/>',
    '<g transform="matrix(1,0,0,1,0,0), translate(2 3) scale(1.5) rotate(45 2 3) skewX(3) skewY(-2)"><circle r="2" fill="rgba(10,20,30,0.5)"/><ellipse rx="2" ry="3" fill="hsl(120,50%,50%)"/><rect fill="rgb(10%,20%,30%)" color="#123" stroke="currentColor"/></g>',
    '<text font-family="DejaVu Sans, sans-serif" x="1 2" y="3" dx="1px,2px" font-size="12" font-weight="600">A<tspan>β</tspan></text>',
  ];
  for (const body of valid) assert.equal(svgIsSelfContained(inertSvg(body)), true, body);
  const invalid = [
    '<rect fill="url(https://example.invalid/x)"/>', '<rect fill="u\\72l(#x)"/>',
    '<rect fill="rgb(1,2)"/>', '<rect fill="rgba(1,2,3,2)"/>', '<rect fill="rgb(1%,2,3)"/>',
    '<rect fill="hsl(1,2,3)"/>', '<rect fill="rgba(1,2,3,.5) trailing"/>',
    '<rect fill="var(--paint)"/>', '<rect fill="InHeRiT"/>', '<rect fill="context-fill"/>',
    '<rect stroke="context-stroke"/>', '<rect color="url(#x)"/>', '<rect fill="url(#x) red"/>',
    '<rect width="-1"/>', '<rect opacity="1.1"/>', '<rect x="1e999"/>', '<rect x="1000001"/>',
    '<rect filter="url(#x)"/>', '<rect data-anything="x"/>', '<rect stroke-dasharray="1,,2"/>',
    '<g transform="translate(1,2,3)"/>', '<g transform="rotate(1,2)"/>', '<g transform="scale(1)junk"/>',
    '<path d="L0 0"/>', '<path d="M0"/>', '<path d="M0 0 A1 1 0 2 1 2 2"/>',
    '<path d="M0 0 A-1 1 0 0 1 2 2"/>', '<path d="M0 0 Z1"/>', '<path d="M0 0 R1 2"/>',
    '<polygon points="0 0 1 1 2"/>', '<text font-family="url(example)"/>',
  ];
  for (const body of invalid) assert.equal(svgIsSelfContained(inertSvg(body)), false, body);
});

test('inert resource graph rejects unresolved, mistyped, direct and inherited cycles', () => {
  const pattern = (id, body, extra = '') => `<pattern id="${id}" width="4" height="4"${extra ? ` ${extra}` : ''}>${body}</pattern>`;
  const bad = [
    inertSvg('<rect fill="url(#missing)"/>'),
    inertSvg('<rect id="x"/><rect fill="url(#x)"/>'),
    inertSvg('<rect id="x"/><rect id="x"/>'),
    inertSvg('<text aria-labelledby="missing">text</text>'),
    inertSvg('<defs><linearGradient id="x"/></defs><rect clip-path="url(#x)"/>'),
    inertSvg('<defs>' + pattern('p', '<rect fill="url(#p)"/>') + '</defs>'),
    inertSvg('<defs>' + pattern('a', '<rect fill="url(#b)"/>') + pattern('b', '<rect fill="url(#a)"/>') + '</defs>'),
    inertSvg('<defs>' + pattern('p', '<rect/>') + '</defs>', 'fill="url(#p)"'),
    inertSvg('<g stroke="url(#p)"><defs>' + pattern('p', '<rect/>') + '</defs></g>'),
    inertSvg('<g fill="url(#p)"><defs>' + pattern('p', '<rect fill="none"/>') + '</defs></g>'),
    inertSvg('<defs>' + pattern('p', '<rect/>', 'fill="not-a-color"') + '</defs>', 'fill="url(#p)"'),
    inertSvg('<g stroke="url(#p)"><defs>' + pattern('p', '<rect/>', 'stroke="not-a-color"') + '</defs></g>'),
    inertSvg('<defs>' + pattern('p', '<rect/>', 'fill="rgba(1,2,3,.5)"') + '</defs>', 'fill="url(#p)"'),
    inertSvg('<g marker-start="url(#m)"><defs><marker id="m"><path d="M0 0L1 1"/></marker></defs></g>'),
    inertSvg('<g clip-path="url(#c)"><defs><clipPath id="c"><rect/></clipPath></defs></g>'),
  ];
  for (const svg of bad) assert.equal(svgIsSelfContained(svg), false, svg);
  const good = [
    inertSvg('<defs>' + pattern('p', '<rect/>', 'fill="none"') + '</defs><rect/>', 'fill="url(#p)"'),
    inertSvg('<defs>' + pattern('p', '<rect/>', 'fill="#aBc"') + '</defs><rect/>', 'fill="url(#p)"'),
    inertSvg('<g stroke="url(#p)"><defs>' + pattern('p', '<rect/>', 'stroke="WHITE"') + '</defs></g>'),
    inertSvg('<defs>' + pattern('p', '<rect/>', 'fill="currentColor"') + '</defs>', 'fill="url(#p)" color="#123456"'),
    inertSvg('<defs>' + pattern('a', '<rect fill="url(#b)"/>') + pattern('b', '<rect fill="#abc"/>') + '</defs><rect fill="url(\'#a\')"/>'),
    inertSvg('<defs><clipPath id="c"><rect/></clipPath><marker id="m"><path d="M0 0L1 1"/></marker></defs><path d="M0 0L1 1" clip-path="url(#c)" marker-end="url(#m)"/>'),
    inertSvg('<desc id="description">https://example.org/ is inert text</desc><text aria-labelledby="description">label</text>'),
  ];
  for (const svg of good) assert.equal(svgIsSelfContained(svg), true, svg);
});

test('end cards preserve complete NI, URL and DOI locators and refuse actual paper mismatch or overflow', () => {
  const locators = [
    { rel: 'paper', identity: niOf('complete NI-only paper') },
    { rel: 'paper', url: 'https://example.org/a?x=1&y=2' },
    { rel: 'paper', doi: '10.5555/complete-doi.test' },
    { rel: 'paper', url: `https://example.org/${'a'.repeat(136 - 'https://example.org/'.length)}` },
  ];
  for (const link of locators) {
    const plan = withCard(syntheticPlan()); plan.links = [link];
    const expected = link.url ?? (link.doi ? `https://doi.org/${link.doi}` : link.identity);
    const out = compileMediaPlan(plan, { targets: ['deterministic'] });
    assert.equal(out.ok, true, JSON.stringify(out.refusals));
    assert.ok(cardText(out.receipt.outputs.deterministic).includes(escapedLocator(expected)), expected);
    const card = out.receipt.outputs.deterministic.assets.find((a) => a.assetId === 'end-card-frame');
    const fitted = [...card.svg.matchAll(/textLength="([0-9]+)" lengthAdjust="spacingAndGlyphs"/gu)];
    assert.ok(fitted.length > 0 && fitted.every((m) => Number(m[1]) <= 440), 'visible locator lines have explicit width bounds');
    assert.ok(out.receipt.outputs.publication.description.includes(expected));
    assert.ok(out.receipt.checks.some((c) => c.name === 'paper-link-on-end-card' && c.ok));
    assert.ok(out.receipt.checks.some((c) => c.name === 'selected-link-on-end-card' && c.ok));
    assert.equal(verifyCompilationReceipt(plan, out.receipt).ok, true);
  }
  const overflow = withCard(syntheticPlan()); overflow.links = [{ rel: 'paper', url: `https://example.org/${'a'.repeat(137 - 'https://example.org/'.length)}` }];
  assert.ok(compileMediaPlan(overflow, { targets: ['deterministic'] }).refusals.some((r) => r.code === 'ENDCARD_LINK_TOO_LONG' && r.path === 'endCard.linkRel'));
  const selection = withCard(syntheticPlan());
  selection.links = [{ rel: 'paper', identity: niOf('paper') }, { rel: 'source', identity: niOf('paper') }];
  selection.endCard.linkRel = 'source';
  assert.equal(compileMediaPlan(selection, { targets: ['deterministic'] }).ok, true, 'same locator, different relation is compatible');
  selection.links[1].identity = niOf('other source');
  assert.ok(compileMediaPlan(selection, { targets: ['deterministic'] }).refusals.some((r) => r.code === 'ENDCARD_PAPER_LINK_MISMATCH'));
});

test('narrative migration gives returning beat runs unique scene identities without changing source shots', () => {
  const original = structuredClone(episode);
  const input = structuredClone(episode);
  input.episode.beats = [];
  const beats = ['a', 'b', 'a', 'a', 'a-run-2', 'b', 'a', 'a'];
  input.episode.shots.forEach((shot, i) => { shot.beatId = beats[i]; });
  const migrated = mediaPlanFromNarrativeEpisode(input);
  assert.deepEqual(migrated.scenes.map((s) => s.id), ['a', 'b', 'a-run-3', 'a-run-2', 'b-run-2', 'a-run-4']);
  assert.deepEqual(migrated.scenes.map((s) => s.shots.length), [1, 1, 2, 1, 1, 2]);
  assert.equal(admitMediaPlan(migrated).ok, true);
  const out = compileMediaPlan(migrated, { targets: ['deterministic'] });
  assert.equal(out.ok, true, JSON.stringify(out.refusals));
  for (const [i, shot] of out.receipt.outputs.deterministic.input.episode.shots.entries()) {
    for (const field of ['id', 'beatId', 'frames', 'locationId', 'characterIds', 'action', 'dialogue']) assert.deepEqual(shot[field], input.episode.shots[i][field], `${i}:${field}`);
  }
  assert.equal(migrated.source.documents[0].identity, niOf(canonicalJson(input)));
  assert.deepEqual(mediaPlanFromNarrativeEpisode(input), migrated);
  const long = structuredClone(input);
  long.episode.shots.forEach((shot, i) => { shot.beatId = i % 2 ? 'b' : 'a'.repeat(80); });
  const longPlan = mediaPlanFromNarrativeEpisode(long);
  assert.equal(admitMediaPlan(longPlan).ok, true);
  assert.ok(longPlan.scenes.every((s) => s.id.length <= 80));
  assert.equal(new Set(longPlan.scenes.map((s) => s.id)).size, longPlan.scenes.length);
  migrated.scenes[0].shots[0].dialogue[0].text = 'not the source';
  assert.notEqual(input.episode.shots[0].dialogue[0].text, 'not the source');
  assert.deepEqual(episode, original, 'original real fixture unchanged');
  assert.deepEqual(episodePlan().scenes.map((s) => s.id), [...new Set(episode.episode.shots.map((s) => s.beatId))]);
});

test('profile limits and schema guidance refuse unsupported assets with a coded path', () => {
  const schema = JSON.parse(readFileSync(new URL('../data/schema/media-plan.schema.json', import.meta.url), 'utf8'));
  assert.match(schema.$defs.visual.properties.assets.items.properties.svg.$comment, /media-inert-svg\/1/u);
  const profile = readFileSync(new URL('../data/schema/media-inert-svg-profile.md', import.meta.url), 'utf8');
  assert.ok(profile.includes('media-inert-svg/1') && profile.includes('not a general XML'));
  assert.equal(svgIsSelfContained(inertSvg('<g>'.repeat(62) + '<rect/>' + '</g>'.repeat(62))), true);
  const tooDeep = inertSvg('<g>'.repeat(63) + '<rect/>' + '</g>'.repeat(63));
  const tooMany = inertSvg('<rect/>'.repeat(10000));
  for (const svg of [tooDeep, tooMany, inertSvg('<text>' + 'x'.repeat(400000) + '</text>')]) {
    assert.equal(svgIsSelfContained(svg), false);
    const plan = syntheticPlan(); plan.scenes[0].shots[0].visual.assets = [{ id: 'unsupported', role: 'overlay', svg }];
    const admitted = admitMediaPlan(plan);
    assert.equal(admitted.ok, false);
    assert.ok(admitted.refusals.some((r) => r.code === 'SVG_NOT_SELF_CONTAINED' && r.path === 'scenes[0].shots[0].visual.assets[0].svg'));
  }
});
