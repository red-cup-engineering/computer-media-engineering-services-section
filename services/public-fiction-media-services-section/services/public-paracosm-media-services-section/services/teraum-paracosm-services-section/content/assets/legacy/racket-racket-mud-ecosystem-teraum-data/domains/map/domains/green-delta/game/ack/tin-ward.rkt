#lang racket

(require "./recipes.rkt")

(provide tin-ward)

(define tin-ward
  (district
   #:name "Tin Ward"
   #:description "This is the Tin Ward, a district of the city of Ack. To the east is the Eastgate. To the west is Bank Hill."
   #:exits '((east . green-delta/game/ack/eastgate)
             (west . green-delta/game/ack/bank-hill))))