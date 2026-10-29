#lang racket

(require qtops/qualities/trivia
         "teraumi.rkt")

(provide <>Sherwyn)

(define (<>Sherwyn t #:trivia [trivia #f])
  (<>Teraumi t #:trivia trivia))
