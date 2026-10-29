#lang racket

(require "../../../recipes/areas/green-delta/marby-county/village.rkt")

(provide eridrin)

(define eridrin
  (village
   'teraum/green-delta/marby-county/eridrin
   #:brief "Eridrin"
   #:description "This is the town of Eridrin. It consists of about a dozen wattle cottages erected near the gravel banks of the Marlbreen River, grey with silt. A well-worn road reveals sandy loam under thin topsoil. The road leads northwest to the large town of Bellybrush, and southeast through Marby County."))
;
;                         (cons 'container (container
;                                           (list
;                                            (recipe (list "cottages" "homes" "houses") (list "wattle")
;                                                    (make-hash (list (cons 'visual (visual "wattle cottages"
;                                                                                           "There are about a dozen wattle cottages arranged near the road."))
;                                                                     (cons 'physical (physical (void)))
;                                                                     (cons 'actions (actions
;                                                                                     (list (cons 1 "Sun glints off the smooth facade of a cottage.")
;                                                                                           (cons 1 "There is a sound of conversation inside one cottage.")))))))
;                                            (recipe (list "banks" "bank" "riverbank") (list "gravel" "river")
;                                                    (make-hash (list (cons 'visual (visual "gravel river banks"
;                                                                                           "The banks of the Marlbreen river are composed of small round pebbles. Most are an unremarkable beige, but there are a few bright blue pebbles."))
;                                                                     (cons 'physical (physical (void)))
;                                                                     (cons 'actions (actions
;                                                                                     (list
;                                                                                      (cons 3 "A soft sound rises from the Marlbreen's banks as gravel shifts in place.")))))))
;                                            (recipe (list "pebbles" "pebble") (list "bright" "blue")
;                                                    (make-hash (list (cons 'visual (visual "bright blue pebbles"
;                                                                                           "There are a few bright blue pebbles mixed in with the gravel forming the banks of the Marlbreen River.")))))
;                                            (recipe (list "gravel" "pebbles" "pebble") (list "beige")
;                                                    (make-hash (list (cons 'visual (visual "beige gravel"
;                                                                                           "Most of the Marlbreen's banks and floor are covered in beige gravel.")))))
;                                            (recipe (list "silt") (list "grey")
;                                                    (make-hash (list (cons 'visual (visual "grey silt"
;                                                                                           "Grey silt is suspended in the water of the Marlbreen River, obfuscating its bottom.")))))
;                                            (recipe (list "goat") (list)
;                                                    (make-hash (list (cons 'visual (visual "goat"
;                                                                                           "This is a goat."))
;                                                                     (cons 'actions (actions
;                                                                                     (list (cons 2 "The goat bleats."))))
;                                                                     (cons 'physical (physical (void)))))))))))))


