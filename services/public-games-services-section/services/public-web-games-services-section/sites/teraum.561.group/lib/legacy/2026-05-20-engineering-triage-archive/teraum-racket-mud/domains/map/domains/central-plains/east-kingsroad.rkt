#lang racket

(require "./recipes.rkt")

(provide east-kingsroad)
(define east-kingsroad
  (rural-road
   #:name "Kingsroad, eastern Central Plains"
   #:description "This is the Kingsroad, toward the eastern border of the Central Plains. To the east are the Farsteppes, and to the west are the Central Plains, and beyond that, the Green Delta."
   #:exits '((east . farsteppes/west-kingsroad)
             (west . central-plains/fort-kelly))))