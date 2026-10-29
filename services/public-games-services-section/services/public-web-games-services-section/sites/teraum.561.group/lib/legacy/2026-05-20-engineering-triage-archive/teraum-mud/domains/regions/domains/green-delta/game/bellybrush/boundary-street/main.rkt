#lang racket

(require qtops/qualities/area
         qtops/qualities/region
         "../../../../../qualities/brusher.rkt")

(provide <>boundary-street)

(define (<>leaping-eel t)
  (<>area
   t #:name "Leaping Eel"
   #:description "The Leaping Eel was once the tavern travelers thought of when they remembered Bellybrush. Located where the Kingsroad intersects Arathel Street, almost every person moving through the Green Delta would walk by the Leaping Eel. Now that Bellybrush has been incorporated into the GAME, the Eel has leaned into its \"townie\" roots, proudly demonstrating its status as the owner of The Brushers, the local stick-ball team. Flags, the dusty orange and cream white colors of the team, cover nearly every wall in their horizontal stripes, with pieces of sports equipment nailed between them. Booths line the bottom of each wall, patrons and waitstaff milling about."))
(define (<>hamaking-warehouse t)
  (<>area
   t #:name "Hamaking Warehouse"
   #:description "This is Hamaking Warehouse, a large brick structure full of shelves, crates, boxes, and other means of storing stuff."))
(define (<>central-park-1 t)
  (<>area
   t #:name "Central Park"
   #:description "This is the west side of Bellybrush's Central Park. The area is mostly just a grass field, with a very large old stump near the center."))
(define (<>central-park-2 t)
  (<>area
   t #:name "Central Park"
   #:description "This is the east side of Bellybrush's Central Park."))
(define (<>westmeet t)
  (<>area
   t #:name "Westmeet"
   #:description "This is Westmeet, a small market in the heart of Bellybrush."))
(define (<>island t)
  (<>area
   t #:name "island"
   #:description "This is a small island off the south bank of the Green River as it runs through the town of Bellybrush. Patches of cattails grow between the bank and the island, which itself is covered in a creeping phlox."))

(define (<>boundary-street-1 t)
  (<>area
   t #:name "Boundary St"
   #:description "This is the west end of Boundary Street, where it ends into Arathel Street. North of here is the Leaping Eel, a large tavern. Hamaking Warehouse is to the south."))
(define (<>boundary-street-2 t)
  (<>area
   t #:name "Boundary St"
   #:description "This is Boundary Street, north of the west end of Central Park."))
(define (<>boundary-street-3 t)
  (<>area
   t #:name "Boundary St"
   #:description "This is Boundary Street, north of the east end of Central Park."))
(define (<>boundary-street-4 t)
  (<>area
   t #:name "Boundary St & Vickers St"
   #:description "This is Boundary Street where it intersects with Vickers Street."))
(define (<>boundary-street-5 t)
  (<>area
   t #:name "Boundary St, Gibbet St & Hawk St"
   #:description "This is Boundary Street, where it intersects with Gibbet Street to the North and Hawk Street to the South."))
(define (<>boundary-street-6 t)
  (<>area
   t #:name "Boundary St"
   #:description "This is the eastern end of Boundary Street, where it runs parallel with the south bank of the Green River. There is a wooden bridge leading to a small island in the river, northeast of here. Kingsroad is to the south."))

(define (<>boundary-street t)
  (<>Brusher
   (<>region
    t #:name "Boundary Street"
    #:areas `((leaping-eel ,<>leaping-eel)
              (hamaking-warehouse ,<>hamaking-warehouse)
              (westmeet ,<>westmeet)
              (central-park-1 ,<>central-park-1)
              (central-park-2 ,<>central-park-2)
              (island ,<>island)
              (boundary-street-1 ,<>boundary-street-1)
              (boundary-street-2 ,<>boundary-street-2)
              (boundary-street-3 ,<>boundary-street-3)
              (boundary-street-4 ,<>boundary-street-4)
              (boundary-street-5 ,<>boundary-street-5)
              (boundary-street-6 ,<>boundary-street-6))
    #:links '((boundary-street-1 north south leaping-eel)
              (boundary-street-1 southeast northwest central-park-1)
              (boundary-street-1 south north hamaking-warehouse)
              (boundary-street-2 northeast southwest westmeet)
              (boundary-street-2 southeast northwest central-park-2)
              (boundary-street-2 south north central-park-1)
              (boundary-street-3 north south westmeet)
              (boundary-street-3 south north central-park-2)
              (boundary-street-3 southwest northeast central-park-1)
              (boundary-street-6 northeast southwest island)
              (boundary-street-1 east west boundary-street-2)
              (boundary-street-2 east west boundary-street-3)
              (boundary-street-3 east west boundary-street-4)
              (boundary-street-4 east west boundary-street-5)
              (boundary-street-5 southeast northwest
                                 boundary-street-6)))
   #:trivia '("Before the Walk was built, Boundary Street was Bellybrush's original riverfront."
              "Boundary Street was added to the Teraum MUD in the first week of rwOctober, 2020.")))
