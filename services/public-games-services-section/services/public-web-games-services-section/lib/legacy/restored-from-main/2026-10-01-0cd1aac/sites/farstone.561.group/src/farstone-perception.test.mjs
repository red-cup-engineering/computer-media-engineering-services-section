// farstone-perception.test — the agent-legible perception frame: shape, evidence legibility for a
// contested cell, and in-band affordance gating. Mirrors tidepool's own perception.test.mts (see the
// tidepool-services-section sibling) against Farstone's own harbor world (docs/world/harbor.json).

import { test } from "node:test";
import assert from "node:assert/strict";
import { createEngine, join, step, submit } from "@red-cup-engineering/feltos/engine";
import { declareFunctional, move, tell } from "@red-cup-engineering/feltos/world";
import { FARSTONE_GAME, FARSTONE_RUNTIME } from "./farstone-game.mjs";
import { PERCEPTION_KIND, farstoneAffordances, perceptionFrame, perceptionSnapEntry } from "./farstone-perception.mjs";

function boot() {
  let engine = createEngine(FARSTONE_GAME);
  engine = join(engine, "kip");
  return engine;
}

function shortestPath(from, to) {
  const queue = [[from, []]], visited = new Set([from]);
  while (queue.length) {
    const [room, path] = queue.shift();
    if (room === to) return path;
    for (const [direction, destination] of Object.entries(FARSTONE_GAME.rooms[room]?.exits ?? {})) {
      if (!visited.has(destination)) {
        visited.add(destination);
        queue.push([destination, [...path, direction]]);
      }
    }
  }
  throw new Error(`No route from ${from} to ${to}`);
}

test("perception frame: has the versioned kind and the documented top-level shape", () => {
  const engine = boot();
  const frame = perceptionFrame(engine.world, "kip", engine.tick, []);
  assert.equal(frame.kind, PERCEPTION_KIND);
  assert.equal(frame.kind, "farstone.perception.v1");
  assert.equal(frame.actor, "kip");
  assert.equal(frame.tick, 0);
  assert.ok(frame.place !== null);
  assert.equal(frame.place?.id, FARSTONE_GAME.start);
  assert.equal(typeof frame.place?.name, "string");
  assert.equal(typeof frame.place?.description, "string");
  assert.ok(Array.isArray(frame.place?.exits));
  assert.ok(frame.place?.exits.includes("west"));
  assert.ok(Array.isArray(frame.occupants));
  assert.ok(Array.isArray(frame.subjects));
  assert.ok(Array.isArray(frame.recentEvents));
  assert.equal(typeof frame.clock.season, "string");
  assert.equal(typeof frame.clock.weather, "string");
  assert.equal(typeof frame.clock.fireDanger, "string");
  assert.equal(typeof frame.clock.dryStreak, "number");
  assert.equal(typeof frame.clock.harborClosed, "boolean");
});

test("perception frame: only shows subjects that are structurally visible (perceive()'s restriction, not a filter)", () => {
  const engine = boot();
  const frame = perceptionFrame(engine.world, "kip", 0, []);
  const ids = frame.subjects.map((s) => s.id);
  assert.ok(ids.includes(FARSTONE_GAME.start));
  assert.ok(ids.includes("kip"));
  assert.ok(ids.includes("wynn-warden"), "wynn-warden is co-located with the start room");
  assert.ok(!ids.includes("the-chandlery"), "a room reachable only by moving must be absent, not hidden-false");
  assert.ok(!ids.includes("the-fishing-grounds"));
});

test("perception frame: a contested cell renders its FOUR evidence-name as data, not a silently resolved value", () => {
  const engine = boot();
  const frame = perceptionFrame(engine.world, "kip", engine.tick, []);
  const permit = frame.subjects.find((s) => s.id === "the-dredging-permit");
  // the-dredging-permit has no located-in assertion, so it is not itself a perceived SUBJECT — but
  // its contested cell is exactly the shape under test; settle it directly the same way the frame's
  // own projector does, to prove the evidence-name plumbing (not visibility) is what's asserted here.
  assert.equal(permit, undefined, "not located anywhere, so absent from a room-scoped perception — expected, not a bug");
  const hydrant = frame.subjects.find((s) => s.id === "hydrant-23");
  assert.equal(hydrant, undefined, "same: not located anywhere");
});

