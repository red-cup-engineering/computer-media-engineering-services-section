/** Farstone's genre-toolkit catalogs: wares, recipes, resources, ship classes, professions,
 * titles, souls, factions, and laws. Plain data for `@red-cup-engineering/feltos`'s `GameCatalogs` seam. */

const defineSoul = (actor, room) => Object.freeze({ id: actor, actor, room });

export const WARES = Object.freeze({
  fizzwater: { id: "fizzwater", name: "a pint of fizzwater", description: "A foaming pint cut with the spring's own fizz.", tags: ["item", "takeable", "edible", "nutrition:1"], basePrice: 3, baseStock: 10, sourceTags: ["harbor", "curiosity"] },
  fish: { id: "fish", name: "a fresh fish", description: "A silver fish off the bank.", tags: ["item", "takeable", "fish", "edible", "nutrition:3"], basePrice: 2, baseStock: 6, sourceTags: ["fishing", "dock", "harbor"] },
  rope: { id: "rope", name: "a coil of rope", description: "Hand-laid hemp rope, sound and strong.", tags: ["item", "takeable", "fiber"], basePrice: 8, baseStock: 4, sourceTags: ["forge", "craft", "shop"] },
});

export const RECIPES = Object.freeze({
  rope: {
    name: "rope",
    inputs: [{ tag: "fiber", count: 2 }],
    skill: "ropework",
    output: { id: "rope", name: "a coil of rope", description: "Hand-laid hemp rope, sound and strong.", tags: ["item", "takeable", "fiber"] },
  },
  plank: {
    name: "plank",
    inputs: [{ tag: "timber", count: 1 }],
    tool: "saw",
    skill: "carpentry",
    output: { id: "plank", name: "a sawn plank", description: "A fresh-sawn plank, fair and true.", tags: ["item", "takeable", "timber"] },
  },
  knife: {
    name: "knife",
    inputs: [{ tag: "iron", count: 1 }],
    tool: "hammer",
    station: "forge",
    skill: "smithing",
    output: { id: "knife", name: "a fish knife", description: "A short blade, ground keen.", tags: ["item", "takeable", "weapon", "weapon-damage:2", "value:6"] },
  },
  stew: {
    name: "stew",
    inputs: [{ tag: "fish", count: 1 }],
    station: "galley",
    skill: "cooking",
    output: { id: "stew", name: "a bowl of stew", description: "Hot fish stew, thick and good.", tags: ["item", "takeable", "edible", "nutrition:5"] },
  },
});

/** The retained forge loop from the harbor iteration: raw, placed materials
 * and tools transform into immediately usable objects. */
export const SITUATED_RECIPES = Object.freeze({
  "smoke-fish": {
    id: "smoke-fish", name: "smoke-fish", inputs: [{ predicate: "ware-type", object: "fish", count: 1 }], station: "inn",
    output: { name: "a side of smoked fish", assertions: [{ predicate: "provides", object: "need:hunger" }, { predicate: "amount", object: 1 }, { predicate: "preserved", object: "smoked" }] },
  },
  "mend-net": {
    id: "mend-net", name: "mend-net", inputs: [{ predicate: "material", object: "hemp", count: 1 }], station: "craft",
    output: { name: "a mended fishing net", assertions: [{ predicate: "tool", object: "fishing" }, { predicate: "material", object: "hemp" }, { predicate: "condition", object: "mended" }] },
  },
  blade: {
    id: "blade", name: "blade", inputs: [{ predicate: "material", object: "iron", count: 2 }], tool: "hammer", station: "forge",
    output: { name: "a forged harbor blade", assertions: [{ predicate: "material", object: "iron" }, { predicate: "weapon-damage", object: 4 }, { predicate: "weapon-skill", object: "knife" }] },
  },
  nail: {
    id: "nail", name: "nail", inputs: [{ predicate: "material", object: "iron", count: 1 }], tool: "hammer", station: "forge",
    output: { name: "a handful of forged nails", assertions: [{ predicate: "material", object: "iron" }, { predicate: "construction", object: "fastener" }] },
  },
  plank: {
    id: "plank", name: "plank", inputs: [{ predicate: "material", object: "oak", count: 1 }], tool: "saw", station: "forge",
    output: { name: "a sawn oak plank", assertions: [{ predicate: "material", object: "oak" }, { predicate: "construction", object: "timber" }] },
  },
});

