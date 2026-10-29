#lang racket

(require qtops/qualities/area
         qtops/qualities/lookable
         "../../../qualities/plain.rkt")

(provide <>fort-kelly)

(define (<>tents t)
  (<>lookable
   t #:name "tents"
   #:description "Most of the tents here are square and canvas. Most have large letters and numbers stenciled on their sides: tents north of the Kingsroad seem to have odd-numbers, with those south being even-numbered. Each number is preceded by a letter, M, R or W."))
;; materials, residential, or workshop

(define (<>fort-kelly t)
  (<>Plain
   (<>area
    t #:name "Fort Kelly"
    #:description "This is Fort Kelly, a human outpost in the central Central Plains. Despite the name, it doesn't appear to be much of a fort. It's mostly a congregation of tents flanking the Kingsroad, though a larger sandstone structure is being constructed on the east side of the \"fort\". There is also an odd swirl right off the road."
    #:contents (list <>tents))
   #:trivia '("Fort Kelly was the first settlement the Red Union established outside the Green Delta.")))
