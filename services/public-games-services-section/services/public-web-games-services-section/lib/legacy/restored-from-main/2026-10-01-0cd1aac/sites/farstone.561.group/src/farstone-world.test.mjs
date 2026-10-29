// farstone-world.test — content integrity for docs/world/harbor.json, the authored world bible.
// The engine trusts the bible completely (gameFromBible does no validation), so this file is the
// gate that keeps authored world content loadable: unique ids, every exit landing on a real room,
// every item/npc seated in a real room or on a real entity, every walkable room reachable from the
// player's start, and prose on everything a player can look at.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createEngine, join, step, submit } from "@red-cup-engineering/feltos/engine";
import { value, values } from "@red-cup-engineering/feltos/world";
import { FARSTONE_GAME, FARSTONE_RUNTIME, HARBOR_BIBLE } from "./farstone-game.mjs";

const rooms = HARBOR_BIBLE.rooms;
const entities = [...(HARBOR_BIBLE.items ?? []), ...(HARBOR_BIBLE.npcs ?? []), ...(HARBOR_BIBLE.ships ?? [])];
const roomIds = new Set(rooms.map((room) => room.id));
const entityIds = new Set(entities.map((entity) => entity.id));

test("every id in the bible is unique across rooms, items, npcs, and ships", () => {
  const all = [...rooms, ...entities].map((entry) => entry.id);
  const seen = new Set();
  for (const id of all) {
    assert.ok(!seen.has(id), `duplicate id: ${id}`);
    seen.add(id);
  }
});

test("every room exit leads to a room that exists", () => {
  for (const room of rooms) {
    for (const [direction, target] of Object.entries(room.exits ?? {})) {
      assert.ok(roomIds.has(target), `${room.id} exits ${direction} to missing room ${target}`);
    }
  }
});

test("every item, npc, and ship is located in a real room or on a real entity", () => {
  for (const entity of entities) {
    const location = entity.location;
    assert.ok(typeof location === "string" && location.length > 0, `${entity.id} has no location`);
    assert.ok(
      roomIds.has(location) || entityIds.has(location),
      `${entity.id} is located in ${location}, which is neither a room nor an entity`,
    );
  }
});

test("every room is reachable from the player start by walking exits", () => {
  const start = HARBOR_BIBLE.meta.playerStart;
  assert.ok(roomIds.has(start), `playerStart ${start} is not a room`);
  const reached = new Set([start]);
  const queue = [start];
  while (queue.length > 0) {
    const here = queue.shift();
    const room = rooms.find((candidate) => candidate.id === here);
    for (const target of Object.values(room.exits ?? {})) {
      if (!reached.has(target)) {
        reached.add(target);
        queue.push(target);
      }
    }
  }
  for (const room of rooms) assert.ok(reached.has(room.id), `${room.id} is unreachable from ${start}`);
});

test("everything a player can look at carries a name and a described voice", () => {
  for (const entry of [...rooms, ...entities]) {
    assert.ok(entry.name.length > 0, `${entry.id} has no name`);
    assert.ok(entry.description.length >= 40, `${entry.id}'s description is too thin to read aloud`);
  }
});

test("the bible builds into the game the engine boots, expanded by the deterministic Farstone Wild", () => {
  const shipRoomCount = HARBOR_BIBLE.ships?.reduce((count, ship) => count + (ship.rooms?.length ?? 0), 0) ?? 0;
  assert.equal(Object.keys(FARSTONE_GAME.rooms).length, rooms.length + shipRoomCount + 40);
  for (const entity of entities) assert.ok(entity.id in FARSTONE_GAME.things, `${entity.id} missing from game things`);
  assert.equal(FARSTONE_GAME.start, HARBOR_BIBLE.meta.playerStart);
});

test("the live island contains the replayable forty-place Wild frontier", () => {
  const wild = Object.entries(FARSTONE_GAME.rooms).filter(([id]) => id.startsWith("farstone-wild-"));
  assert.equal(wild.length, 40);
  assert.equal(FARSTONE_GAME.rooms["harbor-quay"].exits.wild, "farstone-wild-001");
  const world = createEngine(FARSTONE_GAME).world;
  assert.deepEqual(new Set(wild.flatMap(([id]) => values(world, id, "tag")).filter((tag) => typeof tag === "string" && tag.startsWith("biome:"))), new Set(["biome:coast", "biome:moor", "biome:marsh", "biome:forest", "biome:highland"]));
});

test("the island's foundational mountain, harbor, river, marsh, and safety details remain playable", () => {
  const world = createEngine(FARSTONE_GAME).world;
  for (const [item, place] of [
    ["the-ridge-trail-map", "the-ridge"],
    ["the-harbor-bell", "harbor-quay"],
    ["the-storm-lantern", "south-point-light"],
    ["the-net-coil", "the-fishing-grounds"],
  ]) {
    assert.equal(value(world, item, "located-in"), place, `${item} remains situated in the current island`);
  }
});

test("the off-season cast remains authored as situated people with live pressures", () => {
  const world = createEngine(FARSTONE_GAME).world;
  const cast = [
    ["nessa-cawl", "the-saltloft-inn", "cheerful"],
    ["old-pell", "the-ferry-terminal", "watchful"],
    ["coilin-vey", "the-boatyard", "hot-headed"],
    ["brannaugh-ross", "the-marsh", "cold"],
    ["sister-edda", "the-chapel", "kind"],
    ["hale-branning", "branning-farm", "gruff"],
    ["mireille-dax", "the-council-hall", "cautious"],
    ["old-fenwick", "the-clam-flats", "anxious"],
  ];
  for (const [npc, home, trait] of cast) {
    assert.equal(value(world, npc, "kind"), "npc", `${npc} is a living inhabitant`);
    assert.equal(value(world, npc, "home"), home, `${npc} keeps a real home`);
    assert.ok(values(world, npc, "trait").includes(trait), `${npc} retains a defining disposition`);
    for (const need of ["hunger", "rest", "recreation"]) {
      const amount = Number(value(world, npc, `need:${need}`));
      assert.ok(amount >= 0 && amount <= 100, `${npc} has a bounded ${need} pressure`);
    }
  }
});

test("a traveler shares the Saltloft's finite food, rest, and recreation", () => {
  let engine = join(createEngine(FARSTONE_GAME), "traveler", { at: "the-saltloft-inn" });
  engine = submit(engine, { actor: "traveler", command: "eat stew" });
  const result = step(engine, { runtime: FARSTONE_RUNTIME });
  assert.match(result.receipt.events[0].text, /You eat at the Saltloft's fish-stew pot/u);
  assert.equal(value(result.engine.world, "the-stew-pot", "amount"), 29);
  assert.equal(value(result.engine.world, "traveler", "need:hunger"), 1);
  assert.ok(FARSTONE_GAME.capabilities.includes("feltos.needs"));
});

test("the commons retain authored recovery rates rather than one global scarcity curve", () => {
  const world = createEngine(FARSTONE_GAME).world;
  assert.ok(Number(value(world, "the-spring-house", "resource-growth-rate:water")) > Number(value(world, "the-clam-flats", "resource-growth-rate:shellfish")));
  assert.ok(Number(value(world, "the-clam-flats", "resource-cleanup-rate:shellfish")) > Number(value(world, "branning-farm", "resource-cleanup-rate:food")));
});
