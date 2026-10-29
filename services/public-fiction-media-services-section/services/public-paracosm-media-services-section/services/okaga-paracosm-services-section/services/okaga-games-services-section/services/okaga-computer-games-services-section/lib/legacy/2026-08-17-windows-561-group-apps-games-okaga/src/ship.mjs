// ship — okaga's player ship and its FLIGHT COMPUTER, programmed in a little Horsetail snippet (design
// note §9). The ship is a unit in the tsander engine sense: it has a subject in the trace, a position,
// and a Horsetail program whose SETTLED four-valued charge steers it. The killer move only this machine
// allows: a program that settles to ⊤ runs BOTH arms and holds the result contested — the autopilot can
// HONESTLY both-dock-and-flee, and the wireframe shivers the ship until the contradiction settles.
//
// This module is a thin okaga-domain wrapper over tsander's horsetail-hook: it gives the program a tiny
// okaga vocabulary (the situation it must decide on — am I at a contested star? in fog? at a known
// station?) by COMPILING the situation into Horsetail constants the snippet reads, runs the snippet, and
// maps the four-valued result to an autopilot intent. THE LAW: a unit's program is its own internals,
// blast-radius = that unit; a crash settles to ⊥ ("no signal"), never an engine halt (the hook's rule).
//
// Why compile the situation in rather than expose okaga functions to Horsetail: Horsetail is not to be
// relied on for anything load-bearing yet (the journal's caveat). So okaga decides the FACTS in plain
// JS (is this star contested? etc.), binds them as Horsetail constants, and lets the player's snippet do
// only the four-valued DECISION. The snippet is sandboxed: it cannot reach the galaxy, only the charges
// okaga handed it.

import { makeComputer, runProgram, branchOnCharge } from "@561-group/tsander/horsetail";
import { systemState } from "./galaxy.mjs";
import { hold } from "./trade.mjs";

// the four okaga autopilot intents the flight computer can settle to. These are what tick() acts on.
export const INTENT = Object.freeze({
  DOCK: "dock",     // t   — settled known station: dock and trade
  FLEE: "flee",     // f   — a wreck / denied target / hazard: disengage
  SCAN: "scan",     // ⊥   — unknown / fog: settle it first
  HELD: "held",     // ⊤   — contested: honestly do BOTH (dock AND flee), held
});

// makeShip({ subject, source }) — a fresh ship: its trace subject, its Horsetail program source, and its
// own Horsetail world (one per ship — the blast-radius rule). `source` may be omitted (a ship with no
// program just drifts; its computer settles to ⊥ = scan).
export function makeShip({ subject = "ship", source = "", credits = 100 } = {}) {
  return { subject, source, computer: makeComputer(), startingCredits: credits };
}

// the DEFAULT autopilot — the design note's §9 north star, in real Horsetail. okaga SPLICES the
// situation's charge literal into the snippet wherever the token `*situation*` appears (textual
// substitution — see `compileProgram`), then evaluates the result. The default snippet is just the
// token, so the four-valued branch is the situation's own charge: a contested star → ⊤ → both arms held.
// A player rewrites this to fly differently, e.g. a COWARD that flees even a safe station — map a t
// situation to f:  (not *situation*)  — but note the evaluator PROPAGATES both off-classical values
// through a branch: a ⊤ situation ALWAYS settles to ⊤ and a ⊥ situation ALWAYS to ⊥, no matter the
// snippet. You can reshape the classical faces (t↔f); you cannot select away from a held contradiction
// or a held unknown. That is the law, not a bug: the DEFAULT is "trust the bilattice", fly by the charge.
export const DEFAULT_AUTOPILOT = "*situation*";

// the token a player's snippet uses to mean "the situation in front of the ship, as a charge". okaga
// replaces every occurrence with the situation's charge LITERAL before evaluation (substitution, not a
// `let`-binding — the native `let` does not round-trip an f charge faithfully, so we splice the literal
// the evaluator settles correctly on its own).
export const SITUATION_TOKEN = "*situation*";

