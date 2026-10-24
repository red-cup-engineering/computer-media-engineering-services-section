#lang racket

(require "../../recipes/areas/gloaming/rural-road.rkt")

(provide central-longroad)

(define central-longroad
  (rural-road
   'teraum/gloaming/central-longroad
   #:brief "north Longroad"
   #:description "This is Longroad, within the Gloaming."
   #:exits '(("north" . teraum/gloaming/north-longroad)
             ("south" . teraum/gloaming/south-longroad)
             ("west" . teraum/gloaming/belcaer/lobby))))