/** Farstone's authored wool industry: each finite stage needs the preceding possession. */
export const TEXTILE_RECIPES = Object.freeze([
  {
    id: "card-fleece", name: "card fleece",
    inputs: [{ predicate: "textile-stage", object: "fleece", count: 1 }],
    station: "carding-bench", skill: "carding",
    output: { name: "a hank of carded wool", assertions: [
      { predicate: "ware-type", object: "fiber" },
      { predicate: "material", object: "wool" },
      { predicate: "textile-stage", object: "carded" },
    ] },
  },
  {
    id: "full-carded-wool", name: "full carded wool",
    inputs: [{ predicate: "textile-stage", object: "carded", count: 1 }],
    station: "fulling-stocks", skill: "felting",
    output: { name: "a bolt of tough felt", assertions: [
      { predicate: "material", object: "wool" },
      { predicate: "textile-stage", object: "felt" },
    ] },
  },
  {
    id: "tailor-felt-coat", name: "tailor felt into a coat",
    inputs: [{ predicate: "textile-stage", object: "felt", count: 1 }],
    station: "fulling-stocks", skill: "felting",
    output: { name: "a boiled-wool coat", assertions: [
      { predicate: "textile-stage", object: "garment" },
      { predicate: "tag", object: "armor" },
      { predicate: "armor-protection", object: 4 },
      { predicate: "armor-covers", object: "torso" },
      { predicate: "weight", object: 3 },
    ] },
  },
]);

export const RESOURCES = Object.freeze({
  fish: {
    resource: "fish", skill: "fishing", max: 5, regrowEvery: 6,
    item: { name: "a fresh fish", description: "A silver fish, fresh off the bank.", tags: ["item", "takeable", "fish", "edible", "nutrition:3"] },
  },
  fiber: {
    resource: "fiber", skill: "foraging", max: 6, regrowEvery: 5,
    item: { name: "a hank of hemp fiber", description: "Raw combed hemp, ready to lay into rope.", tags: ["item", "takeable", "fiber"] },
  },
  timber: {
    resource: "timber", skill: "woodcutting", max: 4, regrowEvery: 10,
    item: { name: "a baulk of timber", description: "A squared length of seasoned oak.", tags: ["item", "takeable", "timber"] },
  },
  iron: {
    resource: "iron", skill: "mining", max: 4, regrowEvery: 12,
    item: { name: "a lump of iron ore", description: "Heavy red ore, ready for the forge.", tags: ["item", "takeable", "iron"] },
  },
  stone: {
    resource: "stone", skill: "masonry", max: 8, regrowEvery: 9,
    item: { name: "a block of granite", description: "Squared grey granite, cut from the quarry.", tags: ["item", "takeable", "stone"] },
  },
});

/** Verb aliases that gather a specific resource (bare `gather <resource>` works for any). */
export const GATHER_VERBS = Object.freeze({
  fish: "fish",
  forage: "fiber",
  chop: "timber",
  mine: "iron",
  quarry: "stone",
});

const oneRoom = (name, description) =>
  [{ suffix: "deck", name, description, deck: true, helm: true }];

export const SHIP_CLASSES = Object.freeze({
  raft: {
    hull: 4, speed: 1, cargo: 1, cost: 15, timber: 2,
    rooms: oneRoom("the raft", "A few logs lashed with rope — barely a deck, but it floats."),
  },
  dinghy: {
    hull: 6, speed: 1, cargo: 2, cost: 35, timber: 3,
    rooms: oneRoom("the new dinghy", "A clinker-built dinghy fresh off the stocks, smelling of pitch."),
  },
  skiff: {
    hull: 8, speed: 1, cargo: 4, cost: 60, timber: 5,
    rooms: [
      { suffix: "deck", name: "the skiff's deck", description: "A trim single-masted deck of new planking, the tiller aft.", exits: { aft: "helm" }, deck: true },
      { suffix: "helm", name: "the skiff's tiller", description: "The aft thwart, tiller in hand.", exits: { forward: "deck" }, helm: true },
    ],
  },
  station: {
    hull: 24, speed: 0, cargo: 20, cost: 120, timber: 10,
    rooms: [
      { suffix: "deck", name: "the sea-station's platform", description: "A timber platform pinned to the seabed on tarred piles, derricks and winches crowding the deck.", deck: true },
    ],
  },
  lugger: {
    hull: 18, speed: 2, cargo: 12, cost: 240, timber: 14,
    rooms: [
      { suffix: "deck", name: "the lugger's deck", description: "A broad new working deck, hatch forward, wheel aft.", exits: { aft: "wheel", below: "hold" }, deck: true },
      { suffix: "wheel", name: "the lugger's wheel", description: "The helm aft; she answers from here.", exits: { forward: "deck" }, helm: true },
      { suffix: "hold", name: "the lugger's hold", description: "A dry dark hold, room for a real load.", exits: { above: "deck" } },
    ],
  },
});

export const PROFESSIONS = Object.freeze({
  fisher: { title: "Fisher", skills: ["fishing", "sailing"] },
  shipwright: { title: "Shipwright", skills: ["carpentry", "woodcutting"] },
  smith: { title: "Smith", skills: ["smithing", "mining"] },
  cook: { title: "Cook", skills: ["cooking", "foraging"] },
  trader: { title: "Trader", skills: ["ropework", "searching", "magic"] },
});

export const TITLES = Object.freeze([
  { at: 0, title: "newcomer" },
  { at: 25, title: "harbor-hand" },
  { at: 75, title: "mariner" },
  { at: 200, title: "master mariner" },
  { at: 500, title: "harbor legend" },
]);

