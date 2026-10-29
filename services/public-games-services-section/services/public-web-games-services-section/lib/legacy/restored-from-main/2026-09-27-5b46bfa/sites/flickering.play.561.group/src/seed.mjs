/**
 * `seed` — deterministic, reproducible randomness for flickering's procedural cave, built on
 * computer-data randomization — the house's one PRNG home. Every delver must descend
 * the SAME cave, so floor N's contents are a pure function of a global seed and the depth, not
 * wall-clock entropy: also a security property (no client-side rerolling) and a fairness one.
 */
import { hashSeed, mulberry32 } from '@red-cup-engineering/computer-data-engineering-services-section/randomization';

export { hashSeed };

/** A deterministic stream of reals in [0, 1) and the integer/choice helpers built on it. */

/** A mulberry32 generator seeded by a 32-bit state — tiny, fast, and fully deterministic. */
export function rngFrom(seed) {
  const next = mulberry32(seed);
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    range: (min, max) => min + next() * (max - min),
    pick: (items) => (items.length === 0 ? undefined : items[Math.floor(next() * items.length)]),
    chance: (p) => next() < p,
  };
}

/** Seed a generator from a base seed string composed with any number of coordinates. */
export function rngAt(base, ...coords) {
  return rngFrom(hashSeed([base, ...coords.map(String)].join(":")));
}
