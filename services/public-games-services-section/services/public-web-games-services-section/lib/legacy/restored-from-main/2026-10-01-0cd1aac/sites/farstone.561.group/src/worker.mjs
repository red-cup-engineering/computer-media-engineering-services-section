import { createDurableWorld } from "@red-cup-engineering/feltos/world-host/worker";

// Documents are generated into `dist/public` by the build script. Keep their route list here
// declarative so the Worker bundle does not load the Node-only HTML/source-file renderer.
const DOCUMENT_PATHS = new Set(["/", "/play/"]);

export const FarstoneWorld = createDurableWorld({
  async loadWorld() {
    // Load modules in dependency order. Several authored modules share async ESM
    // initializers; starting those initializers concurrently can make bundler-level
    // cycle promises wait on one another.
    const gameModule = await import("./farstone-game.mjs");
    const perceptionModule = await import("./farstone-perception.mjs");
    const protocolModule = await import("@red-cup-engineering/computer-networking-engineering-services-section/qwzspace/protocol");
    const { gameValidate } = await import("./farstone-protocol.mjs");
    return {
      game: gameModule.FARSTONE_GAME,
      runtime: gameModule.FARSTONE_RUNTIME,
      perceive: perceptionModule.perceptionSnapEntry,
      validate: gameValidate,
      protocol: protocolModule,
    };
  },
});

export default {
  fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (request.headers.get("Upgrade")?.toLowerCase() === "websocket" || !DOCUMENT_PATHS.has(path) && path !== "/index.html" && !path.startsWith("/assets/") && !path.startsWith("/vendor/")) {
      return env.WORLD.getByName("farstone").fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
};
