#lang racket

(require qtops/qualities/area
         qtops/qualities/lookable
         qtops/qualities/object
         qtops/qualities/npc
         qtops/qualities/region
         "../../../../../qualities/brusher.rkt"
         "arathel-street/main.rkt"
         "beggars-alley/main.rkt"
         "boundary-street/main.rkt"
         "gibbet-street/main.rkt"
         "hargrove-street/main.rkt"
         "hawk-street/main.rkt"
         "kingsroad/main.rkt"
         "siddon-street/main.rkt"
         "slade-street/main.rkt"
         "quibble-street/main.rkt"
         "vickers-street/main.rkt"
         "the-walk/main.rkt")

(provide <>bellybrush)

(define (<>wadren-smith t)
  ;; not friendly with Holman Holder
  ;; used to live in Southbank House prior to winter 80pc, got evicted by Red Union
  ;; they stole his pigs
  (<>npc
   t #:name "Wadren Smith"))
(define (<>holman-holder t)
  ;; used to steal wadren smith's pigs, when wadren lived in the Southbank House
  (<>npc
   t #:name "Holman Holder"))

(define (<>leather-boots t)
  (<>lookable
   (<>object t)
   #:name "pair of hard leather boots"
   #:description "This is a pair of hard leather boots. They look rigid, though whether its intentional or from age and lack of care is unclear."))

(define (<>linen-shirt t)
  (<>lookable
   (<>object t)
   #:name "linen shirt"
   #:description "This is a light linen shirt."))

(define (<>cotton-trousers t
                           #:style [style 'plain]
                           #:color [color "brown"])
  (<>lookable
   (<>object t)
   #:name
   (cond [(eq? style 'plain)
          (format "~a trousers" color)]
         [(eq? style 'tattered)
          (format "tattered ~a trousers")])
   #:nouns '("trousers")
   #:adjectives
   (cond [(eq? style 'plain)
          `("plain" "simple" ,color)]
         [(eq? style 'tattered)
          `("tattered" "torn" ,color)])
   #:description
   (cond [(eq? style 'plain)
          (format "This is a simple pair of ~a cotton trousers."
                  color)]
         [(eq? style 'tattered)
          (format "This is a tattered pair of ~a cotton trousers. The seams have started to pull apart, and there are a few small tears in the fabric." color)])))

(define (<>bellybrush t)
  (<>Brusher
   (<>region
    t #:name "Bellybrush"
    #:areas `((arathel-street ,<>arathel-street)
              (beggars-alley ,<>beggars-alley)
              (boundary-street ,<>boundary-street)
              (gibbet-street ,<>gibbet-street)
              (hargrove-street ,<>hargrove-street)
              (hawk-street ,<>hawk-street)
              (kingsroad ,<>kingsroad)
              (siddon-street ,<>siddon-street)
              (slade-street ,<>slade-street)
              (quibble-street ,<>quibble-street)
              (vickers-street ,<>vickers-street)
              (the-walk ,<>the-walk))
    #:links '(((arathel-street arathel-street-2)
               east west
               (hargrove-street hargrove-street-1))
              ((arathel-street arathel-street-2)
               southeast northwest
               (the-walk the-walk-2))
              ((arathel-street arathel-street-1)
               north south
               (the-walk the-walk-2))
              ((arathel-street arathel-street-1)
               east west
               (boundary-street boundary-street-1))
              ((arathel-street arathel-street-1)
               south north
               (kingsroad kingsroad-3))
              ((arathel-street arathel-street-1)
               west east
               (kingsroad market))
              (beggars-alley east west
                             (gibbet-street gibbet-street))
              (beggars-alley northwest southeast
                             (the-walk the-walk-3))
              ((boundary-street boundary-street-4)
               north south
               (vickers-street vickers-street-1))
              ((boundary-street boundary-street-4)
               south north
               (vickers-street vickers-street-2))
              ((boundary-street boundary-street-5)
               north south
               (gibbet-street gibbet-street))
              ((boundary-street boundary-street-5)
               northeast southwest
               (the-walk the-walk-4))
              ((boundary-street boundary-street-5)
               south north
               (hawk-street hawk-street-1))
              ((boundary-street boundary-street-6)
               south north
               (kingsroad kingsroad-7))
              ((gibbet-street gibbet-street)
               north south
               (the-walk the-walk-4))
              ((hargrove-street hargrove-street-2)
               south north
               (kingsroad kingsroad-8))
              ((hawk-street hawk-street-2)
               west east
               (slade-street slade-street-4))
              ((hawk-street hawk-street-4)
               southeast northwest
               quibble-street)
              ((kingsroad kingsroad-1)
               north south
               siddon-street)
              ((kingsroad kingsroad-4)
               east west
               (slade-street slade-street-1))
              ((kingsroad kingsroad-6)
               north south
               quibble-street)
              (siddon-street
               east west
               (kingsroad market))
              ((slade-street slade-street-1)
               north south
               (vickers-street vickers-street-2))
              ((vickers-street vickers-street-1)
               north south
               (the-walk the-walk-3))
              ((vickers-street vickers-street-1)
               west east
               (boundary-street westmeet))))
   #:trivia '("The town of Bellybrush was settled in 701bB"
              "The town of Bellybrush was added to the Teraum MUD in rwOctober, 2020.")))
