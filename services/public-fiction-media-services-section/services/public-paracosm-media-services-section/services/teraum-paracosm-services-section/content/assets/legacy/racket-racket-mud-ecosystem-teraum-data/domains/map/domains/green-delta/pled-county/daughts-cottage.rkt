#lang racket

(require "../../../../rpg-basics/recipes/people/herbalist.rkt")
(require "../../../recipes/areas/green-delta/pled-county/cottage.rkt")

(provide daughts-cottage)

(define daught
  (herbalist
   #:nouns "daught"
   #:brief "Daught"
   #:description "This is Daught, a short masculine herbalist."))

(define daughts-cottage
  (cottage
   'teraum/green-delta/pled-county/daughts-cottage
   #:brief "Daught's Cottage"
   #:description "This is a single-room cottage, where Daught, an herbcrafter, lives."
   #:contents (list daught)
   #:exits '(("south" . teraum/green-delta/pled-county/west-arathel-pled-road))))