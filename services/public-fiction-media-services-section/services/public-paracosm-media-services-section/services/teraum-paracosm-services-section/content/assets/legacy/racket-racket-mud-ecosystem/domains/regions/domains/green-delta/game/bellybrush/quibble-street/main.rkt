#lang racket

(require qtops/qualities/area
         "../../../../../qualities/brusher.rkt")

(provide <>quibble-street)

(define (<>quibble-street t)
  (<>Brusher
   (<>area
    t #:name "Quibble Street"
    #:description "This is Quibble Street, a residential street in south Bellybrush. To the northwest is Hawk Street, and the Kingsroad is to the south.")))
