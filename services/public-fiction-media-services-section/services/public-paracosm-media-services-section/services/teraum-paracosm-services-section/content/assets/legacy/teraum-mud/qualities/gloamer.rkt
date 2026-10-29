#lang racket

(require qtops/qualities/trivia
         "teraumi.rkt")

(provide <>Gloamer)

(define (<>Gloamer t #:trivia [trivia #f])
  (<>Teraumi t #:trivia trivia))
