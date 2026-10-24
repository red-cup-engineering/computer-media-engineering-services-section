#lang racket

(require qtops/qualities/area)

(provide <>east-kingsroad <>west-kingsroad-1 <>west-kingsroad-2)

(define (<>east-kingsroad t)
  (<>area
    t #:name "Kingsroad"
    #:description "This is the Kingsroad, toward the eastern border of the Central Plains. To the east are the Farsteppes, and to the west are the Central Plains, and beyond that the Green Delta."))

(define (<>west-kingsroad-1 t)
  (<>area
    t #:name "Kingsroad"
    #:description "This is the road between the Central Plains and the Green Delta."))

(define (<>west-kingsroad-2 t)
  (<>area
    t #:name "Kingsroad"
    #:description "This is the road between the Central Plains and the Green Delta."))
