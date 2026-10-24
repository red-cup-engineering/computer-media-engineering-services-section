#lang racket

(require "./recipes.rkt")

(provide outside-dull-thorn-inn)

(define outside-dull-thorn-inn
  (south-arathel/rural-road
   #:name "Outside the Dull Thorn Inn"
   #:description "This is the road outside the Dull Thorn Inn, where the road from Ack ends against the Arathel-Pled road."
   #:exits '((north . green-delta/game/south-arathel/dull-thorn-inn)
             (east . green-delta/game/south-arathel/west-arathel-pled-road)
             (south . green-delta/game/south-arathel/outside-golden-shield-inn))))
             ; (west . green-delta/game/south-arathel/outside-slow-lighting-inn))))