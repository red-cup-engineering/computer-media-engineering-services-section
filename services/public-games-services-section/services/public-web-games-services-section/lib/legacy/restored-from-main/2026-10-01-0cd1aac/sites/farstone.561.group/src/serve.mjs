#!/usr/bin/env node
import { mkdtempSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { serveWorldHost } from "@red-cup-engineering/feltos/world-host";
import { buildBrowserAssets } from "@red-cup-engineering/computer-web-platform/build-cloudflare-worker";
import { FARSTONE_GAME } from "./farstone-game.mjs";
import { createFarstoneRoom } from "./farstone-room.mjs";
import { farstoneDocuments, farstoneStaticFiles } from "./farstone-tufte.mjs";
import { listenWorldTelnet } from "@red-cup-engineering/feltos/world-host/telnet";
import { pushMudTelnetServer } from "@red-cup-engineering/feltos/telnet";

const root = dirname(fileURLToPath(import.meta.url));
const documents = farstoneDocuments();
const sourceAssets = farstoneStaticFiles();
const browserOutput = mkdtempSync(join(tmpdir(), "farstone-browser-"));
process.once("exit", () => rmSync(browserOutput, { recursive: true, force: true }));
const browserBuild = await buildBrowserAssets({
  outdir: browserOutput,
  documents,
  assets: sourceAssets,
});
const staticFiles = Object.fromEntries(Object.keys(sourceAssets).map((url) => [url, join(browserBuild.publicRoot, url.slice(1))]));

// Compose the authored game with shared local hosting and terminal transport.
// Retain the clock tag used by existing local snapshots.
await serveWorldHost({
  env: { ...process.env, FELTOS_SAVE: process.env.FELTOS_SAVE || join(homedir(), ".local/state/561-group/farstone/world.json") },
  gameModule: FARSTONE_GAME,
  createRoom: (bootEngine, opts) => createFarstoneRoom(bootEngine, opts),
  documents,
  staticFiles,
  listenTelnet: (mud, runtime, opts) => listenWorldTelnet(mud, runtime, opts),
  pushTelnetUpdates: (telnet) => pushMudTelnetServer(telnet.server),
  clockKind: "farstone.world-clock.v1",
  processLabel: "Farstone",
  defaultPort: 18820,
  defaultTelnetPort: 4242,
});
