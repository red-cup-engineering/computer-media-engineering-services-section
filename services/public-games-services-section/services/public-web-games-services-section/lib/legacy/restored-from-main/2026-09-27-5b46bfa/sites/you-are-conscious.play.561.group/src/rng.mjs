/**
 * `rng` — a tiny, deterministic pseudorandom generator built on the house
 * computer-data randomization (mulberry32 + a plain FNV-1a string hash for
 * turning an arbitrary seed string into a 32-bit int seed), rather than a local re-derivation.
 * Used anywhere this game needs a number that LOOKS unpredictable to the player but is actually
 * a pure function of `(seed, index)` — `exploration.mjs`'s hidden process yields,
 * `mentorship.mjs`'s child-seed derivation. Never used for anything the disclosure discipline
 * (`provenance.mjs`) would need to call `computed-from-your-graph`: a seeded random number is
 * disclosed as what it is, an authored (if unpredictable-feeling) generator, never dressed up as
 * graph output.
 *
 * Deliberately NOT `Math.random()` or `node:crypto`: both are non-reproducible (or, for `crypto`,
 * asynchronous in the browser via `crypto.subtle`), and this module needs to run identically under
 * Node and in a browser from the same seed, synchronously, for replay determinism
 * (`@red-cup-engineering/gaming/running`'s own contract: `(seed, intentLog) -> stateHash` must be
 * reproducible).
 */

import { hashSeed } from '@red-cup-engineering/computer-data-engineering-services-section/randomization/hash-seed';
import { mulberry32 } from '@red-cup-engineering/computer-data-engineering-services-section/randomization/mulberry32';

export { mulberry32 };

/** 32-bit FNV-1a over a UTF-16 string — an alias of the house `hashSeed` under this module's
 *  established local name (`mentorship.mjs` imports `fnv1a32` from here). */
export function fnv1a32(str        )         {
  return hashSeed(str);
}

/** A single deterministic float in `[0, 1)` from `(seedString, index)` — no shared generator
 *  state, so callers never need to worry about draw ORDER; the same `(seedString, index)` pair
 *  always yields the same value, which is exactly what a seed-fixed hidden process
 *  (`exploration.mjs`) needs. */
export function seededFloat(seedString        , index        )         {
  const base = fnv1a32(`${seedString}:${String(index)}`);
  const gen = mulberry32(base);
  return gen();
}
