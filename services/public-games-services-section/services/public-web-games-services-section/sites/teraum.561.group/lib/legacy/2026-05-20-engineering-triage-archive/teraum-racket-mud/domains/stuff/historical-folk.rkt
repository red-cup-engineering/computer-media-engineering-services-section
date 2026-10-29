#lang racket
(require "../recipes.rkt")

(define uzdar-bark
  (teraum/goblin
   #:name "Uzdar Bark"
   #:description "This is Uzdar Bark, a goblin."
   #:trivia '("Uzdar Bark, the goblin who led other goblins out of the Undermuck into Teraum, was born on the 19th of Browning, 29407bB."
              "Uzdar Bark was the first goblin to discover a way out of the Undermuck, on the 2nd of Sleeting, 29395bB."
              "Uzdar Bark, the goblin who led other goblins out of the Undermuck into Teraum, died on the 9th of Rotting, 29392bB, after he tripped on a stick and drowned in a mud puddle.")))

(define osmits-reinhard
  (basic/person/human
   #:name "Osmits Reinhard"
   #:description "This is Osmits Reinhard, a human."
   #:trivia '("Osmits Reinhard was born in Ack in 503bB."
              "Osmits Reinhard was executed in Arathel in 460bB.")))