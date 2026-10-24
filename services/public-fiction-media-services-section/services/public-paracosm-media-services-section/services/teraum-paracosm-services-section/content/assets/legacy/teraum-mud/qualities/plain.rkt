#lang racket

(require qtops/qualities/trivia
         "teraumi.rkt")

(provide <>Plain)

(define (<>Plain t #:trivia [trivia #f])
  (<>Teraumi t #:trivia trivia))
