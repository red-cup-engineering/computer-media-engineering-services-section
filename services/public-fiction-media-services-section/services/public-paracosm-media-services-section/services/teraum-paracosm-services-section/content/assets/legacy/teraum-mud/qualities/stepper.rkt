#lang racket

(require qtops/qualities/trivia
         "teraumi.rkt")

(provide <>Stepper)

(define (<>Stepper t #:trivia [trivia #f])
  (<>Teraumi t #:trivia trivia))
