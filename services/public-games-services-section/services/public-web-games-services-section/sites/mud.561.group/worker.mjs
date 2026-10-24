import filter from './public/catalog-filter.json' with { type: 'json' };
import { esc, catalogCardBodyHtml } from '../play.561.group/js/catalog.mjs';

export const CATALOG_URL = 'https://play.561.group/catalog.json';
export const ORIGIN = 'https://mud.561.group';

// One receiving view of the published authored records, never a second inventory.
// HTTP observations retain their original dates; they never close an entry link.
export async function queryWorlds({ fetchImpl = fetch } = {}) {
  const response = await fetchImpl(CATALOG_URL, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(5000),
    cf: { cacheTtl: 60, cacheEverything: true },
  });
  if (!response.ok) throw new Error('Game directory unavailable');
  const catalog = await response.json();
  if (!Array.isArray(catalog.games)) throw new Error('Invalid game directory');
  const games = catalog.games.filter((entry) =>
    entry.keywords?.some((keyword) => filter.includeIfAnyKeyword.includes(keyword)));
  if (games.some((entry) => !/^[a-z0-9-]+$/.test(entry.id)
      || typeof entry.displayName !== 'string')) throw new Error('Invalid world record');
  if (new Set(games.map((entry) => entry.id)).size !== games.length) throw new Error('Duplicate world record');
  return {
    $schemaNote: 'A request-time keyword view of the published authored game records. Any page observations retain their original dates and do not establish gameplay or gate entry links.',
    source: CATALOG_URL,
    generated: catalog.generated,
    games,
  };
}

function shell(title, body) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — 561 Group worlds</title>
<meta name="description" content="The Group's text MUDs and graphical MMOs, with world descriptions and browser, API, and terminal entry points.">
<link rel="stylesheet" href="/css/style.css"></head>
<body><a class="skip-link" href="#worlds">Skip to worlds</a>
<header class="site-header"><div class="header-inner"><div class="title-block">
<p class="brand-wordmark"><a href="https://561.group/">561 Group</a></p><h1>${esc(title)}</h1>
<p class="tagline">Text MUDs and graphical MMOs. <a href="/">All worlds</a> · <a href="https://play.561.group/">All games</a></p>
</div></div></header><main id="worlds">${body}</main>
<footer class="site-footer"><div class="footer-inner"><p>
Descriptions and entry points come from <a href="https://play.561.group/catalog.json">Cowrie Games</a>.
<a href="/catalog.json">World catalog</a> · <a href="/catalog-filter.json">World selection</a>.
A recorded page check describes that request at its stated date; it does not establish gameplay.
Declared entry links stay available.
</p></div></footer></body></html>`;
}

function detail(entry) {
  const interfaces = Object.entries(entry.entryPoints || {}).map(([kind, value]) =>
    `<div class="entry-point"><dt>${esc(kind)}</dt><dd>${esc(value)}</dd></div>`).join('');
  return shell(entry.displayName, `${catalogCardBodyHtml(entry)}
<section aria-labelledby="entry-points"><h2 id="entry-points">Entry points</h2>
<dl class="entry-points">${interfaces}</dl></section>`);
}

function index(catalog) {
  const tiles = catalog.games.map((entry) => `<section class="tufte-tile" id="${esc(entry.id)}" data-role="standard" data-side="center" style="--tile-span:4" aria-labelledby="${esc(entry.id)}-title">
<header><h2 id="${esc(entry.id)}-title"><a href="/games/${esc(entry.id)}/">${esc(entry.displayName)}</a></h2></header>
<div class="tufte-tile-body">${catalogCardBodyHtml(entry)}</div></section>`).join('');
  return shell('Worlds', `<p>The Group's MUD and MMO worlds, selected from the same game descriptions used by Cowrie Games. Graphical MMOs count as MUDs here. A shared player chat network across these worlds is a future possibility, not a feature of this directory.</p>
<p class="result-count">${catalog.games.length} world${catalog.games.length === 1 ? '' : 's'}</p>
<div class="catalog-grid-wrap"><div class="tufte-grid">${tiles}</div></div>`);
}

// One url for the directory and one for each world the directory shows, so the sitemap is the same view the pages are.
export function sitemap(catalog) {
  const paths = ['/', ...catalog.games.map((entry) => `/games/${entry.id}/`)];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((path) => `  <url><loc>${ORIGIN}${path}</loc></url>`).join('\n')}\n</urlset>\n`;
}

function reply(request, body, status = 200, type = 'text/html; charset=utf-8') {
  return new Response(request.method === 'HEAD' ? null : body, {
    status,
    headers: {
      'content-type': type,
      'cache-control': status === 200 ? 'public, max-age=60' : 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

export function createWorldDirectory({ fetchImpl = fetch } = {}) {
  return {
    async fetch(request, env) {
      if (!['GET', 'HEAD'].includes(request.method)) {
        return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
      }
      const path = new URL(request.url).pathname;
      if (path === '/css/style.css' || path === '/catalog-filter.json') return env.ASSETS.fetch(request);
      if (path === '/robots.txt') return reply(request, `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`, 200, 'text/plain; charset=utf-8');
      const gameMatch = /^\/games\/([a-z0-9-]+)(?:\/|\/index\.html)?$/.exec(path);
      if (!['/', '/index.html', '/catalog.json', '/sitemap.xml'].includes(path) && !gameMatch) {
        return reply(request, shell('Page not found', '<p><a href="/">Browse the worlds</a>.</p>'), 404);
      }
      let catalog;
      try { catalog = await queryWorlds({ fetchImpl }); }
      catch {
        return reply(request, shell('World directory unavailable',
          '<p>The game descriptions could not be received. <a href="https://play.561.group/">Try Cowrie Games</a>, or return shortly. This does not establish whether any world is offline.</p>'), 503);
      }
      if (path === '/sitemap.xml') return reply(request, sitemap(catalog), 200, 'application/xml; charset=utf-8');
      if (path === '/catalog.json') return reply(request, JSON.stringify(catalog, null, 2) + '\n', 200, 'application/json; charset=utf-8');
      if (gameMatch) {
        const entry = catalog.games.find((game) => game.id === gameMatch[1]);
        return entry ? reply(request, detail(entry)) : reply(request, shell('World not found', '<p><a href="/">Browse the worlds</a>.</p>'), 404);
      }
      return reply(request, index(catalog));
    },
  };
}

export default createWorldDirectory();
