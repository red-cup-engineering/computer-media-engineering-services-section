#lang racket

(require qtops/qualities/area
         qtops/qualities/region)

(provide <>pled-county)

(define (<>west-arathel-pled-road t)
  (<>area
    t #:name "road"
       #:description "This is the western part of the road between Arathel and Pled Counties, itself in what would be considered western Pled County. The road itself is well-packed dirt, with clear ruts from wagon wheels. Short stone walls border both sides of the road, marking the fields where local farmers graze their sheep. The road leads west toward Arathel County, and east toward Pled County. The road east has been flooded."))

(define (<>pled-county t)
  (<>region
   t #:name "Pled County"
   #:areas `((west-arathel-pled-road ,<>west-arathel-pled-road))))
