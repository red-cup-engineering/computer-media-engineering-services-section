#lang racket

(provide make-beg-mudsocket-command)

(define ((make-beg-mudsocket-command t) a)
  (if (hash-empty? a )
      (when (and (t 'has-procedure? 'container)
                 (procedure? (t 'container))
                 ((t 'container) 'has-procedure? 'beg-reaction))
        (((t 'container) 'beg-reaction) t))
      (t 'message!
         "Begging here wouldn't accomplish anything.")))
