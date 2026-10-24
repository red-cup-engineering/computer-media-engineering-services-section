#lang racket

(require qtops/qualities/area
         "../../../qualities/belkite.rkt")

(provide <>lobby)

(define (<>lobby t)
  (<>Belkite
    (<>area
      t #:name "lobby"
      #:description "This is the lobby of Belcaer. It's unusual for a city to have a lobby, but Belcaer is an unusual city. The whole place exists as one structure, created atop a mesa many centuries ago by a powerful magic-user. This history is reflected in the architecture: rooms are unfeasibly tall, and feature impossibly intricate geometric engravings all over their sandstone surface. Here, there is an arrangement of rectangular counters near the center of the room, with a number of clerks wearing red vests providing information to the city's various workers and guests. Access to the road down to the rest of the Gloaming is provided through a large arched doorway.")))
