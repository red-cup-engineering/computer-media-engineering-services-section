import { defineCapability } from "@red-cup-engineering/feltos/capabilities";
import { invokeRite, pray as deepenDevotion } from "@red-cup-engineering/feltos/devotion";
import { castSpell, diagnose as diagnoseBody, festerWounds, hide, pickLock, presentTarget, setTactics, steal, treat, wear, wield } from "@red-cup-engineering/feltos/interaction";
import { isPracticeTarget, practiceAttack } from "@red-cup-engineering/feltos/training";
import { beginThought, internalizeThought } from "@red-cup-engineering/feltos/progression";
import { contentsOf, placeOf, tell, value, values } from "@red-cup-engineering/feltos/world";
import { OFF_SEASON, offSeasonStage } from "./campaign.mjs";
import { resolveFarstoneAttack } from "./depths.mjs";
import { THOUGHTS } from "./thoughts.mjs";

const numberAt = (world, subject, predicate) => Number(value(world, subject, predicate) ?? 0);
function named(world, subject, requested) {
  const needle = requested.trim().toLowerCase();
  if (needle.length === 0) return false;
  const name = String(value(world, subject, "name") ?? "").toLowerCase();
  return subject === needle || name === needle || name.includes(needle);
}

function carriedNamed(world, actor, requested) {
  return contentsOf(world, actor).find((item) => named(world, item, requested));
}

