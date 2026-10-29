#lang racket

(require "./recipes.rkt")

(provide foyer)

(define foyer
  (honeyfern-labs/room
    #:name "foyer of Honeyfern Laboratories"
    #:description "This is the foyer of Honeyfern Laboratories.  A door leads outside. Stairs lead upstairs, but they've been blocked. There is a hallway across the room from the door, and across from the stairs, an open door to a sitting room."
    #:exits '((outside . green-delta/game/south-arathel/honeyfern-labs/front-porch)
              ; (stairs . green-delta/arathel-county/honeyfern-labs/second-floor)
              (hallway . green-delta/game/south-arathel/honeyfern-labs/first-floor-hallway)
              (door . green-delta/game/south-arathel/honeyfern-labs/sitting-room))))