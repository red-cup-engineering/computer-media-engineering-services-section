import { defineCapability } from "@red-cup-engineering/feltos/capabilities";
import { craftSituated, defineSituatedRecipe } from "@red-cup-engineering/feltos/crafting";
import { invokeRite, pray as deepenDevotion } from "@red-cup-engineering/feltos/devotion";
import { harvestResource, resourceEcologyOf } from "@red-cup-engineering/feltos/ecology";
import { attack, castSpell, diagnose as diagnoseBody, festerWounds, hide, pickLock, setTactics, steal, treat, wear, wield } from "@red-cup-engineering/feltos/interaction";
import { isPracticeTarget, practiceAttack } from "@red-cup-engineering/feltos/training";
import { buyFromMarket, marketQuote, sellToMarket } from "@red-cup-engineering/feltos/market";
import { beginThought, internalizeThought } from "@red-cup-engineering/feltos/progression";
import { contentsOf, placeOf, tell, value, values } from "@red-cup-engineering/feltos/world";
import { SITUATED_RECIPES, WARES } from "./catalogs.mts";
import { OFF_SEASON, offSeasonStage } from "./campaign.mts";
import { THOUGHTS } from "./thoughts.mts";

const numberAt = (world: unknown, subject: string, predicate: string): number => Number(value(world, subject, predicate) ?? 0);
const update = (ctx: any, claims: readonly { predicate: string; object: unknown }[], source: string) => ({
  world: tell(ctx.world, claims.map((claim) => ({ subject: ctx.actor, ...claim })), { source }),
});

function work(ctx: any) {
  const result = update(ctx, [
    { predicate: "coin", object: numberAt(ctx.world, ctx.actor, "coin") + 8 },
    { predicate: "skill", object: numberAt(ctx.world, ctx.actor, "skill") + 1 },
  ], "farstone.work");
  return { ...result, events: [ctx.message(ctx.actor, "You put your hands to the harbor's work.")] };
}

function fish(ctx: any) {
  const stock = numberAt(ctx.world, "the-fishing-grounds", "fish-stock");
  if (stock < 1) return { events: [ctx.message(ctx.actor, "The grounds are fished bare.")] };
  let world = tell(ctx.world, [
    { subject: "the-fishing-grounds", predicate: "fish-stock", object: stock - 1 },
    { subject: ctx.actor, predicate: "coin", object: numberAt(ctx.world, ctx.actor, "coin") + 4 },
    { subject: ctx.actor, predicate: "skill", object: numberAt(ctx.world, ctx.actor, "skill") + 1 },
  ], { source: "farstone.fishing" });
  return { world, events: [ctx.message(ctx.actor, "You land a silver fish and sell it on the quay.")] };
}

const HARVESTS = Object.freeze({
  shellfish: { place: "the-clam-flats", reward: 5, skill: "shellfishing" },
  food: { place: "branning-farm", reward: 3, skill: "farming" },
  water: { place: "the-spring-house", reward: 1, skill: "waterkeeping" },
  fiber: { place: "the-high-pasture", reward: 4, skill: "shearing" },
});

function harvest(ctx: any) {
  const resource = ctx.argument.trim().toLowerCase();
  const spec = HARVESTS[resource as keyof typeof HARVESTS];
  if (spec === undefined) return { events: [ctx.message(ctx.actor, "Harvest shellfish, food, water, or fiber.")] };
  if (placeOf(ctx.world, ctx.actor) !== spec.place) return { events: [ctx.message(ctx.actor, `That ${resource} is gathered at ${spec.place.replaceAll("-", " ")}.`)] };
  if (resource === "shellfish" && value(ctx.world, "farstone:climate", "shellfish-closed") === true) return { events: [ctx.message(ctx.actor, "The clam flats are closed by the seasonal advisory.")] };
  const ecology = resourceEcologyOf(ctx.world, resource, spec.place);
  if (ecology.stock < 1) return { events: [ctx.message(ctx.actor, `There is no recoverable ${resource} here right now.`)] };
  let world = harvestResource(ctx.world, resource, spec.place, 1).world;
  world = tell(world, [
    { subject: ctx.actor, predicate: "coin", object: numberAt(world, ctx.actor, "coin") + spec.reward },
    { subject: ctx.actor, predicate: "skill", object: numberAt(world, ctx.actor, "skill") + 1 },
    { subject: ctx.actor, predicate: `skill:${spec.skill}`, object: numberAt(world, ctx.actor, `skill:${spec.skill}`) + 1 },
  ], { source: "farstone.harvest" });
  return { world, events: [ctx.message(ctx.actor, `You gather ${resource}; ${Math.max(0, ecology.stock - 1).toFixed(0)} remains in this reach.`)] };
}

