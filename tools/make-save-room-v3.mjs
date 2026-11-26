// node tools/make-save-room-v3.mjs — made the room fixture once, before Change 4's scarf on the pegs
// (CHANGE_4.md, proof plan): plays the Change 3 build in a fresh save to every doll, the room pieces, two
// toys, a pillow and a blanket, fills every room surface (the top shelf full, the garland and the frame
// hung, a blanket on each drape where there are two), and writes tools/fixtures/save-room-v3.json (the
// localStorage save) and save-room-v3-room.json (room() as the Change 3 build cleaned it).
// The scarf lives in IndexedDB, so it isn't in the fixture: the test adds rows with scarfAddRows and reloads.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadPlaywright, serve, waitGame } from './lib-serve.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const pw = await loadPlaywright();
const srv = await serve();
const url = `http://127.0.0.1:${srv.address().port}/`;
const browser = await pw.chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const G = (fn, a) => page.evaluate(fn, a);
await page.goto(url);
await G(() => { localStorage.clear(); sessionStorage.clear(); indexedDB.deleteDatabase('knitknack-scarf'); });
await page.reload(); await waitGame(page);
await G(() => { window.__game.unlockAll(); });
const book = await G(() => import('./src/state.js').then((S) => S.BOOK.map((p) => ({ id: p.id, chapter: p.chapter }))));
const want = [...book.filter((p) => p.chapter === 6).slice(0, 2).map((p) => p.id), 'heart-pillow', 'chevron-baby-blanket', 'patchwork-blanket'];
for (const id of want) {
  if (!book.some((p) => p.id === id)) { console.log('no pattern', id); continue; }
  await G((id) => window.__game.go('knit', id), id);
  await page.waitForFunction(() => window.__game.state().screen === 'knit');
  const T = (await G(() => window.__game.state())).total;
  await G((n) => window.__game.knit(n, { fast: true }), T);
  await page.waitForFunction(() => window.__game.state().screen === 'finished', null, { timeout: 60000 });
  await G(() => window.__game.go('book'));
  await page.waitForTimeout(300);
}
await G(() => window.__game.go('room'));
await page.waitForFunction(() => window.__game.roomLayout && window.__game.roomLayout());
const gal = await G(() => import('./src/state.js').then((S) => S.get().gallery.map((g) => ({ id: g.id, pattern: g.pattern }))));
const toys = gal.filter((g) => want.slice(0, 2).includes(g.pattern)).map((g) => g.id);
const pillow = gal.find((g) => g.pattern === 'heart-pillow').id;
const blankets = gal.filter((g) => /blanket/.test(g.pattern)).map((g) => g.id);
await G(() => window.__game.clearRoom());
const plan = [
  ['doll:pip', 'shelf-top', 0.3], ['doll:clementine', 'shelf-top', 1.0], ['doll:bramble', 'shelf-top', 1.7], [toys[0], 'shelf-top', 2.3],
  ['doll:juniper', 'shelf-low', 0.4], ['piece:books', 'chair-arm-l', 0.4], ['piece:plant', 'shelf-low', 2.0],
  ['piece:lamp', 'floor-back', 0.5], ['doll:basil', 'floor-back', 1.1],
  ['piece:garland', 'garland-hook', 0.5], ['piece:frame', 'frame-hook', 0.5],
  [blankets[0], 'chair-drape', 0.5], [blankets[1], 'seat-drape', 0.5],
  [pillow, 'window-seat', 0.4], ['piece:teaset', 'window-seat', 1.4],
  [toys[1], 'chair-arm-r', 0.4], ['doll:purl', 'chair-seat', 0.6],
  ['doll:mabel', 'rug', 0.8], ['piece:table', 'rug', 2.0], ['piece:chest', 'rug-front', 1.2],
];
for (const [ref, sid, t] of plan) {
  const r = await G(([ref, sid, t]) => window.__game.place(ref, sid, t), [ref, sid, t]);
  if (!r.ok) console.log('could not place', ref, sid, r.reason);
}
await G(() => window.__game.go('book'));
await G(() => import('./src/state.js').then((S) => S.saveNow()));
const save = await G(() => localStorage.getItem('knitknack'));
await page.reload(); await waitGame(page); await page.waitForTimeout(1200);
const room = await G(() => window.__game.room());
writeFileSync(join(here, 'fixtures', 'save-room-v3.json'), save);
writeFileSync(join(here, 'fixtures', 'save-room-v3-room.json'), JSON.stringify(room, null, 1));
console.log(`room: ${room.length} things on ${new Set(room.map((e) => e.surface)).size} surfaces; errors: ${errors.length}`, errors.slice(0, 3));
await browser.close(); srv.close();
