#lang racket

(require "./recipes.rkt")

(provide fort-kelly)

(define fort-kelly
  (fort
   #:name "Fort Kelly"
   #:description "This is Fort Kelly, a human outpost in the central Central Plains."
   #:exits '((east . central-plains/east-kingsroad)
             (west . central-plains/west-kingsroad))))