function marketHere(world: unknown, actor: string): boolean {
  const room = placeOf(world, actor);
  return room !== null && (values(world, room, "tag").includes("market") || values(world, room, "tag").includes("shop"));
}

function buy(ctx: any) {
  if (!marketHere(ctx.world, ctx.actor)) return { events: [ctx.message(ctx.actor, "Buy and sell at a market or shop.")] };
  const ware = ctx.argument.trim().toLowerCase();
  if (!(ware in WARES)) return { events: [ctx.message(ctx.actor, `Available wares: ${Object.keys(WARES).join(", ")}.`)] };
  try {
    const result = buyFromMarket(ctx.world, { buyer: ctx.actor, market: "farstone-market", ware });
    return { world: result.world, events: [ctx.message(ctx.actor, `You buy ${ware} for ${result.cost} coin.`)] };
  } catch (error) {
    return { events: [ctx.message(ctx.actor, error instanceof Error ? error.message : "The trade cannot be made.")] };
  }
}

function wares(ctx: any) {
  if (!marketHere(ctx.world, ctx.actor)) return { events: [ctx.message(ctx.actor, "Wares are listed at a market or shop.")] };
  const listed = Object.keys(WARES).map((ware) => {
    const quote = marketQuote(ctx.world, "farstone-market", ware);
    return `${ware} (${quote.price.toFixed(2)} coin, ${quote.stock} available)`;
  });
  return { events: [ctx.message(ctx.actor, `Wares: ${listed.join("; ")}.`)] };
}

function appraise(ctx: any) {
  const requested = ctx.argument.trim().toLowerCase();
  const carried = carriedNamed(ctx.world, ctx.actor, requested);
  const ware = carried === undefined ? requested : String(value(ctx.world, carried, "ware-type") ?? "").toLowerCase();
  if (!(ware in WARES)) return { events: [ctx.message(ctx.actor, "Value which carried ware? Try fish, fizzwater, or rope.")] };
  const quote = marketQuote(ctx.world, "farstone-market", ware);
  return { events: [ctx.message(ctx.actor, `${ware} is worth ${quote.price.toFixed(2)} coin at the current market.`)] };
}

function sell(ctx: any) {
  if (!marketHere(ctx.world, ctx.actor)) return { events: [ctx.message(ctx.actor, "Buy and sell at a market or shop.")] };
  const requested = ctx.argument.trim().toLowerCase();
  const item = contentsOf(ctx.world, ctx.actor).find((candidate) => candidate === requested || String(value(ctx.world, candidate, "ware-type") ?? "").toLowerCase() === requested || String(value(ctx.world, candidate, "name") ?? "").toLowerCase() === requested);
  if (item === undefined) return { events: [ctx.message(ctx.actor, "You are not carrying that ware.")] };
  try {
    const result = sellToMarket(ctx.world, { seller: ctx.actor, market: "farstone-market", item });
    return { world: result.world, events: [ctx.message(ctx.actor, `You sell ${String(value(ctx.world, item, "ware-type"))} for ${result.proceeds} coin.`)] };
  } catch (error) {
    return { events: [ctx.message(ctx.actor, error instanceof Error ? error.message : "The trade cannot be made.")] };
  }
}

function craft(ctx: any) {
  const recipeName = ctx.argument.trim().toLowerCase();
  if (recipeName.length === 0) return { events: [ctx.message(ctx.actor, `Craft: ${Object.keys(SITUATED_RECIPES).join(", ")}.`)] };
  const source = SITUATED_RECIPES[recipeName];
  if (source === undefined) return { events: [ctx.message(ctx.actor, `Unknown recipe. Craft: ${Object.keys(SITUATED_RECIPES).join(", ")}.`)] };
  try {
    const result = craftSituated(ctx.world, ctx.actor, defineSituatedRecipe(source));
    return { world: result.world, events: [ctx.message(ctx.actor, `You craft ${source.output.name}.`)] };
  } catch (error) {
    return { events: [ctx.message(ctx.actor, error instanceof Error ? error.message : "The work does not take.")] };
  }
}

