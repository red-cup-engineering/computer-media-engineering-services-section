;;;; Emit the current room-to-room topology as Markdown.

(local instance (require :instance))
(local tab (require :tab))

(instance.configure)
(local mapper (tab.make-thing :instance/mapper))

(print "# Teraum TAB topology\n")
(print "Generated from `attributes/instance/mapper.fnl` and each room's `:exits`.\n")
(each [_ id (pairs mapper.area-list)]
  (let [area (tab.make-thing id)]
    (print (.. "## `" id "`\n"))
    (if area.exits
        (each [direction destination (pairs area.exits)]
          (print (.. "- `" direction "` → `" destination "`")))
        (print "- No exits."))
    (print "")))
