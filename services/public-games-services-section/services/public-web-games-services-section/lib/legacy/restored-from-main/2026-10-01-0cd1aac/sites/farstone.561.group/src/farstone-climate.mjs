/**
 * Farstone's climate, woven into the systems it already runs — not six new mechanisms but six
 * couplings of one climate spine into ecology, the market, needs, and civic life:
 *
 *   - **stormCascade** — a storm closes the harbor and cancels the ferry.
 *   - **seasonalEcology** — spring spawns fish; storms churn runoff into the sea.
 *   - **shellfishClosure** — a warm season on top of recent rainfall closes the clam bed.
 *   - **fireWatch** — a long dry streak in the warm season raises the fire-danger base-rate.
 *   - **seasonalMarket** — off-season scarcity lifts the fish price; the growing season eases it.
 *   - **weatherMood** — foul or cold weather presses on rest, and the sky speaks to everyone
 *     standing outdoors.
 *
 * Time and season are read off the shared clock (`world-clock`'s `clockReport`) — reused, not
 * forked. Farstone's own weather is a richer five-state seeded Markov chain the shared clock's
 * simpler four-state model can't express, so it settles as its own `farstone-weather` cell on
 * the `farstone:climate` subject — alongside, not instead of, the shared capability's own
 * `weather` cell (kept in the report below for anything else still reading it).
 *
 * Ported from FELTOS's `farstone-climate.mjs` (the legacy Farstone-specific stash inside the
 * generic engine) now that this game owns its own climate outright. Adapted to this codebase's
 * conventions along the way: single-valued cells here are booleans (`true`/`false`), not the
 * string `"true"`/`"false"` FELTOS used; functional predicates are registered centrally in
 * `farstone-game.mts` rather than declared inline per-capability; and "things" in this game's
 * data model split into `kind: "thing"`, `kind: "npc"`, and `kind: "ship"` rather than FELTOS's
 * single `"thing"` kind plus an `"npc"` tag, so the tag-lookup helpers below account for all
 * three kinds rather than just `"thing"`.
 */
import { waresOf } from "@red-cup-engineering/feltos/market";
import { defineCapability } from "@red-cup-engineering/feltos/capabilities";
import { CLOCK, PHASE_LENGTH, SEASON_LENGTH, clockReport, clockSeed } from "@red-cup-engineering/feltos/world-clock";
import { placeOf, subjects, tell, value, values } from "@red-cup-engineering/feltos/world";

const CLIMATE = "farstone:climate";

const round1 = (n) => Math.round(n * 10) / 10;

function hasTag(world, id, tag) {
  return values(world, id, "tag").includes(tag);
}

/** Rooms carrying a given tag. */
function roomsTagged(world, tag) {
  return (subjects(world)).filter((id) => value(world, id, "kind") === "room" && hasTag(world, id, tag));
}

/**
 * Non-room entities carrying a given tag — things, npcs, and ships alike. Farstone's own bible
 * gives living NPCs their own `kind: "npc"` (see `farstone-game.mts`'s `entityAssertions`)
 * rather than FELTOS's older `kind: "thing"` plus an `"npc"` tag, so this checks all three
 * entity kinds rather than just `"thing"`.
 */
function entitiesTagged(world, tag) {
  return (subjects(world)).filter((id) => {
    const kind = value(world, id, "kind");
    return (kind === "thing" || kind === "npc" || kind === "ship") && hasTag(world, id, tag);
  });
}

function livingNpcs(world) {
  return (subjects(world)).filter((id) => value(world, id, "kind") === "npc" && value(world, id, "condition") !== "dead");
}

function broadcast(world, actors, room, text, message) {
  return actors.filter((actor) => placeOf(world, actor) === room).map((actor) => message(actor, text));
}

/** A stable roll in `[0, 1)` from a joined key — replay-exact chance, no engine RNG needed. */
function rollFor(...parts) {
  const text = parts.join("|");
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return (h >>> 0) / 0x1_0000_0000;
}

const WEATHERS = Object.freeze(["clear", "cloudy", "rain", "storm", "fog"]);

/** Farstone's cool-Atlantic maritime climate: unnormalized transition weights per season. */
export const FARSTONE_WEATHER = Object.freeze({
  spring: {
    clear: { clear: 4, cloudy: 3, fog: 2 },
    cloudy: { clear: 3, cloudy: 3, rain: 3, fog: 2 },
    rain: { cloudy: 3, rain: 3, clear: 1 },
    storm: { rain: 3, cloudy: 2, storm: 1 },
    fog: { fog: 3, cloudy: 2, clear: 3 },
  },
  summer: {
    clear: { clear: 7, cloudy: 2, fog: 2 },
    cloudy: { clear: 4, cloudy: 3, rain: 1, fog: 1 },
    rain: { cloudy: 3, clear: 2, rain: 1, storm: 1 },
    storm: { rain: 2, cloudy: 3, clear: 1 },
    fog: { clear: 5, fog: 2, cloudy: 1 },
  },
  autumn: {
    clear: { clear: 3, cloudy: 4, fog: 1 },
    cloudy: { cloudy: 3, rain: 3, storm: 2, clear: 1 },
    rain: { rain: 3, storm: 3, cloudy: 2 },
    storm: { storm: 3, rain: 3, cloudy: 2 },
    fog: { fog: 2, cloudy: 3, rain: 1 },
  },
  winter: {
    clear: { clear: 2, cloudy: 5, fog: 1 },
    cloudy: { cloudy: 4, rain: 3, storm: 2, clear: 1 },
    rain: { rain: 3, cloudy: 3, storm: 2 },
    storm: { storm: 2, rain: 3, cloudy: 3 },
    fog: { fog: 1, cloudy: 4, rain: 1 },
  },
});

