#lang racket

(require "./recipes.rkt")

(provide west-kingsroad)

(define west-kingsroad
  (road
   #:name "West Kingsroad"
   #:description "This is the Kingsroad at its western end, within the town of Bellybrush."
   #:exits '((north . green-delta/game/bellybrush/westgate)
             (east . green-delta/game/bellybrush/kingsroad-outside-orphanage)
             (west . green-delta/game/ack/eastgate))))