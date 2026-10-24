#lang racket

(require "../../mud/data-structures/recipe.rkt")
(require "../../mud/data-structures/service.rkt")

(require "../../rpg-basics/services/area.rkt")
(require "../../rpg-basics/qualities/container.rkt")
(require "../../rpg-basics/qualities/area.rkt")
(require "../../rpg-basics/qualities/visual.rkt")
(require "../../rpg-basics/utilities/recipe.rkt")

(require (prefix-in teraum/ "../map/main.rkt"))

(provide teraum-map-service)

(define teraum-map
  (list
   teraum/green-delta/arathel-county/crossed-candles-inn
   teraum/green-delta/arathel-county/outside-crossed-candles-inn
   ))

(define (load-map)
  (add-area-recipes-to-known-areas teraum-map))

(define teraum-map-service (service 'teraum-map-service
                              load-map #f #f #f))
