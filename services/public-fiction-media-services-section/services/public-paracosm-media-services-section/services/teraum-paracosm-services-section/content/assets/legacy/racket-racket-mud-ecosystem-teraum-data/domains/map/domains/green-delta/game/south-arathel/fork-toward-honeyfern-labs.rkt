#lang racket

(require "./recipes.rkt")

(provide fork-toward-honeyfern-labs)

(define fork-toward-honeyfern-labs
  (south-arathel/rural-road
   #:name  "an intersection two roads, Arathel County"
   #:description "This is the intersection of two dirt roads in Arathel County. One road leads off to the northeast, toward Honeyfern Laboratories. The other runs southeast, toward Ack, or north, into Arathel County."
   #:exits '((northeast . green-delta/game/south-arathel/road-to-honeyfern-labs)
             (east . green-delta/game/south-arathel/outside-broken-arrow-inn)
             (north . green-delta/game/south-arathel/road-near-frekes-grave))))