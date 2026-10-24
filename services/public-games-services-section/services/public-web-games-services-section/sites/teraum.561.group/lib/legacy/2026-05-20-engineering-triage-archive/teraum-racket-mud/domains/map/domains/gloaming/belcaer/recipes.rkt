#lang racket

(require "../recipes.rkt")

(provide room
         (all-from-out "../recipes.rkt"))

(define belcaer-trivia
  '())


(define room
  (lambda (#:name [name #f] #:nouns [nouns #f] #:adjectives [adjectives #f]
           #:description [description #f] #:contents [contents #f]
           #:trivia [trivia #f] #:actions [actions #f] #:exits [exits #f])
    (let ([std-name "room in Belcaer"]
          [std-description "This is a village in the Farsteppes."]
          [std-actions '((2 . "There is a brief cascade of ringing rolling coins as a slot machine in a nearby room pays out its jackpot.")
                         (1 . "A security officer for the casino briefly enters the room, looking around before leaving again."))])
      (basic/area/room
       #:name (cond [name name][else std-name]) #:nouns nouns
       #:adjectives adjectives
       #:description (cond [description description][else std-description])
       #:contents contents #:trivia (cond [trivia (append trivia belcaer-trivia)][else belcaer-trivia])
       #:actions (cond [actions (append actions std-actions)][else std-actions])
       #:exits exits))))