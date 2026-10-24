#lang racket

(require "./recipes.rkt")

(provide sugar-heights)

(define sugar-heights
  (district
   #:name "Sugar Heights"
   #:description "This is Sugar Heights, a district in the city of Ack. To the north is the Copper Ward. To the east is Carper Falls. To the southwest is Gary's Gate."
   #:exits '((northeast . green-delta/game/ack/copper-ward)
             (east . green-delta/game/ack/carper-falls)
             (southwest . green-delta/game/ack/garys-gate))))