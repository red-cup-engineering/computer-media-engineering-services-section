#lang racket

(require "../../recipes/areas/gloaming/rural-road.rkt")

(provide road-to-jacobs-folly)

(define road-to-jacobs-folly
  (rural-road
   'teraum/gloaming/road-to-jacobs-folly
   #:brief "road to Jacob's Folly"
   #:description "This is a thin path in the Gloaming, leading from the Longroad to Jacob's Folly."
   #:exits '(("east" . teraum/gloaming/jacobs-folly/outside)
             ("southwest" . teraum/gloaming/south-longroad))))