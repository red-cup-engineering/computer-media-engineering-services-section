#lang racket

(require qtops/qualities/area
         "../../../../../qualities/brusher.rkt")

(provide <>siddon-street)

(define (<>siddon-street t)
  (<>Brusher
   (<>area
    t #:name "Siddon Street"
    #:description "This is Siddon Street, in Bellybrush. To the north is the Walk, to the east is the Market, and to the south is the Kingsroad.")))
