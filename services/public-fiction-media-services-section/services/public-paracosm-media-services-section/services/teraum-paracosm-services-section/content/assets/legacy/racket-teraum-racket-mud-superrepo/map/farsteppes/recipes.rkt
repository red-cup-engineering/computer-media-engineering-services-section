#lang racket

(require "../recipes.rkt")

(provide rural-road
         fort
         village
         castle
         (all-from-out "../recipes.rkt"))

(define farsteppes-trivia
  '("The Farsteppes are named such because they're far away from both the Green Delta and Central Plains, which were the hubs of human and dwarf civilization respectively."))


(define village
  (lambda (#:name [name #f] #:nouns [nouns #f] #:adjectives [adjectives #f]
           #:description [description #f] #:contents [contents #f]
           #:trivia [trivia #f] #:actions [actions #f] #:exits [exits #f])
    (let ([std-description "This is a village in the Farsteppes."])
      (basic/area/outdoors/village
       #:name name #:nouns nouns
       #:adjectives adjectives
       #:description (cond [description description][else std-description])
       #:contents contents #:trivia (cond [trivia (append trivia farsteppes-trivia)][else farsteppes-trivia]) #:actions actions
       #:exits exits))))

(define rural-road
  (lambda (#:name [name #f] #:nouns [nouns #f] #:adjectives [adjectives #f]
           #:description [description #f] #:contents [contents #f]
           #:trivia [trivia #f] #:actions [actions #f] #:exits [exits #f])
    (let ([std-description "This is a rural road in the Farsteppes."])
      (basic/area/outdoors/rural-road
       #:name name #:nouns nouns
       #:adjectives adjectives
       #:description (cond [description description][else std-description])
       #:contents contents #:trivia (cond [trivia (append trivia farsteppes-trivia)][else farsteppes-trivia]) #:actions actions
       #:exits exits))))

(define castle
  (lambda (#:name [name #f] #:nouns [nouns #f] #:adjectives [adjectives #f]
           #:description [description #f] #:contents [contents #f]
           #:trivia [trivia #f] #:actions [actions #f] #:exits [exits #f])
    (let ([std-description "This is a castle in the Farsteppes."])
      (basic/area/room/castle
       #:name name #:nouns nouns
       #:adjectives adjectives
       #:description (cond [description description][else std-description])
       #:contents contents #:trivia (cond [trivia (append trivia farsteppes-trivia)][else farsteppes-trivia]) #:actions actions
       #:exits exits))))


(define fort
  (lambda (#:name [name #f] #:nouns [nouns #f] #:adjectives [adjectives #f]
           #:description [description #f] #:contents [contents #f]
           #:trivia [trivia #f] #:actions [actions #f] #:exits [exits #f])
    (let ([std-description "This is a fort in the Farsteppes."])
      (basic/area/outdoors/fort
       #:name name #:nouns nouns
       #:adjectives adjectives
       #:description (cond [description description][else std-description])
       #:contents contents #:trivia (cond [trivia (append trivia farsteppes-trivia)][else farsteppes-trivia]) #:actions actions
       #:exits exits))))