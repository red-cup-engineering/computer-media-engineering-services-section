#lang racket

(require qtops/qualities/trivia
         "teraumi.rkt")

(provide <>Ackian)

(define (<>Ackian t #:trivia [trivia #f])
  (<>Teraumi t #:trivia trivia))
