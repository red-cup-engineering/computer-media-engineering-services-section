#lang racket

(require "./recipes.rkt")

(provide front-path)

(define front-path
  (honeyfern-labs/room
    #:name "front path to Honeyfern Laboratories"
    #:description "This is the path to Honeyfern Laboratories. Grass grows nearly seven feet tall to either side of the narrow gravel path. It leads to an outside gate, and toward the building's porch."
    #:exits '(("gate" . green-delta/game/south-arathel/honeyfern-labs/outside-gate)
              ("porch" . green-delta/game/south-arathel/honeyfern-labs/front-porch))))