#!/usr/bin/env node
import { homedir } from "node:os";
import { join } from "node:path";
import { serveWorldHost } from "@red-cup-engineering/feltos/world-host";
import { FARSTONE_GAME } from "./farstone-game.mts";
import { createFarstoneRoom } from "./farstone-room.mts";
import { farstoneStaticFiles, renderFarstonePage } from "./farstone-tufte.mts";
import { listenFarstoneTelnet, pushFarstoneTelnetUpdates } from "./telnet-wiring.mts";

// Farstone's own parameterization of world-hosting's generic serveWorldHost (world-host-runtime
// note, 2026-09-01): the qwzspace room (farstone-room.mts, single source of truth for both the
// JSON API and the WS transport — see that file's header), the TUFTE page/static assets, and
// the telnet transport are all farstone-specific; everything else (persistence backend
// selection, request-driven catch-up, the outer HTTP server, graceful shutdown) is the shared
// runtime. `clockKind` pins the pre-extraction tag so an already-persisted production clock
// file (`~/.local/state/561-group/farstone/`) stays byte-compatible across this change.
await serveWorldHost({
  env: { ...process.env, FELTOS_SAVE: process.env.FELTOS_SAVE || join(homedir(), ".local/state/561-group/farstone/world.json") },
  gameModule: FARSTONE_GAME,
  createRoom: (bootEngine, opts) => createFarstoneRoom(bootEngine, opts),
  pageHtml: renderFarstonePage(),
  staticFiles: farstoneStaticFiles(),
  listenTelnet: (mud, runtime, opts) => listenFarstoneTelnet(mud, runtime, opts),
  pushTelnetUpdates: (telnet) => pushFarstoneTelnetUpdates(telnet),
  clockKind: "farstone.world-clock.v1",
  processLabel: "Farstone",
  defaultPort: 18820,
  defaultTelnetPort: 4242,
});
