#lang racket

(require "./recipes.rkt")

(provide wineglass)

(define wineglass
  (district
   #:name "Wineglass"
   #:description "This is Wineglass, a district in the city of Ack. To the southeast is the North Ward. To the northwest is the Dog."
   #:exits '((southeast . green-delta/game/ack/north-ward)
             (northwest . green-delta/game/ack/the-dog))))