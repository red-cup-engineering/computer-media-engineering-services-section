#lang racket

(require "./recipes.rkt")

(provide dull-thorn-inn)


(define benne
  (basic/person/human/innkeep
   #:name "Benne"
   #:description "This is Benne. She's a tall human woman, more timid than you'd expect, given her size."
   #:actions  '((2 . "Benne looks toward the window as something makes a sound outside.."))))

(define dull-thorn-inn
  (south-arathel/inn
   #:name "Dull Thorn Inn"
   #:description "This is the Dull Thorn Inn. The building is a two-storey timber and brick structure, furnished with well-made tables and chairs. A collection of weapons hangs on the wall to the right as one enters. Across from the entry, a door leads to the sleeping quarters. A woman named Benne stands behind the bar."
   #:exits '((out . green-delta/game/south-arathel/outside-dull-thorn-inn)
             (quarters . green-delta/game/south-arathel/dull-thorn-inn-quarters))))