// node tools/make-save-v1.mjs — made the migration fixture once, before Change 2's pattern data landed
// (CHANGE_2.md G): plays today's game in a fresh save to a finished flat Rolled-Brim Beanie (worn by Pip),
// Cozy Sock and Chunky Mitten in the gallery and a Cozy Sock in progress at 150 of 273, then writes
// tools/fixtures/save-v1.json (the localStorage save) and save-v1-hashes.json (piece(id) hashes, flat
// bake hashes and Pip's worn-layer hash). Kept for the record; solutions.mjs --migration replays it.
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
await G(() => { localStorage.clear(); sessionStorage.clear(); });
await page.reload(); await waitGame(page);
await G(() => { window.__game.unlockAll(); });
const made = [];
const colors = { 'rolled-brim-beanie': '#6f8f6a', 'cozy-sock': '#8db8d8', 'chunky-mitten': '#3f8a8a' };
for (const id of ['rolled-brim-beanie', 'cozy-sock', 'chunky-mitten']) {
  await G((id) => window.__game.go('knit', id), id);
  await page.waitForFunction(() => window.__game.state().screen === 'knit');
  const T = (await G(() => window.__game.state())).total;
  await G((n) => window.__game.knit(n, { fast: true }), Math.floor(T * 0.4));
  await G((c) => window.__game.setYarn('B', c, 'wool'), colors[id]);
  await G((n) => window.__game.knit(n, { fast: true }), T - Math.floor(T * 0.4));
  await page.waitForFunction(() => window.__game.state().screen === 'finished', null, { timeout: 15000 });
  const gid = (await G(() => window.__game.state())).gallery.slice(-1)[0];
  made.push({ id, gid, total: T });
  await G(() => window.__game.go('book'));
  await page.waitForTimeout(400);
}
await G((gid) => window.__game.dress('pip', gid), made[0].gid);
await G(() => window.__game.go('knit', 'cozy-sock'));
await page.waitForFunction(() => window.__game.state().screen === 'knit');
await G(() => window.__game.knit(150, { fast: true }));
const st = await G(() => window.__game.state());
if (st.stitch !== 150 || st.total !== 273) throw new Error(`in progress at ${st.stitch} of ${st.total}`);
await G(() => window.__game.go('book'));
await G(() => import('./src/state.js').then((S) => S.saveNow()));
const save = await G(() => localStorage.getItem('knitknack'));
const hashes = async () => {
  await page.waitForTimeout(1500);
  const out = { gallery: {}, inProgress: null, worn: null };
  for (const m of made) out.gallery[m.gid] = { pattern: m.id, piece: (await G((g) => window.__game.piece(g), m.gid)).hash, count: m.total, bake: await G((g) => window.__game.bakeHash(g, 8), m.gid) };
  const p = await G(() => window.__game.piece('w-cozy-sock'));
  out.inProgress = { id: 'w-cozy-sock', pattern: 'cozy-sock', count: p.count, total: 273, piece: p.hash };
  out.worn = { doll: 'pip', gid: made[0].gid, layer: await G((g) => window.__game.wornHash(g, 'pip', 0.5), made[0].gid), outfit: (await G(() => window.__game.state())).outfits.pip || null };
  return out;
};
const h1 = await hashes();
await page.reload(); await waitGame(page);
const h2 = await hashes();
if (JSON.stringify(h1) !== JSON.stringify(h2)) console.log('WARNING: hashes differ across a reload', JSON.stringify(h1), JSON.stringify(h2));
writeFileSync(join(here, 'fixtures', 'save-v1.json'), JSON.stringify(JSON.parse(save), null, 1) + '\n');
writeFileSync(join(here, 'fixtures', 'save-v1-hashes.json'), JSON.stringify(h1, null, 1) + '\n');
console.log(JSON.stringify(h1, null, 1));
if (errors.length) console.log('page errors:', errors);
await browser.close(); srv.close();
