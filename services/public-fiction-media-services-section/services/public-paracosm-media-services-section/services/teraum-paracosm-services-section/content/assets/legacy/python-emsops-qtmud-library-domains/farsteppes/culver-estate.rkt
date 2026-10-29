#lang racket

(require qtops/qualities/area
         "../../../qualities/stepper.rkt")

(provide <>culver-estate)

(define (<>culver-estate t)
  (<>Stepper
    (<>area
      t #:name "Culver Estate"
      #:description "This is the Culver Estate. It's not quite a castle, but it's also not what anyone would call a \"house\", and \"mansion\" doesn't fit either.")))
