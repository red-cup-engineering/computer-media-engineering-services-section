#lang racket

(require "./recipes.rkt")

(provide first-floor-hallway)

(define first-floor-hallway
  (honeyfern-labs/room
    #:name "hallway in Honeyfern Laboratories"
    #:description "This is the first-floor hallway of Honeyfern Laboratories. One end leads to the foyer, while a door on either side leads to the dining hall or library. There are shelves built into both sides of the wall. Most of the shelves contain old books. A few squashboard boxes are on the floor. Some are half-full of books. Others are closed, sealed with tape, and covered in soot."
    #:exits '((foyer . green-delta/game/south-arathel/honeyfern-labs/foyer)
              (hall . green-delta/game/south-arathel/honeyfern-labs/dining-hall)
              (library . green-delta/game/south-arathel/honeyfern-labs/library))))