#lang racket

(require "./recipes.rkt")

(provide outside-gate)

(define outside-gate
  (honeyfern-labs/room
     #:name "outside the gate to Honeyfern Laboratories"
     #:description "This is immediately outside the gate of Honeyfern Laboratories. The road leads southwest, elsewhere."
     #:exits '((gate . green-delta/game/south-arathel/honeyfern-labs/front-path)
               (southwest . green-delta/game/south-arathel/road-to-honeyfern-labs))))