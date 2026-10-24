#lang racket

(require "./recipes.rkt")

(provide north-arathel-ack-road)

(define north-arathel-ack-road
  (south-arathel/rural-road
   #:name "north Arathel-Ack Road"
   #:description "This is the northern end of the road from Ack toward Arathel County, where it forks to the northwest and east. Both forks ultimately lead further north into the County. The difference is in what one passes on the way. The road northwest leads past Honeyfern Laboratories, while the road east passes more inns. To the southeast, the road leads to Ack."
   #:exits '((northeast . green-delta/game/south-arathel/outside-crossed-candles-inn)
             (southwest . green-delta/game/south-arathel/south-arathel-ack-road)
             (northwest . green-delta/game/south-arathel/outside-broken-arrow-inn))))
