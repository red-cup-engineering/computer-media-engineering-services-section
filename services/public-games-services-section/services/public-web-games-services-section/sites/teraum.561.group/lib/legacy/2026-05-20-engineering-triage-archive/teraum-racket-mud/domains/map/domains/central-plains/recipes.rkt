#lang racket

(require "../recipes.rkt")

(provide rural-road
         fort
         (all-from-out "../recipes.rkt"))

(define central-plains-trivia
  '("Dwarves began to settle the Central Plains around 1200bB."))

(define rural-road
  (lambda (#:name [name #f] #:nouns [nouns #f] #:adjectives [adjectives #f]
           #:description [description #f] #:contents [contents #f]
           #:trivia [trivia #f] #:actions [actions #f] #:exits [exits #f])
    (let ([std-name "inn"] [std-nouns '("inn")]
          [std-description "This is a rural road in the Central Plains."])
      (basic/area/outdoors/rural-road
       #:name (cond [name name][else std-name])
       #:nouns (cond [nouns nouns][else std-nouns])
       #:adjectives adjectives
       #:description (cond [description description][else std-description])
       #:contents contents #:trivia trivia #:actions actions
       #:exits exits))))

(define fort
  (lambda (#:name [name #f] #:nouns [nouns #f] #:adjectives [adjectives #f]
           #:description [description #f] #:contents [contents #f]
           #:trivia [trivia #f] #:actions [actions #f] #:exits [exits #f])
    (let ([std-name "inn"] [std-nouns '("inn")]
          [std-description "This is a fort in the Central Plains."])
      (basic/area/outdoors/fort
       #:name (cond [name name][else std-name])
       #:nouns (cond [nouns nouns][else std-nouns])
       #:adjectives adjectives
       #:description (cond [description description][else std-description])
       #:contents contents #:trivia trivia #:actions actions
       #:exits exits))))