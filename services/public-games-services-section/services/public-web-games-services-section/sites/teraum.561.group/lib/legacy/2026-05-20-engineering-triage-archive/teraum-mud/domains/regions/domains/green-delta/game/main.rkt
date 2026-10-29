#lang racket

(require qtops/qualities/area
         qtops/qualities/npc
         qtops/qualities/region
         "../../../qualities/gamer.rkt"
         "ack/main.rkt"
         "bellybrush/main.rkt"
         "south-arathel/main.rkt")

(provide <>game)

(define bill-hags-letter
  "Susan,

I'm glad to hear my latest package got there safe. People here have a lot of bad to say about the Red Union, but I can't deny they've done a lot better with the post in recent months. I'm still not used to seeing those canvas ships floating past, though.

I wish you were here to try some of the food I've had recently. Reconstruction of Ack took folk from the fields in early summer, but the Union shipped in all sorts of fruits and veggies from Gnalens. There's one that has to be the work of a perverted wizard from before the Break. It's long and curved with a skin you peel back and a white fruit inside. And it's only ripe for about four hours!

It's been nice getting to try all these new foods, but it also makes me miss the mutton your mom would fix. Tickets to take an airship are getting cheaper - maybe I'll \"fly\" up for the holidays.

Especially if the work keeps up like this. You wrote back that you were worried I was sending too much. Don't! The Union hired us all to help rebuild the city, but now they're sending a bunch of us south to cut branches and timber from the forest, the \"Widewoods\". I'm kind of excited. Not about the work, but to see forests like the long-time workers describe.

I didn't forget what you said about your brother. I would happily find him work if he came out, but I don't know if it's the right decision. Tyjeer's still a boy, and this work isn't always safe. I don't want you to worry about me, but I'd hate for Ty to grow up without his father able to provide for him. Let me know what he needs, and I can send the money to get it for his Wintertyg. Try and convince him to stay in Dent.

Give my best to all,
Jacob")

(define (<>bill-hags t) (<>npc t #:name "Bill Hags"))

(define (<>widdershins-road t) (<>area t #:name "Widdershins Road"))

(define (<>game t)
  (<>Gamer
   (<>region
    t #:name "Greater Ack Metropolitan Enclave"
    #:areas `((ack ,<>ack)
              (bellybrush ,<>bellybrush)
              (south-arathel ,<>south-arathel)
              (widdershins-road ,<>widdershins-road))
    #:links '(((ack astar-ward)
               north south
               (south-arathel south-arathel-ack-road))
              ((ack eastgate)
               east west
               (bellybrush kingsroad kingsroad-1))
              ((ack garys-gate) south north widdershins-road)
              ((ack piketown-gate) southeast northwest
                                   widdershins-road)
              ((ack poplar-gate) south north2
                                 widdershins-road)
              ((bellybrush arathel-street arathel-street-2)
               north south
               (south-arathel bellybrush-road))))
   #:trivia
   '("The Greater Ack Metropolitan Enclave, or GAME, was established in 80pc by the Red Union, with the cooperation of the governments of the town of Bellybrush and Arathel and Marby Counties."
     "The Greater Ack Metropolitan Enclave was created after a fire destroyed much of Ack, encouraging renovation.")))
