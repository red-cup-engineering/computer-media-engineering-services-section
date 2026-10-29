#lang racket

(require qtops/qualities/trivia
         "teraumi.rkt")

(provide <>Cutter)

(define (<>Cutter t #:trivia [trivia #f])
  (<>Teraumi t #:trivia trivia))
