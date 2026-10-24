import { defineCapability } from "@red-cup-engineering/feltos/capabilities";
import { assignCivicWork, castBallot, completeCivicWork, filePetition, resolveCivicMatter, spendCivicBudget } from "@red-cup-engineering/feltos/civics";
import { contentsOf, move, placeOf, subjects, tell, value, values } from "@red-cup-engineering/feltos/world";
import { clockSeed } from "@red-cup-engineering/feltos/world-clock";

const PERMIT = "the-dredging-permit";
const DREDGING_MATTER = "civic-dredging";
const MAPLE_BIRCH_MATTER = "civic-maple-and-birch-stop";
const civicMatter = (argument: string, fallback = DREDGING_MATTER): string =>
  /maple|birch|four-way|4-way|stop/u.test(argument) ? MAPLE_BIRCH_MATTER : fallback;
const LIGHTHOUSE_LETTER = "the-lighthouse-letter";
const LIGHTHOUSE_QUEST = "deliver-the-lighthouse-dispatch";
const civic = (world: unknown, actor: string): boolean => {
  const room = placeOf(world, actor);
  return room !== null && values(world, room, "tag").includes("civic");
};
const shellfishRooms = (world: unknown): string[] =>
  subjects(world).filter((id: string) => value(world, id, "kind") === "room" && values(world, id, "tag").includes("shellfish"));

/** A stable roll in `[0, 1)` from a joined key — replay-exact chance, no engine RNG needed. */
function rollFor(...parts: readonly (string | number)[]): number {
  const text = parts.join("|");
  let h = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) h = Math.imul(h ^ text.charCodeAt(index), 0x01000193);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return (h >>> 0) / 0x1_0000_0000;
}

function petition(ctx: any) {
  if (!civic(ctx.world, ctx.actor)) return { events: [ctx.message(ctx.actor, "Petitions are filed in the civic blocks downtown.")] };
  const status = value(ctx.world, PERMIT, "decision-status");
  if (status !== "open" && status !== "contested") {
    return { events: [ctx.message(ctx.actor, status === null
      ? "There is no live petition to file."
      : `Application 23 is already settled (${String(status)}).`)] };
  }
  const side = /brannaugh|clam|deny|marsh|refuse/u.test(ctx.argument) ? "denied"
    : /coilin|dredge|grant|channel/u.test(ctx.argument) ? "granted" : null;
  if (side === null) return { events: [ctx.message(ctx.actor, "Choose `petition coilin` or `petition brannaugh`.")] };
  const standing = Number(value(ctx.world, ctx.actor, "standing") ?? 0) + 40;
  let world = tell(ctx.world, [
    { subject: PERMIT, predicate: "decision-status", object: side },
    { subject: ctx.actor, predicate: "permit-resolved", object: 1 },
    { subject: ctx.actor, predicate: "standing", object: standing },
  ], { source: "farstone.petition" });
  if (side === "granted") {
    for (const room of shellfishRooms(world)) {
      world = tell(world, [
        { subject: room, predicate: "pollution", object: Number(value(world, room, "pollution") ?? 0) + 8 },
        { subject: room, predicate: "shellfish-closed", object: true },
      ], { source: "farstone.petition" });
    }
    if (subjects(world).includes("brannaugh-ross")) {
      world = tell(world, { subject: "brannaugh-ross", predicate: "embittered", object: true }, { source: "farstone.petition" });
    }
  } else if (subjects(world).includes("coilin-vey")) {
    world = tell(world, { subject: "coilin-vey", predicate: "embittered", object: true }, { source: "farstone.petition" });
  }
  return { world, events: [ctx.message(ctx.actor, side === "granted" ? "The dredging permit is granted; the marsh bears the cost." : "The dredging permit is denied; the clam bed is spared.")] };
}

function inspect(ctx: any) {
  if (!civic(ctx.world, ctx.actor)) return { events: [ctx.message(ctx.actor, "Re-inspections are dispatched from the civic blocks downtown.")] };
  const target = ctx.argument.trim().toLowerCase().replace(/\s+/gu, "-") || "hydrant-23";
  if (value(ctx.world, target, "water-quality") !== "contested") return { events: [ctx.message(ctx.actor, `${target} has no contested inspection.`)] };
  const pass = rollFor(clockSeed(ctx.world), target) > 0.4;
  const world = tell(ctx.world, [
    { subject: target, predicate: "water-quality", object: pass ? "pass" : "fail" },
    { subject: target, predicate: "advisory", object: pass ? "clear" : "boil-water" },
  ], { source: "farstone.inspection" });
  return { world, events: [ctx.message(ctx.actor, `The re-inspection settles ${target}: ${pass ? "pass" : "fail"}.`)] };
}

