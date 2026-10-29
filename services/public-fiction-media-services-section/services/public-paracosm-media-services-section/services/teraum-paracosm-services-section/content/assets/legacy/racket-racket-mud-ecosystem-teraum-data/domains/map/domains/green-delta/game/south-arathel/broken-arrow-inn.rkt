#lang racket

(require "./recipes.rkt")

(provide broken-arrow-inn)

(define geda
  (basic/person/human/innkeep
   #:name "Geda"
   #:description "Geda owns the Broken Arrow Inn, where she makes cheddar and whey."))

(define broken-arrow-inn
  (south-arathel/inn
   #:name "Broken Arrow Inn"
   #:description "The Broken Arrow Inn is a single-storey stone-walled building, with a small fenced yard and a large cellar. Accommodations consist of several small rooms with wooden cots. The owner, Geda, makes cheddar and whey."
   #:exits '((out . green-delta/game/south-arathel/outside-broken-arrow-inn))
   #:contents (list geda)))