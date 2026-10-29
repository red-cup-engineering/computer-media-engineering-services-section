#lang racket

(require "../recipes.rkt")

(provide ack-trivia
         district
         street
         (prefix-out ack/ store)
 (all-from-out "../recipes.rkt"))

(define ack-trivia
  '("The city of Ack once had a different name, but it was replaced by the involuntary sound visitors made when they first encounter its infamous stink."
    "The city of Ack is bisected by the Green River, though it is brown with silt and sewage long before it approaches the city."
    "The city of Ack is built on the eastern coast of the Optic Ocean."
    "The city of Ack is the largest known human settlement, with a population of between 220,000 and 400,000."
    "Many of Ack's districts have semi-autonomous governments, though most acknowledge the sovereignty of the Red Union."
    "The city of Ack was founded in 873bB by human fisherfolk who migrated into the region from the Central Plains."
    "On the 14th of Blooming, 80aB accident in the Dock Ward led to much of the city of Ack being burnt down."
    "It's rumored that the Fire of Ack which burnt much of the city in 80aB was intentionally started by the Cloudbound Trading Company, who may have been seeking to eliminate competitor merchants in the Dock Ward."
    "It's rumored that the Fire of Ack which burn much of the city in 80aB was accidentally started by immigrants who were detained by the Red Union."
    "In the 50s, aristocrats of Ack favoured wide lapels and leather vests."))

(define atrix-hucklebee
  (basic/person
   #:name "Atrix Hucklebee"
   #:description "Atrix Hucklebee is a feminine human who works for the Blacksmiths Guild. They often travel to the New World, to help set up new franchises in Halfling Country."))

(define district
  (lambda (#:name [name #f] #:nouns [nouns #f] #:adjectives [adjectives #f]
           #:description [description #f] #:contents [contents #f]
           #:trivia [trivia #f] #:actions [actions #f] #:exits [exits #f])
    (let ([std-description "This is a district of the city of Ack."])
      (basic/area/outdoors/urban-district
       #:name name #:nouns nouns
       #:adjectives adjectives
       #:description (cond [description description][else std-description])
       #:contents contents #:trivia (cond [trivia (append trivia ack-trivia)][else ack-trivia])
       #:actions actions
       #:exits exits))))

(define street
  (lambda (#:name [name #f] #:nouns [nouns #f] #:adjectives [adjectives #f]
           #:description [description #f] #:contents [contents #f]
           #:trivia [trivia #f] #:actions [actions #f] #:exits [exits #f])
    (let ([std-description "This is a district of the city of Ack."])
      (basic/area/outdoors/urban-street
       #:name name #:nouns nouns
       #:adjectives adjectives
       #:description (cond [description description][else std-description])
       #:contents contents #:trivia (cond [trivia (append trivia ack-trivia)][else ack-trivia])
       #:actions actions
       #:exits exits))))

(define store
  (lambda (#:name [name #f] #:nouns [nouns #f] #:adjectives [adjectives #f]
           #:description [description #f] #:contents [contents #f]
           #:trivia [trivia #f] #:actions [actions #f] #:exits [exits #f])
    (let ([std-description "This is a store in the city of Ack."])
      (basic/area/room/store
       #:name name #:nouns nouns
       #:adjectives adjectives
       #:description (cond [description description][else std-description])
       #:contents contents #:trivia (cond [trivia (append trivia ack-trivia)][else ack-trivia])
       #:actions actions
       #:exits exits))))