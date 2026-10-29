#lang racket

(require "./recipes.rkt")

(provide golden-shield-inn)

(define athyer
  (basic/person/human/innkeep
   #:name "Athyer"
   #:description "This is Athyer, a masculine human person."))

(define golden-shield-inn
  (south-arathel/inn
   #:name "Golden Shield Inn"
   #:description "This is the Golden Shield Inn. It is a large single-storey timber-framed building, with a reinforced wooden door and unusually high ceilings. Accomodations consist of a several large rooms with beds and straw mattresses, and a mezzanine with several wooden cots. The innkeeper is a young human man named Athyer."
   #:exits '((out . green-delta/game/south-arathel/outside-golden-shield-inn))
   #:contents (list athyer)))