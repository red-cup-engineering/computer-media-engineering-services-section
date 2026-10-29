#lang racket

(require )

(provide <>teraum-mudsocket-client
         >>make-teraum-mudsocket-client-procedures)

(define ((>make-mudsocket-connection-message t))
  (define R
    ((λ () (define r "")
        (λ ([m #f]) (if m (set! r (string-append r m)) r)))))
  (R (format "Your connection~a has been accepted."
             (if (t 'has-procedure? 'universe)
                 (format " to ~a"
                         ((t 'universe) 'name))
                 "")))
  (when (and (t 'has-procedure? 'universe)
             ((t 'universe) 'has-procedure? 'make-teraum-splash))
    (R (format "\n  ...~a\n\n"
               ((t 'universe) 'make-teraum-splash))))
  (R "\nThis is a dimension, within yours but with different rules. Type instructions then press ENTER. Try starting with \"help\"")
  (R))

(define (>>make-teraum-mudsocket-client-procedures t)
  (list
   (cons 'make-mudsocket-connection-message
         (>make-mudsocket-connection-message t))))

(define (<>teraum-mudsocket-client t)
  (t 'set-procedures! (>>make-teraum-mudsocket-client-procedures t))
  t)
