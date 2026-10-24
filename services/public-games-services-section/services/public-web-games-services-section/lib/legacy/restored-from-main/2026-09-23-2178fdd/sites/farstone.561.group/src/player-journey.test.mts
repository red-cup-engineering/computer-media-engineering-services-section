import assert from "node:assert/strict";
import { test } from "node:test";
import { createEngine, join, step, submit } from "@red-cup-engineering/feltos/engine";
import { initializeClock } from "@red-cup-engineering/feltos/world-clock";
import { placeOf, tell, value } from "@red-cup-engineering/feltos/world";
import { FARSTONE_GAME, FARSTONE_RUNTIME } from "./farstone-game.mts";

function act(engine: any, line: string, actor = "hero") {
  return step(submit(engine, { actor, command: line }), { runtime: FARSTONE_RUNTIME }).engine;
}

test("a new arrival enters through the playable onboarding route", () => {
  let engine = join(createEngine(FARSTONE_GAME), "arrival");
  assert.equal(placeOf(engine.world, "arrival"), "newcomer-landing");
  const guidance = step(submit(engine, { actor: "arrival", command: "look the arrivals board" }), { runtime: FARSTONE_RUNTIME });
  assert.match(guidance.receipt.events[0].text, /ferry rules, safe places to sleep, the bell signal for help/u);
  engine = guidance.engine;
  for (const line of ["go up", "go up", "go north", "go down"]) engine = act(engine, line, "arrival");
  assert.equal(placeOf(engine.world, "arrival"), "harbor-quay");
});

test("a new arrival can practise combat safely in the common yard", () => {
  let engine = join(createEngine(FARSTONE_GAME), "trainee");
  assert.equal(placeOf(engine.world, "trainee"), "newcomer-landing");
  engine = act(engine, "go up", "trainee");
  assert.equal(placeOf(engine.world, "trainee"), "the-wardens-walk");
  assert.equal(value(engine.world, "the-wardens-walk", "exit:up"), "the-tutorial-yard");
  engine = act(engine, "go up", "trainee");
  assert.equal(placeOf(engine.world, "trainee"), "the-tutorial-yard");
  assert.equal(placeOf(engine.world, "the-practice-post"), "the-tutorial-yard");
  const result = step(submit(engine, { actor: "trainee", command: "practice practice post" }), { runtime: FARSTONE_RUNTIME });
  assert.match(result.receipt.events[0].text, /reset for the next learner/u);
  assert.equal(value(result.engine.world, "the-practice-post", "health"), 20);
  assert.equal(value(result.engine.world, "the-practice-post", "condition"), "alive");
  assert.equal(value(result.engine.world, "the-practice-post", "wound"), 0);
  const take = step(submit(result.engine, { actor: "trainee", command: "take practice post" }), { runtime: FARSTONE_RUNTIME });
  assert.match(take.receipt.events[0].text, /cannot take/u);
  assert.equal(placeOf(take.engine.world, "the-practice-post"), "the-tutorial-yard");
});

test("the Farstone cast keeps its authored workday and inn-night routines", () => {
  let engine = createEngine(FARSTONE_GAME);
  engine = { ...engine, world: initializeClock(engine.world, { time: 5 }) };
  engine = step(engine, { runtime: FARSTONE_RUNTIME }).engine;
  assert.equal(placeOf(engine.world, "yorrick-vane"), "the-chandlery");
  assert.equal(placeOf(engine.world, "greer-tenn"), "market-row");
  assert.equal(placeOf(engine.world, "father-coll"), "the-chapel");
  assert.equal(placeOf(engine.world, "tomas-strake"), "the-quarry");
  engine = { ...engine, world: initializeClock(engine.world, { time: 17 }) };
  engine = step(engine, { runtime: FARSTONE_RUNTIME }).engine;
  assert.equal(placeOf(engine.world, "yorrick-vane"), "the-saltloft-inn");
  assert.equal(placeOf(engine.world, "greer-tenn"), "the-saltloft-inn");
  assert.equal(placeOf(engine.world, "father-coll"), "the-almshouse");
  assert.equal(placeOf(engine.world, "tomas-strake"), "the-saltloft-inn");
});

test("a player completes the Off-Season through ordinary current commands", () => {
  let engine = join(createEngine(FARSTONE_GAME), "hero", { at: "harbor-quay" });
  for (let count = 0; count < 16; count++) engine = act(engine, "work");
  engine = act(engine, "think");
  for (let count = 0; count < 32; count++) engine = step(engine, { runtime: FARSTONE_RUNTIME }).engine;
  engine = act(engine, "build");
  engine = act(engine, "go north");
  engine = act(engine, "petition brannaugh");
  engine = step(engine, { runtime: FARSTONE_RUNTIME }).engine;
  assert.equal(value(engine.world, "hero", "campaign-stage"), 6);
  assert.ok(Number(value(engine.world, "hero", "coin")) > 0);
  assert.ok(Number(value(engine.world, "hero", "skill")) >= 15);
  assert.ok(Number(value(engine.world, "hero", "thoughts-fixed")) >= 1);
  assert.ok(Number(value(engine.world, "hero", "structures-built")) >= 1);
  assert.equal(placeOf(engine.world, "hero"), "downtown-farston");
});

test("a player can deepen devotion and invoke a live Maraset rite", () => {
  let engine = join(createEngine(FARSTONE_GAME), "devotee", { at: "harbor-quay" });
  for (const line of ["go west", "go west", "go north", "go east", "pray", "invoke benediction"]) engine = step(
    submit(engine, { actor: "devotee", command: line }), { runtime: FARSTONE_RUNTIME },
  ).engine;
  assert.equal(placeOf(engine.world, "devotee"), "the-chapel");
  assert.equal(value(engine.world, "devotee", "piety"), 0, "the rite spends the prayer's piety");
  assert.equal(value(engine.world, "devotee", "condition"), "blessed");
});