/** Sample the next weather from the model's row, using a uniform roll `r ∈ [0,1)`. */
function stepWeather(current, season, roll) {
  const row = FARSTONE_WEATHER[season]?.[current] ?? {};
  let total = 0;
  for (const wx of WEATHERS) total += row[wx] ?? 0;
  if (total <= 0) return current;
  const target = roll * total;
  let acc = 0;
  for (const wx of WEATHERS) {
    acc += row[wx] ?? 0;
    if (target < acc) return wx;
  }
  return current;
}

const WEATHER_LINE = Object.freeze({
  clear: "The sky is clear over the granite; light lies clean on the water.",
  cloudy: "A low grey ceiling sits over the harbor, flat and close.",
  rain: "Rain comes down steady and cold, running black off the slate roofs.",
  storm: "The storm drives in off the Atlantic — spray over the breakwater, lines singing.",
  fog: "Fog stands thick on the water; the South Point light is only a smear.",
});

export function farstoneClimateReport(world) {
  const clock = clockReport(world);
  return Object.freeze({
    ...clock,
    farstoneWeather: (value(world, CLIMATE, "farstone-weather")) ?? "clear",
    harborClosed: value(world, CLIMATE, "harbor-closed") === true,
    shellfishClosed: value(world, CLIMATE, "shellfish-closed") === true,
    fireDanger: value(world, CLIMATE, "fire-danger") ?? "low",
  });
}

function almanac(ctx) {
  const report = farstoneClimateReport(ctx.world);
  const advisories = [
    report.harborClosed ? "The harbor is closed." : "The harbor is open.",
    report.shellfishClosed ? "The clam bed is closed." : "The clam bed is open.",
    `Fire danger is ${report.fireDanger}.`,
  ];
  const sky = WEATHER_LINE[report.farstoneWeather] ?? report.farstoneWeather;
  return {
    events: [ctx.message(ctx.actor, `Almanac of Farstone — ${report.season}, ${report.phase}. ${sky} The tide runs ${report.tide}. ${advisories.join(" ")}`)],
  };
}

