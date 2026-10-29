#lang racket

(require "./recipes.rkt")

(provide the-dog)

(define the-dog
  (district
   #:name "The Dog"
   #:description "This is the Dog, a district in the city of Ack. To the southeast is Wineglass."
   #:exits '((southeast . green-delta/game/ack/wineglass))))