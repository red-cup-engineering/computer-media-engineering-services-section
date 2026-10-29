import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveStoreRoot } from "../server.mts";
test("the configured data directory is preserved even with stale bucket environment", () => {
  assert.equal(resolveStoreRoot("/app/data/", {RUINFOLD_BUCKET:"retired"}), "/app/data/");
});
