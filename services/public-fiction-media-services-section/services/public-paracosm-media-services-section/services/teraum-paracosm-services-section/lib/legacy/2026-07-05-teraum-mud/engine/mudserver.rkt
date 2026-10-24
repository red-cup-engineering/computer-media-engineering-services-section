#lang racket

(require "area.rkt"
         "basic-commands.rkt"
         "creator-commands.rkt"
         "mudserver-struct.rkt"
         "operator.rkt"
         "world.rkt")

(provide start-mudserver!)

; accept-mudserver-operator
;   mudserver -> void
; Creates a new mudsocket-operator for the new connection
; on SERVER's tcp-listener.
(define (accept-mudserver-operator server)
  (define-values
    (in out)
    (tcp-accept (mudserver-tcp-listener server)))
  (define-values
    (local-ip local-port remote-ip remote-port)
    (tcp-addresses in #t))
  (define op
    (make-operator server in out remote-ip remote-port
                   #:world (mudserver-world server)))
  (set-operator-command! op 'commands (make-commands-command op))
  (set-operator-command! op 'look (make-look-command op))
  (set-operator-command! op 'move (make-move-command op))
  (set-operator-command! op 'quit (make-quit-command op))
  ;(set-operator-command! op 'set-name! (make-set-name!-command op))
  (set-operator-command! op 'who (make-who-command op))
  (set-operator-command! op 'whoami (make-whoami-command op))
  (set-mudserver-operators!
   server
   (append (mudserver-operators server)
           (list op)))
  (message-operator!
   op
   (format
    "Your connection to Teraum from ~a has been accepted.\nType your [desired] user-name and press ENTER"
    (format "~a:~a" (operator-ip op) (operator-port op))))
  (when (string=? (operator-ip op) "::1")
    (message-operator!
     op "(Welcome to Teraum, creator.)")
    (set-operator-command! op 'new-area!
                           (make-new-area!-command op))
    (set-operator-command! op 'set-area-name!
                           (make-set-area-name!-command op))
    (set-operator-command! op 'set-area-description
                           (make-set-area-description!-command op)))
  (let ([spawn (find-thing
                (world-areas (mudserver-world server))
                "98ddf04d-1ad2-4644-9de4-af1aeb7003a6")])
    (set-character-location! op spawn)
    (add-thing-to-area! op spawn)))


(define (remove-mudserver-operator server op)
  (set-mudserver-operators!
   server
   (remove op (mudserver-operators server)))
  (close-input-port (operator-in op))
  (close-output-port (operator-out op)))

(define (handle-mudserver-operators server)
  (map
   (λ (op)
     (cond
       [(port-closed? (operator-in op))
        (remove-mudserver-operator server op)]
       [(byte-ready? (operator-in op))
          (define op-line
            (read-line (operator-in op)))
          (cond
            [(string? op-line)
             ((operator-parser op)
              op
              (list->string
               (remove* (list #\return #\newline)
                        (string->list op-line))))]
            [(eof-object? op-line)
             (remove-mudserver-operator server op)])]))
   (mudserver-operators server))
  (when (tcp-accept-ready? (mudserver-tcp-listener server))
    (accept-mudserver-operator server)))


; start-mudserver: mudserver -> thread
; Takes a MUDSocket server and returns a thread looping over
; handle-mudserver-operators every CLOCK-SPEED seconds.
(define (start-mudserver! server op-dir [clock-speed 0.2])
  (set-mudserver-clock!
   server
   (thread
    (λ ()
      (let mudserver-loop ()
        (handle-mudserver-operators server)
        (set-mudserver-tick! server (+ 1 (mudserver-tick server)))
        (sleep clock-speed)
        (mudserver-loop)))))
  (mudserver-clock server))


(define ((make-who-command op) args)
  (message-operator!
   op (format "~a"
              (map
               (λ (o) (thing-name o))
               (mudserver-operators
                (operator-mudserver op))))))
(define ((make-quit-command op) args)
  (remove-mudserver-operator (operator-mudserver op) op))
