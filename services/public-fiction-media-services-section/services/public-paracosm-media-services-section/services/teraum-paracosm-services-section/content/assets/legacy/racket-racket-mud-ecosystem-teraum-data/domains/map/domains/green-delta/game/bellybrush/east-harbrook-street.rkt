#lang racket

(require "./recipes.rkt")

(provide east-harbrook-street)

(define east-harbrook-street
  (road
   #:name "east Harbrook Street"
   #:description "This is east Harbrook Street, in the north part of the town of Bellybrush."
   #:exits '((south . green-delta/game/bellybrush/east-kingsroad)
             (west . green-delta/game/bellybrush/arathel-road))))