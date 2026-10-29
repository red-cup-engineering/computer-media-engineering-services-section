#lang racket

(require "./recipes.rkt")

(provide south-arathel-ack-road)

(define south-arathel-ack-road
  (south-arathel/rural-road
   #:name "south Arathel-Ack Road"
   #:description "This is the road between the city of Ack and Arathel County, its northern neighbor. The road leads southwest to Ack and northeast toward Arathel County. Near the road is a blacksmith."
   #:exits '((northeast . green-delta/game/south-arathel/north-arathel-ack-road)
             (south . green-delta/game/ack/astar-ward)
             (west . green-delta/game/south-arathel/belys-blades))))