#lang racket

(require racket/serialize
         uuid)

(require "thing.rkt")

(provide (all-from-out "thing.rkt")
         (struct-out character))

(serializable-struct character
                     thing
                     ([description #:mutable]
                      [location #:mutable]
                      [inventory #:mutable]))

(define (make-character #:name [name "character"]
                        #:description [description "This is someone."]
                        #:contents [contents '()]
                        #:location [location #f]
                        #:inventory [inventory '()])
  (character (uuid-string)
             name
             description
             location
             inventory))
