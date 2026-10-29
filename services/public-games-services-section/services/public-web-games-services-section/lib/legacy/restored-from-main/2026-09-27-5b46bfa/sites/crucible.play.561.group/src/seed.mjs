/**
 * `seed` — deterministic, reproducible randomness for crucible's daily tangles.
 *
 * Built directly on the house computer-data randomization primitive (FNV-1a fold +
 * mulberry32) rather than a local re-derivation. Crucible's whole determinism promise ("same
 * seed + move log => identical final state and identical total cost, always") rests on this
 * module: every tangle is a pure function of a seed string, and nothing in `tangle.mjs` or
 * `engine.mjs` touches `Date.now()` or `Math.random()` — the only randomness anywhere in this
 * codebase flows through the `Rng` this file constructs.
 */

import { hashSeed } from '@red-cup-engineering/computer-data-engineering-services-section/randomization/hash-seed';
import { mulberry32 } from '@red-cup-engineering/computer-data-engineering-services-section/randomization/mulberry32';

export { hashSeed };

/** A deterministic stream of reals in [0, 1) and the integer/choice/shuffle helpers built on it. */
                      
                             
                 
                                              
                                        
                              
                                          
                                                                
                                              
                                 
                             
                                                                                             
                                                                     
                                       
 

/** An `Rng` stream built over the house mulberry32 stepper, seeded by a 32-bit state. */
function rngFromState(seed        )      {
  const next = mulberry32(seed);
  const int = (min        , max        )         => min + Math.floor(next() * (max - min + 1));
  const shuffle =    (items              )      => {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(0, i);
      const oi = out[i]     ;
      const oj = out[j]     ;
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
export function makeRng(seed        )      {
  return rngFromState(hashSeed(seed));
}
