#lang racket

(require "./recipes.rkt")

(provide outside-golden-shield-inn)

(define outside-golden-shield-inn
  (south-arathel/rural-road
   #:name "Outside the Golden Shield Inn"
   #:description "This is the road outside the Golden Shield Inn, in Arathel County. The road continues north into Arathel County and south toward the city of Ack."
   #:exits '((north . green-delta/game/south-arathel/outside-dull-thorn-inn)
             (east . green-delta/game/south-arathel/golden-shield-inn)
             (south . green-delta/game/south-arathel/outside-crossed-candles-inn))))