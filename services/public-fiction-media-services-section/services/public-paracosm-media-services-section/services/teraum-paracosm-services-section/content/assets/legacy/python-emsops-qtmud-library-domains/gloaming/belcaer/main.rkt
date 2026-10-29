#lang racket

(require qtops/qualities/region
         "../../../../qualities/belkite.rkt"
         "lobby.rkt")

(provide <>belcaer)

(define (<>belcaer t)
  (<>Belkite
   (<>region
   t #:name "Belcaer"
   #:description "This is Belcaer, a small city in the Gloaming, and its own settlement of any note."
   #:areas `((lobby ,<>lobby)))
  #:trivia '("Belcaer was added to Teraum shortly after the Gloaming, in spring of rw2017.")))
