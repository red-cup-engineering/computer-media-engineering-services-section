#lang racket

(require "./recipes.rkt")

(provide castle-oru)

(define renkah-oru
  (basic/person/human
   #:name "Renkah Oru"
   #:description "Renkah Oru is a tremendously large and broad feminine human."
   #:trivia '("Renkah Oru was created by Stirling Little for the \"Brave Old World\" tabletop role-playing campaign in 2016rw.")))

(define castle-oru
  (castle
   #:name "Castle Oru"
   #:description "This is Castle Oru, in the Farsteppes."
   #:exits '((southwest . farsteppes/helmets-dent))
   #:trivia '("Castle Oru, in the Farsteppes, is named for the apocryphal Castle Oru of the Unseen Sea.")))