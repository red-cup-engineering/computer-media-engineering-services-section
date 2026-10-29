#lang racket

(require "./recipes.rkt")

(provide bank-hill)

(define bank-hill
  (district
   #:name "Bank Hill"
   #:description "This is Bank Hill, one of the more prosperous districts of the city of Ack. To the east is the Tin Ward. To the west is the Brass Ward."
   #:exits '((east . green-delta/game/ack/tin-ward)
             (west . green-delta/game/ack/brass-ward))))