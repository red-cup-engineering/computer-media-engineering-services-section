#lang racket

(require (prefix-in basic/ "../recipes.rkt"))

(provide teraum-trivia
         (prefix-out teraum/ wintertyg-tree)
         (prefix-out teraum/ inn)
         (prefix-out teraum/ rural-road)
         (prefix-out teraum/ room)
         (prefix-out teraum/ area/human-settlement)
         (all-from-out "../recipes.rkt"))

(define teraum-trivia
  '("Teraum was created around 2001 by emsenn, though at the time it was called Canland, because the world existed inside of a soup can."
    "There's no evidence that the world of Teraum does not exist inside a soup can."
    "Teraum is a portmanteau of \"Terra, with thaums,\" or, \"Earth, with magic.\""
    "Teraum's calendar year is 365.25 days long, just like Earth's."
    "Teraum has 12 months of 30 days, with several holidays located between months throughout the year."
    "The first sentient species on Teraum were the goblins, who escaped from the Undermuck in the Worldkeep."
    "Teraum was created as a garden for the gods, adjacent to the Worldkeep, where their various magic works and creatures were housed."))

(define wintertyg-tree
  (basic/object
   #:name "Wintertyg tree"
   #:description "This is a young spruce tree, mounted in a copper base, with small decorations hung from its branches: little wooden figures, twisted metal birds, and so on. It is a traditional Wintertyg tree!"
   #:trivia '("Though equivalent to Earth's Christmas, Wintertyg occurs on the equivalent of January 20th."
              "Wintertyg is a human holiday observed on the 20th of Sleeting. Typically, families and friends exchange gifts.")
   #:actions '((1 . "The Wintertyg tree briefly shimmers with festive cheer."))))


(define inn
  (lambda (#:name name #:nouns [nouns #f] #:adjectives [adjectives #f]
            #:description [description #f] #:exits [exits #f]
           #:contents [contents #f] #:actions [actions #f] #:trivia [trivia #f])
    (let ([std-contents (list wintertyg-tree)])
      (basic/area/room/inn
       #:name name
       #:description description
       #:exits exits
       #:contents (cond [contents (append contents std-contents)][else std-contents])
       #:actions actions
       #:trivia trivia))))

(define area/human-settlement
  (lambda (#:name name #:nouns [nouns #f] #:adjectives [adjectives #f]
            #:description [description #f] #:exits [exits #f]
           #:contents [contents #f] #:actions [actions #f] #:trivia [trivia #f])
    (basic/area/outdoors
       #:name name
       #:description description
       #:exits exits
       #:contents contents
       #:actions actions
       #:trivia trivia)))

(define rural-road
  (lambda (#:name name #:nouns [nouns #f] #:adjectives [adjectives #f]
            #:description [description #f] #:exits [exits #f]
           #:contents [contents #f] #:actions [actions #f] #:trivia [trivia #f])
    (basic/area/outdoors/rural-road
     #:name name
     #:description description
     #:exits exits
     #:contents contents
     #:actions actions
     #:trivia trivia)))

(define outdoors
  (lambda (#:name name #:nouns [nouns #f] #:adjectives [adjectives #f]
            #:description [description #f] #:exits [exits #f]
           #:contents [contents #f] #:actions [actions #f] #:trivia [trivia #f])
    (basic/area/outdoors
     #:name name
     #:description description
     #:exits exits
     #:contents contents
     #:actions actions
     #:trivia trivia)))


(define room
  (lambda (#:name name #:nouns [nouns #f] #:adjectives [adjectives #f]
            #:description [description #f] #:exits [exits #f]
           #:contents [contents #f] #:actions [actions #f] #:trivia [trivia #f])
    (basic/area/room
     #:name name
     #:description description
     #:exits exits
     #:contents contents
     #:actions actions
     #:trivia (cond [trivia (append trivia teraum-trivia)][else teraum-trivia]))))

(define goblin
  (lambda (#:name name #:nouns [nouns #f] #:adjectives [adjectives #f]
            #:description [description #f] #:exits [exits #f]
           #:contents [contents #f] #:actions [actions #f] #:trivia [trivia #f])
    (define goblin-trivia
      (append teraum-trivia
      '("Goblins were the second sentient species to settle Teraum, after giant spiders."
        "On the 2nd of Sleeting, 29395bB, the goblin Uzdar Brag was wandering the Undermuck and found a breach into the Widewoods. He returned with his tribe and they began to settle the region.")))
    (basic/person
     #:name name
     #:description description
     #:exits exits
     #:contents contents
     #:actions actions
     #:trivia (cond [trivia (append trivia goblin-trivia)][else goblin-trivia]))))

(define giant-spider
  (lambda (#:name name #:nouns [nouns #f] #:adjectives [adjectives #f]
            #:description [description #f] #:exits [exits #f]
           #:contents [contents #f] #:actions [actions #f] #:trivia [trivia #f])
    (define giant-spider-trivia
      (append teraum-trivia
      '("Giant spiders were the first sentient species to settle Teraum, after an earthquake caused a breach in the walls of the Worldkeep and let them out of the Knotted Hell.")))
    (basic/person
     #:name name
     #:description description
     #:exits exits
     #:contents contents
     #:actions actions
     #:trivia (cond [trivia (append trivia giant-spider-trivia)][else giant-spider-trivia]))))

(define cat
  (lambda (#:name name #:nouns [nouns #f] #:adjectives [adjectives #f]
            #:description [description #f] #:exits [exits #f]
           #:contents [contents #f] #:actions [actions #f] #:trivia [trivia #f])
    (define cat-trivia
      (append teraum-trivia
      '("No one is quite sure when cats came to Teraum, or where they came from.")))
    (basic/person
     #:name name
     #:description description
     #:exits exits
     #:contents contents
     #:actions actions
     #:trivia (cond [trivia (append trivia cat-trivia)][else cat-trivia]))))