import assert from "node:assert/strict";
import { test } from "node:test";
import { composeCapabilities } from "@red-cup-engineering/feltos/capabilities";
import { createEngine, join, step, submit } from "@red-cup-engineering/feltos/engine";
import { defineGame } from "@red-cup-engineering/feltos/game";
import { initializeClock } from "@red-cup-engineering/feltos/world-clock";
import { value, values } from "@red-cup-engineering/feltos/world";
import { farstoneArcCapability } from "./farstone-arcs.mjs";
import { FARSTONE_GAME, FARSTONE_RUNTIME } from "./farstone-game.mjs";

const command = (engine, line, actor = "hero") => {
  const queued = submit(engine, { actor, command: line });
  return step(queued, { runtime: FARSTONE_RUNTIME });
};

// A minimal island, standing in for the (dropped from the real Bible) Coilin
// Vey / Brannaugh Ross dredging feud, so the petition consequences that only
// fire when those subjects exist can still be exercised directly.
const ARCS_RUNTIME = composeCapabilities([farstoneArcCapability]);

function arcsIslandGame() {
  return defineGame({
    id: "farstone.arcs-island",
    name: "Arcs Test Island",
    start: "downtown",
    capabilities: [farstoneArcCapability.id],
    // The real game centrally registers these in farstone-game.mts's `functionalPredicates`;
    // this standalone fixture has to declare its own so "latest wins" (e.g. decision-status
    // moving from "open" to "granted") settles to one value instead of a live contradiction.
    functionalPredicates: ["decision-status", "permit-resolved", "standing", "shellfish-closed", "embittered", "pollution"],
    rooms: {
      downtown: { name: "Downtown", description: "The civic blocks.", exits: { south: "marsh" } },
      marsh: { name: "The Salt Marsh", description: "Spartina and the clam bed.", exits: { north: "downtown" } },
    },
    things: {
      "coilin-vey": { name: "Coilin Vey", description: "Wants the dredge.", location: "downtown" },
      "brannaugh-ross": { name: "Brannaugh Ross", description: "Works the clam bed.", location: "marsh" },
    },
    assertions: [
      { subject: "downtown", predicate: "tag", object: "civic" },
      { subject: "marsh", predicate: "tag", object: "shellfish" },
      { subject: "the-dredging-permit", predicate: "decision-status", object: "open" },
    ],
  });
}

const arcsCommand = (engine, line, actor = "citizen") => {
  const queued = submit(engine, { actor, command: line });
  return step(queued, { runtime: ARCS_RUNTIME });
};

test("the permit and hydrant arcs irreversibly settle through civic commands", () => {
  let engine = join(createEngine(FARSTONE_GAME), "hero", { at: "harbor-quay" });
  engine = command(engine, "go north").engine;
  let result = command(engine, "petition brannaugh");
  engine = result.engine;
  assert.equal(value(engine.world, "the-dredging-permit", "decision-status"), "denied");
  assert.match(result.receipt.events[0].text, /clam bed is spared/u);
  result = command(engine, "inspect hydrant-23");
  assert.notEqual(value(result.engine.world, "hydrant-23", "water-quality"), "contested");
});

test("granting the dredge fouls every shellfish room in the real Bible", () => {
  let engine = join(createEngine(FARSTONE_GAME), "hero", { at: "harbor-quay" });
  engine = command(engine, "go north").engine;
  const result = command(engine, "petition coilin");
  assert.equal(value(result.engine.world, "the-dredging-permit", "decision-status"), "granted");
  for (const shellfishRoom of ["the-marsh", "the-clam-flats"]) {
    assert.equal(value(result.engine.world, shellfishRoom, "shellfish-closed"), true, `${shellfishRoom} is closed`);
    assert.ok(Number(value(result.engine.world, shellfishRoom, "pollution")) >= 8, `${shellfishRoom} is silted`);
  }
});

test("granting the dredge pollutes the clam bed and embitters Brannaugh Ross, when she's in the Bible", () => {
  const engine0 = join(createEngine(arcsIslandGame()), "citizen", { at: "downtown" });
  const result = arcsCommand(engine0, "petition coilin");
  assert.equal(value(result.engine.world, "the-dredging-permit", "decision-status"), "granted");
  assert.equal(value(result.engine.world, "marsh", "shellfish-closed"), true, "the bed is fouled");
  assert.ok(Number(value(result.engine.world, "marsh", "pollution")) >= 8, "silt loads the marsh");
  assert.equal(value(result.engine.world, "brannaugh-ross", "embittered"), true, "the loser bears a lasting grievance");
});

test("denying the dredge spares the clam bed and embitters Coilin Vey, when he's in the Bible", () => {
  const engine0 = join(createEngine(arcsIslandGame()), "citizen", { at: "downtown" });
  const result = arcsCommand(engine0, "petition brannaugh");
  assert.equal(value(result.engine.world, "the-dredging-permit", "decision-status"), "denied");
  assert.equal(value(result.engine.world, "marsh", "shellfish-closed"), null, "the bed is not fouled");
  assert.equal(value(result.engine.world, "coilin-vey", "embittered"), true, "the loser bears a lasting grievance");
});

test("audit, recheck, and reinspect are aliases of inspect and share its seeded roll", () => {
  const outcomes = ["inspect", "audit", "recheck", "reinspect"].map((verb) => {
    let engine = join(createEngine(FARSTONE_GAME), "hero", { at: "harbor-quay" });
    engine = command(engine, "go north").engine;
    const result = command(engine, `${verb} hydrant-23`);
    assert.match(result.receipt.events[0].text, /re-inspection settles hydrant-23/u);
    return value(result.engine.world, "hydrant-23", "water-quality");
  });
  assert.ok(outcomes.every((status) => status === "pass" || status === "fail"));
  assert.ok(outcomes.every((status) => status === outcomes[0]), "every alias resolves the same seeded roll as inspect");
});

