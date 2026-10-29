// A real telnet TCP client against the shared FeltOS world-host listener, alongside Farstone's
// HTTP and WS transports on the same live MudServer and runtime clock.

import assert from "node:assert/strict";
import { test } from "node:test";
import { createConnection } from "node:net";

import { createEngine } from "@red-cup-engineering/feltos/engine";
import { closeMudHttpServer, listenMudHttpServer } from "@red-cup-engineering/feltos/http";
import { pushMudTelnetServer } from "@red-cup-engineering/feltos/telnet";
import { IAC, SB, SE } from "@red-cup-engineering/computer-networking-engineering-services-section/telnet";
import { FARSTONE_GAME } from "./farstone-game.mjs";
import { createFarstoneRoom } from "./farstone-room.mjs";
import { createWorldHttpServer, createWorldRuntime } from "@red-cup-engineering/feltos/world-host";
import { listenWorldTelnet } from "@red-cup-engineering/feltos/world-host/telnet";

const TICK_MS = 20;

/** Drop IAC WILL/WONT/DO/DONT triplets and IAC SB...IAC SE blocks, leaving the plain CRLF text a
 *  bare `nc` session actually reads as scrollback. Test-only byte filter — a real client answers
 *  negotiation instead of ignoring it; that answering is telnet.mjs's own tested vocabulary. */
function stripTelnetControl(buf) {
  const out = [];
  let i = 0;
  while (i < buf.length) {
    if (buf[i] === IAC) {
      if (buf[i + 1] === SB) {
        i += 2;
        while (i < buf.length && !(buf[i] === IAC && buf[i + 1] === SE)) i++;
        i += 2;
      } else {
        i += 3; // IAC <verb> <option>
      }
      continue;
    }
    out.push(buf[i]);
    i++;
  }
  return Buffer.from(out).toString("utf8");
}

function connectOnce(port) {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host: "127.0.0.1", port }, () => {
      let text = "";
      socket.on("data", (chunk) => { text += stripTelnetControl(chunk); });
      resolve({ text: () => text, send: (line) => socket.write(`${line}\r\n`), close: () => socket.destroy() });
    });
    socket.once("error", reject);
  });
}

// This sandbox's loopback networking refuses the very FIRST connection attempt to a freshly
// bound ephemeral port (the same behavior http-wiring.test.mts's/ws-wiring.test.mts's own
// warmUpLocalPort works around for HTTP) — retry a few times before giving up.
async function connectTelnet(port) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await connectOnce(port);
    } catch (error) {
      if (attempt >= 19) throw error;
      await new Promise((r) => setTimeout(r, 15));
    }
  }
}

async function waitForText(client, predicate, timeoutMs = 3000) {
  const start = Date.now();
  for (;;) {
    const text = client.text();
    if (predicate(text)) return text;
    if (Date.now() - start > timeoutMs) throw new Error(`timed out waiting for telnet text; saw: ${JSON.stringify(text)}`);
    await new Promise((r) => setTimeout(r, 10));
  }
}

// warmUpLocalPort — mirrors http-wiring.test.mts's/ws-wiring.test.mts's own helper: this
// sandbox's loopback networking refuses the very first connection attempt to a freshly bound
// ephemeral port.
async function warmUpLocalPort(origin) {
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      await fetch(`${origin}/does-not-exist-warmup-probe`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 15));
    }
  }
}

async function withLiveServer(
  run,
) {
  const bootEngine = createEngine(FARSTONE_GAME);
  const { room, liveMud } = createFarstoneRoom(bootEngine, { intervalMs: TICK_MS });
  const mud = liveMud();
  let telnet = null;
  const runtime = createWorldRuntime(
    { tick: () => room.stepOnce(), engine: () => mud.engine() },
    {
      tickIntervalMs: TICK_MS,
      maxCatchUpTicksPerRequest: 50,
      lastTickAt: Date.now(),
      store: null,
      clockStore: null,
      onCatchUp: (info) => { if (info.ticksRun > 0 && telnet !== null) pushMudTelnetServer(telnet.server); },
    },
  );
  await runtime.preRequestCatchUp();
  const httpServer = createWorldHttpServer(mud, runtime, { tickIntervalMs: TICK_MS, room, processLabel: "Farstone" });
  const { origin } = await listenMudHttpServer(httpServer, { host: "127.0.0.1", port: 0 });
  await warmUpLocalPort(origin);
  telnet = await listenWorldTelnet(mud, runtime, { host: "127.0.0.1", port: 0, catchUpIntervalMs: TICK_MS });
  try {
    await run({ origin, telnet, mud });
  } finally {
    await telnet.close();
    room.destroy();
    await closeMudHttpServer(httpServer);
  }
}

test("telnet listener comes up on the shared mud and greets a raw client anonymously (no Name: prompt)", async () => {
  await withLiveServer(async ({ telnet }) => {
    const port = (telnet.server.address()).port;
    const client = await connectTelnet(port);
    try {
      // feltos joins every connecting socket as an anonymouse actor synchronously on TCP
      // accept (telnet.mjs's createMudTelnetServer) — there is no pre-join Name: phase left.
      await waitForText(client, (t) => t.includes("Welcome to FeltOS.") && t.includes("arrive anonymouse"));
      assert.equal(client.text().includes("Name: "), false, "the old pre-join Name: prompt must be gone");
    } finally {
      client.close();
    }
  });
});