function civicPetition(ctx: any) {
  if (!civic(ctx.world, ctx.actor)) return { events: [ctx.message(ctx.actor, "Civic petitions are filed downtown.")] };
  const matter = civicMatter(ctx.argument);
  try {
    return {
      world: filePetition(ctx.world, ctx.actor, matter),
      events: [ctx.message(ctx.actor, matter === MAPLE_BIRCH_MATTER
        ? "Your Maple-and-Birch stop petition is entered in the day-book."
        : "Your petition on Application 23 is entered in the day-book.")],
    };
  } catch (error) {
    return { events: [ctx.message(ctx.actor, error instanceof Error ? error.message : "The petition cannot be filed.")] };
  }
}

function vote(ctx: any) {
  if (!civic(ctx.world, ctx.actor)) return { events: [ctx.message(ctx.actor, "Council votes are cast downtown.")] };
  const matter = civicMatter(ctx.argument);
  const ballot = /approve|grant|dredge/u.test(ctx.argument) ? "approve" : /reject|deny|clam/u.test(ctx.argument) ? "reject" : "abstain";
  try {
    return { world: castBallot(ctx.world, ctx.actor, matter, ballot), events: [ctx.message(ctx.actor, `Your ${ballot} ballot is recorded.`)] };
  } catch (error) {
    return { events: [ctx.message(ctx.actor, error instanceof Error ? error.message : "The ballot cannot be recorded.")] };
  }
}

function resolve(ctx: any) {
  if (!civic(ctx.world, ctx.actor)) return { events: [ctx.message(ctx.actor, "Council matters are resolved downtown.")] };
  const matter = civicMatter(ctx.argument);
  try {
    const result = resolveCivicMatter(ctx.world, matter);
    if (matter === MAPLE_BIRCH_MATTER) {
      const world = tell(result.world, {
        subject: "the-maple-and-birch-intersection",
        predicate: "traffic-control-status",
        object: result.status === "approved" ? "four-way-stop-authorized" : "unchanged",
      }, { source: "farstone.civic-resolution" });
      return { world, events: [ctx.message(ctx.actor, `The council ${result.status} the Maple-and-Birch four-way stop (${result.tally.approve} for, ${result.tally.reject} against).`)] };
    }
    const status = result.status === "approved" ? "granted" : "denied";
    const world = tell(result.world, { subject: PERMIT, predicate: "decision-status", object: status }, { source: "farstone.civic-resolution" });
    return { world, events: [ctx.message(ctx.actor, `The council ${result.status} Application 23 (${result.tally.approve} for, ${result.tally.reject} against).`)] };
  } catch (error) {
    return { events: [ctx.message(ctx.actor, error instanceof Error ? error.message : "The matter cannot be resolved.")] };
  }
}

function assign(ctx: any) {
  if (!civic(ctx.world, ctx.actor)) return { events: [ctx.message(ctx.actor, "Public work is dispatched downtown.")] };
  const capability = ctx.argument.trim().toLowerCase() || "permit-review";
  try {
    const result = assignCivicWork(ctx.world, { id: `work:${capability}:${ctx.tick}`, capability, offices: ["clerk-halloran", "chief-oakes", "harbormaster-quist"] });
    return { world: result.world, events: [ctx.message(ctx.actor, `${capability} is assigned to ${result.office} as work:${capability}:${ctx.tick}.`)] };
  } catch (error) {
    return { events: [ctx.message(ctx.actor, error instanceof Error ? error.message : "No office can take that work.")] };
  }
}

