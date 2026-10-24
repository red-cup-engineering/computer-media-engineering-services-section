#lang racket

(require "./recipes.rkt")

(provide west-arathel-pled-road)

(define west-arathel-pled-road
  (south-arathel/rural-road
   #:name "west Arathel-Pled road"
   #:description "This is the western part of the road between Arathel and Pled Counties, itself in what would be considered eastern Arathel County. The road itself is well-packed dirt, with clear ruts from wagon wheels. Short stone walls border both sides of the road, marking the fields where local farmers graze their sheep. The road leads west toward Arathel County, and east toward Pled County."
   #:exits '((west . green-delta/game/south-arathel/outside-dull-thorn-inn))))
            ; (east . green-delta/pled-county/west-arathel-pled-road))))