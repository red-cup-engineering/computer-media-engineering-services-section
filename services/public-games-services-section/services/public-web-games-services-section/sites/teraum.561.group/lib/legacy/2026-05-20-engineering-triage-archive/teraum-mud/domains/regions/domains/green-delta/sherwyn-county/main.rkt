#lang racket

(require qtops/qualities/area
         qtops/qualities/npc
         qtops/qualities/region
         "../../../qualities/sherwyn.rkt")

(provide <>sherwyn-county)

(define (<>chauntean-monastery t)
  (<>Sherwyn
    (<>area
      t #:name "Chauntean Monastery")
    #:trivia '("The Chauntean Monastery in Sherwyn County was constructed around 1140bB.")))

(define (<>the-vagrant t)
  (<>Sherwyn
    (<>npc
      t #:name "the Vagrant"
      #:description "This is the Vagrant.")
      ; born in Gnalens as Stede Bonnet, last of the Bonnet family
    #:trivia '("The Vagrant arrived in Sherwyn County suspiciously soon after the Fire of Ack, in the spring of 80pc."
               "The Vagrant was created by Brent Davis in 2016rw.")))

(define (<>brother-sun t)
  (<>Sherwyn
    (<>npc
      t #:name "Brother Sun"
      #:description "This is Brother Sun, an androgynous human wearing orange robes which have been often repaired by not-quite-matching orange thread.")
   ; more talkative than you'd expect for a monk
   ; accent - from the lystran monastery in the elflands
   #:trivia '("Brother Sun was created by Jorge Landivar in 2016rw.")))

(define (<>ilea t)
  (<>Sherwyn
    (<>npc
      #:name "Ilea"
      #:description "This is Ilea, a tall red-headed feminine human.")
    #:trivia '("Ilea was born on a human farm in the northwest part of Halfling Country in 53aB."
               "Prior to migrating to Sherwyn County, Ilea worked as a hunter in the Elflands of the New World."
               "Ilea moved from the Elflands to the Old World in 80pc.")))


(define (<>sherwyn-county t)
  (<>region
   t #:name "Sherwyn County"
   #:areas `((chauntean-monastery ,<>chauntean-monastery))))
