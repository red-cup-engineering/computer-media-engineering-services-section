/**
 * `seed` — deterministic, reproducible randomness for crucible's daily tangles.
 *
 * Built directly on the house `@red-cup-engineering/seeded-random` primitive (FNV-1a fold +
 * mulberry32) rather than a local re-derivation. Crucible's whole determinism promise ("same
 * seed + move log => identical final state and identical total cost, always") rests on this
 * module: every tangle is a pure function of a seed string, and nothing in `tangle.mts` or
 * `engine.mts` touches `Date.now()` or `Math.random()` — the only randomness anywhere in this
 * codebase flows through the `Rng` this file constructs.
 */

import { hashSeed } from '@red-cup-engineering/seeded-random/hash-seed';
import { mulberry32 } from '@red-cup-engineering/seeded-random/mulberry32';

export { hashSeed };

/** A deterministic stream of reals in [0, 1) and the integer/choice/shuffle helpers built on it. */
export interface Rng {
  /** Next real in [0, 1). */
  next(): number;
  /** Next integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** A real in [min, max). */
  range(min: number, max: number): number;
  /** Pick one element (returns undefined for an empty list). */
  pick<T>(items: readonly T[]): T | undefined;
  /** True with probability p. */
  chance(p: number): boolean;
  /** A new array containing the same elements in a deterministic Fisher-Yates shuffle order,
   * consuming from this stream. The input array is never mutated. */
  shuffle<T>(items: readonly T[]): T[];
}

/** An `Rng` stream built over the house mulberry32 stepper, seeded by a 32-bit state. */
function rngFromState(seed: number): Rng {
  const next = mulberry32(seed);
  const int = (min: number, max: number): number => min + Math.floor(next() * (max - min + 1));
  const shuffle = <T>(items: readonly T[]): T[] => {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(0, i);
      const oi = out[i] as T;
      const oj = out[j] as T;
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
export function makeRng(seed: string): Rng {
  return rngFromState(hashSeed(seed));
}
