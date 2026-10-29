(local instance (require :instance))
(local tab (require :tab))

(instance.configure)
(local dimension (tab.make-thing :instance/dimension))
(dimension:load)
(assert dimension.map.loaded? "Okaga mapper did not load")
(print "OKAGA-LOADED" (length dimension.things) "things")
