#lang racket

(require qtops
         qtops/qualities/mudsocket-server
         qtops/qualities/region
         qtops/qualities/time
         "qualities/teraum-universe.rkt"
         "qualities/teraumi.rkt"
         "regions/central-plains/main.rkt"
         "regions/cut/main.rkt"
         "regions/farsteppes/main.rkt"
         "regions/gloaming/main.rkt"
         "regions/green-delta/main.rkt"
         "regions/halfling-country/main.rkt")

(provide <>teraum)

(define emsmud-log (make-logger 'emsMUD))
(define emsmud-log-receiver (make-log-receiver emsmud-log 'warning))
(current-logger emsmud-log)
(thread
 (λ ()
   (let l ()
     (define v (sync emsmud-log-receiver))
     (display (format "~a\n" (vector-ref v 1)))
     (l))))

(define (<>teraum t)
  (<>teraumi
   (<>region
    (<>mudsocket-server
     (<>temporal
      (<>teraum-universe
       t)))
    #:name "Teraum"
    #:description "This is the universe of Teraum, a tragically funny fantasy world."
    #:areas `((central-plains ,<>central-plains)
              (cut ,<>cut)
              (farsteppes ,<>farsteppes)
              (gloaming ,<>gloaming)
              (green-delta ,<>green-delta)
              (halfling-country ,<>halfling-country))
    #:links '(((central-plains west-kingsroad-1)
               "north" "south"
               (cut southern-canyons))
              ((central-plains east-kingsroad)
               "east" "west"
               (farsteppes kingsroad))
              ((gloaming north-longroad)
               "north" "south"
               (central-plains west-kingsroad-2))))
   #:trivia
   '("Teraum was created around 2001 by emsenn, though at the time it was called Canland, because the world existed inside of a soup can."
     #;"There's no evidence that the world of Teraum does not exist inside a soup can."
     #;"Teraum is a portmanteau of \"Terra, with thaums,\" or, \"Earth, with magic.\""
     #;"Teraum's calendar year is 365.25 days long, just like Earth's."
     #;"Teraum has 12 months of 30 days, with several holidays located between months throughout the year."
     #;"The first sentient species on Teraum were the goblins, who escaped from the Undermuck in the Worldkeep."
     #;"Teraum was created as a garden for the gods, adjacent to the Worldkeep, where their various magic works and creatures were housed."))
  (t 'set-procedure! 'spawn-room (λ () (((((t 'area 'green-delta) 'area 'game) 'area 'bellybrush) 'area 'gibbet-street) 'area 'gibbet-street)))
  (t 'schedule-event! (t 'mudsocket-tick!))
  ((λ ()
     (map
      (λ (w)
        ((w 'with-procedure~~ 'animate~~))
        (when (w 'has-procedure? 'trivia)
            (t 'add-trivia! (w 'trivia))))
      (t 'things))
    (void)))
  t)

(define Teraum (<>teraum (create-thing)))
(Teraum 'resume-time)
