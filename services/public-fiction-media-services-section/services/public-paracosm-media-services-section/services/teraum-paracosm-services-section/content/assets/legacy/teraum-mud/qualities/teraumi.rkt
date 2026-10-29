#lang racket

(require qtops/qualities/trivia)

(provide <>Teraumi
         <>teraumi)

(define (<>Teraumi t #:trivia [trivia #f])
  (unless (t 'has-procedure? 'trivia)
    (t 'set-procedures! (>>make-trivia-procedures t)))
  (when trivia (t 'add-trivia! trivia))
  t)

(define <>teraumi <>Teraumi)
