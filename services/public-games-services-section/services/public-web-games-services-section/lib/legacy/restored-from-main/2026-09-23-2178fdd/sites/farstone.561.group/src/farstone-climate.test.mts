import assert from "node:assert/strict";
import { test } from "node:test";
import { composeCapabilities } from "@red-cup-engineering/feltos/capabilities";
import { createEngine, join, step, submit } from "@red-cup-engineering/feltos/engine";
import { defineGame } from "@red-cup-engineering/feltos/game";
import { checkpointEngine } from "@red-cup-engineering/feltos/persistence";
import { CLOCK, PHASE_LENGTH, SEASON_LENGTH, clockReport, seasonAt, weatherAt } from "@red-cup-engineering/feltos/world-clock";
import { value } from "@red-cup-engineering/feltos/world";
import { farstoneClimateCapability, farstoneClimateReport } from "./farstone-climate.mts";
import { FARSTONE_GAME, FARSTONE_RUNTIME } from "./farstone-game.mts";

test("Farstone climate turns a complete deterministic year and reports advisories", () => {
  let engine = join(createEngine(FARSTONE_GAME), "weather-reader");
  const seasons = new Set<string>();
  const weather = new Set<string>();
  for (let time = 0; time < 2_900; time++) {
    seasons.add(seasonAt(time));
    weather.add(weatherAt(FARSTONE_GAME.id, time));
  }
  for (let tick = 0; tick < 100; tick++) {
    engine = step(engine, { runtime: FARSTONE_RUNTIME }).engine;
    if (tick % 32 === 31) engine = checkpointEngine(engine);
  }
  assert.deepEqual([...seasons].sort(), ["autumn", "spring", "summer", "winter"]);
  assert.ok(weather.size >= 3);
  assert.equal(clockReport(engine.world).time, 100);
  assert.equal(typeof farstoneClimateReport(engine.world).harborClosed, "boolean");
  engine = submit(engine, { actor: "weather-reader", command: "almanac" });
  const result = step(engine, { runtime: FARSTONE_RUNTIME });
  assert.match(result.receipt.events[0]!.text, /Almanac of Farstone/u);
});

// A minimal island, standing in for the real Bible, so the climate couplings that only fire
// under specific weather/season/rainfall states can be driven directly and cheaply, the same
// way farstone-arcs.test.mts drives its own isolated fixture rather than the full harbor.json.
const CLIMATE_RUNTIME = composeCapabilities([farstoneClimateCapability]);

function climateIslandGame(assertions: { subject: string; predicate: string; object: unknown }[] = []) {
  return defineGame({
    id: "farstone.climate-island",
    name: "Climate Test Island",
    start: "quay",
    capabilities: [farstoneClimateCapability.id],
    // The real game centrally registers these in farstone-game.mts's `functionalPredicates`;
    // this standalone fixture has to declare its own so "latest wins" settles each cell (a
    // storm passing, rainfall rising and falling, a closure lifting) to one live value instead
    // of an unresolved contradiction.
    functionalPredicates: ["farstone-weather", "harbor-closed", "shellfish-closed", "recent-rainfall", "fire-danger", "sailing"],
    rooms: {
      quay: { name: "The Quay", description: "Granite and tar, and the ferry slip alongside.", exits: {} },
      marsh: { name: "The Salt Marsh", description: "Spartina and tidal mud.", exits: {} },
    },
    things: {
      "the-ferry": { name: "the ferry", description: "The morning boat.", location: "quay" },
    },
    assertions: [
      { subject: "quay", predicate: "tag", object: "harbor" },
      { subject: "quay", predicate: "tag", object: "ferry" },
      { subject: "marsh", predicate: "tag", object: "marsh" },
      { subject: "marsh", predicate: "tag", object: "shellfish" },
      { subject: "the-ferry", predicate: "tag", object: "ferry" },
      ...assertions,
    ],
  });
}

function tick(engine: any) {
  return step(engine, { runtime: CLIMATE_RUNTIME });
}

function textTo(result: any, actor: string): string {
  return result.receipt.events.filter(({ to }: any) => to === actor).map(({ text }: any) => text).join("\n");
}

test("a storm closes the harbor, cancels the ferry, and posts notices to the harbor and ferry rooms", () => {
  // world-time 1 is mid-phase (PHASE_LENGTH=6), so the weather asserted below is read as-is,
  // not rerolled, on this tick.
  const game = climateIslandGame([
    { subject: CLOCK, predicate: "world-time", object: 1 },
    { subject: "farstone:climate", predicate: "farstone-weather", object: "storm" },
  ]);
  const engine = join(createEngine(game), "alice");
  const result = tick(engine);
  assert.equal(value(result.engine.world, "farstone:climate", "harbor-closed"), true, "the storm shuts the harbor");
  assert.equal(value(result.engine.world, "the-ferry", "sailing"), "cancelled", "the cascade cancels the ferry");
  const text = textTo(result, "alice");
  assert.match(text, /Storm cones run up the signal mast/u, "the harbor room hears the closure");
  assert.match(text, /SAILING CANCELLED/u, "the ferry room hears the cancellation");
});

test("clearing weather reopens the harbor and reschedules the ferry", () => {
  const game = climateIslandGame([
    { subject: CLOCK, predicate: "world-time", object: 1 },
    { subject: "farstone:climate", predicate: "farstone-weather", object: "clear" },
    { subject: "farstone:climate", predicate: "harbor-closed", object: true },
  ]);
  const engine = join(createEngine(game), "alice");
  const result = tick(engine);
  assert.equal(value(result.engine.world, "farstone:climate", "harbor-closed"), false, "calm reopens the harbor");
  assert.equal(value(result.engine.world, "the-ferry", "sailing"), "scheduled");
  assert.match(textTo(result, "alice"), /storm cones come down/u);
});

test("a wet summer boundary closes the shellfish bed via the recent-rainfall accumulator", () => {
  // SEASON_LENGTH (=summer's start) + PHASE_LENGTH lands exactly on a phase boundary, still summer.
  const boundaryTime = SEASON_LENGTH + PHASE_LENGTH;
  const game = climateIslandGame([
    { subject: CLOCK, predicate: "world-time", object: boundaryTime },
    { subject: "farstone:climate", predicate: "recent-rainfall", object: 10 },
  ]);
  const engine = join(createEngine(game), "clerk", { at: "marsh" });
  const result = tick(engine);
  assert.equal(value(result.engine.world, "farstone:climate", "shellfish-closed"), true, "warm, freshened water shuts the clam bed");
  assert.equal(value(result.engine.world, "marsh", "shellfish-closed"), true, "the closure settles on the marsh room itself");
  assert.match(textTo(result, "clerk"), /shellfish closure/u, "the marsh room hears the closure notice");
});

test("farstoneClimateReport exposes Farstone's own richer weather alongside the shared clock's generic weather", () => {
  const game = climateIslandGame([
    { subject: CLOCK, predicate: "world-time", object: 1 },
    { subject: "farstone:climate", predicate: "farstone-weather", object: "fog" },
  ]);
  const engine = join(createEngine(game), "skipper");
  const result = tick(engine);
  const report = farstoneClimateReport(result.engine.world);
  assert.equal(report.farstoneWeather, "fog", "the richer five-state model is exposed under its own field");
  assert.equal(typeof report.weather, "string", "the shared clock's own generic weather field is untouched and still present");
});
