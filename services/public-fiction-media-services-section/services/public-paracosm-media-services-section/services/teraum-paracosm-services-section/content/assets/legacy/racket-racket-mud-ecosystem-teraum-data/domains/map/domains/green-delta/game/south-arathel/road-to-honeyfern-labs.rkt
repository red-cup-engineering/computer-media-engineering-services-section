#lang racket

(require "./recipes.rkt")

(provide road-to-honeyfern-labs)

(define road-to-honeyfern-labs
  (south-arathel/rural-road
   #:name "Road toward Honeyfern Laboratories"
   #:description "This is the road toward Honeyfern Laboratories, in Arathel County. Tall pines scatter the area. To the northeast is Honeyfern Laboratories, and to the southwest is a road leading elsewhere."
   #:exits '((northeast . green-delta/game/south-arathel/honeyfern-labs/outside-gate)
             (southwest . green-delta/game/south-arathel/fork-toward-honeyfern-labs))))