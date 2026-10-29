(local socket (require :socket))
(local fennel (require :fennel))
(local map (require :map))
(local util {})
(lambda util.clone-table [tbl ?new-attr]
  (let [clone {}]
    (lambda apply [tbl] (each [k v (pairs tbl)] (tset clone k v)))
    (apply tbl) (when ?new-attr (apply ?new-attr))
    clone))
(lambda util.collect-keys [tbl] (icollect [key _ (pairs tbl)] key))
(lambda util.find-key [seq query]
  (each [key val (pairs seq)] (when (= val query) key)))
(lambda util.make-string-appender [?sep]
  (var o "")
  (lambda [?a]
    (lambda q [r] (set o (.. o r (or ?sep ""))) o)
    (if ?a
        (if (= (type ?a) :string)
              (q ?a)
              (each [_ v (pairs ?a)] (q v)))
        o)))
(lambda util.quibble-strings [strings ?resort ?oxfordize]
  "Return the sequence of STRINGS separated with commas and the conjunction 'and'. ?OXFORDIZE is currently irrelevant; strings are oxfordized by defualt."
  (let [oxfordize (or ?oxfordize true)
        o (util.make-string-appender)]
    (when ?resort (table.sort strings))
    (var join "")
    (for [count 1
          (length strings) 1]
      (if (= count (length strings))
          (set join "")
          (= count (- (length strings) 1))
          (set join
               (.. (if (and oxfordize (> (length strings) 2))
                       ","
                       "")
                   " and "))
          (set join ", "))
      (o [(. strings count) join]))
    (o)))
(local timer {:tick-rate 0.02 :tick-count 0 :events []})
(lambda timer.run [timer]
  (timer:tick)
  (socket.select nil nil timer.tick-rate)
  (timer:run))
(lambda timer.schedule-event [timer event ?delay]
  (let [delay (if ?delay (- ?delay 1) 1)]
    (when (not (. timer.events delay))
      (tset timer.events delay []))
    (table.insert (. timer.events delay) event)))
(lambda timer.tick [timer]
  (set timer.tick-count (+ timer.tick-count 1))
  (let [current-events (. timer.events 1)]
    (each [_ event (pairs current-events)] (event)))
  (each [tick events (pairs timer.events)]
    (tset timer.events tick nil)
    (tset timer.events (- tick 1) events)))
(local make {})
(local area {:exits {} :contents [] :lookables []})
(lambda area.search [area query ?matches]
  (let [contents area.contents
        matches (or ?matches [])]
    (lambda search [seq]
      (each [_ item (pairs seq)]
        (when (and item.name (= item.name query))
          (table.insert matches item))))
    (search area.contents) (search area.lookables)
    matches))
(lambda make.area [definition]
  (let [area (util.clone-table area definition)]
    area))
(lambda make.region [definition]
  (let [region definition]
    (when region.areas
      (each [area-id area-definition (pairs region.areas)]
        (let [area (make.area area-definition)]
          (when area.contents
            (each [_ item (pairs area.contents)]
              (when (and item.type
                         (. make item.type))
                ((. make item.type) item))))
          (when region.trivia
            (when (not area.trivia) (set area.trivia []))
            (each [_ trivium (pairs region.trivia)]
              (table.insert area.trivia trivium)))
          (tset region.areas area-id area))))
    (when region.stitch (region:stitch))
    region))
(local client {:name :Anonymouse
               :description (.. "This is a small mouse.")
               :input "" :output "" :commands {}
               :size 3})
(lambda client.parser [client input]
  (let [(command line) (input:match "([^ ]+) ?(.*)")]
    (var matched? nil)
    (each [key func (pairs client.commands)]
      (when (= command key)
        (set matched? true)
        (func client line)))
    (when (not matched?)
      (client:append-output "Invalid command."))))
(lambda client.append-output [client message]
  (set client.output
       (.. client.output message "\n")))
