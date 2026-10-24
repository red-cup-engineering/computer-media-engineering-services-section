import assert from "node:assert/strict";
import { test } from "node:test";
import { createEngine } from "@red-cup-engineering/feltos/engine";
import { createMudServer } from "@red-cup-engineering/feltos/mud-server";
import { FARSTONE_GAME, FARSTONE_RUNTIME } from "./farstone-game.mts";
import { createWorldRuntime, openClockStore, openWorldStore } from "@red-cup-engineering/feltos/world-host";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";


// trackConcurrency — counts calls currently inside `fn` at once, tracking the historical max.
// Instruments directly the one number the single-flight fix promises to hold at exactly 1: how
// many `save()` calls (against the store/clockStore this flush actually persists to) are ever
// in flight simultaneously.
function trackConcurrency<T>(fn: (arg: T) => Promise<void>): {
  wrapped: (arg: T) => Promise<void>;
  state: { active: number; maxActive: number; calls: number };
} {
  const state = { active: 0, maxActive: 0, calls: 0 };
  const wrapped = async (arg: T): Promise<void> => {
    state.active++;
    state.calls++;
    state.maxActive = Math.max(state.maxActive, state.active);
    try {
      await fn(arg);
    } finally {
      state.active--;
    }
  };
  return { wrapped, state };
}

test(
  "concurrency: 20 concurrent preRequestCatchUp() calls against delayed local file saves never overlap a flush, never double-count ticks, stay memory-bounded, and all complete",
  async (t) => {
    const directory = await mkdtemp(join(tmpdir(), "farstone-world-"));
    t.after(() => rm(directory, { recursive: true, force: true }));

    const worldBackend = { kind: "file" as const, path: join(directory, "world.json") };
    const rawStore = openWorldStore(worldBackend)!;
    const rawClockStore = openClockStore(worldBackend)!;
    const engineSaves = trackConcurrency<unknown>(async (engine) => {
      await new Promise((resolve) => setTimeout(resolve, 40));
      await rawStore.save(engine);
    });
    const clockSaves = trackConcurrency<{ lastTickAt: number }>(async (state) => {
      await new Promise((resolve) => setTimeout(resolve, 40));
      await rawClockStore.save(state);
    });
    const store = { save: engineSaves.wrapped };
    const clockStore = { save: clockSaves.wrapped };

    const engine = createEngine(FARSTONE_GAME);
    const mud = createMudServer(FARSTONE_GAME, { runtime: FARSTONE_RUNTIME, engine, maxAssertions: 20_000 });
    const tickLog: number[] = [];
    const trackedMud = {
      tick: () => {
        const receipt = mud.tick();
        tickLog.push(mud.engine().tick as number);
        return receipt;
      },
      engine: () => mud.engine(),
    };

    const tickIntervalMs = 50;
    const now = () => Date.now();
    // A real, unpadded 3-second idle gap: comfortably more than `maxCatchUpTicksPerRequest *
    // tickIntervalMs` (10 * 50ms = 500ms), so the very first request's catch-up is capped and
    // leaves a real remainder for concurrent siblings to (safely, singly-flighted) keep chewing
    // through — the same "way more owed than one request should run" shape the live bug hit.
    const lastTickAtStart = Date.now() - 3000;

    const runtime = createWorldRuntime(trackedMud, {
      tickIntervalMs,
      maxCatchUpTicksPerRequest: 10,
      now,
      lastTickAt: lastTickAtStart,
      store,
      clockStore,
    });

    const CONCURRENT_REQUESTS = 20;
    const results = await Promise.allSettled(
      Array.from({ length: CONCURRENT_REQUESTS }, () => runtime.preRequestCatchUp()),
    );

    // All requests complete despite overlapping callers and delayed filesystem writes.
    const rejected = results.filter((r) => r.status === "rejected");
    assert.deepEqual(
      rejected,
      [],
      `expected every concurrent request to complete; got rejections: ${rejected
        .map((r) => (r as PromiseRejectedResult).reason)
        .join("; ")}`,
    );

    // Exactly one in-flight flush at a time — the single-flight guarantee itself, measured
    // directly (not inferred from absence of symptoms). Both save() targets are checked
    // independently; either overlapping is the bug.
    assert.equal(
      engineSaves.state.maxActive,
      1,
      `engine store.save() overlapped itself — saw up to ${engineSaves.state.maxActive} concurrent calls (this is the exact mechanism behind the live "drop reverted" bug: an older-snapshot flush completing after a newer one)`,
    );
    assert.equal(
      clockSaves.state.maxActive,
      1,
      `clock store.save() overlapped itself — saw up to ${clockSaves.state.maxActive} concurrent calls`,
    );

    // Memory bounded: far fewer actual flushes than requests — coalescing into one queued
    // follow-up, not one queued payload per waiter.
    assert.ok(
      engineSaves.state.calls < CONCURRENT_REQUESTS / 2,
      `expected coalescing to keep the real flush count well under ${CONCURRENT_REQUESTS}, got ${engineSaves.state.calls} — memory grows with flush count (one engine snapshot per flush), so this bounds it`,
    );
    assert.equal(engineSaves.state.calls, clockSaves.state.calls, "clock and engine are flushed in lockstep, every flush");

    // No double-counted ticks: the total ticks actually run can never exceed what real elapsed
    // time could plausibly owe (plus one cap's worth of slack for scheduling jitter), and the
    // sequence of tick receipts is strictly increasing — no two catch-up passes ever interleaved
    // their tick() calls against each other.
    const elapsedMs = Date.now() - lastTickAtStart;
    const maxPlausibleTicks = Math.ceil(elapsedMs / tickIntervalMs) + 10;
    assert.ok(
      tickLog.length <= maxPlausibleTicks,
      `ran ${tickLog.length} ticks but at most ~${maxPlausibleTicks} could plausibly be owed over ${elapsedMs}ms — ticks were double-counted`,
    );
    assert.deepEqual(
      tickLog,
      [...tickLog].sort((a, b) => a - b),
      "tick receipts ran in strictly increasing order — no two catch-up passes interleaved their tick() calls",
    );

    // Final persisted state matches final live state — the actual live-incident symptom (a
    // stale, out-of-order-completing flush overwriting newer state) never happens here: whichever
    // flush ran last persisted the truth, not a snapshot captured earlier and delivered late.
    const persisted = (await rawStore.load(() => {
      throw new Error("expected a real saved snapshot");
    })) as { tick: number };
    assert.equal(
      persisted.tick,
      mud.engine().tick,
      "the persisted engine snapshot must match the final live tick count, not an earlier, since-superseded one",
    );
  },
);
