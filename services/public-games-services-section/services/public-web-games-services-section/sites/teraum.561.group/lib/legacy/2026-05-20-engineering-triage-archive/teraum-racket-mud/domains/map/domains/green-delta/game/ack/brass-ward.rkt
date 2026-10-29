#lang racket

(require "./recipes.rkt")

(provide brass-ward)

(define caliper-street
  (street
   #:name "Caliper Street"
   #:exits '((out . green-delta/game/brass-ward)
             (114 . green-delta/game/caliper-street/114))))

(define caliper-street/114
  (ack/store
   #:name "Broken Baubels"
   #:description "This is Broken Baubels, a store in the Brass Ward of the human metropolis of Ack. A rather unpopular shop, Broken Baubels sells relics of the prosperous and wonderous times before magic Broke. Glass displays are cluttered with broken lumorbs, non-functional pocket dragons, and other trinkets from the Magic Revolution. In the back corner is an autohearth, cast iron pipes rising out of it and penetrating the ceiling."
   #:trivia '("During the Magic Revolution, 114 Caliper Street was the home and laboratory of Altar Sendvogue.")))

(define brass-ward
  (district
   #:name "Brass Ward"
   #:description "This is the Brass Ward, a district in the city of Ack. To the east is Bank Hill. To the west is the Copper Ward. To the south is Anger's Place."
   #:exits '((east . green-delta/game/ack/bank-hill)
             (west . green-delta/game/ack/copper-ward)
             (south . green-delta/game/ack/angers-place))))
