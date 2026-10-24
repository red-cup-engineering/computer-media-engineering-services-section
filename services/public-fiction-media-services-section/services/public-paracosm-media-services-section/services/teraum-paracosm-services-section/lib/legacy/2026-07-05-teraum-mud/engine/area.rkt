#lang racket

(require racket/serialize
         uuid)

(require "thing.rkt")

(provide (all-from-out "thing.rkt")
         (struct-out area)
         make-area
         area-exit
         set-area-exit!
         add-thing-to-area!)

(serializable-struct area
                     thing
                     ([description #:mutable]
                      [contents #:mutable]
                      [exits #:mutable]))

(define (make-area #:name [name "area"]
                   #:description [description "This is someplace."]
                   #:contents [contents #f]
                   #:exits [exits #f])
  (define new-area
    (area 0 name description '() (make-hash)))
  new-area)

(define (area-exit this-area exit-key)
  (hash-ref (area-exits this-area) exit-key))

(define (set-area-exit! this-area exit-key exit-value)
  (hash-set! (area-exits this-area) exit-key exit-value))

(define (add-thing-to-area! new-thing this-area)
  (set-area-contents! this-area
                      (append (area-contents this-area)
                              (list new-thing))))
