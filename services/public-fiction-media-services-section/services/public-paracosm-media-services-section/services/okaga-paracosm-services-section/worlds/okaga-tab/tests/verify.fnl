(local instance (require :instance))
(local tab (require :tab))

(instance.configure)
(local model-ids (tab.scan-root-folder :attributes "okaga" true))
(assert (= (length model-ids) 7)
        (.. "expected 7 Okaga models, found " (length model-ids)))

(each [_ id (pairs model-ids)]
  (let [model (.. :okaga/ id)
        (ok err) (pcall (fn [] (tab.make-thing model)))]
    (assert ok (.. "Okaga model failed: " model " — " (tostring err)))))

(each [_ id (pairs model-ids)]
  (let [model (tab.make-thing (.. :okaga/ id))]
    (when model.exits
      (each [_ destination (pairs model.exits)]
        (assert (not (string.match destination "^teraum/"))
                (.. "standalone Okaga links to Teraum: " id))
        (assert (tab.load-attributes-file destination)
                (.. "missing exit destination " destination " from " id))))))

(local dimension (tab.make-thing :instance/dimension))
(dimension:load)
(assert dimension.loaded)
(assert dimension.map.loaded?)
(assert (not dimension.started))
(print "OKAGA-VERIFY" "models" (length model-ids)
       "areas" (length dimension.map.area-list)
       "safe-dimension-load" true)
