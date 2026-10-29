#lang racket

(require "./recipes.rkt")

(provide front-porch)

(define front-porch
  (honeyfern-labs/room
    #:name "front porch of Honeyfern Laboratories"
    #:description "This is the front porch of Honeyfern Laboratories. Down the steps is a path to the gate to to leave, and the a door leads inside."
    #:exits '((path . green-delta/game/south-arathel/honeyfern-labs/front-path)
              (inside . green-delta/game/south-arathel/honeyfern-labs/foyer))))