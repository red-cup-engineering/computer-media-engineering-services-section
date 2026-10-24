#lang racket

(require "../../recipes/areas/gloaming/rural-road.rkt")

(provide north-longroad)

(define north-longroad
  (rural-road
   'teraum/gloaming/north-longroad
   #:brief "north Longroad"
   #:description "This is Longroad, near its northern leg within the Gloaming."
   #:exits '(("north" . teraum/central-plains/west-kingsroad)
             ("south" . teraum/gloaming/central-longroad))))