function complete(ctx: any) {
  if (ctx.argument.trim() === LIGHTHOUSE_QUEST) {
    if (value(ctx.world, ctx.actor, `quest:${LIGHTHOUSE_QUEST}`) !== "accepted") return { events: [ctx.message(ctx.actor, "Accept the lighthouse dispatch from Harbormaster Quist first.")] };
    if (!contentsOf(ctx.world, "old-pell").includes(LIGHTHOUSE_LETTER)) return { events: [ctx.message(ctx.actor, "Old Pell has not received the sealed dispatch.")] };
    const coin = Number(value(ctx.world, ctx.actor, "coin") ?? 0) + 35;
    const world = tell(ctx.world, [
      { subject: ctx.actor, predicate: `quest:${LIGHTHOUSE_QUEST}`, object: "completed" },
      { subject: ctx.actor, predicate: "coin", object: coin },
    ], { source: "farstone.lighthouse-dispatch.complete" });
    return { world, events: [ctx.message(ctx.actor, "Old Pell reads the dispatch and the harbor's warning chain holds. Harbormaster Quist pays 35 coin.")] };
  }
  if (!civic(ctx.world, ctx.actor)) return { events: [ctx.message(ctx.actor, "Public work is certified downtown.")] };
  const id = ctx.argument.trim();
  if (id.length === 0) return { events: [ctx.message(ctx.actor, "Complete which civic work record?")] };
  try {
    let world = completeCivicWork(ctx.world, { id, outcome: "certified in Farston's public record" });
    if (value(world, id, "required-capability") === "infrastructure-operation") {
      world = tell(world, [
        { subject: "the-elm-and-third-pothole", predicate: "repair-status", object: "filled-and-inspected" },
        { subject: "citizen-complaint-elm-and-third", predicate: "complaint-status", object: "resolved" },
      ], { source: "farstone.public-works.repair" });
    }
    return { world, events: [ctx.message(ctx.actor, `${id} is completed and certified.`)] };
  } catch (error) {
    return { events: [ctx.message(ctx.actor, error instanceof Error ? error.message : "That work cannot be completed.")] };
  }
}

function accept(ctx: any) {
  if (ctx.argument.trim() !== LIGHTHOUSE_QUEST) return { events: [ctx.message(ctx.actor, `Accept ${LIGHTHOUSE_QUEST} at the Harbormaster's Office.`)] };
  if (placeOf(ctx.world, ctx.actor) !== "the-harbormasters-office") return { events: [ctx.message(ctx.actor, "Harbormaster Quist keeps the dispatch at her office over the ferry slip.")] };
  if (value(ctx.world, ctx.actor, `quest:${LIGHTHOUSE_QUEST}`) === "completed") return { events: [ctx.message(ctx.actor, "The lighthouse dispatch is already complete.")] };
  if (placeOf(ctx.world, LIGHTHOUSE_LETTER) !== "the-harbormasters-office") return { events: [ctx.message(ctx.actor, "That dispatch is already in transit; Quist will not conjure a second sealed warning.")] };
  const world = tell(move(ctx.world, LIGHTHOUSE_LETTER, ctx.actor, { source: "farstone.lighthouse-dispatch.accept" }), {
    subject: ctx.actor, predicate: `quest:${LIGHTHOUSE_QUEST}`, object: "accepted",
  }, { source: "farstone.lighthouse-dispatch.accept" });
  return { world, events: [ctx.message(ctx.actor, "Quist entrusts you with a sealed dispatch. Give it to Old Pell at the harbor light, then complete deliver-the-lighthouse-dispatch.")] };
}

function quests(ctx: any) {
  const status = value(ctx.world, ctx.actor, `quest:${LIGHTHOUSE_QUEST}`) ?? "available";
  return { events: [ctx.message(ctx.actor, `Lighthouse Dispatch: ${status}. Harbormaster Quist's sealed warning must reach Old Pell through the living harbor.`)] };
}

function fund(ctx: any) {
  if (!civic(ctx.world, ctx.actor)) return { events: [ctx.message(ctx.actor, "Public funds are committed downtown.")] };
  const amount = Number(ctx.argument.trim());
  if (!Number.isFinite(amount) || amount < 0) return { events: [ctx.message(ctx.actor, "Fund with a nonnegative amount.")] };
  try {
    return { world: spendCivicBudget(ctx.world, DREDGING_MATTER, amount), events: [ctx.message(ctx.actor, `${amount} public funds committed to Application 23.`)] };
  } catch (error) {
    return { events: [ctx.message(ctx.actor, error instanceof Error ? error.message : "The funds cannot be committed.")] };
  }
}

export const farstoneArcCapability = defineCapability({
  id: "farstone.arcs",
  commands: { petition, inspect, audit: inspect, recheck: inspect, reinspect: inspect, "civic-petition": civicPetition, vote, resolve, assign, complete, fund, accept, quests },
});
