#lang racket

(require "./recipes.rkt")

(provide west-kingsroad)

(define west-kingsroad
  (rural-road
   #:name "Kingsroad, western Central Plains"
   #:description "This is the road between the Central Plains and the Green Delta"
   #:exits '((east . central-plains/fort-kelly)
             (south . gloaming/north-longroad)
             (west . green-delta/game/bellybrush/east-kingsroad))))