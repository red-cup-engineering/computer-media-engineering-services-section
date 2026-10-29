#lang racket

(require qtops/qualities/area
         qtops/qualities/region
         "../../../../../qualities/brusher.rkt")

(provide <>vickers-street)

(define (<>vickers-street-1 t)
  (<>area t #:name "Vickers Street"
          #:description "This is Vickers Street, north of where it intersects with Boundary Street and south of where it intersects with the Walk. Westmeet is to the west of here."))
(define (<>vickers-street-2 t)
  (<>area t #:name "Vickers Street"
          #:description "This is the south end of Vickers Sreet, between Boundary Street to the north and Slade Street to the south."))




(define (<>vickers-street t)
  (<>Brusher
   (<>region
    t #:name "Vickers Street"
    #:areas `((vickers-street-1 ,<>vickers-street-1)
              (vickers-street-2 ,<>vickers-street-2))
    #:links '((vickers-street-1 south north vickers-street-2)))))
