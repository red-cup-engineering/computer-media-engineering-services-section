#lang racket

(require "./recipes.rkt")

(provide north-ward)

(define north-ward
  (district
   #:name "North Ward"
   #:description "This is the North Ward, where Ack's first gentry moved to get away from the working class. To the north is the road to Arathel County. To the northeast is the Astar Ward. To the east is the Red Ward. To the south is the Dock Ward. To the northwest is the Wineglass."
   #:exits '((northeast . green-delta/game/ack/astar-ward)
             (east . green-delta/game/ack/red-ward)
             (south . green-delta/game/ack/dock-ward)
             (northwest . green-delta/game/ack/wineglass))))