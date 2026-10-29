#lang racket

(require qtops/qualities/area
         qtops/qualities/region
         "../../../../../../qualities/brusher.rkt")

(provide <>slade-street)

(define (<>redbrick-flats t)
  (<>area t #:name "Redbrick Flats"))
(define (<>steamworks t)
  (<>area t #:name "Steamworks"))
(define (<>netmaker t)
  (<>area t #:name "netmaker"))
(define (<>kalduras-house t)
  (<>area t #:name "Kaldura's House"))
(define (<>cobblers t)
  (<>area
   t #:name "cobblers"
   #:description "This is a cobblers shop, as well as a cobbler shop. While the owner started mending shoes, confusion from tourists motivated em to begin stocking the pastry as well."))
(define (<>ramen-shop t)
  (<>area t #:name "ramen shop"))
(define (<>butcher t)
  (<>Brusher
   (<>area t #:name "butcher")
   #:trivia '("The butcher on Slade St. in Bellybrush is known for their aged sausages.")))
(define (<>moneychanger t)
  (<>area t #:name "moneychanger"))
(define (<>barber-surgeon t)
  (<>area t #:name "barber-surgeon"))

(define (<>slade-street-1 t)
  (<>area t #:name "Slade Street"))
(define (<>slade-street-2 t)
  (<>area t #:name "Slade Street"))
(define (<>slade-street-3 t)
  (<>area t #:name "Slade Street"))
(define (<>slade-street-4 t)
  (<>area t #:name "Slade Street"))

(define (<>slade-street t)
  (<>Brusher
   (<>region
    t #:name "Slade Street"
    #:areas `((redbrick-flats ,<>redbrick-flats)
              (steamworks ,<>steamworks)
              (netmaker ,<>netmaker)
              (kalduras-house ,<>kalduras-house)
              (cobblers ,<>cobblers)
              (ramen-shop ,<>ramen-shop)
              (butcher ,<>butcher)
              (moneychanger ,<>moneychanger)
              (barber-surgeon ,<>barber-surgeon)
              (slade-street-1 ,<>slade-street-1)
              (slade-street-2 ,<>slade-street-2)
              (slade-street-3 ,<>slade-street-3)
              (slade-street-4 ,<>slade-street-4))
    #:links '((slade-street-2 north south redbrick-flats)
              (slade-street-2 south north steamworks)
              (slade-street-3 north south cobblers)
              (slade-street-3 south north kalduras-house)
              (slade-street-3 southwest northeast netmaker)
              (slade-street-4 southeast northwest barber-surgeon)
              (slade-street-4 south north butcher)
              (slade-street-4 southwest northeast ramen-shop)
              (slade-street-1 east west slade-street-2)
              (slade-street-2 east west slade-street-3)
              (slade-street-3 east west slade-street-4)))))
