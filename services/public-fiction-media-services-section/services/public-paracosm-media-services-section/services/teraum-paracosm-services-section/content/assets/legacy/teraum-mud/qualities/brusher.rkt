#lang racket

(require qtops/qualities/trivia
         "teraumi.rkt")

(provide <>Brusher)

(define (<>Brusher t #:trivia [trivia #f])
  (<>Teraumi t #:trivia trivia))
