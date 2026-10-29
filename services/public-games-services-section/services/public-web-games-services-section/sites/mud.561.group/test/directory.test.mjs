import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorldDirectory, CATALOG_URL } from '../worker.mjs';

const world = {
  id: 'harbor', displayName: 'Harbor', description: 'A shared harbor.',
  keywords: ['mud'], hostname: 'harbor.example', entryPoints: { browser: '/', headless: 'POST /command' },
  status: 'playable', availability: { state: 'unavailable', checkedAt: '2026-09-02T08:00:00Z' },
};
const request = (path, options) => new Request('https://mud.561.group' + path, options);

test('all receiving paths follow a source change without publishing a world inventory', async () => {
  let games = [world, { ...world, id: 'cards', keywords: ['cards'] }];
  const worker = createWorldDirectory({ fetchImpl: async (url) => {
    assert.equal(url, CATALOG_URL);
    return Response.json({ generated: '2026-10-04', games });
  } });
  const first = await (await worker.fetch(request('/'))).text();
  assert.match(first, /href="https:\/\/harbor.example\/"/);
  assert.match(first, /Page unavailable at 2026-09-02/);
  assert.doesNotMatch(first, /aria-disabled|Not yet deployed|cards-title/);
  games = [{ ...world, id: 'forest', displayName: 'Forest & River', keywords: ['mmorpg'],
    entryPoints: { browser: '/enter', agent: 'WS /' } }];
  const changed = await (await worker.fetch(request('/'))).text();
  assert.match(changed, /Forest &amp; River/);
  assert.match(changed, /href="https:\/\/harbor.example\/enter"/);
  assert.doesNotMatch(changed, /harbor-title/);
  const catalog = await (await worker.fetch(request('/catalog.json'))).json();
  assert.deepEqual(catalog.games, games);
  assert.equal(catalog.source, CATALOG_URL);
  for (const path of ['/games/forest/', '/games/forest', '/games/forest/index.html']) {
    const response = await worker.fetch(request(path));
    assert.equal(response.status, 200);
    assert.match(await response.text(), /<dt>agent<\/dt><dd>WS \/<\/dd>/);
  }
  assert.equal((await worker.fetch(request('/games/harbor/'))).status, 404);
});

test('directory failure is distinct from world failure and does not serve an old inventory', async () => {
  for (const source of [() => new Response('Down', { status: 503 }), () => Response.json({})]) {
    const worker = createWorldDirectory({ fetchImpl: source });
    const response = await worker.fetch(request('/'));
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.match(await response.text(), /does not establish whether any world is offline/);
  }
});

test('HEAD, authored static assets, and unsupported requests keep their HTTP meanings', async () => {
  let reads = 0;
  const worker = createWorldDirectory({ fetchImpl: async () => {
    reads++;
    return Response.json({ games: [world] });
  } });
  const head = await worker.fetch(request('/games/harbor/', { method: 'HEAD' }));
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  const asset = await worker.fetch(request('/catalog-filter.json'), {
    ASSETS: { fetch: () => Response.json({ includeIfAnyKeyword: ['mud', 'mmorpg'] }) },
  });
  assert.equal(asset.status, 200);
  const rejected = await worker.fetch(request('/', { method: 'POST' }));
  assert.equal(rejected.status, 405);
  assert.equal(rejected.headers.get('allow'), 'GET, HEAD');
  assert.equal((await worker.fetch(request('/server/secrets'))).status, 404);
  assert.equal(reads, 1);
});
