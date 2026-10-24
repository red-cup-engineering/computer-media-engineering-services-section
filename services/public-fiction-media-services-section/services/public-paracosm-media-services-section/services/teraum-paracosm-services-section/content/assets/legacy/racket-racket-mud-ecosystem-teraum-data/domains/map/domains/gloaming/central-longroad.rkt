#lang racket

(require "./recipes.rkt")

(provide central-longroad)

(define central-longroad
  (rural-road
   #:name "Longroad, central stretch"
   #:description "This is Longroad, within the Gloaming."
   #:exits '((north . gloaming/north-longroad)
             (south . gloaming/south-longroad)
             (west . gloaming/belcaer/lobby))))