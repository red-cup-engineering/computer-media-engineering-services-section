#lang racket

(require "./recipes.rkt")

(define banana
  (basic/object
   #:name "banana"
   #:description "This is a banana."
   #:trivia '("Most people believe bananas were created by a perverse magic user. Probably one a bit sadistic, given it's only ripe for around four hours.")))
