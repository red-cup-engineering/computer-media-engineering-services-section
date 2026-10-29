#lang racket

(require qtops/qualities/trivia
         "gloamer.rkt")

(provide <>Belkite)

(define (<>Belkite t #:trivia [trivia #f])
  (<>Gloamer t #:trivia trivia))
