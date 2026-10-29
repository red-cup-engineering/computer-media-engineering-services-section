#lang racket

(require "./recipes.rkt")

(provide road-to-jacobs-folly)

(define road-to-jacobs-folly
  (rural-road
   #:name "small road in the Gloaming"
   #:description "The road heading east descends in elevation."
   #:append-description #t
   #:exits '((east . gloaming/jacobs-folly/outside)
             (southwest . gloaming/south-longroad))))