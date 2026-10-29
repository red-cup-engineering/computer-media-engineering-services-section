// trade — okaga's basic commodity trade, on the cost-graph (design note §8). A station's prices are
// PREDICATIONS under its subject: a row `(station, buys, "water@4cr")` says the station buys water at 4
// credits; `(station, sells, "fuel@7cr")` says it sells fuel at 7. An exchange is an APPEND — buying
// appends a `(pilot, bought, "<good>@<station>")` row and debits the pilot's purse; selling the
// converse. Nothing is overwritten; your purse and hold are the FOLD of your own bought/sold trace.
//
// Why "@<n>cr" strings and not number objects: the engine's cost-graph (galaxy.chokepoints) treats a
// string object that is ALSO a subject id as a graph EDGE. A price like "water@4cr" is data, never a
// subject, so it stays a non-relational attribute and never pollutes the lane topology — the economy
// graph is the LANE graph, and prices ride alongside as attributes. (We parse the price out of the
// string; the substrate stays oblivious.)
//
// PROFIT LIVES ON THE TOPOLOGY: a good is worth most where the galaxy is forced to route through one
// system. `arbitrage(world)` finds buy-low/sell-high pairs and tags those that span a cut-vertex
// monopoly or a bridge-edge chokepoint, so the player can read the design note's claim — the economy IS
// the graph — as a concrete trade list. THE LAW: append-only, evidence linear (a credit cannot be
// duplicated; a buy debits and a sell credits, both as appended rows the purse folds).

import { logFor, relateFrom, allRows, admitLog, predicate, systemsKnown } from "./galaxy.mjs";
import { chokepoints } from "./galaxy.mjs";

// parsePrice("water@4cr") -> { good: "water", price: 4 }. A malformed price is surfaced as null (never
// silently a 0) — the file spec's "a malformed record is surfaced, never silently skipped", in spirit.
export function parsePrice(spec) {
  if (typeof spec !== "string") return null;
  const m = /^([a-z0-9-]+)@(\d+)cr$/i.exec(spec.trim());
  if (!m) return null;
  return { good: m[1], price: Number(m[2]) };
}

// priceSpec(good, price) -> "good@Ncr" — the inverse, for writing a station's price rows.
export function priceSpec(good, price) {
  return `${good}@${price}cr`;
}

// marketAt(world, station) — the station's order book: what it BUYS (you can sell to it) and what it
// SELLS (you can buy from it), each as { good, price }. Read from the station subject's buys/sells rows.
export function marketAt(world, station) {
  const log = logFor(world, station);
  const buys = relateFrom(log, station, "buys").map(parsePrice).filter(Boolean);
  const sells = relateFrom(log, station, "sells").map(parsePrice).filter(Boolean);
  return { station, buys: dedupePrice(buys), sells: dedupePrice(sells) };
}

// purse(world, pilot) — the pilot's credit balance, folded from their trace: a starting `credits` grant
// plus every `sold` (credit) minus every `bought` (debit). Evidence linear: each row counts once.
export function purse(world, pilot) {
  let credits = 0;
  for (const r of relateFrom(logFor(world, pilot), pilot, "credits")) {
    const n = Number(r);
    if (Number.isFinite(n)) credits = n; // a `credits` row sets a starting/checkpoint balance (latest wins)
  }
  for (const r of relateFrom(logFor(world, pilot), pilot, "sold")) credits += amountOf(r);
  for (const r of relateFrom(logFor(world, pilot), pilot, "bought")) credits -= amountOf(r);
  return credits;
}

// hold(world, pilot) — the pilot's cargo hold: good -> quantity, folded from bought (+1) and sold (-1)
// rows. A unit per row keeps it simple and keeps each transaction a single linear witness.
export function hold(world, pilot) {
  const h = {};
  for (const r of relateFrom(logFor(world, pilot), pilot, "bought")) {
    const g = goodOf(r); if (g) h[g] = (h[g] ?? 0) + 1;
  }
  for (const r of relateFrom(logFor(world, pilot), pilot, "sold")) {
    const g = goodOf(r); if (g) h[g] = (h[g] ?? 0) - 1;
  }
  for (const g of Object.keys(h)) if (h[g] === 0) delete h[g];
  return h;
}

