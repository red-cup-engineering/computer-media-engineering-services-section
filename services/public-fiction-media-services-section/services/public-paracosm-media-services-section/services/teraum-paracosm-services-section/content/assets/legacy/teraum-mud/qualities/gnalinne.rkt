#lang racket

(require qtops/qualities/trivia
         "teraumi.rkt")

(provide <>Gnalinne)

(define (<>Gnalinne t #:trivia [trivia #f])
  (<>Teraumi t #:trivia trivia))
