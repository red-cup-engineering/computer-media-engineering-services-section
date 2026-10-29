(local instance (require :instance))
(local tab (require :tab))

(instance.configure)
(local mapper (tab.make-thing :instance/mapper))
(print "# Okaga TAB topology\n")
(print "Generated from `attributes/instance/mapper.fnl` and room `:exits`.\n")
(each [_ id (pairs mapper.area-list)]
  (let [area (tab.make-thing id)]
    (print (.. "## `" id "`\n"))
    (each [direction destination (pairs area.exits)]
      (print (.. "- `" direction "` → `" destination "`")))
    (print "")))
