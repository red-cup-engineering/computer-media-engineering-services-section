#lang racket

(require qtops/qualities/area
         qtops/qualities/region
         "../../../../../../qualities/brusher.rkt"
         (prefix-in actual: "gibbet-street.rkt")
         "southbank-house.rkt"
         "madrins-shack.rkt"
         "masked-mortuary.rkt"
         "par-weaponry.rkt")

(provide <>gibbet-street)

(define (<>gibbet-street t)
  (<>Brusher
   (<>region
    t #:name "Gibbet Street"
    #:areas `((southbank-house ,<>southbank-house)
              (par-weaponry ,<>par-weaponry)
              (madrins-shack ,<>madrins-shack)
              (masked-mortuary ,<>masked-mortuary)
              (gibbet-street ,actual:<>gibbet-street))
    #:links '((gibbet-street northeast out par-weaponry)
              (gibbet-street east west madrins-shack)
              (gibbet-street southwest northeast masked-mortuary)))
   #:trivia '("Gibbet Street, in Bellybrush, loosely based on an adventure published in an early issue of Dragon magazine. Or was it in Dungeon…"))
  (((t 'area 'southbank-house) 'area 'yard)
   'set-exit! 'southeast
   (t 'area 'gibbet-street))
  ((t 'area 'gibbet-street)
   'set-exit! 'northwest
   ((t 'area 'southbank-house) 'area 'yard))
  t)
