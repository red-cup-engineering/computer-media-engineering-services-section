#lang racket

(require qtops/qualities/area
         qtops/qualities/lookable
         qtops/qualities/region
         "../../../qualities/gnalinne.rkt")

(provide <>halfling-country)

(define (<>bathroom-posters t)
  (<>lookable
   t #:name "posters"
   #:description "The posters here are all informative, containing instructions on everything from self-defense to sexual hygiene."))

(define (<>bookshelves t)
  (<>lookable
   t #:name "bookshelves"
   #:description "Both long walls of the store are almost entirely covered in bookshelves. Many of the shelves have had words carved into them."))

(define (<>board t)
  (<>lookable
   t #:name "birch board"
   #:description "The birch board near the back of the store has a few posters tacked to it, but the writing on them appears to be complete gibberish."))

(define (<>books t)
  (<>lookable
   t #:name "books"
   #:description "The bookshelves are stacked heavy with books. Most titles use words like equality, labor, and unions in complex ways."))

(define (<>bulletins t)
  (<>lookable
   t #:name "posters"
   #:nouns '("bulletins" "notices")
   #:description "The bulletins and posters tacked to the birch board seem to have their letters all jumbled: they're unintelligible."))

(define (<>counter t)
  (<>lookable
   t #:name "counter"
   #:description "The counter, set up near the front door, has a few notepads and papers scattered across it. Some appear to be inventory listings, others are hastily written names and mailing addresses."))

(define (<>front-door t)
  (<>lookable
   t #:name "front-door"
   #:description "The front door is a heavy wooden thing, with a small glass window above it."))

(define (<>front-transom t)
  (<>lookable
   t #:name "transom"
   #:description "There is a small window above the front door. The proper term for such a window is a \"transom,\" if you wanted to know."))

(define (<>hallway t)
  (<>lookable
   t #:name "hallway"
   #:description "The bookstore isn't in a hallway; the room is just narrow and has a door on each end. Well, maybe that is all that goes into a room being a hallway. A corridor by any other name, and all that."))

(define (<>inventory-listings t)
  (<>lookable
   t #:name "inventory listings"
   #:description "On the front counter are an assortment of inventory listings: book titles followed by scraps of arithmetic meant to track how many are in stock."))

(define (<>notepads t)
  (<>lookable
   t #:name "notepads"
   #:description "The counter has a few notepads on it."))

(define (<>papers t)
  (<>lookable
   t #:name "papers"
   #:description "Some of the papers on the front counter are inventory listings, while seem to have people's names and mailing addresses."))
; search papers to turn up the identity of a leftist in Gnalens

(define (<>words t)
  (<>lookable
   t #:name "words"
   #:description "Carved into the bookshelves are words like \"All People Are Free People\" and \"Direct Action Gets It Done!\""))

(define (<>borderless-books t)
  (<>Gnalinne
    (<>area
      t #:name "Borderless Books"
      #:description "This is Borderless Books, a small bookshop in the city of Gnalens. The store is basically a hallway from its front door to its back door. A counter near the front door is covered with small notebooks and scraps of paper. The walls are lined with bookshelves, heavily stocked. Near the back of the store is a birch board into which bulletins and notices have been stuck. Across from the board is a door leading to the restroom.")
    #:trivia '("Borderless Books was created as an homage to Internationalist Books, formerly a bookstore in Chapel Hill, North Carolina.")))

(define (<>borderless-books-restroom t)
  (<>area
    t #:name "bathroom, Borderless Books"
   #:description "This is the bathroom of Borderless Books. There is a simple flush-toilet here, and a sink with a mirror above it. An oil lamp fastened to the wall provides enough light to see that the walls are covered in posters."))

(define (<>gnalens t)
  (<>region
   t #:name "Gnalens"
   #:areas `((borderless-books ,<>borderless-books))))

(define (<>halfling-country t)
  (<>region
   t #:name "Halfling Country"
   #:areas `((gnalens ,<>gnalens))))
