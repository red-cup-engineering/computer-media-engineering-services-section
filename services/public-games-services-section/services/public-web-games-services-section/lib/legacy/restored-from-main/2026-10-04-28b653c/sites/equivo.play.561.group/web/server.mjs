import path from "node:path";
import { fileURLToPath } from "node:url";
import { createNativeApplicationServer, startNativeApplication } from "@red-cup-engineering/computer-web-server/native-application";
import { staticFiles } from "@red-cup-engineering/computer-web-server/static";

const ROOT = path.dirname(fileURLToPath(import.meta.url));

export function createApplication() {
  return { resources: [
    { match: "/", methods: ["GET", "HEAD"], handler: () => new Response(null, { status: 302, headers: { location: "/index.html" } }) },
    { match: () => ({}), methods: ["GET", "HEAD"], handler: staticFiles({ root: ROOT, cacheControl: "no-cache", security: {"contentSecurityPolicy":"default-src 'self'; script-src 'self' 'sha256-wxD/eUt8k7guVwbOBYaOzskOUkGzU6cxFs1T+iKmhpM='; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:","contentTypeOptions":"nosniff","frameOptions":"DENY","referrerPolicy":"no-referrer"}}) },
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
