#lang racket

(require "./recipes.rkt")

(provide garys-gate)

(define garys-gate
  (street
   #:name "Gary's Gate"
   #:description "This is Gary's Gate, which leads from Sugar Heights to the Widdershins Road."
   #:exits '((northeast . green-delta/game/ack/sugar-heights)
             (south . green-delta/game/widdershins-road))))