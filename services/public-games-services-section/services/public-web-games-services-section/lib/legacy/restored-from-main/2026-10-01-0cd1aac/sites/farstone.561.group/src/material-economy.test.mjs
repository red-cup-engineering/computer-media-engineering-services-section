import { test } from "node:test";
import assert from "node:assert/strict";
import { createEngine, join, step, submit } from "@red-cup-engineering/feltos/engine";
import { cells, contentsOf, declareFunctional, move, outerPlaceOf, placeOf, tell, value, values } from "@red-cup-engineering/feltos/world";
import { FARSTONE_GAME, FARSTONE_RUNTIME } from "./farstone-game.mjs";
import { restoreEngine, snapshotEngine } from "@red-cup-engineering/feltos/engine-snapshot";
import { farstoneAffordances } from "./farstone-perception.mjs";

function shortestPath(world, from, to) {
  const queue = [[from, []]], visited = new Set([from]);
  while (queue.length) {
    const [room, path] = queue.shift();
    if (room === to) return path;
    const exits = cells(world, room)
      .filter(({ predicate }) => predicate.startsWith("exit:"))
      .map(({ predicate }) => [predicate.slice(5), value(world, room, predicate)])
      .filter(([, destination]) => typeof destination === "string"
        && !values(world, destination, "tag").includes("ocean"));
    for (const [direction, destination] of exits) {
      if (!visited.has(destination)) {
        visited.add(destination);
        queue.push([destination, [...path, direction]]);
      }
    }
  }
  throw new Error(`No route from ${from} to ${to}`);
}

function command(engine, actor, text) {
  return step(submit(engine, { actor, command: text }), { runtime: FARSTONE_RUNTIME }).engine;
}

test("Harbor shop journey buys real food, conserves coin, and consumes only owned stock", () => {
  let engine = join(createEngine(FARSTONE_GAME), "kip");
  engine = step(engine, { runtime: FARSTONE_RUNTIME }).engine;
  const actor = "kip";
  const route = shortestPath(engine.world, placeOf(engine.world, actor), "the-chandlery");
  for (const direction of route) engine = command(engine, actor, `go ${direction}`);
  assert.equal(placeOf(engine.world, actor), "the-chandlery");
  // The authored routine can take Yorrick away during the walk. Keep his
  // documented shop-attendance condition true across the purchase command's tick.
  const routinePredicates = ["routine:dawn", "routine:day", "routine:dusk", "routine:night"];
  const attendedShop = tell(declareFunctional(engine.world, routinePredicates), routinePredicates.map((predicate) => ({
    subject: "yorrick-vane", predicate, object: "the-chandlery",
  })), { source: "test.shop-attendance" });
  engine = { ...engine, world: move(attendedShop, "yorrick-vane", "the-chandlery", { source: "test.shop-attendance" }) };
  assert.ok(farstoneAffordances(engine.world, actor, "a-ships-biscuit").includes("buy"));
  assert.ok(!farstoneAffordances(engine.world, actor, "a-ships-biscuit").includes("take"));

  const biscuit = "a-ships-biscuit";
  const initialCoin = value(engine.world, actor, "coin");
  const initialKeeperCoin = value(engine.world, "yorrick-vane", "coin");
  const initialTotal = initialCoin + initialKeeperCoin;
  assert.ok(contentsOf(engine.world, "the-chandlery").includes(biscuit));
  assert.equal(contentsOf(engine.world, actor).includes(biscuit), false);

  engine = command(engine, actor, "eat biscuit");
  assert.equal(contentsOf(engine.world, "the-chandlery").includes(biscuit), true, "unowned shop food cannot be consumed");
  assert.equal(value(engine.world, biscuit, "amount"), 4);

  engine = command(engine, actor, "buy biscuit");
  assert.equal(placeOf(engine.world, biscuit), actor, `shortest path was ${route.join(", ")}`);
  assert.equal(value(engine.world, actor, "coin") + value(engine.world, "yorrick-vane", "coin"), initialTotal);
  assert.equal(value(engine.world, actor, "coin"), initialCoin - value(engine.world, biscuit, "price"));

  const hungerBefore = Number(value(engine.world, actor, "need:hunger") ?? 0);
  engine = command(engine, actor, "eat biscuit");
  assert.equal(value(engine.world, biscuit, "amount"), 3);
  assert.equal(Number(value(engine.world, actor, "need:hunger")), Math.max(0, hungerBefore - 60) + 1);
  assert.equal(contentsOf(engine.world, actor).includes(biscuit), true);
});

