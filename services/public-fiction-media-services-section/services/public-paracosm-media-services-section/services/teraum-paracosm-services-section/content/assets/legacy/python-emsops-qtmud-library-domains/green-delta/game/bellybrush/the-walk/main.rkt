#lang racket

(require qtops/qualities/area
         qtops/qualities/lookable
         qtops/qualities/notable
         qtops/qualities/object
         qtops/qualities/region
         "../../../../../../qualities/brusher.rkt"
         "../../../../../../qualities/harvestable.rkt")

(provide <>the-walk)

(define (<>flower t)
  (<>lookable
   (<>object t)
   #:name "daisy"
   #:description "This is daisy, specifically the Oopsy variety, grown on the banks of the Green River in the Green Delta."))

(define (<>flowers t)
  (<>harvestable
   (<>lookable
    t #:name "roadside flowers"
    #:nouns '("flowers")
    #:description "Some flowers grow here by the side of the road.")
   #:return <>flower
   #:frequency 1))

(define (<>fletchers t)
  (<>area t #:name "Fletchers"))

(define (<>the-walk-1 t)
  (<>area t #:name "The Walk"))
(define (<>the-walk-2 t)
  (<>area t #:name "The Walk"))
(define (<>the-walk-3 t)
  (<>area t #:name "The Walk"))
(define (<>the-walk-4 t)
  (<>area t #:name "The Walk"
          #:description "This is the east end of the Walk. There are some flowers on the north side of the road, down the bank."
          #:contents (list <>flowers)))



(define (<>the-walk t)
  (<>Brusher
   (<>region
    t #:name "The Walk"
    #:areas `((the-walk-1 ,<>the-walk-1)
              (the-walk-2 ,<>the-walk-2)
              (the-walk-3 ,<>the-walk-3)
              (the-walk-4 ,<>the-walk-4))
    #:links '((the-walk-1 east west the-walk-2)
              (the-walk-2 east west the-walk-3)
              (the-walk-3 east west the-walk-4)))))
