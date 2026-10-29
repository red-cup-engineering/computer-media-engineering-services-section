#lang racket

(require "./recipes.rkt")

(provide west-harbrook-street)

(define west-harbrook-street
  (road
   #:name "west Harbrook Street"
   #:description "This is west Harbrook Street, in the north part of the town of Bellybrush."
   #:exits '((east . green-delta/game/bellybrush/arathel-road)
             (south . green-delta/game/bellybrush/westgate))))