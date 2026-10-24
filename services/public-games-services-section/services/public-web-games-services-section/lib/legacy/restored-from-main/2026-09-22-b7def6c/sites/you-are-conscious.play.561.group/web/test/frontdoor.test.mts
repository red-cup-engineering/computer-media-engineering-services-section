/**
 * `web/test/frontdoor.test.mts` — regression coverage for the front-door redirect-vs-rewrite bug
 * class (see stoke-service's `web/test/frontdoor.test.mts`, where it was first caught: a
 * same-URL internal rewrite at `/` leaves the browser's address bar at `/`, so any
 * path-relative reference in the served document 404s silently).
 *
 * This service's own `web/index.html` refs are already root-absolute (`/web/css/style.css`,
 * `/web/js/app.mjs`), so it was never actually exploitable here the way it was in stoke. This
 * server still now redirects for real (moved onto the shared
 * `@red-cup-engineering/project-browser-asset-tree-service/serve` dev server, which always
 * does), so this test asserts that directly and walks the real module graph from the real front
 * door as a general regression guard, not because this specific service had a live 404 bug.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", ".."); // you-are-conscious-service/
const PORT = 8798;
const BASE = `http://[::1]:${PORT}`;

let serverProcess: ReturnType<typeof spawn> | undefined;

async function waitUntilReachable(attempts = 20, delayMs = 50): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      await fetch(`${BASE}/`, { redirect: "manual" });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

before(async () => {
  serverProcess = spawn(process.execPath, [path.join(ROOT, "web", "server.mjs"), String(PORT)], {
    cwd: ROOT,
    stdio: "pipe",
  });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("server did not start in time")), 5000);
    serverProcess?.stdout?.on("data", (chunk) => {
      if (chunk.toString().includes("serving")) {
        clearTimeout(timer);
        resolve();
      }
    });
    serverProcess?.on("error", reject);
  });
  await waitUntilReachable();
});

after(() => {
  serverProcess?.kill();
});

function relativeRefs(html: string): string[] {
  const refs = [...html.matchAll(/(?:href|src)\s*=\s*"([^"]+)"/g)].map((m) => m[1] as string);
  return refs.filter((r) => !/^([a-z]+:)?\/\//i.test(r) && !r.startsWith("/") && !r.startsWith("#"));
}

function extractImportMap(html: string): Record<string, string> {
  const match = html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
  if (!match) return {};
  return (JSON.parse(match[1] as string).imports ?? {}) as Record<string, string>;
}

function resolveBareSpecifier(spec: string, importMap: Record<string, string>): string | undefined {
  if (importMap[spec] !== undefined) return importMap[spec];
  let best: string | undefined;
  for (const key of Object.keys(importMap)) {
    if (key.endsWith("/") && spec.startsWith(key) && (best === undefined || key.length > best.length)) {
      best = key;
    }
  }
  return best === undefined ? undefined : importMap[best] + spec.slice(best.length);
}

function isBareSpecifier(spec: string): boolean {
  return !/^[a-z]+:/i.test(spec) && !spec.startsWith(".") && !spec.startsWith("/");
}

function isAbsoluteLooking(spec: string): boolean {
  return /^[a-z]+:/i.test(spec);
}

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => {
      const idx = line.indexOf("//");
      return idx === -1 ? line : line.slice(0, idx);
    })
    .join("\n");
}

test("GET / is a real HTTP redirect to /web/index.html, not a same-URL internal rewrite", async () => {
  const res = await fetch(`${BASE}/`, { redirect: "manual" });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("location"), "/web/index.html");
});

test("following the front-door redirect lands on the real document, and every path-relative reference it contains resolves from THAT document's own URL", async () => {
  const res = await fetch(`${BASE}/`);
  assert.equal(res.status, 200);
  assert.equal(res.url, `${BASE}/web/index.html`);
  const html = await res.text();
  assert.match(html, /<title>You Are Conscious/);

  // Unlike stoke-service, this document's own refs are already root-absolute
  // (`/web/css/style.css`, `/web/js/app.mjs`), so they were never actually broken by the
  // rewrite-vs-redirect bug class — this loop still holds for any relative ref that does show up.
  const refs = relativeRefs(html);
  for (const ref of refs) {
    const resolved = new URL(ref, res.url);
    const assetRes = await fetch(resolved);
    assert.equal(assetRes.status, 200, `${ref} resolved to ${resolved} and responded ${assetRes.status}`);
    assert.ok(!/text\/plain/.test(assetRes.headers.get("content-type") ?? ""), `${ref} at ${resolved} looks like a 404 body`);
  }
});

test("the full ES module graph reachable from js/app.mjs, walked from the real front door, loads with no dead import anywhere in it", async () => {
  const indexRes = await fetch(`${BASE}/`);
  const html = await indexRes.text();
  const importMap = extractImportMap(html);
  assert.ok(Object.keys(importMap).length >= 4, "expected the four @red-cup-engineering/cartridge importmap entries");

  const entryUrl = new URL("js/app.mjs", indexRes.url).href;
  const visited = new Set<string>();
  const queue = [entryUrl];
  let modulesWalked = 0;

  while (queue.length > 0) {
    const url = queue.shift() as string;
    if (visited.has(url)) continue;
    visited.add(url);

    const res = await fetch(url);
    assert.equal(res.status, 200, `module graph: ${url} responded ${res.status}`);
    const source = stripComments(await res.text());
    modulesWalked++;

    const specifiers = [
      ...source.matchAll(/\bimport(?:\s+type)?\s+(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]/g),
      ...source.matchAll(/\bexport\s+(?:\*|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g),
    ].map((m) => m[1] as string);

    for (const spec of specifiers) {
      let resolved: string;
      const mapped = resolveBareSpecifier(spec, importMap);
      if (mapped !== undefined) {
        resolved = new URL(mapped, `${BASE}/`).href;
      } else if (isAbsoluteLooking(spec)) {
        assert.ok(false, `module graph: ${url} imports unfetchable, unmapped absolute specifier "${spec}"`);
        continue;
      } else if (isBareSpecifier(spec)) {
        assert.ok(false, `module graph: ${url} imports bare specifier "${spec}" with no importmap entry`);
        continue;
      } else {
        resolved = new URL(spec, url).href;
      }
      if (!visited.has(resolved)) queue.push(resolved);
    }
  }

  assert.ok(modulesWalked >= 4, `expected to walk a real module graph, only saw ${modulesWalked} module(s)`);
});

test("a genuinely missing path still 404s (the redirect fix did not weaken the traversal/404 guard)", async () => {
  const res = await fetch(`${BASE}/does-not-exist-xyz`);
  assert.equal(res.status, 404);
});
