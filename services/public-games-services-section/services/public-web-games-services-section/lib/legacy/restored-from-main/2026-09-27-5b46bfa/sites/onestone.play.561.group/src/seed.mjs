/**
 * `seed` — deterministic, reproducible randomness for onestone's boards and levels.
 *
 * onestone's whole determinism doctrine (see DESIGN.md) rests on one promise: every board
 * and level is a *pure function of a seed string*. The server replays a player's moves
 * through the same pure engine the tests use, and the client never generates or perturbs
 * board state — it only requests moves. That is both a fairness property (no two players
 * get a luckier board from the same level seed) and an anti-cheat property (a tampering
 * client cannot reroll spawns or blocker layouts in its favor, because the server can always
 * recompute the "true" board from the seed and compare). This module is the pure function
 * surface that promise is built on: a string-hash into a 32-bit state, then a small fast
 * PRNG (mulberry32) over it, plus the handful of derived helpers (`int`, `range`, `pick`,
 * `chance`, `shuffle`) every board-fill, blocker-placement, and level-builder call needs.
 *
 * Nothing here touches the clock or global state, so a board spawned on the server and a
 * board previewed in a test are bit-identical given the same seed string.
 *
 * The string-hash and PRNG stepper are computer-data randomization
 * primitive (FNV-1a fold + mulberry32), not a local re-derivation — see that package's own
 * doc comment for the list of game packages this was factored out of.
 */

import { hashSeed } from '@red-cup-engineering/computer-data-engineering-services-section/randomization/hash-seed';
import { mulberry32 } from '@red-cup-engineering/computer-data-engineering-services-section/randomization/mulberry32';

export { hashSeed };

/** A deterministic stream of reals in [0, 1) and the integer/choice/shuffle helpers built on it. */

/** An `Rng` stream built over the house mulberry32 stepper, seeded by a 32-bit state. */
function rngFromState(seed) {
  const next = mulberry32(seed);
  const int = (min, max) => min + Math.floor(next() * (max - min + 1));
  const shuffle = (items) => {
    const out = items.slice();
    // Fisher-Yates, walking from the end so each swap partner is drawn from the shrinking
    // untouched prefix [0, i] — the standard unbiased-permutation form.
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(0, i);
      const oi = out[i];
      const oj = out[j];
      out[i] = oj;
      out[j] = oi;
    }
    return out;
  };
  return {
    next,
    int,
    range: (min, max) => min + next() * (max - min),
    pick: (items) => (items.length === 0 ? undefined : items[Math.floor(next() * items.length)]),
    chance: (p) => next() < p,
    shuffle,
  };
}

/** Build a deterministic RNG stream from a seed string (the only seed shape every caller holds). */
export function makeRng(seed) {
  return rngFromState(hashSeed(seed));
}
