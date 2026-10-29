#lang racket

(require qtops/qualities/area
         qtops/qualities/region
         "../../../../../qualities/brusher.rkt")

(provide <>arathel-street)

(define (<>arathel-street-1 t)
  (<>area
   t #:name "Arathel Street"
   #:description "This block of Arathel Street is a fascinating representation of the growth of the city. To the southeast, between Boundary Street and the Kingsroad, the view is blocked by the large stone walls of some massive estate, built centuries ago. The shade from massive oaks inside the wall shade the road here. North of Boundary Street are slightly more recent buildings, built during that booming century before the Break. They're much smaller, closer together, but fantasically ornate. The two neighborhoods stand in stark contrast to the west side of the street, where the houses are all identical: each a small brick rectangle covered with a copper roof, surrounded by a small plot of grass. Arathel Street ends at Kingsroad to the south, but continues on north after its intersection with the Walk."))

(define (<>arathel-street-2 t)
  (<>area
   t #:name "Arathel Street"
   #:description "This block of Arathel Street, north of the Green River, leads north into its namesake county and back south across the River into Bellybrush."))


(define (<>arathel-street t)
  (<>Brusher
   (<>region
    t #:name "Arathel Street"
    #:description "This is Arathel Street. Old Bellybrush is to the east side of the street, while the newer areas, built since the Break, are on the west."
    #:areas `((arathel-street-1 ,<>arathel-street-1)
              (arathel-street-2 ,<>arathel-street-2)))))