export const SOULS = Object.freeze({
  smile: defineSoul("smile", "smiles"),
  grin: defineSoul("grin", "grins"),
  laugh: defineSoul("laugh", "laughs"),
  wave: defineSoul("wave", "waves"),
  bow: defineSoul("bow", "bows"),
  nod: defineSoul("nod", "nods"),
  wink: defineSoul("wink", "winks"),
  frown: defineSoul("frown", "frowns"),
  glare: defineSoul("glare", "glares"),
  cheer: defineSoul("cheer", "cheers"),
  shrug: defineSoul("shrug", "shrugs"),
  dance: defineSoul("dance", "dances"),
  bounce: defineSoul("bounce", "bounces"),
  ponder: defineSoul("ponder", "ponders"),
  sigh: defineSoul("sigh", "sighs"),
  cackle: defineSoul("cackle", "cackles"),
});

/** Farstone's four factions: the working fleet, the regulating watch, the chapel, the marsh. */
export const FACTIONS = Object.freeze({
  fishers: { id: "fishers", name: "the Fishers' fellowship", rivals: ["watch"] },
  watch: { id: "watch", name: "the Harbor Watch", rivals: ["fishers"] },
  chapel: { id: "chapel", name: "the Chapel of Maraset", rivals: ["marsh"] },
  marsh: { id: "marsh", name: "Morrigan's marsh-folk", rivals: ["chapel"] },
});

export const LAWS = Object.freeze(["pollution-cap", "fishing-quota"]);

export const STRUCTURES = Object.freeze({
  shack: { id: "shack", name: "a fishing shack", description: "A rough plank shack, tar-caulked against the weather — a place of your own on the cold waterfront.", needs: { timber: 4 }, tags: ["place", "indoor", "built", "shelter"], skill: "carpentry" },
  jetty: { id: "jetty", name: "a timber jetty", description: "A jetty of driven piles reaching out over the water, sound enough to moor a vessel against.", needs: { timber: 5 }, tags: ["place", "outdoor", "built", "dock"], skill: "carpentry" },
  smokehouse: { id: "smokehouse", name: "a smokehouse", description: "A timber smokehouse, racks hung for curing the catch over a slow alder fire.", needs: { timber: 3, iron: 1 }, tags: ["place", "indoor", "built", "craft", "forge"], skill: "carpentry" },
  cottage: { id: "cottage", name: "a granite cottage", description: "A low cottage of squared granite under a turf roof — built to outlast its builder, the way the island builds.", needs: { stone: 6, timber: 2 }, tags: ["place", "indoor", "built", "shelter", "social-hub"], skill: "masonry" },
  cairn: { id: "cairn", name: "a stone cairn", description: "A cairn of stacked granite, a marker on the bare ground that will stand long after you are gone.", needs: { stone: 4 }, tags: ["place", "outdoor", "built"], skill: "masonry" },
});

/** Finite sources yield possessions. Prices retained from the existing fish catalog are pennies. */
export const GATHERINGS = Object.freeze([
  { name: "fish", command: "fish", places: ["the-fishing-grounds"], stock: { resource: "fish", subject: "the-fishing-grounds" },
    closure: { subject: "farstone:climate", predicate: "harbor-closed" }, skill: "fishing",
    output: { name: "a fresh fish", description: "A silver fish off the bank.", assertions: [
      { predicate: "ware-type", object: "fish" }, { predicate: "tag", object: "fish" },
      { predicate: "provides", object: "need:hunger" }, { predicate: "amount", object: 1 }, { predicate: "price", object: WARES.fish.basePrice },
    ] } },
  { name: "shellfish", command: "harvest", places: ["the-clam-flats"], stock: { resource: "shellfish", subject: "the-clam-flats" },
    closure: { subject: "farstone:climate", predicate: "shellfish-closed" }, skill: "shellfishing",
    output: { name: "a handful of clams", assertions: [{ predicate: "ware-type", object: "shellfish" }, { predicate: "provides", object: "need:hunger" }, { predicate: "amount", object: 1 }] } },
  { name: "food", command: "harvest", places: ["branning-farm"], stock: { resource: "food", subject: "branning-farm" }, skill: "farming",
    output: { name: "a bundle of farm provisions", assertions: [{ predicate: "ware-type", object: "food" }, { predicate: "provides", object: "need:hunger" }, { predicate: "amount", object: 1 }] } },
  { name: "water", command: "harvest", places: ["the-spring-house"], stock: { resource: "water", subject: "the-spring-house" }, skill: "waterkeeping",
    output: { name: "a measure of spring water", assertions: [{ predicate: "ware-type", object: "water" }, { predicate: "amount", object: 1 }] } },
  { name: "fiber", command: "harvest", places: ["the-high-pasture"], stock: { resource: "fiber", subject: "the-high-pasture" }, skill: "shearing",
    output: { name: "a raw fleece", assertions: [
      { predicate: "ware-type", object: "fiber" }, { predicate: "material", object: "wool" },
      { predicate: "textile-stage", object: "fleece" },
    ] } },
]);
