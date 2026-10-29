#lang racket

(require "./recipes.rkt")

(provide lobby)

(define lobby
  (room
   #:name "Belcaer Lobby"
   #:description "This is Belcaer, a \"town\" in the Gloaming. The settlement was originally created by powerful magic users, who raised a giant mesa and carved into a fortress. In the years immediately after the Break, Belcaer was squatted by bandits, then adventurers. In recent years, it has been transformed into a large casino complex."
   #:exits '((east . gloaming/central-longroad)
             (offices . gloaming/belcaer/offices))))