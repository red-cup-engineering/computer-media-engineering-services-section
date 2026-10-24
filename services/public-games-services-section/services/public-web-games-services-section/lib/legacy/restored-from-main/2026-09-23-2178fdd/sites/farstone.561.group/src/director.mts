import { defineCapability } from "@red-cup-engineering/feltos/capabilities";
import { placeOf, tell, value, values } from "@red-cup-engineering/feltos/world";
import { settleOffSeason } from "./campaign.mts";

export const HUNGER_DEMAND = 14;
export const HUNGER_SATED = 6;

export function demandFor(hunger: number): { want: string; reward: number } | null {
  return hunger >= HUNGER_DEMAND ? { want: "edible", reward: 5 + hunger } : null;
}

const ROLE_WANTS = Object.freeze([
  { tag: "innkeeper", want: "fish", reward: 10 },
  { tag: "smith", want: "iron", reward: 16 },
  { tag: "shopkeeper", want: "fish", reward: 9 },
  { tag: "lamp-keeper", want: "fiber", reward: 8 },
]);

export function roleDemandFor(tags: readonly string[]): { want: string; reward: number } | null {
  const role = ROLE_WANTS.find((entry) => tags.includes(entry.tag));
  return role === undefined ? null : { want: role.want, reward: role.reward };
}

const tagsOf = (world: unknown, subject: string): readonly string[] => values(world, subject, "tag").filter((tag): tag is string => typeof tag === "string");
const numberAt = (world: unknown, subject: string, predicate: string, fallback = 0): number => {
  const number = Number(value(world, subject, predicate));
  return Number.isFinite(number) ? number : fallback;
};

export const farstoneDirectorCapability = defineCapability({
  id: "farstone.director",
  onTick(ctx) {
    let world = ctx.world;
    for (const actor of ctx.actors) {
      if (value(world, actor, "coin") === null) {
        world = tell(world, [
          { subject: actor, predicate: "coin", object: 250 },
          { subject: actor, predicate: "health", object: 20 },
          { subject: actor, predicate: "condition", object: "alive" },
          { subject: actor, predicate: "skill", object: 0 },
          { subject: actor, predicate: "skill:combat", object: 55 },
          { subject: actor, predicate: "skill:lockpicking", object: 30 },
          { subject: actor, predicate: "skill:crafting.smithing.black", object: 3 },
          { subject: actor, predicate: "skill:magic.evocation", object: 3 },
          { subject: actor, predicate: "skill:magic.illusion", object: 2 },
          { subject: actor, predicate: "skill:people.healing", object: 3 },
          { subject: actor, predicate: "skill:covert.stealth", object: 3 },
          { subject: actor, predicate: "skill:covert.theft", object: 3 },
          { subject: actor, predicate: "skill:faith.rituals", object: 1 },
          { subject: actor, predicate: "worships", object: "Maraset" },
          { subject: actor, predicate: "piety", object: 0 },
          { subject: actor, predicate: "mana", object: 20 },
          { subject: actor, predicate: "knows-spell:spark", object: true },
          { subject: actor, predicate: "knows-spell:mend", object: true },
          { subject: actor, predicate: "knows-spell:befuddle", object: true },
          { subject: actor, predicate: "thoughts-fixed", object: 0 },
          { subject: actor, predicate: "structures-built", object: 0 },
          { subject: actor, predicate: "permit-resolved", object: 0 },
          { subject: actor, predicate: "standing", object: 0 },
          { subject: actor, predicate: "campaign-stage", object: 0 },
        ], { source: "farstone.admission" });
      }
      world = settleOffSeason(world, actor).world;
    }

    const npcs = Object.keys(ctx.game.things).filter((id) => value(world, id, "kind") === "npc");
    const claims: { subject: string; predicate: string; object: unknown }[] = [];
    for (const npc of npcs) {
      const demand = demandFor(numberAt(world, npc, "need:hunger")) ?? roleDemandFor(tagsOf(world, npc));
      if (demand !== null) claims.push(
        { subject: npc, predicate: "wants", object: demand.want },
        { subject: npc, predicate: "want-reward", object: demand.reward },
      );
    }

    if (ctx.tick % 23 === 0) {
      for (const npc of npcs) {
        const rivalTag = tagsOf(world, npc).find((tag) => tag.startsWith("rival:"));
        const rival = rivalTag?.slice(6);
        if (rival !== undefined && placeOf(world, rival) === placeOf(world, npc)) {
          claims.push({ subject: rival, predicate: "health", object: Math.max(0, numberAt(world, rival, "health", 20) - 1) });
        }
      }
    }

    const stock = Math.max(0, numberAt(world, "the-fishing-grounds", "fish-stock", 40) + (ctx.tick % 7 === 0 ? -2 : 0.2));
    claims.push(
      { subject: "the-fishing-grounds", predicate: "fish-stock", object: stock },
      { subject: "farstone-market", predicate: "price:fish", object: 2 + (40 - Math.min(40, stock)) / 10 },
    );
    world = tell(world, claims, { source: "farstone.simulation" });
    return { world };
  },
});
