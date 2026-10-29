#lang racket

(require "./recipes.rkt")

(provide crossed-candles-inn)

(define alfric
  ; alfric should have a chance of making a yokel in the bar attack a player
  (basic/person/ghost #:name "Alfric"
         #:description "This is Alfric, a ghost that haunts Crossed Candles Inn."
         #:actions '((1 . "Two yokels eye each other suspiciously."))
         #:trivia '(("Alfric the ghost died after slipping and hitting his head while trying to start a bar fight, after surviving many dangerous battles in the Great Wars."
                     "Alfric the ghost was the first \"NPC\" created within the MUD, because having physical existence (having mass) wasn't a feature yet."))))

(define cots
  (basic/lookable #:name "cots"
                  #:description "There are a few beds in one corner, more likely to be used when every other inn is full than as consistent board."))

(define inn
  (basic/lookable
   #:name "Crossed Candles Inn"
   #:nouns '("building" "inn" "shack")
   #:description "The Crossed Candles Inn is a relatively simple building: four posts are sunk deep into the silty clay soil of Arathel County, some crossbeams were braced into place, and vertical slats were hammered on over those. The floor is still dirt, though it's been packed so hard it almost resembles stone."))

(define lexandra
  (basic/person/human/innkeep
   #:name "Lexandra Terr"
   #:description "Lexandra Terr is a short feminine human. She is wearing a simple blue cotton dress."
   #:actions '((3 . "Lexandra steps out the door carrying a few empty glass bottles and returns a moment later, empty-handed."))))

(define posts
  (basic/lookable
   #:name "posts"
   #:adjectives '("four" "pine" "wooden")
   ; if examined with construction/wood skills, should be able to tell they've been lightly fired.
   #:description '("The four posts that provide the foundation of the building are a dark-coloured pine.")))

(define slats
  (basic/lookable
   #:name "slats"
   #:nouns "siding"
   #:adjectives '("pine" "ruddy" "wooden" "vertical")
   #:description "The siding of the Inn are vertical wooden slats, the ruddy colour of old pine."))

(define windows
  (basic/lookable
   #:name "windows"
   #:actions '((2 . "The wind outside bangs the shutters in their frames.")
               (1 . "The wind outside carries in the faint smell of brine and turpentine."))))

(define yokels
  (basic/lookable
   #:name "yokels"
   #:nouns '("farmers" "patrons" "people" "yokels" "workers")
   #:adjectives '("local")
   #:description "The patrons of this bar are mostly local yokels, workers and farmers from around South Arathel."))
  
(define crossed-candles-inn
  (south-arathel/inn #:name "Crossed Candles Inn"
       #:description "This is the Crossed Candles Inn: a simple wooden shack with several shuttered windows. There are a few wooden cots in one corner, and a long table which serves as the bar in another. There are some people seated at the table. A door leads out to Arathel County."
       #:exits '((out . green-delta/game/south-arathel/outside-crossed-candles-inn))
       #:trivia '("The Crossed Candles Inn was the first area to be created within the MUD.")
       #:contents (list alfric cots inn lexandra posts slats windows yokels)))
