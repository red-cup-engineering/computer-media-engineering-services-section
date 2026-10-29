#lang racket

(require qtops/qualities/region
         "../../qualities/plain.rkt"
         "fort-kelly.rkt"
         "kingsroad.rkt")


(provide <>central-plains)

(define (<>central-plains t)
  (<>Plain
   (<>region
    t #:name "Central Plains"
    #:areas `((fort-kelly ,<>fort-kelly)
              (east-kingsroad ,<>east-kingsroad)
              (west-kingsroad-1 ,<>west-kingsroad-1)
              (west-kingsroad-2 ,<>west-kingsroad-2))
    #:links '((fort-kelly "east" "west" east-kingsroad)
              (fort-kelly "west" "east" west-kingsroad-1)
              (west-kingsroad-1 "west" "east" west-kingsroad-2)))
   #:trivia '("Dwarves began to settle the Central Plains around 1200bB.")))
