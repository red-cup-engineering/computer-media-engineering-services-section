#lang racket

(require "./recipes.rkt")

(provide offices)

(define offices
  (room
   #:name "Belcaer Offices"
   #:description "This is the foyer which leads to the offices of various companies in Belcaer."
   #:exits '((out . gloaming/belcaer/lobby)
             (chandlers . gloaming/belcaer/chandlers-guild-office))))