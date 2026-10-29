#lang racket

(require "./recipes.rkt")

(provide arathel-road)

(define arathel-road
  (road
   #:name "Arathel Road"
   #:description "This is Arathel Road, in the north part of the town of Bellybrush."
   #:exits '((northwest . green-delta/game/south-arathel/bellybrush-road)
             (east  . green-delta/game/bellybrush/east-harbrook-street)
             (west . green-delta/game/bellybrush/west-harbrook-street))))