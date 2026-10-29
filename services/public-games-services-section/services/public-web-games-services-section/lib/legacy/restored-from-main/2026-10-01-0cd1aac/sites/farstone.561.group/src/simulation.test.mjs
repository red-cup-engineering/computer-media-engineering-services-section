import assert from "node:assert/strict";
import { test } from "node:test";
import { createEngine, step } from "@red-cup-engineering/feltos/engine";
import { snapshotEngine } from "@red-cup-engineering/feltos/engine-snapshot";
import { clockReport } from "@red-cup-engineering/feltos/world-clock";
import { placeOf, value } from "@red-cup-engineering/feltos/world";
import { FARSTONE_GAME, FARSTONE_RUNTIME } from "./farstone-game.mjs";

function simulate(ticks) {
  let engine = createEngine(FARSTONE_GAME);
  const weather = new Set();
  const places = new Set();
  let minStock = Infinity;
  let minPrice = Infinity;
  for (let tick = 0; tick < ticks; tick++) {
    engine = step(engine, { runtime: FARSTONE_RUNTIME }).engine;
    weather.add(String(clockReport(engine.world).weather));
    places.add(placeOf(engine.world, "dax-pell") ?? "nowhere");
    minStock = Math.min(minStock, Number(value(engine.world, "the-fishing-grounds", "resource-stock:fish") ?? 40));
    minPrice = Math.min(minPrice, Number(value(engine.world, "a-coil-of-rope", "price")));
  }
  return { engine, weather, places, minStock, minPrice };
}

test("the authored island sustains varied deterministic autonomous activity", () => {
  const first = simulate(500);
  const second = simulate(500);
  assert.deepEqual(snapshotEngine(first.engine), snapshotEngine(second.engine));
  assert.ok(first.weather.size >= 3);
  assert.ok(first.places.size >= 3);
  assert.ok(first.minStock >= 0 && first.minStock <= 40);
  assert.equal(first.minPrice, 25, "untraded physical wares keep their authored price");
});
