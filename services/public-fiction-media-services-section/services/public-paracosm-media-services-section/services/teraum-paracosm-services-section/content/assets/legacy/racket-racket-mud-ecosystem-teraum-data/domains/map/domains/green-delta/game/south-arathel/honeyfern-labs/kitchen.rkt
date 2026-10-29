#lang racket

(require "./recipes.rkt")

(provide kitchen)

(define kitchen
  (honeyfern-labs/room
    #:name "kitchen of Honeyfern Laboratories"
    #:description "This is the kitchen of Honeyfern Laboratories. A door leads to the pantry, and another to the dining hall. The door to the backyard has been painted shut."
    #:exits '((pantry . green-delta/game/south-arathel/honeyfern-labs/pantry)
              (hall . green-delta/game/south-arathel/honeyfern-labs/dining-hall))))
