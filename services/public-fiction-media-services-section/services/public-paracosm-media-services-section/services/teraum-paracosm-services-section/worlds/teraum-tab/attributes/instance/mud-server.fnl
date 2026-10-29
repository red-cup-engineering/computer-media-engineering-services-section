;;;; Teraum's server configuration. `run.fnl` only loads this model; it never
;;;; calls `start`, so verification and topology work do not bind this port.

{:name "Teraum MUD server"
 :base :mud/server
 :port 4242}
