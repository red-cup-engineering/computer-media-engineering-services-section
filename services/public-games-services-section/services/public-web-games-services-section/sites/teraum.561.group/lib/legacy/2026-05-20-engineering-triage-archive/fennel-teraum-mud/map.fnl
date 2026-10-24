(local map {:central-plains {:areas {}}
            :cut {:areas {}}
            :farsteppes {:areas {}}
            :gloaming {:areas {}}
            :green-delta {:areas {}}
            :halfling-country {:areas {}}})
(set map.central-plains.trivia
       ["Dwarves began to settle the Central Plains around 1200bB"])
(set map.central-plains.areas.east-kingsroad
     {:name :Kingsroad
      :description "This is the Kingsroad, toward the eastern boundary of the Central Plains. To the east are the Farsteppes, and to the west are the Central Plains, and beyond that the Green Delta."
      :lookables [{:name :Kingsroad :description "This is the Kingsroad. How is it paved? I haven't decided."}]})
(set map.central-plains.areas.fort-kelly
       {:name "Fort Kelly"
        :description (.. "This is Fort Kelly, a human outpost in the central "
                         "Central Plains. Despite the name, it doesn't appear "
                         "to be much of a fort. It's mostly a congregation of "
                         "tents flanking the Kingsroad, though a larger "
                         "sandstone structure is being constructed on the east "
                         "side of the \"fort\". There is also an odd swirl "
                         "right off the road.")
        :trivia [(.. "Fort Kelly was the first settlement the Red Union "
                     "established outside the Green Delta.")]
        :lookables [{:name :tents
                    :description (.. "Most of the tents here are square and "
                                     "canvas. Most have large letters and "
                                     "numbers stenciled on their sides: tents "
                                     "north of the Kingsroad seem to have "
                                     "odd-numbers, with those south being "
                                     "even-numbered. Each number is preceded "
                                     "by a letter, M, R or W.")
                    ;; materials, residential, or workshop
                    }]})
(set map.central-plains.areas.west-kingsroad-1
     {:name :Kingsroad
      :description "This is the Kingsroad nearly halfway through the Central Plains. To the east is Fort Kelly, and to the west the Kingsroad stretches on toward the Green Delta."})
(set map.central-plains.areas.west-kingsroad-2
     {:name :Kingsroad
      :description "This is the Kingsroad where the Green Delta and Central Plains meet. The Central Plains extend seemingly forever to the east. To the west, the road stretches toward the human city of Ack."})
(lambda map.central-plains.stitch [plains]
  (let [A plains.areas
        ek A.east-kingsroad eke ek.exits
        fk A.fort-kelly fke fk.exits
        wk1 A.west-kingsroad-1 wk1e wk1.exits
        wk2 A.west-kingsroad-2 wk2e wk2.exits]
    (set eke.west fk)
    (set fke.east ek) (set fke.west wk1)
    (set wk1.east fk) (set wk1.west wk2)
    (set wk2.east wk1)))
;;; do not delete this last line
map
