// game — okaga's cockpit: the per-cycle loop that ties the galaxy (galaxy.mjs), trade (trade.mjs), and
// the flight computer (ship.mjs) onto the tsander engine's renderer. One cycle is the design note's §4
// core loop:
//   1. SETTLE the system you are in   — fold the federated trace at your current subject (galaxy).
//   2. ACT, by APPENDING predications  — run the ship's flight computer; its four-valued decision is
//      appended as the ship's `autopilot` intent (a ⊤ decision charges BOTH faces → ship renders doubled).
//   3. PLOT a jump                      — pick a lane out of the current system (galaxy.reachable).
//   4. JUMP = FEDERATE                  — spend FUEL (a linear evidence row you cannot duplicate) and
//      move the ship's position to the destination; if the destination was ⊥ fog, the visit SETTLES it.
//   5. PROJECT + RENDER                 — the tsander wireframe of the settled section; ⊤ stars doubled.
//
// THE LAW: there is NO global tick to wait on (aperiodic settling); a turn advances only when rows are
// appended. The world is append-only — a jump never overwrites; it appends a new `at-position` (the
// engine's functional read takes the latest) and a spent-fuel row. Evidence is LINEAR: a jump REQUIRES
// an unspent fuel unit and appends a `spent-fuel` row, so the same fuel charge can never move you twice.
// ⊤ is HELD: a contested star you fly into stays contested; docking at one face APPENDS evidence (your
// presence) without erasing the other (design note §6 — occupation wins without destroying the loser).

import {
  systemState, mapView, contestedSystems, chokepoints, canJump, reachable,
  place, positionOf, renderables, admitLog, predicate, logFor, relateFrom, withOkaga, OKAGA_OPTS,
} from "./galaxy.mjs";
import { marketAt, purse, hold, buy, sell, arbitrage } from "./trade.mjs";
import { makeShip, flyShip, intentRows, INTENT } from "./ship.mjs";
import { camera, render } from "@561-group/tsander/wireframe";

export { INTENT, marketAt, purse, hold, buy, sell, arbitrage, systemState, contestedSystems, chokepoints };

// SHIP_HULL — okaga's ship renders as a unit cube (tsander's default hull). The `hull` row marks it a
// ship in the trace; the renderer draws it solid/doubled/dotted by its folded charge like any unit.

// newGame({ world, ship, at }) — a fresh okaga session. `world` is the seed galaxy (the engine world);
// `ship` is a makeShip(...) (subject + Horsetail snippet); `at` is the starting system id. The ship is
// SEEDED into the world: its starting credits and its position at the start system are appended rows, so
// the ship is a first-class subject in the same trace as the galaxy (its program, position, and purse
// are all rows the fold reads). Returns the cockpit state the loop carries.
export function newGame({ world, ship = makeShip(), at, fuel = 8 } = {}) {
  let w = world;
  const start = at ?? firstSystem(w);
  const pos = positionOf(w, start) ?? [0, 0, 0];
  // seed the ship as a subject: position at the start system, a starting purse, a fuel grant, a hull.
  w = admitLog(w, ship.subject, [
    predicate(ship.subject, "at-position", pos, 1),
    predicate(ship.subject, "credits", ship.startingCredits, 1),
    predicate(ship.subject, "fuel", fuel, 1),
    predicate(ship.subject, "hull", "ship", 1),
  ]).world;
  return {
    world: w,
    ship,
    at: start,
    phase: 0,
    log: [],         // append-only audit of every turn (the calm trace; ⊤ is the designed mechanic)
    fuel,
  };
}

// fuelLeft(state) — the ship's remaining fuel: its `fuel` grant minus its `spent-fuel` rows. Evidence
// linear — each spent-fuel row counts once, so a jump can never be free-replayed.
export function fuelLeft(state) {
  const log = logFor(state.world, state.ship.subject);
  let grant = 0;
  for (const r of relateFrom(log, state.ship.subject, "fuel")) { const n = Number(r); if (Number.isFinite(n)) grant = n; }
  const spent = relateFrom(log, state.ship.subject, "spent-fuel").length;
  return grant - spent;
}

// settle(state) — design note §4 step 1: fold the trace at the current system and return what the pilot
// sees — the system's charge, controllers (both, if contested), station, hazards, market, the pilot's
// purse and hold, the reachable lanes, and whether the current system is a Schrödinger star.
export function settle(state) {
  const sys = systemState(state.world, state.at);
  const station = sys.stations[0] ?? null;
  return {
    system: state.at,
    charge: sys.charge,
    contested: sys.contested,
    controllers: sys.controllers,
    station,
    hazards: sys.hazards,
    market: station ? marketAt(state.world, station) : { station: null, buys: [], sells: [] },
    purse: purse(state.world, state.ship.subject),
    hold: hold(state.world, state.ship.subject),
    fuel: fuelLeft(state),
    lanes: reachable(state.world, state.at),
    contestedCells: sys.contestedCells,
  };
}