test("A player builds and sails a physical vessel with finite timber and conserved fees", () => {
  const actor = "shipwright";
  let engine = join(createEngine(FARSTONE_GAME), actor);
  engine = step(engine, { runtime: FARSTONE_RUNTIME }).engine;
  for (const direction of shortestPath(engine.world, placeOf(engine.world, actor), "the-boatyard")) engine = command(engine, actor, `go ${direction}`);
  const before = value(engine.world, actor, "coin");
  engine = command(engine, actor, "build raft Bracken");
  assert.equal(value(engine.world, actor, "coin"), before, "missing materials cannot debit a purse");
  engine = command(engine, actor, "take a stack of seasoned oak billets");
  engine = command(engine, actor, "build raft Bracken");
  const ship = contentsOf(engine.world, "the-boatyard").find((id) => value(engine.world, id, "name") === "Bracken");
  assert.ok(ship);
  assert.equal(value(engine.world, ship, "owner"), actor);
  assert.equal(value(engine.world, "an-oak-billet", "amount"), 4);
  assert.equal(value(engine.world, actor, "coin"), before - 15);
  assert.equal(value(engine.world, "the-boatyard", "coin"), 15);
  engine = command(engine, actor, "board Bracken");
  assert.equal(placeOf(engine.world, actor), value(engine.world, ship, "deck-room"));
  engine = command(engine, actor, "sail the-library");
  assert.equal(placeOf(engine.world, ship), "the-boatyard", "a vessel cannot teleport to an unrelated room");
  engine = command(engine, actor, "sail southeast");
  assert.equal(placeOf(engine.world, ship), "harbor-quay");
  engine = command(engine, actor, "sail seaward");
  assert.equal(placeOf(engine.world, ship), "harbor-mouth");
  engine = command(engine, actor, "sail north");
  assert.equal(placeOf(engine.world, ship), "the-fishing-grounds");
  const fishStock = Number(value(engine.world, "the-fishing-grounds", "resource-stock:fish"));
  engine = command(engine, actor, "fish");
  const fish = contentsOf(engine.world, actor).find((item) => value(engine.world, item, "ware-type") === "fish");
  assert.ok(fish, "a crew member can work the grounds while physically aboard");
  assert.equal(placeOf(engine.world, actor), value(engine.world, ship, "deck-room"));
  assert.equal(outerPlaceOf(engine.world, actor), "the-fishing-grounds");
  assert.ok(farstoneAffordances(engine.world, actor, actor).includes("fish"), "perception exposes the reachable gathering action aboard");
  const fishStockAfter = Number(value(engine.world, "the-fishing-grounds", "resource-stock:fish"));
  assert.ok(fishStockAfter < fishStock && fishStockAfter > fishStock - 1, "harvest lowers finite stock while the ecology's per-tick growth continues");
  engine = command(engine, actor, "sail south");
  assert.equal(placeOf(engine.world, ship), "harbor-mouth");
  engine = command(engine, actor, "sail shoreward");
  assert.equal(placeOf(engine.world, ship), "harbor-quay");
  engine = command(engine, actor, "disembark");
  assert.equal(placeOf(engine.world, actor), "harbor-quay");

  // Reach the authored chandlery by live exits and wait for its keeper's live routine/demand.
  // No actor or NPC is repositioned for delivery.
  let delivered = false;
  for (let attempt = 0; attempt < 24 && !delivered; attempt += 1) {
    const room = placeOf(engine.world, actor);
    if (room !== "the-chandlery") {
      const [direction] = shortestPath(engine.world, room, "the-chandlery");
      engine = command(engine, actor, `go ${direction}`);
      continue;
    }
    if (placeOf(engine.world, "yorrick-vane") === room
      && value(engine.world, "yorrick-vane", "wants") === "fish") {
      const playerBefore = value(engine.world, actor, "coin");
      const npcBefore = value(engine.world, "yorrick-vane", "coin");
      engine = command(engine, actor, `give a fresh fish to Yorrick Vane`);
      delivered = value(engine.world, fish, "owner") === "yorrick-vane";
      if (delivered) {
        assert.equal(value(engine.world, actor, "coin") + value(engine.world, "yorrick-vane", "coin"), playerBefore + npcBefore);
        assert.equal(placeOf(engine.world, fish), "yorrick-vane");
        assert.equal(value(engine.world, fish, "amount"), 1, "a supply demand transfers the fish for the keeper to use");
      }
    } else {
      engine = command(engine, actor, "look");
    }
  }
  assert.ok(delivered, JSON.stringify({
    tick: engine.tick,
    actor: placeOf(engine.world, actor),
    keeper: placeOf(engine.world, "yorrick-vane"),
    want: value(engine.world, "yorrick-vane", "wants"),
    fish: placeOf(engine.world, fish),
  }));

  for (const direction of shortestPath(engine.world, placeOf(engine.world, actor), "harbor-quay")) {
    engine = command(engine, actor, `go ${direction}`);
  }
  engine = command(engine, actor, "craft shack");
  const shack = contentsOf(engine.world, "harbor-quay").find((id) => value(engine.world, id, "kind") === "structure" && value(engine.world, id, "owner") === actor);
  assert.ok(shack, "construction still creates an owned structure through shared crafting");
  assert.equal(value(engine.world, shack, "name"), "a fishing shack");
  assert.equal(placeOf(engine.world, "an-oak-billet"), "feltos:void", "the remaining four billets become the shack");
  assert.equal(value(engine.world, actor, "structures-built"), 2);
  engine = command(engine, actor, "craft shack");
  assert.equal(contentsOf(engine.world, "harbor-quay").filter((id) => value(engine.world, id, "kind") === "structure" && value(engine.world, id, "owner") === actor).length, 1, "exhausted timber cannot produce a second shack");
});

test("Farstone admits its authored character before a tick and restores lived state", () => {
  let engine = join(createEngine(FARSTONE_GAME), "newcomer");
  assert.equal(engine.tick, 0);
  assert.equal(value(engine.world, "newcomer", "coin"), 250);
  assert.equal(value(engine.world, "newcomer", "health"), 20);
  assert.equal(value(engine.world, "newcomer", "knows-spell:spark"), true);
  engine = { ...engine, world: tell(engine.world, [
    { subject: "newcomer", predicate: "coin", object: 14 },
    { subject: "newcomer", predicate: "health", object: 6 },
    { subject: "newcomer", predicate: "located-in", object: "the-library" },
  ]) };
  const restored = join(restoreEngine(JSON.parse(JSON.stringify(snapshotEngine(engine)))), "newcomer");
  assert.equal(value(restored.world, "newcomer", "coin"), 14);
  assert.equal(value(restored.world, "newcomer", "health"), 6);
  assert.equal(placeOf(restored.world, "newcomer"), "the-library");
});
