#lang racket

(require "./recipes.rkt")

(provide pantry)

(define pantry
  (honeyfern-labs/room
   #:name "pantry of Honeyfern Laboratories"
   #:description "This is the pantry of Honeyfern Laboratories' kitchen. A door leads back to the kitchen."
   #:exits '((door . green-delta/game/south-arathel/honeyfern-labs/kitchen))))