function named(world: unknown, subject: string, requested: string): boolean {
  const needle = requested.trim().toLowerCase();
  if (needle.length === 0) return false;
  const name = String(value(world, subject, "name") ?? "").toLowerCase();
  return subject === needle || name === needle || name.includes(needle);
}

function carriedNamed(world: unknown, actor: string, requested: string): string | undefined {
  return contentsOf(world, actor).find((item) => named(world, item, requested));
}

function presentNamed(world: unknown, actor: string, requested: string): string | undefined {
  const room = placeOf(world, actor);
  return room === null ? undefined : contentsOf(world, room).find((subject) => named(world, subject, requested));
}

const SPELLS = Object.freeze({
  spark: Object.freeze({ kind: "harm", cost: 2, amount: 1 }),
  mend: Object.freeze({ kind: "heal", cost: 6, amount: 5 }),
  befuddle: Object.freeze({ kind: "afflict", cost: 3, condition: "befuddled" }),
  frostbite: Object.freeze({ kind: "harm", cost: 5, amount: 4 }),
});

const RITES = Object.freeze({
  benediction: Object.freeze({ kind: "bless", cost: 5, condition: "blessed" }),
  "lay-on-hands": Object.freeze({ kind: "heal", cost: 15, amount: 12 }),
  curse: Object.freeze({ kind: "curse", cost: 10, condition: "afraid" }),
});

function cast(ctx: any) {
  const [name, ...targetWords] = ctx.argument.trim().toLowerCase().split(/\s+/u);
  const spell = SPELLS[name as keyof typeof SPELLS];
  if (spell === undefined) return { events: [ctx.message(ctx.actor, "Spells can be studied at the Chapel of Maraset.")] };
  if (value(ctx.world, ctx.actor, `knows-spell:${name}`) !== true) return { events: [ctx.message(ctx.actor, "You have not learned that spell.")] };
  const target = targetWords.length === 0 ? ctx.actor : presentNamed(ctx.world, ctx.actor, targetWords.join(" "));
  if (target === undefined) return { events: [ctx.message(ctx.actor, "That target is not here.")] };
  try {
    return { world: castSpell(ctx.world, ctx.actor, target, spell, { mana: 20 }), events: [ctx.message(ctx.actor, `You cast ${name}.`)] };
  } catch (error) { return { events: [ctx.message(ctx.actor, error instanceof Error ? error.message : "The spell fails.")] }; }
}

function spells(ctx: any) {
  const known = Object.keys(SPELLS).filter((spell) => value(ctx.world, ctx.actor, `knows-spell:${spell}`) === true);
  return { events: [ctx.message(ctx.actor, `Known spells: ${known.length === 0 ? "none" : known.join(", ")}. Mana: ${numberAt(ctx.world, ctx.actor, "mana")}.`)] };
}

function learn(ctx: any) {
  const spell = ctx.argument.trim().toLowerCase();
  if (!(spell in SPELLS)) return { events: [ctx.message(ctx.actor, "Study which spell? The Chapel keeps frostbite among its tide-worn texts.")] };
  if (value(ctx.world, ctx.actor, `knows-spell:${spell}`) === true) return { events: [ctx.message(ctx.actor, `You already know ${spell}.`)] };
  if (placeOf(ctx.world, ctx.actor) !== "the-chapel") return { events: [ctx.message(ctx.actor, "Spell study is available in the Chapel of Maraset.")] };
  return {
    world: tell(ctx.world, { subject: ctx.actor, predicate: `knows-spell:${spell}`, object: true }, { source: "farstone.magic.study" }),
    events: [ctx.message(ctx.actor, `You study the tide-worn text and learn ${spell}.`)],
  };
}

function pray(ctx: any) {
  if (placeOf(ctx.world, ctx.actor) !== "the-chapel") return { events: [ctx.message(ctx.actor, "You seek a quiet place of worship.")] };
  return { world: deepenDevotion(ctx.world, ctx.actor, "Maraset"), events: [ctx.message(ctx.actor, "You pray to Maraset; the tide answers in the stone.")] };
}

function worship(ctx: any) {
  return { events: [ctx.message(ctx.actor, "You worship Maraset, the grey-eyed lady of tide and harbor. Beneath the chapel's account lies the older, drowned truth of the Deep.")] };
}

