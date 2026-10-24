#lang racket

(provide make-inventory-mudsocket-commands)

(define ((make-inventory-mudsocket-command t) a)
  (t 'message! (format "Inventory: ~a" (map (λ (w) (w 'name))
                                            (t 'contents)))))

(define (make-inventory-mudsocket-commands t)
  (list
   (cons "inventory" (make-inventory-mudsocket-command t))))
