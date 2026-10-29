#lang racket

(require "./recipes.rkt")

(provide copper-ward)

(define copper-ward
  (district
   #:name "Copper Ward"
   #:description "This is the Copper Ward, a district of the city of Ack. To the east is the Brass Ward. To the southeast is Carper Falls. To the west is the Squash Ward. To the southwest is Sugar Heights. To the northwest is the Dock Ward."
   #:exits '((north . green-delta/game/ack/red-ward)
             (east . green-delta/game/ack/brass-ward)
             (southeast . green-delta/game/ack/carper-falls)
             (southwest . green-delta/game/ack/sugar-heights)
             (west . green-delta/game/ack/dock-ward))))
