#lang racket

(require "./recipes.rkt")

(provide reinhold-wood)

(define reinhold-wood-trivia
  '("Reinhold Wood, the residential district of Ack, is named for a forest that existed where the town of Arathel now is."))
 

(define reinhold-wood
  (district
   #:name "Reinhold Wood"
   #:description "This is Reinhold Wood, a district in the city of Ack. To the southeast is the Astar Ward."
   #:exits '((southwest . green-delta/game/ack/astar-ward))))