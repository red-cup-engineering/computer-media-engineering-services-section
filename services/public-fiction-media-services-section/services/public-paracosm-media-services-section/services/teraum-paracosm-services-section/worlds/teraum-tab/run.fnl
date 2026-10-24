;;;; Load the standalone world without starting its network server.

(local instance (require :instance))
(local tab (require :tab))

(instance.configure)
(local dimension (tab.make-thing :instance/dimension))
(dimension:load)
(assert dimension.map.loaded? "Teraum mapper did not load")
(print "TERAUM-LOADED" (length dimension.things) "things")
