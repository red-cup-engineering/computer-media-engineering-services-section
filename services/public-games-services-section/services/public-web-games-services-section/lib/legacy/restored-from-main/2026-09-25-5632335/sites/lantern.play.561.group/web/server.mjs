import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createNativeApplicationServer, startNativeApplication } from "@red-cup-engineering/computer-web-server/native-application";
import { staticFiles } from "@red-cup-engineering/computer-web-server/static";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
/** The engine the browser runs is the education platform's own, served from its source. */
const ENGINE_ROOT = path.dirname(fileURLToPath(import.meta.resolve("@red-cup-engineering/education-platform-service/srs")));
const ENGINE_MODULES = new Set(["types", "srs", "stability", "lightcone", "kata", "walk", "gate"]);

async function engineModule(ctx) {
  const name = new URL(ctx.req?.url ?? ctx.url, "http://engine.invalid").pathname.match(/^\/js\/engine\/([a-z]+)\.js$/u)?.[1];
  if (!name || !ENGINE_MODULES.has(name)) return new Response("not found", { status: 404 });
  const source = await readFile(path.join(ENGINE_ROOT, `${name}.mjs`), "utf8");
  return new Response(source.replaceAll(/(from\s+["'])(\.\/[a-z-]+)\.mjs(["'])/gu, "$1$2.js$3"), {
    headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-cache", "x-content-type-options": "nosniff" },
  });
}

export function createApplication() {
  return { resources: [
    { match: "/", methods: ["GET", "HEAD"], handler: () => new Response(null, { status: 302, headers: { location: "/index.html" } }) },
    { match: (pathname) => (typeof pathname === "string" && pathname.startsWith("/js/engine/") ? {} : null), methods: ["GET", "HEAD"], handler: engineModule },
    { match: () => ({}), methods: ["GET", "HEAD"], handler: staticFiles({ root: ROOT, cacheControl: "no-cache", security: {"contentSecurityPolicy":"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:","contentTypeOptions":"nosniff","frameOptions":"DENY","referrerPolicy":"no-referrer"}}) },
  ] };
}
export function createStaticServer() { return createNativeApplicationServer(createApplication()); }
async function main() {
  const port = Number(process.argv[2] ?? process.env.PORT ?? 8080);
  const host = process.env.HOST ?? "127.0.0.1";
  const running = await startNativeApplication(createApplication(), { port, host });
  process.stdout.write(`serving ${ROOT} at http://${host}:${running.port}/\n`);
}
if (import.meta.url === new URL(process.argv[1] ?? "", "file:").href) main().catch((error) => { console.error(error); process.exitCode = 1; });
