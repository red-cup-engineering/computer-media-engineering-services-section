#lang racket

(require "../recipes.rkt")

(provide arathel-county-trivia
         (prefix-out arathel-county/ area)
         (prefix-out arathel-county/ area/outdoors)
         (prefix-out arathel-county/ area/room)
         (prefix-out arathel-county/ village)
         (all-from-out "../recipes.rkt"))

(define
  arathel-county-trivia
  (append teraum-trivia 
  '("Arathel County is exceptionally windy because of the Turnwise Winds, which blow across the Optic Ocean, west to east: from the New World to the Old World."
    "Prior to 2016rw, Arathel County was known as Araleth County, but emsenn started spelling it wrong consistently and eventually the new name stuck."
    "The main exports of Arathel County are cokeberries, limestone, and wool."
    "Prior to the Break, many residents of Arathel County worshipped either Povator, a god of woodlands, or Siggrit, of earthworms."
    "From around 470bB to the Break, Arathel County was ruled by the Astar Empire.")))

(define (area
         #:name [name #f]
         #:append-name [append-name #f]
         #:nouns [nouns #f]
         #:adjectives [adjectives #f]
         #:description [description #f]
         #:append-description [append-description #f]
         #:contents [contents #f]
         #:trivia [trivia #f]
         #:actions [actions #f]
         #:exits [exits #f])
  (let ([std-name "Arathel County"]
        [std-description "This is an area of Arathel County."])
    (basic/area
     #:name (basic/setup-stringy-quality-value std-name name append-name ", ")
     #:nouns nouns
     #:adjectives adjectives
     #:description (basic/setup-stringy-quality-value std-description description append-description))))

(define (area/outdoors
         #:name [name #f]
         #:append-name [append-name #f]
         #:nouns [nouns #f]
         #:adjectives [adjectives #f]
         #:description [description #f]
         #:append-description [append-description #f]
         #:contents [contents #f]
         #:trivia [trivia #f]
         #:actions [actions #f]
         #:exits [exits #f])
  (let ([std-name "outside, Arathel County"]
        [std-description "This is some outdoor area of Arathel County."])
    (basic/area/outdoors
     #:name (basic/setup-stringy-quality-value std-name name append-name ", ")
     #:nouns nouns
     #:adjectives adjectives
     #:description (basic/setup-stringy-quality-value std-description description append-description)
     #:contents contents
     #:trivia (basic/setup-listy-quality-value arathel-county-trivia trivia #t))))

(define (area/room
         #:name [name #f]
         #:append-name [append-name #f]
         #:nouns [nouns #f]
         #:adjectives [adjectives #f]
         #:description [description #f]
         #:append-description [append-description #f]
         #:contents [contents #f]
         #:trivia [trivia #f]
         #:actions [actions #f]
         #:exits [exits #f])
  (let ([std-name "inside"]
        [std-description "This is some indoor area."])
    (basic/area/room
     #:name (basic/setup-stringy-quality-value std-name name append-name ", ")
     #:nouns nouns
     #:adjectives adjectives
     #:description (basic/setup-stringy-quality-value std-description description append-description)
     #:contents contents
     #:trivia (basic/setup-listy-quality-value arathel-county-trivia trivia #t))))

(define village
  (lambda (#:name [name #f] #:nouns [nouns #f] #:adjectives [adjectives #f]
           #:description [description #f] #:contents [contents #f]
           #:trivia [trivia #f] #:actions [actions #f] #:exits [exits #f])
    (let ([std-description "This is a village in Arathel County."])
      (basic/area/outdoors/village
       #:name name #:nouns nouns
       #:adjectives adjectives
       #:description (cond [description description][else std-description])
       #:contents contents #:trivia (cond [trivia (append trivia arathel-county-trivia)][else arathel-county-trivia]) #:actions actions
       #:exits exits))))