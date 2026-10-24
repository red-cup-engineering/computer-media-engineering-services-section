import assert from "node:assert/strict";
import { test } from "node:test";
import { createEngine, join, step, submit } from "@red-cup-engineering/feltos/engine";
import { composeCapabilities, defineCapability } from "@red-cup-engineering/feltos/capabilities";
import { HUNGER_DEMAND, demandFor } from "@red-cup-engineering/feltos/director";
import { contentsOf, declareFunctional, move, placeOf, tell, value } from "@red-cup-engineering/feltos/world";
import { FARSTONE_GAME, FARSTONE_RUNTIME } from "./farstone-game.mjs";

const actorCommand = (engine, actor, command) =>
  step(submit(engine, { actor, command }), { runtime: FARSTONE_RUNTIME }).engine;
const commandOnlyRuntime = composeCapabilities(FARSTONE_RUNTIME.capabilities.map((capability) =>
  defineCapability({ id: capability.id, commands: capability.commands })));

function stagedHarbor(npcCoin = 300, addSecondActor = false) {
  let engine = join(createEngine(FARSTONE_GAME), "giver");
  if (addSecondActor) engine = join(engine, "second-giver");
  let world = engine.world;
  const actors = addSecondActor ? ["giver", "second-giver"] : ["giver"];
  const predicates = ["located-in", "owner", "coin", "need:hunger"];
  const claims = [
    { subject: "giver", predicate: "located-in", object: "the-saltloft-inn" },
    { subject: "giver", predicate: "coin", object: 250 },
    { subject: "nessa-cawl", predicate: "located-in", object: "the-saltloft-inn" },
    { subject: "nessa-cawl", predicate: "coin", object: npcCoin },
    { subject: "nessa-cawl", predicate: "need:hunger", object: 20 },
    { subject: "nessa-cawl", predicate: "routine:dawn", object: "the-saltloft-inn" },
    { subject: "nessa-cawl", predicate: "routine:day", object: "the-saltloft-inn" },
    { subject: "nessa-cawl", predicate: "routine:dusk", object: "the-saltloft-inn" },
    { subject: "nessa-cawl", predicate: "routine:night", object: "the-saltloft-inn" },
    { subject: "a-ships-biscuit", predicate: "located-in", object: "giver" },
    { subject: "a-ships-biscuit", predicate: "owner", object: "giver" },
  ];
  if (actors.includes("second-giver")) claims.push(
    { subject: "second-giver", predicate: "located-in", object: "the-saltloft-inn" },
    { subject: "second-giver", predicate: "coin", object: 250 },
  );
  world = tell(declareFunctional(world, predicates), claims, { source: "test.harbor-demand" });
  engine = { ...engine, world };
  for (let tick = 0; tick < 20 && value(engine.world, "nessa-cawl", "wants") !== "edible"; tick++) {
    engine = step(engine, { runtime: FARSTONE_RUNTIME }).engine;
  }
  return engine;
}

test("the shared director posts a hungry authored NPC demand", () => {
  assert.equal(HUNGER_DEMAND, 14);
  assert.deepEqual(demandFor(HUNGER_DEMAND), { want: "edible", reward: 19 });
  const engine = stagedHarbor();
  assert.equal(value(engine.world, "nessa-cawl", "role"), "innkeeper");
  assert.equal(value(engine.world, "nessa-cawl", "wants"), "edible");
  assert.equal(placeOf(engine.world, "giver"), "the-saltloft-inn");
});

test("delivery consumes one finite food unit and pays from the NPC purse", () => {
  let engine = stagedHarbor();
  const beforeActor = value(engine.world, "giver", "coin");
  const beforeNpc = value(engine.world, "nessa-cawl", "coin");
  const total = beforeActor + beforeNpc;
  const reward = value(engine.world, "nessa-cawl", "want-reward");
  const amount = value(engine.world, "a-ships-biscuit", "amount");

  engine = actorCommand(engine, "giver", "give biscuit to Nessa Cawl");

  assert.equal(placeOf(engine.world, "a-ships-biscuit"), "nessa-cawl");
  assert.equal(value(engine.world, "a-ships-biscuit", "owner"), "nessa-cawl");
  assert.equal(value(engine.world, "a-ships-biscuit", "amount"), amount - 1);
  assert.equal(value(engine.world, "giver", "coin"), beforeActor + reward);
  assert.equal(value(engine.world, "nessa-cawl", "coin"), beforeNpc - reward);
  assert.equal(value(engine.world, "giver", "coin") + value(engine.world, "nessa-cawl", "coin"), total);
});

