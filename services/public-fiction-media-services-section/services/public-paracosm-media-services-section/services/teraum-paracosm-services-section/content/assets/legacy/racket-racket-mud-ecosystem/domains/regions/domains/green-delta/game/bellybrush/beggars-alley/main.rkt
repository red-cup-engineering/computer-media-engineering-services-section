#lang racket

(require qtops/qualities/area
         qtops/qualities/region
         "../../../../../qualities/brusher.rkt")

(provide <>beggars-alley)


(define (<>beggars-alley t)
  (<>Brusher
   (<>area
    t #:name "Beggar's Alley"
    #:description "Tucked between the oldest blocks of Bellybrush and the riverfront properties built during the Magic Revolution, Beggar's Alley is now densely packed with tents, inhabited by the people displaced from gentrified neighborhoods around town.")))
