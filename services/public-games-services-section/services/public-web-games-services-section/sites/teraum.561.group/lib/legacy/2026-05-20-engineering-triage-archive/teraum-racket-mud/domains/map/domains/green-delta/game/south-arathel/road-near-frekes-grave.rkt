#lang racket

(require "./recipes.rkt")

(provide road-near-frekes-grave)

(define road-near-frekes-grave
  (south-arathel/rural-road
   #:name "a morbid stretch of country road"
   #:description "This is a length of rural road, cutting north to south through the countryside. There is grave marker set a ways back from the road, and closer, a man dressed in black is hanging by his wrists from a tree. There are some cokeberry bushes growing here."
   #:exits '((south . green-delta/game/south-arathel/fork-toward-honeyfern-labs))))