#lang racket

(require "./recipes.rkt")

(provide squash-ward)

(define squash-ward-trivia
  '("During the Fire of Ack, on the 14th of Blooming, 80aB, the Squash Ward was entirely destroyed. Since then, the Red Union has been rebuilding it as a visitor destination."))

(define squash-ward
  (district
   #:name "Squash Ward"
   #:description "This is the Squash Ward, a district in the city of Ack. To the east is the Copper Ward."
   #:exits '((north . green-delta/game/ack/dock-ward))))