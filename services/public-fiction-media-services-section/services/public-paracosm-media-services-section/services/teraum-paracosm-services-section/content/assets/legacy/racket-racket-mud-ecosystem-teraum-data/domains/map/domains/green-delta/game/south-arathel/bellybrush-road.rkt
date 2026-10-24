#lang racket

(require "./recipes.rkt")

(provide bellybrush-road)

(define bellybrush-road
  (south-arathel/rural-road
   #:name "Bellybrush Road, Arathel County"
   #:description"This is Bellybrush Road, in Arathel County. It leads northwest further toward Arathel County, and southeast, toward Bellybrush."
   #:exits '((southeast . green-delta/game/bellybrush/arathel-road)
             (northwest . green-delta/game/south-arathel/outside-crossed-candles-inn))))