#lang racket

(require "./recipes.rkt")

(provide helmets-dent)

(define ragar
  (basic/object
   #:name "ragar"
   #:description "This is a clay bottle filled with ragar: fermented mares milk. It was made by the Lazy Mare Tribe of the Farsteppes."
   #:trivia '("The Lazy Mare Tribe was created by David Vallner in 2016rw."
              "The Lazy Mare Tribe discovered ragar, fermented mares milk, around 3400bB.")))


(define susan-baff
  (basic/person/human
   #:name "Susan Baff" 
   #:description "This is Susan Baff, a feminine human who lives in Helmet's Dent, working as a cleaner and clerk for various businesses in town."))

(define tyjeer-baff
  (basic/person/human
   #:name "Tyjeer Baff"
   #:description "This is Tyjeer Baff, a masculine human around 12 or 13 years old."
   #:actions '((2 . "Tyjeer says, \"My uncle Harry's in Ack right now, probably fighting sailors from across the ocean!\"")
               (3 . "Tyjeer points his fingers to the sky and wiggles them about.")
               ; ammonia. cause she cleans windows and stuff.
               (2 . "Tyjeer says, \"My mummy smells like pee.\""))))


(define nash-celson
  (basic/person/human
   #:name "Nash Celson"
   ; cons out-of-towners into robbing houses/businesses.
   #:description "Nash Celson is dressed in a fairly nice suit."))

(define helmets-dent
  (village
   #:name "Helmet's Dent"
   #:description "This is the town of Helmet's Dent. It is the largest town in the Farsteppes, existing around a large market where traders from the local nomadic tribes do business with merchants from the Central Plains and Green Delta. The buildings of the town reflect the diverse population, highlighting architectural styles from around the world."
   #:exits '((northeast . farsteppes/castle-oru)
             (southeast . farsteppes/road-to-culver-estate)
             (west . farsteppes/west-kingsroad))))