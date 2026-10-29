#lang racket

(require "../recipes.rkt")
(require "../../arathel-county/recipes.rkt")
(provide (prefix-out south-arathel/ inn)
         (prefix-out south-arathel/ room)
         (prefix-out south-arathel/ rural-road)
         (prefix-out south-arathel/ turnwise-road)
         (all-from-out "../recipes.rkt"))

(define south-arathel-trivia
  (append arathel-county-trivia
  '("South Arathel, as a region, was created in the fall of 80pc by a decree from the Red Union, in coordination with the Sheriff of Arathel County, when the Union was establishing the Greater Ack Metropolitan Enclave."
    "Administrative governance of South Arathel is handled by the Red Union, while Arathel County is in responsible for law enforcement.")))

(define outdoor-actions
  '((2 . "In the sky, a scrap of newspaper is carried northward by the Turnwise Winds.")))


(define room
  (lambda (#:name [name #f] #:nouns [nouns #f] #:adjectives [adjectives #f]
           #:description [description #f] #:contents [contents #f]
           #:trivia [trivia #f] #:actions [actions #f] #:exits [exits #f])
    (let ([std-description "This is a room in South Arathel, within the Greater Ack Metropolitan Enclave."])
      (teraum/room
       #:name name #:nouns nouns
       #:adjectives adjectives
       #:description (cond [description description][else std-description])
       #:contents contents
       #:trivia (cond [trivia (append trivia arathel-county-trivia)][else arathel-county-trivia])
       #:actions actions
       #:exits exits))))

(define rural-road-lookable
  (basic/lookable
   #:name "road"
   #:description "The road here has a thick groove down the center, revealing the gray-bown dirt that lays under the local ecosystem."
   #:trivia (append south-arathel-trivia
                    '("Most people in South Arathel use a single-wheeled handcart, giving the local roads a single deep groove."))))

(define rural-road
  (lambda (#:name [name #f] #:nouns [nouns #f] #:adjectives [adjectives #f]
           #:description [description #f]
           #:append-description [append-description #f]
           #:contents [contents #f]
           #:trivia [trivia #f] #:actions [actions #f] #:exits [exits #f])
    (let ([std-description "This is a rural road in South Arathel, within the Greater Ack Metropolitan Enclave."]
          [std-contents (list rural-road-lookable)])
      (teraum/rural-road
       #:name name #:nouns nouns
       #:adjectives adjectives
     #:description (cond [description (cond [append-description (format "~a ~a" std-description description)]
                                              [else description])][else std-description])
       #:contents (cond [contents (append contents std-contents)][else std-contents])
       #:trivia (cond [trivia (append trivia south-arathel-trivia)][else south-arathel-trivia])
       #:actions (cond [actions (append actions outdoor-actions)][else actions])
       #:exits exits))))

(define (turnwise-road
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
  (let ([std-name "Turnwise Road, South Arathel, Greater Ack Metropolitan Enclosure"]
        [std-description "This is an area of the Turnwise Road, a circular road that runs through South Arathel, within the Greater Ack Metropolitan Enclave."]
        [std-trivia (append south-arathel-trivia '("Each Springtyg, residents of South Arathel walk the Turnwise Road in a clockward (or turnwise) direction, dropping off care packages at street-signs for those who might need it."))])
    (rural-road
     #:name (cond [name (cond [append-name (format "~a, ~a" std-name name)][else name])][else std-name])
     #:nouns nouns
     #:adjectives adjectives
     #:description (cond [description (cond [append-description (format "~a ~a" std-description description)]
                                              [else description])][else std-description])
     #:contents contents
     #:trivia (cond [trivia (append trivia south-arathel-trivia)][else south-arathel-trivia])
     #:actions actions
     #:exits exits)))

(define inn
  (lambda (#:name [name #f] #:nouns [nouns #f] #:adjectives [adjectives #f]
           #:description [description #f] #:contents [contents #f]
           #:trivia [trivia #f] #:actions [actions #f] #:exits [exits #f])
    (let ([std-description "This is an inn in South Arathel, within the Greater Ack Metropolitan Enclave."])
      (teraum/inn
       #:name name #:nouns nouns
       #:adjectives adjectives
       #:description (cond [description description][else std-description])
       #:contents contents #:trivia (cond [trivia (append trivia south-arathel-trivia)][else south-arathel-trivia]) #:actions actions
       #:exits exits))))