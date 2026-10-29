#lang racket

(require "../../mud/engine.rkt")
(require "../../mud/data-structures/service.rkt")
(require "../../mud/data-structures/thing.rkt")
(require "../../mud/services/mudsocket.rkt")
(require "../../mud/qualities/mudsocket-client.rkt")
(require "../../mud/qualities/user.rkt")
(require "../../mud/utilities/thing.rkt")

(require "../../rpg-basics/services/post-login.rkt")
(require "../../rpg-basics/services/map.rkt")

(provide teraum-post-login-service)

(define (setup-spawn-area)
  (set-spawn-area!
   (get-area
    'teraum/green-delta/ack/dock-ward)))

(define teraum-post-login-service
  (service
   'teraum-post-login-service
   #f setup-spawn-area #f #f))