test("an unfunded or competing demand cannot mutate the delivery or mint payment", () => {
  let engine = stagedHarbor(0, true);
  const itemAmount = value(engine.world, "a-ships-biscuit", "amount");
  const beforeActor = value(engine.world, "giver", "coin");
  engine = actorCommand(engine, "giver", "give biscuit to Nessa Cawl");
  assert.equal(placeOf(engine.world, "a-ships-biscuit"), "giver");
  assert.equal(value(engine.world, "a-ships-biscuit", "owner"), "giver");
  assert.equal(value(engine.world, "a-ships-biscuit", "amount"), itemAmount);
  assert.equal(value(engine.world, "giver", "coin"), beforeActor);
  assert.equal(value(engine.world, "nessa-cawl", "coin"), 0);

  engine = stagedHarbor(300, true);
  const total = value(engine.world, "giver", "coin") + value(engine.world, "nessa-cawl", "coin");
  const reward = value(engine.world, "nessa-cawl", "want-reward");
  engine = actorCommand(engine, "giver", "give biscuit to Nessa Cawl");
  const afterFirst = { coin: value(engine.world, "giver", "coin") };
  const secondBefore = value(engine.world, "second-giver", "coin");
  engine = actorCommand(engine, "second-giver", "give biscuit to Nessa Cawl");
  assert.equal(placeOf(engine.world, "a-ships-biscuit"), "nessa-cawl");
  assert.equal(value(engine.world, "giver", "coin"), afterFirst.coin);
  assert.equal(value(engine.world, "nessa-cawl", "coin") + value(engine.world, "giver", "coin"), total);
  assert.equal(value(engine.world, "second-giver", "coin"), secondBefore);
  assert.ok(reward > 0);
});

test("two simultaneous food deliveries cannot spend the same finite NPC purse twice", () => {
  let engine = stagedHarbor(300, true);
  const reward = value(engine.world, "nessa-cawl", "want-reward");
  const npcBefore = tell(engine.world, { subject: "nessa-cawl", predicate: "coin", object: reward }, { source: "test.finite-purse" });
  const world = tell(npcBefore, [
    { subject: "a-hard-tack", predicate: "name", object: "a hard-tack" },
    { subject: "a-hard-tack", predicate: "description", object: "A dense square of ship's bread." },
    { subject: "a-hard-tack", predicate: "provides", object: "need:hunger" },
    { subject: "a-hard-tack", predicate: "amount", object: 1 },
    { subject: "a-hard-tack", predicate: "located-in", object: "second-giver" },
    { subject: "a-hard-tack", predicate: "owner", object: "second-giver" },
  ], { source: "test.second-food" });
  engine = { ...engine, world };
  const totalBefore = value(world, "giver", "coin") + value(world, "second-giver", "coin") + value(world, "nessa-cawl", "coin");
  const biscuitAmount = value(world, "a-ships-biscuit", "amount");

  engine = submit(engine, { actor: "giver", command: "give biscuit to Nessa Cawl" });
  engine = submit(engine, { actor: "second-giver", command: "give hard-tack to Nessa Cawl" });
  const result = step(engine, { runtime: commandOnlyRuntime });

  const transferred = ["a-ships-biscuit", "a-hard-tack"].filter((item) => placeOf(result.engine.world, item) === "nessa-cawl");
  assert.equal(transferred.length, 0);
  assert.equal(result.receipt.admission.admitted.length, 0);
  assert.equal(result.receipt.admission.contested.length, 1);
  assert.equal(placeOf(result.engine.world, "a-ships-biscuit"), "giver");
  assert.equal(placeOf(result.engine.world, "a-hard-tack"), "second-giver");
  assert.equal(value(result.engine.world, "nessa-cawl", "coin"), reward);
  assert.equal(
    value(result.engine.world, "giver", "coin")
      + value(result.engine.world, "second-giver", "coin")
      + value(result.engine.world, "nessa-cawl", "coin"),
    totalBefore,
  );
  assert.equal(value(result.engine.world, "a-ships-biscuit", "amount"), biscuitAmount);
  assert.equal(value(result.engine.world, "a-hard-tack", "amount"), 1);
});

test("the demand capability declines ordinary player gifts to the core transfer", () => {
  let engine = join(createEngine(FARSTONE_GAME), "giver");
  engine = join(engine, "second-giver");
  const world = tell(declareFunctional(engine.world, ["located-in", "owner"]), [
    { subject: "giver", predicate: "located-in", object: "harbor-quay" },
    { subject: "second-giver", predicate: "located-in", object: "harbor-quay" },
    { subject: "a-ships-biscuit", predicate: "located-in", object: "giver" },
    { subject: "a-ships-biscuit", predicate: "owner", object: "giver" },
  ], { source: "test.ordinary-gift" });
  engine = actorCommand({ ...engine, world }, "giver", "give a ship's biscuit to second-giver");
  assert.equal(placeOf(engine.world, "a-ships-biscuit"), "second-giver");
  assert.equal(value(engine.world, "a-ships-biscuit", "owner"), "second-giver");
  assert.ok(contentsOf(engine.world, "second-giver").includes("a-ships-biscuit"));
});