// buy(world, { pilot, station, good }) — buy one unit of `good` from `station` (the station must SELL
// it). Returns { ok, world, reason?, price? }. APPENDS a `(pilot, bought, "<good>@<station>@<price>cr")`
// row; the purse and hold fold from it. Refuses (held as a reason, never a throw) if the station does
// not sell the good or the pilot cannot afford it — but NEVER overwrites the trace.
export function buy(world, { pilot, station, good }) {
  const market = marketAt(world, station);
  const offer = market.sells.find((s) => s.good === good);
  if (!offer) return { ok: false, world, reason: `${station} does not sell ${good}` };
  if (purse(world, pilot) < offer.price) return { ok: false, world, reason: `cannot afford ${good} (${offer.price}cr)`, price: offer.price };
  const row = predicate(pilot, "bought", txSpec(good, station, offer.price), nextT(world, pilot));
  return { ok: true, world: admitLog(world, pilot, [row]).world, price: offer.price };
}

// sell(world, { pilot, station, good }) — sell one unit of `good` to `station` (the station must BUY it
// and the pilot must HOLD it). Appends a `(pilot, sold, "<good>@<station>@<price>cr")` row.
export function sell(world, { pilot, station, good }) {
  const market = marketAt(world, station);
  const bid = market.buys.find((b) => b.good === good);
  if (!bid) return { ok: false, world, reason: `${station} does not buy ${good}` };
  if ((hold(world, pilot)[good] ?? 0) < 1) return { ok: false, world, reason: `no ${good} in the hold` };
  const row = predicate(pilot, "sold", txSpec(good, station, bid.price), nextT(world, pilot));
  return { ok: true, world: admitLog(world, pilot, [row]).world, price: bid.price };
}

// arbitrage(world) — every buy-low/sell-high opportunity across KNOWN stations, tagged with whether the
// route runs through a cost-graph chokepoint. Each opportunity: { good, from, to, buyAt, sellAt, margin,
// throughMonopoly }. This is the concrete readout of "the economy IS the graph topology": the fattest
// margins are the ones a monopoly system or a bridge-edge lane gates.
export function arbitrage(world) {
  const stations = stationSubjects(world);
  const choke = chokepoints(world);
  const monopolies = new Set(choke.monopolies);
  const out = [];
  for (const from of stations) {
    const sells = marketAt(world, from).sells;
    for (const to of stations) {
      if (to === from) continue;
      const buys = marketAt(world, to).buys;
      for (const s of sells) {
        const b = buys.find((x) => x.good === s.good);
        if (b && b.price > s.price) {
          out.push({
            good: s.good, from, to, buyAt: s.price, sellAt: b.price, margin: b.price - s.price,
            throughMonopoly: monopolies.has(from) || monopolies.has(to),
          });
        }
      }
    }
  }
  return out.sort((a, b) => b.margin - a.margin || a.good.localeCompare(b.good));
}

// ── helpers ──────────────────────────────────────────────────────────────────────────────────
// a transaction object string: "<good>@<station>@<price>cr" — carries good, where, and how much, while
// staying a NON-subject string so the cost-graph never reads it as an edge.
function txSpec(good, station, price) {
  return `${good}@${station}@${price}cr`;
}
function goodOf(spec) {
  return typeof spec === "string" ? spec.split("@")[0] : null;
}
function amountOf(spec) {
  if (typeof spec !== "string") return 0;
  const m = /@(\d+)cr$/.exec(spec);
  return m ? Number(m[1]) : 0;
}
function nextT(world, subject) {
  let max = 0;
  for (const r of logFor(world, subject)) if (typeof r.t === "number" && r.t > max) max = r.t;
  return max + 1;
}
function dedupePrice(list) {
  const seen = new Map();
  for (const p of list) seen.set(p.good, p); // latest declaration wins per good
  return [...seen.values()].sort((a, b) => a.good.localeCompare(b.good));
}
// stationSubjects(world) — subjects that have a buys/sells order book (the tradeable stations).
function stationSubjects(world) {
  const out = new Set();
  for (const r of allRows(world)) if ((r.a === "buys" || r.a === "sells") && parsePrice(r.v)) out.add(r.e);
  return [...out].sort((a, b) => a.localeCompare(b));
}

export { stationSubjects };
