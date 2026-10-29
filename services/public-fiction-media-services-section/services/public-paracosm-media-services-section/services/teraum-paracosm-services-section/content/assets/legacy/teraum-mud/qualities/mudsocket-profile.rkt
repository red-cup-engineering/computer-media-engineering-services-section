#lang racket

(provide make-profile-mudsocket-commands)

(define ((make-set-name!-mudsocket-command t) a)
  (cond
    [(hash-empty? a)
     (t 'message! "Syntax: set-name! <name>")]
    [(hash-has-key? a 'line)
     (t 'set-name! (hash-ref a 'line))
     (t 'message! (format "Your new name is ~a" (t 'name)))]))


(define (make-profile-mudsocket-commands t)
  (list
   (cons "set-name!" (make-set-name!-mudsocket-command t))))
