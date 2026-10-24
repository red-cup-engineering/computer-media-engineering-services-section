#lang racket

(require "./recipes.rkt")

(provide outside-broken-arrow-inn)

(define outside-broken-arrow-inn
  (south-arathel/rural-road
   #:name "Outside the Broken Arrow Inn"
   #:description "This is a dirt road outside the Broken Arrow Inn, in Arathel County. The road leads southeast toward the Arathel-Ack road, and northwest into Arathel County."
   #:exits '((north . green-delta/game/south-arathel/broken-arrow-inn)
             (southeast . green-delta/game/south-arathel/north-arathel-ack-road)
             (northwest . green-delta/game/south-arathel/fork-toward-honeyfern-labs))))