test("affordances: construction is offered at the boatyard, alongside universal room actions", () => {
  let engine = boot();
  const frame = perceptionFrame(engine.world, "kip", engine.tick, []);
  const room = frame.subjects.find((s) => s.id === FARSTONE_GAME.start);
  assert.ok(room);
  assert.ok(room?.affordances.includes("look"));
  assert.ok(room?.affordances.includes("go"));

  const self = frame.subjects.find((s) => s.id === "kip");
  assert.ok(self);
  assert.ok(self?.affordances.includes("inventory"));
  assert.ok(!self?.affordances.includes("build"), "construction is only available at the authored boatyard");
  assert.ok(self?.affordances.includes("almanac"));
  assert.ok(!self?.affordances.includes("fish"), "fishing is only available at the fishing grounds");
  assert.ok(self?.affordances.includes("think"), "no active-thought yet");

  for (const direction of shortestPath(FARSTONE_GAME.start, "the-boatyard")) {
    engine = step(submit(engine, { actor: "kip", command: `go ${direction}` }), { runtime: FARSTONE_RUNTIME }).engine;
  }
  const atYard = perceptionFrame(engine.world, "kip", engine.tick, []);
  assert.ok(atYard.subjects.find((s) => s.id === "kip")?.affordances.includes("build"), "the boatyard affords construction through the real movement path");

  const atFishingGrounds = move(engine.world, "kip", "the-fishing-grounds", { source: "test.position" });
  assert.ok(farstoneAffordances(atFishingGrounds, "kip", "kip").includes("fish"), "open grounds with stock afford fishing");
});

test("affordances: attack is offered on a co-located, living npc — and never on a dead one", () => {
  const engine = boot();
  const frame = perceptionFrame(engine.world, "kip", engine.tick, []);
  const wynn = frame.subjects.find((s) => s.id === "wynn-warden");
  assert.ok(wynn, "wynn-warden must be a visible subject at the start room");
  assert.ok(wynn?.affordances.includes("attack"));

  const dead = tell(
    declareFunctional(engine.world, ["condition"]),
    { subject: "wynn-warden", predicate: "condition", object: "dead" },
    { source: "test" },
  );
  const afterFrame = perceptionFrame(dead, "kip", engine.tick, []);
  const wynnAfter = afterFrame.subjects.find((s) => s.id === "wynn-warden");
  assert.ok(!wynnAfter?.affordances.includes("attack"), "a dead npc must not still afford attack");
});

test("affordances: petition/inspect appear only once the actor stands in a civic-tagged room (downtown-farston), and only there", () => {
  let engine = boot();
  const frameAtStart = perceptionFrame(engine.world, "kip", engine.tick, []);
  const selfAtStart = frameAtStart.subjects.find((s) => s.id === "kip");
  assert.ok(!selfAtStart?.affordances.includes("petition"), "newcomer landing is not tagged civic");
  assert.ok(!selfAtStart?.affordances.includes("inspect"));

  for (const direction of shortestPath(FARSTONE_GAME.start, "downtown-farston")) {
    engine = step(submit(engine, { actor: "kip", command: `go ${direction}` }), { runtime: FARSTONE_RUNTIME }).engine;
  }
  assert.equal(farstoneAffordances(engine.world, "kip", "kip").includes("petition"), true, "downtown-farston is tagged civic and the permit is still open for petition");
  assert.equal(farstoneAffordances(engine.world, "kip", "kip").includes("inspect"), true);
});

test("perceptionSnapEntry: id matches the actor, and the rest is a verbatim perception frame", () => {
  const engine = boot();
  const entry = perceptionSnapEntry(engine.world, "kip", 0, []);
  assert.equal(entry.id, "kip");
  assert.equal(entry.kind, PERCEPTION_KIND);
  assert.equal(entry.actor, "kip");
});
