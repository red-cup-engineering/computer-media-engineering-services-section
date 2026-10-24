#lang racket

(require "map/main.rkt")

(provide teraum-map)

(define teraum-map
  (make-hash
   (list
    (cons 'oru-valley/oru-oru-settlement))))