#lang racket

(require qtops/qualities/area
         qtops/qualities/lookable
         qtops/qualities/npc
         "../../../../../qualities/brusher.rkt")

(provide <>masked-mortuary)

(define (<>daxol-nabrish t)
  ;; Arandul's father
  (<>npc
   t #:name "Daxol Nabrish"))

(define (<>death-masks t)
  (<>lookable
   t #:name "death masks"))

(define (<>masked-mortuary t)
  (<>Brusher
   (<>area
    t #:name "Masked Mortuary"
    #:description "This is Masked Mortuary, run by Daxol Nabrish. Serving as the mortician for most of Bellybrush, Daxol has introduced a tradition from his home in the Unseen Sea: death masks. These masks crowd the walls of the shop, which has been partitioned with curtains hung from the rafters.")))
