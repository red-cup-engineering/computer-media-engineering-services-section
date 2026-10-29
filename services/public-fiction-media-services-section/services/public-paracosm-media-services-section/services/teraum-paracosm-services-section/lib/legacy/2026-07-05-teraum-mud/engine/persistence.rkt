#lang racket

(require racket/serialize
         uuid)

(require "thing.rkt")

(provide save-thing
         load-thing
         load-things
         make-thing-persistent)

(define (save-thing given-path given-thing)
  (printf "saving ~a to ~a" (thing-name given-thing)
          given-path)
  (current-directory given-path)
  (with-output-to-file (thing-id given-thing)
    (λ () (write (serialize given-thing)))
    #:exists 'replace))

(define (load-thing given-path given-thing)
  (current-directory given-path)
  (with-input-from-file given-thing
    (λ () (deserialize (read)))))

(define (load-things given-path)
  (current-directory given-path)
  (map
   (λ (file-id) (load-thing given-path file-id))
   (map
    (λ (d) (path->string d))
    (directory-list (current-directory)))))

(define (generate-id given-path)
  (current-directory given-path)
  (define potential-id (uuid-string))
  (if
   (eq? #f (member
            potential-id
            (map
             (λ (d) (path->string d))
             (directory-list (current-directory)))))
   potential-id
   (generate-id given-path)))

(define (make-thing-persistent given-path given-thing)
  (set-thing-id! given-thing (generate-id given-path))
  (save-thing given-path given-thing))
