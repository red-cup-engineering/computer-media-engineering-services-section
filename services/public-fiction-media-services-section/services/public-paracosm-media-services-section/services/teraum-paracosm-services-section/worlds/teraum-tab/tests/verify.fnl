;;;; Teraum instance verification. This deliberately never calls `start`.

(local instance (require :instance))
(local tab (require :tab))

(instance.configure)

(local model-ids (tab.scan-root-folder :attributes "teraum" true))
(assert (= (length model-ids) 142)
        (.. "expected 142 Teraum models, found " (length model-ids)))

(each [_ id (pairs model-ids)]
  (let [model (.. :teraum/ id)
        (ok err) (pcall (fn [] (tab.make-thing model)))]
    (assert ok (.. "Teraum model failed: " model " — " (tostring err)))))

(local missing-exits [])
(each [_ id (pairs model-ids)]
  (let [model (tab.make-thing (.. :teraum/ id))]
    (when model.exits
      (each [_ destination (pairs model.exits)]
        (assert (not (string.match destination "^okaga/"))
                (.. "standalone Teraum links to Okaga: " id))
        (when (not (tab.load-attributes-file destination))
          (table.insert missing-exits (.. id " -> " destination)))))))

(assert (= (length missing-exits) 0)
        (.. "missing exit destinations: " (table.concat missing-exits "; ")))

(local squash (tab.make-thing :teraum/eastlands/green-delta/game/ack/squash-ward))
(assert (= squash.exits.north :teraum/eastlands/green-delta/game/ack/dock-ward/main))
(assert (not squash.exits.east))

(local dimension (tab.make-thing :instance/dimension))
(dimension:load)
(assert dimension.loaded)
(assert dimension.map.loaded?)
(assert (not dimension.started))

(print "TERAUM-VERIFY" "models" (length model-ids)
       "areas" (length dimension.map.area-list)
       "safe-dimension-load" true)
