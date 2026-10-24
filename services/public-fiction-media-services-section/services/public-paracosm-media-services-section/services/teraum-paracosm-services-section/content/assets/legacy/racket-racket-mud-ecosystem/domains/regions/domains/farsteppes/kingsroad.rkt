#lang racket

(require qtops/qualities/area
         "../../qualities/stepper.rkt")


(provide <>kingsroad)

(define (<>kingsroad t)
  (<>Stepper
    (<>area
      t #:name "Kingsroad"
      #:description "This is the Kingsroad, a road that runs from the old dwarven enclaves in the Worldkeepers all the way to the Optic Ocean.")))