test("a player can inspect live market supply and value before trading", () => {
  let engine = join(createEngine(FARSTONE_GAME), "merchant", { at: "market-row" });
  engine = submit(engine, { actor: "merchant", command: "wares" });
  engine = submit(engine, { actor: "merchant", command: "value fish" });
  const result = step(engine, { runtime: FARSTONE_RUNTIME });
  assert.match(result.receipt.events[0].text, /fish \(2\.00 coin, 6 available\)/u);
  assert.match(result.receipt.events[1].text, /fish is worth 2\.00 coin/u);
});

test("a player can join the situated Mariners' Guild", () => {
  let engine = join(createEngine(FARSTONE_GAME), "deckhand", { at: "the-net-loft" });
  engine = submit(engine, { actor: "deckhand", command: "join mariners" });
  const result = step(engine, { runtime: FARSTONE_RUNTIME });
  assert.match(result.receipt.events[0].text, /Guild-Master Orla/u);
  assert.equal(value(result.engine.world, "deckhand", "guild"), "farstone-mariners-guild");
});

test("a player can turn harbor hemp into a usable mended net at the Net Loft", () => {
  let engine = join(createEngine(FARSTONE_GAME), "net-mender", { at: "harbor-quay" });
  engine = act(engine, "take a-mooring-line", "net-mender");
  engine = act(engine, "go northeast", "net-mender");
  engine = act(engine, "go east", "net-mender");
  assert.equal(placeOf(engine.world, "net-mender"), "the-net-loft");
  const result = step(submit(engine, { actor: "net-mender", command: "craft mend-net" }), { runtime: FARSTONE_RUNTIME });
  assert.match(result.receipt.events[0].text, /You craft a mended fishing net/u);
  const output = result.engine.world.assertions.find((assertion: any) => assertion.source === "feltos.crafting.produce" && assertion.predicate === "located-in")?.subject;
  assert.equal(typeof output, "string");
  assert.equal(value(result.engine.world, output!, "tool"), "fishing");
  assert.equal(value(result.engine.world, output!, "condition"), "mended");
});

test("a player can preserve market fish at the Saltloft and eat it while travelling", () => {
  let engine = join(createEngine(FARSTONE_GAME), "traveler", { at: "market-row" });
  engine = { ...engine, world: tell(engine.world, { subject: "traveler", predicate: "coin", object: 10 }) };
  engine = act(engine, "buy fish", "traveler");
  engine = act(engine, "go north", "traveler");
  assert.equal(placeOf(engine.world, "traveler"), "the-saltloft-inn");
  engine = act(engine, "craft smoke-fish", "traveler");
  const result = step(submit(engine, { actor: "traveler", command: "eat smoked fish" }), { runtime: FARSTONE_RUNTIME });
  assert.match(result.receipt.events[0].text, /You eat at a side of smoked fish/u);
  const provision = result.engine.world.assertions.find((assertion: any) => assertion.source === "feltos.crafting.produce" && assertion.predicate === "located-in")?.subject;
  assert.equal(value(result.engine.world, provision!, "amount"), 0);
  assert.equal(value(result.engine.world, "traveler", "need:hunger"), 1, "the turn clock advances after the provision satisfies hunger");
});

test("the guild and earned calling are inspectable in the live world", () => {
  let engine = join(createEngine(FARSTONE_GAME), "hand", { at: "the-net-loft" });
  engine = act(engine, "guilds", "hand");
  engine = act(engine, "title", "hand");
  assert.equal(value(engine.world, "hand", "campaign-stage"), 0);
});

test("the live Off-Season campaign is inspectable as a player journal", () => {
  let engine = join(createEngine(FARSTONE_GAME), "newcomer");
  engine = submit(engine, { actor: "newcomer", command: "quest" });
  const result = step(engine, { runtime: FARSTONE_RUNTIME });
  assert.match(result.receipt.events[0].text, /The Off-Season — 1\/6: Find Your Feet/u);
  assert.match(result.receipt.events[0].text, /Reward: 25 coin/u);
});

test("a player can study, list, and cast a current chapel spell", () => {
  let engine = join(createEngine(FARSTONE_GAME), "student", { at: "the-chapel" });
  for (const line of ["learn frostbite", "spells", "cast frostbite"]) engine = act(engine, line, "student");
  assert.equal(value(engine.world, "student", "knows-spell:frostbite"), true);
  assert.equal(value(engine.world, "student", "wound"), 4);
});

test("a player can diagnose and treat a current wound", () => {
  let engine = join(createEngine(FARSTONE_GAME), "medic", { at: "the-chapel" });
  engine = act(engine, "look", "medic");
  engine = act(engine, "learn frostbite", "medic");
  engine = act(engine, "cast frostbite", "medic");
  for (const command of ["diagnose medic", "treat medic", "treat medic"]) engine = submit(engine, { actor: "medic", command });
  const result = step(engine, { runtime: FARSTONE_RUNTIME });
  assert.match(result.receipt.events[0].text, /wound severity 4/u);
  assert.equal(value(result.engine.world, "medic", "wound"), 0);
});

test("the live world advances untreated NPC wounds as well as player wounds", () => {
  let engine = join(createEngine(FARSTONE_GAME), "witness", { at: "the-chapel" });
  engine = { ...engine, world: tell(engine.world, { subject: "father-coll", predicate: "wound", object: 3 }, { source: "test.injury" }) };
  engine = step(engine, { runtime: FARSTONE_RUNTIME }).engine;
  assert.equal(value(engine.world, "father-coll", "infected"), true);
  assert.equal(value(engine.world, "father-coll", "condition"), "sick");
});
