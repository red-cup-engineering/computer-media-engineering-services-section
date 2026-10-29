#lang racket

(require qtops/qualities/contents
         qtops/qualities/notable
         qtops/qualities/mudsocket-client
         qtops/qualities/mudsocket-contents
         qtops/qualities/mudsocket-sight
         qtops/qualities/mudsocket-speech
         qtops/qualities/mudsocket-trivia
         qtops/qualities/sight
         qtops/qualities/universe
         qtops/utilities/lists
         "mudsocket-harvest.rkt"
         "mudsocket-inventory.rkt"
         "mudsocket-profile.rkt"
         "mudsocket-talker.rkt"
         "teraum-mudsocket-client.rkt"
         "teraumi.rkt")

(provide <>teraum-universe)

(define ((>accept-mudsocket-connection t) c)
  (<>sighted (<>notable (<>teraum-mudsocket-client (<>container c))))
  (map
   (λ (p) (c 'set-mudsocket-commands! (p c)))
   (list make-container-mudsocket-commands
         make-harvest-mudsocket-commands
         make-inventory-mudsocket-commands
         make-profile-mudsocket-commands
         make-sight-mudsocket-commands
         make-speech-mudsocket-commands
         make-talker-mudsocket-commands
         make-trivia-mudsocket-commands))
  (when (and (c 'has-procedure? 'universe)
             ((c 'universe) 'has-procedure? 'spawn-room))
    (c 'move-thing!! ((c 'universe) 'spawn-room))))

(define ((>make-teraum-splash t))
  (random-element (t 'trivia)))

(define (>>make-teraum-universe-procedures t)
  (list
   (cons 'accept-mudsocket-connection
         (>accept-mudsocket-connection t))
   (cons 'make-teraum-splash
         (>make-teraum-splash t))))

(define (<>teraum-universe t #:things [things #f])
  (unless (t 'has-procedure? 'things)
    (<>universe t #:things things))
  (t 'set-procedures! (>>make-teraum-universe-procedures t))
  t)
