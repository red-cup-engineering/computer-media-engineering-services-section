#lang racket

(require racket/serialize
         uuid)

(require "thing.rkt"
         "persistence.rkt")

(provide (all-from-out "thing.rkt")
         (struct-out users)
         make-users
         (struct-out user)
         make-user)

(serializable-struct user
                     thing
                     ([pass #:mutable]))

(struct users ([listing #:mutable]
               [path #:mutable]))

(define (make-users given-path)
  (users (load-things given-path) given-path))

(define (make-user name)
  (user 0 name (substring (uuid-string) 0 8)))
