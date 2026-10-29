#lang racket

(require qtops/qualities/area
         "../../../../../../qualities/brusher.rkt")

(provide <>par-weaponry)

(define (<>par-weaponry t)
  ;; dokas and milly, former owners, were killed by their daughter, negalmis, who vanished.
  (<>Brusher
   (<>area
    t #:name "Par Weaponry"
    #:description "This is right outside a closed shop. Letters penned onto the door explain, \"This property closed under order of the Red Union.\"")))
