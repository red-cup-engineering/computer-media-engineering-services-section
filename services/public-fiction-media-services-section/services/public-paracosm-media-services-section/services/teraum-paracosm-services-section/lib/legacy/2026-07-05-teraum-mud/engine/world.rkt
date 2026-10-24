#lang racket

(require racket/serialize
         "area.rkt"
         "persistence.rkt")

(provide (struct-out world)
         make-world
         world-ref)

(serializable-struct world
                     ([areas #:mutable]
                      [path #:mutable]))

(define (make-world given-path)
  (world (load-things given-path) given-path))

(define (world-ref this-world id)
  (hash-ref (world-areas this-world) id))
