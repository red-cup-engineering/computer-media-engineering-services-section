#lang racket

(require qtops/qualities/region
         "../../qualities/gloamer.rkt"
         "belcaer/main.rkt"
         "jacobs-folly.rkt"
         "longroad.rkt")

(provide <>gloaming)

(define (<>gloaming t)
  (<>Gloamer
   (<>region
    t #:name "Gloaming"
    #:description "This is the Gloaming, a marshy region broken up by thousands of small mesas. Volcanic activity ensures a perpetual fog, shifting the sunlight toward the orange tones of dusk. At night, biolumiscient bacteria which live in the area's waters replace the sunlight with an equivalent glow, leading to the region appearing to exist in a perpetual sunset."
    #:areas `((belcaer ,<>belcaer)
             (jacobs-folly ,<>jacobs-folly)
             (north-longroad ,<>north-longroad)
             (central-longroad ,<>central-longroad)
             (south-longroad ,<>south-longroad))
    #:links '((north-longroad "south" "north" central-longroad)
              (central-longroad "south" "north" south-longroad)
              (central-longroad "west" "east" jacobs-folly)))
   #:trivia '("The Gloaming was added to a region of Teraum in spring of rw2017."))
  ((t 'area 'south-longroad)
   'set-exit! "southwest" ((t 'area 'belcaer) 'area 'lobby))
  (((t 'area 'belcaer) 'area 'lobby)
   'set-exit! "northeast" (t 'area 'south-longroad))
  t)
