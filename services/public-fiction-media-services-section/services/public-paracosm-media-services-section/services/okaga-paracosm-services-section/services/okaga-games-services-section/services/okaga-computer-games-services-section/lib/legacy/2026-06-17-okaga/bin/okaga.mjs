#!/usr/bin/env node
// okaga — the runnable first-playable. Loads the shipped seed galaxy (world/core-systems.jsonl), seeds a
// player ship with a Horsetail autopilot snippet, and flies a SCRIPTED route through the cluster — out to
// the CONTESTED Schrödinger star (vega-prime), where the autopilot settles to ⊤ and runs BOTH arms held,
// the ship rendering DOUBLED beside the doubled star — then on into the ⊥ FOG leaf (okaga-reach), which
// the visit SETTLES. Each leg projects a tsander wireframe frame and prints the cockpit readout.
//
// Two modes:
//   (default, TTY)  — Arnold's alt-screen cockpit: the wireframe drawn into a cell buffer with charge
//                     colors, a status line with the four-value census + nav, q/Ctrl-C to quit.
//   --headless / non-TTY — print each leg as plain text (so CI, an audit, or a pipe can watch it fly).
//
// Run: node bin/okaga.mjs   (or: pnpm --filter @561-group/okaga demo)

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { worldFromRows } from "@561-group/tsander/world";

import { newGame, settle, turn, makeShip } from "../src/game.mjs";

// Arnold (the terminal) is imported LAZILY, only for the interactive cockpit, so the headless mode runs
// with just okaga's core deps (tsander + computer). The interactive cockpit rides the same Arnold
// terminal tsander's own demo uses.

const HERE = dirname(fileURLToPath(import.meta.url));
const SEED = join(HERE, "..", "world", "core-systems.jsonl");

function loadSeed() {
  const text = readFileSync(SEED, "utf8").trim();
  return text ? text.split("\n").map((l) => JSON.parse(l)) : [];
}

// the scripted flight: a route that visits a clean system, the contested ⊤ star, and the ⊥ fog leaf.
const ROUTE = ["barnard-gate", "vega-prime", "okaga-reach"];

// the player's flight computer: the default "trust the bilattice" autopilot. A contested star settles it
// to ⊤ → the ship both-docks-and-flees, held. (Edit this snippet to fly differently; see ship.mjs.)
const AUTOPILOT = "*situation*";

// a charge -> Arnold style (the bilattice readout in color): t solid green, ⊥ dim grey fog, f red wreck,
// ⊤ bold yellow — the one you watch shiver.
const CHARGE_STYLE = {
  t: { fg: "green" },
  bot: { fg: "bright-black", dim: true },
  f: { fg: "red" },
  top: { fg: "yellow", bold: true },
};

function statusLine(state, seen) {
  const c = state.frame.census;
  const ctrl = seen.contested ? `${seen.controllers.join("+")}?? (⊤ contested)` : (seen.controllers[0] ?? "—");
  return `okaga @${seen.system} [${ctrl}]  fuel:${seen.fuel} cr:${seen.purse}  t:${c.t} ⊥:${c.bot} f:${c.f} ⊤:${c.top}`;
}

// ── headless: print each leg as plain text (CI / audit / pipe) ──
function runHeadless(world) {
  const ship = makeShip({ subject: "player", source: AUTOPILOT, credits: 80 });
  let state = newGame({ world, ship, at: "sol-iii", fuel: 6 });
  const legs = [null, ...ROUTE]; // first leg is "settle where we start", then each jump
  for (const dest of legs) {
    const before = settle(state);
    state = turn(state, dest ? { jumpTo: dest, width: 60, height: 20 } : { width: 60, height: 20 });
    const seen = settle(state);
    const d = state.decision;
    console.log(`\n── ${dest ? `jump → ${dest}` : `start @ ${before.system}`} ──  ${statusLine(state, seen)}`);
    console.log(`   autopilot: ${d.held ? "⊤ HELD — both-docks-and-flees" : `${d.intent} (${d.four})`}` +
      (seen.contested ? "   [Schrödinger star: doubled + shivering]" : ""));
    const f = state.frame;
    for (let r = 0; r < f.height; r++) console.log("   " + f.glyphs.slice(r * f.width, (r + 1) * f.width).join(""));
  }
  console.log("\n(the doubled/shivering '%' is a ⊤ CONTESTED star — and the ship beside it, flown both-arms-held.)");
  console.log("(the dim '·' is ⊥ FOG — unsettled space; flying there SETTLES it. THE LAW: ⊤ held, append-only, evidence linear.)");
}

// ── interactive: Arnold cockpit, auto-flying the route, q to quit ──
async function runInteractive(world) {
  const { Screen } = await import("@561-group/arnold/app");
  const { EMPTY_STYLE } = await import("@561-group/arnold/ansi");
  const screen = new Screen();
  const ship = makeShip({ subject: "player", source: AUTOPILOT, credits: 80 });
  let state = newGame({ world, ship, at: "sol-iii", fuel: 6 });
  let leg = -1; // -1 = settle-in-place at start, then step through ROUTE
  let running = true;

  const draw = (buf) => {
    const seen = settle(state);
    buf.clear();
    const f = state.frame;
    for (let r = 0; r < f.height && r < buf.height - 1; r++) {
      for (let c = 0; c < f.width && c < buf.width; c++) {
        const i = r * f.width + c;
        const ch = f.glyphs[i];
        if (ch === " ") continue;
        buf.set(r, c, ch, CHARGE_STYLE[f.charges[i]] ?? EMPTY_STYLE);
      }
    }
    buf.drawText(buf.height - 1, 0, `${statusLine(state, seen)}  [q] quit`, { fg: "cyan" });
  };

  const advance = () => {
    const dest = leg >= 0 && leg < ROUTE.length ? ROUTE[leg] : null;
    state = turn(state, dest ? { jumpTo: dest, width: screen.width, height: screen.height - 1 }
      : { width: screen.width, height: screen.height - 1 });
    if (leg < ROUTE.length) leg += 1;
    screen.render(draw);
  };

  screen.start();
  advance();
  screen.onKey((k) => { if (k.name === "q") { running = false; screen.stop(); process.exit(0); } });
  screen.onInterrupt(() => { running = false; screen.stop(); process.exit(0); });

  const loop = () => {
    if (!running) return;
    advance();
    setTimeout(loop, 700);
  };
  setTimeout(loop, 700);
}

function main() {
  const world = worldFromRows(loadSeed());
  const headless = process.argv.includes("--headless") || !process.stdout.isTTY;
  if (headless) runHeadless(world);
  else runInteractive(world);
}

main();
