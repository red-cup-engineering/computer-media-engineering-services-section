import assert from "node:assert/strict";
import { test } from "node:test";
import { createEngine, join, step, submit } from "@red-cup-engineering/feltos/engine";
import { declareFunctional, placeOf, tell, value } from "@red-cup-engineering/feltos/world";
import { DEFAULT_RESPAWN, homeOf } from "./depths.mjs";
import { farstoneDirectorCapability } from "./director.mjs";
import { FARSTONE_GAME, FARSTONE_RUNTIME, gameFromBible } from "./farstone-game.mjs";

test("monster homes are data and slain monsters return after their own delay", () => {
  assert.equal(homeOf(["monster", "home:den"]), "den");
  assert.ok(DEFAULT_RESPAWN >= 10);
  const game = gameFromBible({
    meta: { world: "farstone-lair", playerStart: "den" },
    rooms: [{ id: "den", name: "The Den", description: "Bone and dark.", tags: ["civic"], exits: {} }],
    npcs: [{ id: "rat", name: "a giant rat", description: "Yellow-toothed.", location: "den", tags: ["npc", "monster", "home:den", "health:2", "respawn:3"] }],
  });
  let engine = join(createEngine(game), "hero");
  engine = { ...engine, world: tell(declareFunctional(engine.world, ["attack"]), { subject: "hero", predicate: "attack", object: 2 }) };
  engine = submit(engine, { actor: "hero", command: "attack rat" });
  engine = step(engine, { runtime: FARSTONE_RUNTIME }).engine;
  assert.equal(value(engine.world, "rat", "condition"), "dead");
  for (let tick = 0; tick < 3; tick++) engine = step(engine, { runtime: FARSTONE_RUNTIME }).engine;
  assert.equal(value(engine.world, "rat", "condition"), "alive");
  assert.equal(placeOf(engine.world, "rat"), "den");
  assert.equal(value(engine.world, "rat", "health"), 2);
  assert.equal(value(engine.world, "rat", "wound"), 0, "respawn clears the wound created by shared combat");
});

test("attack and strike share skill-safe damage and record the same monster death time", () => {
  for (const command of ["attack a giant rat", "strike a giant rat"]) {
    const game = gameFromBible({
      meta: { world: `farstone-${command.split(" ")[0]}`, playerStart: "den" },
      rooms: [{ id: "den", name: "The Den", description: "Bone and dark.", tags: [], exits: {} }],
      npcs: [{ id: "giant-rat", name: "a giant rat", description: "Yellow-toothed.", location: "den", tags: ["npc", "monster", "home:den", "health:20", "respawn:2"] }],
    });
    let engine = join(createEngine(game), "hero");
    engine = { ...engine, world: tell(declareFunctional(engine.world, ["skill:combat"]), { subject: "hero", predicate: "skill:combat", object: 55 }) };
    engine = submit(engine, { actor: "hero", command });
    engine = step(engine, { runtime: FARSTONE_RUNTIME }).engine;
    assert.equal(value(engine.world, "giant-rat", "health"), 19, "55 combat practice does not become 55 damage");
    assert.equal(value(engine.world, "giant-rat", "condition"), "alive");
  }

  for (const command of ["attack rat", "strike rat"]) {
    const game = gameFromBible({
      meta: { world: `farstone-kill-${command.split(" ")[0]}`, playerStart: "den" },
      rooms: [{ id: "den", name: "The Den", description: "Bone and dark.", tags: [], exits: {} }],
      npcs: [{ id: "rat", name: "rat", description: "Yellow-toothed.", location: "den", tags: ["npc", "monster", "home:den", "health:2", "respawn:2"] }],
    });
    let engine = join(createEngine(game), "hero");
    engine = { ...engine, world: tell(declareFunctional(engine.world, ["attack"]), { subject: "hero", predicate: "attack", object: 2 }) };
    engine = submit(engine, { actor: "hero", command });
    engine = step(engine, { runtime: FARSTONE_RUNTIME }).engine;
    assert.equal(value(engine.world, "rat", "condition"), "dead");
    assert.equal(value(engine.world, "rat", "died-at"), engine.tick);
    for (let tick = 0; tick < 2; tick++) engine = step(engine, { runtime: FARSTONE_RUNTIME }).engine;
    assert.equal(value(engine.world, "rat", "condition"), "alive", `${command} death participates in respawn`);
  }
});

test("an authored NPC grievance becomes an admitted shared combat action", () => {
  const game = gameFromBible({
    meta: { world: "farstone-rival-combat", playerStart: "quay" },
    rooms: [{ id: "quay", name: "Quay", description: "The quay.", tags: [], exits: {} }],
    npcs: [
      { id: "dax", name: "Dax Pell", description: "A deckhand.", location: "quay", tags: ["npc", "health:20", "attack:3", "skill:combat:5", "rival:mara-quill", "need:hunger:0", "need:rest:0", "need:recreation:0", "need:warmth:0"] },
      { id: "mara-quill", name: "Sergeant Mara Quill", description: "A constable.", location: "quay", tags: ["npc", "health:20", "attack:2", "need:hunger:0", "need:rest:0", "need:recreation:0", "need:warmth:0"] },
    ],
  });
  let engine = createEngine(game);
  engine = { ...engine, world: tell(declareFunctional(engine.world, ["grievance:mara-quill"]), {
    subject: "dax", predicate: "grievance:mara-quill", object: 50,
  }) };
  const { engine: result, receipt } = step(engine, { runtime: FARSTONE_RUNTIME });
  assert.equal(value(result.world, "mara-quill", "health"), 17);
  assert.equal(value(result.world, "mara-quill", "wound"), 3);
  assert.equal(receipt.admission.admitted.length, 1, "the strike is admitted as an internal NPC proposal");
  assert.ok(receipt.events.some(({ to, text }) => to === "dax" && text.includes("Mara")), "the shared attack command returns its effect to the acting NPC");
});

test("authored rivalry alone does not cause periodic unadmitted damage", () => {
  const engine = createEngine(FARSTONE_GAME);
  const before = {
    dax: value(engine.world, "dax-pell", "health"),
    mara: value(engine.world, "mara-quill", "health"),
  };
  const result = farstoneDirectorCapability.onTick({
    tick: 23, game: FARSTONE_GAME, actors: [], world: engine.world,
  });
  assert.equal(value(result.world, "dax-pell", "health"), before.dax);
  assert.equal(value(result.world, "mara-quill", "health"), before.mara);
});
