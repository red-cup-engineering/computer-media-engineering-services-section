#lang racket

(require qtops/qualities/area
         "../../../qualities/gloamer.rkt")

(provide <>north-longroad
         <>central-longroad
         <>south-longroad)

(define (<>north-longroad t)
  (<>Gloamer
    (<>area
      t #:name "Longroad"
      #:description "This is a stretch of the Longroad, the main road through the Gloaming.")))

(define (<>central-longroad t)
  (<>Gloamer
    (<>area
      t #:name "Longroad"
      #:description "This is a stretch of the Longroad, the main road through the Gloaming.")))

(define (<>south-longroad t)
  (<>Gloamer
    (<>area
      t #:name "Longroad"
      #:description "This is a stretch of the Longroad, the main road through the Gloaming.")))
