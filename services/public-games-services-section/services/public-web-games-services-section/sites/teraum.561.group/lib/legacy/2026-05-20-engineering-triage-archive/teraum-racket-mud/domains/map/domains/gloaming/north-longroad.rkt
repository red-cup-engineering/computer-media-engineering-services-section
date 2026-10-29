#lang racket

(require "./recipes.rkt")

(provide north-longroad)

(define north-longroad
  (rural-road
   #:name "north Longroad"
   #:description "This is Longroad, near its northern leg within the Gloaming."
   #:exits '((north . central-plains/west-kingsroad)
             (south . gloaming/central-longroad))))