function invoke(ctx: any) {
  const [name, ...targetWords] = ctx.argument.trim().toLowerCase().split(/\s+/u);
  const rite = RITES[name as keyof typeof RITES];
  if (rite === undefined) return { events: [ctx.message(ctx.actor, "Rites: benediction, lay-on-hands, curse.")] };
  if (numberAt(ctx.world, ctx.actor, "skill:faith.rituals") < 1) return { events: [ctx.message(ctx.actor, "You lack the ritual practice.")] };
  const target = targetWords.length === 0 ? ctx.actor : presentNamed(ctx.world, ctx.actor, targetWords.join(" "));
  if (target === undefined) return { events: [ctx.message(ctx.actor, "That recipient is not here.")] };
  try {
    return { world: invokeRite(ctx.world, ctx.actor, target, rite), events: [ctx.message(ctx.actor, `You invoke ${name}.`)] };
  } catch (error) { return { events: [ctx.message(ctx.actor, error instanceof Error ? error.message : "The rite fails.")] }; }
}

function heal(ctx: any) {
  const target = presentNamed(ctx.world, ctx.actor, ctx.argument);
  if (target === undefined) return { events: [ctx.message(ctx.actor, "That patient is not here.")] };
  const skill = numberAt(ctx.world, ctx.actor, "skill:people.healing");
  if (skill < 1) return { events: [ctx.message(ctx.actor, "You lack the healing practice.")] };
  try {
    return { world: treat(ctx.world, ctx.actor, target, skill), events: [ctx.message(ctx.actor, "You tend the patient's wounds.")] };
  } catch (error) { return { events: [ctx.message(ctx.actor, error instanceof Error ? error.message : "The treatment fails.")] }; }
}

function diagnose(ctx: any) {
  const target = presentNamed(ctx.world, ctx.actor, ctx.argument);
  if (target === undefined) return { events: [ctx.message(ctx.actor, "Diagnose whom?")] };
  try {
    const body = diagnoseBody(ctx.world, ctx.actor, target);
    const injury = body.wound > 0 ? ` wound severity ${body.wound}` : " no open wound";
    return { events: [ctx.message(ctx.actor, `${String(value(ctx.world, target, "name") ?? target)}: health ${body.health}, ${body.condition},${injury}; ${body.infected ? "infection present" : "no infection"}.`)] };
  } catch (error) { return { events: [ctx.message(ctx.actor, error instanceof Error ? error.message : "The diagnosis fails.")] }; }
}

function conceal(ctx: any) {
  const skill = numberAt(ctx.world, ctx.actor, "skill:covert.stealth");
  if (skill < 1) return { events: [ctx.message(ctx.actor, "You cannot find cover.")] };
  return { world: hide(ctx.world, ctx.actor, skill), events: [ctx.message(ctx.actor, "You melt into the harbor's cover.")] };
}

function pilfer(ctx: any) {
  const request = ctx.argument.trim().toLowerCase();
  const from = request.match(/^(.*?)\s+from\s+(.+)$/u);
  const [victimName, ...itemWords] = request.split(/\s+/u);
  const victim = presentNamed(ctx.world, ctx.actor, from?.[2] ?? victimName ?? "");
  const itemName = from?.[1] ?? itemWords.join(" ");
  if (victim === undefined || itemName.length === 0) return { events: [ctx.message(ctx.actor, "Steal <item> from <person>.")] };
  const item = contentsOf(ctx.world, victim).find((subject) => named(ctx.world, subject, itemName));
  if (item === undefined) return { events: [ctx.message(ctx.actor, "They are not carrying that.")] };
  try {
    const result = steal(ctx.world, ctx.actor, victim, item, {
      skill: numberAt(ctx.world, ctx.actor, "skill:covert.theft"),
      awareness: numberAt(ctx.world, victim, "skill:covert.stealth"),
    });
    return { world: result.world, events: [ctx.message(ctx.actor, result.stolen ? "You lift it cleanly." : "You are noticed.")] };
  } catch (error) { return { events: [ctx.message(ctx.actor, error instanceof Error ? error.message : "The attempt fails.")] }; }
}