test("Application 23 becomes contested after its living civic deadline", () => {
  let engine = join(createEngine(FARSTONE_GAME), "hero", { at: "harbor-quay" });
  engine = { ...engine, world: initializeClock(engine.world, { seed: "farstone", time: 30 }) };
  engine = step(engine, { runtime: FARSTONE_RUNTIME }).engine;
  assert.equal(value(engine.world, "the-dredging-permit", "decision-status"), "contested");
});

test("the Maple-and-Birch petition retains its signatures, deadline, and council outcome", () => {
  let engine = join(createEngine(FARSTONE_GAME), "hero", { at: "harbor-quay" });
  engine = command(engine, "go north").engine;
  assert.equal(value(engine.world, "civic-maple-and-birch-stop", "recorded-signature-count"), 73);
  engine = command(engine, "civic-petition maple birch").engine;
  engine = command(engine, "vote maple birch approve").engine;
  const result = command(engine, "resolve maple birch");
  assert.equal(value(result.engine.world, "civic-maple-and-birch-stop", "decision-status"), "approved");
  assert.equal(value(result.engine.world, "the-maple-and-birch-intersection", "traffic-control-status"), "four-way-stop-authorized");
});

test("a dispatched public task is completed in the world's civic record", () => {
  let engine = join(createEngine(FARSTONE_GAME), "hero", { at: "harbor-quay" });
  engine = command(engine, "go north").engine;
  let result = command(engine, "assign records");
  engine = result.engine;
  assert.match(result.receipt.events[0].text, /work:records:2/u);
  result = command(engine, "complete work:records:2");
  assert.equal(value(result.engine.world, "work:records:2", "work-status"), "completed");
  assert.equal(value(result.engine.world, "work:records:2", "completed-by"), "clerk-halloran");
});

test("Harbormaster Quist offers a carryable, live lighthouse dispatch", () => {
  let engine = join(createEngine(FARSTONE_GAME), "hero", { at: "the-harbormasters-office" });
  const result = command(engine, "accept deliver-the-lighthouse-dispatch");
  assert.equal(value(result.engine.world, "hero", "quest:deliver-the-lighthouse-dispatch"), "accepted");
  assert.equal(value(result.engine.world, "the-lighthouse-letter", "located-in"), "hero");
});

test("the unique lighthouse dispatch cannot be reissued while a courier carries it", () => {
  let engine = join(createEngine(FARSTONE_GAME), "first-courier", { at: "the-harbormasters-office" });
  engine = command(engine, "accept deliver-the-lighthouse-dispatch", "first-courier").engine;
  engine = join(engine, "second-courier", { at: "the-harbormasters-office" });
  const result = command(engine, "accept deliver-the-lighthouse-dispatch", "second-courier");
  assert.match(result.receipt.events[0].text, /already in transit/u);
  assert.equal(value(result.engine.world, "the-lighthouse-letter", "located-in"), "first-courier");
  assert.equal(value(result.engine.world, "second-courier", "quest:deliver-the-lighthouse-dispatch"), null);
});

test("a public-works assignment repairs the situated Elm-and-Third hazard", () => {
  let engine = join(createEngine(FARSTONE_GAME), "hero", { at: "harbor-quay" });
  engine = command(engine, "go north").engine;
  let result = command(engine, "assign infrastructure-operation");
  engine = result.engine;
  result = command(engine, "complete work:infrastructure-operation:2");
  assert.equal(value(result.engine.world, "the-elm-and-third-pothole", "repair-status"), "filled-and-inspected");
  assert.equal(value(result.engine.world, "citizen-complaint-elm-and-third", "complaint-status"), "resolved");
});

test("the claimed Elm-and-Third complaint is a durable public-works record", () => {
  let engine = join(createEngine(FARSTONE_GAME), "hero", { at: "harbor-quay" });
  engine = command(engine, "go north").engine;
  assert.equal(value(engine.world, "citizen-complaint-elm-and-third", "complaint-status"), "claimed");
  assert.equal(value(engine.world, "repair-pothole-elm-and-third", "assigned-to"), "chief-oakes");
  const result = command(engine, "complete repair-pothole-elm-and-third");
  assert.equal(value(result.engine.world, "repair-pothole-elm-and-third", "work-status"), "completed");
  assert.equal(value(result.engine.world, "the-elm-and-third-pothole", "repair-status"), "filled-and-inspected");
});

test("the harbor bell is a live public signal answered by the harbormaster", () => {
  let engine = join(createEngine(FARSTONE_GAME), "hero", { at: "harbor-quay" });
  const result = command(engine, "ring harbor bell");
  assert.equal(value(result.engine.world, "the-harbor-bell", "ringing"), "for-fog");
  assert.equal(value(result.engine.world, "harbormaster-quist", "tending"), "the-harbor-bell");
});

test("the PyFars civic corpus is one live Farstone registry, not a shadow document tree", () => {
  const world = createEngine(FARSTONE_GAME).world;
  assert.equal(value(world, "farston-harbormaster", "office"), "harbormaster");
  assert.ok(values(world, "farston-public-works", "capability").includes("water-quality-inspection"));
  assert.equal(value(world, "inspect-public-water-quarterly", "cadence"), "per-calendar-quarter");
  assert.equal(value(world, "right-citizen-petition", "signature-threshold"), 50);
  assert.equal(value(world, "harbormaster-quist", "holds-office"), "farston-harbormaster");
});
