#lang racket

(require "../../../recipes/areas/green-delta/arathel-county/rural-road.rkt")

(provide west-arathel-pled-road)

(define west-arathel-pled-road
  (rural-road
   'teraum/green-delta/arathel-county/west-arathel-pled-road
   #:brief "west Arathel-Pled road"
   #:description "This is the western part of the road between Arathel and Pled Counties, itself in what would be considered western Pled County. The road itself is well-packed dirt, with clear ruts from wagon wheels. Short stone walls border both sides of the road, marking the fields where local farmers graze their sheep. The road leads west toward Arathel County, and east toward Pled County. The road east has been flooded."
   #:exits '(("north" . teraum/green-delta/pled-county/daughts-cottage)
             ("west" . teraum/green-delta/arathel-county/west-arathel-pled-road))))