sequenceDiagram
  participant Engine
  participant Event
  loop every 200ms
    
    loop foreach event
      Engine->>Event: (scheduler . state)
      Event->>Event: update state
      Event->>Engine: (scheduler . state)
    end
  end
