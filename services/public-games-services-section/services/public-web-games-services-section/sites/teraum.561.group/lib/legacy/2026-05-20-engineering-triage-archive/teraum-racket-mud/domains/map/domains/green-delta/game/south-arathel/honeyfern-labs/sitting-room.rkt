#lang racket

(require "./recipes.rkt")

(provide sitting-room)

(define sitting-room
  (honeyfern-labs/room
    #:name "sitting room of Honeyfern Laboratories"
    #:description "This is the sitting room of Honeyfern Laboratories. A door leads to the foyer."
    #:exits '((foyer . green-delta/game/south-arathel/honeyfern-labs/foyer))))