#lang racket

(require "../recipes.rkt")

(provide honeyfern-labs-trivia
         (prefix-out honeyfern-labs/ room)
         (all-from-out "../recipes.rkt"))

(define
  honeyfern-labs-trivia
  '("Prior to the Break, Honeyfern Labs was the home and library of Lorrestar, a famous magic-using human."
    "For 80 years after the Break, the building Honeyfern Labs occupies was abandoned; rumored to be haunted by its former owner, Lorrestar the magic user."
    "In the spring of 80pc, after the Ackian fire burnt down his lab in the Squash Ward, Aldous Honeyfern relocated to an estate in South Arathel, in the Greater Ack Metropolitan Enclave."
    "The library of Honeyfern Labs is an homage to (real world author) Terry Pratchett's concept of \"l-space.\""))

(define room
  (lambda (#:name [name #f] #:nouns [nouns #f] #:adjectives [adjectives #f]
           #:description [description #f] #:contents [contents #f]
           #:trivia [trivia #f] #:actions [actions #f] #:exits [exits #f])
    (let ([std-description "This is an room in Honeyfern Labs."])
      (south-arathel/room
       #:name name #:nouns nouns
       #:adjectives adjectives
       #:description (cond [description description][else std-description])
       #:contents contents #:trivia (cond [trivia (append trivia honeyfern-labs-trivia)][else honeyfern-labs-trivia]) #:actions actions
       #:exits exits))))