#lang racket

(require racket/serialize
         uuid)

(serializable-struct area
                     ([id #:mutable]
                      [name #:mutable]
                      [description #:mutable]
                      [contents #:mutable]
                      [exits #:mutable]))

(define (make-area #:name [name "area"]
                   #:description [description "This is someplace."]
                   #:contents [contents #f]
                   #:exits [exits #f])
  (area (void) name description '() (make-hash)))
