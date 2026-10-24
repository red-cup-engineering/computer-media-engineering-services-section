#lang racket

(require qtops/qualities/trivia
         "teraumi.rkt")

(provide <>Arathellan)

(define (<>Arathellan t #:trivia [trivia #f])
  (<>Teraumi t #:trivia trivia))
