#lang racket

(require "./recipes.rkt")

(provide gasper)

(define gasper
  (district
   #:name "Gasper"
   #:description "This is Gasper, a district in the city of Ack. To the southwest is the Astar Ward."
   #:exits '((west . green-delta/game/ack/astar-ward))))