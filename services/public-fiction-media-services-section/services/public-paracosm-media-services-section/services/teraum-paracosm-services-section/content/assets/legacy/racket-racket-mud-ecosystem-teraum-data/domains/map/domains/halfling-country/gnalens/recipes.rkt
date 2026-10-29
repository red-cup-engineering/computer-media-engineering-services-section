#lang racket

(require "../recipes.rkt")

(provide (prefix-out gnalens/ store)
         (all-from-out "../recipes.rkt"))

(define (store
         #:name [name #f]
         #:nouns [nouns #f]
         #:adjectives [adjectives #f]
         #:description [description #f]
         #:append-description [append-description #f]
         #:contents [contents #f]
         #:trivia [trivia #f]
         #:actions [actions #f]
         #:exits [exits #f])
  (let ([std-name "store"]
        [std-description "This is a store in the city of Gnalens."])
    (basic/area/room/store
     #:name (basic/std-or-qual std-name name)
     #:description (basic/setup-stringy-quality-value std-description description append-description)
     #:contents contents
     #:trivia trivia
     #:actions actions
     #:exits exits)))