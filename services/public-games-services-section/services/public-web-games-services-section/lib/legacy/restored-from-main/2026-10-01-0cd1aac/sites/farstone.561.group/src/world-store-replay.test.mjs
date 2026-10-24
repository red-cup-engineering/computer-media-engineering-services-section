import assert from "node:assert/strict";
import { test } from "node:test";
import { createEngine, step } from "@red-cup-engineering/feltos/engine";
import { snapshotEngine } from "@red-cup-engineering/feltos/engine-snapshot";
import { value } from "@red-cup-engineering/feltos/world";
import { FARSTONE_RUNTIME, gameFromBible } from "./farstone-game.mjs";
import { openWorldStore } from "@red-cup-engineering/feltos/world-host";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("eight Farstone years, saved and loaded through the local snapshot path, remain replay-exact", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "farstone-world-"));
    t.after(() => rm(directory, { recursive: true, force: true }));
  const store = openWorldStore({ kind: "file", path: join(directory, "world.json") });

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
  const before = snapshotEngine(engine);

  // The deploy-relevant act: persist the eight-year world to the local file, exactly as
  // serve.mts's periodic autosave and shutdown-time save do, then reload it exactly as
  // serve.mts does on boot — no shortcuts through in-memory state.
  await store.save(engine);
  const restored = await store.load(() => {
    throw new Error("fallback should not run: the eight-year world was just saved");
  });

  assert.deepEqual(snapshotEngine(restored), before);
  assert.ok(restored.world.revisions[0].cells.some(({ subject, predicate, object }) => subject === "quay" && predicate === "name" && object === "Quay"));
  assert.equal(value(restored.world, "fisher", "name"), "Fisher");
  assert.equal(engine.tick, 26_880);
  assert.equal((restored).tick, 26_880);
});
