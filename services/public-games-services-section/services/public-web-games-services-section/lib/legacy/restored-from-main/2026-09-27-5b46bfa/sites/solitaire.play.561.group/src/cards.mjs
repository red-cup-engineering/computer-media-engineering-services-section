/**
 * `cards` — the deck: suits, ranks, deterministic seeded shuffling.
 *
 * The RNG here is the same string-hash + mulberry32 approach `flickering-delve-service/src/seed.mjs`
 * already uses for its procedural cave (see solitaire's DESIGN.md, "Deterministic seeded deals") —
 * no new randomness idea needed, just applied to a shuffled deck instead of a dungeon layout.
 * `hashSeed`/`rngFrom` below now compose the house computer-data randomization
 * primitive (FNV-1a fold + mulberry32) directly rather than holding a local re-derivation, so a
 * seed string produces the *identical* card order on any machine, any process, forever — the
 * property that makes `?seed=` URLs and the daily deal work at all. `@red-cup-engineering/card-table`
 * (see its README's "Provenance" note) already extracted this exact deck/shuffle construction
 * from this module; this file supplies the same construction seeded-random's canonical way.
 *
 * Nothing in this module touches the clock or any mutable module-level state: every export is a
 * pure function over its arguments, and `shuffle` never mutates its input array.
 */

import { hashSeed } from '@red-cup-engineering/computer-data-engineering-services-section/randomization/hash-seed';
import { mulberry32 } from '@red-cup-engineering/computer-data-engineering-services-section/randomization/mulberry32';

export { hashSeed };

/** The four suits, in a fixed canonical order used for internal indexing (solver, tests). */
export const SUITS = ['C', 'D', 'H', 'S']         ;
                                          

/** 1 = Ace ... 13 = King. */
                          

                       
                      
                      
                           
 

/** Red suits are hearts/diamonds; the rest are black. Used by every alternating-color build rule. */
export function cardColor(card      )                  {
  return card.suit === 'D' || card.suit === 'H' ? 'red' : 'black';
}

const RANK_LABELS                       = {
  1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
  11: 'J', 12: 'Q', 13: 'K',
};

/** Human-readable label like "AS" (ace of spades) — for debugging/README examples, not gameplay. */
export function cardLabel(card      )         {
  return `${RANK_LABELS[card.rank] ?? card.rank}${card.suit}`;
}

/** A deterministic stream of reals in [0, 1) and the integer/choice helpers built on it. */
                      
                             
                 
                                              
                                        
 

/** An `Rng` stream built over the house mulberry32 stepper, seeded by a 32-bit state. */
export function rngFrom(seed        )      {
  const next = mulberry32(seed);
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
  };
}

/**
 * Build an unshuffled deck: `decks` standard 52-card decks' worth of cards (`decks * 52` total),
 * grouped into `decks * 4` "suit slots" of 13 consecutive ranks each, with each slot's suit drawn
 * from `SUITS` cycling through only the first `suitsInPlay` of them. `suitsInPlay === 4` with
 * `decks === 1` is a plain standard deck (Klondike, FreeCell). Spider always deals `decks === 2`
 * (104 cards) and varies `suitsInPlay` — 1 gives eight 13-card runs of spades, 2 alternates
 * spades/hearts four times each, 4 is two full standard decks — matching the real game's card
 * composition for each of its three suit-count variants.
 */
export function makeDeck(decks       , suitsInPlay           )         {
  const totalCards = decks * 52;
  const groups = totalCards / 13;
  const deck         = [];
  for (let g = 0; g < groups; g++) {
    const suit = SUITS[g % suitsInPlay] ;
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({ suit, rank, faceUp: false });
    }
  }
  return deck;
}

/** Fisher-Yates over `cards` driven by `rng` — pure: returns a new array, never mutates the input. */
export function shuffle(cards                 , rng     )         {
  const out = cards.map((c) => ({ ...c }));
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    const tmp = out[i] ;
    out[i] = out[j] ;
    out[j] = tmp;
  }
  return out;
}

/** `seed` (any string) + deck composition -> a deterministic shuffled deck. The one entry point
 * `engine.mjs`'s `dealTable` needs; combines `hashSeed` + `rngFrom` + `makeDeck` + `shuffle`. */
export function shuffledDeck(seed        , decks       , suitsInPlay           )         {
  const rng = rngFrom(hashSeed(seed));
  return shuffle(makeDeck(decks, suitsInPlay), rng);
}
