(setq
 teraum-data
 (ht
  ('anadini-jenos
   (ht
    (:name "Jenos Anadini")
    (:description "Jenos Anadini is a middle-aged human man who works for Honeyfern Laboratory as an archivist.")
    (:inventory '('easy-smoking-pipe))))
  ('belcaer
   (ht
    (:name "Belcaer")
    (:description "Belcaer...")
    (:location 'gloaming)))))

(ht-get teraum-data (intern "anadini-jenos"))



(setq teraum-data '())

(push
 '(anadini-jenos
   (name . "Jenos Anadini")
   (description . "Jenos Anadini is a middle-aged human man who works for Honeyfern Laboratory as an archivist.")
   (inventory
    (easy-smoking-pipe .)))
 teraum-data)



(push '(belcaer
(name . "Belcaer")
(description . "Belcaer...")
(location . gloaming))
teraum-data)

(push
 '(caliper-street
   (name . "Caliper Street")
   (description . "Caliper Street runs through the Brass Ward, in Ack.")
   (nav
    (114 . twisted-alembic)))
 teraum-data)

(push
 '(twisted-alembic
   (name . "Twisted Alembic")
   (description . "The Twisted Alembic is one of the oldest pubs in the city of Ack. It has a reputation for being where the city's more eccentric engineers and chemics spend time.")
   (nav
    (south-door . caliper-street)))
 teraum-data)

(push
 '(green-delta
   (name . "Green Delta")
   (description . "The Green Delta is a fertile region, dense with farms and small villages.")
   (nav
    (east . central-plains)
    (southeast . gloaming)
    (south . widewoods)
    (west . optic-ocean)))
 teraum-data)

(push
 '(pipe-easy-smoking
   (name . "easy-smoking pipe")
   (description . "The easy-smoking pipe is a wooden pipe which emits an intoxicating smoke. The magic comes from the pipe itself; anything burnt in it produces the same effect.")
   (location . anadini-jenos))
 teraum-data)

(push
 '(humans
   (name . "humans")
   (description . "Humans are a sapient but mundane species of upright ape."))
 teraum-data)
