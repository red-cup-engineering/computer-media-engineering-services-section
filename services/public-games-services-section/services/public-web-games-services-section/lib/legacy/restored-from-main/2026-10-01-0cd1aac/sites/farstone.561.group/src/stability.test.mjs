import assert from "node:assert/strict";
import { test } from "node:test";
import { createEngine, step } from "@red-cup-engineering/feltos/engine";
import { restoreEngine, snapshotEngine } from "@red-cup-engineering/feltos/engine-snapshot";
import { value } from "@red-cup-engineering/feltos/world";
import { FARSTONE_RUNTIME, gameFromBible } from "./farstone-game.mjs";

test("eight Farstone years retain their causal history and observable world through restore", () => {
  const game = gameFromBible({
    meta: { world: "farstone-stability", playerStart: "quay" },
    rooms: [
      { id: "quay", name: "Quay", description: "Working stone.", exits: { north: "town" }, tags: ["harbor"] },
      { id: "town", name: "Town", description: "Civic blocks.", exits: { south: "quay" }, tags: ["civic"] },
    ],
    npcs: [
      { id: "fisher", name: "Fisher", description: "A worker.", location: "quay", tags: ["npc", "innkeeper", "rival:watch"] },
      { id: "watch", name: "Watch", description: "A constable.", location: "town", tags: ["npc", "faction:watch", "rival:fisher"] },
    ],
  });
  let engine = createEngine(game);
  for (let tick = 0; tick < 26_880; tick++) {
    engine = step(engine, { runtime: FARSTONE_RUNTIME }).engine;
  }
  const snapshot = snapshotEngine(engine);
  const restored = restoreEngine(JSON.parse(JSON.stringify(snapshot)));
  assert.deepEqual(snapshotEngine(restored), snapshot);
  assert.ok(restored.world.revisions[0].cells.some(({ subject, predicate, object }) => subject === "quay" && predicate === "name" && object === "Quay"));
  assert.equal(value(restored.world, "fisher", "name"), "Fisher");
  assert.equal(engine.tick, 26_880);
});
