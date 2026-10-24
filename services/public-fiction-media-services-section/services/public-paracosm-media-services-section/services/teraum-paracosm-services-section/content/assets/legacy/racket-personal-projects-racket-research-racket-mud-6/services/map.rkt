#lang racket

(require "../../mud/data-structures/service.rkt")

(require "../../rpg-basics/services/map.rkt")

(require (prefix-in teraum/ "../map/main.rkt"))

(provide teraum-map-service)

(define teraum-map
  (list
   teraum/central-plains/farsteppes-road
   teraum/central-plains/fort-kelly
   teraum/central-plains/kingsroad
   teraum/farsteppes/castle-oru
   teraum/farsteppes/central-plains-road
   teraum/farsteppes/culver-estate
   teraum/farsteppes/helmets-dent
   teraum/farsteppes/road-to-culver-estate
   teraum/gloaming/belcaer/chandlers-guild-office
   teraum/gloaming/belcaer/lobby
   teraum/gloaming/belcaer/offices
   teraum/gloaming/central-longroad
   teraum/gloaming/jacobs-folly/outside
   teraum/gloaming/north-longroad
   teraum/gloaming/road-to-jacobs-folly
   teraum/gloaming/south-longroad
   teraum/green-delta/ack/angers-place
   teraum/green-delta/ack/astar-ward
   teraum/green-delta/ack/bank-hill
   teraum/green-delta/ack/brass-ward
   teraum/green-delta/ack/carper-falls
   teraum/green-delta/ack/copper-ward
   teraum/green-delta/ack/dock-ward
   teraum/green-delta/ack/eastgate
   teraum/green-delta/ack/garys-gate
   teraum/green-delta/ack/gasper
   teraum/green-delta/ack/north-ward
   teraum/green-delta/ack/piketown
   teraum/green-delta/ack/piketown-gate
   teraum/green-delta/ack/poplar-gate
   teraum/green-delta/ack/red-ward
   teraum/green-delta/ack/reinhold-wood
   teraum/green-delta/ack/squash-ward
   teraum/green-delta/ack/sugar-heights
   teraum/green-delta/ack/the-dog
   teraum/green-delta/ack/tin-ward
   teraum/green-delta/ack/wineglass
   teraum/green-delta/arathel-county/bellybrush-road
   teraum/green-delta/arathel-county/belys-blades
   teraum/green-delta/arathel-county/broken-arrow-inn
   teraum/green-delta/arathel-county/crossed-candles-inn
   teraum/green-delta/arathel-county/dull-thorn-inn
   teraum/green-delta/arathel-county/dull-thorn-inn-quarters
   teraum/green-delta/arathel-county/fork-toward-honeyfern-labs
   teraum/green-delta/arathel-county/golden-shield-inn
   teraum/green-delta/arathel-county/honeyfern-labs/dining-hall
   teraum/green-delta/arathel-county/honeyfern-labs/first-floor-hallway
   teraum/green-delta/arathel-county/honeyfern-labs/foyer
   teraum/green-delta/arathel-county/honeyfern-labs/front-path
   teraum/green-delta/arathel-county/honeyfern-labs/front-porch
   teraum/green-delta/arathel-county/honeyfern-labs/kitchen
   teraum/green-delta/arathel-county/honeyfern-labs/library
   teraum/green-delta/arathel-county/honeyfern-labs/outside-gate
   teraum/green-delta/arathel-county/honeyfern-labs/pantry
   teraum/green-delta/arathel-county/honeyfern-labs/sitting-room
   teraum/green-delta/arathel-county/north-arathel-ack-road
   teraum/green-delta/arathel-county/outside-broken-arrow-inn
   teraum/green-delta/arathel-county/outside-crossed-candles-inn
   teraum/green-delta/arathel-county/outside-dull-thorn-inn
   teraum/green-delta/arathel-county/outside-golden-shield-inn
   teraum/green-delta/arathel-county/road-to-honeyfern-labs
   teraum/green-delta/arathel-county/south-arathel-ack-road
   teraum/green-delta/arathel-county/west-arathel-pled-road
   teraum/green-delta/bellybrush/arathel-road
   teraum/green-delta/bellybrush/east-harbrook-street
   teraum/green-delta/bellybrush/east-kingsroad
   teraum/green-delta/bellybrush/kingsroad-outside-orphanage
   teraum/green-delta/bellybrush/west-harbrook-street
   teraum/green-delta/bellybrush/west-kingsroad
   teraum/green-delta/bellybrush/westgate
   teraum/green-delta/marby-county/eridrin
   teraum/green-delta/pled-county/daughts-cottage
   teraum/green-delta/pled-county/west-arathel-pled-road
   ))

(define (load-map)
  (add-area-recipes-to-known-areas teraum-map))

(define teraum-map-service (service 'teraum-map-service
                              load-map #f #f #f))
