#lang racket

(require qtops/qualities/area
         qtops/qualities/region
         "../../../../../../qualities/brusher.rkt")

(provide <>southbank-house)

(define (<>porch t)
  (<>Brusher
   (<>area
    t #:name "porch"
    #:description "This is the porch of the Southbank House, which wraps around the west and south of the property. Steps lead down to the yard.")))

(define (<>yard t)
  (<>Brusher
   (<>area
    t #:name "yard"
    #:description "This is yard south of the Southbank House, one of the oldest buildings still standing in Bellybrush. The yard has a few weak patches of grass, and several rocks large enough to be stools scattered around. The building, north of here, is painted a multitude of grays, clearly well-considered but nonetheless rather drab. Steps lead up onto the porch. To the east is Gibbet Street.")))

(define (<>southbank-house t)
  (<>Brusher
   (<>region
    t #:name "Southbank House"
    #:areas `((yard ,<>yard)
              (porch ,<>porch))
    #:links '((yard north south porch)))
   #:trivia '("The Southbank House, in Bellybrush, is loosely based on the Southgate House, in real-world Newport, Kentucky.")))
