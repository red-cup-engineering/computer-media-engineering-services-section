#lang racket

(require "./recipes.rkt")

(provide dull-thorn-inn-quarters)

(define dull-thorn-inn-quarters
  (basic/area/room
   #:name "sleeping quarters of the Dull Thorn Inn"
   #:description "This is the sleeping quarters of the Dull Thorn Inn, a small room off the main inn. There are eight wooden cots scattered around."
   #:exits '((out . green-delta/game/south-arathel/dull-thorn-inn))))