function presentNamed(world, actor, requested) {
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

function cast(ctx) {
  const [name, ...targetWords] = ctx.argument.trim().toLowerCase().split(/\s+/u);
  const spell = SPELLS[name];
  if (spell === undefined) return { events: [ctx.message(ctx.actor, "Spells can be studied at the Chapel of Maraset.")] };
  if (value(ctx.world, ctx.actor, `knows-spell:${name}`) !== true) return { events: [ctx.message(ctx.actor, "You have not learned that spell.")] };
  const target = targetWords.length === 0 ? ctx.actor : presentNamed(ctx.world, ctx.actor, targetWords.join(" "));
  if (target === undefined) return { events: [ctx.message(ctx.actor, "That target is not here.")] };
  try {
    return { world: castSpell(ctx.world, ctx.actor, target, spell, { mana: 20 }), events: [ctx.message(ctx.actor, `You cast ${name}.`)] };
  } catch (error) { return { events: [ctx.message(ctx.actor, error instanceof Error ? error.message : "The spell fails.")] }; }
}

function spells(ctx) {
  const known = Object.keys(SPELLS).filter((spell) => value(ctx.world, ctx.actor, `knows-spell:${spell}`) === true);
  return { events: [ctx.message(ctx.actor, `Known spells: ${known.length === 0 ? "none" : known.join(", ")}. Mana: ${numberAt(ctx.world, ctx.actor, "mana")}.`)] };
}

function learn(ctx) {
  const spell = ctx.argument.trim().toLowerCase();
  if (!(spell in SPELLS)) return { events: [ctx.message(ctx.actor, "Study which spell? The Chapel keeps frostbite among its tide-worn texts.")] };
  if (value(ctx.world, ctx.actor, `knows-spell:${spell}`) === true) return { events: [ctx.message(ctx.actor, `You already know ${spell}.`)] };
  if (placeOf(ctx.world, ctx.actor) !== "the-chapel") return { events: [ctx.message(ctx.actor, "Spell study is available in the Chapel of Maraset.")] };
  return {
    world: tell(ctx.world, { subject: ctx.actor, predicate: `knows-spell:${spell}`, object: true }, { source: "farstone.magic.study" }),
    events: [ctx.message(ctx.actor, `You study the tide-worn text and learn ${spell}.`)],
  };
}

function pray(ctx) {
  if (placeOf(ctx.world, ctx.actor) !== "the-chapel") return { events: [ctx.message(ctx.actor, "You seek a quiet place of worship.")] };
  return { world: deepenDevotion(ctx.world, ctx.actor, "Maraset"), events: [ctx.message(ctx.actor, "You pray to Maraset; the tide answers in the stone.")] };
}

function worship(ctx) {
  return { events: [ctx.message(ctx.actor, "You worship Maraset, the grey-eyed lady of tide and harbor. Beneath the chapel's account lies the older, drowned truth of the Deep.")] };
}

function invoke(ctx) {
  const [name, ...targetWords] = ctx.argument.trim().toLowerCase().split(/\s+/u);
  const rite = RITES[name];
  if (rite === undefined) return { events: [ctx.message(ctx.actor, "Rites: benediction, lay-on-hands, curse.")] };
  if (numberAt(ctx.world, ctx.actor, "skill:faith.rituals") < 1) return { events: [ctx.message(ctx.actor, "You lack the ritual practice.")] };
  const target = targetWords.length === 0 ? ctx.actor : presentNamed(ctx.world, ctx.actor, targetWords.join(" "));
  if (target === undefined) return { events: [ctx.message(ctx.actor, "That recipient is not here.")] };
  try {
    return { world: invokeRite(ctx.world, ctx.actor, target, rite), events: [ctx.message(ctx.actor, `You invoke ${name}.`)] };
  } catch (error) { return { events: [ctx.message(ctx.actor, error instanceof Error ? error.message : "The rite fails.")] }; }
}

function heal(ctx) {
  const target = presentNamed(ctx.world, ctx.actor, ctx.argument);
  if (target === undefined) return { events: [ctx.message(ctx.actor, "That patient is not here.")] };
  const skill = numberAt(ctx.world, ctx.actor, "skill:people.healing");
  if (skill < 1) return { events: [ctx.message(ctx.actor, "You lack the healing practice.")] };
  try {
    return { world: treat(ctx.world, ctx.actor, target, skill), events: [ctx.message(ctx.actor, "You tend the patient's wounds.")] };
  } catch (error) { return { events: [ctx.message(ctx.actor, error instanceof Error ? error.message : "The treatment fails.")] }; }
}

function diagnose(ctx) {
  const target = presentNamed(ctx.world, ctx.actor, ctx.argument);
  if (target === undefined) return { events: [ctx.message(ctx.actor, "Diagnose whom?")] };
  try {
    const body = diagnoseBody(ctx.world, ctx.actor, target);
    const injury = body.wound > 0 ? ` wound severity ${body.wound}` : " no open wound";
    return { events: [ctx.message(ctx.actor, `${String(value(ctx.world, target, "name") ?? target)}: health ${body.health}, ${body.condition},${injury}; ${body.infected ? "infection present" : "no infection"}.`)] };
  } catch (error) { return { events: [ctx.message(ctx.actor, error instanceof Error ? error.message : "The diagnosis fails.")] }; }
}

function conceal(ctx) {
  const skill = numberAt(ctx.world, ctx.actor, "skill:covert.stealth");
  if (skill < 1) return { events: [ctx.message(ctx.actor, "You cannot find cover.")] };
  return { world: hide(ctx.world, ctx.actor, skill), events: [ctx.message(ctx.actor, "You melt into the harbor's cover.")] };
}

function pilfer(ctx) {
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

function wieldItem(ctx) {
  const item = carriedNamed(ctx.world, ctx.actor, ctx.argument.trim());
  if (item === undefined) return { events: [ctx.message(ctx.actor, "You are not carrying that weapon.")] };
  try { return { world: wield(ctx.world, ctx.actor, item), events: [ctx.message(ctx.actor, `You wield ${String(value(ctx.world, item, "name") ?? item)}.`)] }; }
  catch (error) { return { events: [ctx.message(ctx.actor, error instanceof Error ? error.message : "You cannot wield that.")] }; }
}

function wearItem(ctx) {
  const item = carriedNamed(ctx.world, ctx.actor, ctx.argument.trim());
  if (item === undefined) return { events: [ctx.message(ctx.actor, "You are not carrying that armor.")] };
  try { return { world: wear(ctx.world, ctx.actor, item), events: [ctx.message(ctx.actor, `You wear ${String(value(ctx.world, item, "name") ?? item)}.`)] }; }
  catch (error) { return { events: [ctx.message(ctx.actor, error instanceof Error ? error.message : "You cannot wear that.")] }; }
}

function tactics(ctx) {
  try { return { world: setTactics(ctx.world, ctx.actor, ctx.argument.trim().toLowerCase()), events: [ctx.message(ctx.actor, "Your stance is set.")] }; }
  catch (error) { return { events: [ctx.message(ctx.actor, error instanceof Error ? error.message : "Your stance cannot be set.")] }; }
}

function strike(ctx) {
  try {
    const target = presentTarget(ctx.world, ctx.actor, ctx.argument);
    if (target === ctx.actor || value(ctx.world, target, "health") === null) throw new Error("that target cannot be struck");
    const result = resolveFarstoneAttack(ctx.world, ctx.actor, target, ctx.tick);
    const text = result.killed
      ? `You strike ${String(value(result.world, target, "name") ?? target)} for ${result.damage} damage; they fall.`
      : `You strike ${String(value(result.world, target, "name") ?? target)} for ${result.damage} damage.`;
    return { world: result.world, events: [ctx.message(ctx.actor, text)] };
  } catch (error) { return { events: [ctx.message(ctx.actor, error instanceof Error ? error.message : "You cannot attack that.")] }; }
}

function practice(ctx) {
  const target = presentNamed(ctx.world, ctx.actor, ctx.argument);
  if (target === undefined) return { events: [ctx.message(ctx.actor, "That practice target is not here.")] };
  if (!isPracticeTarget(ctx.world, target)) return { events: [ctx.message(ctx.actor, "That is not a supervised practice target.")] };
  try {
    const result = practiceAttack(ctx.world, ctx.actor, target);
    return { world: result.world, events: [ctx.message(ctx.actor, `You practise against ${String(value(ctx.world, target, "name") ?? target)} for ${result.damage} damage; it is reset for the next learner.`)] };
  } catch (error) { return { events: [ctx.message(ctx.actor, error instanceof Error ? error.message : "You cannot practise there.")] }; }
}

function consider(ctx) {
  try {
    const target = presentTarget(ctx.world, ctx.actor, ctx.argument);
    const targetSkill = numberAt(ctx.world, target, "skill:combat");
    const ownSkill = numberAt(ctx.world, ctx.actor, "skill:combat");
    const health = numberAt(ctx.world, target, "health");
    const assessment = targetSkill > ownSkill ? "They have more combat practice than you." : targetSkill < ownSkill ? "You have more combat practice than they do." : "You seem evenly practiced.";
    return { events: [ctx.message(ctx.actor, `${String(value(ctx.world, target, "name") ?? target)}: combat practice ${targetSkill}, health ${health}. ${assessment}`)] };
  } catch (error) { return { events: [ctx.message(ctx.actor, error instanceof Error ? error.message : "Consider whom?")] }; }
}

function pick(ctx) {
  const target = presentNamed(ctx.world, ctx.actor, ctx.argument);
  if (target === undefined) return { events: [ctx.message(ctx.actor, "That lock is not here.")] };
  try { return { world: pickLock(ctx.world, ctx.actor, target), events: [ctx.message(ctx.actor, "The lock yields.")] }; }
  catch (error) { return { events: [ctx.message(ctx.actor, error instanceof Error ? error.message : "The lock holds.")] }; }
}

function rent(ctx) {
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

function think(ctx) {
  if (value(ctx.world, ctx.actor, "active-thought") !== null) return { events: [ctx.message(ctx.actor, "A thought already occupies you.")] };
  return { world: beginThought(ctx.world, ctx.actor, THOUGHTS[1]), events: [ctx.message(ctx.actor, "You begin internalizing the Off-Season Mind.")] };
}

function quest(ctx) {
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

export const farstoneProgressionCapability = defineCapability({
  id: "farstone.progression",
  commands: { rent, wield: wieldItem, wear: wearItem, tactics, strike, practice, consider, pick, cast, spells, learn, worship, pray, invoke, heal, treat: heal, diagnose, hide: conceal, steal: pilfer, think, quest, journal: quest },
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
