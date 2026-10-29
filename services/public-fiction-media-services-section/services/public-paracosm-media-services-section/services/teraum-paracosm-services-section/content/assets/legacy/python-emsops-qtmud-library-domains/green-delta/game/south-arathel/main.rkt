#lang racket

(require qtops/qualities/area
         qtops/qualities/lookable
         qtops/qualities/noise
         qtops/qualities/npc
         qtops/qualities/region
         "../../../../../qualities/gamer.rkt"
         "honeyfern-labs/main.rkt")

(provide <>south-arathel)

(define (<>bellybrush-road t) (<>area t #:name "Bellybrush Road"))
(define (<>belys-blades t)
  (<>area
    t #:name "Bely's Blades"
    #:description "This is Bely's Blades, a two-storey stone tower hewn from an outcrop of granite, with a slate roof. It is dimly lit by paper lanterns, and fairly shabby. Ingag Bely sells weapons she buys from adventurers exploring nearby dungeons. A door leads outside, to the Arathel-Ack road."))

(define (<>geda t)
  (<>npc
    (<>lookable
      t #:name "Geda"
      #:description "Geda owns the Broken Arrow Inn, where she makes cheddar and whey.")))

(define (<>broken-arrow-inn t)
  (<>area
    t #:name "Broken Arrow Inn"
    #:description "The Broken Arrow Inn is a single-storey stone-walled building, with a small fenced yard and a large cellar. Accommodations consist of several small rooms with wooden cots. The owner, Geda, makes cheddar and whey."
    #:contents (list <>geda)))

(define (<>alfric t)
  (<>Gamer
    (<>npc
      (<>lookable
        t #:name "Alfric"
        #:description "This is Alfric, a ghost that haunts Crossed Candles Inn."))
    #:trivia '(("Alfric the ghost died after slipping and hitting his head while trying to start a bar fight, after surviving many dangerous battles in the Great Wars."
                     "Alfric the ghost was the first \"NPC\" created within the MUD, because having physical existence (having mass) wasn't a feature yet."))))

(define (<>cots t)
  (<>lookable t #:name "cots"
             #:description "There are a few beds in one corner, more likely to be used when every other inn is full than as consistent board."))

(define (<>inn t)
  (<>lookable
    t #:name "Crossed Candles Inn"
    #:nouns '("building" "inn" "shack")
    #:description "The Crossed Candles Inn is a relatively simple building: four posts are sunk deep into the silty clay soil of Arathel County, some crossbeams were braced into place, and vertical slats were hammered on over those. The floor is still dirt, though it's been packed so hard it almost resembles stone."))

(define (<>lexandra-terr t)
  (<>npc
    (<>lookable
      t #:name "Lexandra Terr"
      #:description "Lexandra Terr is a short feminine human. She is wearing a simple blue cotton dress.")))

(define (<>posts t)
  (<>lookable t
   #:name "posts"
   #:adjectives '("four" "pine" "wooden")
   ; if examined with construction/wood skills, should be able to tell they've been lightly fired.
   #:description "The four posts that provide the foundation of the building are a dark-coloured pine."))

(define (<>slats t)
  (<>lookable t
   #:name "slats"
   #:nouns "siding"
   #:adjectives '("pine" "ruddy" "wooden" "vertical")
   #:description "The siding of the Inn are vertical wooden slats, the ruddy colour of old pine."))

(define (<>windows t)
  (<>noisy
    (<>lookable t  #:name "windows")
    #:noises '("The wind outside bangs the shutters in their frames."
               "The wind outside carries in the faint smell of brine and turpentine.")))

(define (<>yokels t)
  (<>lookable t
   #:name "yokels"
   #:nouns '("farmers" "patrons" "people" "yokels" "workers")
   #:adjectives '("local")
   #:description "The patrons of this bar are mostly local yokels, workers and farmers from around South Arathel."))

(define (<>crossed-candles-inn t)
  (<>Gamer
    (<>area
      t #:name "Crossed Candles Inn"
      #:description "This is the Crossed Candles Inn: a simple wooden shack with several shuttered windows. There are a few wooden cots in one corner, and a long table which serves as the bar in another. There are some people seated at the table. A door leads out to Arathel County."
      #:contents (list <>alfric <>cots <>inn <>lexandra-terr <>posts <>slats <>windows <>yokels))
    #:trivia '("The Crossed Candles Inn was the first area to be created within the MUD.")))

(define (<>benne t)
  (<>noisy
    (<>npc
      (<>lookable
        t #:name "Benne"
        #:description "This is Benne. She's a tall human woman, more timid than you'd expect, given her size."))
    #:noises '("Benne looks toward the window as something makes a sound outside..")))

(define (<>dull-thorn-inn t)
  (<>area
   t #:name "Dull Thorn Inn"
   #:description "This is the Dull Thorn Inn. The building is a two-storey timber and brick structure, furnished with well-made tables and chairs. A collection of weapons hangs on the wall to the right as one enters. Across from the entry, a door leads to the sleeping quarters. A woman named Benne stands behind the bar."))

(define (<>dull-thorn-inn-quarters t)
  (<>area
   t #:name "sleeping quarters of the Dull Thorn Inn"
   #:description "This is the sleeping quarters of the Dull Thorn Inn, a small room off the main inn. There are eight wooden cots scattered around."))

(define (<>fork-toward-honeyfern-labs t)
  (<>area t #:name "intersection of two roads"))

(define (<>athyer t)
  (<>npc t
        #:name "Athyer"
        #:description "This is Athyer, a masculine human person."))

(define (<>golden-shield-inn t)
  (<>area
   t #:name "Golden Shield Inn"
   #:description "This is the Golden Shield Inn. It is a large single-storey timber-framed building, with a reinforced wooden door and unusually high ceilings. Accomodations consist of a several large rooms with beds and straw mattresses, and a mezzanine with several wooden cots. The innkeeper is a young human man named Athyer."))

(define (<>north-arathel-ack-road t)
  (<>area
    t    #:name "north Arathel-Ack Road"
   #:description "This is the northern end of the road from Ack toward Arathel County, where it forks to the northwest and east. Both forks ultimately lead further north into the County. The difference is in what one passes on the way. The road northwest leads past Honeyfern Laboratories, while the road east passes more inns. To the southeast, the road leads to Ack."))

(define (<>outside-broken-arrow-inn t)
  (<>area t #:name "outside the Broken Arrow Inn"))

(define (<>outside-crossed-candles-inn t)
  (<>area
    t #:name "Outside the Crossed Candles Inn."
       #:description "On the west side of the road is the Crossed Candles Inn. The inn is a relatively simple wooden-slatted shack, with several shutter-covered windows facing the road. The road leads north, further into Arathel County, southeast toward the town of Bellybrush, and southwest toward the road to Ack."))

(define (<>outside-dull-thorn-inn t)
  (<>area t #:name "outside the Dull Thorn Inn"))

(define (<>outside-golden-shield-inn t)
  (<>area t #:name "outside the Golden Shield Inn"))
(define (<>road-near-frekes-grave t)
  (<>area t #:name "morbid stretch of road"
         #:description "This is a length of rural road, cutting north to south through the countryside. There is grave marker set a ways back from the road, and closer, a man dressed in black is hanging by his wrists from a tree. There are some cokeberry bushes growing here."))
(define (<>road-to-honeyfern-labs t)
  (<>area
    t #:name "road"
       #:description "This is the road toward Honeyfern Laboratories, in Arathel County. Tall pines scatter the area. To the northeast is Honeyfern Laboratories, and to the southwest is a road leading elsewhere."))
(define (<>south-arathel-ack-road t)
  (<>area t #:name "road"))
(define (<>west-arathel-pled-road t)
  (<>area t #:name "road"))

;; free food stall outside a tavern
;; family walks up, one kid murmurs "mom other people might need that more than we do," mom looks guilty and shushes.

(define (<>south-arathel t)
  (<>Gamer
   (<>region
    t #:name "South Arathel"
    #:areas `((bellybrush-road ,<>bellybrush-road)
              (belys-blades ,<>belys-blades)
              (broken-arrow-inn ,<>broken-arrow-inn)
              (crossed-candles-inn ,<>crossed-candles-inn)
              (dull-thorn-inn ,<>dull-thorn-inn)
              (dull-thorn-inn-quarters ,<>dull-thorn-inn-quarters)
              (fork-toward-honeyfern-labs
               ,<>fork-toward-honeyfern-labs)
              (golden-shield-inn ,<>golden-shield-inn)
              (honeyfern-labs ,<>honeyfern-labs)
              (north-arathel-ack-road ,<>north-arathel-ack-road)
              (outside-broken-arrow-inn
               ,<>outside-broken-arrow-inn)
              (outside-crossed-candles-inn
               ,<>outside-crossed-candles-inn)
              (outside-dull-thorn-inn
               ,<>outside-dull-thorn-inn)
              (outside-golden-shield-inn
               ,<>outside-golden-shield-inn)
              (road-near-frekes-grave
               ,<>road-near-frekes-grave)
              (road-to-honeyfern-labs
               ,<>road-to-honeyfern-labs)
              (south-arathel-ack-road
               ,<>south-arathel-ack-road)
              (west-arathel-pled-road
               ,<>west-arathel-pled-road))
    #:links '((bellybrush-road northwest southeast
                               outside-crossed-candles-inn)
              (dull-thorn-inn quarters out dull-thorn-inn-quarters)
              (fork-toward-honeyfern-labs
               northeast southwest road-to-honeyfern-labs)
              (fork-toward-honeyfern-labs
               east west outside-broken-arrow-inn)
              (fork-toward-honeyfern-labs
               north south road-near-frekes-grave)
              (north-arathel-ack-road
               northeast southwest outside-crossed-candles-inn)
              (north-arathel-ack-road
               southwest northeast south-arathel-ack-road)
              (north-arathel-ack-road
               northwest southeast outside-broken-arrow-inn)
              (outside-broken-arrow-inn
               north out broken-arrow-inn)
              (outside-crossed-candles-inn
               north south outside-golden-shield-inn)
              (outside-crossed-candles-inn
               southeast northwest bellybrush-road)
              (outside-crossed-candles-inn
               west out crossed-candles-inn)
              (outside-dull-thorn-inn
               east west west-arathel-pled-road)
              (outside-golden-shield-inn
               east out golden-shield-inn)
              (south-arathel-ack-road
               west out belys-blades)))
   #:trivia
   '("South Arathel, as a region, was created in the fall of 80pc by a decree from the Red Union, in coordination with the Sheriff of Arathel County, when the Union was establishing the Greater Ack Metropolitan Enclave."
     "Administrative governance of South Arathel is handled by the Red Union, while Arathel County is responsible for law enforcement."))
  ((t 'area 'road-to-honeyfern-labs)
   'set-exit! "northeast"
   ((t 'area 'honeyfern-labs) 'area 'outside-gate))
  (((t 'area 'honeyfern-labs) 'area 'outside-gate)
   'set-exit! "southwest"
   (t 'area 'road-to-honeyfern-labs))
  t)
