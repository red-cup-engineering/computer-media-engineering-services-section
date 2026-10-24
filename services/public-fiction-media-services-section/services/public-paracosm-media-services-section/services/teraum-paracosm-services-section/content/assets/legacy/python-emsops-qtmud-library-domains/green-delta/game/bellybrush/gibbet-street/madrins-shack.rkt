#lang racket

(require qtops/qualities/area
         "../../../../../../qualities/brusher.rkt")

(provide <>madrins-shack)

(define (<>madrins-shack t)
  ;; go east into the shack, wander around lost and pop back out... most of the time.
  ;; madrin can teach "beg"
  (<>Brusher
   (<>area
    t #:name "Madrin's Shack"
    #:description "This is a mess of squashboard boxes and wooden planks, with tarps stretched between them. Upon consideration, it appears to be someone's attempt at a building ")))
