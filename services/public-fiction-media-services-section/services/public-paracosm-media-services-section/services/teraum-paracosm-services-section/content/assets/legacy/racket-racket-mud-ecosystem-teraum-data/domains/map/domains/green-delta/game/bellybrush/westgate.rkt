#lang racket

(require "./recipes.rkt")

(provide westgate)

(define westgate
  (road
   #:name "Westgate"
   #:description "This is the road by and under Westgate, a limestone folly built in the town of Bellybrush."
   #:exits '((north . green-delta/game/bellybrush/west-harbrook-street)
             (south . green-delta/game/bellybrush/west-kingsroad))))