#lang racket

(require "./recipes.rkt")
(provide outside-crossed-candles-inn)


(define inn
  (basic/lookable
   #:name "Crossed Candles Inn"
   #:nouns '("building" "inn" "shack")
   #:adjectives '("crossed candles")
   #:description "The Crossed Candles Inn is one of several inns on the roads between the city of Ack, to the south, and the town of Arathel, seat of Arathel County, to the north. The inn is a single-storey building, resembling a barn more than a home. There are two windows on each side of the door, closed with wooden shutters. Beside the inn's door is a rubbish bin."
   #:actions '((3 . "Lexandra Terr, the Inn's owner, steps out carrying a few empty bottles, which she puts in the rubbish bin by the door before heading back inside.")
               (1 . "A young man wearing a brown cotton jumpsuit hurries by, pushing a wheelbarrow. As he passes the rubbish bin, he quickly grabs it and empties it into his vehicle."))))
(define windows
  (basic/lookable
   #:name "shuttered windows"
   #:nouns '("window" "windows")
   #:adjectives '("closed" "shuttered")
   #:description "The facade of the inn has four windows, each closed by a pair of shutters."
   #:actions '((3 . "The wind blows the shutters in their frames."))))
(define shutters
  (basic/lookable
   #:name "shutters"
   #:nouns "shutters"
   #:adjectives (list "closed" "windows")
   #:description "The shutters are closed, preventing people from seeing into the inn."))


(define outside-crossed-candles-inn
  (south-arathel/turnwise-road
   #:name "outside Crossed Candles Inn"
   #:append-name #t
   #:description "On the west side of the road is the Crossed Candles Inn. The inn is a relatively simple wooden-slatted shack, with several shutter-covered windows facing the road. The road leads north, further into Arathel County, southeast toward the town of Bellybrush, and southwest toward the road to Ack."
   #:append-description #t
   #:exits '((north  . green-delta/game/south-arathel/outside-golden-shield-inn)
             (southeast . green-delta/game/south-arathel/bellybrush-road)
             (southwest . green-delta/game/south-arathel/south-arathel-ack-road)
             (west . green-delta/game/south-arathel/crossed-candles-inn))
   #:contents (list inn windows shutters)))

