#lang racket

(require "./recipes.rkt")

(provide south-longroad)

(define south-longroad
  (rural-road
   #:name "Longroad, south Gloaming"
   #:description "This is Longroad, within the Gloaming. The way south has been blocked by deliberately laid-down trees."
   #:exits '((north . gloaming/central-longroad)
             (northeast . gloaming/road-to-jacobs-folly))))