// autopilot(state) — design note §4 step 2: run the ship's flight computer against the current situation
// and APPEND its decision as the ship's `autopilot` intent. A ⊤ decision appends BOTH faces (folds to ⊤
// → the ship renders doubled). Returns { state, decision } — the advanced world and the raw decision.
export function autopilot(state) {
  const decision = flyShip(state.world, state.ship, { system: state.at });
  const rows = intentRows(state.ship, decision, state.phase + 1);
  let world = state.world;
  for (const r of rows) world = admitLog(world, r.e, [r]).world;
  return { state: { ...state, world }, decision };
}

// jump(state, to) — design note §4 steps 3–4: JUMP = FEDERATE. Legal only along a lane out of the
// current system and only with fuel to spend. APPENDS: a `spent-fuel` row (linear — burns one unit), and
// a new `at-position` for the ship at the destination (the engine's functional read takes the latest, so
// the ship MOVES without the old position being erased — append-only). Visiting a ⊥ destination SETTLES
// it: okaga appends a `visited-by` witness so the fog lifts (the pilot's presence is evidence). Returns
// { ok, state, reason? }; a refused jump never mutates the trace.
export function jump(state, to) {
  if (!canJump(state.world, state.at, to)) return { ok: false, state, reason: `no lane from ${state.at} to ${to}` };
  if (fuelLeft(state) < 1) return { ok: false, state, reason: "out of fuel" };
  const destPos = positionOf(state.world, to);
  const t = state.phase + 1;
  let world = state.world;
  // burn one fuel (linear evidence — this row is the witness the jump happened; it cannot be duplicated).
  world = admitLog(world, state.ship.subject, [predicate(state.ship.subject, "spent-fuel", `jump-${state.at}-to-${to}@${t}`, t)]).world;
  // the visit is EVIDENCE: settle the destination by witnessing it (lifts ⊥ fog; pushes a contested fold
  // toward the face you arrive at, never erasing the other — design note §6 "presence is evidence").
  world = admitLog(world, to, [predicate(to, "visited-by", state.ship.subject, t)]).world;
  // move the ship: a new at-position at the destination (functional — latest-t wins; old kept, not erased).
  const newPos = destPos ?? positionOf(world, to) ?? [0, 0, 0];
  world = admitLog(world, state.ship.subject, [predicate(state.ship.subject, "at-position", newPos, t)]).world;
  return { ok: true, state: { ...state, world, at: to, phase: state.phase + 1 } };
}

// frameOf(state, camOpts) — design note §4 step 5: project the settled galaxy as a tsander wireframe.
// The camera looks from the ship toward the current system; every system + the ship are renderables, each
// styled by its folded charge (t solid · ⊥ dotted · ⊤ doubled+shivering). The ⊤ shiver is driven by the
// turn PHASE (replay-identical), never an RNG. Returns the engine frame (glyphs + charges + census).
export function frameOf(state, camOpts = {}) {
  const width = camOpts.width ?? 64;
  const height = camOpts.height ?? 22;
  const shipPos = positionOf(state.world, state.ship.subject) ?? [0, 0, 0];
  const target = positionOf(state.world, state.at) ?? [0, 0, 0];
  // an over-the-shoulder camera: behind and above the ship, looking at the current system.
  const eye = [shipPos[0], shipPos[1] + 4, shipPos[2] + 12];
  const cam = camera({ eye, target, width, height, ...camOpts });
  // render with okaga's converse map so a ⊤ ship (autopilot held both faces) folds to TOP and draws doubled.
  return render(renderables(state.world, OKAGA_OPTS), cam, { phase: state.phase });
}

// turn(state, opts) — ONE full cockpit cycle: settle → autopilot → (optional jump) → project. With
// `opts.jumpTo` it also jumps; without, it just settles+flies-in-place (a scan). Appends a turn record to
// the audit log. Returns the advanced state plus the frame and what happened. This is the loop the bin
// drives on a key press or an interval — but there is NO clock forcing it (aperiodic settling).
export function turn(state, opts = {}) {
  const seen = settle(state);
  const { state: afterFly, decision } = autopilot(state);
  let s = afterFly;
  let jumped = null;
  if (opts.jumpTo) {
    const j = jump(s, opts.jumpTo);
    jumped = { to: opts.jumpTo, ok: j.ok, reason: j.reason };
    s = j.state;
  } else {
    s = { ...s, phase: s.phase + 1 }; // a turn-in-place still advances the phase (the ⊤ shiver moves)
  }
  const frame = frameOf(s, opts);
  const record = {
    phase: s.phase, at: s.at, charge: seen.charge, contested: seen.contested,
    decision: { intent: decision.intent, four: decision.four, held: decision.held },
    jumped, census: frame.census,
  };
  return { ...s, log: [...s.log, record], frame, seen, decision, jumped };
}

// ── helpers ──
function firstSystem(world) {
  const m = mapView(world, null);
  return m.length ? m[0].system : null;
}

export { makeShip, flyShip, mapView, reachable, canJump, fuelLeft as fuel, camera, render, renderables };
