#lang racket

(require "./recipes.rkt")

(provide angers-place)


(define angers-place
  (district
   #:name "Anger's Place"
   #:description "This is Anger's Place, a district in the city of Ack. To the north is the Brass Ward. To the south is Piketown. To the west is the Copper Ward."
   #:exits '((north . green-delta/game/ack/brass-ward)
             (west . green-delta/game/ack/piketown))))