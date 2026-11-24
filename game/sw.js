// sw.js: offline play. The GitHub Pages workflow stamps VERSION with the
// commit and fills FILES with everything in the game folder, so each deploy
// caches a fresh copy on the next launch. Unstamped (local) copies cache as
// they go. Range requests (Safari's <audio> asks for them) are answered from
// the cached whole file with a 206 slice. The music (about 13 MB) is not part of
// the install: the first launch never waits for it. It streams from the network
// the first time a track plays, is cached whole in the background, and is
// warmed into the cache after the install so offline play has it later.
'use strict';
const VERSION = '__BUILD__';
const FILES = [/*__FILES__*/];
const PREFIX = 'knit-knack-';
const CACHE = PREFIX + VERSION;

const isMusic = url => /\/audio\/music\//.test(url);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE)
    .then(cache => cache.addAll(['./', ...FILES.filter(f => !isMusic(f))].map(url => new Request(url, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
    // the music, one track at a time, after everything else (not awaited: never holds anything up)
    .then(() => { caches.open(CACHE).then(cache => FILES.filter(isMusic).reduce((p, f) => p.then(() => whole(cache, new URL(f, self.registration.scope).href).catch(() => null)), Promise.resolve())); }));
});

async function whole(cache, url) {
  const hit = await cache.match(url, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(new Request(url, { cache: 'reload' }));
  if (res.ok && res.status === 200) await cache.put(url, res.clone());
  return res;
}

async function ranged(req, cache, event) {
  // not cached yet: stream this range from the network now, cache the whole file behind it
  if (!(await cache.match(req.url, { ignoreSearch: true }))) {
    event.waitUntil(whole(cache, req.url).catch(() => null));
    return fetch(req);
  }
  const res = await whole(cache, req.url);
  if (!res.ok || res.status !== 200) return res;
  const buf = await res.arrayBuffer();
  const size = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '');
  let start = m && m[1] !== '' ? +m[1] : 0;
  let end = m && m[2] !== '' ? +m[2] : size - 1;
  if (m && m[1] === '' && m[2] !== '') { start = Math.max(0, size - +m[2]); end = size - 1; }
  end = Math.min(end, size - 1);
  if (start >= size || start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  return new Response(buf.slice(start, end + 1), {
    status: 206, statusText: 'Partial Content',
    headers: { 'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg', 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' },
  });
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.headers.has('range')) { event.respondWith(caches.open(CACHE).then(cache => ranged(req, cache, event))); return; }
  const key = req.mode === 'navigate' ? './' : req;
  event.respondWith(caches.open(CACHE).then(cache =>
    cache.match(key, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
      if (res.ok && res.status === 200) cache.put(key, res.clone());
      return res;
    }))));
});
