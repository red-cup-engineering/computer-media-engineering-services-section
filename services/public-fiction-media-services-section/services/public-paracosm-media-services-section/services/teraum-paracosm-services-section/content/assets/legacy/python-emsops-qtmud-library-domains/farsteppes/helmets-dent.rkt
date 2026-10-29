#lang racket

(require qtops/qualities/area
         qtops/qualities/lookable
         qtops/qualities/object
         qtops/qualities/npc
         "../../../qualities/stepper.rkt")

(provide <>helmets-dent
         <>ragar
         <>susan-baff <>tyjeer-baff <>nash-celson)

(define (<>ragar t)
  (<>Stepper
    (<>object
      (<>lookable
        t #:name "ragar"
        #:description "This is a clay bottle filled with ragar: fermented mares milk. It was made by the Lazy Mare Tribe of the Farsteppes.")))
  (t 'add-trivia! '("The Lazy Mare Tribe was created by David Vallner in 2016rw."
                    "The Lazy Mare Tribe discovered ragar, fermented mares milk, around 3400bB."))
  t)

(define (<>susan-baff t)
  (<>Stepper
    (<>npc
      (<>lookable
      t #:name "Susan Baff"
      #:description "Susan Baff is a feminine human who lives in Helmet's Dent, wokring as a cleaner and clerk for various businesses in town."))))

(define (<>tyjeer-baff t)
  (<>Stepper
    (<>npc
      (<>lookable
        t #:name "Tyjeer Baff"
        #:description "This is Tyjeer Baff, a masculine human around 12 or 13 years old."))))

(define (<>nash-celson t)
  (<>Stepper
    (<>npc
      (<>lookable
        t #:name "Nash Celson"
        #:description "Nash Celson is a non-descript masculine adult human."))))

(define (<>helmets-dent t)
  (<>Stepper
    (<>area
      t #:name "Helmet's Dent"
      #:description "This is the town of Helmet's Dent. It is the largest town in the Farsteppes, existing around a large market where traders from the local nomadic tribes do business with merchants from the Central Plains and Green Delta. The buildings of the town reflect the diverse population, highlighting architectural styles from around the world."
      #:contents (list <>tyjeer-baff <>susan-baff))
    #:trivia '("Castle Oru, in the Farsteppes, is named for the apocryphal Castle Oru of the Unseen Sea.")))
