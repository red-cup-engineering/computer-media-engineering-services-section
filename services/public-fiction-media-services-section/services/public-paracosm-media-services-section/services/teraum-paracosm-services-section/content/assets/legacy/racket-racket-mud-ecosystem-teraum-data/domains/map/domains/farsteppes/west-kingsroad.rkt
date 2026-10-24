#lang racket

(require "./recipes.rkt")

(provide west-kingsroad)

(define west-kingsroad
  (rural-road
   #:name "Kingsroad, west Farsteppes"
   #:exits '((east . farsteppes/helmets-dent)
             (west . central-plains/east-kingsroad))))