function wieldItem(ctx: any) {
  const item = carriedNamed(ctx.world, ctx.actor, ctx.argument.trim());
  if (item === undefined) return { events: [ctx.message(ctx.actor, "You are not carrying that weapon.")] };
  try { return { world: wield(ctx.world, ctx.actor, item), events: [ctx.message(ctx.actor, `You wield ${String(value(ctx.world, item, "name") ?? item)}.`)] }; }
  catch (error) { return { events: [ctx.message(ctx.actor, error instanceof Error ? error.message : "You cannot wield that.")] }; }
}

function wearItem(ctx: any) {
  const item = carriedNamed(ctx.world, ctx.actor, ctx.argument.trim());
  if (item === undefined) return { events: [ctx.message(ctx.actor, "You are not carrying that armor.")] };
  try { return { world: wear(ctx.world, ctx.actor, item), events: [ctx.message(ctx.actor, `You wear ${String(value(ctx.world, item, "name") ?? item)}.`)] }; }
  catch (error) { return { events: [ctx.message(ctx.actor, error instanceof Error ? error.message : "You cannot wear that.")] }; }
}

function tactics(ctx: any) {
  try { return { world: setTactics(ctx.world, ctx.actor, ctx.argument.trim().toLowerCase()), events: [ctx.message(ctx.actor, "Your stance is set.")] }; }
  catch (error) { return { events: [ctx.message(ctx.actor, error instanceof Error ? error.message : "Your stance cannot be set.")] }; }
}

function strike(ctx: any) {
  const target = presentNamed(ctx.world, ctx.actor, ctx.argument);
  if (target === undefined) return { events: [ctx.message(ctx.actor, "That target is not here.")] };
  try {
    const result = attack(ctx.world, ctx.actor, target);
    return { world: result.world, events: [ctx.message(ctx.actor, `You strike ${String(value(ctx.world, target, "name") ?? target)} for ${result.damage} damage.`)] };
  } catch (error) { return { events: [ctx.message(ctx.actor, error instanceof Error ? error.message : "You cannot attack that.")] }; }
}

function practice(ctx: any) {
  const target = presentNamed(ctx.world, ctx.actor, ctx.argument);
  if (target === undefined) return { events: [ctx.message(ctx.actor, "That practice target is not here.")] };
  if (!isPracticeTarget(ctx.world, target)) return { events: [ctx.message(ctx.actor, "That is not a supervised practice target.")] };
  try {
    const result = practiceAttack(ctx.world, ctx.actor, target);
    return { world: result.world, events: [ctx.message(ctx.actor, `You practise against ${String(value(ctx.world, target, "name") ?? target)} for ${result.damage} damage; it is reset for the next learner.`)] };
  } catch (error) { return { events: [ctx.message(ctx.actor, error instanceof Error ? error.message : "You cannot practise there.")] }; }
}

function consider(ctx: any) {
  const target = presentNamed(ctx.world, ctx.actor, ctx.argument);
  if (target === undefined) return { events: [ctx.message(ctx.actor, "Consider whom?")] };
  const ownAttack = numberAt(ctx.world, ctx.actor, "attack") || numberAt(ctx.world, ctx.actor, "skill:combat") || 1;
  const targetAttack = numberAt(ctx.world, target, "attack") || numberAt(ctx.world, target, "skill:combat") || 1;
  const health = numberAt(ctx.world, target, "health");
  const prospect = ownAttack >= targetAttack ? "You judge the contest winnable." : "You judge them the more dangerous fighter.";
  return { events: [ctx.message(ctx.actor, `${String(value(ctx.world, target, "name") ?? target)}: strength ${targetAttack}, health ${health}. ${prospect}`)] };
}

function pick(ctx: any) {
  const target = presentNamed(ctx.world, ctx.actor, ctx.argument);
  if (target === undefined) return { events: [ctx.message(ctx.actor, "That lock is not here.")] };
  try { return { world: pickLock(ctx.world, ctx.actor, target), events: [ctx.message(ctx.actor, "The lock yields.")] }; }
  catch (error) { return { events: [ctx.message(ctx.actor, error instanceof Error ? error.message : "The lock holds.")] }; }
}

