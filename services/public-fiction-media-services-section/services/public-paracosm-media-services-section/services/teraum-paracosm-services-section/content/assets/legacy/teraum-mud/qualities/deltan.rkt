#lang racket

(require qtops/qualities/trivia
         "teraumi.rkt")

(provide <>Deltan)

(define (<>Deltan t #:trivia [trivia #f])
  (<>Teraumi t #:trivia trivia))