test("a telnet session joins anonymously, registers for a voice, and sees room output, while an HTTP client sees the SAME world", async () => {
  await withLiveServer(async ({ origin, telnet }) => {
    const before = await (await fetch(`${origin}/metrics`)).json();
    assert.equal(before.actors, 0, "no actor connected yet on either transport");

    const port = (telnet.server.address()).port;
    const client = await connectTelnet(port);
    try {
      // The shared listener joins the socket before sending its welcome banner.
      await waitForText(client, (t) => t.includes("arrive anonymouse"));

      // The listener enqueues "look" after joining; its active-session catch-up advances the
      // same runtime used by HTTP and WS, with no request from those transports here.
      await waitForText(client, (t) => t.split("arrive anonymouse.")[1]?.trim().length > 0);

      const afterJoin = await (await fetch(`${origin}/metrics`)).json();
      assert.equal(afterJoin.actors, 1, "the SAME live mud the HTTP API reads sees the telnet-joined anonymouse actor");

      client.send("register harbor-wanderer");
      await waitForText(client, (t) => t.includes("Account 'harbor-wanderer' created."));
      assert.match(client.text(), /Your password \(shown once\): [0-9a-f]{16}/);
    } finally {
      client.close();
    }
  });
});

test("ticks advance for telnet-only sessions (no HTTP/WS request ever made after boot)", async () => {
  await withLiveServer(async ({ telnet, mud }) => {
    const tickBeforeConnect = (mud.engine()).tick;
    await new Promise((r) => setTimeout(r, TICK_MS * 4));
    assert.equal(
      (mud.engine()).tick,
      tickBeforeConnect,
      "gated correctly: nobody on telnet yet, so the steady catch-up interval must not have run",
    );

    const port = (telnet.server.address()).port;
    const client = await connectTelnet(port);
    try {
      // Joining is synchronous on TCP accept in the anonymouse flow — no client input required.
      await waitForText(client, (t) => t.includes("arrive anonymouse"));

      const tickAfterJoin = (mud.engine()).tick;
      await new Promise((r) => setTimeout(r, TICK_MS * 6));
      assert.ok(
        (mud.engine()).tick > tickAfterJoin,
        `world time must keep advancing for a connected telnet client with no HTTP/WS traffic: was ${tickAfterJoin}, now ${(mud.engine()).tick}`,
      );
    } finally {
      client.close();
    }
  });
});

test("who/chat/tell/quit work at the telnet layer, voice-gated on register", async () => {
  await withLiveServer(async ({ telnet }) => {
    const port = (telnet.server.address()).port;
    const alice = await connectTelnet(port);
    const bob = await connectTelnet(port);
    try {
      await waitForText(alice, (t) => t.includes("arrive anonymouse"));
      await waitForText(bob, (t) => t.includes("arrive anonymouse"));

      alice.send("say hello");
      await waitForText(alice, (t) => t.includes("no voice yet"), 1000);

      alice.send("register alice");
      await waitForText(alice, (t) => t.includes("Account 'alice' created."));

      alice.send("who");
      await waitForText(alice, (t) => /anonymice|alice/.test(t.split("Account 'alice' created.")[1] ?? ""));

      bob.send("register bob");
      await waitForText(bob, (t) => t.includes("Account 'bob' created."));

      bob.send("tell alice hi there");
      await waitForText(alice, (t) => t.includes("hi there"));

      bob.send("chat hello everyone");
      await waitForText(bob, (t) => t.includes("hello everyone"));

      bob.send("quit");
      await waitForText(bob, (t) => t.includes("Goodbye."));
    } finally {
      alice.close();
      bob.close();
    }
  });
});

test("whoami/finger work at the telnet layer too, not just the JSON API", async () => {
  await withLiveServer(async ({ telnet }) => {
    const port = (telnet.server.address()).port;
    const alice = await connectTelnet(port);
    const bob = await connectTelnet(port);
    try {
      await waitForText(alice, (t) => t.includes("arrive anonymouse"));
      await waitForText(bob, (t) => t.includes("arrive anonymouse"));

      alice.send("register alice");
      await waitForText(alice, (t) => t.includes("Account 'alice' created."));
      bob.send("register bob");
      await waitForText(bob, (t) => t.includes("Account 'bob' created."));

      alice.send("whoami");
      await waitForText(alice, (t) => t.includes("Your name is alice."));

      alice.send("finger bob");
      await waitForText(alice, (t) => /bob\s*\r?\nRole: registered/.test(t.split("Your name is alice.")[1] ?? ""));

      alice.send("finger nobody-here");
      await waitForText(alice, (t) => t.includes("No one by that name is connected."));
    } finally {
      alice.close();
      bob.close();
    }
  });
});
