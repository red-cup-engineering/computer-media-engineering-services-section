#lang racket

(require qtops/qualities/area
         "../../../qualities/gloamer.rkt")

(provide <>road-to-jacobs-folly)

(define (<>road-to-jacobs-folly t)
  (<>Gloamer
    (<>area
      t #:name "road"
      #:description "This is a stretch of road in the Gloaming.")))
