#lang racket

(require "./recipes.rkt")

(provide culver-estate)

(define culver-estate
  (castle
   #:name "Culver Estate"
   #:exits '((southwest . farsteppes/helmets-dent))))