#lang racket

(require qtops/qualities/region
         "../../qualities/deltan.rkt"
         "arathel-county/main.rkt"
         "game/main.rkt"
         "marby-county/main.rkt"
         "pled-county/main.rkt"
         "sherwyn-county/main.rkt")

(provide <>green-delta)

(define (<>green-delta t)
  (<>Deltan
   (<>region
    t #:name "Green Delta"
      #:description "This is the Green Delta, a well-settled and fertile riparian region."
    #:areas `((arathel-county ,<>arathel-county)
              (game ,<>game)
              (marby-county ,<>marby-county)
              (pled-county ,<>pled-county)
              (sherwyn-county ,<>sherwyn-county)))
   #:trivia
   '("Prior to the Red Union seizing control of the Green Delta in the 70s, the only real government in the region were warring kings. The Union's bureaucratic despotism was welcomed with open arms."))
  ((((t 'area 'game)
     'area 'south-arathel)
    'area 'west-arathel-pled-road)
   'set-exit! "east"
   ((t 'area 'pled-county)
    'area 'west-arathel-pled-road))
  (((t 'area 'pled-county)
    'area 'west-arathel-pled-road)
   'set-exit! "west"
   (((t 'area 'game)
     'area 'south-arathel)
    'area 'west-arathel-pled-road))
  t)
