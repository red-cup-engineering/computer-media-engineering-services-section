#lang racket

(require qtops/qualities/trivia
         "teraumi.rkt")

(provide <>Gamer)

(define (<>Gamer t #:trivia [trivia #f])
  (<>Teraumi t #:trivia trivia))
