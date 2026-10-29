#lang racket

(require "engine/mudserver-struct.rkt"
         "engine/mudserver.rkt"
         "engine/world.rkt"
         "engine/persistence.rkt"
         "engine/user.rkt")

(define teraum (make-mudserver
                (make-world "/home/emsenn/dev/teraum/world/")
                (make-users "/home/emsenn/dev/teraum/users/")))

(start-mudserver! teraum 0.2)
