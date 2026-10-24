sequenceDiagram
  participant MUDSocket
  participant Player
  participant Parser
  participant Engine
  participant Broadcast
  Note over MUDSocket,Broadcast: BEGIN Tick 1
  Note over Engine: ...other events...
  Engine->>MUDSocket: (scheduler . state)
  loop for every player
  MUDSocket->>MUDSocket: if input, call parser
  MUDSocket->>Player: input = "cq Hi there!"
  end
  Player->>Parser: cq Hi there!
  Parser->>Parser: command = cq, args = "Hi there!"
  Parser->>Engine: (schedule (broadcast cq Player "Hi there!"))

  Engine->>Engine: add broadcast to scheduled events
  loop for every player
    MUDSocket->>MUDSocket: if output, send it
  end
  MUDSocket->>Engine: (schedule MUDsocket)
  MUDSocket->>Engine: (scheduler . state)
  Note over Engine: ...other events...
  Note over MUDSocket,Broadcast: END Tick 1
  Note over MUDSocket,Broadcast: BEGIN Tick 2
  Note over Engine: ...other events...
  Engine->>Broadcast: (scheduler . state)
  loop for every listener
    Broadcast->>Broadcast: (add-to-output "(cq) Player: Hi there!")
  end
  Broadcast->>Engine: (scheduler . state)
  Engine->>MUDSocket: (scheduler . state)
  loop for every player
  MUDSocket->>MUDSocket: if input, call parser
  end
  loop for every player
    MUDSocket->>MUDSocket: if output, send it
    MUDSocket->>Player: output = "(cq) Player: Hi there!"
  end
  MUDSocket->>Engine: (schedule MUDsocket)
  MUDSocket->>Engine: (scheduler . state)
  Note over Engine: ...other events...
  Note over MUDSocket,Broadcast: END Tick 2
  
