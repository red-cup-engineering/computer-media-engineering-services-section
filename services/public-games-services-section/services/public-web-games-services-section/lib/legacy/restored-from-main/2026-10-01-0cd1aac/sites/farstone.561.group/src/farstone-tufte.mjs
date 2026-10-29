import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderTufteRoomDocument } from "@red-cup-engineering/qwzspace/tufte";
import { farstoneRoomOptions } from "./web/farstone-view.mjs";

const here = dirname(fileURLToPath(import.meta.url));

// The island's own palette over TUFTE's calm base: undyed wool and wet
// granite by day, lamplight and tarred timber after dark. Tokens only —
// the visual grammar (flat surfaces, hairline borders, quiet labels) is
// TUFTE's, and both schemes are honest, not one theme with an inversion.
const FARSTONE_STYLES = `
  :root { --tufte-bg: #eae7de; --tufte-surface: #f6f4ec; --tufte-ink: #232b2a; --tufte-muted: #5f6862; --tufte-line: #cdc9bb; --tufte-accent: #33586b; --tufte-warn: #8a6a26; --tufte-danger: #8a4a34; --farstone-log: #fdfcf4; }
  @media (prefers-color-scheme: dark) {
    :root { --tufte-bg: #171b1a; --tufte-surface: #202523; --tufte-ink: #e2ded1; --tufte-muted: #99a19a; --tufte-line: #3a413d; --tufte-accent: #88adbc; --tufte-warn: #c8a75e; --tufte-danger: #c67f62; --farstone-log: #131817; }
  }
  .tufte-shell { display: flex; flex-direction: column; min-height: 100dvh; }
  .tufte-workspace { flex: 1 1 auto; min-height: 24rem; align-items: stretch; }
  .tufte-workspace:has(#farstone-transcript) { height: calc(100dvh - 10rem); }
  #terminal .tufte-tile-body { overflow: hidden; padding-right: 0; }
  .mud-transcript { height: 100%; overflow-y: auto; font: .92rem/1.6 ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace; white-space: pre-wrap; background: var(--farstone-log); border: 1px solid var(--tufte-line); border-radius: var(--tufte-radius); padding: .6rem .75rem; }
  .mud-line { min-height: 1.6em; overflow-wrap: anywhere; }
  .mud-line--command { color: var(--tufte-accent); }
  .mud-line--system, .mud-line--exits, .quiet { color: var(--tufte-muted); }
  .mud-line--room-name { font-weight: 700; margin-top: .55rem; }
  .mud-prompt { display: flex; gap: .5rem; align-items: center; height: 100%; font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace; }
  .mud-prompt label { color: var(--tufte-muted); font-size: 1.1rem; }
  .mud-prompt input { flex: 1 1 auto; min-width: 6rem; font: inherit; }
  #farstone-connect label { display: block; margin-bottom: .25rem; font-size: .8rem; font-weight: 600; }
  #farstone-connect input { width: 100%; margin-bottom: .5rem; }
  .room-name { font-family: ui-serif, Georgia, serif; font-size: 1.05rem; font-weight: 650; margin: 0 0 .4rem; }
  .room-description { margin: 0 0 .55rem; }
  .room-exits { display: flex; flex-wrap: wrap; gap: .35rem; margin: .3rem 0 0; }
  .room-exits button { padding: .25rem .6rem; font-size: .85rem; }
  @media (max-width: 760px) {
    .tufte-shell { min-height: 0; }
    .tufte-workspace { min-height: 0; height: auto; }
    .mud-transcript { height: auto; max-height: 55vh; }
  }
`;

export function renderFarstonePage() {
  return renderTufteRoomDocument(farstoneRoomOptions(null), {
    documentTitle: "Farstone — 561 Group",
    themeColor: "#33586b",
    headHtml: `<meta name="description" content="Play Farstone, a persistent multiplayer world of harbor life, island work, and disputed histories.">`,
    styles: FARSTONE_STYLES,
    clientScript: `import "/assets/farstone-client.mjs";`,
  });
}


