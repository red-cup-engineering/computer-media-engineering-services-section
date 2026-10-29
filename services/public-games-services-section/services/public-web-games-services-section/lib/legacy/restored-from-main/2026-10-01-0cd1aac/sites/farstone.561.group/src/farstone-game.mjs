import harborBible from "../docs/world/harbor.json" with { type: "json" };
import { composeCapabilities } from "@red-cup-engineering/feltos/capabilities";
import { commerceCapability } from "@red-cup-engineering/feltos/market";
import { gatheringCapability } from "@red-cup-engineering/feltos/gathering";
import { craftingCapability } from "@red-cup-engineering/feltos/crafting";
import { GATHERINGS, SITUATED_RECIPES, TEXTILE_RECIPES, SHIP_CLASSES, STRUCTURES } from "./catalogs.mjs";
import { resourceEcologyCapability } from "@red-cup-engineering/feltos/ecology";
import { civicDeadlineCapability } from "@red-cup-engineering/feltos/civics";
import { directorCapability } from "@red-cup-engineering/feltos/director";
import { defineGame } from "@red-cup-engineering/feltos/game";
import { npcNeedsCapability } from "@red-cup-engineering/feltos/npc";
import { needsCapability } from "@red-cup-engineering/feltos/needs";
import { routineCapability } from "@red-cup-engineering/feltos/routines";
import { signalCapability } from "@red-cup-engineering/feltos/signals";
import { shipsCapability, shipbuildingCapability } from "@red-cup-engineering/feltos/ships";
import { worldClockCapability } from "@red-cup-engineering/feltos/world-clock";
import { generateFrontier } from "@red-cup-engineering/feltos/worldgen";
import { farstoneArcCapability } from "./farstone-arcs.mjs";
import { farstoneCivicCorpusAssertions } from "./farstone-civic-corpus.mjs";
import { farstoneClimateCapability } from "./farstone-climate.mjs";
import { farstoneDepthsCapability } from "./depths.mjs";
import { farstoneDirectorCapability } from "./director.mjs";
import { farstoneProgressionCapability } from "./farstone-progression.mjs";
import { farstoneSocialCapability } from "./farstone-social.mjs";

const functionalPredicates = Object.freeze([
  "active-thought", "advisory", "attack", "campaign-stage", "coin", "condition", "decision-status", "civic-deadline", "embittered", "guild", "kind",
  "amount", "died-at", "dry-streak", "fire-danger", "harbor-closed", "health", "need:hunger", "need:rest", "need:recreation", "pollution",
  "wielding", "wielded", "wearing", "worn", "stance", "locked", "lock-state",
  "mana", "wound", "infected", "hidden", "revealed", "concealment", "noticed", "skill:combat", "skill:lockpicking", "skill:crafting.smithing.black", "skill:magic.evocation", "skill:magic.illusion", "skill:people.healing", "skill:covert.stealth", "skill:covert.theft",
  "worships", "piety", "skill:faith.devotion", "skill:faith.rituals",
  "knows-spell:spark", "knows-spell:mend", "knows-spell:befuddle", "knows-spell:frostbite",
  "permit-resolved", "price", "shellfish-closed", "skill", "standing", "structures-built", "quest:deliver-the-lighthouse-dispatch",
  "thought-progress", "thoughts-fixed", "want-reward", "wants", "water-quality", "weather", "world-seed", "world-time",
  "farstone-weather", "recent-rainfall", "sailing",
  "resource-stock:fish", "resource-capacity:fish", "resource-pollution:fish", "resource-growth-rate:fish", "resource-cleanup-rate:fish",
  "resource-stock:shellfish", "resource-capacity:shellfish", "resource-pollution:shellfish",
  "resource-growth-rate:shellfish", "resource-cleanup-rate:shellfish",
  "resource-stock:food", "resource-capacity:food", "resource-pollution:food",
  "resource-growth-rate:food", "resource-cleanup-rate:food",
  "resource-stock:water", "resource-capacity:water", "resource-pollution:water",
  "resource-growth-rate:water", "resource-cleanup-rate:water",
  "resource-stock:fiber", "resource-capacity:fiber", "resource-pollution:fiber",
  "resource-growth-rate:fiber", "resource-cleanup-rate:fiber",
  "ware-type", "trades-for", "textile-stage",
  "budget:civic-dredging", "budget:civic-maple-and-birch-stop", "petition-threshold", "assigned-to", "work-status", "repair-status", "complaint-status", "traffic-control-status", "deck-room", "helm-room", "part-of", "hull", "speed", "cargo-capacity", "owner", "rent", "ringing", "last-rung-by", "signal-tick", "tending",
]);

