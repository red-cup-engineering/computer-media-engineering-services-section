#lang racket

(provide make-talker-mudsocket-commands)

(define ((make-cq-mudsocket-command t) a)
  (cond
    [(hash-empty? a)
     (t 'message! "Syntax: cq <message>")]
    [(hash-has-key? a 'line)
     (define l (hash-ref a 'line))
     (if (t 'has-procedure? 'universe)
         (map
          (λ (w)
            (when (w 'has-procedure? 'message!)
              (w 'message!
                 (format "(cq) ~a: ~a"
                         (t 'name) l))))
          ((t 'universe) 'things))
         (t 'message! "Can't use the talker if you're outside spacetime."))]))


(define (make-talker-mudsocket-commands t)
  (list
   (cons "cq" (make-cq-mudsocket-command t))))
