#lang racket

(require "./recipes.rkt")

(provide poplar-gate)

(define poplar-gate
  (street
   #:name "Poplar Gate"
   #:description "This is Poplar Gate, leading from the Carper Falls district of Ack to the Widdershins Road. To the north is Carper Falls. To the south is the Widdershins Road."
   #:exits '((north . green-delta/game/ack/carper-falls)
             (south . green-delta/game/widdershins-road))))
