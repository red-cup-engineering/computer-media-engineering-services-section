#lang racket

(require qtops/qualities/area
         "../../../../../../qualities/brusher.rkt")

(provide <>siddon-street)

(define (<>siddon-street t)
  (<>Brusher
   (<>area
    t #:name "Siddon Street")))
