import { createRoom } from "@red-cup-engineering/qwzspace/room";
import { createMudServer } from "@red-cup-engineering/feltos/mud-server";
import { createMudWorldFactory } from "@red-cup-engineering/feltos/mud-world";
import { interestFor } from "@red-cup-engineering/ashlar-fabrication/interest-correlation";
import { FARSTONE_GAME, FARSTONE_RUNTIME } from "./farstone-game.mjs";
import { perceptionSnapEntry } from "./farstone-perception.mjs";
import { gameValidate } from "./farstone-protocol.mjs";

/** Compose Farstone's game rules and perception with FeltOS's shared MUD world adapter. */
export function createFarstoneWorldFactory(bootEngine, opts = {}) {
  return createMudWorldFactory({
    createMudServer: () => createMudServer(FARSTONE_GAME, {
      runtime: FARSTONE_RUNTIME,
      engine: bootEngine,
      pendingCommands: opts.pendingCommands ?? [],
      connections: opts.connections ?? [],
    }),
    perceive: perceptionSnapEntry,
    maxRecentEvents: opts.maxRecentEvents ?? 20,
    initialRecentEvents: opts.initialRecentEvents ?? [],
  });
}

/** Assemble Farstone's QwzSpace WebSocket carrier over the same FeltOS MudServer as HTTP/telnet. */
export function createFarstoneRoom(bootEngine, opts = {}) {
  let liveHandle = null;
  let roomRef = null;
  const factory = createFarstoneWorldFactory(bootEngine, opts);
  const room = createRoom({
    id: opts.id ?? "farstone",
    world: () => {
      const handle = factory();
      if (liveHandle === null) liveHandle = handle;
      return handle;
    },
    validate: gameValidate,
    control: (payload, { actorId }) => {
      if (!liveHandle) throw new Error("Session is not ready.");
      return Promise.resolve(liveHandle.authenticateSession(actorId, payload)).then(async (result) => {
        await opts.onControlCommitted?.();
        return result;
      });
    },
    interest: interestFor(() => roomRef),
    intervalMs: opts.intervalMs ?? 1000,
    selfAuditEvery: 0,
  });
  roomRef = room;
  return Object.freeze({ room, liveMud: () => {
    if (liveHandle === null) throw new Error("farstone-room: live world instance not yet constructed");
    return liveHandle.mud();
  } });
}

export { FARSTONE_GAME, FARSTONE_RUNTIME };
