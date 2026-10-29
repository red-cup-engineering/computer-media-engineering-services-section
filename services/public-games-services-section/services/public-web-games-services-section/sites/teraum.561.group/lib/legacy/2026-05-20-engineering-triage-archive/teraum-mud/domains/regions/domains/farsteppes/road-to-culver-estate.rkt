#lang racket

(require qtops/qualities/area
         "../../qualities/stepper.rkt")

(provide <>road-to-culver-estate)

(define (<>road-to-culver-estate t)
  (<>Stepper
    (<>area
      t #:name "road"
      #:description "This is a stretch of the road between the town of Helmet's Dent and the nearby Culver Estate. The road runs through one of the few groves in the area.")))
