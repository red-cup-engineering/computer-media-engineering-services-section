// index — the barrel re-exporting okaga's surface. The subpath exports in package.json are the primary
// surface (import the concern you need); this barrel gathers them for one-import callers.
//
// @561-group/okaga — the ELITE-like space game on @561-group/tsander. Four concerns, each its own module:
//   - galaxy.mjs : the navigable star map read off the federated trace — visit-to-discover (⊥ fog),
//                  jump-lanes as edges, cost-graph chokepoints, and CONTESTED ⊤ Schrödinger stars.
//   - trade.mjs  : basic commodity trade on the cost-graph — markets, purse, hold, arbitrage; profit
//                  lives at the cut-vertex monopolies and bridge-edge blockades.
//   - ship.mjs   : the flight computer you PROGRAM in a Horsetail snippet, whose four-valued result
//                  steers the autopilot — a ⊤ result honestly runs BOTH arms, held contested.
//   - game.mjs   : the cockpit loop — settle → fly → jump(=federate) → project a wireframe frame.

export * as galaxy from "./galaxy.mjs";
export * as trade from "./trade.mjs";
export * as ship from "./ship.mjs";
export * as game from "./game.mjs";

// the most-used entry points, flat, for convenience:
export {
  systemsKnown, lanesFrom, reachable, canJump, systemState, contestedSystems, chokepoints, mapView, LANE,
} from "./galaxy.mjs";
export { marketAt, purse, hold, buy, sell, arbitrage, parsePrice, priceSpec } from "./trade.mjs";
export { makeShip, flyShip, situationCharge, compileProgram, intentRows, INTENT, DEFAULT_AUTOPILOT } from "./ship.mjs";
export { newGame, settle, autopilot, jump, turn, frameOf, fuelLeft } from "./game.mjs";
