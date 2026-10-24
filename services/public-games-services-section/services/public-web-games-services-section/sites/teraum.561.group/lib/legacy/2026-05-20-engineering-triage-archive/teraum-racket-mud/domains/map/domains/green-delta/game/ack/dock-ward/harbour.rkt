#lang racket

(require "./recipes.rkt")

(provide harbour)

(define harbour
  (street
   #:name "harbour, Dock Ward, Ack"
   #:description "This is the harbour of Ack, located at the mouth of the Green Delta where it spills into the Optic Ocean."
   #:exits '((east . green-delta/game/ack/dock-ward))
   #:actions '((1 . "A young Union clerk monitoring those disembarking from the ships turns to his superior and asks, \"What do we do with a drunken sailor?\""))))
