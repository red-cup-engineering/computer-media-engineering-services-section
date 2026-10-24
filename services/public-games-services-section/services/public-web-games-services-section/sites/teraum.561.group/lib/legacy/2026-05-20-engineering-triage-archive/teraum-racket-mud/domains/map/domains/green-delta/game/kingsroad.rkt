#lang racket

(require "../../../recipes/areas/green-delta/game/rural-road.rkt")

(provide kingsroad)

(define kingsroad
  (rural-road
   'teraum/green-delta/game/kingsroad
   #:brief "Kingsroad"
   #:description "This is the Kingsroad between the city of Ack, to the west, and Bellybrush, to the east.."
   #:exits '(("east" . teraum/green-delta/bellybrush/west-kingsroad)
             ("west" . teraum/green-delta/ack/eastgate))))