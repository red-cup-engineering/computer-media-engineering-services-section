#lang racket

(require qtops/qualities/area
         qtops/qualities/lookable
         qtops/qualities/npc
         "../../../../../qualities/brusher.rkt")

(provide <>gibbet-street)

(define (<>arandul-nabrish t)
  (<>npc
   ;; pickpocket
   t #:name "Arandul Nabrish"))

(define (<>board t)
  (<>lookable
   t #:name "wood board"
   #:nouns '("board")
   #:adjectives '("long" "wood")
   #:description "There is a long wood board between the two poles of the gibbet."))

(define (<>death-masks t)
  (<>lookable
   t #:name "death masks"
   #:nouns '("masks")
   #:adjectives '("death" "cartoonish" "wax" "old" "dirty" "gray" "remarkably" "fresh" "chipped")
   #:description
   "Wax masks, shaped into cartoonish renditions of human faces, are nailed to the poles of the gibbet that are on either side of the south end of the street. Some look incredibly old, dirty gray and chipped, while others look remarkably fresh."))

(define (<>gibbet t)
  (<>lookable
   t #:name "gibbet"
   #:nouns '("gallows")
   #:description "Two tall poles straddle either side of the street, with a thick board slung between them. The poles are covered in death masks."))

(define (<>poles t)
  (<>lookable
   t #:name "gallow poles"
   #:nouns '("poles")
   #:adjectives '("tall" "wood" "gallow")
   #:description "On either side of the south end of the street are tall wood poles, both about 15 feet tall. There is a thick wood board between them."))

(define (<>gibbet-street t)
  (<>Brusher
   (<>area
    t #:name "Gibbet Street"
    #:description
    "Gibbet Street is only one block, running from the Walk to the north to the Boundary, south of here. The most striking feature is its namesake gibbet over the southern end of the block, covered in cartoonish wax masks. North of the gibbet is a two-storey brick structure with its windows and doors covered by wooden boards, with a mess of tarps and crates stacked in the field between it and the paved gallows. Across the street, is a large house, painted a variety of grays, with a wrap-around porch, and a much smaller building emitting a hot rosin smell. Between the stinky hut and mansion is a narrow alley, almost hidden by towers of folded. squashboard boxes that spill over onto the house's porch.")
   #:trivia '("Gibbet Street is one of the oldest streets in Bellybrush, built sometime in the second half of the sixth century before the Break.")))