/** Public front door; the connected game workspace lives at /play/. */
export function renderFarstonePortal() {
  return renderTufteRoomDocument({
    title: "Farstone",
    subtitle: "An island to inhabit. A harbor to come home to.",
    eyebrow: "A multiplayer text world",
    entries: [], tileForEntry: () => [],
    leadingTiles: [{
      id: "welcome", role: "now", span: 8, title: "Beyond the harbor bar",
      html: `<p>The North Atlantic keeps its own time. On Farstone, boats return to the quay, wool passes through the fulling shed, and the people of the harbor disagree about what lies beneath the water.</p><p>Explore the island, learn its trades, meet other players, and find your place among its inhabitants. The world and its belongings persist between visits.</p><p><a class="portal-play" href="/play/">Play in your browser</a> <a href="#first-visit">Your first visit</a></p>`,
    }, {
      id: "harbor-now", role: "status", span: 4, title: "At the harbor",
      html: '<p id="harbor-status" role="status">Checking the harbor…</p><ul id="harbor-players"></ul><p><a href="/world">Read the public harbor record</a></p>',
    }],
    trailingTiles: [{
      id: "first-visit", role: "aside", span: 6, title: "Your first visit",
      html: `<p>Farstone is a MUD: a shared world explored through text. Read your surroundings, then type what you want to do.</p><dl><dt><code>look</code></dt><dd>Read the room and its exits.</dd><dt><code>go north</code></dt><dd>Follow a named exit; use the directions shown in your room.</dd><dt><code>inventory</code></dt><dd>See what you are carrying.</dd><dt><code>help</code></dt><dd>Find the available commands.</dd></dl>`,
    }, {
      id: "island-life", role: "aside", span: 6, title: "Life ashore",
      html: `<p>Follow the quay to its shops, work the island's fishing grounds and pastures, or visit the chapel and the library. Goods belong to people; provisions and resources are finite. A purchase changes hands, and a meal uses something up.</p><p>The harbor's accounts can disagree. Read the records, speak with its inhabitants, and decide which claims deserve your trust.</p>`,
    }, {
      id: "mud-clients", role: "aside", span: 12, title: "Connecting with a MUD client",
      html: '<p>The public browser client is available here. A public Telnet address is not yet available; this page will list the verified host and port when it is.</p>',
    }],
    footerHtml: '<p>Farstone · <a href="https://play.561.group/">561 Group games</a> · <a href="/play/">Enter the world</a></p>',
  }, {
    documentTitle: "Farstone — a living harbor",
    themeColor: "#33586b",
    headHtml: '<meta name="description" content="Farstone is a persistent multiplayer text world on a cold North Atlantic island. Explore the harbor, learn its trades, and meet its people.">',
    styles: FARSTONE_STYLES + '\n.portal-play { display:inline-block; padding:.7rem 1rem; background:var(--tufte-accent); color:var(--tufte-surface); margin: .5rem 1rem .5rem 0; } dt { margin-top:.6rem; } dd { margin-left:0; color:var(--tufte-muted); }',
    clientScript: `
      const status = document.getElementById("harbor-status");
      fetch("/world", {headers: {accept: "application/json"}}).then(response => {
        if (!response.ok) throw new Error("unavailable");
        return response.json();
      }).then(world => {
        const players = Array.isArray(world.present?.names) ? world.present.names : [];
        const count = Number(world.present?.total ?? 0);
        status.textContent = count ? count + " connected " + (count === 1 ? "player" : "players") + "." : "No players are connected right now.";
        const list = document.getElementById("harbor-players");
        for (const player of players) {
          const item = document.createElement("li");
          item.textContent = typeof player === "string" ? player : player.displayName ?? player.name ?? "A visitor";
          list.append(item);
        }
      }).catch(() => { status.textContent = "The harbor's live status is unavailable."; });
    `,
  });
}

export function farstoneDocuments() {
  return { "/": renderFarstonePortal(), "/play/": renderFarstonePage() };
}

export function farstoneStaticFiles() {
  return { "/assets/farstone-client.mjs": join(here, "web", "farstone-client.mjs") };
}
