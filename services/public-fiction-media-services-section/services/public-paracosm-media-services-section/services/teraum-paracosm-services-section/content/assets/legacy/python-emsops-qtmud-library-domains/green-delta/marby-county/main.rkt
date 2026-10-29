#lang racket

(require qtops/qualities/region
         "eridrin.rkt")

(provide <>marby-county)

(define (<>marby-county t)
  (<>region
   t #:name "Marby County"
   #:areas `((eridrin ,<>eridrin))))
