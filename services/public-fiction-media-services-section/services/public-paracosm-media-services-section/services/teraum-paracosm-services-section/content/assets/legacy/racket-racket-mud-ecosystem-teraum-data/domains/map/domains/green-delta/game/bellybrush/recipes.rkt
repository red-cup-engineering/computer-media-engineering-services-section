#lang racket

(require "../recipes.rkt")

(provide road
         (all-from-out "../recipes.rkt"))

(define bellybrush-trivia
  '("The town of Bellybrush was settled in 701bB."))

(define road
  (lambda (#:name [name #f] #:nouns [nouns #f] #:adjectives [adjectives #f]
           #:description [description #f] #:contents [contents #f]
           #:trivia [trivia #f] #:actions [actions #f] #:exits [exits #f])
    (let ([std-name "inn"] [std-nouns '("inn")]
          [std-description "This is a rural road in the town of Bellybrush."])
      (basic/area/outdoors/road
       #:name (cond [name name][else std-name])
       #:nouns (cond [nouns nouns][else std-nouns])
       #:adjectives adjectives
       #:description (cond [description description][else std-description])
       #:contents contents #:trivia trivia #:actions actions
       #:exits exits))))
