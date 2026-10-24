#lang racket

(require "./recipes.rkt")

(provide dining-hall)

(define dining-hall
  (honeyfern-labs/room
    #:name "dining hall of Honeyfern Laboratories"
    #:description "This is the dining hall of Honeyfern Laboratories. A door leads to a hallway, while another leads to the kitchen."
    #:exits '((hallway . green-delta/game/south-arathel/honeyfern-labs/first-floor-hallway)
              (kitchen . green-delta/game/south-arathel/honeyfern-labs/kitchen))))

