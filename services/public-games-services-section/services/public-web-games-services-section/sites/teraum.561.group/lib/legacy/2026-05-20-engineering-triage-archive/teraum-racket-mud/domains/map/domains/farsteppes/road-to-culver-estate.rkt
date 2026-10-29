#lang racket

(require "./recipes.rkt")

(provide road-to-culver-estate)

(define road-to-culver-estate
  (rural-road
   #:name "road, between Helmet's Dent and Culver Estate, Farsteppes"
   #:description "This is the road between the town of Helmet's Dent and the nearby Culver Estate, in the Farsteppes. The road runs through one of the few groves in the area."
   #:exits '((east . farsteppes/culver-estate)
             (northwest . farsteppes/helmets-dent))))