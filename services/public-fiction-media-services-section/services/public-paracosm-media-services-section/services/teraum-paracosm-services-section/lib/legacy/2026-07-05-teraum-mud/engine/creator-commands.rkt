#lang racket

(require "area.rkt"
         "mudserver-struct.rkt"
         "operator.rkt"
         "persistence.rkt"
         "world.rkt")

(provide make-new-area!-command
         make-set-area-description!-command
         make-set-area-name!-command)

(define ((make-set-area-name!-command op) args)
  (unless (hash-has-key? args 'line)
    (message-operator! op "Syntax: set-area-name! <new-name>"))
  (set-thing-name! (character-location op)
                  (hash-ref args 'line))
  (save-thing (world-path
               (mudserver-world
                (operator-mudserver op)))
              (character-location op)))

(define ((make-set-area-description!-command op) args)
  (unless (hash-has-key? args 'line)
    (message-operator!
     op "Syntax: set-area-description! <new-description>"))
  (set-area-description! (character-location op)
                         (hash-ref args 'line))
  (save-thing
   (world-path (mudserver-world (operator-mudserver op)))
   (character-location op)))

(define ((make-new-area!-command op) args)
  (unless (hash-has-key? args "exit")
    (message-operator! op "Syntax: new-area! --exit=<dir> [name]"))
  (define new-area
    (make-area #:name (if (hash-has-key? args 'line)
                          (hash-ref args 'line)
                          "new area")))
  (define save-path
    (world-path (mudserver-world (operator-mudserver op))))
  (make-thing-persistent save-path new-area)
  (set-area-exit! (character-location op)
                  (hash-ref args "exit")
                  (thing-id new-area))
  (set-area-exit! new-area
                  "back"
                  (thing-id (character-location op)))
  (save-thing save-path (character-location op))
  (save-thing save-path new-area)
  (message-operator!
   op "Successfully made and linked new area."))
