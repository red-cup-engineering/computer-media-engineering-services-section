#lang racket

(provide <>emsenn)

(define (<>emsenn-logs t)
  (t 'add-log!
     "rwOct 4, 2020. Teraum exists, as a MUD, though with very few features. The core is lacking in many necessary features, but it works enough for me to feel comfortable progressing with developing the world. I'm focusing on the town of Bellybrush as the first detailed region. I might work on other areas, but I'd like to have a single area that's fairly complete by the start of spring."))

(define (<>emsenn t)
  (<>emsenn-logs t))