const farstoneCraftingCapability = craftingCapability({
  recipes: [...Object.values(SITUATED_RECIPES), ...TEXTILE_RECIPES, {
    id: "shack", name: STRUCTURES.shack.name, skill: STRUCTURES.shack.skill,
    inputs: [{ predicate: "material", object: "oak", count: STRUCTURES.shack.needs.timber }],
    output: { name: STRUCTURES.shack.name, kind: "structure", assertions: [
      { predicate: "description", object: STRUCTURES.shack.description },
      ...STRUCTURES.shack.tags.map((tag) => ({ predicate: "tag", object: tag })),
    ] },
  }],
  workers: [
    { role: "carder", location: "the-wool-walk", recipes: ["card-fleece"] },
    { role: "felter", location: "the-fulling-shed", recipes: ["full-carded-wool", "tailor-felt-coat"] },
  ],
});
const farstoneShipbuildingCapability = shipbuildingCapability({
  classes: { raft: SHIP_CLASSES.raft, dinghy: SHIP_CLASSES.dinghy },
  yards: { "the-boatyard": "the-boatyard" },
});
const farstoneGatheringCapability = gatheringCapability(GATHERINGS);
const farstoneResourceEcologyCapability = resourceEcologyCapability(["fish", "shellfish", "food", "water", "fiber"]);

function entityAssertions(entity, kind) {
  const claims = [
    { subject: entity.id, predicate: "kind", object: kind },
  ];
  for (const tag of entity.tags ?? []) {
    claims.push({ subject: entity.id, predicate: "tag", object: tag });
    if (tag.startsWith("provides:")) {
      claims.push({ subject: entity.id, predicate: "provides", object: tag.slice("provides:".length) });
    }
    const split = tag.lastIndexOf(":");
    if (split > 0) {
      const predicate = tag.slice(0, split);
      const raw = tag.slice(split + 1);
      const numeric = Number(raw);
      const scalar = raw === "true" ? true : raw === "false" ? false : Number.isFinite(numeric) ? numeric : raw;
      claims.push({ subject: entity.id, predicate, object: scalar });
    }
  }
  const roleTags = new Set(["innkeeper", "shopkeeper", "smith", "lamp-keeper"]);
  for (const tag of entity.tags ?? []) {
    if (roleTags.has(tag) && !claims.some((claim) => claim.predicate === "role" && claim.object === tag)) {
      claims.push({ subject: entity.id, predicate: "role", object: tag });
    }
  }
  if (kind === "npc") {
    if (!claims.some((claim) => claim.predicate === "health")) claims.push({ subject: entity.id, predicate: "health", object: 20 });
    claims.push({ subject: entity.id, predicate: "condition", object: "alive" });
  }
  return claims;
}

