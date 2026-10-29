#lang racket

(require "./recipes.rkt")

(provide east-kingsroad)

(define east-kingsroad
  (road
   #:name "East Kingswood"
   #:description "This is the Kingsroad at its eastern end, within the town of Bellybrush."
   #:exits '((north . green-delta/game/bellybrush/east-harbrook-street)
             (east . central-plains/west-kingsroad)
             (west . green-delta/game/bellybrush/kingsroad-outside-orphanage))))