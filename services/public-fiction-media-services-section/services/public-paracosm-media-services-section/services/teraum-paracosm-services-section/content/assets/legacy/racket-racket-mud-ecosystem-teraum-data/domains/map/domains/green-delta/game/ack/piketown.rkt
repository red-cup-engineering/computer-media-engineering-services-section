#lang racket

(require "./recipes.rkt")

(provide piketown)

(define piketown
  (district
   #:name "Piketown"
   #:description "This is Piketown, a district in the city of Ack. To the north is Anger's Place. To the southeast is the Piketown Gate. To the west is Carper Falls."
   #:exits '((east . green-delta/game/ack/angers-place)
             (southeast . green-delta/game/ack/piketown-gate)
             (west . green-delta/game/ack/carper-falls))))