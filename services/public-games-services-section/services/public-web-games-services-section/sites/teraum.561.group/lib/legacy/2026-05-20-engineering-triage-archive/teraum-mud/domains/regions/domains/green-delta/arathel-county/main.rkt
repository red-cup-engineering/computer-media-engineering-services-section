#lang racket

(require qtops/qualities/area
         qtops/qualities/lookable
         qtops/qualities/region
         qtops/qualities/object
         "../../../qualities/arathellan.rkt")

(provide <>arathel-county)

(define (<>osmits-reinhard-bust t)
  (<>Arathellan
    (<>object
      (<>lookable
        t #:name "bust of Osmits Reinhard"
        #:description "This is a wooden bust of a rather angular and severe-looking masculine human. A small brass plaque screwed into the base declares the subject's name, Osmits Reinhard, and the years during which he lived: 503bB to 460bB"))
    #:trivia '("Osmits Reinhard, founder of the Reinhard Lumberworks in Old Arathel, was hung by his workers in the summber of 460bB after he failed to pay them.")))

(define (<>old-town-square-bricks t)
  (<>lookable
    t #:name "bricks"
    #:adjectives '("clean" "old" "red")
    #:description "The bricks that are used to pave the town square are clearly old, but are also the bright red that only recently cleaned bricks are."))

(define (<>cokeberry t)
  (<>Arathellan
      (<>object
        (<>lookable
          t #:name "cokeberry"
          #:description "This is a cokeberry, a small dark purple berry."))
      #:trivia '("Before the Break, cokeberries were processed for the slight amount of magic they contained. Now they're a tart snack.")))

(define (<>limestone t)
  (<>Arathellan
    (<>object
      (<>lookable
        t #:name "limestone"
        #:description "This is a chunk of limestone indigineous to Arathel County."))))

(define (<>wool t)
  (<>Arathellan
    (<>object
      (<>lookable
        t #:name "wool"
        #:description "This is a fluff of drab grey wool. If you were an expect in sheep morphology, you might recognize this wool as being from a breed of sheep most common in Arathel County."))))

(define (<>old-arathel-town-square t)
  (<>Arathellan
    (<>area
      t #:name "Old Town Square"
      #:description "This is the town square of Old Arathel. It is fairly large open area, paved with red bricks."
      #:contents (list <>old-town-square-bricks
                       <>osmits-reinhard-bust))))

(define (<>siggrit-temple t)
  (<>Arathellan
    (<>area
      t #:name "Siggrit Temple"
      #:description "This is Siggrit Temple, a squat limestone structure in Old Arathel. Siggrit was a god of earthworms.")
    #:trivia '("Siggrit Temple in Old Arathel was built in 454bB.")))

(define (<>first-church-of-povator t)
  (<>Arathellan
    (<>area
      t #:name "First Church of Povator"
      #:description "This is the First Church of Povator, an old and sprawling facility dedicated to the appreciation of Povator, a god of woodlands. Since the Break, the church has been mostly empty, used as storage for various gentry and bureaucrats operating in Arathel County.")
  #:trivia '("The First Church of Povator in Old Arathel, was built in 474bB.")))

(define (<>second-church-of-povator t)
  (<>Arathellan
    (<>area
      t #:name "Second Church of Povator"
      #:description "This is the Second Church of Povator, an old and compact building that shows off the most cutting-edge carpentry aesthetics of four centuries ago.")
    #:trivia '("The Second Church of Povator in Arathel was built in 442bB.")))


(define (<>arathel t)
  (<>Arathellan
    (<>area
      t #:name "Arathel"
      #:description "This is Arathel, the human-populated county seat of Arathel County. The town exists straddling the Kaiper River, with the old town on the eastern side and newer development on the west.")
  #:trivia '("The town of Arathel, in the northern Green Delta, was first settled by humans in 478bB."
     "One of the first businesses in Arathel was the Reinhard Lumber Mill, built in 477bB, founded by Osmits Reinhard."
     "Arathel's first industry was exporting lumber to the fisherfolk of Ack."
     "The First Church of Povator, in the town of Arathel in the Green Delta, was built in 474bB, to honor a god of woodlands."
     "The Reinhard Estate, in the town of Arathel in the Green Delta, was built in 470bB, by Osmits Reinhard, founder of the Reinhard Lumber Mill."
     "In 462bB, Osmits Reinhard, an aristocrat from the town of Arathel, commissioned the planting of the Borderwood, a pine forest that once stretched from Arathel to Ack."
     "In 460bB, Osmits Reinhard, an aristocrat from the town of Arathel, was hanged in the town square for failing to pay his workers."
     "In 460bB, workers hanged Osmits Reinhard, the owner of Reinhard Lumber Mill, and seized control of the facilities."
     "The First Church of Povator, in the town of Arathel, was expanded in 460bB using the seized assets of the executed aristocrat Osmits Reinhard."
     "In 454bB, residents of the town of Arathel built the Temple of Siggrit, a god of earthworms."
     "In 438bB, Henri Astar from the town of Arathel hired a militia and attacked the humans living south of the Green Delta, in what was then the Indenon Empire."
     "The Astar Empire was founded in the town of Arathel by Henri Astar, a local aristocrat.")))

(define (<>old-arathel t)
  (<>Arathellan
    (<>area
      t #:name "Old Arathel"
      #:description "This is Old Arathel: the eastern part of modern Arathel. Most of the buildings here were built before the Break, modest works of immaculate carpentry."
      #:contents (list <>old-arathel-town-square
                       <>first-church-of-povator
                       <>second-church-of-povator
                       <>siggrit-temple))
    #:trivia '("The layout of Old Arathel was partially inspired by a city built by emsenn in another computer game.")))

(define (<>kaiper-river t)
  (<>Arathellan
    (<>area
      t #:name "Kaiper River"
      #:description "This is the Kaiper River, which runs from the north to south through Arathel County.")
    #:trivia '("The Kaiper River has an unusual path, flowing north to south instead of more directly toward the Optic Ocean. This is due to the area's shifting geology, pushing the water inland and helping wash the County with silt.")))

(define (<>arathel-county t)
  (<>Arathellan
   (<>region
    t #:name "Arathel County"
    #:description "This is Arathel County, the northwestern part of the Green Delta. Frequent tectonic activity has led to a region rich with small waterways: there are enough creeks to name one after every grandmother."
    #:areas `((arathel ,<>arathel)
              (old-arathel ,<>old-arathel)
              (kaiper-river ,<>kaiper-river))
    #:links '((arathel "west" "east" old-arathel)))
   #:trivia
   '("Arathel County is exceptionally windy because of the Turnwise Winds, which blow across the Optic Ocean, west to east: from the New World to the Old World."
     "Prior to 2016rw, Arathel County was known as Araleth County, but emsenn started spelling it wrong consistently and eventually the new name stuck."
     "The main exports of Arathel County are cokeberries, limestone, and wool."
     "Prior to the Break, many residents of Arathel County worshipped either Povator, a god of woodlands, or Siggrit, of earthworms."
     "From around 470bB to the Break, Arathel County was ruled by the Astar Empire."
     "Prior to 72aB, Arathel County was the capital of the Astar Empire.")))
