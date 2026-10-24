#lang racket

(require qtops/qualities/area
         qtops/qualities/npc
         qtops/qualities/noise
         qtops/qualities/region
         "../../../../../../qualities/brusher.rkt")

(provide <>hawk-street)

(define (<>jessica-suri t)
  (<>npc
   t #:name "Jessica Suri"))

(define (<>beynway-boarding-house t)
  (<>Brusher
   (<>area t #:name "Beynway Boarding House")
   #:trivia '("Beynway Boarding House is one of Bellybrush's oldest hotels.")))
(define (<>cheers t)
  (<>area t #:name "Cheers"))
(define (<>asylum t)
  (<>noisy
   (<>area
    t #:name "Asylum"
    #:description "The asylum in Bellybrush was one of the town's most beloved organizations for most of the last century. As human people from around the world migrated toward Ack, the asylum helped them get oriented with a new way of living. But when Bellybrush was absorbed into the Enclave, the asylum was restructured as a detention center. The area in front of the asylum is all that's accessible: a three-storey brick facade, all windows boarded up.")
   #:noises '("A flurry of laughs comes from higher in the building, muffled by the brickwork.")))
(define (<>undertaker t)
  (<>area
   t #:name "Undertaker"
   #:description "This is the lobby of the undertaker in Bellybrush. Painted pale blue, rows of windows around the top of the walls let in enough natural light to highlight how clean an environment it is."
   #:contents (list <>jessica-suri)))
(define (<>thrift-shop t)
  (<>area t #:name "thrift shop"))

(define (<>hawk-street-1 t)
  (<>area
   t #:name "Hawk Street"
   #:description "This is Hawk Street just south of its north end, at Boundary Street. Rows of narrow two-storey houses go down the east side of the road, each looking more run-down than the previous. There's a gully, swampy with stinky water, to the west."))
(define (<>hawk-street-2 t)
  (<>area t #:name "Hawk Street"))
(define (<>hawk-street-3 t)
  (<>area t #:name "Hawk Street"))
(define (<>hawk-street-4 t)
  (<>area t #:name "Hawk Street"))

(define (<>hawk-street t)
  (<>Brusher
   (<>region
    t #:name "Hawk Street"
    #:areas `((cheers ,<>cheers)
              (asylum ,<>asylum)
              (undertaker ,<>undertaker)
              (thrift-shop ,<>thrift-shop)
              (beynway-boarding-house ,<>beynway-boarding-house)
              (hawk-street-1 ,<>hawk-street-1)
              (hawk-street-2 ,<>hawk-street-2)
              (hawk-street-3 ,<>hawk-street-3)
              (hawk-street-4 ,<>hawk-street-4))
    #:links '((hawk-street-2 southwest northeast
                             beynway-boarding-house)
              (hawk-street-3 southeast northwest asylum)
              (hawk-street-3 southwest northeast undertaker)
              (hawk-street-3 west east cheers)
              (hawk-street-4 west east thrift-shop)
              (hawk-street-1 south north hawk-street-2)
              (hawk-street-2 south north hawk-street-3)
              (hawk-street-3 south north hawk-street-4)))))
