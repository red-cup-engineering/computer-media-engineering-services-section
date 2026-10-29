#lang racket

(require "../recipes.rkt")

(provide rural-road
         field
 (all-from-out "../recipes.rkt"))

(define gloaming-trivia
  (append teraum-trivia
  '("The Gloaming's volcanic activity causes a permanent fog and sustains a luminiscent algae in the hot springs, casting much of the area in a permanent yellow-orange light that resembles twilight.")))

(define fog
  (basic/lookable
   #:name "fog"
   #:description "The volcanoes and springs of the Gloaming work together to raise a constant thick fog."))

(define rural-road
  (lambda (#:name [name #f] #:nouns [nouns #f] #:adjectives [adjectives #f]
           #:description [description #f] #:contents [contents #f]
           #:trivia [trivia #f] #:actions [actions #f] #:exits [exits #f]
           #:append-description [append-description #f])
    (let ([std-description "This is a rural road in the Gloaming. There is a thick fog."]
          [std-actions '((1 . "Far away a geyser whistles, adding its steam to the fog."))]
          [std-contents (list fog)])
      (basic/area/outdoors/rural-road
       #:name name #:nouns nouns
       #:adjectives adjectives
       #:description (cond [description (cond [append-description (format "~a ~a" std-description description)]
                                              [else description])][else std-description])
       #:contents (cond [contents (append contents std-contents)][else std-contents])
       #:trivia (cond [trivia (append trivia gloaming-trivia)][else gloaming-trivia])
       #:actions (cond [actions (append actions std-actions)][else std-actions])
       #:exits exits))))

(define field
  (lambda (#:name [name #f] #:nouns [nouns #f] #:adjectives [adjectives #f]
           #:description [description #f] #:contents [contents #f]
           #:trivia [trivia #f] #:actions [actions #f] #:exits [exits #f])
    (let ([std-description "This is a field in the Gloaming."])
      (basic/area/outdoors
       #:name name #:nouns nouns
       #:adjectives adjectives
       #:description (cond [description description][else std-description])
       #:contents contents #:trivia (cond [trivia (append trivia gloaming-trivia)][else gloaming-trivia]) #:actions actions
       #:exits exits))))