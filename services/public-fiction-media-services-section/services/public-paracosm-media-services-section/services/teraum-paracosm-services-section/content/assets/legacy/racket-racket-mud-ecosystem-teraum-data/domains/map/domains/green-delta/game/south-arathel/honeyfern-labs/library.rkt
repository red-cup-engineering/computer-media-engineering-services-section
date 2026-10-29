#lang racket

(require "./recipes.rkt")

(provide library)

(define library
  (honeyfern-labs/room
   #:name "library of Honeyfern Laboratories"
   #:description "This is the library of Honeyfern Laboratories. A door leads back out to the hallway."
   #:exits '(("hallway" . green-delta/game/south-arathel/honeyfern-labs/first-floor-hallway))))