/** Convert Farstone's authored Bible into the one inert FeltOS game-data boundary. */
export function gameFromBible(bible) {
  // The retired Wild builder's effect was a replayable forty-place exploration
  // layer. It is now attached to the authored island through FeltOS data.
  const frontier = bible.rooms.some(({ id }) => id === "harbor-quay")
    ? generateFrontier({ seed: "farstone-wild", anchor: "harbor-quay", count: 40, idPrefix: "farstone-wild" }) : null;
  const allRooms = [...bible.rooms, ...(frontier?.rooms ?? [])];
  const shipRooms = (bible.ships ?? []).flatMap((ship) => (ship.rooms ?? []).map((room) => ({ room, ship })));
  const rooms = Object.fromEntries([...allRooms.map((room) => ({ room })), ...shipRooms].map(({ room }) => [room.id, {
    name: room.name,
    description: room.description,
    exits: { ...(room.exits ?? {}), ...(room.id === frontier?.anchor ? { wild: frontier.rooms[0].id } : {}) },
  }]));
  const entities = [
    ...(bible.items ?? []).map((entity) => ({ entity, kind: "thing" })),
    // The bible's historical `npcs` section also held gear carried by named
    // people.  Its tags, rather than that old container, identify a living NPC.
    ...(bible.npcs ?? []).map((entity) => ({ entity, kind: entity.tags?.includes("npc") ? "npc" : "thing" })),
    ...(bible.ships ?? []).map((entity) => ({ entity, kind: "ship" })),
  ];
  const things = Object.fromEntries(entities.map(({ entity }) => [entity.id, {
    name: entity.name,
    description: entity.description,
    location: entity.location,
  }]));
  const assertions = [
    ...farstoneCivicCorpusAssertions,
    ...allRooms.flatMap((room) => entityAssertions(room, "room")),
    ...entities.flatMap(({ entity, kind }) => entityAssertions(entity, kind)),
    ...shipRooms.flatMap(({ room, ship }) => [
      { subject: room.id, predicate: "part-of", object: ship.id },
      { subject: room.id, predicate: "tag", object: "ship-room" },
      ...(room.tags?.includes("deck") || (room).deck === true ? [{ subject: room.id, predicate: "tag", object: "deck" }] : []),
      ...(room.tags?.includes("helm") || (room).helm === true ? [{ subject: room.id, predicate: "tag", object: "helm" }] : []),
    ]),
    ...(bible.ships ?? []).flatMap((ship) => {
      const shipDeck = ship.rooms?.find((room) => room.deck === true)?.id ?? ship.rooms?.[0]?.id;
      const shipHelm = ship.rooms?.find((room) => room.helm === true)?.id ?? shipDeck;
      return [
        { subject: ship.id, predicate: "class", object: ship.class ?? "vessel" },
        { subject: ship.id, predicate: "hull", object: ship.hull ?? 1 },
        { subject: ship.id, predicate: "speed", object: ship.speed ?? 1 },
        { subject: ship.id, predicate: "cargo-capacity", object: ship.cargo ?? 0 },
        { subject: ship.id, predicate: "rent", object: ship.rent ?? ship.price ?? 0 },
        { subject: ship.id, predicate: "deck-room", object: shipDeck },
        { subject: ship.id, predicate: "helm-room", object: shipHelm },
      ];
    }),
    { subject: "the-dredging-permit", predicate: "decision-status", object: "open" },
    { subject: "the-dredging-permit", predicate: "civic-deadline", object: 31 },
    { subject: "farstone-mariners-guild", predicate: "kind", object: "guild" },
    { subject: "farstone-mariners-guild", predicate: "name", object: "the Mariners' Guild" },
    { subject: "farstone-mariners-guild", predicate: "leader", object: "guildmaster-orla" },
    { subject: "civic-dredging", predicate: "kind", object: "feltos.civic-matter" },
    { subject: "civic-dredging", predicate: "name", object: "Application 23 dredging decision" },
    { subject: "civic-dredging", predicate: "decision-status", object: "open" },
    { subject: "civic-dredging", predicate: "budget:civic-dredging", object: 500 },
    { subject: "civic-dredging", predicate: "petition-threshold", object: 1 },
    { subject: "civic-maple-and-birch-stop", predicate: "kind", object: "feltos.civic-matter" },
    { subject: "civic-maple-and-birch-stop", predicate: "name", object: "Maple and Birch four-way stop petition" },
    { subject: "civic-maple-and-birch-stop", predicate: "decision-status", object: "open" },
    { subject: "civic-maple-and-birch-stop", predicate: "civic-deadline", object: 20 },
    { subject: "civic-maple-and-birch-stop", predicate: "budget:civic-maple-and-birch-stop", object: 0 },
    { subject: "civic-maple-and-birch-stop", predicate: "petition-threshold", object: 1 },
    { subject: "civic-maple-and-birch-stop", predicate: "recorded-signature-count", object: 73 },
    { subject: "civic-maple-and-birch-stop", predicate: "filed-with", object: "clerk-halloran" },
    { subject: "the-maple-and-birch-intersection", predicate: "traffic-control-status", object: "petition-pending" },
    { subject: "citizen-complaint-elm-and-third", predicate: "complaint-status", object: "claimed" },
    { subject: "citizen-complaint-elm-and-third", predicate: "reported-by", object: "marisol-vazquez" },
    { subject: "the-elm-and-third-pothole", predicate: "repair-status", object: "awaiting-repair" },
    { subject: "repair-pothole-elm-and-third", predicate: "kind", object: "feltos.civic-work" },
    { subject: "repair-pothole-elm-and-third", predicate: "required-capability", object: "infrastructure-operation" },
    { subject: "repair-pothole-elm-and-third", predicate: "assigned-to", object: "chief-oakes" },
    { subject: "repair-pothole-elm-and-third", predicate: "work-status", object: "open" },
    { subject: "clerk-halloran", predicate: "capability", object: "records" },
    { subject: "clerk-halloran", predicate: "capability", object: "permit-review" },
    { subject: "chief-oakes", predicate: "capability", object: "public-safety" },
    { subject: "chief-oakes", predicate: "capability", object: "infrastructure-operation" },
    { subject: "harbormaster-quist", predicate: "capability", object: "harbor-operations" },
    { subject: "harbormaster-quist", predicate: "responds-to-signal", object: "the-harbor-bell" },
    { subject: "harbormaster-quist", predicate: "response-action", object: "tending" },
    { subject: "hydrant-23", predicate: "water-quality", object: "contested" },
    { subject: "hydrant-23", predicate: "advisory", object: "boil-water" },
    { subject: "farstone:climate", predicate: "farstone-weather", object: "clear" },
    { subject: "farstone:climate", predicate: "harbor-closed", object: false },
    { subject: "farstone:climate", predicate: "shellfish-closed", object: false },
    { subject: "the-fishing-grounds", predicate: "resource-stock:fish", object: 40 },
    { subject: "the-fishing-grounds", predicate: "resource-capacity:fish", object: 40 },
    { subject: "the-fishing-grounds", predicate: "resource-pollution:fish", object: 0 },
    { subject: "the-fishing-grounds", predicate: "resource-growth-rate:fish", object: 0.035 },
    { subject: "the-fishing-grounds", predicate: "resource-cleanup-rate:fish", object: 0.01 },
    { subject: "the-chandlery", predicate: "trades-for", object: "yorrick-vane" },
    { subject: "the-fulling-shed", predicate: "trades-for", object: "bett-harrow" },
    { subject: "the-clam-flats", predicate: "resource-capacity:shellfish", object: 60 },
    { subject: "the-clam-flats", predicate: "resource-stock:shellfish", object: 40 },
    { subject: "the-clam-flats", predicate: "resource-pollution:shellfish", object: 10 },
    { subject: "the-clam-flats", predicate: "resource-growth-rate:shellfish", object: 0.035 },
    { subject: "the-clam-flats", predicate: "resource-cleanup-rate:shellfish", object: 0.025 },
    { subject: "branning-farm", predicate: "resource-capacity:food", object: 100 },
    { subject: "branning-farm", predicate: "resource-stock:food", object: 65 },
    { subject: "branning-farm", predicate: "resource-pollution:food", object: 0 },
    { subject: "branning-farm", predicate: "resource-growth-rate:food", object: 0.12 },
    { subject: "branning-farm", predicate: "resource-cleanup-rate:food", object: 0.01 },
    { subject: "the-spring-house", predicate: "resource-capacity:water", object: 100 },
    { subject: "the-spring-house", predicate: "resource-stock:water", object: 100 },
    { subject: "the-spring-house", predicate: "resource-pollution:water", object: 0 },
    { subject: "the-spring-house", predicate: "resource-growth-rate:water", object: 0.3 },
    { subject: "the-spring-house", predicate: "resource-cleanup-rate:water", object: 0.04 },
    { subject: "the-high-pasture", predicate: "resource-capacity:fiber", object: 80 },
    { subject: "the-high-pasture", predicate: "resource-stock:fiber", object: 55 },
    { subject: "the-high-pasture", predicate: "resource-pollution:fiber", object: 0 },
    { subject: "the-high-pasture", predicate: "resource-growth-rate:fiber", object: 0.06 },
    { subject: "the-high-pasture", predicate: "resource-cleanup-rate:fiber", object: 0.015 },
  ];
  return defineGame({
    id: bible.meta.world,
    name: "Farstone",
    start: bible.meta.playerStart,
    actorAssertions: [
      { predicate: "coin", object: bible.meta.playerStartCoin ?? harborBible.meta.playerStartCoin },
      { predicate: "health", object: 20 },
      { predicate: "condition", object: "alive" },
      { predicate: "skill", object: 0 },
      { predicate: "skill:combat", object: 55 },
      { predicate: "skill:lockpicking", object: 30 },
      { predicate: "skill:crafting.smithing.black", object: 3 },
      { predicate: "skill:magic.evocation", object: 3 },
      { predicate: "skill:magic.illusion", object: 2 },
      { predicate: "skill:people.healing", object: 3 },
      { predicate: "skill:covert.stealth", object: 3 },
      { predicate: "skill:covert.theft", object: 3 },
      { predicate: "skill:faith.rituals", object: 1 },
      { predicate: "worships", object: "Maraset" },
      { predicate: "piety", object: 0 },
      { predicate: "mana", object: 20 },
      { predicate: "knows-spell:spark", object: true },
      { predicate: "knows-spell:mend", object: true },
      { predicate: "knows-spell:befuddle", object: true },
      { predicate: "thoughts-fixed", object: 0 },
      { predicate: "structures-built", object: 0 },
      { predicate: "permit-resolved", object: 0 },
      { predicate: "standing", object: 0 },
      { predicate: "campaign-stage", object: 0 },
    ],
    rooms,
    things,
    assertions,
    functionalPredicates,
    capabilities: [
      worldClockCapability.id,
      civicDeadlineCapability.id,
      farstoneClimateCapability.id,
      shipsCapability.id,
      farstoneShipbuildingCapability.id,
      npcNeedsCapability.id,
      routineCapability.id,
      signalCapability.id,
      needsCapability.id,
      commerceCapability.id,
      directorCapability.id,
      farstoneDirectorCapability.id,
      farstoneDepthsCapability.id,
      farstoneProgressionCapability.id,
      farstoneSocialCapability.id,
      farstoneArcCapability.id,
      farstoneResourceEcologyCapability.id,
      farstoneGatheringCapability.id,
      farstoneCraftingCapability.id,
    ],
  });
}

export const HARBOR_BIBLE = Object.freeze(harborBible);
export const FARSTONE_GAME = gameFromBible(HARBOR_BIBLE);
export const FARSTONE_RUNTIME = composeCapabilities([
  worldClockCapability,
  civicDeadlineCapability,
  farstoneClimateCapability,
  shipsCapability,
  farstoneShipbuildingCapability,  npcNeedsCapability,
  routineCapability,
  signalCapability,
  needsCapability,
  commerceCapability,
  directorCapability,
  farstoneDirectorCapability,
  farstoneDepthsCapability,
  farstoneProgressionCapability,
  farstoneSocialCapability,
  farstoneArcCapability,
  farstoneResourceEcologyCapability,
  farstoneGatheringCapability,
  farstoneCraftingCapability,
]);
