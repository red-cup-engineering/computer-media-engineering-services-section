#lang racket

(require "../../recipes/areas/gloaming/rural-road.rkt")

(provide south-longroad)

(define south-longroad
  (rural-road
   'teraum/gloaming/south-longroad
   #:brief "north Longroad"
   #:description "This is Longroad, within the Gloaming. The way south has been blocked by deliberately laid-down trees."
   #:exits '(("north" . teraum/gloaming/central-longroad)
             ("northeast" . teraum/gloaming/road-to-jacobs-folly))))