(lambda client.look [client thing]
  (let [O (util.make-string-appender "\n")]
    (when thing.name (O thing.name))
    (when thing.description (O thing.description))
    (when thing.contents
      (let [content-listing
            (util.quibble-strings
              (icollect [_ item (pairs thing.contents)]
                (when (and item.name item.size (> item.size 0))
                  item.name)))]
        (when content-listing
          (O (.. "Contents: " content-listing)))))
    (when thing.exits
      (O (.. "Exits: "
             (util.quibble-strings (util.collect-keys thing.exits) true))))
    (if (not (= (O) ""))
        (client:append-output (O))
        (client:append-output "Cannot see thing."))))
(lambda client.move [client destination]
  (if destination.contents
      (do
        (when client.location
          (table.remove
           client.location.contents
           (util.find-key client.location.contents client)))
        (table.insert destination.contents client)
        (set client.location destination)
        (client:append-output
         (.. "You move"
             (if destination.name
                 (.. " to " destination.name)
                 "."))))
      (if destination.exits
          (do (set destination.contents [])
              (client:move destination))
          (print "Move failed! destination doesnt seem to be an area."))))
(lambda client.parse-input [client input]
  (client:parser input))
(lambda client.commands.commands [client input]
  (client:append-output
   (.. "You have access to the following commands: "
       (util.quibble-strings (util.collect-keys client.commands) true))))
(lambda client.commands.look [client input]
  (if (not (= input ""))
      (let [matches []]
        (if client.location (client.location:search input matches))
        (if (= (length matches) 1)
            (client:look (. matches 1))
            (if (> (length matches) 1)
                (client:append-output "multiple matches")
                (client:append-output "No match"))))
      (if client.location (client:look client.location)
          (client:append-output "cannot look!"))))
(lambda client.commands.move [client input]
  (let [(direction _) (input:match "([^ ]+) ?(.*)")]
    (var matched? nil)
    (let [destination (. client.location.exits direction)]
      (if destination
          (client:move destination)
          (client:append-output "Invalid direction.")))))
(lambda client.commands.who [client input]
  (client:append-output
   (.. "There are " (length client.server.clients)
       " clients currently connected to the server.")))
(lambda client.commands.whoami [client input]
  (client:append-output
   (.. "Your name is " (or client.name :unknown) ".")))
(lambda make.client [definition]
  (let [client (util.clone-table client)]
    (each [k v (pairs definition)]
      (tset client k v))
    client))
(local server {:port 4242 :timeout 0.001 :clients []})
(lambda server.accept-connection [server connection]
  (connection:settimeout server.timeout)
  (let [client (make.client {: connection : server})]
    (table.insert server.clients client)
    (server:send-connection-message client)
    (when server.spawn-room
      (fennel.view server.spawn-room)
      (client:move server.spawn-room))))
(lambda server.disconnect-client [server client]
  (each [key value (pairs server.clients)]
    (when (= value client.connection)
      (server.clients:remove key))))
(lambda server.send-connection-message [server client]
  (let [msg (.. "You've connected to a server")]
    (client:append-output msg)))
(lambda server.start [server ?spawn-room]
  (set server.mudsocket (assert (socket.bind "0.0.0.0" server.port)))
  (when ?spawn-room
    (set server.spawn-room ?spawn-room))
  (server.mudsocket:settimeout server.timeout))
(lambda server.tick [server ?timer]
  (let [new-conn (server.mudsocket:accept)]
    (when new-conn (server:accept-connection new-conn)))
  (each [_ client (pairs server.clients)]
    (match (client.connection:receive)
      (nil msg) (server:disconnect-client client)
      input (client:parse-input input))
    (when (not (= client.output ""))
      (client.connection:send client.output)
      (set client.output "")))
  (when ?timer (?timer:schedule-event (partial server.tick server ?timer))))
(lambda start []
  (let [world {:central-plains (make.region map.central-plains)}]
    (server:start world.central-plains.areas.fort-kelly)
    (timer:schedule-event (partial server.tick server timer))))
(lambda run []
  (timer:run))
{: server : timer : make : start : run}
