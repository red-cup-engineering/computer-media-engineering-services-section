#lang racket

(require "area.rkt"
         "mudserver-struct.rkt"
         "operator.rkt"
         "world.rkt")

(provide make-commands-command
         make-look-command
         make-move-command
         make-set-name!-command
         make-whoami-command)

(define ((make-commands-command op) args)
  (message-operator!
   op
   (format "~a" (hash-keys (operator-commands op)))))

(define ((make-look-command op) args)
  (message-operator! op (format "Trying to look at ~a"
                                (character-location op)))
  (if (character-location op)
      (message-operator!
       op
       (format "[  ~a  ]\n~a~a"
               (thing-name (character-location op))
               (area-description (character-location op))
               (if (null? (hash-keys
                           (area-exits (character-location op))))
                   ""
                   (format "Exits: ~a" (hash-keys
                                        (area-exits
                                         (character-location op)))))))
      (message-operator!
       op "You aren't anyplace.")))

(define ((make-move-command op) args)
  (if (not (hash-has-key? args 'line))
      (message-operator! op "Syntax: move <direction>")
      (if (character-location op)
          (if (not (null? (area-exits (character-location op))))
              (cond
                [(hash-has-key? (area-exits
                                 (character-location op))
                                (hash-ref args 'line))
                 (define this-exit
                   (find-thing
                    (world-areas (mudserver-world
                                  (operator-mudserver op)))
                    (hash-ref
                     (area-exits (character-location op))
                     (hash-ref args 'line))))
                 (set-character-location! op this-exit)
                 (add-thing-to-area! op this-exit)
                 (message-operator! op "You'd move if you could.")]
                [else
                 (message-operator! op "Invalid exit.")])
              (message-operator! op "Room has no exits."))
          (message-operator! op
                             "You can't move if you're noplace."))))

(define ((make-set-name!-command op) args)
  (unless (hash-has-key? args 'line)
    (message-operator! op "Syntax: set-name! <new-name>"))
  (set-thing-name! op (hash-ref args 'line))
  (message-operator!
   op
   (format "Your new name is ~a" (thing-name op))))

(define ((make-whoami-command op) args)
  (message-operator! op (thing-name op)))
