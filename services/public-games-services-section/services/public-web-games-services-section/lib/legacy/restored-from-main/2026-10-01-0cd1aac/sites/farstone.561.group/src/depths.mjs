import { defineCapability } from "@red-cup-engineering/feltos/capabilities";
import { attack as resolveAttack, presentTarget } from "@red-cup-engineering/feltos/interaction";
import { move, placeOf, tell, value, values } from "@red-cup-engineering/feltos/world";

export const DEFAULT_RESPAWN = 50;

export function homeOf(tags) {
  const tag = tags.find((entry) => entry.startsWith("home:"));
  return tag === undefined ? null : tag.slice(5);
}

const tagsOf = (world, subject) => values(world, subject, "tag").filter((tag) => typeof tag === "string");
const tagNumber = (tags, prefix, fallback) => {
  const tag = tags.find((entry) => entry.startsWith(`${prefix}:`));
  const parsed = Number(tag?.slice(prefix.length + 1));
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function resolveFarstoneAttack(world, attacker, target, tick) {
  const result = resolveAttack(world, attacker, target);
  const next = result.killed
    ? tell(result.world, { subject: target, predicate: "died-at", object: tick }, { source: "farstone.combat" })
    : result.world;
  return Object.freeze({ ...result, world: next });
}

function attack(ctx) {
  try {
    const target = presentTarget(ctx.world, ctx.actor, ctx.argument);
    if (target === ctx.actor || value(ctx.world, target, "health") === null) throw new Error("attack a living opponent here");
    const result = resolveFarstoneAttack(ctx.world, ctx.actor, target, ctx.tick);
    const health = value(result.world, target, "health");
    const text = result.killed
      ? `${String(value(result.world, target, "name") ?? target)} falls.`
      : `${String(value(result.world, target, "name") ?? target)} takes ${result.damage} damage (${health} health remains).`;
    return { world: result.world, events: [ctx.message(ctx.actor, text)] };
  } catch (error) {
    return { events: [ctx.message(ctx.actor, error instanceof Error ? error.message : "You cannot attack that.")] };
  }
}

export const farstoneDepthsCapability = defineCapability({
  id: "farstone.depths",
  commands: { attack },
  onTick(ctx) {
    let world = ctx.world;
    for (const subject of Object.keys(ctx.game.things)) {
      const tags = tagsOf(world, subject);
      if (!tags.includes("monster") || value(world, subject, "condition") !== "dead") continue;
      const diedAt = Number(value(world, subject, "died-at") ?? ctx.tick);
      const delay = tagNumber(tags, "respawn", DEFAULT_RESPAWN);
      if (ctx.tick - diedAt < delay) continue;
      const home = homeOf(tags) ?? placeOf(world, subject);
      world = tell(world, [
        { subject, predicate: "health", object: tagNumber(tags, "health", 10) },
        { subject, predicate: "condition", object: "alive" },
        { subject, predicate: "wound", object: 0 },
        { subject, predicate: "infected", object: false },
        { subject, predicate: "died-at", object: -1 },
      ], { source: "farstone.respawn" });
      if (home !== null) world = move(world, subject, home, { source: "farstone.respawn" });
    }
    return { world };
  },
});
