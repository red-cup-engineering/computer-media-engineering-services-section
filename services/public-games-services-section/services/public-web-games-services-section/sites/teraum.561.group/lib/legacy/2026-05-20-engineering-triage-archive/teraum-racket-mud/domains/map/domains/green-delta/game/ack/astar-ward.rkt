#lang racket

(require "./recipes.rkt")

(provide astar-ward
         astar-ward-trivia)

(define astar-ward-trivia
  (append
   ack-trivia
   '("The Astar Ward is named after the defunct Astar Empire, which once ruled current-day Ack, Arathel County, and Pled County."
     "The Astar Ward is the traditional home of many trade colleges.")))

(define astar-ward
  (district
   #:name "Astar Ward"
   #:description "This is the Astar Ward, a district in the city of Ack. To the northwest is Reinhold Wood. To the east is Gasper. To the south is the Brass Ward. To the south is the Red Ward. To the northwest is the road to Arathel County."
   #:exits '((north . green-delta/game/south-arathel/south-arathel-ack-road)
             (northeast . green-delta/game/ack/reinhold-wood)
             (east . green-delta/game/ack/gasper)
             (south . green-delta/game/ack/red-ward))))