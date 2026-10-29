#lang racket

(require qtops/qualities/region
         "../../../qualities/stepper.rkt"
         "castle-oru.rkt"
         "culver-estate.rkt"
         "helmets-dent.rkt"
         "kingsroad.rkt"
         "road-to-culver-estate.rkt")

(provide <>farsteppes)

(define (<>farsteppes t)
  (<>region
   t #:name "Farsteppes"
   #:description "This is the Farsteppes. As the name implies, it is a steppes, and it is relatively far from many places."
   #:areas `((castle-oru ,<>castle-oru)
             (culver-estate ,<>culver-estate)
             (helmets-dent ,<>helmets-dent)
             (road-to-culver-estate ,<>road-to-culver-estate)
             (kingsroad ,<>kingsroad))
   #:links '((castle-oru "southwest" "northeast" helmets-dent)
             (helmets-dent
              "southeast" "northwest"
              road-to-culver-estate)
             (helmets-dent "west" "east" kingsroad)
             (road-to-culver-estate
              "east" "west" culver-estate))))