export const farstoneClimateCapability = defineCapability({
  id: "farstone.climate",
  commands: { almanac, forecast: almanac },

  onTick(ctx) {
    // `world0` is read from once, throughout, on purpose: every `value`/`values`/`subjects`
    // lookup in `world.mjs` is memoized per exact world-object identity, so re-reading the same
    // snapshot is effectively free, while each `tell()` mints a brand-new world object and so
    // invalidates that memoization wholesale. None of the six couplings below depend on another
    // coupling's write within the same tick (each settles its own predicates off pre-tick state
    // plus the freshly-stepped `weather` local), so every claim is collected into one array and
    // applied in a single `tell()` at the end — one new world object per tick, not one per claim.
    const world0 = ctx.world;
    if (value(world0, CLOCK, "world-time") === null) return undefined;
    const events = [];
    const claims = [];
    const report = clockReport(world0);
    const { time, season, phase } = report;
    const boundary = time % PHASE_LENGTH === 0;
    const seasonTurn = time % SEASON_LENGTH === 0;

    // Farstone's own five-state seeded Markov weather rolls once per phase boundary, seeded on
    // the clock's own seed and time — replay-exact, and never `Math.random`.
    let weather = (value(world0, CLIMATE, "farstone-weather")) ?? "clear";
    if (boundary) {
      weather = stepWeather(weather, season, rollFor(clockSeed(world0), time));
      claims.push({ subject: CLIMATE, predicate: "farstone-weather", object: weather });
    }

    // stormCascade — the storm closes the working waterfront and cancels the ferry; clearing
    // reopens it.
    const stormed = weather === "storm";
    const closed = value(world0, CLIMATE, "harbor-closed") === true;
    if (stormed && !closed) {
      claims.push({ subject: CLIMATE, predicate: "harbor-closed", object: true });
      for (const f of entitiesTagged(world0, "ferry")) claims.push({ subject: f, predicate: "sailing", object: "cancelled" });
      for (const r of roomsTagged(world0, "harbor")) events.push(...broadcast(world0, ctx.actors, r, "Storm cones run up the signal mast — the harbormaster closes the harbor. No vessel sails until it lifts.", ctx.message));
      for (const r of roomsTagged(world0, "ferry")) events.push(...broadcast(world0, ctx.actors, r, "A chalked notice goes up: SAILING CANCELLED — FOUL WEATHER. Stranded passengers crowd the benches.", ctx.message));
    } else if (!stormed && closed) {
      claims.push({ subject: CLIMATE, predicate: "harbor-closed", object: false });
      for (const f of entitiesTagged(world0, "ferry")) claims.push({ subject: f, predicate: "sailing", object: "scheduled" });
      for (const r of roomsTagged(world0, "harbor")) events.push(...broadcast(world0, ctx.actors, r, "The storm cones come down. The harbor is open again, and the ferry makes ready for its run.", ctx.message));
    }

    // seasonalEcology — spring spawns fish; storms churn runoff into the sea — at each phase
    // boundary.
    if (boundary) {
      for (const cell of roomsTagged(world0, "ocean")) {
        if (weather === "storm") {
          const pollution = round1(Number(value(world0, cell, "pollution") ?? 0) + 1.5);
          claims.push({ subject: cell, predicate: "pollution", object: pollution });
          const fishPollution = value(world0, cell, "resource-pollution:fish");
          if (typeof fishPollution === "number") claims.push({ subject: cell, predicate: "resource-pollution:fish", object: round1(fishPollution + 1.5) });
        }
        if (season === "spring") {
          const cap = Number(value(world0, cell, "resource-capacity:fish") ?? 20);
          const stock = Number(value(world0, cell, "resource-stock:fish") ?? cap);
          if (stock < cap) claims.push({ subject: cell, predicate: "resource-stock:fish", object: round1(Math.min(cap, stock + cap * 0.05)) });
        }
      }
    }

    // shellfishClosure — a warm season on top of recent rainfall closes the clam bed — at each
    // phase boundary.
    if (boundary) {
      const wet = weather === "rain" || weather === "storm";
      const rainfall = Math.min(10, Math.max(0, Number(value(world0, CLIMATE, "recent-rainfall") ?? 0) + (wet ? 2 : -1)));
      claims.push({ subject: CLIMATE, predicate: "recent-rainfall", object: rainfall });
      const shouldClose = season === "summer" && rainfall >= 4;
      const was = value(world0, CLIMATE, "shellfish-closed") === true;
      if (shouldClose !== was) {
        claims.push({ subject: CLIMATE, predicate: "shellfish-closed", object: shouldClose });
        const affected = [...roomsTagged(world0, "marsh"), ...roomsTagged(world0, "shellfish")];
        for (const r of affected) claims.push({ subject: r, predicate: "shellfish-closed", object: shouldClose });
        const where = [...new Set([...affected, ...roomsTagged(world0, "harbor")])];
        for (const r of where) events.push(...broadcast(world0, ctx.actors, r, shouldClose ? "The records clerk posts a shellfish closure — the warm, freshened water has shut the clam bed." : "The shellfish closure lifts; the clam bed is open to harvest again.", ctx.message));
      }
    }

    // fireWatch — a dry warm spell raises the fire-danger base-rate — at each phase boundary.
    if (boundary) {
      const dry = Number(value(world0, CLOCK, "dry-streak") ?? 0);
      const warm = season === "summer" || season === "spring";
      const danger = !warm ? "low" : dry >= 8 ? "high" : dry >= 4 ? "moderate" : "low";
      if (value(world0, CLIMATE, "fire-danger") !== danger) {
        claims.push({ subject: CLIMATE, predicate: "fire-danger", object: danger });
        if (danger === "high") for (const r of [...roomsTagged(world0, "forest"), ...roomsTagged(world0, "outdoor")]) events.push(...broadcast(world0, ctx.actors, r, "A fire-watch notice is posted: the woods are tinder-dry. No open flame above the watershed line.", ctx.message));
      }
    }

    // seasonalMarket — off-season scarcity lifts the fish price; the growing season eases it —
    // at each season turn.
    if (seasonTurn) {
      const off = season === "autumn" || season === "winter";
      const factor = off ? 1.3 : 0.8;
      for (const shop of subjects(world0).filter((subject) => typeof value(world0, subject, "trades-for") === "string")) {
        for (const item of waresOf(world0, shop)) {
          if (value(world0, item, "ware-type") !== "fish") continue;
          const price = value(world0, item, "price");
          claims.push({ subject: item, predicate: "price", object: Math.max(1, Math.round(price * factor)) });
        }
      }
    }

    // weatherMood — foul or cold weather presses on rest, and the sky speaks to everyone
    // standing outdoors — at each phase boundary.
    if (boundary) {
      const harsh = weather === "rain" || weather === "storm" || weather === "fog" || season === "winter";
      if (harsh) for (const npc of livingNpcs(world0)) {
        const rest = Math.min(20, Number(value(world0, npc, "need:rest") ?? 0) + 1);
        claims.push({ subject: npc, predicate: "need:rest", object: rest });
      }
      if (phase === "dawn" || phase === "dusk" || harsh) {
        const line = WEATHER_LINE[weather] ?? "";
        for (const r of roomsTagged(world0, "outdoor")) events.push(...broadcast(world0, ctx.actors, r, line, ctx.message));
      }
    }

    const world = claims.length === 0 ? world0 : tell(world0, claims, { source: "farstone.climate" });
    return { world, events };
  },
});
