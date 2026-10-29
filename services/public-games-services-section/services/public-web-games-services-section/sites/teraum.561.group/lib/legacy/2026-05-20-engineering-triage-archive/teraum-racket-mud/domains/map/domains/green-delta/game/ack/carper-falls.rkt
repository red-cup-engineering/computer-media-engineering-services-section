#lang racket

(require "./recipes.rkt")

(provide carper-falls)

(define carper-falls
  (district
   #:name "Carper Falls"
   #:description "This is Carper Falls, a district in the city of Ack. To the north is the Copper Ward. To the east is Piketown. To the south is Poplar Gate. To the west is Sugar Heights."
   #:exits '((east . green-delta/game/ack/piketown)
             (south . green-delta/game/ack/poplar-gate)
             (west . green-delta/game/ack/sugar-heights)
             (northwest . green-delta/game/ack/copper-ward))))
