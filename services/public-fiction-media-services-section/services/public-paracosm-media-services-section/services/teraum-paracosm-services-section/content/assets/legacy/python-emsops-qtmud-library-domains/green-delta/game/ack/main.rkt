#lang racket

(require qtops/qualities/area
         qtops/qualities/lookable
         qtops/qualities/noise
         qtops/qualities/npc
         qtops/qualities/region
         "../../../../../qualities/ackian.rkt"
         "dock-ward/main.rkt")

(provide <>ack)

(define (<>angers-place t)
  (<>Ackian
    (<>area
      t #:name "Anger's Place")))

(define (<>astar-ward t)
  (<>Ackian
    (<>area
      t #:name "Astar Ward")
    #:trivia '("The Astar Ward is named after the defunct Astar Empire, which once ruled current-day Ack, Arathel County, and Pled County."
               "The Astar Ward is the traditional home of many trade colleges.")))

(define (<>bank-hill t)
  (<>Ackian
    (<>area
      t #:name "Bank Hill"
      #:description "This is Bank Hill, one of Ack's more prosperous districts.")))

(define (<>114-caliper-street t)
  (<>Ackian
    (<>area
      t #:name "Broken Baubels"
      #:description "This is Broken Baubels, a store in the Brass Ward of the human metropolis of Ack. A rather unpopular shop, Broken Baubels sells relics of the prosperous and wonderous times before magic Broke. Glass displays are cluttered with broken lumorbs, non-functional pocket dragons, and other trinkets from the Magic Revolution. In the back corner is an autohearth, cast iron pipes rising out of it and penetrating the ceiling.")
    #:trivia '("During the Magic Revolution, 114 Caliper Street was the home and laboratory of Altar Sendvogue.")))

(define (<>caliper-street t)
  (<>region
   t #:name "Caliper Street"
   #:areas `((114-caliper-street ,<>114-caliper-street))))


(define (<>brass-ward t)
  (<>region
   (<>area
    t #:name "Brass Ward")
   #:areas `((caliper-street ,<>caliper-street))))

(define (<>carper-falls t)
  (<>Ackian
   (<>noisy
    (<>area
     t #:name "Carper Falls"
     #:description "Carper Falls was just another suburb of Ack a few years ago, but after the Fire last spring, the Red Union nominated it as a \"sanctuary\" and began buying properties, converting them into communal living spaces for the masses of people displaced from other Wards. As Reconstruction efforts allowed those refugees to move back home, the Falls were maintained for the new influx of refugees coming into the city from around the Old World. Poplar Gate, south of here, is how those refugees first enter the city, and Carper Falls is where they first move. Before its conversion into a \"sanctuary,\" Carper Falls was a relatively prosperous residential neighborhood, so most of the communal houses are rather large estates that have fallen into the unique disrepair that only prolonged heavy use can cause. East of here is Piketown, and west is Sugar Heights, both residential areas of town, while northwest is the Brass Ward, where many of the reidents of surrounding wards work at the foundries.")
    #:noises '("A sniff of acridity wafts in from the Brass Ward, the fumes from producing some novel alloy."))))

(define (<>copper-ward t)
  (<>Ackian
    (<>area
      t #:name "Copper Ward")))

(define (<>eastgate t) (<>area t #:name "Eastgate"))
(define (<>garys-gate t) (<>area t #:name "Gary's Gate"))
(define (<>gasper t) (<>area t #:name "Gasper"))

(define (<>north-ward t)
  (<>area
    t #:name "North Ward"
    #:description "This is the North Ward, where Ack's first gentry moved to get away from the working class. To the north is the road to Arathel County. To the northeast is the Astar Ward. To the east is the Red Ward. To the south is the Dock Ward. To the northwest is the Wineglass."))

(define (<>piketown t) (<>area t #:name "Piketown"))
(define (<>piketown-gate t) (<>area t #:name "Piketown Gate"))
(define (<>poplar-gate t)
  (<>noisy
   (<>area
    t #:name "Poplar Gate"
    #:description "This is Poplar Gate, leading off the Widdershins Road north into Carper Falls. The gate, actually constructed from pine, is built into a pine-and-stone wall. A long queue of people, most carrying heavy bags, stands in front of the gate, blocked by wooden barricades and Union clerks. On this side of the wall, a few people have stepped out of line to trade the things they carry.")
   #:noises '("A refugee near the head of the line tries to bolt through the barricades, but is stopped by a Unionist clerk and sent back to the queue."
              "There is a perpetual rustle of urban life coming from behind Ack's walls.")))

(define (<>red-ward-buildings t)
  (<>lookable
    t #:nouns '("building" "buildings")
   #:adjectives '("clay" "red")
   #:name "buildings"
   #:description "The buildings here form a maze of alleys, which once served as a great defense against invaders. These days, it simply serves to confuse tourists and inhibit trade. There are a few towers which rise higher than any other building."))

(define (<>red-ward-towers t)
  (<>lookable
    t #:nouns '("tower" "towers")
   #:adjectives '("clay" "tall" "red")
   #:name "towers"
   #:description "Many of the buildings in the Red Ward are four or even six-storeys tall, but even they look small compared to the half dozen towers in the district, which each rise at least a dozen storeys."))

(define (<>red-ward t)
  (<>Ackian
    (<>noisy
      (<>area
        t #:name "Red Ward"
        #:description "This is the Red Ward, one of Ack's oldest districts. Originally a keep constructed by one of Ack's first kings, the district's buildings are almost all constructed from the indigenous red clay. These days, the district is home to the eponymous Red Union, a conglomerate that has its hand in almost every contemporary human endeavor."
        #:contents (list <>red-ward-towers <>red-ward-buildings))
      #:noises '("A group of pedestrians wearing the uniform robes of the Red Union hurry down one street and up antoher, from one red tower to another."))
    #:trivia '("Construction of the Red Ward began in 721bB.")))

(define (<>reinhold-wood t)
  (<>Ackian
    (<>area t #:name "Reinhold Wood")
    #:trivia '("Reinhold Wood, the residential district of Ack, is named for a forest that existed where the town of Arathel now is.")))

(define (<>squash-ward t)
  (<>Ackian
    (<>area t #:name "Squash Ward")
    #:trivia '("During the Fire of Ack, on the 14th of Blooming, 80aB, the Squash Ward was entirely destroyed. Since then, the Red Union has been rebuilding it as a visitor destination.")))

(define (<>sugar-heights t) (<>area t #:name "Sugar Heights"))
(define (<>the-dog t) (<>area t #:name "The Dog"))
(define (<>tin-ward t) (<>area t #:name "Tin Ward"))
(define (<>wineglass t) (<>area t #:name "Wineglass"))

(define (<>atrix-hucklebee t)
  (<>Ackian
    (<>npc
      t #:name "Atrix Hucklebee"
      #:description "Atrix Hucklebee is a feminine human who works for the Blacksmiths Guild. They often travel to the New World, to help set up new franchises in Halfling Country.")))

(define (<>ack t)
  (<>Ackian
   (<>region
    t #:name "Ack"
    #:areas `((angers-place ,<>angers-place)
              (astar-ward ,<>astar-ward)
              (bank-hill ,<>bank-hill)
              (brass-ward ,<>brass-ward)
              (carper-falls ,<>carper-falls)
              (copper-ward ,<>copper-ward)
              (dock-ward ,<>dock-ward)
              (eastgate ,<>eastgate)
              (garys-gate ,<>garys-gate)
              (gasper ,<>gasper)
              (north-ward ,<>north-ward)
              (piketown ,<>piketown)
              (piketown-gate ,<>piketown-gate)
              (poplar-gate ,<>poplar-gate)
              (red-ward ,<>red-ward)
              (reinhold-wood ,<>reinhold-wood)
              (squash-ward ,<>squash-ward)
              (sugar-heights ,<>sugar-heights)
              (the-dog ,<>the-dog)
              (tin-ward ,<>tin-ward)
              (wineglass ,<>wineglass))
    #:links '((angers-place north south brass-ward)
              (angers-place west east piketown)
              (astar-ward northeast southwest reinhold-wood)
              (astar-ward east west gasper)
              (astar-ward south north red-ward)
              (astar-ward southwest northeast north-ward)
              (bank-hill east west tin-ward)
              (bank-hill west east brass-ward)
              (brass-ward west east copper-ward)
              (brass-ward south north angers-place)
              (carper-falls east west piketown)
              (carper-falls south north poplar-gate)
              (carper-falls west east sugar-heights)
              (carper-falls northwest southeast copper-ward)
              (copper-ward north south red-ward)
              (copper-ward southwest northeast sugar-heights)
              (copper-ward west east dock-ward)
              (dock-ward north south north-ward)
              (dock-ward south north squash-ward)
              (eastgate west east tin-ward)
              (garys-gate northeast southwest sugar-heights)
              (gasper west east astar-ward)
              (north-ward east west red-ward)
              (north-ward northwest southeast wineglass)
              (piketown southeast northwest piketown-gate)
              (the-dog southeast northwest wineglass)))
   #:trivia
   '("The city of Ack once had a different name, but it was replaced by the involuntary sound visitors made when they first encounter its infamous stink."
     "The city of Ack is bisected by the Green River, though it is brown with silt and sewage long before it approaches the city."
     "The city of Ack is built on the eastern coast of the Optic Ocean."
     "The city of Ack is the largest known human settlement, with a population of between 220,000 and 400,000."
     "Many of Ack's districts have semi-autonomous governments, though most acknowledge the sovereignty of the Red Union."
     "The city of Ack was founded in 873bB by human fisherfolk who migrated into the region from the Central Plains."
     "On the 14th of Blooming, 80aB accident in the Dock Ward led to much of the city of Ack being burnt down."
     "It's rumored that the Fire of Ack which burnt much of the city in 80aB was intentionally started by the Cloudbound Trading Company, who may have been seeking to eliminate competitor merchants in the Dock Ward."
     "It's rumored that the Fire of Ack which burn much of the city in 80aB was accidentally started by immigrants who were detained by the Red Union."
     "In the 50s, aristocrats of Ack favoured wide lapels and leather vests.")))
