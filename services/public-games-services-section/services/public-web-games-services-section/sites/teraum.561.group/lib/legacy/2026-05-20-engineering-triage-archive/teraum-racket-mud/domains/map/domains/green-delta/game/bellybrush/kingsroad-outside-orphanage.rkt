#lang racket

(require "./recipes.rkt")

(provide kingsroad-outside-orphanage)

(define kingsroad-outside-orphanage
  (road
   #:name "East Kingswood"
   #:description "This is the Kingsroad, in the town of Bellybrush, outside Mother Jaffa's Orphanage, off the north side of the street."
   #:exits '((east . green-delta/game/bellybrush/east-kingsroad)
             (west . green-delta/game/bellybrush/west-kingsroad))))