// compileProgram(source, four) — produce the Horsetail source actually evaluated: the player's snippet
// with `*situation*` replaced by the charge literal for `four`. A snippet with no token still runs (it
// just ignores the situation). Pure string transform.
export function compileProgram(source, four) {
  const src = source && source.trim() ? source : DEFAULT_AUTOPILOT;
  return src.split(SITUATION_TOKEN).join(chargeLiteral(four));
}

// situationCharge(world, { ship, system }) — okaga reads the FACTS in plain JS and names the situation's
// four-valued charge. This is the single value okaga hands the snippet; the snippet decides on it. The
// reading:
//   contested system (⊤) -> "top" : a Schrödinger star is in front of you
//   unvisited / fog (⊥)   -> "bot" : you do not know what is there
//   denied / hazard (f)   -> "f"   : a wreck or a hostile-hazard star — disengage
//   settled, has station  -> "t"   : a clean place to dock and trade
//   settled, no station   -> "t"   : settled but nothing to dock; the snippet may still hold/scan
export function situationCharge(world, { system }) {
  const st = systemState(world, system);
  if (st.contested) return "top";
  if (!st.visited) return "bot";
  if (st.hazards.length && !st.stations.length) return "f"; // a hazard with no port to dock at
  return "t";
}

// the Horsetail literal for a four-name. The snippet reads `*situation*` bound to one of these.
function chargeLiteral(four) {
  switch (four) {
    case "t": return "#t";
    case "f": return "(not #t)"; // settles to f
    case "top": return "⊤";
    case "bot":
    default: return "⊥";
  }
}

// flyShip(world, ship, { system }) — run the ship's flight computer against the current situation and
// return the autopilot decision. okaga compiles the situation charge into the snippet's `*situation*`
// binding, runs the snippet (sandboxed in the ship's own Horsetail world), reads its settled four-value,
// and maps it to an INTENT via the §9 branch. A ⊤ result is HELD: { intent:HELD, both:[DOCK,FLEE] } —
// the ship is drawn doubled until it settles. A crashing/empty snippet settles to ⊥ → SCAN (never a halt).
export function flyShip(world, ship, { system }) {
  const four = situationCharge(world, { system });
  // splice the situation's charge literal into the snippet wherever `*situation*` appears, then evaluate.
  // The snippet's own last form decides the charge it settles to.
  const program = compileProgram(ship.source, four);
  const result = runProgram(program, ship.computer);
  const branch = branchOnCharge(result.four, {
    t: () => INTENT.DOCK,
    f: () => INTENT.FLEE,
    bot: () => INTENT.SCAN,
    top: () => INTENT.HELD, // both arms — but okaga records BOTH faces below
  });
  if (result.four === "top") {
    // ⊤ honestly runs BOTH arms — okaga records the held pair (the ship both-docks-and-flees).
    return { situation: four, four: "top", intent: INTENT.HELD, held: true, both: [INTENT.DOCK, INTENT.FLEE], ok: result.ok };
  }
  return { situation: four, four: result.four, intent: branch.value, held: false, ok: result.ok, error: result.error };
}

// intentRows(ship, decision, t) — turn an autopilot decision into APPENDED predications about the ship's
// own subject (engine-style, mirroring tsander's runUnit): a ⊤ HELD decision charges the same cell BOTH
// ways, so the world folds the ship's intent to ⊤ and the wireframe shivers it. THE LAW: ⊤ kept, both
// witnesses appended, nothing overwritten.
export function intentRows(ship, decision, t = 0) {
  const s = ship.subject;
  if (decision.held) {
    // both faces of the same `autopilot` cell → folds to ⊤ → ship renders doubled.
    return [
      { e: s, a: "autopilot", v: "act", t },
      { e: s, a: "not-autopilot", v: "act", t },
    ];
  }
  return [{ e: s, a: "autopilot", v: decision.intent, t }];
}

export { makeComputer, runProgram, branchOnCharge };
