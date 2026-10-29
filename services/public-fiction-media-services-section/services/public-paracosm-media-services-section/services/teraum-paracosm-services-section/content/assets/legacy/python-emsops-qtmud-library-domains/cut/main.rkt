#lang racket

(require qtops/qualities/region
         "../../../qualities/cutter.rkt"
         "central-oasis.rkt"
         "eastern-canyons.rkt"
         "southern-canyons.rkt")

(provide <>cut)

(define (<>cut t)
  (<>Cutter
   (<>region
    t #:name "The Cut"
    #:areas `((central-oasis ,<>central-oasis)
              (eastern-canyons ,<>eastern-canyons)
              (southern-canyons ,<>southern-canyons))
    #:links '((central-oasis "east" "west" eastern-canyons)
              (central-oasis "south" "north" southern-canyons)))
    #:trivia '("The Cut was added to a region of Teraum in fall of rw2018.")))
