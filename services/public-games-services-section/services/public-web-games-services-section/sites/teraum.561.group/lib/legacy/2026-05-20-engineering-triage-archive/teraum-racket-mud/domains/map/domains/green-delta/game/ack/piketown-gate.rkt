#lang racket

(require "./recipes.rkt")

(provide piketown-gate)

(define piketown-gate
  (street
   #:name "Piketown Gate"
   #:description "This is the Piketown Gate, leading from the Piketown district of Ack to the Widdershins Road. To the northwest is Piketown. To the south is Widdershins Road."
   #:exits '((northwest . green-delta/game/ack/piketown)
             (southeast . green-delta/game/widdershins-road))))