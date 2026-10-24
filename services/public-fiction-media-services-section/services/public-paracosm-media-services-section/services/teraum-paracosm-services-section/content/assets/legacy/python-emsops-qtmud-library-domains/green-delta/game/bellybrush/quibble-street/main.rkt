#lang racket

(require qtops/qualities/area
         "../../../../../../qualities/brusher.rkt")

(provide <>quibble-street)

(define (<>quibble-street t)
  (<>Brusher
   (<>area
    t #:name "Quibble Street")))
