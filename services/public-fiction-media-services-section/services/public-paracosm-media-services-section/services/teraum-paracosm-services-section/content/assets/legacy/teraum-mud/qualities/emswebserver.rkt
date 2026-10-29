#lang racket

(require qtops
         "document.rkt"
         "library.rkt"
         "log-webserver.rkt"
         "webserver.rkt"
         "../library/logs/main.rkt"
         "../library/website/main.rkt")

(provide <>emswebserver)

(define (<>emswebserver t)
  (<>emslogs
   (<>log-webserver
    (<>webserver
     t #:name "emsenn's web server"
     #:documents website-library-listing))))
