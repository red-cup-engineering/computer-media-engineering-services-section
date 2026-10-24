#lang racket

(require "./recipes.rkt")

(provide chandlers-guild-office)

(define abeth
  (basic/person/human
   #:name "Abeth Harbrook"
   #:description "Abeth Harbrook is a feminine human. She is the representative of the Chandlers Guild in Belcaer, helping the casino fill its paper and office supply needs."
   #:actions '((2 . "Abeth Harbrook says, \"Most people don't think about how far the paper they use has come.\"")
               (1 . "Abeth Harbrook says, \"I tried suggesting the casino move to paper instead of coins.\""))))

; abeth harbrook should offer a quest: go collect the taxes due from King Brag

(define chandlers-guild-office
  (room
   #:name "Chandlers Guild Office"
   #:description "This is the office of the Chandlers Guild in Belcaer."
   #:exits '((out . gloaming/belcaer/offices))
   #:contents (list abeth)))