function rent(ctx: any) {
  const room = placeOf(ctx.world, ctx.actor);
  const needle = ctx.argument.trim().toLowerCase();
  const ship = room === null ? undefined : contentsOf(ctx.world, room).find((item) => value(ctx.world, item, "kind") === "ship" && (item === needle || String(value(ctx.world, item, "name") ?? "").toLowerCase() === needle));
  if (ship === undefined) return { events: [ctx.message(ctx.actor, "That vessel is not here.")] };
  const cost = numberAt(ctx.world, ship, "rent");
  const coin = numberAt(ctx.world, ctx.actor, "coin");
  if (coin < cost) return { events: [ctx.message(ctx.actor, `You need ${cost - coin} more coin to hire that vessel.`)] };
  if (value(ctx.world, ship, "owner") !== null) return { events: [ctx.message(ctx.actor, "That vessel is already under hire.")] };
  const world = tell(ctx.world, [
    { subject: ctx.actor, predicate: "coin", object: coin - cost },
    { subject: ship, predicate: "owner", object: ctx.actor },
  ], { source: "farstone.ships.rent" });
  return { world, events: [ctx.message(ctx.actor, `You hire ${String(value(ctx.world, ship, "name") ?? ship)} for ${cost} coin. Board it, then sail from its helm.`)] };
}

function think(ctx: any) {
  if (value(ctx.world, ctx.actor, "active-thought") !== null) return { events: [ctx.message(ctx.actor, "A thought already occupies you.")] };
  return { world: beginThought(ctx.world, ctx.actor, THOUGHTS[1]), events: [ctx.message(ctx.actor, "You begin internalizing the Off-Season Mind.")] };
}

function quest(ctx: any) {
  const stage = offSeasonStage(ctx.world, ctx.actor);
  const done = OFF_SEASON.slice(0, stage).map((prior) => `  ✓ ${prior.title}`);
  const current = OFF_SEASON[stage];
  if (current === undefined) {
    return { events: [ctx.message(ctx.actor, ["The Off-Season: complete. You are reckoned with — every stage of the arc is behind you.", ...done].join("\n"))] };
  }
  const lines = [
    `The Off-Season — ${stage + 1}/${OFF_SEASON.length}: ${current.title}. ${current.requirements.map(({ predicate, atLeast }) => `${predicate} ${atLeast}`).join(", ")}. Reward: ${current.reward} coin.`,
    ...done,
  ];
  return { events: [ctx.message(ctx.actor, lines.join("\n"))] };
}

function build(ctx: any) {
  const coin = numberAt(ctx.world, ctx.actor, "coin");
  if (coin < 20) return { events: [ctx.message(ctx.actor, "You need 20 coin for timber and fittings.")] };
  const id = `structure:${ctx.actor}:${ctx.tick}`;
  const world = tell(ctx.world, [
    { subject: ctx.actor, predicate: "coin", object: coin - 20 },
    { subject: ctx.actor, predicate: "structures-built", object: numberAt(ctx.world, ctx.actor, "structures-built") + 1 },
    { subject: id, predicate: "kind", object: "structure" },
    { subject: id, predicate: "name", object: "a tar-caulked fishing shack" },
    { subject: id, predicate: "owner", object: ctx.actor },
    { subject: id, predicate: "located-in", object: placeOf(ctx.world, ctx.actor) ?? ctx.actor },
  ], { source: "farstone.construction" });
  return { world, events: [ctx.message(ctx.actor, "You raise a fishing shack of your own.")] };
}

export const farstoneProgressionCapability = defineCapability({
  id: "farstone.progression",
  commands: { work, fish, harvest, wares, value: appraise, buy, sell, craft, rent, wield: wieldItem, wear: wearItem, tactics, strike, practice, consider, pick, cast, spells, learn, worship, pray, invoke, heal, treat: heal, diagnose, hide: conceal, steal: pilfer, think, quest, journal: quest, build },
  onTick(ctx) {
    let world = ctx.world;
    const patients = [...new Set([
      ...ctx.actors,
      ...Object.keys(ctx.game.things ?? {}).filter((subject) => value(world, subject, "kind") === "npc"),
    ])];
    for (const patient of patients) world = festerWounds(world, patient);
    for (const actor of ctx.actors) {
      const thought = value(world, actor, "active-thought");
      if (thought !== THOUGHTS[1].id) continue;
      const result = internalizeThought(world, actor, THOUGHTS[1]);
      world = result.world;
      if (result.fixed) world = tell(world, { subject: actor, predicate: "thoughts-fixed", object: numberAt(world, actor, "thoughts-fixed") + 1 }, { source: "farstone.thoughts" });
    }
    return { world };
  },
});
