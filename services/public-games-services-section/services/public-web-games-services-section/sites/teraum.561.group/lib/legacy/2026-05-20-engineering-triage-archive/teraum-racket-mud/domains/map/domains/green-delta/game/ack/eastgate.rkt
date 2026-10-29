#lang racket

(require "./recipes.rkt")

(provide eastgate)

(define eastgate
  (street
   #:name "Eastgate"
   #:description "This is Eastgate, the appropriately-named eastern gate of the city of Ack. The road here leads west into the Tin Ward, and east toward the town of Bellybrush."
   #:exits '((east . green-delta/game/bellybrush/west-kingsroad)
             (west . green-delta/game/ack/tin-ward))))