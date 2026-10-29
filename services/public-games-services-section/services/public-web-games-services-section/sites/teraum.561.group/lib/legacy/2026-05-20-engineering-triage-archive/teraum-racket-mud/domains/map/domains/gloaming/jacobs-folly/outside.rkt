#lang racket

(require "./recipes.rkt")

(provide outside)

(define outside
  (field
   #:name "outside Jacob's Folly"
   #:description "This is the field outside Jacob's Folly. It is a tower: three storeys and made of the same limestone as the small crags that jut up into the field, forcing the dirt path to meander, and preventing a clear view of the entire area. The door of the tower has been recently sealed with mortared stone. Wooden stakes driven into the mortar between the tower's stones could, but doesn't, provide access to the open third floor window."
   #:exits '((west . gloaming/road-to-jacobs-folly))))