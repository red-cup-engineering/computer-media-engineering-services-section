#lang racket

(require racket/serialize)

(provide (struct-out thing)
         make-thing
         find-thing)

(serializable-struct thing
                     ([id #:mutable]
                      [name #:mutable]))

(define (make-thing #:name [name "thing"])
  (thing 0 name))

(define (find-thing given-list given-id)
   (findf
    (λ (q)
      (string=? (thing-id q) given-id))
    given-list))
