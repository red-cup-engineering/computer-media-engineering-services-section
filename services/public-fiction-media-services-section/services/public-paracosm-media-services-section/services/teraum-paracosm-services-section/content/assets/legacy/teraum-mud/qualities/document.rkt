#lang racket

(provide <>document
         >>make-document-procedures)

(define ((>content t)) "")
(define ((>set-content! t) s)
  (t 'set-procedure! 'content (λ () s)))

(define (>>make-document-procedures t)
  (list
   (cons 'content (>content t))
   (cons 'set-content! (>set-content! t))))

(define (<>document t
                    #:name [name #f]
                    #:content [content #f])
  (when name (t 'set-name! name))
  (unless (t 'has-procedure? 'content)
    (t 'set-procedures! (>>make-document-procedures t)))
  (when content (t 'set-content! content))
  t)
