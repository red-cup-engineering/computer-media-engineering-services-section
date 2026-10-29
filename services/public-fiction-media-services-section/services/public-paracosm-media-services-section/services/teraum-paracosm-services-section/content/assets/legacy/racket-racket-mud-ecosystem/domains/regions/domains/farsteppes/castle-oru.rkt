#lang racket

(require qtops/qualities/area
         qtops/qualities/lookable
         qtops/qualities/npc
         "../../qualities/stepper.rkt")

(provide <>castle-oru
         <>renkah-oru)

(define (<>renkah-oru t)
  (<>Stepper
    (<>npc
     (<>lookable
        t #:name "Renkah Oru"
        #:description "Renkah Oru is a tremendously large and broad feminine human."))
    #:trivia '("Renkah Oru was created by Stirling Little for the \"Brave Old World\" tabletop role-playing campaign in rw2016.")))

(define (<>castle-oru t)
  (<>Stepper
    (<>area
      t #:name "Castle Oru"
      #:description "This is Castle Oru, though people living in distant meddlesome empires might disagree about that name."
      #:contents (list <>renkah-oru))
    #:trivia '("Castle Oru, in the Farsteppes, is named for the apocryphal Castle Oru of the Unseen Sea.")))
