#lang racket

(require qtops/qualities/area
         qtops/qualities/region
         "../../../../../../qualities/gamer.rkt")

(provide <>honeyfern-labs)

(define (<>dining-hall t) (<>area t #:name "dining hall"))
(define (<>first-floor-hallway t)
  (<>area
    t #:name "hallway"
    #:description "This is the first-floor hallway of Honeyfern Laboratories. One end leads to the foyer, while a door on either side leads to the dining hall or library. There are shelves built into both sides of the wall. Most of the shelves contain old books. A few squashboard boxes are on the floor. Some are half-full of books. Others are closed, sealed with tape, and covered in soot."))
(define (<>foyer t) (<>area t #:name "foyer"))
(define (<>front-path t)
  (<>area
    t #:name "path"
    #:description "This is the path to Honeyfern Laboratories. Grass grows nearly seven feet tall to either side of the narrow gravel path. It leads to an outside gate, and toward the building's porch."))
(define (<>kitchen t)
  (<>area
    t #:name "kitchen"
        #:description "This is the kitchen of Honeyfern Laboratories. A door leads to the pantry, and another to the dining hall. The door to the backyard has been painted shut."))


(define (<>front-porch t)
  (<>area
    t #:name "porch"
        #:description "This is the front porch of Honeyfern Laboratories. Down the steps is a path to the gate to to leave, and the a door leads inside."))

(define (<>library t) (<>area t #:name "library"))

(define (<>outside-gate t) (<>area t #:name "gate"))
(define (<>pantry t) (<>area t #:name "pantry"))
(define (<>sitting-room t) (<>area t #:name "sitting room"))

(define (<>honeyfern-labs t)
  (<>Gamer
   (<>region
    t #:name "Honeyfern Labs"
    #:areas `((dining-hall ,<>dining-hall)
              (first-floor-hallway ,<>first-floor-hallway)
              (foyer ,<>foyer)
              (front-path ,<>front-path)
              (front-porch ,<>front-porch)
              (kitchen ,<>kitchen)
              (library ,<>library)
              (outside-gate ,<>outside-gate)
              (pantry ,<>pantry)
              (sitting-room ,<>sitting-room))
    #:links '((dining-hall hallway dining first-floor-hallway)
              (dining-hall kitchen dining kitchen)
              (first-floor-hallway foyer hallway foyer)
              (first-floor-hallway library hallway library)
              (foyer door foyer sitting-room)
              (foyer outside inside front-porch)
              (front-path gate path outside-gate)
              (front-path porch path front-porch)
              (kitchen pantry kitchen pantry)))
   #:trivia
   '("Prior to the Break, Honeyfern Labs was the home and library of Lorrestar, a famous magic-using human."
     "For 80 years after the Break, the building Honeyfern Labs occupies was abandoned; rumored to be haunted by its former owner, Lorrestar the magic user."
     "In the spring of 80pc, after the Ackian fire burnt down his lab in the Squash Ward, Aldous Honeyfern relocated to an estate in South Arathel, in the Greater Ack Metropolitan Enclave."
     "The library of Honeyfern Labs is an homage to (real world author) Terry Pratchett's concept of \"l-space.\"")))
